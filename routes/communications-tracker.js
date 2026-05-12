// routes/communications-tracker.js
// Tracks every email, deal action, grower/buyer outreach across all roles
//
// POST /api/comms/log          — log any communication event
// GET  /api/comms/calendar     — calendar data (month view)
// GET  /api/comms/list         — full list with filters
// POST /api/comms/:id/reply    — mark as replied
// POST /api/comms/:id/followup — schedule a follow-up
// GET  /api/comms/stats        — responsiveness stats per contact
// GET  /api/comms/due          — follow-ups due today
const express = require('express');
const router  = express.Router();

const ensure = async (pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS communication_log (
      id              SERIAL PRIMARY KEY,
      event_type      VARCHAR(50)  NOT NULL DEFAULT 'email',
      direction       VARCHAR(10)  NOT NULL DEFAULT 'outbound',
      sent_by         VARCHAR(100) NOT NULL,
      sent_by_role    VARCHAR(50)  DEFAULT 'owner',
      recipient_name  VARCHAR(200),
      recipient_email VARCHAR(200),
      recipient_type  VARCHAR(50)  DEFAULT 'contact',
      subject         TEXT,
      body_preview    TEXT,
      commodity       VARCHAR(100),
      deal_id         VARCHAR(100),
      module_source   VARCHAR(100),
      status          VARCHAR(30)  DEFAULT 'sent',
      replied_at      TIMESTAMPTZ,
      reply_preview   TEXT,
      followup_date   DATE,
      followup_note   TEXT,
      followup_done   BOOLEAN DEFAULT FALSE,
      response_hours  NUMERIC(10,2),
      tags            TEXT,
      sent_at         TIMESTAMPTZ DEFAULT NOW(),
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_comms_sent_at   ON communication_log(sent_at DESC);
    CREATE INDEX IF NOT EXISTS idx_comms_sent_by   ON communication_log(sent_by);
    CREATE INDEX IF NOT EXISTS idx_comms_status    ON communication_log(status);
    CREATE INDEX IF NOT EXISTS idx_comms_followup  ON communication_log(followup_date);
    CREATE INDEX IF NOT EXISTS idx_comms_recipient ON communication_log(recipient_email);
    CREATE INDEX IF NOT EXISTS idx_comms_commodity ON communication_log(commodity);
  `).catch(()=>{});
};

// ── POST /log ─────────────────────────────────────────────────────────────
router.post('/log', async (req, res) => {
  const pool = global.db || req.app.locals.pool;
  await ensure(pool);
  const {
    event_type, direction, sent_by, sent_by_role,
    recipient_name, recipient_email, recipient_type,
    subject, body_preview, commodity, deal_id,
    module_source, followup_date, followup_note, tags,
  } = req.body;

  if (!sent_by) return res.status(400).json({ ok:false, error:'sent_by required' });

  try {
    const r = await pool.query(
      `INSERT INTO communication_log
         (event_type,direction,sent_by,sent_by_role,recipient_name,recipient_email,
          recipient_type,subject,body_preview,commodity,deal_id,module_source,
          followup_date,followup_note,tags,status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'sent')
       RETURNING id`,
      [event_type||'email', direction||'outbound', sent_by, sent_by_role||'owner',
       recipient_name||'', recipient_email||'', recipient_type||'contact',
       subject||'', (body_preview||'').slice(0,300), commodity||'', deal_id||'',
       module_source||'', followup_date||null, followup_note||'', tags||'']
    );

    // Brain ping
    try { if(global.brain) global.brain.ping('COMM_LOGGED', { id:r.rows[0].id, event_type, sent_by, recipient_email }); } catch(_){}

    res.json({ ok:true, id: r.rows[0].id });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

// ── GET /calendar?year=2026&month=5 ──────────────────────────────────────
router.get('/calendar', async (req, res) => {
  const pool = global.db || req.app.locals.pool;
  await ensure(pool);
  const { year, month, sent_by, role_filter } = req.query;
  const y = parseInt(year)  || new Date().getFullYear();
  const m = parseInt(month) || new Date().getMonth() + 1;
  const start = `${y}-${String(m).padStart(2,'0')}-01`;
  const end   = new Date(y, m, 1).toISOString().split('T')[0];

  let where = [`sent_at >= $1`, `sent_at < $2`], params = [start, end], p = 3;
  if (sent_by)     { where.push(`sent_by = $${p++}`); params.push(sent_by); }
  if (role_filter) { where.push(`sent_by_role = $${p++}`); params.push(role_filter); }

  try {
    const rows = await pool.query(
      `SELECT
         DATE(sent_at)                      AS day,
         COUNT(*)                           AS total,
         COUNT(*) FILTER(WHERE status='replied')       AS replied,
         COUNT(*) FILTER(WHERE status='sent')          AS pending,
         COUNT(*) FILTER(WHERE followup_date=CURRENT_DATE) AS due_today,
         JSON_AGG(JSON_BUILD_OBJECT(
           'id',id,'event_type',event_type,'sent_by',sent_by,'sent_by_role',sent_by_role,
           'recipient_name',recipient_name,'recipient_email',recipient_email,
           'subject',subject,'commodity',commodity,'status',status,
           'replied_at',replied_at,'followup_date',followup_date,'sent_at',sent_at
         ) ORDER BY sent_at DESC) AS events
       FROM communication_log
       WHERE ${where.join(' AND ')}
       GROUP BY DATE(sent_at)
       ORDER BY day`,
      params
    ).catch(()=>({rows:[]}));
    res.json({ ok:true, year:y, month:m, days: rows.rows });
  } catch(e) { res.json({ ok:false, days:[], error:e.message }); }
});

// ── GET /list ─────────────────────────────────────────────────────────────
router.get('/list', async (req, res) => {
  const pool = global.db || req.app.locals.pool;
  await ensure(pool);
  const { status, sent_by, commodity, recipient_email, limit, offset, role_filter } = req.query;
  let where = ['1=1'], params = [], p = 1;
  if (status)          { where.push(`status = $${p++}`);            params.push(status); }
  if (sent_by)         { where.push(`sent_by = $${p++}`);           params.push(sent_by); }
  if (commodity)       { where.push(`LOWER(commodity) LIKE $${p++}`); params.push(`%${commodity.toLowerCase()}%`); }
  if (recipient_email) { where.push(`recipient_email = $${p++}`);   params.push(recipient_email); }
  if (role_filter)     { where.push(`sent_by_role = $${p++}`);      params.push(role_filter); }

  try {
    const rows = await pool.query(
      `SELECT * FROM communication_log WHERE ${where.join(' AND ')}
       ORDER BY sent_at DESC LIMIT $${p} OFFSET $${p+1}`,
      [...params, Math.min(parseInt(limit)||100,500), parseInt(offset)||0]
    ).catch(()=>({rows:[]}));
    res.json({ ok:true, comms: rows.rows, total: rows.rows.length });
  } catch(e) { res.json({ ok:false, comms:[], error:e.message }); }
});

// ── POST /:id/reply ───────────────────────────────────────────────────────
router.post('/:id/reply', async (req, res) => {
  const pool = global.db || req.app.locals.pool;
  const { reply_preview, replied_by } = req.body;
  try {
    await pool.query(
      `UPDATE communication_log
         SET status='replied', replied_at=NOW(), reply_preview=$1,
             response_hours = EXTRACT(EPOCH FROM (NOW()-sent_at))/3600,
             updated_at=NOW()
       WHERE id=$2`,
      [reply_preview||'', req.params.id]
    );
    res.json({ ok:true });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

// ── POST /:id/followup ────────────────────────────────────────────────────
router.post('/:id/followup', async (req, res) => {
  const pool = global.db || req.app.locals.pool;
  const { followup_date, followup_note } = req.body;
  try {
    await pool.query(
      `UPDATE communication_log SET followup_date=$1, followup_note=$2, followup_done=FALSE, updated_at=NOW() WHERE id=$3`,
      [followup_date, followup_note||'', req.params.id]
    );
    res.json({ ok:true });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

// ── POST /:id/done ────────────────────────────────────────────────────────
router.post('/:id/done', async (req, res) => {
  const pool = global.db || req.app.locals.pool;
  try {
    await pool.query(`UPDATE communication_log SET followup_done=TRUE, updated_at=NOW() WHERE id=$1`, [req.params.id]);
    res.json({ ok:true });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

// ── GET /due — follow-ups due today ──────────────────────────────────────
router.get('/due', async (req, res) => {
  const pool = global.db || req.app.locals.pool;
  await ensure(pool);
  try {
    const rows = await pool.query(
      `SELECT * FROM communication_log
       WHERE followup_date <= CURRENT_DATE AND followup_done = FALSE
       ORDER BY followup_date ASC LIMIT 50`
    ).catch(()=>({rows:[]}));
    res.json({ ok:true, due: rows.rows, count: rows.rows.length });
  } catch(e) { res.json({ ok:false, due:[], count:0 }); }
});

// ── GET /stats — responsiveness by contact ────────────────────────────────
router.get('/stats', async (req, res) => {
  const pool = global.db || req.app.locals.pool;
  await ensure(pool);
  try {
    const rows = await pool.query(`
      SELECT
        recipient_email, recipient_name, recipient_type,
        COUNT(*)                                    AS total_sent,
        COUNT(*) FILTER(WHERE status='replied')     AS total_replied,
        ROUND(AVG(response_hours) FILTER(WHERE status='replied'), 1) AS avg_response_hrs,
        MIN(response_hours) FILTER(WHERE status='replied')           AS fastest_hrs,
        MAX(sent_at)                                AS last_contact,
        ARRAY_AGG(DISTINCT commodity) FILTER(WHERE commodity != '') AS commodities
      FROM communication_log
      WHERE recipient_email != ''
      GROUP BY recipient_email, recipient_name, recipient_type
      ORDER BY total_sent DESC
      LIMIT 100
    `).catch(()=>({rows:[]}));
    res.json({ ok:true, stats: rows.rows });
  } catch(e) { res.json({ ok:false, stats:[] }); }
});

module.exports = router;
