// ============================================================================
// USER ACTIVITY ROUTES — routes/user-activity.js
// Tracks every login, module open, RFQ, deal touch, email blast per user
// GET  /api/user-activity/:username     — full activity log
// GET  /api/user-activity/report/:username — printable report data
// POST /api/user-activity/log           — internal: log an event
// ============================================================================
const express = require('express');
const router  = express.Router();

// ── TABLE BOOTSTRAP ──────────────────────────────────────────────────────────
async function ensureTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_activity_log (
      id            SERIAL PRIMARY KEY,
      username      VARCHAR(100) NOT NULL,
      display_name  VARCHAR(150),
      role          VARCHAR(50),
      event_type    VARCHAR(100) NOT NULL,
      module        VARCHAR(100),
      description   TEXT,
      ip_address    VARCHAR(50),
      meta          JSONB DEFAULT '{}',
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_ual_username ON user_activity_log(username);
    CREATE INDEX IF NOT EXISTS idx_ual_created  ON user_activity_log(created_at DESC);
  `);
}

// ── POST /log — brain/internal event logger ──────────────────────────────────
router.post('/log', async (req, res) => {
  try {
    const pool = global.db || req.app.locals.pool;
    await ensureTable(pool);
    const { username, display_name, role, event_type, module, description, ip_address, meta } = req.body;
    if (!username || !event_type) return res.status(400).json({ ok: false, error: 'username + event_type required' });
    await pool.query(
      `INSERT INTO user_activity_log (username,display_name,role,event_type,module,description,ip_address,meta)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [username, display_name||'', role||'', event_type, module||'', description||'', ip_address||'', JSON.stringify(meta||{})]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── GET /:username — activity log ────────────────────────────────────────────
router.get('/:username', async (req, res) => {
  try {
    const pool = global.db || req.app.locals.pool;
    await ensureTable(pool);
    const limit = Math.min(parseInt(req.query.limit)||200, 500);
    const rows = await pool.query(
      `SELECT * FROM user_activity_log WHERE username = $1 ORDER BY created_at DESC LIMIT $2`,
      [req.params.username, limit]
    );
    // Also get summary stats
    const stats = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE event_type='LOGIN')         AS logins,
         COUNT(*) FILTER (WHERE event_type='MODULE_OPENED') AS modules_opened,
         COUNT(*) FILTER (WHERE event_type='RFQ_POSTED')    AS rfqs_posted,
         COUNT(*) FILTER (WHERE event_type='DEAL_TOUCHED')  AS deals_touched,
         COUNT(*) FILTER (WHERE event_type='EMAIL_SENT')    AS emails_sent,
         MIN(created_at) AS first_seen,
         MAX(created_at) AS last_seen
       FROM user_activity_log WHERE username = $1`,
      [req.params.username]
    );
    res.json({ ok: true, events: rows.rows, stats: stats.rows[0], total: rows.rowCount });
  } catch (e) { res.status(500).json({ ok: false, events: [], stats: {}, error: e.message }); }
});

// ── GET /report/:username — full report payload ───────────────────────────────
router.get('/report/:username', async (req, res) => {
  try {
    const pool = global.db || req.app.locals.pool;
    await ensureTable(pool);
    // Get user profile
    const userQ = await pool.query(
      `SELECT username, display_name, role, tier, last_login, login_count, created_at
       FROM auth_users WHERE username = $1 LIMIT 1`,
      [req.params.username]
    );
    const user = userQ.rows[0] || { username: req.params.username };
    // Get all activity
    const acts = await pool.query(
      `SELECT event_type, module, description, created_at, meta
       FROM user_activity_log WHERE username = $1 ORDER BY created_at DESC LIMIT 500`,
      [req.params.username]
    );
    // Stats
    const stats = await pool.query(
      `SELECT
         COUNT(*) AS total_events,
         COUNT(*) FILTER (WHERE event_type='LOGIN') AS logins,
         COUNT(*) FILTER (WHERE event_type='MODULE_OPENED') AS modules_opened,
         COUNT(*) FILTER (WHERE event_type='RFQ_POSTED') AS rfqs,
         COUNT(*) FILTER (WHERE event_type='DEAL_TOUCHED') AS deals,
         COUNT(DISTINCT module) FILTER (WHERE module != '') AS unique_modules,
         MIN(created_at) AS first_activity,
         MAX(created_at) AS last_activity
       FROM user_activity_log WHERE username = $1`,
      [req.params.username]
    );
    // Top modules
    const topMods = await pool.query(
      `SELECT module, COUNT(*) AS hits FROM user_activity_log
       WHERE username = $1 AND module != '' GROUP BY module ORDER BY hits DESC LIMIT 10`,
      [req.params.username]
    );
    res.json({
      ok: true,
      generated_at: new Date().toISOString(),
      user, stats: stats.rows[0],
      top_modules: topMods.rows,
      events: acts.rows
    });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── GET /all/users — all users summary (owner only) ──────────────────────────
router.get('/all/users', async (req, res) => {
  try {
    const pool = global.db || req.app.locals.pool;
    await ensureTable(pool);
    const rows = await pool.query(
      `SELECT u.username, u.display_name, u.role, u.tier, u.last_login, u.login_count,
              COUNT(a.id) AS activity_count,
              MAX(a.created_at) AS last_active
       FROM auth_users u
       LEFT JOIN user_activity_log a ON a.username = u.username
       GROUP BY u.username, u.display_name, u.role, u.tier, u.last_login, u.login_count
       ORDER BY last_active DESC NULLS LAST`
    );
    res.json({ ok: true, users: rows.rows });
  } catch (e) { res.status(500).json({ ok: false, users: [], error: e.message }); }
});

module.exports = router;
