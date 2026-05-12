const express = require('express');
const router = express.Router();
const pool = require('../db');
const nodemailer = require('nodemailer');

const SMTP = {host:'smtp.gmail.com',port:587,secure:false,
  auth:{user:'sgarcia1911@gmail.com',pass:process.env.GMAIL_APP_PASSWORD||'emgptqrmqdbxrpil'}};

async function mail(subject, body) {
  try {
    const t = nodemailer.createTransport(SMTP);
    await t.sendMail({from:'"Mexausa LOAF" <sgarcia1911@gmail.com>',
      to:'sgarcia1911@gmail.com',subject,text:body});
  } catch(_) {}
}

// Ensure table
pool.query(`CREATE TABLE IF NOT EXISTS flash_sales (
  id SERIAL PRIMARY KEY, ref VARCHAR(24) UNIQUE,
  commodity VARCHAR(120), volume VARCHAR(80), price VARCHAR(80),
  location VARCHAR(200), grower_name VARCHAR(120), grower_phone VARCHAR(40),
  lat NUMERIC(10,6), lng NUMERIC(10,6), hours INTEGER DEFAULT 4,
  expires_at TIMESTAMP, status VARCHAR(20) DEFAULT 'active',
  winner_name VARCHAR(120), winner_phone VARCHAR(40), winner_email VARCHAR(120),
  created_at TIMESTAMP DEFAULT NOW()
)`).catch(()=>{});

// Create flash sale
router.post('/create', async (req, res) => {
  const {commodity,volume,price,location,grower_name,grower_phone,lat,lng,hours=4} = req.body;
  const ref = 'FLASH-'+Date.now().toString(36).toUpperCase();
  const expires = new Date(Date.now() + parseInt(hours)*3600*1000);

  try {
    await pool.query(`
      INSERT INTO flash_sales (ref,commodity,volume,price,location,grower_name,grower_phone,lat,lng,hours,expires_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [ref,commodity,volume,price,location,grower_name,grower_phone,
       lat||null,lng||null,hours,expires]).catch(()=>{});

    await mail(
      `[FLASH SALE] ${commodity} — ${volume} — ${hours}hrs to close`,
      `FLASH SALE ACTIVE

Ref: ${ref}
Commodity: ${commodity}
Volume: ${volume}
Price: ${price}
Location: ${location}
Grower: ${grower_name} ${grower_phone}
Expires: ${expires.toLocaleString()}
Hours: ${hours}`
    );
    res.json({ok:true,ref,expires_at:expires.toISOString()});
  } catch(e) { res.status(500).json({error:e.message}); }
});

// Accept flash sale (buyer claims it)
router.post('/:ref/accept', async (req, res) => {
  const {buyer_name, buyer_phone, buyer_email} = req.body;
  try {
    const r = await pool.query(
      `UPDATE flash_sales SET status='claimed',winner_name=$1,winner_phone=$2,winner_email=$3
       WHERE ref=$4 AND status='active' AND expires_at > NOW() RETURNING *`,
      [buyer_name,buyer_phone,buyer_email,req.params.ref]
    );
    if (!r.rows[0]) return res.status(410).json({error:'Flash sale expired or already claimed'});
    const f = r.rows[0];

    // Auto-create deal record
    await pool.query(`
      INSERT INTO deals (deal_ref,status,origin,commodity,volume,price_fob,
        grower_name,grower_phone,buyer_name,buyer_phone,buyer_email,
        sale_type,commission_pct,commission_amt,notes)
      VALUES ($1,'matched','loaf_flash',$2,$3,$4,$5,$6,$7,$8,$9,'flash',2.75,$10,$11)
      ON CONFLICT DO NOTHING`,
      ['MFG-'+Date.now().toString(36).toUpperCase().slice(0,12),
       f.commodity,f.volume,
       parseFloat((f.price||'0').replace(/[^0-9.]/g,''))||0,
       f.grower_name,f.grower_phone,
       buyer_name,buyer_phone,buyer_email,
       (parseFloat((f.price||'0').replace(/[^0-9.]/g,''))||0)*0.0275,
       `Flash sale claimed. Grower: ${f.grower_name}. Buyer: ${buyer_name}.`]
    ).catch(()=>{});

    await mail(
      `[FLASH CLAIMED] ${f.commodity} — Buyer: ${buyer_name}`,
      `FLASH SALE CLAIMED

Commodity: ${f.commodity}
Volume: ${f.volume}
Price: ${f.price}

Grower: ${f.grower_name} — ${f.grower_phone}
Buyer: ${buyer_name} — ${buyer_phone} — ${buyer_email}

Deal record auto-created. Commission: 2.75%.
mexausafg.com`
    );
    res.json({ok:true,deal:'auto-created',flash:f});
  } catch(e) { res.status(500).json({error:e.message}); }
});

// Check status + time remaining
router.get('/:ref', async (req, res) => {
  try {
    const r = await pool.query(`SELECT *,
      EXTRACT(EPOCH FROM (expires_at - NOW())) AS seconds_left
      FROM flash_sales WHERE ref=$1`,[req.params.ref]);
    if (!r.rows[0]) return res.status(404).json({error:'Not found'});
    const f = r.rows[0];
    res.json({ok:true,
      ref:f.ref, commodity:f.commodity, volume:f.volume, price:f.price,
      status:f.status, seconds_left:Math.max(0,Math.floor(f.seconds_left||0)),
      expires_at:f.expires_at
    });
  } catch(e) { res.status(500).json({error:e.message}); }
});

// Auto-expire cron (call every 15 min from server.js)
router.post('/run-expiry', async (_req, res) => {
  try {
    const r = await pool.query(
      `UPDATE flash_sales SET status='expired'
       WHERE status='active' AND expires_at < NOW() RETURNING commodity,volume,grower_name`
    ).catch(()=>({rows:[]}));
    if (r.rows.length) {
      await mail(
        `[FLASH EXPIRED] ${r.rows.length} sale(s) expired`,
        r.rows.map(f=>`${f.commodity} — ${f.volume} — Grower: ${f.grower_name}`).join('
')
      );
    }
    res.json({ok:true,expired:r.rows.length});
  } catch(e) { res.status(500).json({error:e.message}); }
});

module.exports = router;
