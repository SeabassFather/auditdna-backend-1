// =============================================================================
// KIKI - MiniAPI Route Sentinel (Claude-powered route monitor)
// File: C:\AuditDNA\backend\MiniAPI\agents\kiki-route-sentinel.js
//
// ES MODULE (MiniAPI uses "type": "module")
//
// What Kiki watches:
//   - 4xx/5xx response code spikes
//   - Slow response times (>2s = warning, >5s = alert)
//   - Dead endpoints (404 on routes that should exist)
//   - Frontend fetch failures from AgentController
//
// Mounts as Express middleware -> tracks every request/response automatically.
// On error spike -> escalates to Claude. Writes to ai_miniapi_watchers table.
// =============================================================================

const FLUSH_INTERVAL_MS  = 60 * 1000;
const ERROR_RATE_THRESHOLD = 0.10;   // >10% error rate = trigger
const SLOW_THRESHOLD_MS  = 2000;
const ALERT_THRESHOLD_MS = 5000;
const MIN_REQUESTS = 20;             // need at least 20 reqs in window before alerting

let pool      = null;
let aiHelper  = null;
let flushTimer = null;
let running   = false;
let lastFlush = null;

// Rolling window stats
let stats = {
  total: 0,
  by_status: {},      // { 200: 45, 404: 3, 500: 1 }
  by_route:  {},      // { '/api/growers': { count: 50, errors: 0, total_ms: 1234 } }
  slow_count: 0,
  alert_count: 0
};

function resetStats() {
  stats = { total: 0, by_status: {}, by_route: {}, slow_count: 0, alert_count: 0 };
}

// ----------------------------------------------------------------------------
// Middleware - mount in MiniAPI server.js
// ----------------------------------------------------------------------------
export function middleware(req, res, next) {
  if (!running) return next();

  const start = Date.now();
  const route = req.path;

  res.on('finish', () => {
    const elapsed = Date.now() - start;
    const status = res.statusCode;

    stats.total++;
    stats.by_status[status] = (stats.by_status[status] || 0) + 1;

    if (!stats.by_route[route]) {
      stats.by_route[route] = { count: 0, errors: 0, total_ms: 0, slow: 0 };
    }
    const r = stats.by_route[route];
    r.count++;
    r.total_ms += elapsed;
    if (status >= 400) r.errors++;
    if (elapsed > SLOW_THRESHOLD_MS) {
      r.slow++;
      stats.slow_count++;
    }
    if (elapsed > ALERT_THRESHOLD_MS) stats.alert_count++;
  });

  next();
}

// ----------------------------------------------------------------------------
// Periodic analysis
// ----------------------------------------------------------------------------
async function analyze() {
  lastFlush = new Date().toISOString();
  if (stats.total < MIN_REQUESTS) {
    return { ok: true, skipped: true, reason: 'insufficient_traffic', total: stats.total };
  }

  const errorCount = Object.entries(stats.by_status)
    .filter(([code]) => parseInt(code) >= 400)
    .reduce((sum, [, count]) => sum + count, 0);
  const errorRate = errorCount / stats.total;

  // Find worst route
  let worstRoute = null, worstErrorRate = 0;
  for (const [route, r] of Object.entries(stats.by_route)) {
    if (r.count >= 5) {
      const er = r.errors / r.count;
      if (er > worstErrorRate) { worstErrorRate = er; worstRoute = route; }
    }
  }

  const triggered = errorRate > ERROR_RATE_THRESHOLD || stats.alert_count > 0;

  if (triggered) {
    console.warn(`[KIKI] error rate ${(errorRate*100).toFixed(1)}% (worst: ${worstRoute} @ ${(worstErrorRate*100).toFixed(1)}%) - escalating`);

    const ctx = {
      window_seconds: FLUSH_INTERVAL_MS / 1000,
      total_requests: stats.total,
      error_count: errorCount,
      error_rate: errorRate.toFixed(3),
      worst_route: worstRoute,
      worst_route_error_rate: worstErrorRate.toFixed(3),
      slow_count: stats.slow_count,
      alert_count: stats.alert_count,
      by_status: stats.by_status,
      top_routes: Object.entries(stats.by_route)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .map(([route, r]) => ({ route, count: r.count, errors: r.errors, avg_ms: Math.round(r.total_ms / r.count) }))
    };

    const proposal = await escalateToClaude(ctx);
    if (proposal) {
      const id = await saveProposal(proposal, ctx);
      console.warn(`[KIKI] proposal saved id=${id}`);
    }

    try { global.brainEmit && global.brainEmit({ event: 'miniapi.routes.degraded', source_module: 'KIKI', error_rate: errorRate, worst_route: worstRoute }); } catch {}
  }

  resetStats();
  return { ok: true, triggered, error_rate: errorRate, worst_route: worstRoute };
}

async function escalateToClaude(ctx) {
  if (!aiHelper) return null;
  const sys = `You are Kiki, a route sentinel AI. Diagnose API failure patterns.
Return ONLY JSON:
{
  "diagnosis": "string",
  "severity": "low|medium|high|critical",
  "human_action": "string",
  "likely_cause": "string"
}`;
  const usr = `Route stats showing problems:\n${JSON.stringify(ctx, null, 2)}`;
  try {
    const text = await aiHelper.ask(usr, sys);
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch { return null; }
}

async function saveProposal(p, ctx) {
  if (!pool) return null;
  try {
    const r = await pool.query(
      `INSERT INTO ai_miniapi_watchers
       (agent_name, status, severity, diagnosis, human_action, context, created_at)
       VALUES ('KIKI', 'proposed', $1, $2, $3, $4, NOW()) RETURNING id`,
      [p.severity || 'medium', p.diagnosis, p.human_action, JSON.stringify({ ...ctx, likely_cause: p.likely_cause })]
    );
    return r.rows[0]?.id;
  } catch { return null; }
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------
export function init({ pool: p, aiHelper: ai }) { pool = p; aiHelper = ai; }

export function start() {
  if (running) return;
  running = true;
  console.log('[KIKI] Route Sentinel ONLINE (analyze every 60s)');
  flushTimer = setInterval(() => analyze().catch(e => console.error('[KIKI] analyze error:', e.message)), FLUSH_INTERVAL_MS);
}

export function stop() {
  running = false;
  if (flushTimer) { clearInterval(flushTimer); flushTimer = null; }
}

export function getStatus() {
  const errors = Object.entries(stats.by_status)
    .filter(([code]) => parseInt(code) >= 400)
    .reduce((sum, [, count]) => sum + count, 0);
  return {
    ok: true,
    agent: 'KIKI',
    role: 'MiniAPI Route Sentinel',
    running,
    last_flush_at: lastFlush,
    current_window: {
      total_requests: stats.total,
      errors,
      slow: stats.slow_count,
      alerts: stats.alert_count,
      tracked_routes: Object.keys(stats.by_route).length
    },
    error_rate_threshold: ERROR_RATE_THRESHOLD,
    slow_threshold_ms: SLOW_THRESHOLD_MS,
    has_pool: !!pool,
    has_ai: !!aiHelper,
    timestamp: new Date().toISOString()
  };
}

export default { init, start, stop, getStatus, middleware };
