const express = require('express');
const router = express.Router();
const pool = require('../db');
const nodemailer = require('nodemailer');

const SMTP = { host:'smtp.gmail.com', port:587, secure:false,
  auth:{ user:'sgarcia1911@gmail.com', pass:process.env.GMAIL_APP_PASSWORD||'emgptqrmqdbxrpil' } };

pool.query(`CREATE TABLE IF NOT EXISTS price_alerts (
  id SERIAL PRIMARY KEY,
  commodity VARCHAR(120) NOT NULL,
  alert_type VARCHAR(20) DEFAULT 'drop',
  threshold_pct NUMERIC(5,2) DEFAULT 5.0,
  current_price NUMERIC(10,2),
  trigger_price NUMERIC(10,2),
  market VARCHAR(80),
  region VARCHAR(80),
  notified_at TIMESTAMP,
  notification_sent BOOLEAN DEFAULT false,
  recipients TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)`).catch(()=>{});

pool.query(`CREATE TABLE IF NOT EXISTS price_alert_log (
  id SERIAL PRIMARY KEY,
  alert_id INTEGER,
  commodity VARCHAR(120),
  alert_type VARCHAR(20),
  old_price NUMERIC(10,2),
  new_price NUMERIC(10,2),
  change_pct NUMERIC(6,2),
  market VARCHAR(80),
  message TEXT,
  sent_to INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
)`).catch(()=>{});

async function notify(subject, html, recipients) {
  try {
    const t = nodemailer.createTransport(SMTP);
    const to = recipients || 'sgarcia1911@gmail.com';
    await t.sendMail({ from:'"Mexausa Price Intel" <sgarcia1911@gmail.com>',
      to, subject, html });
    return true;
  } catch(_) { return false; }
}

// Create alert
router.post('/', async (req, res) => {
  const { commodity, alert_type='drop', threshold_pct=5.0,
          trigger_price, market, region, recipients } = req.body;
  if (!commodity) return res.status(400).json({ error: 'commodity required' });
  try {
    const r = await pool.query(`
      INSERT INTO price_alerts (commodity,alert_type,threshold_pct,trigger_price,market,region,recipients)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [commodity,alert_type,threshold_pct,trigger_price||null,
       market||'All Markets',region||'All Regions',recipients||'sgarcia1911@gmail.com']
    );
    res.json({ ok:true, alert: r.rows[0] });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// List alerts
router.get('/', async (_req, res) => {
  try {
    const r = await pool.query(
      'SELECT * FROM price_alerts ORDER BY created_at DESC'
    );
    res.json({ ok:true, alerts:r.rows });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// Get recent alert log
router.get('/log', async (_req, res) => {
  try {
    const r = await pool.query(
      'SELECT * FROM price_alert_log ORDER BY created_at DESC LIMIT 50'
    );
    res.json({ ok:true, log:r.rows });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// PING — check USDA prices and fire alerts (called by SI6 agent)
router.post('/ping', async (_req, res) => {
  try {
    const alerts = await pool.query(
      "SELECT * FROM price_alerts WHERE status='active'"
    );
    let fired = 0;
    for (const alert of alerts.rows) {
      // Fetch current USDA price
      let currentPrice = null;
      try {
        const usda = await fetch(
          `https://auditdna-backend-1-production.up.railway.app/api/commodity/search?q=${encodeURIComponent(alert.commodity)}&limit=1`,
          { headers:{ 'Content-Type':'application/json' } }
        ).then(r=>r.json()).catch(()=>({}));
        const priceStr = usda.results?.[0]?.high_price || usda.results?.[0]?.low_price;
        if (priceStr) currentPrice = parseFloat(priceStr);
      } catch(_) {}

      if (!currentPrice || !alert.trigger_price) continue;
      const changePct = ((currentPrice - alert.trigger_price) / alert.trigger_price) * 100;
      const triggered = alert.alert_type === 'drop'
        ? changePct <= -(alert.threshold_pct)
        : changePct >= alert.threshold_pct;

      if (triggered) {
        const direction = alert.alert_type === 'drop' ? 'DROP' : 'SPIKE';
        const msg = `${alert.commodity} PRICE ${direction}: $${currentPrice.toFixed(2)} (${changePct.toFixed(1)}% from $${alert.trigger_price})`;
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:600px">
            <div style="background:#0F1419;padding:20px;border-left:4px solid ${alert.alert_type==='drop'?'#ef4444':'#22c55e'}">
              <div style="color:#C9A55C;font-size:18px;font-weight:700">MEXAUSA PRICE ALERT</div>
              <div style="color:white;font-size:14px;margin-top:8px">${alert.commodity} — ${direction}</div>
            </div>
            <div style="padding:20px;border:1px solid #e2e8f0">
              <div style="font-size:28px;font-weight:700;color:${alert.alert_type==='drop'?'#ef4444':'#22c55e'}">${changePct.toFixed(1)}%</div>
              <div style="font-size:14px;color:#334155;margin-top:8px">Current: <b>$${currentPrice.toFixed(2)}</b> | Trigger: $${parseFloat(alert.trigger_price).toFixed(2)}</div>
              <div style="font-size:12px;color:#64748b;margin-top:4px">Market: ${alert.market} | Region: ${alert.region}</div>
              <div style="margin-top:16px;padding:12px;background:#f1f5f9;border-radius:6px;font-size:12px;color:#334155">
                ${msg}
              </div>
              <div style="margin-top:16px">
                <a href="https://mexausafg.com" style="background:#0F7B41;color:white;padding:10px 20px;border-radius:5px;text-decoration:none;font-weight:700;font-size:12px">View on AuditDNA</a>
              </div>
            </div>
            <div style="padding:10px 20px;background:#f8fafc;font-size:10px;color:#94a3b8">
              Mexausa Food Group, Inc. | EIN 88-1698129 | mexausafg.com
            </div>
          </div>`;

        await pool.query(`
          INSERT INTO price_alert_log (alert_id,commodity,alert_type,old_price,new_price,change_pct,market,message,sent_to)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [alert.id, alert.commodity, alert.alert_type, alert.trigger_price,
           currentPrice, changePct, alert.market, msg, 1]
        ).catch(()=>{});

        await pool.query(
          "UPDATE price_alerts SET notified_at=NOW(),notification_sent=true WHERE id=$1",
          [alert.id]
        ).catch(()=>{});

        await notify(`[MEXAUSA PRICE ALERT] ${alert.commodity} ${direction} ${changePct.toFixed(1)}%`, html, alert.recipients);
        fired++;
      }
    }
    res.json({ ok:true, checked: alerts.rows.length, fired });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// Update alert
router.patch('/:id', async (req, res) => {
  const { status, trigger_price, threshold_pct } = req.body;
  try {
    const r = await pool.query(
      `UPDATE price_alerts SET status=COALESCE($1,status),
       trigger_price=COALESCE($2,trigger_price),
       threshold_pct=COALESCE($3,threshold_pct),
       updated_at=NOW() WHERE id=$4 RETURNING *`,
      [status, trigger_price||null, threshold_pct||null, req.params.id]
    );
    res.json({ ok:true, alert:r.rows[0] });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

module.exports = router;
