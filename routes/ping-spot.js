const express = require('express');
const router = express.Router();
const pool = require('../db');
const nodemailer = require('nodemailer');

const SMTP = { host:'smtp.gmail.com', port:587, secure:false,
  auth:{ user:'sgarcia1911@gmail.com', pass:process.env.GMAIL_APP_PASSWORD||'emgptqrmqdbxrpil' }};

const NTFY = process.env.NTFY_TOPIC || 'mexausa-saul';

// ── INIT TABLES ──────────────────────────────────────────────────────────────
pool.query(`
  CREATE TABLE IF NOT EXISTS ping_consents (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(200) UNIQUE NOT NULL,
    company_name  VARCHAR(200),
    entity_type   VARCHAR(40),
    contact_name  VARCHAR(120),
    phone         VARCHAR(40),
    state         VARCHAR(80),
    country       VARCHAR(10) DEFAULT 'US',
    commodities   TEXT,
    consent_types TEXT[],
    consented_at  TIMESTAMP DEFAULT NOW(),
    opted_out     BOOLEAN DEFAULT false,
    opted_out_at  TIMESTAMP,
    source        VARCHAR(80) DEFAULT 'registration',
    last_pinged   TIMESTAMP,
    ping_count    INTEGER DEFAULT 0,
    created_at    TIMESTAMP DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS ping_notices (
    id            SERIAL PRIMARY KEY,
    notice_type   VARCHAR(40) NOT NULL,
    commodity     VARCHAR(120),
    title         VARCHAR(300),
    body          TEXT,
    target_types  TEXT[],
    sender_email  VARCHAR(200),
    sender_company VARCHAR(200),
    volume        VARCHAR(80),
    price         VARCHAR(80),
    location      VARCHAR(200),
    available_date VARCHAR(40),
    expires_at    TIMESTAMP,
    sent_count    INTEGER DEFAULT 0,
    opened_count  INTEGER DEFAULT 0,
    status        VARCHAR(20) DEFAULT 'active',
    created_at    TIMESTAMP DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS ping_consents_type_idx ON ping_consents(entity_type);
  CREATE INDEX IF NOT EXISTS ping_consents_email_idx ON ping_consents(email);
`).catch(()=>{});

// Entity type → what notices they receive
const PING_MATRIX = {
  grower:      ['product_available','call_for_tender','price_alert','market_intel','compliance_update'],
  producer:    ['product_available','call_for_tender','price_alert','market_intel'],
  buyer:       ['product_available','call_for_tender','price_alert','market_intel','financing_available'],
  importer:    ['product_available','call_for_tender','price_alert','market_intel','financing_available'],
  retailer:    ['product_available','call_for_tender','price_alert'],
  wholesaler:  ['product_available','call_for_tender','price_alert','market_intel','financing_available'],
  distributor: ['product_available','call_for_tender','price_alert','market_intel'],
  broker:      ['product_available','call_for_tender','price_alert','market_intel','deal_opportunity'],
  agent:       ['product_available','call_for_tender','price_alert','deal_opportunity'],
  shipper:     ['freight_opportunity','product_available','compliance_update'],
  packer:      ['product_available','call_for_tender','compliance_update'],
  other:       ['product_available','market_intel'],
};

// What each notice type means in plain language
const NOTICE_DESCRIPTIONS = {
  product_available:    'Product availability alerts — growers posting fresh inventory',
  call_for_tender:      'Buyer calls for tender — buyers posting what they need to source',
  price_alert:          'USDA price movement alerts — FOB drops/spikes on your commodities',
  market_intel:         'Weekly market intelligence — terminal market reports, border crossing data',
  compliance_update:    'FSMA/GlobalGAP/SENASICA compliance updates relevant to your operation',
  financing_available:  'Factoring and PO finance availability from Mexausa partners',
  freight_opportunity:  'Load availability — produce shipments needing freight from origin',
  deal_opportunity:     'Deal matching — opportunities matched to your commodity profile',
};

