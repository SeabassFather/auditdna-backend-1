// ====================================================================
// AuditDNA Backend — mobileWorkspace.js
// Mobile gateway routes. Universal capture + AI classification.
// ====================================================================
// Mount: app.use('/api/mobile', require('./routes/mobileWorkspace'));
// Save to: C:\AuditDNA\backend\routes\mobileWorkspace.js
// Requires: ANTHROPIC_API_KEY, JWT_SECRET in env
// ====================================================================

const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const jwt      = require('jsonwebtoken');
const pool = require('../db');

// ---------- file upload (multipart) ----------
const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads', 'mobile');
fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_ROOT),
  filename: (_req, file, cb) => {
    const stamp = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    const ext = path.extname(file.originalname || '') || '.bin';
    cb(null, stamp + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

// ---------- DB ----------
function db() {
  if (pool) return pool;
  throw new Error('pool not initialized');
}

// ---------- brain emit ----------
function brainEmit(kind, payload) {
  try {
    if (typeof global.brainEmit === 'function') {
      global.brainEmit(kind, payload);
    } else if (global.brainBus && typeof global.brainBus.emit === 'function') {
      global.brainBus.emit(kind, payload);
    }
  } catch (e) {
    console.warn('[mobileWorkspace] brainEmit failed:', e.message);
  }
}

// ---------- JWT decode (soft) ----------
function authUser(req) {
  const auth = req.headers.authorization || '';
  const tok = auth.replace(/^Bearer\s+/i, '').trim();
  if (!tok) return null;
  try {
    const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
    const decoded = jwt.verify(tok, secret);
    return decoded;
  } catch (_) {
    try {
      const parts = tok.split('.');
      if (parts.length === 3) {
        return JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      }
    } catch (_) {}
    return null;
  }
}

function requireAuth(req, res, next) {
  const u = authUser(req);
  if (!u) return res.status(401).json({ error: 'unauthorized' });
  req.user = u;
  next();
}

function softAuth(req, _res, next) {
  req.user = authUser(req) || { role: 'guest', email: '', name: '' };
  next();
}

// ---------- Anthropic client (lazy load) ----------
let anthropicClient = null;
function getAnthropic() {
  if (anthropicClient) return anthropicClient;
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[mobileWorkspace] ANTHROPIC_API_KEY missing - AI calls will fail');
    return null;
  }
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const Ctor = Anthropic.default || Anthropic;
    anthropicClient = new Ctor({ apiKey: process.env.ANTHROPIC_API_KEY });
    return anthropicClient;
  } catch (e) {
    console.warn('[mobileWorkspace] @anthropic-ai/sdk not installed:', e.message);
    return null;
  }
}

// ---------- helpers ----------
function fileToBase64(filePath) {
  return fs.readFileSync(filePath).toString('base64');
}

function mediaTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.heic' || ext === '.heif') return 'image/jpeg';
  if (ext === '.pdf') return 'application/pdf';
  return 'application/octet-stream';
}

function isImageFile(filePath) {
  return mediaTypeFor(filePath).indexOf('image/') === 0;
}

// ====================================================================
// GET /api/mobile/me/role
// ====================================================================
router.get('/me/role', softAuth, async (req, res) => {
  const u = req.user || {};
  let role  = u.role || 'sales';
  let name  = u.name || '';
  let email = u.email || '';

  if (u.email && (!u.role || !u.name)) {
    try {
      const r = await db().query(
        'SELECT name, role, email FROM auth_users WHERE LOWER(email) = LOWER($1) LIMIT 1',
        [u.email]
      );
      if (r.rows && r.rows[0]) {
        role  = r.rows[0].role  || role;
        name  = r.rows[0].name  || name || u.email;
        email = r.rows[0].email || email;
      }
    } catch (_) {}
  }

  res.json({
    role,
    name: name || (email ? email.split('@')[0] : 'Field User'),
    email,
    permissions: rolePermissions(role)
  });
});

