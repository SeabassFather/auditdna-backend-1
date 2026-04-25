// C:\AuditDNA\backend\routes\factor-intake.js
// Sprint C Phase 4 - Deal Floor backend endpoints
// 
// NEW ROUTES (mount at /api/factor):
//   POST /api/factor/intake/upload          Claude Vision parse PDF/JPG/PNG -> structured data
//   POST /api/factor/intake/manual          Create financing_deals row from manual or parsed data
//   GET  /api/factor/analytics              Analytics across deals (charts)
//   GET  /api/factor/deal/:id/package.pdf   Bilingual deal package PDF export
//
// MOUNT THIS ROUTER IN server.js NEXT TO factor-matchmaker.js:
//   app.use('/api/factor', require('./routes/factor-intake'));
// 
// DEPENDENCIES (npm i in C:\AuditDNA\backend):
//   multer            file upload handling
//   pdfkit            PDF generation
//   @anthropic-ai/sdk already installed
//
// PowerShell:
//   cd C:\AuditDNA\backend
//   npm i multer pdfkit

const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const multer = require('multer');
const PDFDocument = require('pdfkit');

const JWT_SECRET = process.env.JWT_SECRET || 'auditdna-grower-jwt-dev';
const VISION_MODEL = 'claude-opus-4-7';

// Brain logging
let brain = null;
try { brain = require('../Brain'); } catch (e) { console.warn('[INTAKE] Brain unavailable:', e.message); }
const brainLog = (event, data) => {
  try { if (brain && typeof brain.logEvent === 'function') brain.logEvent('factor_intake', event, data); } catch {}
};

// Auth middleware (matches existing pattern)
function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token provided' });
  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function getPool(req) {
  if (req.app && req.app.locals && req.app.locals.pool) return req.app.locals.pool;
  if (global.db) return global.db;
  throw new Error('database pool not available');
}

// Multer setup - in-memory, 10 MB cap
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// ============================================================
// CLAUDE VISION SYSTEM PROMPTS - bilingual
// ============================================================
const VISION_PROMPT_INVOICE_EN = `You are an invoice parser for an agricultural trade finance platform. The user has uploaded an INVOICE image or PDF page. Extract these fields exactly. Output ONLY a JSON object, no prose, no markdown fences.

Fields to extract (use null if not present):
- invoice_number (string)
- grower (seller / shipper company name)
- buyer (buy-side company name)
- commodity (product description, e.g. "Hass Avocado 48ct")
- quantity (number, no units)
- unit (string: "lbs", "kg", "cases", "pallets", "tons")
- unit_price (number, USD per unit)
- invoice_amount (number, total USD - the line you would factor)
- invoice_date (ISO date YYYY-MM-DD)
- due_date (ISO date)
- terms (string: "Net 14", "Net 30", "COD", etc.)
- origin (string: state/region/country of origin)
- destination (string: state/city/country of delivery)
- harvest_window (string: e.g. "Aug 15 - Nov 30, 2027")
- notes (string: any unusual terms, escrow language, etc.)
- confidence (number 0-100: your overall extraction confidence)
- warnings (array of strings: any data quality concerns)

If a field is unreadable or genuinely absent, use null. Do not invent.`;

const VISION_PROMPT_INVOICE_ES = `Eres un analizador de facturas para una plataforma de financiamiento comercial agricola. El usuario subio una FACTURA en imagen o PDF. Extrae estos campos exactamente. Devuelve SOLO un objeto JSON, sin texto, sin formato markdown.

Campos a extraer (usa null si no existen):
- invoice_number (numero de factura)
- grower (vendedor / productor)
- buyer (comprador)
- commodity (descripcion del producto, ej. "Aguacate Hass 48ct")
- quantity (numero, sin unidades)
- unit (cadena: "lbs", "kg", "cajas", "tarimas", "toneladas")
- unit_price (numero, USD por unidad)
- invoice_amount (numero, total USD - el monto a factorear)
- invoice_date (fecha ISO YYYY-MM-DD)
- due_date (fecha ISO de vencimiento)
- terms (cadena: "Net 14", "Net 30", "COD", etc.)
- origin (estado/region/pais de origen)
- destination (estado/ciudad/pais de destino)
- harvest_window (ej. "15 Ago - 30 Nov 2027")
- notes (terminos inusuales, escrow, etc.)
- confidence (numero 0-100: tu confianza general en la extraccion)
- warnings (arreglo de cadenas: dudas sobre calidad de datos)

Si un campo es ilegible o no existe, usa null. No inventes.`;

