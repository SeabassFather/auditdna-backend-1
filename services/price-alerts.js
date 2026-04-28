/**
 * C:\AuditDNA\backend\services\price-alerts.js
 *
 * Phase 2 - Buyer price alert subscription + ping engine.
 *
 * Buyer subscribes: "Notify me when avocados drop below $36/case."
 * Cron checks active alerts against new rfq_offers + production_declarations.
 * On match: emits brain event + Web Push to buyer.
 *
 * Routes:
 *   POST   /api/price-alerts                  create
 *   GET    /api/price-alerts/buyer/:id        list buyer's alerts
 *   PATCH  /api/price-alerts/:id              update
 *   DELETE /api/price-alerts/:id              deactivate
 *   POST   /api/price-alerts/check-now        manual trigger (admin)
 *   GET    /api/price-alerts/stats
 *
 * Mount: app.use('/api/price-alerts', service.router); service.startCron();
 */

const express = require('express');
const router = express.Router();
const getPool = require('../db');
const pool = getPool();

const CHECK_INTERVAL_MS = 30000;  // 30s
let cronTimer = null;
let pushHelper = null;
let brainEvents = null;

function getPushHelper() {
  if (!pushHelper) {
    try { pushHelper = require('./webpush-server'); } catch (e) {}
  }
  return pushHelper;
}
function getBrainEvents() {
  if (!brainEvents) {
    try { brainEvents = require('./brain-events'); } catch (e) {}
  }
  return brainEvents;
}

