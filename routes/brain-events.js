// ============================================================================
// brain-events.js — Brain SSE Event Bus + Platform Health Monitor
// MexaUSA Food Group, Inc. — AuditDNA Agriculture
// Save to: C:\AuditDNA\backend\routes\brain-events.js
//
// WHAT THIS DOES:
//   1. SSE /api/brain/events — live event stream for all frontend modules
//   2. POST /api/brain/emit  — any module fires an event into the bus
//   3. GET  /api/brain/health — full platform health check
//   4. POST /api/brain/deploy-webhook — Netlify calls this on every deploy
//   5. Auto-monitors: Railway backend, Netlify pages, DB connectivity
//   6. Sends ntfy alerts to auditdna-agro-saul2026 on failures
// ============================================================================

'use strict';
const express  = require('express');
const router   = express.Router();
const https    = require('https');
const http     = require('http');

// ── SSE CLIENT REGISTRY ───────────────────────────────────────────────────
const clients = new Map(); // id → res
let clientId  = 0;
let eventLog  = []; // last 100 events in memory

function broadcast(event) {
  const ts = new Date().toISOString();
  const payload = JSON.stringify({ ...event, ts });
  eventLog.unshift({ ...event, ts });
  if (eventLog.length > 100) eventLog = eventLog.slice(0, 100);

  clients.forEach((res, id) => {
    try {
      res.write(`data: ${payload}\n\n`);
    } catch (e) {
      clients.delete(id);
    }
  });

  console.log(`[BRAIN-EVENT] ${event.type || 'EVENT'} — ${event.module || ''} — ${event.message || ''}`);
}

// ── SSE ENDPOINT ─────────────────────────────────────────────────────────
router.get('/events', (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const id = ++clientId;
  clients.set(id, res);

  // Send last 20 events on connect so UI is not blank
  const recent = eventLog.slice(0, 20).reverse();
  recent.forEach(e => {
    try { res.write(`data: ${JSON.stringify(e)}\n\n`); } catch (_) {}
  });

  // Heartbeat every 25s
  const hb = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch (_) { clearInterval(hb); clients.delete(id); }
  }, 25000);

  req.on('close', () => { clearInterval(hb); clients.delete(id); });

  broadcast({ type: 'BRAIN_CONNECT', module: 'Brain', message: `Client ${id} connected. ${clients.size} total.` });
});

// ── EMIT ENDPOINT — any module posts events here ─────────────────────────
router.post('/emit', (req, res) => {
  const { type, module, message, data, level } = req.body || {};
  if (!type) return res.status(400).json({ error: 'type required' });

  broadcast({ type, module: module || 'Unknown', message: message || '', data: data || {}, level: level || 'info' });

  // Alert Saul on critical events
  if (level === 'critical' || level === 'error') {
    sendNtfy(`[${module || 'BRAIN'}] ${type}`, message || type, 'urgent');
  }

  res.json({ success: true, clients: clients.size });
});

// ── HEALTH CHECK ──────────────────────────────────────────────────────────
const HEALTH_CHECKS = [
  { name: 'Railway Backend', url: 'https://auditdna-backend-1-production.up.railway.app/health', critical: true },
  { name: 'Netlify Frontend', url: 'https://mexausafg.com', critical: true },
  { name: 'LOAF Page', url: 'https://mexausafg.com/mfginc-loaf.html', critical: false, minSize: 150000 },
  { name: 'EnjoyBaja', url: 'https://enjoybaja.com', critical: false },
];

async function checkUrl(check) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const lib = check.url.startsWith('https') ? https : http;
    const req = lib.get(check.url, { timeout: 8000 }, (res) => {
      let size = 0;
      res.on('data', chunk => { size += chunk.length; });
      res.on('end', () => {
        const ms = Date.now() - startTime;
        const ok = res.statusCode >= 200 && res.statusCode < 400 &&
                   (!check.minSize || size >= check.minSize);
        resolve({
          name: check.name, url: check.url, status: res.statusCode,
          size, ms, ok, critical: check.critical,
          error: ok ? null : (size < (check.minSize || 0) ? `Size ${size} < ${check.minSize}` : `HTTP ${res.statusCode}`)
        });
      });
    });
    req.on('error', (e) => resolve({ name: check.name, url: check.url, ok: false, critical: check.critical, error: e.message, ms: Date.now() - startTime }));
    req.on('timeout', () => { req.destroy(); resolve({ name: check.name, url: check.url, ok: false, critical: check.critical, error: 'Timeout', ms: 8000 }); });
  });
}

