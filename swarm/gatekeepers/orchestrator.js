// =============================================================================
// File: C:\AuditDNA\backend\swarm\gatekeepers\orchestrator.js
// 11-STAGE GATEKEEPER ORCHESTRATOR
// Runs Sentinel -> Atlas -> Verdict -> Forge -> Anvil -> Mill -> Loom -> Prism ->
//      Scout -> Courier -> Margie
// =============================================================================

const crypto = require('crypto');

const STAGES = [
  require('./01-sentinel'),
  require('./02-atlas'),
  require('./03-verdict'),
  require('./04-forge'),
  require('./05-anvil'),
  require('./06-mill'),
  require('./07-loom'),
  require('./08-prism'),
  require('./09-scout'),
  require('./10-courier'),
  require('./11-margie-archive')
];

let pool;
function getPool() {
  if (pool) return pool;
  try { pool = require('../../db'); }
  catch (e1) {
    try { pool = require('../../config/db'); }
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

let notifier = null;
function getNotifier() {
  if (notifier !== null) return notifier;
  try { notifier = require('../../services/swarm-notifier'); }
  catch (e) { notifier = false; }
  return notifier;
}

async function logStage(runId, stage, status, output, errorMsg, startedAt, finishedAt) {
  try {
    const p = getPool();
    if (!p || !p.query) return;
    await p.query(
      `INSERT INTO gatekeeper_stages
        (run_id, stage_number, stage_name, agent, status, output, error_msg, started_at, finished_at, duration_ms)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [runId, stage.number, stage.name, stage.agent, status,
       output ? JSON.stringify(output) : null,
       errorMsg || null,
       new Date(startedAt).toISOString(),
       new Date(finishedAt).toISOString(),
       finishedAt - startedAt]
    );
  } catch (e) { /* swallow - logging must not break pipeline */ }
}

async function logRunStart(runId, request) {
  try {
    const p = getPool();
    if (!p || !p.query) return;
    const meta = (request.payload && request.payload._meta) || {};
    await p.query(
      `INSERT INTO gatekeeper_runs
        (run_id, request_type, source, actor_user_id, actor_role, payload, status)
       VALUES ($1,$2,$3,$4,$5,$6,'running')`,
      [runId, request.request_type, request.source || null,
       meta.actor_user_id || null, meta.actor_role || null,
       JSON.stringify(request.payload || {})]
    );
  } catch (e) { /* swallow */ }
}

async function logRunEnd(runId, status, result, errorMsg, startedAt) {
  try {
    const p = getPool();
    if (!p || !p.query) return;
    const finishedAt = Date.now();
    await p.query(
      `UPDATE gatekeeper_runs
         SET status=$1, result=$2, error_msg=$3, finished_at=NOW(), duration_ms=$4
       WHERE run_id=$5`,
      [status, result ? JSON.stringify(result) : null, errorMsg || null,
       finishedAt - startedAt, runId]
    );
  } catch (e) { /* swallow */ }
}

async function notify(severity, title, message) {
  const n = getNotifier();
  if (!n || typeof n.notify !== 'function') return;
  try { await n.notify({ severity, title, message, source: 'gatekeeper' }); }
  catch (e) { /* swallow */ }
}

async function runPipeline(request) {
  const runId = crypto.randomUUID ? crypto.randomUUID() : require('crypto').randomBytes(16).toString('hex');
  const startedAt = Date.now();

  const ctx = {
    run_id: runId,
    request: request || {},
    started_at: startedAt,
    stages: [],
    had_failure: false
  };

  await logRunStart(runId, request);

  let firstError = null;

  for (const stage of STAGES) {
    const stageStart = Date.now();
    let output = null;
    let status = 'success';
    let errorMsg = null;

    try {
      output = await stage.run(ctx);
    } catch (e) {
      status = 'failed';
      errorMsg = e && e.message ? e.message : String(e);
      ctx.had_failure = true;
      ctx.error_msg = errorMsg;
      if (!firstError) firstError = { stage: stage.number, agent: stage.agent, msg: errorMsg };
    }

    const stageEnd = Date.now();
    ctx.stages.push({
      number: stage.number,
      name: stage.name,
      agent: stage.agent,
      status,
      output,
      error: errorMsg,
      duration_ms: stageEnd - stageStart
    });
    await logStage(runId, stage, status, output, errorMsg, stageStart, stageEnd);

    // Critical failures halt pipeline EXCEPT we always run stage 11 (Margie) for audit
    if (status === 'failed' && stage.number < 11) {
      // skip remaining stages except Margie
      const margie = STAGES[STAGES.length - 1];
      if (stage.number !== margie.number) {
        try {
          const ms = Date.now();
          const mout = await margie.run(ctx);
          ctx.stages.push({
            number: margie.number, name: margie.name, agent: margie.agent,
            status: 'success', output: mout, error: null, duration_ms: Date.now() - ms
          });
          await logStage(runId, margie, 'success', mout, null, ms, Date.now());
        } catch (me) { /* swallow */ }
      }
      break;
    }
  }

  ctx.finished_at = Date.now();
  ctx.duration_ms = ctx.finished_at - ctx.started_at;

  const finalStatus = ctx.had_failure ? 'failed' : 'success';
  await logRunEnd(runId, finalStatus, ctx.response || null, firstError ? firstError.msg : null, startedAt);

  // Notify on failure or on flagged success
  if (ctx.had_failure) {
    await notify('high', 'Gatekeeper pipeline failed',
      'run_id=' + runId + ' type=' + (request && request.request_type) +
      ' stage=' + (firstError && firstError.stage) + ' err=' + (firstError && firstError.msg));
  } else if (ctx.intel && (ctx.intel.is_target_buyer || ctx.business && ctx.business.tier === 'hot')) {
    await notify('medium', 'Gatekeeper: high-value request processed',
      'type=' + request.request_type + ' tier=' + (ctx.business && ctx.business.tier) +
      ' target=' + (ctx.intel && ctx.intel.is_target_buyer));
  }

  return {
    ok: !ctx.had_failure,
    run_id: runId,
    duration_ms: ctx.duration_ms,
    stages: ctx.stages.map(s => ({
      n: s.number, agent: s.agent, name: s.name, status: s.status, ms: s.duration_ms
    })),
    response: ctx.response || null,
    error: firstError
  };
}

module.exports = { runPipeline, STAGES };