function rolePermissions(role) {
  const all = ['capture','traceability','factoring','order','scan','prices','crm','compose','alerts'];
  if (role === 'owner' || role === 'admin') return all;
  if (role === 'sales')      return ['capture','order','factoring','crm','compose','prices','scan','alerts'];
  if (role === 'grower')     return ['capture','traceability','factoring','prices','scan','compose','alerts','crm'];
  if (role === 'wholesaler') return ['capture','order','factoring','prices','crm','compose','scan','alerts'];
  if (role === 'packer')     return ['capture','scan','traceability','order','crm','compose','prices','alerts'];
  if (role === 'shipper')    return ['capture','scan','order','crm','compose','prices','alerts'];
  if (role === 'inspector')  return ['capture','traceability','scan','crm','compose','alerts','prices'];
  if (role === 'buyer')      return ['capture','order','prices','crm','compose','scan','alerts'];
  return ['capture','prices','crm','compose'];
}

// ====================================================================
// POST /api/mobile/capture
// Universal AI classifier + router.
// ====================================================================
router.post('/capture', softAuth, upload.single('file'), async (req, res) => {
  const text   = (req.body && req.body.text) ? String(req.body.text) : '';
  const lang   = (req.body && req.body.lang) ? String(req.body.lang) : 'en';
  const gpsLat = req.body && req.body.gps_lat ? parseFloat(req.body.gps_lat) : null;
  const gpsLng = req.body && req.body.gps_lng ? parseFloat(req.body.gps_lng) : null;
  const file   = req.file || null;

  if (!text && !file) {
    return res.status(400).json({ error: 'no_input', message: 'Send file or text' });
  }

  const client = getAnthropic();
  let result;
  try {
    if (!client) {
      result = ruleBasedClassify(text, file ? file.originalname : '');
    } else {
      result = await aiClassify(client, text, file, lang);
    }
  } catch (e) {
    console.error('[capture] classify error:', e.message);
    result = ruleBasedClassify(text, file ? file.originalname : '');
  }

  let captureId = null;
  try {
    await ensureMobileSchema();
    const ins = await db().query(
      `INSERT INTO mobile_captures (
         user_email, classification, module, summary, extracted_json,
         text_input, file_path, gps_lat, gps_lng, created_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, NOW()) RETURNING id`,
      [
        req.user.email || null,
        result.classification || null,
        result.module || null,
        result.summary || null,
        result.extracted ? JSON.stringify(result.extracted) : null,
        text || null,
        file ? file.path : null,
        gpsLat, gpsLng
      ]
    );
    captureId = ins.rows[0].id;
  } catch (e) {
    console.error('[capture] insert failed:', e.message);
  }

  brainEmit('MOBILE_CAPTURE', {
    capture_id: captureId,
    user: req.user.email,
    module: result.module,
    classification: result.classification,
    gps: { lat: gpsLat, lng: gpsLng }
  });

  res.json({
    capture_id: captureId,
    classification: result.classification,
    module: result.module,
    summary: result.summary,
    extracted: result.extracted,
    module_label: prettyModule(result.module, lang),
    suggested_screen: moduleToScreen(result.module)
  });
});

function moduleToScreen(mod) {
  if (!mod) return null;
  const map = {
    traceability: 'traceability',
    factoring:    'factoring',
    orders:       'order',
    crm:          'crm',
    email:        'compose',
    compliance:   'scan',
    prices:       'prices',
    scan:         'scan'
  };
  return map[mod] || null;
}

function prettyModule(mod, lang) {
  const dict = {
    traceability: { en: 'Traceability', es: 'Trazabilidad' },
    factoring:    { en: 'Factoring',    es: 'Factoraje' },
    orders:       { en: 'Orders',       es: 'Pedidos' },
    crm:          { en: 'CRM',          es: 'CRM' },
    email:        { en: 'Email Marketing', es: 'Email Marketing' },
    compliance:   { en: 'Compliance',   es: 'Cumplimiento' },
    prices:       { en: 'Pricing',      es: 'Precios' },
    scan:         { en: 'Document Vault', es: 'Boveda Documental' }
  };
  if (!mod || !dict[mod]) return lang === 'es' ? 'Bandeja (revision manual)' : 'Inbox (manual review)';
  return dict[mod][lang === 'es' ? 'es' : 'en'];
}

