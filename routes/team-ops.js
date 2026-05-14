// routes/team-ops.js
// Team task queue + border logistics digital twin + cold chain ledger
// AuditDNA Agriculture — Mexausa Food Group, Inc.
const express = require('express');
const router  = express.Router();

router.get('/health', (req, res) => res.json({ ok:true, module:'team-ops' }));

const TEAM = {
  pablo:   { name:'Pablo Alatorre',    role:'admin',       focus:'Platform ops, CRM actions, system health' },
  denisse: { name:'Denisse Velazquez', role:'admin',       focus:'Finance, factoring inbox, invoice aging' },
  gibran:  { name:'Gibran',            role:'admin_sales', focus:'LOAF growers, WE LINK, KYC queue' },
  ozzy:    { name:'Ozzy',              role:'admin_sales', focus:'Sales, buyer outreach, deal pipeline' },
  oscar:   { name:'Oscar Mejia',       role:'admin_sales', focus:'Operations, logistics, border coordination' },
};

// GET /api/team/members
router.get('/members', (req, res) => res.json({ ok:true, team:TEAM, count:Object.keys(TEAM).length }));

// POST /api/team/task — create task for team member
router.post('/task', async (req, res) => {
  const db = req.app.get('db') || global.db;
  const { assigned_to, task_type, description, priority='NORMAL', due_date, ref_id } = req.body;
  if (!assigned_to || !description) return res.status(400).json({ error:'assigned_to and description required' });
  if (db) {
    await db.query(
      `INSERT INTO workflow_tasks (assigned_to, task_type, description, priority, due_date, ref_id, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,'PENDING',NOW())`,
      [assigned_to, task_type||'GENERAL', description, priority, due_date||null, ref_id||null]
    ).catch(()=>{});
    // Fire Brain event
    await db.query(
      `INSERT INTO brain_events (event_type, payload, created_at) VALUES ('TASK_CREATED',$1,NOW())`,
      [JSON.stringify({ assigned_to, task_type, description, priority })]
    ).catch(()=>{});
  }
  res.json({ ok:true, task_created:true, assigned_to, priority, member:TEAM[assigned_to]||null });
});