const VISION_PROMPT_PO_EN = VISION_PROMPT_INVOICE_EN.replace(/INVOICE/g, 'PURCHASE ORDER').replace(/invoice_number/g, 'po_number').replace(/invoice_date/g, 'po_date').replace(/invoice_amount/g, 'po_amount');
const VISION_PROMPT_PO_ES = VISION_PROMPT_INVOICE_ES.replace(/FACTURA/g, 'ORDEN DE COMPRA').replace(/factura/g, 'orden de compra').replace(/invoice_number/g, 'po_number').replace(/invoice_date/g, 'po_date').replace(/invoice_amount/g, 'po_amount');

function getSystemPrompt(mode, lang) {
  if (mode === 'po') return lang === 'es' ? VISION_PROMPT_PO_ES : VISION_PROMPT_PO_EN;
  return lang === 'es' ? VISION_PROMPT_INVOICE_ES : VISION_PROMPT_INVOICE_EN;
}

// ============================================================
// POST /api/factor/intake/upload
// ============================================================
router.post('/intake/upload', authRequired, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'no file' });
  const mode = (req.body.mode || 'invoice').toLowerCase();
  const lang = (req.body.lang || 'en').toLowerCase();
  const mimetype = req.file.mimetype;
  const sizeKB = (req.file.size / 1024).toFixed(1);

  console.log(`[INTAKE] upload mode=${mode} lang=${lang} mime=${mimetype} size=${sizeKB}KB by user=${req.user.userId}`);
  brainLog('upload_received', { mode, lang, size: req.file.size, mime: mimetype });

  // Decide if Claude can read it
  const supportedImage = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'].includes(mimetype);
  const supportedPdf = mimetype === 'application/pdf';
  if (!supportedImage && !supportedPdf && mimetype !== 'text/csv') {
    return res.status(400).json({ success: false, error: `unsupported mimetype ${mimetype}` });
  }

  if (mimetype === 'text/csv') {
    // Lightweight CSV path - parse to text and let Claude extract
    return parseCSV(req.file.buffer, mode, lang, res, req.user);
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const systemPrompt = getSystemPrompt(mode, lang);

    // Build content array - PDF gets document type, images get image type
    const contentBlock = supportedPdf
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: req.file.buffer.toString('base64') } }
      : { type: 'image', source: { type: 'base64', media_type: mimetype, data: req.file.buffer.toString('base64') } };

    const t0 = Date.now();
    const msg = await anthropic.messages.create({
      model: VISION_MODEL,
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: [
          contentBlock,
          { type: 'text', text: lang === 'es' ? 'Extrae los campos JSON.' : 'Extract the JSON fields.' }
        ]
      }]
    });
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

    const textBlock = msg.content.find(b => b.type === 'text');
    if (!textBlock) {
      return res.status(500).json({ success: false, error: 'no text response from vision model' });
    }

    // Strip any markdown fences just in case
    let raw = textBlock.text.trim();
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.warn('[INTAKE] vision JSON parse failed, raw=', raw.substring(0, 300));
      return res.status(500).json({ success: false, error: 'vision returned invalid JSON', raw_preview: raw.substring(0, 300) });
    }

    console.log(`[INTAKE] parsed in ${elapsed}s confidence=${parsed.confidence || 'n/a'}`);
    brainLog('parsed', { mode, lang, confidence: parsed.confidence, elapsed_s: elapsed });

    res.json({ success: true, parsed, model: VISION_MODEL, elapsed_s: parseFloat(elapsed) });
  } catch (err) {
    console.error('[INTAKE UPLOAD]', err.message);
    brainLog('upload_failed', { error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

async function parseCSV(buffer, mode, lang, res, user) {
  // Simple CSV path - convert to text rows, ask Claude to extract
  try {
    const text = buffer.toString('utf-8');
    const preview = text.length > 4000 ? text.substring(0, 4000) + '\n[truncated]' : text;
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const systemPrompt = getSystemPrompt(mode, lang);
    const msg = await anthropic.messages.create({
      model: VISION_MODEL,
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: `CSV data:\n\n${preview}\n\nExtract the JSON fields.` }]
    });
    const textBlock = msg.content.find(b => b.type === 'text');
    let raw = (textBlock?.text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
    const parsed = JSON.parse(raw);
    res.json({ success: true, parsed, model: VISION_MODEL, source: 'csv' });
  } catch (e) {
    res.status(500).json({ success: false, error: 'csv parse: ' + e.message });
  }
}

// ============================================================
// POST /api/factor/intake/manual
// ============================================================
router.post('/intake/manual', authRequired, async (req, res) => {
  const pool = getPool(req);
  try {
    const f = req.body || {};
    const lang = (f.lang || 'en').toLowerCase();

    // Required: at least invoice_amount or unit_price+quantity
    let amount = parseFloat(f.invoice_amount);
    if ((!amount || isNaN(amount)) && f.unit_price && f.quantity) {
      amount = parseFloat(f.unit_price) * parseFloat(f.quantity);
    }
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, error: 'invoice_amount or (unit_price * quantity) required' });
    }

    const insertSQL = `
      INSERT INTO financing_deals (
        invoice_number, po_number, grower_name, buyer_name, commodity,
        quantity, unit, unit_price, invoice_amount,
        invoice_date, due_date, payment_terms,
        origin_region, destination_region, harvest_window,
        notes, source_type, source_lang, status, created_by, created_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12,
        $13, $14, $15,
        $16, $17, $18, 'PROPOSAL', $19, NOW()
      )
      RETURNING id
    `;
    const params = [
      f.invoice_number || null,
      f.po_number || null,
      f.grower || null,
      f.buyer || null,
      f.commodity || null,
      f.quantity ? parseFloat(f.quantity) : null,
      f.unit || null,
      f.unit_price ? parseFloat(f.unit_price) : null,
      amount,
      f.invoice_date || null,
      f.due_date || null,
      f.terms || null,
      f.origin || null,
      f.destination || null,
      f.harvest_window || null,
      f.notes || null,
      f.mode === 'po' ? 'po' : 'invoice',
      lang,
      req.user.userId
    ];

    const r = await pool.query(insertSQL, params);
    const deal_id = r.rows[0].id;

    console.log(`[INTAKE] deal_id=${deal_id} created amount=$${amount} mode=${f.mode}`);
    brainLog('deal_created', { deal_id, amount, mode: f.mode, lang, user_id: req.user.userId });

    res.json({ success: true, deal_id, amount });
  } catch (err) {
    console.error('[INTAKE MANUAL]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// GET /api/factor/analytics
// ============================================================
router.get('/analytics', authRequired, async (req, res) => {
  const pool = getPool(req);
  try {
    const dealsQ = await pool.query(`
      SELECT
        COUNT(*)::int AS total_deals,
        COALESCE(SUM(invoice_amount), 0)::numeric AS total_volume_usd,
        COALESCE(AVG(EXTRACT(EPOCH FROM (closed_at - created_at))/3600), 0)::int AS avg_close_hours
      FROM financing_deals
    `).catch(() => ({ rows: [{ total_deals: 0, total_volume_usd: 0, avg_close_hours: 0 }] }));

    const partnerQ = await pool.query(`
      SELECT
        fdd.partner_id,
        COUNT(DISTINCT fdd.deal_id)::int AS deals,
        COALESCE(SUM(fd.invoice_amount), 0)::numeric AS volume_usd
      FROM factor_deal_documents fdd
      LEFT JOIN financing_deals fd ON fdd.deal_id = fd.id
      WHERE fdd.status IN ('SENT', 'SIGNED')
      GROUP BY fdd.partner_id
      ORDER BY deals DESC
      LIMIT 20
    `).catch(() => ({ rows: [] }));

    const a = dealsQ.rows[0];
    const by_partner = partnerQ.rows.map(r => ({
      partner_id: r.partner_id,
      deals: r.deals,
      volume_usd: parseFloat(r.volume_usd),
      win_rate_pct: 0  // placeholder until we track signed-vs-sent
    }));

    res.json({
      success: true,
      analytics: {
        total_deals: a.total_deals,
        total_volume_usd: parseFloat(a.total_volume_usd),
        avg_close_hours: a.avg_close_hours,
        win_rate_pct: 0,
        commission_earned_usd: parseFloat(a.total_volume_usd) * 0.005,  // 0.5% placeholder
        by_partner
      }
    });
  } catch (err) {
    console.error('[INTAKE ANALYTICS]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// GET /api/factor/deal/:id/package.pdf
// ============================================================
router.get('/deal/:id/package.pdf', authRequired, async (req, res) => {
  const pool = getPool(req);
  const dealId = parseInt(req.params.id, 10);
  const lang = (req.query.lang || 'en').toLowerCase();

  try {
    const dealQ = await pool.query('SELECT * FROM financing_deals WHERE id = $1', [dealId]);
    if (dealQ.rows.length === 0) return res.status(404).send('Deal not found');
    const deal = dealQ.rows[0];

    const docsQ = await pool.query(`
      SELECT fdd.*, fp.name AS partner_name
      FROM factor_deal_documents fdd
      LEFT JOIN factoring_partners fp ON fdd.partner_id = fp.partner_id
      WHERE fdd.deal_id = $1 ORDER BY fdd.created_at ASC
    `, [dealId]);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="deal-${dealId}-package.pdf"`);

    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    doc.pipe(res);

    const L = (en, es) => lang === 'es' ? es : en;

    // Header
    doc.fontSize(20).fillColor('#7c2d12').text(L('DEAL PACKAGE', 'PAQUETE DE OPERACION'), { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#475569').text('Mexausa Food Group, Inc. · AuditDNA', { align: 'center' });
    doc.moveDown(1);

    // Deal section
    doc.fontSize(14).fillColor('#1e293b').text(L(`Deal #${dealId}`, `Operacion #${dealId}`));
    doc.moveDown(0.5);
    doc.fontSize(10);
    const kv = (k, v) => { doc.fillColor('#475569').text(k, { continued: true }).fillColor('#1e293b').text(': ' + (v ?? '-')); };
    kv(L('Invoice #', 'Factura #'), deal.invoice_number);
    kv(L('PO #', 'OC #'), deal.po_number);
    kv(L('Grower', 'Productor'), deal.grower_name);
    kv(L('Buyer', 'Comprador'), deal.buyer_name);
    kv(L('Commodity', 'Producto'), deal.commodity);
    kv(L('Quantity', 'Cantidad'), deal.quantity ? `${deal.quantity} ${deal.unit || ''}` : null);
    kv(L('Amount', 'Monto'), deal.invoice_amount ? '$' + Number(deal.invoice_amount).toLocaleString() : null);
    kv(L('Terms', 'Terminos'), deal.payment_terms);
    kv(L('Origin', 'Origen'), deal.origin_region);
    kv(L('Destination', 'Destino'), deal.destination_region);
    kv(L('Harvest Window', 'Ventana de Cosecha'), deal.harvest_window);
    kv(L('Status', 'Estado'), deal.status);
    if (deal.notes) {
      doc.moveDown(0.5);
      doc.fillColor('#475569').text(L('Notes', 'Notas') + ':');
      doc.fillColor('#1e293b').text(deal.notes, { indent: 10 });
    }
    doc.moveDown(1);

    // Documents section
    doc.fontSize(14).fillColor('#1e293b').text(L('Documents Audit Trail', 'Registro de Auditoria de Documentos'));
    doc.moveDown(0.5);
    doc.fontSize(10);
    if (docsQ.rows.length === 0) {
      doc.fillColor('#94a3b8').text(L('No documents yet', 'Sin documentos'));
    } else {
      docsQ.rows.forEach(d => {
        doc.fillColor('#1e293b').text(`${d.partner_id} - ${d.doc_type} - ${d.status}`);
        doc.fillColor('#94a3b8').fontSize(9).text(`  ${L('Sent', 'Enviado')}: ${d.sent_at ? new Date(d.sent_at).toLocaleString() : '-'}`, { indent: 10 });
        doc.fontSize(10);
        doc.moveDown(0.2);
      });
    }
    doc.moveDown(1);

    // Footer
    doc.fontSize(9).fillColor('#94a3b8');
    doc.text(L(
      `Generated ${new Date().toLocaleString()} - Confidential & Proprietary`,
      `Generado ${new Date().toLocaleString()} - Confidencial y Propietario`
    ), { align: 'center' });

    doc.end();
  } catch (err) {
    console.error('[DEAL PDF]', err.message);
    if (!res.headersSent) res.status(500).send('PDF error: ' + err.message);
  }
});

module.exports = router;
