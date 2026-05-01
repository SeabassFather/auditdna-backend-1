// =============================================================================
// File: unsubscribe.js
// Save to: C:\AuditDNA\backend\routes\unsubscribe.js
// =============================================================================
// Sprint D Wave 3C - Email unsubscribe handler
// Stops [WARN] unsubscribe not found in PM2 logs.
// Real CAN-SPAM-compliant flow comes in Wave 4 when EmailMarketing fires bulk.
// For now: persists unsubscribes in unsubscribes table for honoring.
// =============================================================================

const express = require('express');
const pool = require('../db');
const router = express.Router();

const db = () => pool || null;

let schemaReady = false;
async function ensureSchema() {
  if (schemaReady) return true;
  const pool = db();
  if (!pool) return false;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS unsubscribes (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        list_name TEXT,
        reason TEXT,
        ip_address TEXT,
        user_agent TEXT,
        unsubscribed_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_unsub_email_list
        ON unsubscribes(LOWER(email), COALESCE(list_name, 'all'));
    `);
    schemaReady = true;
    return true;
  } catch (e) { return false; }
}
ensureSchema().catch(() => {});

// GET form (link from email)
router.get('/', async (req, res) => {
  const email = req.query.email || '';
  const list = req.query.list || 'all';
  res.send(`
    <!DOCTYPE html>
    <html><head><title>Unsubscribe - Mexausa Food Group</title>
    <style>body{font-family:-apple-system,sans-serif;max-width:480px;margin:40px auto;padding:20px;color:#0F1419;background:#F4F6F4}
    h1{color:#0F7B41}button{background:#B91C1C;color:#fff;border:0;padding:12px 24px;font-size:14px;cursor:pointer;border-radius:4px}</style>
    </head><body>
    <h1>Unsubscribe</h1>
    <p>Confirm unsubscribe for <strong>${email}</strong> from <strong>${list}</strong>:</p>
    <form method="POST" action="/api/unsubscribe">
      <input type="hidden" name="email" value="${email}">
      <input type="hidden" name="list" value="${list}">
      <button type="submit">Confirm Unsubscribe</button>
    </form>
    </body></html>
  `);
});

// POST handler
router.post('/', async (req, res) => {
  await ensureSchema();
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'db unavailable' });
  const email = (req.body.email || req.query.email || '').toLowerCase().trim();
  const list = req.body.list || req.query.list || 'all';
  if (!email) return res.status(400).json({ error: 'email required' });
  try {
    await pool.query(
      `INSERT INTO unsubscribes (email, list_name, ip_address, user_agent)
       VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [email, list, req.ip, req.headers['user-agent']]
    );
    res.send(`<h2>Unsubscribed</h2><p>You will no longer receive emails from "${list}". Mexausa Food Group, Inc.</p>`);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Check endpoint - is this email unsubscribed?
router.get('/check', async (req, res) => {
  await ensureSchema();
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'db unavailable' });
  const email = (req.query.email || '').toLowerCase().trim();
  if (!email) return res.status(400).json({ error: 'email required' });
  try {
    const r = await pool.query(
      `SELECT list_name, unsubscribed_at FROM unsubscribes WHERE LOWER(email) = $1`,
      [email]
    );
    res.json({ ok: true, email, count: r.rows.length, rows: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/health', (req, res) => res.json({ ok: true, service: 'unsubscribe', version: '3C' }));

module.exports = router;
