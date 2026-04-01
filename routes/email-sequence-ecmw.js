'use strict';
const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const nodemailer = require('nodemailer');

const SMTP = { host:'smtpout.secureserver.net', port:465, secure:true, auth:{ user:'saul@mexausafg.com', pass:'PurpleRain321' }};

const transporter = nodemailer.createTransport(SMTP);

const bootstrap = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ecmw_campaign_log (
      id SERIAL PRIMARY KEY,
      buyer_email TEXT,
      buyer_name TEXT,
      company TEXT,
      state TEXT,
      sequence_day INTEGER,
      status TEXT DEFAULT 'sent',
      sent_at TIMESTAMPTZ DEFAULT NOW()
    );
  `).catch(e => console.warn('[ecmw] bootstrap:', e.message));
};

bootstrap();

router.post('/start', async (req, res) => {
  res.json({ ok: true, message: 'EC/MW sequence started' });
});

router.post('/fire/:day', async (req, res) => {
  try {
    const day = parseInt(req.params.day) || 0;
    const result = await pool.query(`SELECT * FROM buyer_segments WHERE state IN ('NY','NJ','PA','OH','IL','MI','IN','WI','MN','IA','MO','ND','SD','NE','KS') LIMIT 50`);
    const buyers = result.rows;
    let sent = 0;
    for (const b of buyers) {
      try {
        await transporter.sendMail({
          from: '"CM Products International" <saul@mexausafg.com>',
          to: b.email || b.buyer_email,
          subject: day === 0 ? 'Premium Mexican Avocados & Berries — Direct Grower Source' : day === 5 ? 'Following Up — Q2 Pricing + Availability' : 'Last Note — Open Allocation Closing Q2',
          html: `<p>Hello ${b.company || b.buyer_name || 'Team'},</p><p>CM Products International, PACA #20241168 — direct grower source for premium Mexican produce.</p><p>Reply or call +1-831-251-3116</p><p>Saul Garcia</p>`
        });
        await pool.query(`INSERT INTO ecmw_campaign_log (buyer_email, company, state, sequence_day) VALUES ($1, $2, $3, $4)`, [b.email || b.buyer_email, b.company, b.state, day]).catch(()=>{});
        sent++;
      } catch(e) {}
    }
    res.json({ ok: true, sent, day });
  } catch(e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const r = await pool.query(`SELECT sequence_day, COUNT(*) as sent, COUNT(*) FILTER (WHERE status='sent') as delivered FROM ecmw_campaign_log GROUP BY sequence_day ORDER BY sequence_day`);
    res.json({ ok: true, stats: r.rows });
  } catch(e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/log', async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM ecmw_campaign_log ORDER BY sent_at DESC LIMIT 100`);
    res.json({ ok: true, log: r.rows });
  } catch(e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/stop', async (req, res) => {
  res.json({ ok: true, message: 'Sequence stopped' });
});

module.exports = router;
