/**
 * C:\AuditDNA\backend\services\brain-events.js
 *
 * Phase 1 Day 5 - Brain event bus integration.
 *
 * Listens for events written to rfq_brain_events table and fans them out to:
 *   1. ntfy.sh (admin alert channel)
 *   2. Web Push (specific users via webpush-server.sendPushToUser)
 *   3. WhatsApp (via whatsapp-rfq-bridge.notifyGrower) - optional, lazy-loaded
 *
 * Event types handled:
 *   rfq.created           → admin ntfy + cascade to growers (handled in match-engine)
 *   rfq.bid_placed        → admin ntfy + push to buyer
 *   rfq.locked            → admin ntfy + push to grower (winner)
 *   rfq.expired           → admin ntfy
 *   shipment.distress     → admin ntfy URGENT + push to buyer
 *   grower.activated      → admin ntfy
 *   buyer.vetted          → admin ntfy
 *
 * Polling loop runs every 10s. Marks events processed=TRUE after fan-out.
 *
 * Mount in server.js:
 *   const brainEvents = require('./services/brain-events');
 *   brainEvents.startPolling();
 *   app.use('/api/brain', brainEvents.router);
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

// ----------------------------------------------------------------------------
// Lazy-load push helper (avoid circular deps)
// ----------------------------------------------------------------------------
function getPushHelper() {
  if (!pushHelper) {
    try {
      pushHelper = require('./webpush-server');
    } catch (e) {
      console.warn('[brain] webpush-server not available, push disabled');
    }
  }
  return pushHelper;
}

function getWhatsappHelper() {
  if (!whatsappHelper) {
    try {
      whatsappHelper = require('./whatsapp-rfq-bridge');
    } catch (e) {
      // optional - WhatsApp bridge may not exist yet
    }
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
      `New RFQ: ${rfq_code}`,
      `${buyer_anonymous} wants ${commodity} (~$${gmv})`,
      'default',
      ['rfq', 'new']
    );
  },

  'rfq.bid_placed': async (event) => {
    const { rfq_code, grower_anonymous, price, buyer_id } = event.payload || {};
    await pushNtfy(
      `Bid on ${rfq_code}`,
      `${grower_anonymous} offered $${price}`,
      'default',
      ['rfq', 'bid']
    );
    const ph = getPushHelper();
    if (ph && buyer_id) {
      await ph.sendPushToUser(buyer_id, 'buyer', {
        title: `New offer on ${rfq_code}`,
        body: `${grower_anonymous} offered $${price}/unit. Tap to review.`,
        url: `/rfq/${event.rfq_id}`,
        tag: `rfq-${event.rfq_id}`,
      });
    }
  },

  'rfq.locked': async (event) => {
    const { rfq_code, finance_mode, gmv, grower_id, margin } = event.payload || {};
    await pushNtfy(
      `LOCKED: ${rfq_code} ($${gmv})`,
      `Mode ${finance_mode} | margin $${margin}`,
      'high',
      ['rfq', 'locked', 'money']
    );
    const ph = getPushHelper();
    if (ph && grower_id) {
      await ph.sendPushToUser(grower_id, 'grower', {
        title: `You won ${rfq_code}`,
        body: `Deal locked. Check your inbox for shipping details.`,
        url: `/grower/inbox`,
        tag: `rfq-locked-${event.rfq_id}`,
        requireInteraction: true,
      });
    }
    const wa = getWhatsappHelper();
    if (wa && grower_id) {
      try { await wa.notifyGrower(grower_id, `Won ${rfq_code}. Check the app.`); } catch (e) {}
    }
  },

  'rfq.expired': async (event) => {
    const { rfq_code } = event.payload || {};
    await pushNtfy(`Expired: ${rfq_code}`, 'No grower locked in time', 'low', ['rfq', 'expired']);
  },

  'shipment.distress': async (event) => {
    const { rfq_code, reason, buyer_id } = event.payload || {};
    await pushNtfy(
      `DISTRESS: ${rfq_code}`,
      `${reason}`,
      'urgent',
      ['rotating_light', 'distress']
    );
    const ph = getPushHelper();
    if (ph && buyer_id) {
      await ph.sendPushToUser(buyer_id, 'buyer', {
        title: `URGENT: ${rfq_code}`,
        body: reason || 'Shipment in distress',
        url: `/rfq/${event.rfq_id}`,
        requireInteraction: true,
      });
    }
  },

  'grower.activated': async (event) => {
    const { grower_name, grs_score, region } = event.payload || {};
    await pushNtfy(
      `Grower activated: ${grower_name}`,
      `GRS ${grs_score} | ${region}`,
      'default',
      ['grower', 'new']
    );
  },

  'buyer.vetted': async (event) => {
    const { buyer_name, paca_status } = event.payload || {};
    await pushNtfy(
      `Buyer vetted: ${buyer_name}`,
      `PACA: ${paca_status}`,
      'default',
      ['buyer', 'vetted']
    );
  },
};

// ----------------------------------------------------------------------------
// Polling loop
// ----------------------------------------------------------------------------
async function processEvents() {
  try {
    const r = await pool.query(`
      SELECT id, event_type, rfq_id, payload, created_at
        FROM rfq_brain_events
       WHERE processed = FALSE
       ORDER BY id ASC
       LIMIT 50
    `);
    if (r.rows.length === 0) return;
    for (const event of r.rows) {
      const handler = handlers[event.event_type];
      if (handler) {
        try {
          await handler(event);
        } catch (e) {
          console.error(`[brain] handler ${event.event_type} failed:`, e.message);
        }
      }
      await pool.query(`UPDATE rfq_brain_events SET processed = TRUE, processed_at = NOW() WHERE id = $1`, [event.id]);
    }
    console.log(`[brain] processed ${r.rows.length} events`);
  } catch (e) {
    console.error('[brain] poll error:', e.message);
  }
}

function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(processEvents, POLL_INTERVAL_MS);
  console.log(`[brain] event polling started (${POLL_INTERVAL_MS}ms interval, ntfy=${NTFY_TOPIC})`);
  // Run once immediately
  setImmediate(processEvents);
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

// ----------------------------------------------------------------------------
// Helper for other services to emit events
// ----------------------------------------------------------------------------
async function emitEvent(eventType, rfqId, payload) {
  await pool.query(`
    INSERT INTO rfq_brain_events (event_type, rfq_id, payload, processed, created_at)
    VALUES ($1, $2, $3, FALSE, NOW())
  `, [eventType, rfqId || null, JSON.stringify(payload || {})]);
}

// ----------------------------------------------------------------------------
// Routes
// ----------------------------------------------------------------------------
router.get('/events/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '20', 10);
    const r = await pool.query(`
      SELECT id, event_type, rfq_id, payload, processed, created_at, processed_at
        FROM rfq_brain_events
       ORDER BY id DESC
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
      SELECT event_type,
             COUNT(*) AS total,
             COUNT(*) FILTER (WHERE processed = TRUE) AS processed,
             COUNT(*) FILTER (WHERE processed = FALSE) AS pending
        FROM rfq_brain_events
       GROUP BY event_type
       ORDER BY event_type
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
