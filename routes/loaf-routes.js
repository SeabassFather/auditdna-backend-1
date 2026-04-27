// ============================================================================
// loaf-routes.js — LOAF Mobile Office Backend Routes
// Launch · Origin · Altruistic · Factor
// MexaUSA Food Group, Inc. — AuditDNA Agriculture Intelligence Platform
// Save to: C:\AuditDNA\backend\routes\loaf-routes.js
// Mount in server.js: app.use('/api/loaf', require('./routes/loaf-routes'));
// ============================================================================

const express  = require('express');
const router   = express.Router();
const nodemailer = require('nodemailer');

// ── SMTP transporter (shared) ─────────────────────────────────────────────────
const getTransporter = () => nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtpout.secureserver.net',
  port:   parseInt(process.env.SMTP_PORT || '465'),
  secure: parseInt(process.env.SMTP_PORT || '465') === 465,
  auth: {
    user: process.env.SMTP_USER || process.env.EMAIL_FROM,
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
  },
});

// ── Admin emails that always get pinged ───────────────────────────────────────
const ADMIN_EMAILS = [
  process.env.OWNER_EMAIL      || 'saul@mexausafg.com',
  process.env.ADMIN_PABLO      || 'palt@mfginc.com',
  process.env.ADMIN_OSVALDO    || 'ogut@mfginc.com',
];

// ── DB auto-create LOAF tables (runs once on first request) ──────────────────
let tablesReady = false;
const ensureTables = async (db) => {
  if (tablesReady) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS loaf_submissions (
      id            SERIAL PRIMARY KEY,
      action        VARCHAR(20) NOT NULL,
      commodity     VARCHAR(100),
      quantity      NUMERIC,
      unit          VARCHAR(20),
      price         VARCHAR(50),
      negotiable    BOOLEAN DEFAULT false,
      markets       JSONB,
      region        TEXT,
      notes         TEXT,
      lot_number    VARCHAR(100),
      harvest_date  DATE,
      docs          JSONB,
      grade         JSONB,
      buyer_name    VARCHAR(200),
      invoice_amount NUMERIC,
      invoice_date  DATE,
      broadcast     BOOLEAN DEFAULT false,
      submitter     VARCHAR(200),
      gps_lat       NUMERIC(10,6),
      gps_lng       NUMERIC(10,6),
      submitted_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {});
  tablesReady = true;
};

// ── Shared DB insert ──────────────────────────────────────────────────────────
const insertSubmission = async (db, action, data) => {
  await ensureTables(db);
  const {
    commodity, quantity, unit, price, negotiable, markets, region,
    notes, lot, harvestDate, docs, grade, buyer, invoiceAmount,
    invoiceDate, broadcast, user, gps
  } = data;
  return db.query(`
    INSERT INTO loaf_submissions
      (action, commodity, quantity, unit, price, negotiable, markets, region, notes,
       lot_number, harvest_date, docs, grade, buyer_name, invoice_amount, invoice_date,
       broadcast, submitter, gps_lat, gps_lng)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
    RETURNING id
  `, [
    action,
    commodity    || null,
    quantity     || null,
    unit         || null,
    price        || null,
    negotiable   || false,
    JSON.stringify(markets || []),
    region       || null,
    notes        || null,
    lot          || null,
    harvestDate  || null,
    JSON.stringify(docs  || {}),
    JSON.stringify(grade || {}),
    buyer        || null,
    invoiceAmount|| null,
    invoiceDate  || null,
    broadcast    || false,
    user         || 'field',
    gps?.lat     || null,
    gps?.lng     || null,
  ]).catch(e => { console.warn('[LOAF] DB insert failed:', e.message); return { rows: [{ id: null }] }; });
};