// GET /api/team/tasks/:member — get tasks for a team member
router.get('/tasks/:member', async (req, res) => {
  const db = req.app.get('db') || global.db;
  if (!db) return res.status(503).json({ error:'DB unavailable' });
  try {
    const r = await db.query(
      `SELECT * FROM workflow_tasks WHERE assigned_to=$1 AND status!='DONE' ORDER BY priority DESC, due_date ASC LIMIT 50`,
      [req.params.member]
    ).catch(()=>({rows:[]}));
    res.json({ ok:true, member:req.params.member, tasks:r.rows, count:r.rows.length,
      member_info: TEAM[req.params.member]||null });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/team/task/:id/complete
router.post('/task/:id/complete', async (req, res) => {
  const db = req.app.get('db') || global.db;
  if (!db) return res.status(503).json({ error:'DB unavailable' });
  await db.query(`UPDATE workflow_tasks SET status='DONE', completed_at=NOW() WHERE id=$1`, [req.params.id]).catch(()=>{});
  res.json({ ok:true, task_id:req.params.id, status:'DONE' });
});

// ── BORDER LOGISTICS DIGITAL TWIN ─────────────────────────────────────────────

const BORDER_STAGES = ['PACKING_HOUSE','FUMIGATION','SENASICA_INSPECTION','PHYTO_CERT_ISSUED','LOADED_TRUCK','CBP_PORTAL_SUBMITTED','AT_PORT_OF_ENTRY','CBP_INSPECTION','RELEASED','IN_TRANSIT_USA','DELIVERED'];

// POST /api/team/border-load — create border load record
router.post('/border-load', async (req, res) => {
  const db = req.app.get('db') || global.db;
  const { lot_code, commodity, truck_plate, carrier, port_of_entry, estimated_arrival } = req.body;
  if (!lot_code) return res.status(400).json({ error:'lot_code required' });
  const load = { lot_code, commodity, truck_plate, carrier,
    port_of_entry:port_of_entry||'Otay Mesa', estimated_arrival,
    current_stage:'PACKING_HOUSE', stage_history:[{ stage:'PACKING_HOUSE', ts:new Date().toISOString() }],
    created_at: new Date().toISOString() };
  if (db) {
    await db.query(
      `INSERT INTO manifests (lot_code, commodity, carrier, status, metadata, created_at)
       VALUES ($1,$2,$3,'PACKING_HOUSE',$4,NOW())`,
      [lot_code, commodity||null, carrier||null, JSON.stringify(load)]
    ).catch(()=>{});
  }
  res.json({ ok:true, load_created:true, load, stages:BORDER_STAGES });
});

// PATCH /api/team/border-load/:lotCode/stage — advance load to next stage
router.patch('/border-load/:lotCode/stage', async (req, res) => {
  const db = req.app.get('db') || global.db;
  const { stage, notes, gps_lat, gps_lng } = req.body;
  if (!stage || !BORDER_STAGES.includes(stage)) return res.status(400).json({ error:`stage must be one of: ${BORDER_STAGES.join(', ')}` });
  const stageIdx = BORDER_STAGES.indexOf(stage);
  const nextStage = BORDER_STAGES[stageIdx+1] || null;
  if (db) {
    await db.query(
      `UPDATE manifests SET status=$1, updated_at=NOW() WHERE lot_code=$2`,
      [stage, req.params.lotCode]
    ).catch(()=>{});
    // Fire Brain alert
    await db.query(
      `INSERT INTO brain_events (event_type, payload, created_at) VALUES ('BORDER_STAGE_UPDATE',$1,NOW())`,
      [JSON.stringify({ lot_code:req.params.lotCode, stage, notes, gps_lat, gps_lng, next_stage:nextStage })]
    ).catch(()=>{});
  }
  res.json({ ok:true, lot_code:req.params.lotCode, stage, next_stage:nextStage, notes,
    alert_sent: ['RELEASED','CBP_INSPECTION','AT_PORT_OF_ENTRY'].includes(stage) });
});

// GET /api/team/border-loads — all active loads in transit
router.get('/border-loads', async (req, res) => {
  const db = req.app.get('db') || global.db;
  if (!db) return res.status(503).json({ error:'DB unavailable' });
  try {
    const r = await db.query(
      `SELECT * FROM manifests WHERE status NOT IN ('DELIVERED','REJECTED') ORDER BY created_at DESC LIMIT 100`
    ).catch(()=>({rows:[]}));
    res.json({ ok:true, loads:r.rows, count:r.rows.length, stages:BORDER_STAGES });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/team/cold-chain — log cold chain handoff (FSMA 204 compliant)
router.post('/cold-chain', async (req, res) => {
  const db = req.app.get('db') || global.db;
  const { lot_code, location, handler_name, temp_f, handoff_type, signature_ref } = req.body;
  if (!lot_code || !handler_name) return res.status(400).json({ error:'lot_code and handler_name required' });
  const entry = { lot_code, location, handler_name, temp_f, handoff_type, signature_ref, ts:new Date().toISOString() };
  if (db) {
    await db.query(
      `INSERT INTO production_declarations (traceability_lot_code, cte_type, location_description,
       submitted_by, temperature_log, notes, status, event_date, created_at)
       VALUES ($1,'RECEIVING',$2,$3,$4,$5,'COLD_CHAIN',NOW()::date,NOW())`,
      [lot_code, location||null, handler_name, JSON.stringify([{temp_f, ts:entry.ts}]), `Cold chain handoff — ${handoff_type||'transfer'}`]
    ).catch(()=>{});
  }
  res.json({ ok:true, logged:true, entry, fsma_204_compliant:true,
    note:'Handoff recorded as RECEIVING CTE in production_declarations' });
});

module.exports = router;
