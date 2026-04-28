/**
 * C:\AuditDNA\backend\services\webpush-server.js
 *
 * Native Web Push backend service.
 *  - Stores user subscriptions in postgres
 *  - Sends pushes via VAPID + web-push library
 *  - Provides helper sendPushToUser(user_id, payload) for other services
 *
 * REQUIRED ENV (set in Railway):
 *   VAPID_PUBLIC_KEY  = generated via `npx web-push generate-vapid-keys`
 *   VAPID_PRIVATE_KEY = generated via `npx web-push generate-vapid-keys`
 *   VAPID_CONTACT     = mailto:saul@mexausafg.com
 *
 * Mount in server.js:
 *   const webpush = require('./services/webpush-server');
 *   webpush.init();
 *   app.use('/api/push', webpush.router);
 *
 * Helper usage:
 *   const { sendPushToUser } = require('./services/webpush-server');
 *   await sendPushToUser(grower_id, 'grower', { title:'New Buy Request', body:'...', url:'/inbox/123' });
 */

const express = require('express');
const router = express.Router();
const getPool = require('../db');
const pool = getPool();

let webpushLib = null;
let configured = false;

// ----------------------------------------------------------------------------
// Init - lazy-load web-push library, configure VAPID
// ----------------------------------------------------------------------------
function init() {
  try {
    webpushLib = require('web-push');
  } catch (e) {
    console.error('[webpush] web-push module not installed - run: npm i web-push --save');
    return false;
  }
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const contact = process.env.VAPID_CONTACT || 'mailto:saul@mexausafg.com';
  if (!pub || !priv) {
    console.warn('[webpush] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY missing - push disabled. Generate via: npx web-push generate-vapid-keys');
    return false;
  }
  webpushLib.setVapidDetails(contact, pub, priv);
  configured = true;
  console.log('[webpush] VAPID configured, push enabled');
  // Ensure schema
  ensureSchema().catch(e => console.error('[webpush] schema init failed:', e.message));
  return true;
}

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id              BIGSERIAL PRIMARY KEY,
      user_id         INTEGER NOT NULL,
      user_role       VARCHAR(20) NOT NULL,
      endpoint        TEXT NOT NULL UNIQUE,
      p256dh_key      TEXT NOT NULL,
      auth_key        TEXT NOT NULL,
      user_agent      TEXT,
      lang            VARCHAR(5) DEFAULT 'en',
      active          BOOLEAN NOT NULL DEFAULT TRUE,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_used_at    TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS ix_push_user ON push_subscriptions(user_id, user_role) WHERE active = TRUE;
  `);
}

// ----------------------------------------------------------------------------
// Send push to a specific user (all their active subscriptions)
// ----------------------------------------------------------------------------
async function sendPushToUser(userId, userRole, payload) {
  if (!configured) {
    console.warn('[webpush] not configured, skipping push');
    return { sent: 0, failed: 0, reason: 'not_configured' };
  }
  const subs = await pool.query(
    `SELECT id, endpoint, p256dh_key, auth_key, lang
       FROM push_subscriptions
      WHERE user_id = $1 AND user_role = $2 AND active = TRUE`,
    [userId, userRole]
  );
  let sent = 0, failed = 0;
  for (const s of subs.rows) {
    try {
      await webpushLib.sendNotification(
        {
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh_key, auth: s.auth_key },
        },
        JSON.stringify({
          title: payload.title || 'AuditDNA',
          body: payload.body || '',
          url: payload.url || '/',
          icon: payload.icon || '/icon-192.png',
          badge: payload.badge || '/badge-72.png',
          tag: payload.tag || 'auditdna',
          data: payload.data || {},
        }),
        { TTL: payload.ttl || 600 }
      );
      sent++;
      await pool.query(`UPDATE push_subscriptions SET last_used_at = NOW() WHERE id = $1`, [s.id]);
    } catch (e) {
      failed++;
      // 410 Gone or 404 = subscription expired, mark inactive
      if (e.statusCode === 410 || e.statusCode === 404) {
        await pool.query(`UPDATE push_subscriptions SET active = FALSE WHERE id = $1`, [s.id]);
      }
      console.error('[webpush] send failed:', e.statusCode || e.message);
    }
  }
  return { sent, failed };
}

// ----------------------------------------------------------------------------
// Routes
// ----------------------------------------------------------------------------

// GET /api/push/vapid-public - frontend retrieves the public key
router.get('/vapid-public', (req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY || null, configured });
});

// POST /api/push/subscribe - register a subscription
router.post('/subscribe', async (req, res) => {
  try {
    const { user_id, user_role, subscription, lang, user_agent } = req.body || {};
    if (!user_id || !user_role || !subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'missing user_id, user_role, subscription' });
    }
    const r = await pool.query(`
      INSERT INTO push_subscriptions (user_id, user_role, endpoint, p256dh_key, auth_key, user_agent, lang, active)
      VALUES ($1,$2,$3,$4,$5,$6,$7, TRUE)
      ON CONFLICT (endpoint) DO UPDATE SET
        user_id    = EXCLUDED.user_id,
        user_role  = EXCLUDED.user_role,
        p256dh_key = EXCLUDED.p256dh_key,
        auth_key   = EXCLUDED.auth_key,
        user_agent = EXCLUDED.user_agent,
        lang       = EXCLUDED.lang,
        active     = TRUE
      RETURNING id, user_id, user_role, active
    `, [user_id, user_role, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, user_agent || null, lang || 'en']);
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/push/unsubscribe
router.post('/unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body || {};
    if (!endpoint) return res.status(400).json({ error: 'missing endpoint' });
    await pool.query(`UPDATE push_subscriptions SET active = FALSE WHERE endpoint = $1`, [endpoint]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/push/test - send a test push to a user
router.post('/test', async (req, res) => {
  try {
    const { user_id, user_role = 'admin', title = 'Test push', body = 'This is a test' } = req.body || {};
    if (!user_id) return res.status(400).json({ error: 'missing user_id' });
    const result = await sendPushToUser(user_id, user_role, { title, body, url: '/' });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/push/stats
router.get('/stats', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT user_role,
             COUNT(*) FILTER (WHERE active = TRUE) AS active_subs,
             COUNT(*) FILTER (WHERE active = FALSE) AS inactive_subs
        FROM push_subscriptions
       GROUP BY user_role
       ORDER BY user_role
    `);
    res.json({ configured, vapid_public_set: !!process.env.VAPID_PUBLIC_KEY, by_role: r.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = { router, init, sendPushToUser };
