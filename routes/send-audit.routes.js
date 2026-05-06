// ============================================================
// File: send-audit.routes.js
// Save to: C:\AuditDNA\backend\routes\send-audit.routes.js
// Mount: app.use('/api/send-audit', require('./routes/send-audit.routes'));
// ============================================================
// Endpoints:
//   GET /api/send-audit/today        - Today's sends across all team members
//   GET /api/send-audit/recent?n=20  - Most recent N sends (for dashboard tile)
//   GET /api/send-audit/digest?date=YYYY-MM-DD - Per-team-member breakdown for a date
//   GET /api/send-audit/by-sender    - Roll-up by sender for a date range
//   GET /api/send-audit/by-industry  - Roll-up by industry for a date range
//   GET /api/send-audit/full/:id     - Full audit row for one send (admin)
// ============================================================

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'auditdna',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'auditdna2026',
});

// Helper - "today in PT" since the company runs on Pacific time
function todayPTBounds() {
  const now = new Date();
  const ptOffset = -7; // PDT - adjust to -8 for PST if needed
  const ptNow = new Date(now.getTime() + (ptOffset * 60 * 60 * 1000));
  const start = new Date(ptNow.getFullYear(), ptNow.getMonth(), ptNow.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  // Convert back to UTC for query
  start.setHours(start.getHours() - ptOffset);
  end.setHours(end.getHours() - ptOffset);
  return { start, end };
}

// ============================================================
// GET /today
// Today's send activity - high-level stats for the dashboard tile header
// ============================================================
router.get('/today', async (req, res) => {
  try {
    const { start, end } = todayPTBounds();
    const r = await pool.query(`
      SELECT
        COUNT(*) AS total_sends,
        COUNT(DISTINCT contact_email) AS unique_recipients,
        COUNT(DISTINCT sender_email) AS active_senders,
        COUNT(DISTINCT industry) AS industries_touched,
        COUNT(DISTINCT commodity) AS commodities_touched,
        SUM(attachment_count) AS total_attachments
      FROM email_activity_log
      WHERE direction = 'sent'
        AND created_at >= $1
        AND created_at < $2
    `, [start, end]);
    res.json({ ok: true, today: r.rows[0], range: { start, end } });
  } catch (e) {
    console.error('[send-audit/today]', e);
    res.status(500).json({ ok: false, error: e.message || String(e), code: e.code });
  }
});

// ============================================================
// GET /recent?n=20
// Most recent N sends for the dashboard tile feed
// ============================================================
router.get('/recent', async (req, res) => {
  try {
    const n = Math.min(parseInt(req.query.n || '20', 10), 100);
    const r = await pool.query(`
      SELECT
        id,
        sender_email,
        contact_email,
        contact_name,
        contact_type,
        commodity,
        industry,
        subject,
        attachment_count,
        recipient_count,
        agent_id,
        intent,
        created_at
      FROM email_activity_log
      WHERE direction = 'sent'
      ORDER BY created_at DESC
      LIMIT $1
    `, [n]);
    res.json({ ok: true, sends: r.rows });
  } catch (e) {
    console.error('[send-audit/recent]', e);
    res.status(500).json({ ok: false, error: e.message || String(e), code: e.code });
  }
});

// ============================================================
// GET /digest?date=YYYY-MM-DD
// Full digest used by the 6am cron and ad-hoc reports
// ============================================================
router.get('/digest', async (req, res) => {
  try {
    const dateStr = req.query.date || new Date().toISOString().split('T')[0];
    const start = new Date(`${dateStr}T07:00:00Z`); // 00:00 PT = 07:00 UTC (PDT)
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    // Totals
    const totals = await pool.query(`
      SELECT
        COUNT(*) AS total_sends,
        COUNT(DISTINCT contact_email) AS unique_recipients,
        SUM(attachment_count) AS total_attachments
      FROM email_activity_log
      WHERE direction = 'sent'
        AND created_at >= $1 AND created_at < $2
    `, [start, end]);

    // Per-sender breakdown
    const bySender = await pool.query(`
      SELECT
        COALESCE(sender_email, 'unknown') AS sender_email,
        COUNT(*) AS sends,
        COUNT(DISTINCT contact_email) AS unique_recipients,
        ARRAY_AGG(DISTINCT commodity) FILTER (WHERE commodity IS NOT NULL) AS commodities,
        ARRAY_AGG(DISTINCT industry) FILTER (WHERE industry IS NOT NULL) AS industries
      FROM email_activity_log
      WHERE direction = 'sent'
        AND created_at >= $1 AND created_at < $2
      GROUP BY sender_email
      ORDER BY sends DESC
    `, [start, end]);

    // Per-industry breakdown
    const byIndustry = await pool.query(`
      SELECT
        COALESCE(industry, 'Uncategorized') AS industry,
        COUNT(*) AS sends,
        COUNT(DISTINCT contact_email) AS unique_recipients
      FROM email_activity_log
      WHERE direction = 'sent'
        AND created_at >= $1 AND created_at < $2
      GROUP BY industry
      ORDER BY sends DESC
    `, [start, end]);

    res.json({
      ok: true,
      date: dateStr,
      totals: totals.rows[0],
      by_sender: bySender.rows,
      by_industry: byIndustry.rows
    });
  } catch (e) {
    console.error('[send-audit/digest]', e);
    res.status(500).json({ ok: false, error: e.message || String(e), code: e.code });
  }
});

// ============================================================
// GET /by-sender?days=7
// Sender leaderboard for a date range
// ============================================================
router.get('/by-sender', async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days || '7', 10), 90);
    const r = await pool.query(`
      SELECT
        COALESCE(sender_email, 'unknown') AS sender_email,
        COUNT(*) AS sends,
        COUNT(DISTINCT contact_email) AS unique_recipients,
        MAX(created_at) AS last_sent
      FROM email_activity_log
      WHERE direction = 'sent'
        AND created_at >= NOW() - ($1 || ' days')::interval
      GROUP BY sender_email
      ORDER BY sends DESC
    `, [days]);
    res.json({ ok: true, days, leaderboard: r.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || String(e), code: e.code });
  }
});

// ============================================================
// GET /by-industry?days=7
// ============================================================
router.get('/by-industry', async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days || '7', 10), 90);
    const r = await pool.query(`
      SELECT
        COALESCE(industry, 'Uncategorized') AS industry,
        COUNT(*) AS sends,
        COUNT(DISTINCT contact_email) AS unique_recipients,
        ARRAY_AGG(DISTINCT commodity) FILTER (WHERE commodity IS NOT NULL) AS commodities
      FROM email_activity_log
      WHERE direction = 'sent'
        AND created_at >= NOW() - ($1 || ' days')::interval
      GROUP BY industry
      ORDER BY sends DESC
    `, [days]);
    res.json({ ok: true, days, by_industry: r.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || String(e), code: e.code });
  }
});

// ============================================================
// GET /full/:id
// Full audit row for one send (admin only)
// ============================================================
router.get('/full/:id', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT * FROM email_activity_log WHERE id = $1
    `, [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'not_found' });
    res.json({ ok: true, row: r.rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || String(e), code: e.code });
  }
});

module.exports = router;
