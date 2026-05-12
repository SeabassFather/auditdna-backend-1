const express = require('express');
const router = express.Router();
const pool = require('../db');
const nodemailer = require('nodemailer');

const SMTP = {host:'smtp.gmail.com',port:587,secure:false,
  auth:{user:'sgarcia1911@gmail.com',pass:process.env.GMAIL_APP_PASSWORD||'emgptqrmqdbxrpil'}};

pool.query(`
  CREATE TABLE IF NOT EXISTS cert_fund (
    id SERIAL PRIMARY KEY,
    deal_ref VARCHAR(24), commodity VARCHAR(120),
    deal_value NUMERIC(14,2), fund_contribution NUMERIC(10,2),
    fund_pct NUMERIC(5,3) DEFAULT 1.0,
    grower_name VARCHAR(120), grower_email VARCHAR(120),
    cert_type VARCHAR(80), cert_status VARCHAR(40) DEFAULT 'pending',
    notes TEXT, created_at TIMESTAMP DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS cert_applications (
    id SERIAL PRIMARY KEY,
    grower_name VARCHAR(120), grower_phone VARCHAR(40),
    grower_email VARCHAR(120), grower_location VARCHAR(200),
    commodity VARCHAR(120), current_certs TEXT,
    cert_requested VARCHAR(80), farm_acres NUMERIC(8,2),
    annual_volume VARCHAR(80), notes TEXT,
    status VARCHAR(40) DEFAULT 'applied',
    created_at TIMESTAMP DEFAULT NOW()
  )
`).catch(()=>{});

// Allocate 1% of deal value to cert fund when deal closes
router.post('/allocate', async (req, res) => {
  const { deal_ref, commodity, deal_value, grower_name, grower_email } = req.body;
  const contribution = (parseFloat(deal_value)||0) * 0.01;
  try {
    await pool.query(`
      INSERT INTO cert_fund (deal_ref,commodity,deal_value,fund_contribution,grower_name,grower_email)
      VALUES ($1,$2,$3,$4,$5,$6)`,
      [deal_ref,commodity,deal_value,contribution,grower_name,grower_email||'']).catch(()=>{});

    const total = await pool.query(`SELECT SUM(fund_contribution) as total FROM cert_fund WHERE cert_status='pending'`);
    const t = nodemailer.createTransport(SMTP);
    await t.sendMail({
      from:'"Mexausa Cert Fund" <sgarcia1911@gmail.com>',
      to:'sgarcia1911@gmail.com',
      subject:`[CERT FUND] +$${contribution.toFixed(2)} from ${deal_ref}`,
      text:`CERTIFICATION FUND UPDATE

Deal: ${deal_ref}
Commodity: ${commodity}
Deal Value: $${parseFloat(deal_value).toLocaleString()}
Contribution: $${contribution.toFixed(2)} (1%)
Grower: ${grower_name}

Total Fund Balance: $${parseFloat(total.rows[0]?.total||0).toFixed(2)}

Fund helps uncertified growers get GlobalGAP/Primus GFS/Organic certification.
mexausafg.com`
    }).catch(()=>{});

    res.json({ok:true, contribution: contribution.toFixed(2),
      total: parseFloat(total.rows[0]?.total||0).toFixed(2)});
  } catch(e) { res.status(500).json({error:e.message}); }
});

// Grower applies for cert fund assistance
router.post('/apply', async (req, res) => {
  const {grower_name,grower_phone,grower_email,grower_location,
         commodity,current_certs,cert_requested,farm_acres,annual_volume,notes} = req.body;
  try {
    await pool.query(`
      INSERT INTO cert_applications
      (grower_name,grower_phone,grower_email,grower_location,commodity,
       current_certs,cert_requested,farm_acres,annual_volume,notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [grower_name,grower_phone,grower_email,grower_location,commodity,
       current_certs||'None',cert_requested,farm_acres,annual_volume,notes||'']).catch(()=>{});

    const t = nodemailer.createTransport(SMTP);
    await t.sendMail({
      from:'"Mexausa Cert Fund" <sgarcia1911@gmail.com>',
      to:'sgarcia1911@gmail.com',
      subject:`[CERT APPLICATION] ${grower_name} — ${cert_requested}`,
      text:`CERTIFICATION FUND APPLICATION

Grower: ${grower_name}
Phone: ${grower_phone}
Email: ${grower_email}
Location: ${grower_location}
Commodity: ${commodity}
Current Certs: ${current_certs||'None'}
Requesting: ${cert_requested}
Farm Size: ${farm_acres} acres
Annual Volume: ${annual_volume}

Review and approve at mexausafg.com`
    }).catch(()=>{});
    res.json({ok:true});
  } catch(e) { res.status(500).json({error:e.message}); }
});

// Fund balance and stats
router.get('/balance', async (_req, res) => {
  try {
    const [balance, apps] = await Promise.all([
      pool.query(`SELECT SUM(fund_contribution) as total,
        SUM(fund_contribution) FILTER (WHERE cert_status='pending') as available,
        SUM(fund_contribution) FILTER (WHERE cert_status='disbursed') as disbursed,
        COUNT(*) as deals FROM cert_fund`),
      pool.query(`SELECT COUNT(*) as total,
        COUNT(*) FILTER (WHERE status='applied') as pending FROM cert_applications`)
    ]);
    res.json({ok:true,
      balance: balance.rows[0],
      applications: apps.rows[0]
    });
  } catch(e) { res.status(500).json({error:e.message}); }
});

module.exports = router;