function ruleBasedClassify(text, filename) {
  const blob = ((text || '') + ' ' + (filename || '')).toLowerCase();
  if (/purchase\s*order|orden\s*de\s*compra|^po[\s-]/.test(blob)) {
    return { classification: 'Purchase Order', module: 'orders', summary: 'Looks like a purchase order', extracted: null };
  }
  if (/invoice|factura|receivable|cuenta\s*por\s*cobrar/.test(blob)) {
    return { classification: 'Invoice / Receivable', module: 'factoring', summary: 'Receivable - candidate for factoring', extracted: null };
  }
  if (/bill\s*of\s*lading|carta\s*porte|\bbol\b/.test(blob)) {
    return { classification: 'Bill of Lading', module: 'compliance', summary: 'Shipping document', extracted: null };
  }
  if (/usda|gap|primus|fsma|certif|globalg/.test(blob)) {
    return { classification: 'Certification', module: 'compliance', summary: 'Compliance certificate', extracted: null };
  }
  if (/traceabil|harvest|yield|fertilizer|pesticid|riego|fertilizante|cosecha/.test(blob)) {
    return { classification: 'Traceability Report', module: 'traceability', summary: 'Field traceability data', extracted: null };
  }
  if (/contact|tarjeta|business\s*card|@/.test(blob)) {
    return { classification: 'Contact Card', module: 'crm', summary: 'New contact', extracted: null };
  }
  return { classification: 'Unclassified', module: null, summary: 'Routed to inbox for manual review', extracted: null };
}

async function aiClassify(client, text, file, lang) {
  const sys = [
    'You classify mobile field captures for an agricultural commerce platform.',
    'Possible modules: traceability, factoring, orders, crm, email, compliance, prices, scan.',
    'Document types include: PO, invoice, BOL, certification, traceability_report, contract, business_card, leaf_photo, soil_photo, receipt, other.',
    'Return STRICT JSON only:',
    '{"classification": "<short type>", "module": "<one module key or null>", "summary": "<one sentence ' + (lang === 'es' ? 'in Spanish' : 'in English') + '>", "extracted": <object with key fields or null>}'
  ].join(' ');

  const content = [];
  if (file && isImageFile(file.path)) {
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: mediaTypeFor(file.path),
        data: fileToBase64(file.path)
      }
    });
  }
  if (file && file.originalname) {
    content.push({ type: 'text', text: 'Filename: ' + file.originalname });
  }
  if (text) {
    content.push({ type: 'text', text: 'Pasted text:\n' + text.slice(0, 8000) });
  }
  if (content.length === 0) {
    content.push({ type: 'text', text: 'No content provided.' });
  }

  const resp = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: sys,
    messages: [{ role: 'user', content }]
  });

  const txt = (resp.content || []).map(c => c.text || '').join('').trim();
  try {
    const cleaned = txt.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    return JSON.parse(cleaned);
  } catch (_) {
    return { classification: 'Unknown', module: null, summary: txt.slice(0, 240), extracted: null };
  }
}

// ====================================================================
// POST /api/mobile/traceability/analyze
// AI agronomy analysis - water/fertilizer/seed/soil/irrigation/pest checks
// ====================================================================
router.post('/traceability/analyze', softAuth, upload.single('report_photo'), async (req, res) => {
  const commodity = (req.body && req.body.commodity)   ? String(req.body.commodity).trim() : '';
  const fieldId   = (req.body && req.body.field_id)    ? String(req.body.field_id).trim()  : '';
  const reportTxt = (req.body && req.body.report_text) ? String(req.body.report_text)      : '';
  const lang      = (req.body && req.body.lang)        ? String(req.body.lang)             : 'en';
  const gpsLat = req.body && req.body.gps_lat ? parseFloat(req.body.gps_lat) : null;
  const gpsLng = req.body && req.body.gps_lng ? parseFloat(req.body.gps_lng) : null;
  const file = req.file || null;

  if (!commodity || (!reportTxt && !file)) {
    return res.status(400).json({ error: 'missing_input' });
  }

  const client = getAnthropic();
  let analysis;
  try {
    if (!client) {
      analysis = stubTraceabilityAnalysis(commodity, reportTxt);
    } else {
      analysis = await aiTraceabilityAnalysis(client, commodity, fieldId, reportTxt, file, lang);
    }
  } catch (e) {
    console.error('[traceability] analyze error:', e.message);
    analysis = stubTraceabilityAnalysis(commodity, reportTxt);
  }

  let analysisId = null;
  try {
    await ensureMobileSchema();
    const ins = await db().query(
      `INSERT INTO mobile_traceability_analyses (
         user_email, commodity, field_id, report_text, file_path,
         analysis_json, severity, gps_lat, gps_lng, created_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, NOW()) RETURNING id`,
      [
        req.user.email || null,
        commodity, fieldId, reportTxt,
        file ? file.path : null,
        JSON.stringify(analysis),
        analysis.severity || 'low',
        gpsLat, gpsLng
      ]
    );
    analysisId = ins.rows[0].id;
  } catch (e) {
    console.error('[traceability] insert failed:', e.message);
  }

  brainEmit('TRACEABILITY_ANALYZED', {
    analysis_id: analysisId,
    user: req.user.email,
    commodity, field_id: fieldId,
    severity: analysis.severity
  });

  res.json({ analysis_id: analysisId, ...analysis });
});