// ── ADD CONSENT ───────────────────────────────────────────────────────────────
router.post('/consent', async (req, res) => {
  const { email, company_name, entity_type, contact_name, phone,
          state, country, commodities, source } = req.body;
  if (!email || !entity_type) return res.status(400).json({ error:'email and entity_type required' });

  const consent_types = PING_MATRIX[entity_type.toLowerCase()] || PING_MATRIX.other;

  try {
    await pool.query(`
      INSERT INTO ping_consents
        (email,company_name,entity_type,contact_name,phone,state,country,commodities,consent_types,source)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (email) DO UPDATE SET
        entity_type=EXCLUDED.entity_type,
        company_name=EXCLUDED.company_name,
        consent_types=EXCLUDED.consent_types,
        commodities=EXCLUDED.commodities,
        consented_at=NOW()`,
      [email, company_name||'', entity_type.toLowerCase(), contact_name||'',
       phone||'', state||'', country||'US', commodities||'',
       consent_types, source||'registration']
    );
    res.json({ ok:true, consent_types, notice_types: consent_types.map(t=>({type:t, description:NOTICE_DESCRIPTIONS[t]||t})) });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ── OPT OUT ───────────────────────────────────────────────────────────────────
router.post('/optout', async (req, res) => {
  const { email } = req.body;
  try {
    await pool.query(`UPDATE ping_consents SET opted_out=true, opted_out_at=NOW() WHERE email=$1`,[email]);
    res.json({ ok:true });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ── GET CONSENT POOLS ─────────────────────────────────────────────────────────
router.get('/pools', async (_req, res) => {
  try {
    const r = await pool.query(`
      SELECT entity_type,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE opted_out=false) as active,
        COUNT(*) FILTER (WHERE last_pinged > NOW()-INTERVAL '30 days') as pinged_30d
      FROM ping_consents
      GROUP BY entity_type ORDER BY total DESC`);

    const total = await pool.query(`SELECT COUNT(*) FROM ping_consents WHERE opted_out=false`);

    res.json({ ok:true, pools:r.rows, total_consented: parseInt(total.rows[0].count) });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ── CREATE & FIRE NOTICE ──────────────────────────────────────────────────────
router.post('/notice', async (req, res) => {
  const { notice_type, commodity, title, body, target_types,
          sender_email, sender_company, volume, price, location,
          available_date, hours_valid=48 } = req.body;

  if (!notice_type || !title) return res.status(400).json({ error:'notice_type and title required' });

  const expires = new Date(Date.now() + parseInt(hours_valid)*3600*1000);

  // Determine who gets this notice
  const targets = target_types || Object.entries(PING_MATRIX)
    .filter(([,types]) => types.includes(notice_type))
    .map(([type]) => type);

  try {
    // Save notice
    const noticeRes = await pool.query(`
      INSERT INTO ping_notices
        (notice_type,commodity,title,body,target_types,sender_email,sender_company,volume,price,location,available_date,expires_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [notice_type, commodity||'', title, body||'', targets,
       sender_email||'sgarcia1911@gmail.com', sender_company||'Mexausa Food Group',
       volume||'', price||'', location||'', available_date||'',expires]
    );
    const noticeId = noticeRes.rows[0].id;

    // Get all consented recipients in target types
    const recipients = await pool.query(`
      SELECT email, company_name, contact_name, entity_type, commodities
      FROM ping_consents
      WHERE opted_out=false
        AND entity_type = ANY($1::text[])
        ${commodity ? "AND (commodities ILIKE $2 OR commodities='' OR commodities IS NULL)" : ''}
      ORDER BY RANDOM() LIMIT 500`,
      commodity ? [targets, `%${commodity}%`] : [targets]
    );

    if (!recipients.rows.length) {
      return res.json({ ok:true, notice_id:noticeId, sent:0, message:'No consented recipients found yet' });
    }

    // Build email
    const typeLabels = {
      product_available: 'PRODUCT AVAILABLE',
      call_for_tender: 'CALL FOR TENDER',
      price_alert: 'PRICE ALERT',
      market_intel: 'MARKET INTELLIGENCE',
      financing_available: 'FINANCING AVAILABLE',
      freight_opportunity: 'FREIGHT OPPORTUNITY',
      deal_opportunity: 'DEAL OPPORTUNITY',
      compliance_update: 'COMPLIANCE UPDATE',
    };
    const typeLabel = typeLabels[notice_type] || notice_type.toUpperCase();
    const typeColor = notice_type==='product_available'?'#0F7B41':notice_type==='call_for_tender'?'#1d4ed8':notice_type==='price_alert'?'#ef4444':'#C9A55C';

    const emailHtml = (recipientName, recipientCompany) => `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto">
        <div style="background:#0F1419;padding:16px 20px;border-bottom:3px solid ${typeColor}">
          <div style="color:${typeColor};font-size:11px;font-weight:700;letter-spacing:2px">${typeLabel}</div>
          <div style="color:white;font-size:16px;font-weight:700;margin-top:4px">${title}</div>
          ${commodity?`<div style="color:#C9A55C;font-size:12px;margin-top:2px">${commodity}</div>`:''}
        </div>
        <div style="padding:20px;background:white;border:1px solid #e2e8f0">
          <p style="color:#334155;font-size:13px">Hello <strong>${recipientName||recipientCompany}</strong>,</p>
          <p style="color:#475569;font-size:12px;line-height:1.7">${body||title}</p>
          ${volume||price||location ? `
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:14px;margin:14px 0">
            <table style="width:100%;font-size:12px">
              ${volume?`<tr><td style="color:#64748b;padding:4px 0">Volume:</td><td style="font-weight:700">${volume}</td></tr>`:''}
              ${price?`<tr><td style="color:#64748b;padding:4px 0">Price:</td><td style="font-weight:700;color:#0F7B41">${price}</td></tr>`:''}
              ${location?`<tr><td style="color:#64748b;padding:4px 0">Location:</td><td>${location}</td></tr>`:''}
              ${available_date?`<tr><td style="color:#64748b;padding:4px 0">Available:</td><td style="font-weight:700;color:#C9A55C">${available_date}</td></tr>`:''}
            </table>
          </div>` : ''}
          <div style="margin:20px 0;text-align:center">
            <a href="https://loaf.mexausafg.com" style="background:${typeColor};color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:13px">Respond on LOAF Platform</a>
          </div>
          <p style="font-size:11px;color:#94a3b8">You are receiving this because you registered on mexausafg.com as a ${recipientCompany ? `${notice_type.replace('_',' ')} participant` : 'platform member'}. <a href="https://mexausafg.com/optout?email=${recipientCompany}" style="color:#94a3b8">Unsubscribe</a></p>
        </div>
        <div style="padding:10px 20px;background:#f8fafc;font-size:10px;color:#94a3b8;text-align:center">
          Mexausa Food Group, Inc. &middot; EIN 88-1698129 &middot; mexausafg.com &middot; loaf.mexausafg.com
        </div>
      </div>`;

    // Send in batches of 50
    const t = nodemailer.createTransport(SMTP);
    let sent = 0;
    const BATCH = 50;
    for (let i=0; i<recipients.rows.length; i+=BATCH) {
      const batch = recipients.rows.slice(i,i+BATCH);
      await Promise.allSettled(batch.map(r =>
        t.sendMail({
          from: `"Mexausa Food Group" <sgarcia1911@gmail.com>`,
          to: r.email,
          subject: `[${typeLabel}] ${title}${commodity?' — '+commodity:''}`,
          html: emailHtml(r.contact_name, r.company_name)
        }).catch(()=>{})
      ));
      sent += batch.length;
    }

    // Update notice sent count + last_pinged
    await pool.query(`UPDATE ping_notices SET sent_count=$1 WHERE id=$2`,[sent,noticeId]);
    await pool.query(`UPDATE ping_consents SET last_pinged=NOW(), ping_count=ping_count+1
      WHERE email=ANY($1::text[])`, [recipients.rows.map(r=>r.email)]);

    // Ntfy alert to Saul
    try {
      await fetch(`https://ntfy.sh/${NTFY}`, {
        method:'POST',
        headers:{'Content-Type':'application/json','Title':`PING SPOT FIRED — ${typeLabel}`,'Priority':'default','Tags':'bell'},
        body: JSON.stringify({topic:NTFY, message:`${title} — ${commodity||''} — Sent to ${sent} ${targets.join('/')} contacts`})
      });
    } catch(_) {}

    res.json({ ok:true, notice_id:noticeId, sent, targets, recipients:recipients.rows.length });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ── LIST NOTICES ──────────────────────────────────────────────────────────────
router.get('/notices', async (_req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM ping_notices ORDER BY created_at DESC LIMIT 50`);
    res.json({ ok:true, notices:r.rows });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ── POOL STATS ────────────────────────────────────────────────────────────────
router.get('/matrix', (_req, res) => {
  res.json({ ok:true, matrix:PING_MATRIX, descriptions:NOTICE_DESCRIPTIONS });
});

module.exports = router;
