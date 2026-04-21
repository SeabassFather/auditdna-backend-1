'use strict';

const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const cron = require('node-cron');

// âœ… USE EXISTING SERVER POOL (DO NOT CHANGE)
const pool = require('../server').pool;


// â”€â”€ SMTP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const transporter = nodemailer.createTransport({
  host: 'smtpout.secureserver.net',
  port: 465,
  secure: true,
  auth: {
    user: 'saul@mexausafg.com',
    pass: 'PurpleRain321',
  },
});


// â”€â”€ STATES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const EC_STATES = ['NY','NJ','CT','MA','PA','MD','VA','NC','SC','FL','DE','RI','NH','ME','VT'];
const MW_STATES = ['IL','OH','MI','IN','WI','MN','IA','MO','ND','SD','NE','KS'];
const ALL_STATES = [...EC_STATES, ...MW_STATES];


// â”€â”€ BOOTSTRAP (SAFE â€” ONLY CALLED VIA ROUTE) â”€â”€â”€â”€â”€â”€â”€â”€â”€
const bootstrap = async () => {
  try {
    await global.db.query(`
      CREATE TABLE IF NOT EXISTS ecmw_campaign_log (
        id SERIAL PRIMARY KEY,
        buyer_email VARCHAR(255),
        sequence_day INTEGER,
        status VARCHAR(50),
        sent_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  } catch (e) {
    console.warn('[ecmw bootstrap]', e.message);
  }
};


// â”€â”€ TEMPLATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const getTemplate = (day, buyer) => ({
  subject: `Mexausa Follow-Up Day ${day}`,
  html: `<p>Hello ${buyer.contact_name || 'Buyer'}, quick follow up.</p>`
});


// â”€â”€ SEND FUNCTION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const sendSequenceDay = async (day) => {
  console.log(`[ecmw] Running day ${day}`);

  let buyers = [];

  try {
    const res = await global.db.query(`
      SELECT email, contact_name
      FROM buyer_segments
      WHERE email IS NOT NULL
      LIMIT 10
    `);
    buyers = res.rows;
  } catch (e) {
    console.error('[ecmw query]', e.message);
    return;
  }

  for (const buyer of buyers) {
    try {
      const tpl = getTemplate(day, buyer);

      await transporter.sendMail({
        from: 'saul@mexausafg.com',
        to: buyer.email,
        subject: tpl.subject,
        html: tpl.html
      });

      await global.db.query(
        `INSERT INTO ecmw_campaign_log (buyer_email, sequence_day, status)
         VALUES ($1, $2, 'sent')`,
        [buyer.email, day]
      );

    } catch (e) {
      console.warn('[ecmw send]', e.message);
    }
  }
};


// â”€â”€ CRON (ONLY STARTED VIA ROUTE) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let jobs = [];

const registerCrons = () => {
  jobs.forEach(j => j.stop());
  jobs = [];

  jobs.push(
    cron.schedule('0 0 8 * * *', () => sendSequenceDay(0)),
    cron.schedule('0 5 8 * * *', () => sendSequenceDay(5)),
    cron.schedule('0 10 8 * * *', () => sendSequenceDay(10))
  );

  console.log('[ecmw] cron registered');
};


// â”€â”€ ROUTES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/start', async (req, res) => {
  await bootstrap();
  registerCrons();
  res.json({ ok: true });
});

router.post('/fire/:day', async (req, res) => {
  const day = Number(req.params.day);
  await bootstrap();
  sendSequenceDay(day);
  res.json({ ok: true });
});

router.get('/stats', async (req, res) => {
  try {
    const r = await global.db.query(`SELECT COUNT(*) FROM ecmw_campaign_log`);
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/stop', (req, res) => {
  jobs.forEach(j => j.stop());
  jobs = [];
  res.json({ ok: true });
});


// â”€â”€ EXPORT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
module.exports = router;