function stubTraceabilityAnalysis(commodity, reportTxt) {
  const t = (reportTxt || '').toLowerCase();
  const issues = [];
  if (/water|riego|agua/.test(t)) issues.push({ category: 'water', finding: 'Possible irrigation imbalance detected in report wording.', recommendation: 'Verify soil moisture sensors and increase deep watering cycles by 12 percent.', confidence: 0.6 });
  if (/fertiliz|nitrog|n-p-k/.test(t)) issues.push({ category: 'fert_a', finding: 'Fertilizer application timing or volume may be off.', recommendation: 'Review last 14 days of applications and consider reducing nitrogen rate by 10 percent.', confidence: 0.55 });
  if (/seed|coat|recubri/.test(t)) issues.push({ category: 'seed', finding: 'Seed coating concern noted.', recommendation: 'Confirm coating manufacturer batch and switch to lighter coat for next planting.', confidence: 0.5 });
  if (issues.length === 0) {
    issues.push({ category: 'water', finding: 'No major issues detected from text alone.', recommendation: 'Submit a richer report or photo for deeper analysis.', confidence: 0.4 });
  }
  return {
    summary: 'Provisional analysis on ' + commodity + ' (offline mode).',
    severity: issues.length >= 2 ? 'medium' : 'low',
    issues,
    yield_impact: { estimate_pct: -8, confidence: 0.4 },
    next_steps: [
      'Capture a clearer photo of the field and re-run analysis.',
      'Re-submit when ANTHROPIC_API_KEY is configured for full AI analysis.'
    ]
  };
}

async function aiTraceabilityAnalysis(client, commodity, fieldId, reportTxt, file, lang) {
  const sys = [
    'You are an agronomy AI for an agricultural trade platform.',
    'Analyze a field traceability report. Look for issues with: water, fert_t (fertilizer type), fert_a (fertilizer amount), seed (seed coating), soil (soil prep), irrig (irrigation timing), pest (pesticide / MRL).',
    'Return STRICT JSON only with this shape:',
    '{',
    '  "summary": "<one sentence ' + (lang === 'es' ? 'in Spanish' : 'in English') + '>",',
    '  "severity": "low|medium|high|critical",',
    '  "issues": [',
    '    { "category": "water|fert_t|fert_a|seed|soil|irrig|pest", "finding": "<short>", "recommendation": "<actionable>", "confidence": 0.0-1.0 }',
    '  ],',
    '  "yield_impact": { "estimate_pct": <integer, can be negative>, "confidence": 0.0-1.0 },',
    '  "next_steps": [ "<step 1>", "<step 2>", "<step 3>" ]',
    '}',
    'Be specific and quantitative. Recommend concrete actions: increase water by N percent, reduce nitrogen by N pounds per acre, change seed coating supplier, etc.'
  ].join('\n');

  const content = [
    { type: 'text', text: 'Commodity: ' + commodity + (fieldId ? '\nField/Block: ' + fieldId : '') }
  ];
  if (file && isImageFile(file.path)) {
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: mediaTypeFor(file.path),
        data: fileToBase64(file.path)
      }
    });
  }
  if (reportTxt) {
    content.push({ type: 'text', text: 'Report:\n' + reportTxt.slice(0, 12000) });
  }

  const resp = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: sys,
    messages: [{ role: 'user', content }]
  });

  const txt = (resp.content || []).map(c => c.text || '').join('').trim();
  try {
    const cleaned = txt.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    return JSON.parse(cleaned);
  } catch (_) {
    return stubTraceabilityAnalysis(commodity, reportTxt);
  }
}

