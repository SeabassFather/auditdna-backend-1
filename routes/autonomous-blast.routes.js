// =============================================================================
// File: C:\AuditDNA\backend\routes\autonomous-blast.routes.js
// HTTP control endpoints for autonomous blast engine
// =============================================================================

'use strict';

const express = require('express');
const brainBus = require('../services/brain-emitter');
const router = express.Router();
const { runAgent, handleInboundInquiry, AGENTS } = require('../services/autonomous-blast');

function getBrain(req) {
  try { return require('../Brain'); } catch(e) { return null; }
}

// GET /api/blast/agents — list all agents and status
router.get('/agents', async (req, res) => {
  try {
    const pool = req.app.get('pool');
    const stats = await pool.query(
      `SELECT agent_id, status, COUNT(*) AS runs, SUM(emails_sent) AS total_sent, MAX(created_at) AS last_run
       FROM autonomous_agent_runs
       WHERE created_at > NOW() - INTERVAL '24 hours'
       GROUP BY agent_id, status`
    ).catch(() => ({ rows: [] }));

    const agentMap = {};
    stats.rows.forEach(r => {
      if (!agentMap[r.agent_id]) agentMap[r.agent_id] = { runs: 0, sent: 0, last_run: null };
      agentMap[r.agent_id].runs += parseInt(r.runs);
      agentMap[r.agent_id].sent += parseInt(r.total_sent || 0);
      if (!agentMap[r.agent_id].last_run || r.last_run > agentMap[r.agent_id].last_run) {
        agentMap[r.agent_id].last_run = r.last_run;
      }
    });

    res.json({
      ok: true,
      agents: Object.entries(AGENTS).map(([id, a]) => ({
        id, name: a.name, category: a.category,
        schedule_hours: Math.round(a.schedule_ms / 3600000 * 10) / 10,
        runs_24h: agentMap[id]?.runs || 0,
        emails_sent_24h: agentMap[id]?.sent || 0,
        last_run: agentMap[id]?.last_run || null,
      }))
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/blast/run/:agentId — manually trigger an agent
router.post('/run/:agentId', async (req, res) => {
  const agentId = req.params.agentId.toUpperCase();
  if (!AGENTS[agentId]) return res.status(404).json({ ok: false, error: 'Agent not found' });

  const brain = getBrain(req);
  // Fire async — don't wait
  (function(){ try { brainBus.emit('MANUAL_AGENT_TRIGGER', { agent_id: agentId, triggered_at: new Date().toISOString() }, { agent_id: agentId, severity: 1 }); } catch(_e){} })(); runAgent(req.app, brain, agentId).catch(e => console.error(`[BLAST-MANUAL] ${agentId}:`, e.message));
  res.json({ ok: true, message: `Agent ${agentId} triggered`, agent: AGENTS[agentId].name });
});

// GET /api/blast/runs?limit=20&agent= — recent runs
router.get('/runs', async (req, res) => {
  try {
    const pool = req.app.get('pool');
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const agent = req.query.agent ? req.query.agent.toUpperCase() : null;
    const where = agent ? 'WHERE agent_id = $2' : '';
    const params = agent ? [limit, agent] : [limit];

    const r = await pool.query(
      `SELECT run_id, agent_id, status, contacts_targeted, emails_sent, emails_failed, created_at
       FROM autonomous_agent_runs ${where}
       ORDER BY created_at DESC LIMIT $1`, params
    );
    res.json({ ok: true, runs: r.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/blast/logs/:runId — detail log for a specific run
router.get('/logs/:runId', async (req, res) => {
  try {
    const pool = req.app.get('pool');
    const r = await pool.query(
      `SELECT * FROM autonomous_agent_logs WHERE run_id = $1 ORDER BY created_at DESC LIMIT 200`,
      [req.params.runId]
    );
    res.json({ ok: true, logs: r.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/blast/stats — 24h dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const pool = req.app.get('pool');
    const [runs, contacts] = await Promise.all([
      pool.query(`SELECT
        COUNT(*) AS total_runs,
        SUM(emails_sent) AS total_sent,
        SUM(emails_failed) AS total_failed,
        COUNT(*) FILTER(WHERE status='success') AS success_runs,
        COUNT(*) FILTER(WHERE status='failed') AS failed_runs
       FROM autonomous_agent_runs WHERE created_at > NOW() - INTERVAL '24 hours'`),
      pool.query(`SELECT
        (SELECT COUNT(*) FROM growers) AS growers,
        (SELECT COUNT(*) FROM buyers) AS buyers,
        (SELECT COUNT(*) FROM shipper_contacts) AS shippers`),
    ]);
    res.json({
      ok: true,
      stats_24h: runs.rows[0],
      database: contacts.rows[0],
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/blast/inbound — handle inbound email inquiry
router.post('/inbound', async (req, res) => {
  try {
    const { from, subject, body, agent_hint } = req.body || {};
    if (!from || !body) return res.status(400).json({ ok: false, error: 'from and body required' });

    const handler = req.app.get('blastInbound');
    if (handler) {
      handler({ from, subject: subject || '(no subject)', body, agent_hint });
    }
    res.json({ ok: true, message: 'Inquiry received and routed' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/blast/report — latest production report
router.get('/report', async (req, res) => {
  try {
    const pool = req.app.get('pool');
    const r = await pool.query(
      `SELECT run_id, status, report_text, created_at FROM autonomous_agent_runs
       WHERE agent_id = 'PRODUCTION_REPORT' ORDER BY created_at DESC LIMIT 1`
    );
    res.json({ ok: true, report: r.rows[0] || null });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
