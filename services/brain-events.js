/**
 * C:\AuditDNA\backend\services\brain-events.js (v2)
 *
 * Phase 1 Day 5 - Brain event bus, schema-corrected.
 *
 * Real rfq_brain_events schema has NO `processed` column. Tracks state via
 * a sibling tracking table rfq_brain_events_state(event_id, processed, processed_at).
 *
 * On startup we ensureSchema() to create the state table if missing.
 */

const express = require('express');
const router = express.Router();
const getPool = require('../db');
const pool = getPool();

const POLL_INTERVAL_MS = 10000;
const NTFY_TOPIC = process.env.NTFY_TOPIC || 'auditdna-agro-saul2026';
const NTFY_URL = `https://ntfy.sh/${NTFY_TOPIC}`;

let pollTimer = null;
let pushHelper = null;
let whatsappHelper = null;
let schemaReady = false;

// ----------------------------------------------------------------------------
// Schema bootstrap - sibling state table
// ----------------------------------------------------------------------------
async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rfq_brain_events_state (
      event_id      BIGINT PRIMARY KEY REFERENCES rfq_brain_events(id) ON DELETE CASCADE,
      processed     BOOLEAN NOT NULL DEFAULT FALSE,
      processed_at  TIMESTAMPTZ,
      attempts      INT NOT NULL DEFAULT 0,
      last_error    TEXT
    );
    CREATE INDEX IF NOT EXISTS ix_rfq_brain_state_unprocessed
      ON rfq_brain_events_state(event_id) WHERE processed = FALSE;
  `);
  schemaReady = true;
  console.log('[brain] state table ready');
}

// ----------------------------------------------------------------------------
// Lazy helpers
// ----------------------------------------------------------------------------
function getPushHelper() {
  if (!pushHelper) {
    try { pushHelper = require('./webpush-server'); }
    catch (e) { console.warn('[brain] webpush-server not available'); }
  }
  return pushHelper;
}

function getWhatsappHelper() {
  if (!whatsappHelper) {
    try { whatsappHelper = require('./whatsapp-rfq-bridge'); } catch (e) {}
  }
  return whatsappHelper;
}

// ----------------------------------------------------------------------------
// ntfy push
// ----------------------------------------------------------------------------
async function pushNtfy(title, body, priority = 'default', tags = []) {
  try {
    await fetch(NTFY_URL, {
      method: 'POST',
      headers: {
        'Title': title,
        'Priority': priority,
        'Tags': tags.join(','),
      },
      body,
    });
  } catch (e) {
    console.error('[brain] ntfy push failed:', e.message);
  }
}

// ----------------------------------------------------------------------------
// Event handlers
// ----------------------------------------------------------------------------
const handlers = {
  'rfq.created': async (event) => {
    const { rfq_code, commodity, buyer_anonymous, gmv } = event.payload || {};
    await pushNtfy(
      `New RFQ: ${rfq_code || 'unknown'}`,
      `${buyer_anonymous || 'Buyer'} wants ${commodity || 'commodity'} (~$${gmv || '?'})`,
      'default', ['rfq', 'new']
    );
  },
  'rfq.bid_placed': async (event) => {
    const { rfq_code, grower_anonymous, price, buyer_id } = event.payload || {};
    await pushNtfy(`Bid on ${rfq_code}`, `${grower_anonymous} offered $${price}`, 'default', ['rfq','bid']);
    const ph = getPushHelper();
    if (ph && buyer_id) {
      await ph.sendPushToUser(buyer_id, 'buyer', {
        title: `New offer on ${rfq_code}`,
        body: `${grower_anonymous} offered $${price}/unit. Tap to review.`,
        url: `/rfq/${event.rfq_id}`, tag: `rfq-${event.rfq_id}`,
      });
    }
  },
  'rfq.locked': async (event) => {
    const { rfq_code, finance_mode, gmv, grower_id, margin } = event.payload || {};
    await pushNtfy(`LOCKED: ${rfq_code} ($${gmv})`, `Mode ${finance_mode} | margin $${margin}`, 'high', ['rfq','locked','money']);
    const ph = getPushHelper();
    if (ph && grower_id) {
      await ph.sendPushToUser(grower_id, 'grower', {
        title: `You won ${rfq_code}`,
        body: 'Deal locked. Check inbox for shipping.',
        url: '/grower/inbox', tag: `rfq-locked-${event.rfq_id}`, requireInteraction: true,
      });
    }
    const wa = getWhatsappHelper();
    if (wa && grower_id) {
      try { await wa.notifyGrower(grower_id, `Won ${rfq_code}. Check the app.`); } catch (e) {}
    }
  },
  'rfq.expired': async (event) => {
    const { rfq_code } = event.payload || {};
    await pushNtfy(`Expired: ${rfq_code}`, 'No grower locked in time', 'low', ['rfq','expired']);
  },
  'shipment.distress': async (event) => {
    const { rfq_code, reason, buyer_id } = event.payload || {};
    await pushNtfy(`DISTRESS: ${rfq_code}`, reason || 'shipment in distress', 'urgent', ['rotating_light','distress']);
    const ph = getPushHelper();
    if (ph && buyer_id) {
      await ph.sendPushToUser(buyer_id, 'buyer', {
        title: `URGENT: ${rfq_code}`, body: reason || 'Shipment in distress',
        url: `/rfq/${event.rfq_id}`, requireInteraction: true,
      });
    }
  },
  'grower.activated': async (event) => {
    const { grower_name, grs_score, region } = event.payload || {};
    await pushNtfy(`Grower activated: ${grower_name}`, `GRS ${grs_score} | ${region}`, 'default', ['grower','new']);
  },
  'buyer.vetted': async (event) => {
    const { buyer_name, paca_status } = event.payload || {};
    await pushNtfy(`Buyer vetted: ${buyer_name}`, `PACA: ${paca_status}`, 'default', ['buyer','vetted']);
  },
};

// ----------------------------------------------------------------------------
// Polling - join brain events with state to find unprocessed
// ----------------------------------------------------------------------------
async function processEvents() {
  if (!schemaReady) return;
  try {
    const r = await pool.query(`
      SELECT e.id, e.event_type, e.rfq_id, e.actor_id, e.actor_role, e.payload, e.created_at
        FROM rfq_brain_events e
        LEFT JOIN rfq_brain_events_state s ON s.event_id = e.id
       WHERE s.event_id IS NULL OR s.processed = FALSE
       ORDER BY e.id ASC
       LIMIT 50
    `);
    if (r.rows.length === 0) return;
    for (const event of r.rows) {
      const handler = handlers[event.event_type];
      let ok = true; let err = null;
      if (handler) {
        try { await handler(event); }
        catch (e) { ok = false; err = e.message; console.error(`[brain] handler ${event.event_type} failed:`, err); }
      }
      await pool.query(`
        INSERT INTO rfq_brain_events_state (event_id, processed, processed_at, attempts, last_error)
        VALUES ($1, $2, NOW(), 1, $3)
        ON CONFLICT (event_id) DO UPDATE SET
          processed = $2, processed_at = NOW(),
          attempts = rfq_brain_events_state.attempts + 1,
          last_error = $3
      `, [event.id, ok, err]);
    }
    console.log(`[brain] processed ${r.rows.length} events`);
  } catch (e) {
    console.error('[brain] poll error:', e.message);
  }
}

function startPolling() {
  if (pollTimer) return;
  ensureSchema()
    .then(() => {
      pollTimer = setInterval(processEvents, POLL_INTERVAL_MS);
      console.log(`[brain] event polling started (${POLL_INTERVAL_MS}ms, ntfy=${NTFY_TOPIC})`);
      setImmediate(processEvents);
    })
    .catch(e => console.error('[brain] schema bootstrap failed:', e.message));
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

async function emitEvent(eventType, rfqId, payload, actorId = null, actorRole = null) {
  await pool.query(`
    INSERT INTO rfq_brain_events (event_type, rfq_id, actor_id, actor_role, payload, created_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
  `, [eventType, rfqId || null, actorId, actorRole, JSON.stringify(payload || {})]);
}

// ----------------------------------------------------------------------------
// Routes
// ----------------------------------------------------------------------------
router.get('/events/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '20', 10);
    const r = await pool.query(`
      SELECT e.id, e.event_type, e.rfq_id, e.actor_id, e.actor_role, e.payload, e.created_at,
             COALESCE(s.processed, FALSE) AS processed,
             s.processed_at, s.attempts, s.last_error
        FROM rfq_brain_events e
        LEFT JOIN rfq_brain_events_state s ON s.event_id = e.id
       ORDER BY e.id DESC
       LIMIT $1
    `, [limit]);
    res.json({ events: r.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/events/stats', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT e.event_type,
             COUNT(*) AS total,
             COUNT(*) FILTER (WHERE COALESCE(s.processed, FALSE) = TRUE) AS processed,
             COUNT(*) FILTER (WHERE COALESCE(s.processed, FALSE) = FALSE) AS pending
        FROM rfq_brain_events e
        LEFT JOIN rfq_brain_events_state s ON s.event_id = e.id
       GROUP BY e.event_type
       ORDER BY e.event_type
    `);
    res.json({ by_type: r.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/events/test', async (req, res) => {
  try {
    const { event_type = 'rfq.created', payload = {} } = req.body || {};
    await emitEvent(event_type, null, payload);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = { router, startPolling, stopPolling, emitEvent, processEvents };
