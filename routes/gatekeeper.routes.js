// =============================================================================
// File: C:\AuditDNA\backend\routes\gatekeeper.routes.js
// HTTP routes for the 11-stage gatekeeper pipeline
// =============================================================================

const express = require('express');
const router = express.Router();
const { runPipeline, STAGES } = require('../swarm/gatekeepers/orchestrator');

let pool;
function getPool() {
  if (pool) return pool;
  try { pool = require('../db'); }
  catch (e1) {
    try { pool = require('../config/db'); }
    catch (e2) {
      const { Pool } = require('pg');
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway') ? { rejectUnauthorized: false } : false
      });
    }
  }
  return pool;
}

// POST /api/gatekeeper/run
// Body: { request_type, payload, source? }
router.post('/run', async (req, res) => {
  try {
    const { request_type, payload, source } = req.body || {};
    if (!request_type) return res.status(400).json({ ok: false, error: 'request_type required' });

    // Stamp request envelope
    const enriched = {
      request_type,
      payload: {
        ...(payload || {}),
        _meta: {
          received_at: new Date().toISOString(),
          source_ip: req.ip || (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || null,
          user_agent: req.headers['user-agent'] || null,
          actor_user_id: req.user ? req.user.id : null,
          actor_role: req.user ? req.user.role : null
        }
      },
      source: source || 'http'
    };

    const result = await runPipeline(enriched);
    return res.status(result.ok ? 200 : 422).json(result);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/gatekeeper/runs?limit=50&type=plastpac.inquiry&status=success
router.get('/runs', async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit) || 50, 200);
    const type   = req.query.type   || null;
    const status = req.query.status || null;

    const where = [];
    const params = [];
    if (type)   { params.push(type);   where.push('request_type = $' + params.length); }
    if (status) { params.push(status); where.push('status = $'       + params.length); }
    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
    params.push(limit);

    const p = getPool();
    const r = await p.query(
      `SELECT run_id, request_type, source, actor_role, status, error_msg,
              started_at, finished_at, duration_ms
         FROM gatekeeper_runs
         ${whereSql}
         ORDER BY started_at DESC
         LIMIT $${params.length}`,
      params
    );
    return res.json({ ok: true, runs: r.rows });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/gatekeeper/runs/:run_id
router.get('/runs/:run_id', async (req, res) => {
  try {
    const p = getPool();
    const run = await p.query(
      'SELECT * FROM gatekeeper_runs WHERE run_id = $1', [req.params.run_id]
    );
    if (!run.rows.length) return res.status(404).json({ ok: false, error: 'not_found' });
    const stages = await p.query(
      'SELECT stage_number, stage_name, agent, status, output, error_msg, duration_ms, started_at, finished_at FROM gatekeeper_stages WHERE run_id = $1 ORDER BY stage_number',
      [req.params.run_id]
    );
    return res.json({ ok: true, run: run.rows[0], stages: stages.rows });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/gatekeeper/stats
router.get('/stats', async (req, res) => {
  try {
    const p = getPool();
    const r = await p.query(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status='success') AS success_count,
         COUNT(*) FILTER (WHERE status='failed')  AS failure_count,
         COUNT(*) FILTER (WHERE started_at > NOW() - INTERVAL '24 hours') AS last_24h,
         COUNT(*) FILTER (WHERE started_at > NOW() - INTERVAL '1 hour')   AS last_1h,
         AVG(duration_ms) FILTER (WHERE status='success')::INTEGER AS avg_ms
       FROM gatekeeper_runs`
    );
    const byType = await p.query(
      `SELECT request_type, COUNT(*) AS n
         FROM gatekeeper_runs
        WHERE started_at > NOW() - INTERVAL '24 hours'
        GROUP BY request_type
        ORDER BY n DESC LIMIT 20`
    );
    return res.json({ ok: true, stats: r.rows[0], by_type_24h: byType.rows });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/gatekeeper/agents - list the 11 stages
router.get('/agents', (req, res) => {
  res.json({
    ok: true,
    pipeline: STAGES.map(s => ({ stage: s.number, agent: s.agent, name: s.name }))
  });
});

// GET /api/gatekeeper/margie/daily?date=YYYY-MM-DD
router.get('/margie/daily', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const p = getPool();
    const r = await p.query(
      'SELECT * FROM margie_daily_summary WHERE report_date = $1', [date]
    );
    const archive = await p.query(
      `SELECT id, run_id, request_type, summary, filed_at
         FROM margie_archive
        WHERE report_period = $1
        ORDER BY filed_at DESC LIMIT 200`,
      [date]
    );
    return res.json({
      ok: true,
      date,
      summary: r.rows,
      archive: archive.rows,
      archive_count: archive.rows.length
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
