// =============================================================================
// File: Brainlog.js
// Save to: C:\AuditDNA\backend\routes\Brainlog.js
// =============================================================================
// Sprint D Wave 3C.1 - Brain Event Logger (PATH FIX)
//
// IMPORTANT: This module is mounted at /api/brainlog (NOT /api/brain).
// /api/brain is occupied by the existing brain-stream module from earlier sprints.
// Path collision caused empty responses on health/events endpoints.
//
// Endpoints (note path):
//   POST /api/brainlog/events
//   GET  /api/brainlog/events
//   GET  /api/brainlog/events/:id
//   GET  /api/brainlog/stats
//   GET  /api/brainlog/health
//
// global.brainEmit() still works the same - it's an in-process function call.
// =============================================================================

const express = require('express');
const router = express.Router();

const db = () => global.db || null;

let schemaReady = false;
let schemaInitInProgress = false;
async function ensureSchema() {
  if (schemaReady) return true;
  if (schemaInitInProgress) {
    // Another caller is initializing - wait briefly
    await new Promise(r => setTimeout(r, 200));
    return schemaReady;
  }
  schemaInitInProgress = true;
  const pool = db();
  if (!pool) { schemaInitInProgress = false; return false; }
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
    schemaInitInProgress = false;
    return true;
  } catch (e) {
    schemaInitInProgress = false;
    // Don't log the timeout error - it's expected during boot avalanche
    if (!String(e.message).includes('Connection terminated')) {
      console.error('[BRAINLOG] schema init failed:', e.message);
    }
    return false;
  }
}

// Wire global emitter
if (!global.brainEmit) {
  global.brainEmit = async function (evt) {
    const pool = db();
    if (!pool) return;
    if (!schemaReady) await ensureSchema();
    if (!schemaReady) return; // still failed - skip silently
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

// Defer schema init to 5s after import - avoids boot avalanche timeout
setTimeout(() => { ensureSchema().catch(() => {}); }, 5000);

router.post('/events', async (req, res) => {
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'db unavailable' });
  await ensureSchema();
  if (!schemaReady) return res.status(503).json({ error: 'schema not ready' });
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
  if (!schemaReady) return res.status(503).json({ error: 'schema not ready' });
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
  if (!schemaReady) return res.status(503).json({ error: 'schema not ready' });
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
  res.json({ ok: true, service: 'brainlog', version: '3C.1', schema_ready: schemaReady });
});

module.exports = router;
