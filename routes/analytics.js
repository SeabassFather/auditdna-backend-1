// =============================================================================
// File: analytics.js
// Save to: C:\AuditDNA\backend\routes\analytics.js
// =============================================================================
// Sprint D Wave 3C - Lightweight Analytics Endpoint
// Stops [WARN] analytics not found.
// Aggregates from existing tables (financing_deals, distress_uploads, factor_score_history).
// =============================================================================

const express = require('express');
const router = express.Router();

const db = () => global.db || null;

router.get('/dashboard', async (req, res) => {
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'db unavailable' });
  try {
    const out = { ok: true, generated_at: new Date().toISOString() };
    // Try each query independently - if a table doesn't exist, skip gracefully
    try {
      const r = await pool.query(`SELECT COUNT(*)::int AS n FROM financing_deals`);
      out.total_deals = r.rows[0].n;
    } catch (e) { out.total_deals = null; }
    try {
      const r = await pool.query(`SELECT COUNT(*)::int AS n FROM financing_deals WHERE created_at >= NOW() - INTERVAL '7 days'`);
      out.deals_7d = r.rows[0].n;
    } catch (e) { out.deals_7d = null; }
    try {
      const r = await pool.query(`SELECT COUNT(*)::int AS n, COALESCE(AVG(qpf_score), 0)::numeric(5,2) AS avg_qpf FROM factor_score_history`);
      out.factor_scores = r.rows[0].n;
      out.avg_qpf = r.rows[0].avg_qpf;
    } catch (e) { out.factor_scores = null; out.avg_qpf = null; }
    try {
      const r = await pool.query(`SELECT COUNT(*)::int AS n FROM distress_uploads`);
      out.distress_uploads_total = r.rows[0].n;
    } catch (e) { out.distress_uploads_total = null; }
    try {
      const r = await pool.query(`SELECT COUNT(*)::int AS n FROM brain_events WHERE created_at >= NOW() - INTERVAL '24 hours'`);
      out.brain_events_24h = r.rows[0].n;
    } catch (e) { out.brain_events_24h = null; }
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/factor-by-tier', async (req, res) => {
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'db unavailable' });
  try {
    const r = await pool.query(
      `SELECT buyer_credit_tier AS tier, COUNT(*)::int AS deal_count,
              COALESCE(SUM(invoice_amount), 0)::numeric AS total_invoice_usd,
              COALESCE(AVG(qpf_score), 0)::numeric(5,2) AS avg_qpf,
              COALESCE(AVG(expected_advance_pct), 0)::numeric(5,2) AS avg_advance_pct
       FROM factor_score_history
       WHERE buyer_credit_tier IS NOT NULL
       GROUP BY buyer_credit_tier ORDER BY buyer_credit_tier`
    );
    res.json({ ok: true, count: r.rows.length, rows: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/factor-by-partner', async (req, res) => {
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'db unavailable' });
  try {
    const r = await pool.query(
      `SELECT recommended_partner_code AS partner, COUNT(*)::int AS deal_count,
              COALESCE(SUM(invoice_amount), 0)::numeric AS total_invoice_usd
       FROM factor_score_history
       WHERE recommended_partner_code IS NOT NULL
       GROUP BY recommended_partner_code ORDER BY deal_count DESC`
    );
    res.json({ ok: true, count: r.rows.length, rows: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/health', (req, res) => res.json({ ok: true, service: 'analytics', version: '3C' }));

module.exports = router;
