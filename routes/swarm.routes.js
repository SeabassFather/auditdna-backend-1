// =============================================================================
// SWARM ROUTES - PHASE 4
// File: C:\AuditDNA\backend\routes\swarm.routes.js
//
// Mounted at /api/swarm in server.js. All endpoints use safeQuery so they don't
// hang when DB pool is starved. Returns empty arrays / nulls instead of 500s.
//
// Endpoints:
//   GET  /api/swarm/status        - coordinator state + agent registry
//   GET  /api/swarm/dispatches    - paginated dispatch history (?limit=50&agent=&status=)
//   GET  /api/swarm/agents        - agent registry with last-fired stats
//   GET  /api/swarm/metrics       - 1h / 24h / 7d rollups
//   POST /api/swarm/publish       - manually fire test event into brain_events
//   POST /api/swarm/dispatch/:id  - retry a failed dispatch
// =============================================================================

const express = require('express');
const pool = require('../db');
const router = express.Router();

const QUERY_TIMEOUT_MS = 4000;

function safeQuery(pool, sql, params = [], timeoutMs = QUERY_TIMEOUT_MS) {
  if (!pool) return Promise.resolve({ rows: [], skipped: true, error: 'no_pool' });
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ rows: [], skipped: true, error: 'timeout' });
    }, timeoutMs);
    pool.query(sql, params)
      .then(r => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ rows: r.rows || [], skipped: false });
      })
      .catch(e => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ rows: [], skipped: true, error: e.message });
      });
  });
}

function getPool(req) {
  return req.app.get('pool') || global.pool || pool || null;
}

function getCoordinator() {
  try {
    return require('../services/swarm-coordinator').get();
  } catch (e) {
    return null;
  }
}

// =============================================================================
// GET /api/swarm/status
// =============================================================================
router.get('/status', async (req, res) => {
  const coord = getCoordinator();
  const pool  = getPool(req);

  const live   = coord ? coord.status() : { running: false };
  const counts = await safeQuery(pool, `
    SELECT
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour')      AS dispatches_1h,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')    AS dispatches_24h,
      COUNT(*) FILTER (WHERE status='failed' AND created_at >= NOW() - INTERVAL '24 hours') AS failed_24h,
      COUNT(*) FILTER (WHERE status='succeeded' AND created_at >= NOW() - INTERVAL '24 hours') AS succeeded_24h
    FROM swarm_dispatches
  `);

  res.json({
    ok: true,
    coordinator: live,
    counts: counts.rows[0] || { dispatches_1h: 0, dispatches_24h: 0, failed_24h: 0, succeeded_24h: 0 },
    db_skipped: counts.skipped || false,
    timestamp: new Date().toISOString()
  });
});

// =============================================================================
// GET /api/swarm/dispatches?limit=50&agent=NIGHTWATCH&status=failed
// =============================================================================
router.get('/dispatches', async (req, res) => {
  const pool   = getPool(req);
  const limit  = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const agent  = req.query.agent || null;
  const status = req.query.status || null;

  const wheres = [];
  const params = [];
  if (agent)  { params.push(agent);  wheres.push(`agent_name = $${params.length}`); }
  if (status) { params.push(status); wheres.push(`status = $${params.length}`); }
  params.push(limit);
  const whereSql = wheres.length ? `WHERE ${wheres.join(' AND ')}` : '';

  const r = await safeQuery(pool,
    `SELECT id, agent_name, event_type, brain_event_id, status, error_message,
            duration_ms, created_at, started_at, completed_at
       FROM swarm_dispatches
       ${whereSql}
       ORDER BY id DESC
       LIMIT $${params.length}`,
    params
  );

  res.json({
    ok: true,
    rows: r.rows,
    db_skipped: r.skipped || false
  });
});

