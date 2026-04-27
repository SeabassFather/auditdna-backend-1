// =============================================================================
// File: watch.js
// Save to: C:\AuditDNA\backend\routes\watch.js
// =============================================================================
// Sprint D Wave 3C - Watch list module (replaces broken file)
// Original file had: [ERR] Failed to load watch.js: Unexpected token 'const'
// This is a clean drop-in replacement.
//
// Provides watch list functionality for buyers/growers/commodities the team
// is monitoring. Persists to watchlist table.
// =============================================================================

const express = require('express');
const router = express.Router();

const db = () => global.db || null;

let schemaReady = false;
async function ensureSchema() {
  if (schemaReady) return true;
  const pool = db();
  if (!pool) return false;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS watchlist (
        id SERIAL PRIMARY KEY,
        watch_type TEXT NOT NULL,
        target_id INTEGER,
        target_name TEXT,
        commodity TEXT,
        owner_email TEXT,
        priority INTEGER DEFAULT 5,
        notes TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_seen_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_watchlist_active ON watchlist(is_active) WHERE is_active = TRUE;
      CREATE INDEX IF NOT EXISTS idx_watchlist_type ON watchlist(watch_type);
      CREATE INDEX IF NOT EXISTS idx_watchlist_owner ON watchlist(owner_email);
    `);
    schemaReady = true;
    return true;
  } catch (e) { return false; }
}
ensureSchema().catch(() => {});

router.get('/list', async (req, res) => {
  await ensureSchema();
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'db unavailable' });
  try {
    let q = `SELECT id, watch_type, target_id, target_name, commodity, owner_email,
                    priority, notes, is_active, created_at, last_seen_at
             FROM watchlist WHERE is_active = TRUE`;
    const params = [];
    if (req.query.type)  { params.push(req.query.type);  q += ` AND watch_type = $${params.length}`; }
    if (req.query.owner) { params.push(req.query.owner); q += ` AND owner_email = $${params.length}`; }
    q += ` ORDER BY priority DESC, created_at DESC LIMIT 200`;
    const r = await pool.query(q, params);
    res.json({ ok: true, count: r.rows.length, rows: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/add', async (req, res) => {
  await ensureSchema();
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'db unavailable' });
  const w = req.body || {};
  if (!w.watch_type || !w.target_name) {
    return res.status(400).json({ error: 'watch_type and target_name required' });
  }
  try {
    const r = await pool.query(
      `INSERT INTO watchlist (watch_type, target_id, target_name, commodity, owner_email, priority, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [
        w.watch_type, w.target_id || null, w.target_name,
        w.commodity || null, w.owner_email || null,
        w.priority || 5, w.notes || null
      ]
    );
    res.json({ ok: true, id: r.rows[0].id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/deactivate/:id', async (req, res) => {
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'db unavailable' });
  try {
    await pool.query(`UPDATE watchlist SET is_active = FALSE WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/health', (req, res) => res.json({ ok: true, service: 'watch', version: '3C' }));

module.exports = router;