// ----------------------------------------------------------------------------
// CRUD
// ----------------------------------------------------------------------------
router.post('/', express.json(), async (req, res) => {
  try {
    const {
      buyer_id, commodity_category, commodity_subcategory,
      trigger_price, trigger_direction, currency,
      origin_country, organic_required,
    } = req.body || {};
    if (!buyer_id || !commodity_category || !trigger_price) {
      return res.status(400).json({ error: 'buyer_id, commodity_category, trigger_price required' });
    }
    const r = await pool.query(`
      INSERT INTO price_alerts (
        buyer_id, commodity_category, commodity_subcategory,
        trigger_price, trigger_direction, currency,
        origin_country, organic_required
      ) VALUES ($1,$2,$3,$4,COALESCE($5,'below'),COALESCE($6,'USD'),$7,COALESCE($8,FALSE))
      RETURNING *
    `, [
      parseInt(buyer_id, 10), commodity_category, commodity_subcategory || null,
      trigger_price, trigger_direction, currency,
      origin_country || null, organic_required,
    ]);
    res.json({ ok: true, alert: r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/buyer/:id', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT * FROM price_alerts WHERE buyer_id = $1 ORDER BY created_at DESC LIMIT 100
    `, [req.params.id]);
    res.json({ alerts: r.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:id', express.json(), async (req, res) => {
  try {
    const { buyer_id, ...updates } = req.body || {};
    if (!buyer_id) return res.status(400).json({ error: 'buyer_id required' });
    const allowed = ['trigger_price', 'trigger_direction', 'organic_required', 'origin_country', 'active'];
    const sets = [];
    const params = [parseInt(buyer_id, 10), parseInt(req.params.id, 10)];
    for (const key of Object.keys(updates)) {
      if (!allowed.includes(key)) continue;
      params.push(updates[key]);
      sets.push(`${key} = $${params.length}`);
    }
    if (sets.length === 0) return res.status(400).json({ error: 'no updatable fields provided' });
    const r = await pool.query(`
      UPDATE price_alerts SET ${sets.join(', ')}
       WHERE id = $2 AND buyer_id = $1
       RETURNING *
    `, params);
    if (r.rows.length === 0) return res.status(403).json({ error: 'not authorized or not found' });
    res.json({ ok: true, alert: r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', express.json(), async (req, res) => {
  try {
    const { buyer_id } = req.body || {};
    if (!buyer_id) return res.status(400).json({ error: 'buyer_id required' });
    const r = await pool.query(`
      UPDATE price_alerts SET active = FALSE
       WHERE id = $1 AND buyer_id = $2 RETURNING id
    `, [req.params.id, parseInt(buyer_id, 10)]);
    if (r.rows.length === 0) return res.status(403).json({ error: 'not authorized or not found' });
    res.json({ ok: true, id: r.rows[0].id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------------------------------
// Check engine - scans active alerts vs recent offers + declarations
// ----------------------------------------------------------------------------
async function checkAlerts() {
  try {
    const alerts = await pool.query(`
      SELECT * FROM price_alerts
       WHERE active = TRUE
         AND (last_fired_at IS NULL OR last_fired_at < NOW() - INTERVAL '1 hour')
    `);
    if (alerts.rows.length === 0) return { checked: 0, fired: 0 };

    let fired = 0;
    for (const alert of alerts.rows) {
      const triggers = await findTriggers(alert);
      if (triggers.length === 0) continue;

      const top = triggers[0];
      await pool.query(`
        UPDATE price_alerts SET last_fired_at = NOW(), fire_count = fire_count + 1 WHERE id = $1
      `, [alert.id]);

      const ph = getPushHelper();
      if (ph) {
        try {
          await ph.sendPushToUser(alert.buyer_id, 'buyer', {
            title: `${alert.commodity_category} hit your alert`,
            body: `${top.label}: $${top.price}/${top.unit || 'unit'} (${alert.trigger_direction} $${alert.trigger_price})`,
            url: `/buyer/marketplace?commodity=${alert.commodity_category}`,
            tag: `price-alert-${alert.id}`,
          });
        } catch (e) {
          console.error('[price-alerts] push failed:', e.message);
        }
      }

      const be = getBrainEvents();
      if (be) {
        await be.emitEvent('price_alert.fired', null, {
          alert_id: alert.id, buyer_id: alert.buyer_id,
          commodity: alert.commodity_category,
          trigger_price: alert.trigger_price, trigger_direction: alert.trigger_direction,
          matched_count: triggers.length, top_match: top,
        }, alert.buyer_id, 'buyer');
      }

      fired++;
    }
    if (fired > 0) console.log(`[price-alerts] fired ${fired}/${alerts.rows.length}`);
    return { checked: alerts.rows.length, fired };
  } catch (e) {
    console.error('[price-alerts] check error:', e.message);
    return { checked: 0, fired: 0, error: e.message };
  }
}

async function findTriggers(alert) {
  const op = alert.trigger_direction === 'above' ? '>=' : '<=';
  const triggers = [];

  // Check rfq_offers (offers where the price meets the trigger)
  try {
    const off = await pool.query(`
      SELECT o.id, o.rfq_id, o.price, o.currency, rn.commodity_category, rn.commodity_subcategory,
             rn.quantity_unit AS unit, o.created_at
        FROM rfq_offers o
        JOIN rfq_needs rn ON rn.id = o.rfq_id
       WHERE rn.commodity_category = $1
         AND ($2::text IS NULL OR rn.commodity_subcategory = $2)
         AND o.price ${op} $3
         AND o.status IN ('submitted','accepted')
         AND o.created_at > NOW() - INTERVAL '24 hours'
       ORDER BY o.created_at DESC LIMIT 5
    `, [alert.commodity_category, alert.commodity_subcategory, alert.trigger_price]);
    for (const row of off.rows) {
      triggers.push({
        source: 'offer', offer_id: row.id, rfq_id: row.rfq_id,
        price: Number(row.price), unit: row.unit,
        label: `Offer on RFQ #${row.rfq_id}`,
      });
    }
  } catch (e) {}

  // Check production_declarations
  try {
    const dec = await pool.query(`
      SELECT pd.id, pd.commodity_category, pd.commodity_subcategory,
             pd.ask_price, pd.volume_unit AS unit, pd.estimated_volume, pd.organic
        FROM production_declarations pd
       WHERE pd.commodity_category = $1
         AND ($2::text IS NULL OR pd.commodity_subcategory = $2)
         AND pd.ask_price IS NOT NULL
         AND pd.ask_price ${op} $3
         AND pd.status = 'open'
         AND ($4::text IS NULL OR pd.origin_country = $4)
         AND ($5::boolean IS FALSE OR pd.organic = TRUE)
       ORDER BY pd.ask_price ${alert.trigger_direction === 'above' ? 'DESC' : 'ASC'}
       LIMIT 5
    `, [alert.commodity_category, alert.commodity_subcategory, alert.trigger_price,
        alert.origin_country, alert.organic_required]);
    for (const row of dec.rows) {
      triggers.push({
        source: 'declaration', declaration_id: row.id,
        price: Number(row.ask_price), unit: row.unit,
        volume: Number(row.estimated_volume), organic: row.organic,
        label: `Declaration #${row.id}`,
      });
    }
  } catch (e) {}

  return triggers;
}

router.post('/check-now', async (req, res) => {
  res.json(await checkAlerts());
});

router.get('/stats', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE active = TRUE) AS active,
        COUNT(*) FILTER (WHERE active = FALSE) AS inactive,
        COALESCE(SUM(fire_count), 0) AS total_fires,
        COUNT(*) FILTER (WHERE last_fired_at > NOW() - INTERVAL '24 hours') AS fired_last_24h
        FROM price_alerts
    `);
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function startCron() {
  if (cronTimer) return;
  cronTimer = setInterval(checkAlerts, CHECK_INTERVAL_MS);
  console.log(`[price-alerts] cron started (${CHECK_INTERVAL_MS}ms)`);
  setTimeout(checkAlerts, 5000);
}

function stopCron() {
  if (cronTimer) { clearInterval(cronTimer); cronTimer = null; }
}

module.exports = { router, startCron, stopCron, checkAlerts };