// ====================================================================
// POST /api/mobile/traceability/save
// ====================================================================
router.post('/traceability/save', requireAuth, async (req, res) => {
  const { analysis_id, commodity, field_id } = req.body || {};
  try {
    await db().query(
      `UPDATE mobile_traceability_analyses
         SET saved_to_file = true, saved_at = NOW()
         WHERE id = $1`,
      [analysis_id]
    );
    brainEmit('TRACEABILITY_SAVED', { analysis_id, user: req.user.email, commodity, field_id });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'save_failed', message: e.message });
  }
});

// ====================================================================
// POST /api/mobile/factoring/field
// ====================================================================
router.post('/factoring/field', requireAuth,
  upload.fields([{ name: 'po_file', maxCount: 1 }, { name: 'receivable_photo', maxCount: 1 }]),
  async (req, res) => {
    const buyer  = (req.body && req.body.buyer) ? String(req.body.buyer).trim() : '';
    const amount = req.body && req.body.amount ? parseFloat(req.body.amount) : 0;
    const dueDate = req.body && req.body.due_date ? String(req.body.due_date) : null;
    const notes  = req.body && req.body.notes ? String(req.body.notes) : '';
    const gpsLat = req.body && req.body.gps_lat ? parseFloat(req.body.gps_lat) : null;
    const gpsLng = req.body && req.body.gps_lng ? parseFloat(req.body.gps_lng) : null;
    const poFile   = req.files && req.files.po_file && req.files.po_file[0];
    const recvFile = req.files && req.files.receivable_photo && req.files.receivable_photo[0];

    if (!buyer || !amount || amount <= 0 || !poFile || !recvFile) {
      return res.status(400).json({ error: 'missing_fields' });
    }

    let dealId;
    try {
      await db().query(`
        ALTER TABLE financing_deals
          ADD COLUMN IF NOT EXISTS submitted_by_email TEXT,
          ADD COLUMN IF NOT EXISTS po_file_path TEXT,
          ADD COLUMN IF NOT EXISTS receivable_file_path TEXT,
          ADD COLUMN IF NOT EXISTS source TEXT,
          ADD COLUMN IF NOT EXISTS gps_lat NUMERIC,
          ADD COLUMN IF NOT EXISTS gps_lng NUMERIC,
          ADD COLUMN IF NOT EXISTS notes TEXT,
          ADD COLUMN IF NOT EXISTS due_date DATE
      `).catch(() => {});

      const ins = await db().query(
        `INSERT INTO financing_deals (
           submitted_by_email, buyer_name, amount_usd, due_date, notes,
           po_file_path, receivable_file_path, source, gps_lat, gps_lng,
           status, created_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,'mobile_field',$8,$9,'submitted', NOW())
         RETURNING id`,
        [
          req.user.email,
          buyer, amount, dueDate, notes,
          poFile.path, recvFile.path,
          gpsLat, gpsLng
        ]
      );
      dealId = ins.rows[0].id;
    } catch (e) {
      console.error('[factoring/field] insert failed:', e.message);
      return res.status(500).json({ error: 'db_failed', message: e.message });
    }

    brainEmit('FIELD_FACTORING_SUBMITTED', {
      deal_id: dealId, user: req.user.email,
      buyer, amount, gps: { lat: gpsLat, lng: gpsLng }
    });

    res.json({
      deal_id: dealId,
      status: 'submitted',
      partner_label: 'Mexausa Food Group financing partner'
    });
  }
);

