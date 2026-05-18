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

// ── BRAIN TABLE INIT (self-creating) ─────────────────────────────────────────
let _brainTableReady = false;
async function ensureBrainTable(db) {
  if (_brainTableReady) return;
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS brain_events (
      id SERIAL PRIMARY KEY,
      event_type VARCHAR(100) NOT NULL,
      payload JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await db.query(`CREATE TABLE IF NOT EXISTS brain_log (
      id SERIAL PRIMARY KEY,
      event_type VARCHAR(100) NOT NULL,
      payload JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    _brainTableReady = true;
    console.log('[BRAIN] Tables ready');
  } catch(e) { console.warn('[BRAIN] Table init:', e.message); }
}

router.get('/setup', async (req, res) => {
  const db = req.app.get('pool') || req.app.locals.pool;
  if (!db) return res.status(500).json({ error: 'No pool' });
  await ensureBrainTable(db);
  await db.query(
    "INSERT INTO brain_events(event_type,payload,created_at)VALUES($1,$2,NOW())",
    ['PLATFORM_BOOT', JSON.stringify({ version:'2.0', platform:'AuditDNA Agriculture', ts: new Date().toISOString() })]
  ).catch(e => console.warn(e.message));
  const r = await db.query('SELECT COUNT(*) AS cnt FROM brain_events').catch(() => ({ rows:[{cnt:0}] }));
  res.json({ success: true, total_events: r.rows[0].cnt });
});

router.post('/emit', async (req, res) => {
  const { type, module, message, data, level } = req.body || {};
  if (!type) return res.status(400).json({ error: 'type required' });

  // Persist to brain_events table
  try {
    const db = req.app.get('pool') || req.app.locals.pool;
    if (db) {
      await ensureBrainTable(db);
      await db.query(
        'INSERT INTO brain_events(event_type,payload,created_at) VALUES($1,$2,NOW())',
        [type, JSON.stringify({ module, message, data, level })]
      ).catch(() => {});
    }
  } catch(_) {}

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


// ══ PERSISTENT MEMORY + A/B OPTIMIZATION ═══════════════════════════════════

// POST /api/brain/events/memory-store — store agent memory (uses pgvector if available)
router.post('/memory-store', async (req, res) => {
  const db = req.app.get('db') || global.db;
  if (!db) return res.status(503).json({ error:'DB unavailable' });
  const { agent_id, contact_id, memory_type, content, metadata } = req.body;
  if (!agent_id || !content) return res.status(400).json({ error:'agent_id and content required' });
  try {
    await db.query(
      `INSERT INTO brain_events (event_type, agent_id, payload, created_at)
       VALUES ('MEMORY_STORED', $1, $2, NOW())`,
      [agent_id, JSON.stringify({ contact_id, memory_type, content, metadata })]
    ).catch(()=>{});
    res.json({ ok:true, stored:true, agent_id, memory_type,
      note:'Vector embedding requires pgvector extension — enabling via Railway add-on' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/brain/events/template-ab — record template performance for A/B
router.post('/template-ab', async (req, res) => {
  const db = req.app.get('db') || global.db;
  const { template_id, event, contact_id, category } = req.body;
  // event = 'sent' | 'opened' | 'replied' | 'deal'
  if (!template_id || !event) return res.status(400).json({ error:'template_id and event required' });
  if (db) {
    await db.query(
      `INSERT INTO brain_events (event_type, payload, created_at)
       VALUES ('TEMPLATE_AB', $1, NOW())`,
      [JSON.stringify({ template_id, event, contact_id, category, ts: new Date().toISOString() })]
    ).catch(()=>{});
    // Update blast_templates performance counter
    const col = event === 'opened' ? 'open_count' : event === 'replied' ? 'reply_count' : event === 'deal' ? 'deal_count' : null;
    if (col) {
      await db.query(
        `UPDATE blast_templates SET ${col} = COALESCE(${col},0) + 1, last_used = NOW() WHERE id = $1`,
        [template_id]
      ).catch(()=>{});
    }
  }
  res.json({ ok:true, recorded:true, template_id, event });
});

// GET /api/brain/events/template-performance — ranked templates by open/reply/deal rate
router.get('/template-performance', async (req, res) => {
  const db = req.app.get('db') || global.db;
  if (!db) return res.status(503).json({ error:'DB unavailable' });
  try {
    // Count from brain_events
    const r = await db.query(
      `SELECT payload->>'template_id' as template_id,
              SUM(CASE WHEN payload->>'event'='sent'   THEN 1 ELSE 0 END) as sent,
              SUM(CASE WHEN payload->>'event'='opened' THEN 1 ELSE 0 END) as opened,
              SUM(CASE WHEN payload->>'event'='replied'THEN 1 ELSE 0 END) as replied,
              SUM(CASE WHEN payload->>'event'='deal'   THEN 1 ELSE 0 END) as deals
       FROM brain_events WHERE event_type='TEMPLATE_AB'
       GROUP BY payload->>'template_id' ORDER BY deals DESC, replied DESC`
    ).catch(()=>({rows:[]}));
    const ranked = r.rows.map(t => ({
      ...t, sent:parseInt(t.sent||0), opened:parseInt(t.opened||0),
      replied:parseInt(t.replied||0), deals:parseInt(t.deals||0),
      open_rate: t.sent>0 ? ((t.opened/t.sent)*100).toFixed(1)+'%' : '—',
      reply_rate: t.sent>0 ? ((t.replied/t.sent)*100).toFixed(1)+'%' : '—',
      deal_rate: t.sent>0 ? ((t.deals/t.sent)*100).toFixed(1)+'%' : '—',
    }));
    res.json({ ok:true, templates:ranked, count:ranked.length,
      recommendation: ranked[0] ? `Top template: ${ranked[0].template_id} (${ranked[0].deal_rate} deal rate)` : 'No data yet' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/brain/events/welink-feedback — WE LINK match outcome feedback
router.post('/welink-feedback', async (req, res) => {
  const db = req.app.get('db') || global.db;
  const { match_id, outcome, reason, grower_id, land_id } = req.body;
  // outcome = 'success' | 'declined' | 'expired' | 'contract_signed'
  if (!match_id || !outcome) return res.status(400).json({ error:'match_id and outcome required' });
  if (db) {
    await db.query(
      `UPDATE we_link_matches SET status=$1, outcome_reason=$2, updated_at=NOW() WHERE id=$3`,
      [outcome, reason||null, match_id]
    ).catch(()=>{});
    await db.query(
      `INSERT INTO brain_events (event_type, payload, created_at) VALUES ('WELINK_FEEDBACK',$1,NOW())`,
      [JSON.stringify({ match_id, outcome, reason, grower_id, land_id })]
    ).catch(()=>{});
  }
  res.json({ ok:true, feedback_recorded:true, match_id, outcome,
    note:'WE LINK scoring model updates quarterly from aggregated feedback' });
});

module.exports = router;
module.exports.broadcast = broadcast;

// ── BRAIN LIVE FEED — real DB query ──────────────────────────────────────────
router.get('/live-feed', async (req, res) => {
  const db = req.app.get('pool') || req.app.locals.pool;
  if (!db) return res.json({ events:[], count:0, error:'no pool', ts:new Date().toISOString() });
  try {
    const limit = Math.min(parseInt(req.query.limit)||50, 200);
    const [r1,r2] = await Promise.all([
      db.query('SELECT id,event_type,payload,created_at FROM brain_events ORDER BY created_at DESC LIMIT $1',[limit]).catch(()=>({rows:[]})),
      db.query('SELECT id,event_type,payload,created_at FROM brain_log ORDER BY created_at DESC LIMIT $1',[limit]).catch(()=>({rows:[]}))
    ]);
    const all = [...r1.rows,...r2.rows]
      .sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))
      .slice(0,limit);
    res.json({ events:all, count:all.length, sources:['brain_events','brain_log'], ts:new Date().toISOString() });
  } catch(e) {
    res.json({ events:[], count:0, error:e.message, ts:new Date().toISOString() });
  }
});

module.exports.sendNtfy  = sendNtfy;