// ── Admin email blast ─────────────────────────────────────────────────────────
const blastAdmins = async (action, payload, user) => {
  if (!process.env.SMTP_USER) return;
  try {
    const transport = getTransporter();
    const actionColors = { LAUNCH: '#185FA5', ORIGIN: '#0F7B41', ALTRUISTIC: '#3B6D11', FACTOR: '#C9A55C' };
    const color = actionColors[action] || '#0F7B41';
    const rows = Object.entries(payload)
      .filter(([k]) => !['gps','docs','grade'].includes(k))
      .map(([k, v]) => `<tr><td style="padding:6px 12px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #1e293b;">${k}</td><td style="padding:6px 12px;font-size:13px;color:#f1f5f9;border-bottom:1px solid #1e293b;">${v || '--'}</td></tr>`)
      .join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0f1a;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 16px;">
<table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
<tr><td style="background:#0F1419;padding:16px 20px;border-left:4px solid ${color};">
  <div style="font-size:10px;letter-spacing:3px;color:#475569;text-transform:uppercase;">AuditDNA LOAF Mobile Office</div>
  <div style="font-size:18px;font-weight:700;color:${color};letter-spacing:2px;margin-top:4px;">${action} — NEW SUBMISSION</div>
  <div style="font-size:11px;color:#64748b;margin-top:2px;">Submitted by: ${user || 'field'} — ${new Date().toLocaleString()}</div>
  ${payload.gps ? `<div style="font-size:10px;color:#334155;margin-top:4px;">GPS: ${payload.gps.lat}, ${payload.gps.lng}</div>` : ''}
</td></tr>
<tr><td style="background:#111827;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
</td></tr>
<tr><td style="background:#0F1419;padding:12px 20px;text-align:center;">
  <div style="font-size:9px;color:#334155;letter-spacing:1px;">MexaUSA Food Group, Inc. — mexausafg.com — LOAF Mobile Field Office</div>
</td></tr>
</table></td></tr></table>
</body></html>`;

    await transport.sendMail({
      from:    `"AuditDNA LOAF Alert" <${process.env.SMTP_USER}>`,
      to:      ADMIN_EMAILS.join(','),
      subject: `[LOAF] ${action} — ${payload.commodity || payload.buyer || 'Field Submission'} — ${new Date().toLocaleTimeString()}`,
      html,
    });
    console.log(`[LOAF] Admin blast sent: ${action} to ${ADMIN_EMAILS.length} admins`);
  } catch (e) {
    console.warn('[LOAF] Admin email blast failed (non-critical):', e.message);
  }
};

// ── OpenClaw WhatsApp broadcast for ALTRUISTIC ────────────────────────────────
const broadcastOpenClaw = async (data) => {
  try {
    const db = global.db;
    if (!db) return;
    const msg = `[ALTRUISTIC ALERT] ${data.quantity} ${data.unit} of ${data.commodity} available from grower network. Region: ${data.region || 'unspecified'}. Offered to growers short on contracts. Reply YES to claim — AuditDNA LOAF`;
    await db.query(
      `INSERT INTO openclaw_messages (direction, phone, body, source, status, created_at) VALUES ('out', $1, $2, 'loaf_altruistic', 'pending', NOW())`,
      [process.env.OPENCLAW_PHONE || '+526463402686', msg]
    ).catch(() => {});
    console.log('[LOAF] OpenClaw broadcast queued for ALTRUISTIC');
  } catch (e) {
    console.warn('[LOAF] OpenClaw broadcast failed (non-critical):', e.message);
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/loaf/admin-ping — fired from frontend after every submission
// ──────────────────────────────────────────────────────────────────────────────
router.post('/admin-ping', async (req, res) => {
  const { action, payload, user, gps, timestamp } = req.body || {};
  console.log(`[LOAF PING] ${action} — ${user} — ${timestamp}`);

  // Post to admin-notifications table (non-blocking)
  const db = global.db;
  if (db) {
    db.query(
      `INSERT INTO admin_notifications (type, title, message, data, created_at) VALUES ($1,$2,$3,$4,NOW())`,
      [
        'loaf_ping',
        `LOAF ${action}: ${payload?.commodity || payload?.buyer || 'Field submission'}`,
        `Submitted by ${user || 'field'} at ${timestamp || new Date().toISOString()}${gps ? ` — GPS: ${gps.lat}, ${gps.lng}` : ''}`,
        JSON.stringify({ action, payload, user, gps })
      ]
    ).catch(() => {});
  }

  // Email blast (async, non-blocking)
  blastAdmins(action, { ...(payload || {}), gps }, user).catch(() => {});

  res.json({ success: true, message: `Admin team pinged for ${action}` });
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/loaf/launch — open market product listing
// ──────────────────────────────────────────────────────────────────────────────
router.post('/launch', async (req, res) => {
  try {
    const { commodity, quantity, unit, price, negotiable, markets, region, notes, gps } = req.body || {};
    if (!commodity || !quantity) return res.status(400).json({ success: false, error: 'commodity and quantity required' });

    const db = global.db;
    const dbRes = await insertSubmission(db, 'LAUNCH', req.body);
    const id = dbRes?.rows?.[0]?.id;

    // Post to DealFloor inventory pipeline (non-blocking)
    if (db) {
      db.query(
        `INSERT INTO inventory (commodity, quantity, unit, price_per_unit, negotiable, region, notes, source, gps_lat, gps_lng, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'loaf_launch',$8,$9,NOW())`,
        [commodity, quantity, unit, price || null, negotiable || false, region || null, notes || null, gps?.lat || null, gps?.lng || null]
      ).catch(() => {});
    }

    console.log(`[LOAF LAUNCH] ${quantity} ${unit} ${commodity} — ID: ${id}`);
    res.json({ success: true, id, action: 'LAUNCH', message: `${quantity} ${unit} of ${commodity} launched to open market` });
  } catch (e) {
    console.error('[LOAF LAUNCH] error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/loaf/origin — traceability chain + quality grading
// ──────────────────────────────────────────────────────────────────────────────
router.post('/origin', async (req, res) => {
  try {
    const { commodity, lot, harvestDate, docs, grade, gps } = req.body || {};
    if (!commodity || !lot) return res.status(400).json({ success: false, error: 'commodity and lot number required' });

    const db = global.db;
    const dbRes = await insertSubmission(db, 'ORIGIN', { ...req.body, quantity: null });
    const id = dbRes?.rows?.[0]?.id;

    // Post to traceability table (non-blocking)
    if (db) {
      db.query(
        `INSERT INTO compliance_documents
           (title, doc_type, lot_number, commodity, harvest_date, quality_grade, quality_data, gps_lat, gps_lng, source, created_at)
         VALUES ($1,'origin_trace',$2,$3,$4,$5,$6,$7,$8,'loaf_origin',NOW())`,
        [
          `ORIGIN-${lot}-${commodity}`,
          lot,
          commodity,
          harvestDate || null,
          grade?.usGrade || null,
          JSON.stringify(grade || {}),
          gps?.lat || null,
          gps?.lng || null,
        ]
      ).catch(() => {});
    }

    console.log(`[LOAF ORIGIN] ${commodity} Lot ${lot} — Grade: ${grade?.usGrade || 'pending'} — ID: ${id}`);
    res.json({ success: true, id, action: 'ORIGIN', usGrade: grade?.usGrade, message: `Origin record created for ${commodity} Lot ${lot}` });
  } catch (e) {
    console.error('[LOAF ORIGIN] error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/loaf/altruistic — surplus broadcast to grower network
// ──────────────────────────────────────────────────────────────────────────────
router.post('/altruistic', async (req, res) => {
  try {
    const { commodity, quantity, unit, region, notes, broadcastOpenClaw: doBroadcast, gps } = req.body || {};
    if (!commodity || !quantity) return res.status(400).json({ success: false, error: 'commodity and quantity required' });

    const db = global.db;
    const dbRes = await insertSubmission(db, 'ALTRUISTIC', { ...req.body, broadcast: doBroadcast });
    const id = dbRes?.rows?.[0]?.id;

    // OpenClaw WhatsApp broadcast if requested (non-blocking)
    if (doBroadcast) {
      broadcastOpenClaw({ commodity, quantity, unit, region, notes }).catch(() => {});
    }

    console.log(`[LOAF ALTRUISTIC] ${quantity} ${unit} ${commodity} — Broadcast: ${doBroadcast} — ID: ${id}`);
    res.json({ success: true, id, action: 'ALTRUISTIC', broadcast: doBroadcast, message: `${quantity} ${unit} of ${commodity} offered to grower network` });
  } catch (e) {
    console.error('[LOAF ALTRUISTIC] error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/loaf/factor — invoice advance routing
// ──────────────────────────────────────────────────────────────────────────────
router.post('/factor', async (req, res) => {
  try {
    const { buyer, invoiceAmount, invoiceDate, commodity, gps } = req.body || {};
    if (!buyer || !invoiceAmount) return res.status(400).json({ success: false, error: 'buyer and invoice amount required' });

    const db = global.db;
    const dbRes = await insertSubmission(db, 'FACTOR', req.body);
    const id = dbRes?.rows?.[0]?.id;

    // Route to factor intake pipeline (non-blocking)
    if (db) {
      db.query(
        `INSERT INTO financing_deals
           (deal_type, buyer_name, invoice_amount, invoice_date, commodity, source, status, created_at)
         VALUES ('invoice_factoring',$1,$2,$3,$4,'loaf_factor','pending_review',NOW())`,
        [buyer, invoiceAmount, invoiceDate || null, commodity || null]
      ).catch(() => {});
    }

    const estimatedAdvance = (parseFloat(invoiceAmount) * 0.85).toFixed(2);
    console.log(`[LOAF FACTOR] $${invoiceAmount} — ${buyer} — Est advance: $${estimatedAdvance} — ID: ${id}`);
    res.json({ success: true, id, action: 'FACTOR', estimatedAdvance, message: `Invoice for $${invoiceAmount} routed to factoring partners` });
  } catch (e) {
    console.error('[LOAF FACTOR] error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/loaf/history — recent LOAF submissions
// ──────────────────────────────────────────────────────────────────────────────
router.get('/history', async (req, res) => {
  try {
    const db = global.db;
    if (!db) return res.json({ success: true, submissions: [] });
    const result = await db.query(
      `SELECT id, action, commodity, quantity, unit, buyer_name, submitter, submitted_at, gps_lat, gps_lng
       FROM loaf_submissions ORDER BY submitted_at DESC LIMIT 50`
    ).catch(() => ({ rows: [] }));
    res.json({ success: true, submissions: result.rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
