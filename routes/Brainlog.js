// =============================================================================
// File: Brainlog.js
// Save to: C:\AuditDNA\backend\routes\Brainlog.js
// =============================================================================
// Sprint D Wave 3C - Brain Event Logger
//
// Lightweight brain event capture endpoint. Used by:
//   - factor-intake.js (Wave 3B) when emitting factor.intake.scored events
//   - niner-bridge.js when emitting niner.* events
//   - autonomy modules (A1-A15) when reporting actions
//
// Endpoints:
//   POST /api/brain/events      - log a brain event
//   GET  /api/brain/events      - list recent events (admin)
//   GET  /api/brain/events/:id  - retrieve one event
//   GET  /api/brain/stats       - rolled-up event counts
//
// Persists to brain_events table (created on first call if missing).
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
      CREATE TABLE IF NOT EXISTS brain_events (
        id SERIAL PRIMARY KEY,
        event_type TEXT NOT NULL,
        source_module TEXT,
        deal_id INTEGER,
        upload_id INTEGER,
        commodity TEXT,
        payload JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_brain_events_type ON brain_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_brain_events_at ON brain_events(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_brain_events_deal ON brain_events(deal_id) WHERE deal_id IS NOT NULL;
    `);
    schemaReady = true;
    return true;
  } catch (e) {
    console.error('[BRAINLOG] schema init failed:', e.message);
    return false;
  }
}

// Wire global emitter so factor-intake.js + niner-bridge.js can fire events without HTTP
if (!global.brainEmit) {
  global.brainEmit = async function (evt) {
    const pool = db();
    if (!pool) return;
    if (!schemaReady) await ensureSchema();
    try {
      await pool.query(
        `INSERT INTO brain_events (event_type, source_module, deal_id, upload_id, commodity, payload)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          evt.event || 'unknown',
          evt.source_module || evt.source || null,
          evt.deal_id || null,
          evt.upload_id || null,
          evt.commodity || null,
          JSON.stringify(evt)
        ]
      );
    } catch (e) { /* non-fatal */ }
  };
}

// Auto-init on first import (don't block boot)
ensureSchema().catch(() => {});

router.post('/events', async (req, res) => {
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'db unavailable' });
  await ensureSchema();
  const evt = req.body || {};
  if (!evt.event && !evt.event_type) {
    return res.status(400).json({ error: 'event or event_type required' });
  }
  try {
    const r = await pool.query(
      `INSERT INTO brain_events (event_type, source_module, deal_id, upload_id, commodity, payload)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, created_at`,
      [
        evt.event || evt.event_type,
        evt.source_module || evt.source || null,
        evt.deal_id || null,
        evt.upload_id || null,
        evt.commodity || null,
        JSON.stringify(evt)
      ]
    );
    res.json({ ok: true, id: r.rows[0].id, logged_at: r.rows[0].created_at });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/events', async (req, res) => {
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'db unavailable' });
  await ensureSchema();
  const limit = Math.min(parseInt(req.query.limit) || 50, 500);
  const since = req.query.since || null;
  const eventType = req.query.event_type || null;
  try {
    let q = `SELECT id, event_type, source_module, deal_id, upload_id, commodity, payload, created_at
             FROM brain_events WHERE 1=1`;
    const params = [];
    if (since)     { params.push(since); q += ` AND created_at >= $${params.length}`; }
    if (eventType) { params.push(eventType); q += ` AND event_type = $${params.length}`; }
    params.push(limit);
    q += ` ORDER BY created_at DESC LIMIT $${params.length}`;
    const r = await pool.query(q, params);
    res.json({ ok: true, count: r.rows.length, rows: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/events/:id', async (req, res) => {
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'db unavailable' });
  try {
    const r = await pool.query(`SELECT * FROM brain_events WHERE id = $1`, [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true, event: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/stats', async (req, res) => {
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'db unavailable' });
  await ensureSchema();
  try {
    const r1 = await pool.query(`SELECT COUNT(*)::int AS total FROM brain_events`);
    const r2 = await pool.query(
      `SELECT event_type, COUNT(*)::int AS n
       FROM brain_events WHERE created_at >= NOW() - INTERVAL '24 hours'
       GROUP BY event_type ORDER BY n DESC LIMIT 20`
    );
    const r3 = await pool.query(
      `SELECT event_type, COUNT(*)::int AS n
       FROM brain_events WHERE created_at >= NOW() - INTERVAL '7 days'
       GROUP BY event_type ORDER BY n DESC LIMIT 20`
    );
    res.json({
      ok: true,
      total_lifetime: r1.rows[0].total,
      last_24h: r2.rows,
      last_7d: r3.rows
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/health', (req, res) => {
  res.json({ ok: true, service: 'brainlog', version: '3C', schema_ready: schemaReady });
});

module.exports = router;