// ====================================================================
// POST /api/mobile/order
// ====================================================================
router.post('/order', requireAuth, async (req, res) => {
  const b = req.body || {};
  const commodity = String(b.commodity || '').trim();
  const qty       = parseFloat(b.qty);
  const unit      = String(b.unit || 'cases');
  const price     = parseFloat(b.price);
  const buyer     = String(b.buyer || '').trim();
  const delivery  = b.delivery_date || null;
  const notes     = String(b.notes || '');
  const gpsLat    = b.gps_lat ? parseFloat(b.gps_lat) : null;
  const gpsLng    = b.gps_lng ? parseFloat(b.gps_lng) : null;

  if (!commodity || !qty || !price || !buyer) {
    return res.status(400).json({ error: 'missing_fields' });
  }

  let orderId;
  try {
    await ensureMobileSchema();
    const ins = await db().query(
      `INSERT INTO mobile_orders (
         submitted_by_email, commodity, qty, unit, price_per_unit,
         total_usd, buyer_name, delivery_date, notes, gps_lat, gps_lng,
         status, created_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'open', NOW())
       RETURNING id`,
      [
        req.user.email,
        commodity, qty, unit, price,
        qty * price,
        buyer, delivery, notes,
        gpsLat, gpsLng
      ]
    );
    orderId = ins.rows[0].id;
  } catch (e) {
    console.error('[order] insert failed:', e.message);
    return res.status(500).json({ error: 'db_failed', message: e.message });
  }

  brainEmit('MOBILE_ORDER_CREATED', {
    order_id: orderId, user: req.user.email,
    commodity, qty, unit, total_usd: qty * price, buyer
  });

  res.json({ order_id: orderId, status: 'open', total_usd: qty * price });
});

// ====================================================================
// POST /api/mobile/scan-upload
// ====================================================================
router.post('/scan-upload', requireAuth, upload.single('file'), async (req, res) => {
  const docType = (req.body && req.body.doc_type) ? String(req.body.doc_type) : 'other';
  const notes   = (req.body && req.body.notes) ? String(req.body.notes) : '';
  const gpsLat  = req.body && req.body.gps_lat ? parseFloat(req.body.gps_lat) : null;
  const gpsLng  = req.body && req.body.gps_lng ? parseFloat(req.body.gps_lng) : null;
  const file    = req.file;

  if (!file) return res.status(400).json({ error: 'no_file' });

  let uploadId;
  try {
    await ensureMobileSchema();
    const ins = await db().query(
      `INSERT INTO mobile_uploads (
         user_email, doc_type, file_path, file_name, mime_type,
         notes, gps_lat, gps_lng, created_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8, NOW()) RETURNING id`,
      [
        req.user.email,
        docType, file.path, file.originalname, file.mimetype,
        notes, gpsLat, gpsLng
      ]
    );
    uploadId = ins.rows[0].id;
  } catch (e) {
    console.error('[scan-upload] insert failed:', e.message);
    return res.status(500).json({ error: 'db_failed', message: e.message });
  }

  brainEmit('MOBILE_SCAN_UPLOADED', {
    upload_id: uploadId, user: req.user.email,
    doc_type: docType, file: file.originalname
  });

  res.json({ upload_id: uploadId, url: '/uploads/mobile/' + path.basename(file.path) });
});

// ====================================================================
// POST /api/mobile/compose
// ====================================================================
router.post('/compose', requireAuth, upload.single('attachment'), async (req, res) => {
  const to      = (req.body && req.body.to)      ? String(req.body.to).trim()      : '';
  const subject = (req.body && req.body.subject) ? String(req.body.subject).trim() : '';
  const body    = (req.body && req.body.body)    ? String(req.body.body)           : '';
  const lang    = (req.body && req.body.lang)    ? String(req.body.lang)           : 'en';
  const file    = req.file || null;

  if (!to || !subject || !body) return res.status(400).json({ error: 'missing_fields' });

  let msgId;
  try {
    await ensureMobileSchema();
    const ins = await db().query(
      `INSERT INTO mobile_outbox (
         from_email, to_email, subject, body, attachment_path, lang,
         status, created_at
       ) VALUES ($1,$2,$3,$4,$5,$6,'queued', NOW()) RETURNING id`,
      [
        req.user.email,
        to, subject, body,
        file ? file.path : null, lang
      ]
    );
    msgId = ins.rows[0].id;
  } catch (e) {
    console.error('[compose] insert failed:', e.message);
    return res.status(500).json({ error: 'db_failed', message: e.message });
  }

  brainEmit('MOBILE_COMPOSE_QUEUED', { msg_id: msgId, user: req.user.email, to, subject });
  res.json({ msg_id: msgId, status: 'queued' });
});

