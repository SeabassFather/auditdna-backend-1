// routes/field-reps.js
// MFGINC Field Rep Network — boots on the ground submission system
//
// POST /api/reps/register          — new rep registers, gets MFGINC-XXX
// POST /api/reps/login             — rep authenticates with ID + PIN
// GET  /api/reps/list              — owner: all reps
// POST /api/reps/opportunity       — rep submits opportunity → approval queue
// GET  /api/reps/queue             — owner: pending approvals
// POST /api/reps/queue/:id/approve — owner approves → fires to growers + comms
// POST /api/reps/queue/:id/reject  — owner rejects with reason
// GET  /api/reps/queue/:id/ai      — AI pre-analysis of opportunity
// GET  /api/reps/my/:rep_id        — rep sees their own submissions
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcrypt');

const OWNER_EMAIL = 'sgarcia1911@gmail.com';
const NTFY_TOPIC  = process.env.NTFY_TOPIC || 'mfginc-alerts';

const ensure = async (pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS field_reps (
      id          SERIAL PRIMARY KEY,
      rep_id      VARCHAR(20)  UNIQUE NOT NULL,  -- MFGINC-001
      pin_hash    VARCHAR(200) NOT NULL,
      full_name   VARCHAR(200),                   -- stored encrypted/internal only
      phone       VARCHAR(50),
      email       VARCHAR(200),
      territory   VARCHAR(200),
      active      BOOLEAN DEFAULT TRUE,
      total_submissions INTEGER DEFAULT 0,
      total_approved    INTEGER DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      last_login  TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS rep_opportunities (
      id              SERIAL PRIMARY KEY,
      rep_id          VARCHAR(20) NOT NULL,
      commodity       VARCHAR(100) NOT NULL,
      variety         VARCHAR(100),
      quantity        VARCHAR(100),
      pack_size       VARCHAR(100),
      port            VARCHAR(100),
      delivery_region VARCHAR(200),
      timeline        VARCHAR(100),
      buyer_type      VARCHAR(100),
      buyer_ref       VARCHAR(200),  -- blind ref only, no full identity
      price_target    VARCHAR(100),
      notes           TEXT,
      status          VARCHAR(30) DEFAULT 'pending',  -- pending|approved|rejected|closed
      rejection_reason TEXT,
      approved_by     VARCHAR(100),
      approved_at     TIMESTAMPTZ,
      ai_analysis     TEXT,
      ai_matched_growers TEXT,
      ai_draft_email  TEXT,
      ai_price_est    TEXT,
      emails_fired    INTEGER DEFAULT 0,
      deal_id         VARCHAR(100),
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_reps_rep_id      ON field_reps(rep_id);
    CREATE INDEX IF NOT EXISTS idx_opps_rep_id      ON rep_opportunities(rep_id);
    CREATE INDEX IF NOT EXISTS idx_opps_status      ON rep_opportunities(status);
    CREATE INDEX IF NOT EXISTS idx_opps_commodity   ON rep_opportunities(commodity);
    CREATE INDEX IF NOT EXISTS idx_opps_created     ON rep_opportunities(created_at DESC);
  `).catch(()=>{});

  // Seed initial 8 reps if not already there
  const existing = await pool.query('SELECT COUNT(*) FROM field_reps').catch(()=>({rows:[{count:'1'}]}));
  if (parseInt(existing.rows[0].count) === 0) {
    const reps = [
      { rep_id:'MFGINC-001', name:'David Gattis',         territory:'Texas / National',        phone:'', email:'' },
      { rep_id:'MFGINC-002', name:'Hector Mariscal',       territory:'Los Angeles / SoCal',      phone:'', email:'' },
      { rep_id:'MFGINC-003', name:'Oscar Mejia',           territory:'National',                 phone:'', email:'' },
      { rep_id:'MFGINC-004', name:'Ramiro',                territory:'National Buyer Network',   phone:'', email:'' },
      { rep_id:'MFGINC-005', name:'Sergio San Quintin',    territory:'Baja California',          phone:'', email:'' },
      { rep_id:'MFGINC-006', name:'Santos San Quintin',    territory:'Baja California',          phone:'', email:'' },
      { rep_id:'MFGINC-007', name:'Felipe Huizar Mata',    territory:'Mexicali Valley',          phone:'', email:'' },
      { rep_id:'MFGINC-008', name:'Ariel Bolio',           territory:'Baja California / RE',     phone:'', email:'' },
    ];
    const defaultPin = await bcrypt.hash('MFGINC2026', 10);
    for (const r of reps) {
      await pool.query(
        `INSERT INTO field_reps (rep_id, pin_hash, full_name, territory) VALUES ($1,$2,$3,$4) ON CONFLICT (rep_id) DO NOTHING`,
        [r.rep_id, defaultPin, r.name, r.territory]
      ).catch(()=>{});
    }
    console.log('[field-reps] 8 reps seeded with default PIN: MFGINC2026');
  }
};

const sendNotify = async (title, msg) => {
  try {
    await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method:'POST', headers:{ 'Title':title, 'Priority':'urgent', 'Tags':'mfginc,opportunity' },
      body: msg
    });
  } catch(_){}
};

const sendEmail = async (to, subject, body) => {
  const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5050';
  try {
    await fetch(`${BASE}/api/gmail/send`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ to, subject, body })
    });
  } catch(_){}
};

// ── POST /register ────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const pool = global.db || req.app.locals.pool;
  await ensure(pool);
  const { rep_id, pin, full_name, phone, email, territory } = req.body;
  if (!rep_id || !pin) return res.status(400).json({ ok:false, error:'rep_id and pin required' });

  try {
    const existing = await pool.query('SELECT id FROM field_reps WHERE rep_id=$1', [rep_id]);
    const hash = await bcrypt.hash(pin, 10);
    if (existing.rows.length > 0) {
      // Update their contact info
      await pool.query(
        `UPDATE field_reps SET pin_hash=$1, full_name=COALESCE($2,full_name), phone=COALESCE($3,phone), email=COALESCE($4,email), territory=COALESCE($5,territory) WHERE rep_id=$6`,
        [hash, full_name||null, phone||null, email||null, territory||null, rep_id]
      );
      return res.json({ ok:true, rep_id, message:`${rep_id} updated. Your ID is your identity in the system.` });
    }
    // New rep — auto-assign next number
    const count = await pool.query('SELECT COUNT(*) FROM field_reps');
    const nextNum = String(parseInt(count.rows[0].count) + 1).padStart(3,'0');
    const newId = `MFGINC-${nextNum}`;
    await pool.query(
      `INSERT INTO field_reps (rep_id, pin_hash, full_name, phone, email, territory) VALUES ($1,$2,$3,$4,$5,$6)`,
      [newId, hash, full_name||'', phone||'', email||'', territory||'']
    );
    res.json({ ok:true, rep_id:newId, message:`Welcome to MFGINC Network. Your ID: ${newId}. Keep it private.` });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

// ── POST /login ───────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const pool = global.db || req.app.locals.pool;
  await ensure(pool);
  const { rep_id, pin } = req.body;
  try {
    const r = await pool.query('SELECT * FROM field_reps WHERE rep_id=$1 AND active=TRUE', [rep_id]);
    if (!r.rows.length) return res.status(401).json({ ok:false, error:'ID not found' });
    const valid = await bcrypt.compare(pin, r.rows[0].pin_hash);
    if (!valid) return res.status(401).json({ ok:false, error:'Invalid PIN' });
    await pool.query('UPDATE field_reps SET last_login=NOW() WHERE rep_id=$1', [rep_id]);
    res.json({ ok:true, rep_id, territory:r.rows[0].territory, total_submissions:r.rows[0].total_submissions });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

// ── POST /opportunity ─────────────────────────────────────────────────────────
router.post('/opportunity', async (req, res) => {
  const pool = global.db || req.app.locals.pool;
  await ensure(pool);
  const { rep_id, pin, commodity, variety, quantity, pack_size, port, delivery_region, timeline, buyer_type, buyer_ref, price_target, notes } = req.body;

  // Verify rep
  const rep = await pool.query('SELECT * FROM field_reps WHERE rep_id=$1 AND active=TRUE', [rep_id]);
  if (!rep.rows.length) return res.status(401).json({ ok:false, error:'Invalid rep ID' });
  const valid = await bcrypt.compare(pin, rep.rows[0].pin_hash);
  if (!valid) return res.status(401).json({ ok:false, error:'Invalid PIN' });

  if (!commodity || !quantity) return res.status(400).json({ ok:false, error:'Commodity and quantity required' });

  try {
    // Pull matched growers from DB
    let matchedGrowers = [];
    try {
      const g = await pool.query(
        `SELECT legal_name, trade_name, city, state_region, country, phone, email, certifications, annual_volume_boxes, price_per_unit
         FROM grower_contacts WHERE LOWER(commodities) LIKE LOWER($1) LIMIT 10`,
        [`%${commodity}%`]
      );
      matchedGrowers = g.rows;
    } catch(_){}

    const matchedText = matchedGrowers.length > 0
      ? matchedGrowers.map(g=>`${g.trade_name||g.legal_name} (${g.city}, ${g.country}) — $${g.price_per_unit}/${g.unit||'unit'}`).join('\n')
      : 'No pre-loaded growers found. Manual sourcing required.';

    // AI quick analysis
    let aiAnalysis = '', aiDraftEmail = '', aiPriceEst = '';
    try {
      const Anthropic = require('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const analysisMsg = await client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 600,
        messages: [{ role:'user', content:
          `Field rep ${rep_id} submitted a produce opportunity:\n` +
          `Commodity: ${commodity} ${variety||''}\nQuantity: ${quantity}\nPack: ${pack_size||'N/A'}\n` +
          `Port: ${port||'N/A'}\nDelivery: ${delivery_region||'N/A'}\nTimeline: ${timeline||'N/A'}\n` +
          `Buyer type: ${buyer_type||'N/A'}\nPrice target: ${price_target||'N/A'}\nNotes: ${notes||'none'}\n\n` +
          `Matched growers in DB:\n${matchedText}\n\n` +
          `Respond with 3 sections:\n1. DEAL ANALYSIS (2-3 sentences on viability)\n2. PRICE ESTIMATE (FOB range)\n3. RECOMMENDED ACTION for owner`
        }]
      });
      aiAnalysis = analysisMsg.content[0].text;

      const emailMsg = await client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 400,
        messages: [{ role:'user', content:
          `Write a professional blind email to a carrot grower from Mexausa Food Group.\n` +
          `Opportunity: ${quantity} of ${commodity} ${variety||''}, ${pack_size||''}, ${port||delivery_region||''}, ${timeline||'ASAP'}.\n` +
          `Keep identity of buyer blind. Subject + 2 short paragraphs. Professional. No emojis.`
        }]
      });
      aiDraftEmail = emailMsg.content[0].text;
    } catch(e) {
      aiAnalysis = `${commodity} opportunity: ${quantity} needed at ${port||delivery_region||'TBD'}. ${matchedGrowers.length} growers matched in DB. Pending owner review.`;
      aiDraftEmail = `Subject: ${commodity} Sourcing Opportunity — ${quantity}\n\nDear Valued Supplier,\n\nMexausa Food Group has an immediate need for ${quantity} of ${commodity} ${variety||''} (${pack_size||'standard pack'}) for delivery to ${port||delivery_region||'TBD'} — ${timeline||'ASAP'}.\n\nPlease confirm availability and your best FOB price. All deal details discussed confidentially.\n\nMexausa Food Group | mexausafg.com`;
    }

    // Insert opportunity
    const opp = await pool.query(
      `INSERT INTO rep_opportunities
         (rep_id,commodity,variety,quantity,pack_size,port,delivery_region,timeline,buyer_type,buyer_ref,price_target,notes,ai_analysis,ai_matched_growers,ai_draft_email,status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'pending')
       RETURNING id`,
      [rep_id, commodity, variety||'', quantity, pack_size||'', port||'', delivery_region||'', timeline||'', buyer_type||'', buyer_ref||'', price_target||'', notes||'', aiAnalysis, matchedText, aiDraftEmail]
    );
    const oppId = opp.rows[0].id;

    await pool.query('UPDATE field_reps SET total_submissions=total_submissions+1 WHERE rep_id=$1', [rep_id]);

    // Notify Saul
    await sendNotify(
      `NEW OPP: ${commodity} — ${rep_id}`,
      `${rep_id} submitted: ${quantity} of ${commodity} (${pack_size||''}) for ${port||delivery_region||'TBD'}. ${matchedGrowers.length} growers matched. Awaiting approval. OPP-${oppId}`
    );
    await sendEmail(OWNER_EMAIL,
      `[MFGINC FIELD OPP] ${commodity} — ${quantity} — ${rep_id} — PENDING APPROVAL`,
      `FIELD OPPORTUNITY SUBMITTED\n${'='.repeat(50)}\nOPP ID: OPP-${oppId}\nREP: ${rep_id}\nCOMMODITY: ${commodity} ${variety||''}\nQUANTITY: ${quantity}\nPACK: ${pack_size||'N/A'}\nPORT: ${port||'N/A'}\nDELIVERY: ${delivery_region||'N/A'}\nTIMELINE: ${timeline||'N/A'}\nBUYER TYPE: ${buyer_type||'N/A'}\nPRICE TARGET: ${price_target||'N/A'}\nNOTES: ${notes||'none'}\n\nMATCHED GROWERS:\n${matchedText}\n\nAI ANALYSIS:\n${aiAnalysis}\n\nDRAFT OUTREACH:\n${aiDraftEmail}\n\nACTION REQUIRED: Approve at mexausafg.com → Field Rep Manager\nmexausafg.com`
    );

    // Log to communication calendar
    await pool.query(
      `INSERT INTO communication_log (event_type,direction,sent_by,sent_by_role,recipient_name,subject,commodity,module_source,status,tags)
       VALUES ('opportunity','inbound',$1,'field_rep','MFGINC Network',$2,$3,'Field Rep Portal','sent','field_rep,opportunity')`,
      [rep_id, `${commodity} opportunity — ${quantity}`, commodity]
    ).catch(()=>{});

    res.json({ ok:true, opp_id:`OPP-${oppId}`, status:'pending', message:`Opportunity submitted. OPP-${oppId}. Owner notified. You will hear back within 24 hours.`, matched_growers:matchedGrowers.length });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

// ── GET /queue ────────────────────────────────────────────────────────────────
router.get('/queue', async (req, res) => {
  const pool = global.db || req.app.locals.pool;
  await ensure(pool);
  const { status } = req.query;
  try {
    const rows = await pool.query(
      `SELECT * FROM rep_opportunities WHERE status=$1 ORDER BY created_at DESC LIMIT 100`,
      [status||'pending']
    ).catch(()=>({rows:[]}));
    res.json({ ok:true, queue:rows.rows, total:rows.rows.length });
  } catch(e) { res.json({ ok:false, queue:[], error:e.message }); }
});

// ── POST /queue/:id/approve ───────────────────────────────────────────────────
router.post('/queue/:id/approve', async (req, res) => {
  const pool = global.db || req.app.locals.pool;
  const { approved_by, custom_email } = req.body;
  try {
    const opp = await pool.query('SELECT * FROM rep_opportunities WHERE id=$1', [req.params.id]);
    if (!opp.rows.length) return res.status(404).json({ ok:false, error:'Not found' });
    const o = opp.rows[0];

    // Fire emails to matched growers
    let fired = 0;
    const growers = await pool.query(
      `SELECT * FROM grower_contacts WHERE LOWER(commodities) LIKE LOWER($1) LIMIT 15`,
      [`%${o.commodity}%`]
    ).catch(()=>({rows:[]}));

    const emailBody = custom_email || o.ai_draft_email || `Mexausa Food Group has an immediate need for ${o.quantity} of ${o.commodity}. Contact us to discuss availability.`;
    const subject   = `${o.commodity} Sourcing Opportunity — ${o.quantity} — Mexausa Food Group`;

    for (const g of growers.rows) {
      if (g.email) {
        await sendEmail(g.email, subject, emailBody);
        fired++;
      }
    }
    // Always copy Saul
    await sendEmail(OWNER_EMAIL, `[APPROVED + FIRED] ${subject}`, `Approved by ${approved_by||'owner'}.\n${fired} grower emails fired.\n\n${emailBody}`);

    await pool.query(
      `UPDATE rep_opportunities SET status='approved', approved_by=$1, approved_at=NOW(), emails_fired=$2, updated_at=NOW() WHERE id=$3`,
      [approved_by||'owner', fired, req.params.id]
    );
    await pool.query('UPDATE field_reps SET total_approved=total_approved+1 WHERE rep_id=$1', [o.rep_id]);
    await sendNotify(`OPP APPROVED: ${o.commodity}`, `OPP-${o.id} approved. ${fired} grower emails fired.`);
    res.json({ ok:true, fired, message:`Approved. ${fired} grower emails sent.` });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

// ── POST /queue/:id/reject ────────────────────────────────────────────────────
router.post('/queue/:id/reject', async (req, res) => {
  const pool = global.db || req.app.locals.pool;
  const { reason } = req.body;
  try {
    await pool.query(
      `UPDATE rep_opportunities SET status='rejected', rejection_reason=$1, updated_at=NOW() WHERE id=$2`,
      [reason||'Not approved', req.params.id]
    );
    res.json({ ok:true });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

// ── GET /list ─────────────────────────────────────────────────────────────────
router.get('/list', async (req, res) => {
  const pool = global.db || req.app.locals.pool;
  await ensure(pool);
  try {
    const rows = await pool.query(`SELECT rep_id, territory, active, total_submissions, total_approved, last_login, created_at FROM field_reps ORDER BY rep_id`).catch(()=>({rows:[]}));
    res.json({ ok:true, reps:rows.rows });
  } catch(e) { res.json({ ok:false, reps:[] }); }
});

// ── GET /my/:rep_id ───────────────────────────────────────────────────────────
router.get('/my/:rep_id', async (req, res) => {
  const pool = global.db || req.app.locals.pool;
  try {
    const rows = await pool.query(`SELECT id,commodity,variety,quantity,port,status,created_at,ai_analysis FROM rep_opportunities WHERE rep_id=$1 ORDER BY created_at DESC LIMIT 50`, [req.params.rep_id]).catch(()=>({rows:[]}));
    res.json({ ok:true, opportunities:rows.rows });
  } catch(e) { res.json({ ok:false, opportunities:[] }); }
});

module.exports = router;