// =============================================================================
// GET /api/swarm/agents
// =============================================================================
router.get('/agents', async (req, res) => {
  const pool = getPool(req);
  let registry = {};
  try {
    registry = require('../services/swarm-agents').REGISTRY || {};
  } catch (e) {}

  const agentNames = Object.keys(registry);
  const stats = await safeQuery(pool, `
    SELECT agent_name,
           COUNT(*)                                 AS total,
           COUNT(*) FILTER (WHERE status='succeeded') AS succeeded,
           COUNT(*) FILTER (WHERE status='failed')    AS failed,
           COUNT(*) FILTER (WHERE status='skipped')   AS skipped,
           MAX(created_at)                          AS last_fired_at,
           AVG(duration_ms)::INTEGER                AS avg_duration_ms
      FROM swarm_dispatches
     WHERE created_at >= NOW() - INTERVAL '24 hours'
     GROUP BY agent_name
  `);

  const statsByName = {};
  for (const row of stats.rows) {
    statsByName[row.agent_name] = row;
  }

  const coord = getCoordinator();
  const circuits = coord?.status()?.circuits || {};

  const agents = agentNames.map(name => ({
    name,
    description: registry[name].description,
    subscribes:  registry[name].subscribes || [],
    cron_ms:     registry[name].cron || null,
    stats_24h:   statsByName[name] || { total: 0, succeeded: 0, failed: 0, skipped: 0, last_fired_at: null },
    circuit:     circuits[name] || null
  }));

  res.json({ ok: true, agents, db_skipped: stats.skipped || false });
});

// =============================================================================
// GET /api/swarm/metrics?window=1h|24h|7d
// =============================================================================
router.get('/metrics', async (req, res) => {
  const pool = getPool(req);
  const win  = req.query.window || '24h';
  const interval = win === '1h' ? '1 hour' : win === '7d' ? '7 days' : '24 hours';

  const r = await safeQuery(pool,
    `SELECT
       date_trunc('hour', created_at) AS bucket,
       COUNT(*)                                 AS total,
       COUNT(*) FILTER (WHERE status='succeeded') AS succeeded,
       COUNT(*) FILTER (WHERE status='failed')    AS failed,
       AVG(duration_ms)::INTEGER                AS avg_duration_ms
       FROM swarm_dispatches
      WHERE created_at >= NOW() - INTERVAL '${interval}'
      GROUP BY bucket
      ORDER BY bucket DESC
      LIMIT 200`,
    []
  );

  res.json({ ok: true, window: win, buckets: r.rows, db_skipped: r.skipped || false });
});

// =============================================================================
// POST /api/swarm/publish
// Body: { event_type: 'test.event', payload: {} }
// =============================================================================
router.post('/publish', async (req, res) => {
  const pool = getPool(req);
  const b = req.body || {};
  if (!b.event_type) return res.status(400).json({ ok: false, error: 'event_type required' });

  const r = await safeQuery(pool,
    `INSERT INTO brain_events (event_type, payload) VALUES ($1, $2) RETURNING id, created_at`,
    [b.event_type, b.payload || {}]
  );

  if (r.skipped) {
    return res.status(503).json({ ok: false, error: r.error || 'db_unavail' });
  }

  res.json({
    ok: true,
    event_id: r.rows[0].id,
    event_type: b.event_type,
    created_at: r.rows[0].created_at
  });
});

// =============================================================================
// POST /api/swarm/dispatch/:id  - retry a dispatch
// =============================================================================
router.post('/dispatch/:id', async (req, res) => {
  const pool = getPool(req);
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ ok: false, error: 'invalid_id' });

  const r = await safeQuery(pool,
    `SELECT id, agent_name, event_type, brain_event_id, payload, retry_count
       FROM swarm_dispatches WHERE id = $1`,
    [id]
  );
  if (!r.rows.length) return res.status(404).json({ ok: false, error: 'not_found' });
  const d = r.rows[0];

  // Re-publish a synthetic event so the coordinator picks it up via normal flow
  await safeQuery(pool,
    `INSERT INTO brain_events (event_type, payload) VALUES ($1, $2)`,
    [d.event_type || 'swarm.retry', d.payload || {}]
  );

  await safeQuery(pool,
    `UPDATE swarm_dispatches SET retry_count = retry_count + 1, status = 'retried' WHERE id = $1`,
    [id]
  );

  res.json({ ok: true, retried: id, agent: d.agent_name });
});

module.exports = router;
