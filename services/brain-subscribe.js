// ============================================================================
// AuditDNA Brain SSE Subscription Service
// File: C:\AuditDNA\backend\services\brain-subscribe.js
// Purpose: server-sent events stream so frontend modules get pushed updates
//          when relevant events fire (no polling needed).
//
// Add to server.js:  app.use('/api/brain', require('./services/brain-subscribe'));
// ============================================================================

const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

// Active SSE clients: { res, moduleId, subscribesTo, lastEventId }
const clients = new Set();
let nextEventIdSeen = 0;

// Poll the rfq_brain_events table every 2s and fan out to subscribed clients
async function pollAndFanout() {
  if (clients.size === 0) return;
  const pool = getPool();
  try {
    const q = await pool.query(
      `SELECT id, event_type, rfq_id, actor_id, actor_role, payload, created_at
       FROM rfq_brain_events WHERE id > $1 ORDER BY id ASC LIMIT 50`,
      [nextEventIdSeen]
    );
    if (!q.rows.length) return;
    nextEventIdSeen = q.rows[q.rows.length - 1].id;

    for (const ev of q.rows) {
      const payload = JSON.stringify({
        id: ev.id,
        type: ev.event_type,
        rfq_id: ev.rfq_id,
        actor: { id: ev.actor_id, role: ev.actor_role },
        payload: ev.payload,
        ts: ev.created_at
      });
      for (const c of clients) {
        if (c.subscribesTo.length === 0 || c.subscribesTo.includes(ev.event_type)) {
          try {
            c.res.write(`id: ${ev.id}\nevent: brain\ndata: ${payload}\n\n`);
          } catch (_e) { /* client gone, will be cleaned up on close */ }
        }
      }
    }
  } catch (e) {
    console.error('[brain-subscribe] poll error:', e.message);
  }
}

// Initialize the high-water mark at startup
async function initWatermark() {
  try {
    const pool = getPool();
    const q = await pool.query(`SELECT COALESCE(MAX(id), 0) AS max_id FROM rfq_brain_events`);
    nextEventIdSeen = parseInt(q.rows[0].max_id, 10);
    console.log(`[brain-subscribe] starting at event id > ${nextEventIdSeen}`);
  } catch (e) {
    console.error('[brain-subscribe] init watermark error:', e.message);
  }
}

let pollInterval = null;
function startPolling() {
  if (pollInterval) return;
  initWatermark().then(() => {
    pollInterval = setInterval(pollAndFanout, 2000);
  });
}
startPolling();

// GET /api/brain/subscribe?moduleId=mission_control
router.get('/subscribe', async (req, res) => {
  const moduleId = req.query.moduleId || null;
  let subscribesTo = [];
  if (moduleId) {
    const pool = getPool();
    const q = await pool.query(`SELECT subscribes_to FROM brain_module_registry WHERE module_id=$1`, [moduleId]);
    subscribesTo = (q.rows[0] && q.rows[0].subscribes_to) || [];
  } else if (req.query.events) {
    subscribesTo = String(req.query.events).split(',').map(s => s.trim()).filter(Boolean);
  }

  res.set({
    'Content-Type':       'text/event-stream',
    'Cache-Control':      'no-cache, no-transform',
    'Connection':         'keep-alive',
    'X-Accel-Buffering':  'no'
  });
  res.flushHeaders();
  res.write(`: connected to brain stream (moduleId=${moduleId || 'all'})\n\n`);

  const client = { res, moduleId, subscribesTo };
  clients.add(client);

  // Heartbeat to keep proxies happy
  const hb = setInterval(() => {
    try { res.write(`: heartbeat ${Date.now()}\n\n`); } catch (_) {}
  }, 25000);

  req.on('close', () => {
    clearInterval(hb);
    clients.delete(client);
  });
});

// GET /api/brain/subscribe/status - count active SSE clients
router.get('/subscribe/status', (_req, res) => {
  const byModule = {};
  for (const c of clients) {
    const k = c.moduleId || '_all';
    byModule[k] = (byModule[k] || 0) + 1;
  }
  res.json({ ok: true, total_clients: clients.size, by_module: byModule, watermark: nextEventIdSeen });
});

module.exports = router;