// ====================================================================
// GET /api/mobile/prices
// ====================================================================
router.get('/prices', softAuth, async (_req, res) => {
  try {
    let result;
    try {
      result = await db().query(`
        SELECT commodity, region, unit, low_price AS low, high_price AS high,
               today_price AS today, updated_at
        FROM v_usda_mobile_prices
        ORDER BY commodity ASC
        LIMIT 50
      `);
    } catch (_) {
      result = await db().query(`
        SELECT commodity, region, unit,
               MIN(price) AS low, MAX(price) AS high,
               AVG(price) AS today, MAX(observed_at) AS updated_at
        FROM usda_prices
        WHERE observed_at >= NOW() - INTERVAL '7 days'
        GROUP BY commodity, region, unit
        ORDER BY commodity ASC
        LIMIT 50
      `);
    }
    res.json({ items: (result && result.rows) || [] });
  } catch (e) {
    console.warn('[prices] no data source:', e.message);
    res.json({ items: [] });
  }
});

// ====================================================================
// GET /api/mobile/alerts
// ====================================================================
router.get('/alerts', requireAuth, async (req, res) => {
  const role  = req.user.role || 'sales';
  const email = req.user.email;
  const items = [];

  try {
    const r1 = await db().query(`
      SELECT id, kind AS type, summary, detail, payload_json, created_at,
             COALESCE(actions, ARRAY['approve','decline','open']::text[]) AS actions,
             module
      FROM autonomy_queue
      WHERE status = 'pending'
        AND (assigned_to_email = $1 OR assigned_to_role = $2 OR assigned_to_role = 'any')
      ORDER BY created_at DESC
      LIMIT 50
    `, [email, role]);
    if (r1 && r1.rows) items.push(...r1.rows);
  } catch (_) {}

  try {
    const r2 = await db().query(`
      SELECT id, 'approval' AS type, summary, detail, NULL AS payload_json,
             created_at,
             ARRAY['approve','decline','open']::text[] AS actions,
             module
      FROM pending_approvals
      WHERE status = 'pending'
        AND (target_email = $1 OR target_role = $2)
      ORDER BY created_at DESC
      LIMIT 50
    `, [email, role]);
    if (r2 && r2.rows) items.push(...r2.rows);
  } catch (_) {}

  res.json({ items });
});

// ====================================================================
// POST /api/mobile/alerts/:id/decide
// ====================================================================
router.post('/alerts/:id/decide', requireAuth, async (req, res) => {
  const id = req.params.id;
  const decision = req.body && req.body.decision === 'approve' ? 'approve' : 'decline';
  try {
    try {
      await db().query(`
        UPDATE autonomy_queue
           SET status = $1, decided_by_email = $2, decided_at = NOW()
         WHERE id = $3
      `, [decision === 'approve' ? 'approved' : 'declined', req.user.email, id]);
    } catch (_) {
      await db().query(`
        UPDATE pending_approvals
           SET status = $1, decided_by_email = $2, decided_at = NOW()
         WHERE id = $3
      `, [decision, req.user.email, id]);
    }
    brainEmit('ALERT_DECIDED', { alert_id: id, decision, user: req.user.email });
    res.json({ ok: true, decision });
  } catch (e) {
    res.status(500).json({ error: 'decide_failed', message: e.message });
  }
});

