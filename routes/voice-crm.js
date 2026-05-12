const express = require('express');
const router = express.Router();
const pool = require('../db');
const nodemailer = require('nodemailer');

const SMTP = { host:'smtp.gmail.com',port:587,secure:false,
  auth:{user:'sgarcia1911@gmail.com',pass:process.env.GMAIL_APP_PASSWORD||'emgptqrmqdbxrpil'} };

async function notify(subject, body) {
  try {
    const t = nodemailer.createTransport(SMTP);
    await t.sendMail({from:'"Mexausa CRM" <sgarcia1911@gmail.com>',
      to:'sgarcia1911@gmail.com',subject,text:body});
  } catch(_) {}
}

// Zadarma fires this on every call event
router.post('/webhook', async (req, res) => {
  res.sendStatus(200); // ACK immediately
  const { event, caller_id, called_did, call_start, duration,
          pbx_call_id, status, is_recorded } = req.body || {};

  if (!caller_id) return;

  const phone = (caller_id||'').replace(/\D/g,'');
  const ts = new Date().toISOString();

  // Log to zadarma_contacts
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS zadarma_contacts (
        id SERIAL PRIMARY KEY, phone VARCHAR(30), event VARCHAR(40),
        called_did VARCHAR(30), duration INTEGER, status VARCHAR(20),
        pbx_call_id VARCHAR(60), recorded BOOLEAN DEFAULT false,
        notes TEXT, created_at TIMESTAMP DEFAULT NOW()
      )
    `).catch(()=>{});

    await pool.query(`
      INSERT INTO zadarma_contacts (phone,event,called_did,duration,status,pbx_call_id,recorded,notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [phone, event||'call', called_did||'', parseInt(duration)||0,
       status||'completed', pbx_call_id||'', is_recorded==='1'||false,
       `Zadarma call ${ts}`]
    ).catch(()=>{});
  } catch(_) {}

  // Cross-match against CRM contacts
  try {
    const match = await pool.query(
      `SELECT first_name, last_name, company_name, email, crmtype
       FROM contacts WHERE REPLACE(REPLACE(phone,'-',''),'+','') ILIKE $1
       OR REPLACE(REPLACE(mobile,'-',''),'+','') ILIKE $1 LIMIT 1`,
      [`%${phone.slice(-10)}%`]
    ).catch(()=>({rows:[]}));

    const contact = match.rows[0];
    const minDur = Math.floor((parseInt(duration)||0)/60);
    const secDur = (parseInt(duration)||0) % 60;

    if (event === 'NOTIFY_CALL_END' || event === 'call_end' || status === 'answered') {
      await notify(
        `[ZADARMA] ${event||'Call'} — ${phone} ${contact?'('+contact.company_name+')':'(unknown)'}`,
        `ZADARMA CALL LOG

Phone: ${phone}
Event: ${event}
Duration: ${minDur}m ${secDur}s
Status: ${status}
Recorded: ${is_recorded==='1'?'YES':'NO'}
${contact?`
CRM MATCH:
  Name: ${contact.first_name} ${contact.last_name}
  Company: ${contact.company_name}
  Email: ${contact.email}
  Type: ${contact.crmtype}`:'
No CRM match — new contact'}

Time: ${ts}`
      );
    }
  } catch(_) {}
});

router.get('/recent', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT * FROM zadarma_contacts ORDER BY created_at DESC LIMIT 50`
    ).catch(()=>({rows:[]}));
    res.json({ ok:true, calls: r.rows });
  } catch(e) { res.status(500).json({error:e.message}); }
});

module.exports = router;
