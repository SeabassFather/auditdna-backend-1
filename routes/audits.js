// =============================================================================
// File: audits.js
// Save to: C:\AuditDNA\backend\routes\audits.js
// =============================================================================
// Sprint D Wave 3C - Admin Action Audit Log
// Stops [WARN] audits not found in PM2 logs.
// Logs every admin-side state change (deal accept/decline, role changes, etc.).
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
      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        actor_email TEXT,
        actor_id INTEGER,
        action TEXT NOT NULL,
        target_table TEXT,
        target_id INTEGER,
        before_state JSONB,
        after_state JSONB,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_email);
      CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_log(target_table, target_id);
      CREATE INDEX IF NOT EXISTS idx_audit_at ON audit_log(created_at DESC);
    `);
    schemaReady = true;
    return true;
  } catch (e) { return false; }
}
ensureSchema().catch(() => {});

if (!global.auditLog) {
  global.auditLog = async function (entry) {
    const pool = db();
    if (!pool) return;
    if (!schemaReady) await ensureSchema();
    try {
      await pool.query(
        `INSERT INTO audit_log (actor_email, actor_id, action, target_table, target_id, before_state, after_state, ip_address)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          entry.actor_email || null,
          entry.actor_id || null,
          entry.action || 'unknown',
          entry.target_table || null,
          entry.target_id || null,
          entry.before ? JSON.stringify(entry.before) : null,
          entry.after ? JSON.stringify(entry.after) : null,
          entry.ip_address || null
        ]
      );
    } catch (e) { /* non-fatal */ }
  };
}

router.post('/log', async (req, res) => {
  await ensureSchema();
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'db unavailable' });
  const e = req.body || {};
  if (!e.action) return res.status(400).json({ error: 'action required' });
  try {
    const r = await pool.query(
      `INSERT INTO audit_log (actor_email, actor_id, action, target_table, target_id, before_state, after_state, ip_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [
        e.actor_email || null,
        e.actor_id || null,
        e.action,
        e.target_table || null,
        e.target_id || null,
        e.before ? JSON.stringify(e.before) : null,
        e.after ? JSON.stringify(e.after) : null,
        req.ip
      ]
    );
    res.json({ ok: true, id: r.rows[0].id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/recent', async (req, res) => {
  await ensureSchema();
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'db unavailable' });
  const limit = Math.min(parseInt(req.query.limit) || 100, 500);
  try {
    const r = await pool.query(
      `SELECT id, actor_email, action, target_table, target_id, created_at
       FROM audit_log ORDER BY created_at DESC LIMIT $1`, [limit]);
    res.json({ ok: true, count: r.rows.length, rows: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/health', (req, res) => res.json({ ok: true, service: 'audits', version: '3C' }));

module.exports = router;
