// =============================================================================
// ENRIQUE - THE FATHER (Swarm Orchestrator + MiniAPI Health Watcher)
// File: C:\AuditDNA\backend\MiniAPI\agents\enrique-health-watcher.js
//
// ES MODULE - replaces the basic health watcher with full orchestrator role.
//
// Enrique's expanded role: "lines everyone up and makes sure all are doing their job"
//
// What Enrique does:
//   1. MiniAPI local health (port, DB, memory, event loop) - every 60s
//   2. Polls ALL OTHER agents' /status endpoints across both backends:
//      - Main backend: GG, Emma, Evelyn, Margie, Swarm coordinator
//      - MiniAPI:      Kiki, Eliott
//   3. Detects "silent" agents (no last_check in 5+ min when they should be polling)
//   4. Detects agents reporting consecutive_failures > 0
//   5. Pages smartwatch + email when something is wrong
//   6. Posts every check result to brain_events for Margie to log
//
// Dependencies on shared notifier (loaded dynamically since cross-backend).
// =============================================================================

import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const POLL_INTERVAL_MS  = 60 * 1000;
const SILENT_THRESHOLD  = 5 * 60 * 1000;     // agent silent if no check in 5 min
const FAILURE_THRESHOLD = 3;
const MINIAPI_PORT      = process.env.PORT || 4000;
const MAIN_BACKEND_PORT = process.env.MAIN_BACKEND_PORT || 5050;

// Agents Enrique watches (besides himself)
const WATCHED = [
  // Main backend agents (port 5050) - poll every 60s -> 5 min silent threshold
  { name: 'GG',      port: MAIN_BACKEND_PORT, path: '/api/gg/status',      kind: 'medic',     silent_threshold_ms: 5  * 60 * 1000 },
  { name: 'EMMA',    port: MAIN_BACKEND_PORT, path: '/api/emma/status',    kind: 'medic',     silent_threshold_ms: 5  * 60 * 1000 },
  { name: 'EVELYN',  port: MAIN_BACKEND_PORT, path: '/api/evelyn/status',  kind: 'janitor',   silent_threshold_ms: 35 * 60 * 1000 },  // 30 min scan + 5 min slack
  { name: 'MARGIE',  port: MAIN_BACKEND_PORT, path: '/api/margie/status',  kind: 'auditor',   silent_threshold_ms: 5  * 60 * 1000 },
  // MiniAPI siblings (port 4000)
  { name: 'KIKI',    port: MINIAPI_PORT,      path: '/api/agents/kiki/status',   kind: 'sentinel', silent_threshold_ms: 5  * 60 * 1000 },
  { name: 'ELIOTT',  port: MINIAPI_PORT,      path: '/api/agents/eliott/status', kind: 'janitor',  silent_threshold_ms: 35 * 60 * 1000 }
];

let pool       = null;
let aiHelper   = null;
let notifier   = null;
let pollTimer  = null;
let running    = false;
let lastCheck  = null;
let lastOk     = null;
let consecutiveFailures = 0;
let lastError  = null;
const startTime = Date.now();

// Children status cache
let childrenStatus = [];
let lastRollupAt   = null;

// ----------------------------------------------------------------------------
// HTTP helper
// ----------------------------------------------------------------------------
function httpGet(host, port, p) {
  return new Promise((resolve) => {
    const req = http.request({ host, port, path: p, timeout: 4000, method: 'GET' }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try { resolve({ ok: res.statusCode === 200, data: JSON.parse(body) }); }
        catch { resolve({ ok: false, error: 'parse_error', raw: body.slice(0, 200) }); }
      });
    });
    req.on('error', (err) => resolve({ ok: false, error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
    req.end();
  });
}

// ----------------------------------------------------------------------------
// Self-checks
// ----------------------------------------------------------------------------
async function checkPortBound() {
  const r = await httpGet('127.0.0.1', MINIAPI_PORT, '/');
  return { ok: r.ok };
}

async function checkDbHealth() {
  if (!pool) return { ok: false, error: 'no_pool' };
  try {
    const r = await pool.query('SELECT 1 AS health');
    return { ok: r.rows[0].health === 1 };
  } catch (err) { return { ok: false, error: err.message }; }
}

function checkMemory() {
  const usage = process.memoryUsage();
  const rssMB = Math.round(usage.rss / 1024 / 1024);
  return { ok: rssMB < 1024, rss_mb: rssMB, heap_used_mb: Math.round(usage.heapUsed / 1024 / 1024) };
}

function checkEventLoopLag() {
  return new Promise((resolve) => {
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const lagMs = Number(process.hrtime.bigint() - start) / 1e6;
      resolve({ ok: lagMs < 500, lag_ms: Math.round(lagMs) });
    });
  });
}