// ====================================================================
// GET /api/mobile/crm-search?q=
// ====================================================================
router.get('/crm-search', requireAuth, async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  if (q.length < 2) return res.json({ items: [] });
  const like = '%' + q.toLowerCase() + '%';

  const results = [];
  const seen = new Set();

  const pushDedup = (rows, source) => {
    for (const r of (rows || [])) {
      const key = (r.email || r.phone || r.name || '').toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      results.push({
        name:    r.name    || '',
        company: r.company || r.organization || '',
        email:   r.email   || '',
        phone:   r.phone   || '',
        source
      });
    }
  };

  try {
    const r = await db().query(`
      SELECT name, company, email, phone
      FROM unified_crm
      WHERE LOWER(name)    LIKE $1
         OR LOWER(email)   LIKE $1
         OR LOWER(company) LIKE $1
         OR phone          LIKE $1
      LIMIT 25
    `, [like]);
    if (r && r.rows) pushDedup(r.rows, 'UnifiedCRM');
  } catch (_) {}

  try {
    const r = await db().query(`
      SELECT first_name || ' ' || COALESCE(last_name,'') AS name,
             company, email, phone
      FROM saul_crm_contacts
      WHERE LOWER(first_name) LIKE $1
         OR LOWER(last_name)  LIKE $1
         OR LOWER(email)      LIKE $1
         OR LOWER(company)    LIKE $1
         OR phone             LIKE $1
      LIMIT 25
    `, [like]);
    if (r && r.rows) pushDedup(r.rows, 'SaulIntelCRM');
  } catch (_) {}

  try {
    const r = await db().query(`
      SELECT name, company, email, phone
      FROM email_marketing
      WHERE LOWER(email)   LIKE $1
         OR LOWER(name)    LIKE $1
         OR LOWER(company) LIKE $1
      LIMIT 25
    `, [like]);
    if (r && r.rows) pushDedup(r.rows, 'EmailMarketing');
  } catch (_) {}

  try {
    const r = await db().query(`
      SELECT
        company_name AS name,
        company_name AS company,
        contact_email AS email,
        contact_phone AS phone
      FROM growers
      WHERE LOWER(company_name) LIKE $1
         OR LOWER(contact_email) LIKE $1
         OR contact_phone LIKE $1
      LIMIT 25
    `, [like]);
    if (r && r.rows) pushDedup(r.rows, 'Growers');
  } catch (_) {}

  res.json({ items: results.slice(0, 50) });
});

// ====================================================================
// SCHEMA: ensure mobile-side tables exist
// ====================================================================
let _schemaEnsured = false;
async function ensureMobileSchema() {
  if (_schemaEnsured) return;
  await db().query(`
    CREATE TABLE IF NOT EXISTS mobile_captures (
      id BIGSERIAL PRIMARY KEY,
      user_email TEXT,
      classification TEXT,
      module TEXT,
      summary TEXT,
      extracted_json JSONB,
      text_input TEXT,
      file_path TEXT,
      gps_lat NUMERIC,
      gps_lng NUMERIC,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await db().query(`
    CREATE TABLE IF NOT EXISTS mobile_traceability_analyses (
      id BIGSERIAL PRIMARY KEY,
      user_email TEXT,
      commodity TEXT,
      field_id TEXT,
      report_text TEXT,
      file_path TEXT,
      analysis_json JSONB,
      severity TEXT,
      gps_lat NUMERIC,
      gps_lng NUMERIC,
      saved_to_file BOOLEAN DEFAULT false,
      saved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await db().query(`
    CREATE TABLE IF NOT EXISTS mobile_orders (
      id BIGSERIAL PRIMARY KEY,
      submitted_by_email TEXT,
      commodity TEXT, qty NUMERIC, unit TEXT,
      price_per_unit NUMERIC, total_usd NUMERIC,
      buyer_name TEXT, delivery_date DATE, notes TEXT,
      gps_lat NUMERIC, gps_lng NUMERIC,
      status TEXT DEFAULT 'open',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await db().query(`
    CREATE TABLE IF NOT EXISTS mobile_uploads (
      id BIGSERIAL PRIMARY KEY,
      user_email TEXT,
      doc_type TEXT,
      file_path TEXT, file_name TEXT, mime_type TEXT,
      notes TEXT,
      gps_lat NUMERIC, gps_lng NUMERIC,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await db().query(`
    CREATE TABLE IF NOT EXISTS mobile_outbox (
      id BIGSERIAL PRIMARY KEY,
      from_email TEXT, to_email TEXT,
      subject TEXT, body TEXT,
      attachment_path TEXT, lang TEXT,
      status TEXT DEFAULT 'queued',
      sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  _schemaEnsured = true;
  console.log('[mobileWorkspace] schema ensured');
}

ensureMobileSchema().catch(e => console.warn('[mobileWorkspace] schema ensure failed:', e.message));

// ====================================================================
// HEALTH
// ====================================================================
router.get('/health', (_req, res) => {
  res.json({
    ok: true,
    module: 'mobileWorkspace',
    version: '2.0',
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    schema: _schemaEnsured
  });
});

module.exports = router;