async function runHealthChecks(silent) {
  const results = await Promise.all(HEALTH_CHECKS.map(checkUrl));
  const failed  = results.filter(r => !r.ok);
  const allOk   = failed.length === 0;

  if (!silent) {
    broadcast({
      type: 'HEALTH_CHECK',
      module: 'Brain Monitor',
      message: allOk ? 'All systems operational' : `${failed.length} check(s) failed`,
      level: allOk ? 'info' : 'error',
      data: { results, allOk, failed }
    });
  }

  // Alert on critical failures
  failed.filter(f => f.critical).forEach(f => {
    sendNtfy(
      `CRITICAL: ${f.name} DOWN`,
      `${f.error} — ${f.url}`,
      'max'
    );
  });

  // Alert on non-critical failures too but lower priority
  failed.filter(f => !f.critical).forEach(f => {
    sendNtfy(
      `WARNING: ${f.name}`,
      `${f.error}`,
      'default'
    );
  });

  return { allOk, results, failed };
}

router.get('/health', async (req, res) => {
  const result = await runHealthChecks(false);
  res.json({ success: true, ...result, clients: clients.size, eventLog: eventLog.slice(0, 10) });
});

// ── DEPLOY WEBHOOK — Netlify calls this after every deploy ────────────────
router.post('/deploy-webhook', async (req, res) => {
  const { context, branch, commit_ref, deploy_time, url } = req.body || {};

  broadcast({
    type:    'DEPLOY',
    module:  'Netlify',
    message: `Deploy complete — ${branch || 'main'} @ ${(commit_ref || '').slice(0, 8)}`,
    level:   'info',
    data:    { context, branch, commit_ref, deploy_time, url }
  });

  sendNtfy(
    'AuditDNA Deploy Complete',
    `Branch: ${branch || 'main'} | Commit: ${(commit_ref || '').slice(0, 8)} | Running health checks...`,
    'default'
  );

  res.json({ success: true, message: 'Webhook received' });

  // Run health checks 30s after deploy to give Netlify time to propagate
  setTimeout(async () => {
    const result = await runHealthChecks(false);
    if (result.allOk) {
      sendNtfy('Deploy Healthy', `All ${result.results.length} checks passed`, 'default');
    } else {
      sendNtfy(
        'Deploy FAILED Health Check',
        result.failed.map(f => `${f.name}: ${f.error}`).join(' | '),
        'urgent'
      );
    }
  }, 30000);
});

// ── RECENT EVENTS ─────────────────────────────────────────────────────────
router.get('/log', (req, res) => {
  res.json({ success: true, events: eventLog, clients: clients.size });
});

// ── NTFY ALERTS ───────────────────────────────────────────────────────────
function sendNtfy(title, message, priority) {
  const channel = process.env.NTFY_CHANNEL || 'auditdna-agro-saul2026';
  const priorityMap = { max: 5, urgent: 4, high: 3, default: 2, low: 1 };
  const prio = priorityMap[priority] || 2;

  const body = JSON.stringify({ topic: channel, title, message, priority: prio });
  const options = {
    hostname: 'ntfy.sh',
    port: 443,
    path: '/',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  };

  const req = https.request(options, (res) => {
    console.log(`[BRAIN-NTFY] ${title} — ntfy status: ${res.statusCode}`);
  });
  req.on('error', (e) => console.warn('[BRAIN-NTFY] Failed:', e.message));
  req.write(body);
  req.end();
}

// ── AUTO HEALTH MONITOR — runs every 5 minutes ────────────────────────────
let monitorInterval = null;
function startMonitor() {
  if (monitorInterval) return;
  // First check after 60s startup
  setTimeout(() => runHealthChecks(true), 60000);
  // Then every 5 minutes
  monitorInterval = setInterval(() => runHealthChecks(true), 5 * 60 * 1000);
  console.log('[BRAIN-EVENTS] Health monitor started — checks every 5 minutes');
}
startMonitor();

// Export broadcast so other routes can emit events
module.exports = router;
module.exports.broadcast = broadcast;
module.exports.sendNtfy  = sendNtfy;