// ----------------------------------------------------------------------------
// Rollup: poll all other agents
// ----------------------------------------------------------------------------
async function rollupChildren() {
  lastRollupAt = new Date().toISOString();
  const results = [];

  for (const w of WATCHED) {
    const r = await httpGet('127.0.0.1', w.port, w.path);

    let issues = [];
    let summary = 'ok';
    let agentRunning = false;
    let lastCheckAge = null;

    if (!r.ok) {
      issues.push(`unreachable: ${r.error || 'http_failed'}`);
      summary = 'unreachable';
    } else if (r.data) {
      agentRunning = !!r.data.running;
      if (!agentRunning) issues.push('not running');

      // Last check freshness (Emma uses last_verify_at, Evelyn last_scan_at, GG last_health_at, etc.)
      const lastAt = r.data.last_verify_at || r.data.last_scan_at || r.data.last_health_at || r.data.last_check_at || r.data.last_flush_at || r.data.last_poll_at || null;
      if (lastAt) {
        const age = Date.now() - new Date(lastAt).getTime();
        lastCheckAge = age;
        if (age > SILENT_THRESHOLD) issues.push(`silent for ${Math.round(age/60000)} min`);
      }

      // Consecutive failures
      const fails = r.data.consecutive_failures || 0;
      if (fails >= FAILURE_THRESHOLD) issues.push(`${fails} consecutive failures`);

      if (issues.length === 0) summary = 'ok';
      else if (issues.length === 1) summary = issues[0];
      else summary = `${issues.length} issues`;
    }

    results.push({
      agent:           w.name,
      kind:            w.kind,
      reachable:       r.ok,
      running:         agentRunning,
      last_check_age_ms: lastCheckAge,
      issues,
      summary,
      raw_status:      r.data || null
    });
  }

  childrenStatus = results;

  // Page Saul if any agent has issues
  const problematic = results.filter(r => r.issues.length > 0);
  if (problematic.length > 0 && notifier) {
    const severity = problematic.some(p => !p.reachable) ? 'high' : 'medium';
    const summary = `${problematic.length}/${WATCHED.length} agents have issues: ` +
      problematic.map(p => `${p.agent}(${p.summary})`).join(', ');

    await notifier.notify({
      agent: 'ENRIQUE',
      event_type: 'swarm.children.degraded',
      severity,
      summary,
      context: { problematic: problematic.map(p => ({ agent: p.agent, issues: p.issues })) }
    });
  } else if (notifier) {
    // Silent heartbeat to brain only
    await notifier.notify({
      agent: 'ENRIQUE',
      event_type: 'swarm.rollup.ok',
      severity: 'info',
      summary: `All ${WATCHED.length} children agents healthy`,
      context: { children_count: WATCHED.length }
    });
  }

  return results;
}

// ----------------------------------------------------------------------------
// Main poll
// ----------------------------------------------------------------------------
async function pollOnce() {
  lastCheck = new Date().toISOString();

  // Self-health
  const [port, db, lag] = await Promise.all([checkPortBound(), checkDbHealth(), checkEventLoopLag()]);
  const mem = checkMemory();
  const selfOk = port.ok && db.ok && mem.ok && lag.ok;

  // Roll up children
  const children = await rollupChildren();
  const allOk = selfOk && children.every(c => c.issues.length === 0);
  lastOk = allOk;

  if (allOk) {
    consecutiveFailures = 0;
    return { ok: true, self: { port, db, mem, lag }, children };
  }

  // Self failed
  if (!selfOk) {
    consecutiveFailures++;
    lastError = JSON.stringify({ port, db, mem, lag });
    if (consecutiveFailures === FAILURE_THRESHOLD && notifier) {
      await notifier.notify({
        agent: 'ENRIQUE',
        event_type: 'enrique.self.degraded',
        severity: 'high',
        summary: `Enrique self-health failed ${consecutiveFailures}x`,
        context: { port, db, mem, lag }
      });
    }
  }

  return { ok: false, self: { port, db, mem, lag }, children };
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------
export function init({ pool: p, aiHelper: ai, notifier: n }) {
  pool     = p;
  aiHelper = ai;
  notifier = n;
}

export function start() {
  if (running) return;
  running = true;
  console.log('[ENRIQUE] THE FATHER ONLINE (orchestrator + health, poll every 60s)');
  console.log(`[ENRIQUE] Watching ${WATCHED.length} children: ${WATCHED.map(w => w.name).join(', ')}`);
  pollOnce().catch(err => console.error('[ENRIQUE] poll error:', err.message));
  pollTimer = setInterval(() => {
    pollOnce().catch(err => console.error('[ENRIQUE] poll error:', err.message));
  }, POLL_INTERVAL_MS);
}

export function stop() {
  running = false;
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

export function getStatus() {
  return {
    ok: true,
    agent: 'ENRIQUE',
    role: 'THE FATHER - Swarm Orchestrator + MiniAPI Health',
    running,
    last_check_at:        lastCheck,
    last_check_ok:        lastOk,
    consecutive_failures: consecutiveFailures,
    last_error:           lastError,
    uptime_s:             Math.round((Date.now() - startTime) / 1000),
    last_rollup_at:       lastRollupAt,
    watched_count:        WATCHED.length,
    children_status:      childrenStatus,
    has_pool:             !!pool,
    has_ai:               !!aiHelper,
    has_notifier:         !!notifier,
    timestamp:            new Date().toISOString()
  };
}

export default { init, start, stop, getStatus };
