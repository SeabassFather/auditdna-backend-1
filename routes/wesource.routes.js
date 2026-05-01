// =============================================================================
// WE SOURCE -- BACKEND ROUTES
// Save to: C:\AuditDNA\backend\routes\wesource.routes.js
// =============================================================================
// Mount in server.js: app.use('/api/wesource', require('./routes/wesource.routes'));
//
// ENDPOINTS:
//   POST   /api/wesource/request           PUBLIC -- consumer submits request (rate-limited)
//   GET    /api/wesource/inbox             ADMIN -- list of all requests
//   GET    /api/wesource/:id               ADMIN -- single request detail
//   POST   /api/wesource/:id/status        ADMIN -- update status (PENDING/VERIFIED/REJECTED/DISPATCHED/CLOSED)
//   POST   /api/wesource/:id/dispatch      ADMIN -- find retailers/wholesalers in radius + draft anonymized email
//
// PRIVACY: consumer name/email/phone NEVER returned in /dispatch response and NEVER appear in
// the draft email body. Only city/state/ZIP and verification summary go to retailers.
// =============================================================================

const express = require('express');
const pool = require('../db');
const router = express.Router();

// Rate limiter for public submissions -- 5 per IP per hour
const submitRateLimit = new Map(); // ip -> [timestamps]
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX = 5;

function checkRateLimit(ip) {
  const now = Date.now();
  const arr = (submitRateLimit.get(ip) || []).filter(t => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_MAX) return false;
  arr.push(now);
  submitRateLimit.set(ip, arr);
  return true;
}

// Get DB pool (set globally by server.js)
const getDb = () => pool;

// Auth middleware -- require admin JWT for inbox/status/dispatch
function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || '';
  const tok = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!tok) return res.status(401).json({ ok:false, error:'Auth required' });
  // TODO: verify JWT here using your existing middleware. For now, presence-of-token is gate.
  // const decoded = jwt.verify(tok, process.env.JWT_SECRET);
  // if (decoded.role !== 'admin' && decoded.role !== 'agent') return res.status(403).json({ ok:false, error:'Admin only' });
  next();
}

// =============================================================================
// POST /api/wesource/request   (PUBLIC)
// =============================================================================
router.post('/request', async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.connection?.remoteAddress || 'unknown';
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ ok:false, error:'Too many submissions from this IP. Try again in 1 hour.' });
    }

    const b = req.body || {};
    // Validation
    if (!b.first_name || !b.last_name) return res.status(400).json({ ok:false, error:'Name required' });
    if (!b.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.email)) return res.status(400).json({ ok:false, error:'Valid email required' });
    if (!b.phone || b.phone.replace(/\D/g,'').length < 10) return res.status(400).json({ ok:false, error:'Valid phone required' });
    if (!b.zip || b.zip.length < 5) return res.status(400).json({ ok:false, error:'ZIP required' });
    if (!b.product_name || b.product_name.length < 3) return res.status(400).json({ ok:false, error:'Product name required' });
    if (!b.consent_anonymized || !b.consent_contact) return res.status(400).json({ ok:false, error:'Both consents required' });

    const db = getDb();
    if (!db) return res.status(503).json({ ok:false, error:'DB not ready' });

    const id = 'WS-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 7).toUpperCase();

    await db.query(`
      INSERT INTO wesource_requests (
        id, first_name, last_name, email, phone, zip, city, state, country, latitude, longitude,
        product_name, product_brand, product_category, product_size, product_notes,
        retailer_target, retailer_specific,
        answers, language, ip_address, user_agent,
        consent_anonymized, consent_contact,
        status, submitted_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16,
        $17, $18,
        $19, $20, $21, $22,
        $23, $24,
        'PENDING', NOW()
      )
    `, [
      id, b.first_name, b.last_name, b.email, b.phone, b.zip, b.city||'', b.state||'', b.country||'USA', b.latitude||null, b.longitude||null,
      b.product_name, b.product_brand||'', b.product_category||'', b.product_size||'', b.product_notes||'',
      b.retailer_target||'', b.retailer_specific||'',
      JSON.stringify(b.answers||{}), b.language||'en', ip, b.user_agent||'',
      !!b.consent_anonymized, !!b.consent_contact,
    ]);

    // Notify agent inbox via Brain event (if Brain is wired)
    try {
      if (global.brainEvent) {
        global.brainEvent('WESOURCE_NEW_REQUEST', {
          request_id: id,
          product: b.product_name,
          city: b.city,
          state: b.state,
          zip: b.zip,
          submitted_at: new Date().toISOString(),
        });
      }
    } catch (_) { /* non-fatal */ }

    res.json({ ok:true, request_id: id, message: 'Submitted. Our agents review within 24-48 hours.' });
  } catch (err) {
    console.error('[wesource] submit error:', err.message);
    res.status(500).json({ ok:false, error: err.message });
  }
});

// =============================================================================
// GET /api/wesource/inbox   (ADMIN)
// =============================================================================
router.get('/inbox', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.status(503).json({ ok:false, error:'DB not ready' });

    const { status, limit = 200, offset = 0 } = req.query;
    const where = [];
    const params = [];
    let i = 1;
    if (status && status !== 'ALL') {
      where.push(`status = $${i++}`);
      params.push(status);
    }
    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const lim = Math.min(parseInt(limit, 10) || 200, 1000);
    const off = parseInt(offset, 10) || 0;

    const r = await db.query(`
      SELECT id, first_name, last_name, email, phone, zip, city, state, country,
             product_name, product_brand, product_category, product_size, product_notes,
             retailer_target, retailer_specific, answers, language,
             status, status_note, submitted_at, dispatched_at
      FROM wesource_requests
      ${whereSql}
      ORDER BY submitted_at DESC
      LIMIT $${i++} OFFSET $${i++}
    `, [...params, lim, off]);

    res.json({ ok:true, requests: r.rows.map(row => ({ ...row, answers: typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers })) });
  } catch (err) {
    console.error('[wesource] inbox error:', err.message);
    res.status(500).json({ ok:false, error: err.message });
  }
});

// =============================================================================
// GET /api/wesource/:id   (ADMIN)
// =============================================================================
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.status(503).json({ ok:false, error:'DB not ready' });
    const r = await db.query('SELECT * FROM wesource_requests WHERE id = $1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ ok:false, error:'Not found' });
    const row = r.rows[0];
    if (typeof row.answers === 'string') row.answers = JSON.parse(row.answers);
    res.json({ ok:true, request: row });
  } catch (err) {
    res.status(500).json({ ok:false, error: err.message });
  }
});

// =============================================================================
// POST /api/wesource/:id/status   (ADMIN)
// =============================================================================
router.post('/:id/status', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.status(503).json({ ok:false, error:'DB not ready' });
    const { status, note } = req.body || {};
    if (!['PENDING','VERIFIED','REJECTED','DISPATCHED','CLOSED'].includes(status)) {
      return res.status(400).json({ ok:false, error:'Invalid status' });
    }
    await db.query('UPDATE wesource_requests SET status = $1, status_note = $2, updated_at = NOW() WHERE id = $3', [status, note||'', req.params.id]);
    res.json({ ok:true });
  } catch (err) {
    res.status(500).json({ ok:false, error: err.message });
  }
});

// =============================================================================
// POST /api/wesource/:id/dispatch   (ADMIN)
// Finds retailers/wholesalers within radius_miles of consumer ZIP, returns:
//   - recipients: [{email, name, company, type, distance_miles}]
//   - draft: { subject, body_html }   <-- anonymized, no consumer PII
// Frontend hands this off to CampaignsTab FIRE modal.
// =============================================================================
router.post('/:id/dispatch', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.status(503).json({ ok:false, error:'DB not ready' });
    const { radius_miles = 25, language = 'en' } = req.body || {};

    // 1. Load the request
    const r = await db.query('SELECT * FROM wesource_requests WHERE id = $1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ ok:false, error:'Not found' });
    const req_data = r.rows[0];

    // 2. Find retailers + wholesalers within radius
    // Strategy: match by ZIP first (5-digit), then state, then country
    // For real geo radius you need PostGIS or Haversine SQL -- this uses ZIP prefix as proxy.
    const zipPrefix = (req_data.zip || '').slice(0, 3);
    const retailers = await db.query(`
      SELECT id, email, first_name, last_name, company_name, buyer_type, business_type,
             state_region, city, zip, country, product_specialties, commodities_purchased
      FROM buyers
      WHERE email IS NOT NULL AND email != ''
        AND opt_out IS NOT TRUE
        AND (
          zip LIKE $1 OR
          state_region = $2 OR
          (state_region IS NULL AND country = $3)
        )
      LIMIT 500
    `, [zipPrefix + '%', req_data.state, req_data.country]);

    // 3. Build anonymized draft email
    const en = language === 'en';
    const subject = en
      ? 'Consumer demand: ' + req_data.product_name + ' in ' + req_data.city + ', ' + req_data.state
      : 'Demanda de consumidor: ' + req_data.product_name + ' en ' + req_data.city + ', ' + req_data.state;

    const summary = req_data.answers && typeof req_data.answers === 'object' ? req_data.answers : (typeof req_data.answers === 'string' ? JSON.parse(req_data.answers) : {});

    const body_html = (en ? `
<div style="font-family:Arial,sans-serif;color:#0F1419;max-width:600px;margin:0 auto;padding:24px">
  <div style="font-size:11px;font-weight:800;color:#0F7B41;letter-spacing:0.15em">MEXAUSA FOOD GROUP, INC. -- WE SOURCE</div>
  <h2 style="font-size:18px;font-weight:700;color:#0F1419;margin:8px 0 16px 0">Consumer Demand Notice</h2>
  <p style="font-size:13px;line-height:1.6;color:#2A3138">A verified consumer in <strong>${req_data.city}, ${req_data.state} ${req_data.zip}</strong> has formally requested to purchase the following product locally:</p>
  <table style="width:100%;border-collapse:collapse;margin:14px 0;border:1px solid #D4DBD3">
    <tr><td style="padding:8px;background:#F4F6F4;font-size:11px;font-weight:700;width:30%">PRODUCT</td><td style="padding:8px;font-size:13px">${req_data.product_name}</td></tr>
    ${req_data.product_brand ? `<tr><td style="padding:8px;background:#F4F6F4;font-size:11px;font-weight:700">BRAND</td><td style="padding:8px;font-size:13px">${req_data.product_brand}</td></tr>` : ''}
    ${req_data.product_size ? `<tr><td style="padding:8px;background:#F4F6F4;font-size:11px;font-weight:700">SIZE</td><td style="padding:8px;font-size:13px">${req_data.product_size}</td></tr>` : ''}
    ${req_data.product_category ? `<tr><td style="padding:8px;background:#F4F6F4;font-size:11px;font-weight:700">CATEGORY</td><td style="padding:8px;font-size:13px">${req_data.product_category}</td></tr>` : ''}
    <tr><td style="padding:8px;background:#F4F6F4;font-size:11px;font-weight:700">RETAILER PREFERENCE</td><td style="padding:8px;font-size:13px">${req_data.retailer_target || 'Any local'}</td></tr>
  </table>
  <h3 style="font-size:13px;font-weight:700;color:#0F7B41;margin:18px 0 8px 0">Verified Consumer Profile</h3>
  <ul style="font-size:12px;line-height:1.7;color:#2A3138;padding-left:18px">
    <li>Use case: ${summary.use_case || '--'}</li>
    <li>Purchase frequency: ${summary.frequency || '--'}</li>
    <li>Monthly budget: ${summary.budget || '--'}</li>
    <li>Travel willingness: ${summary.distance || '--'}</li>
    <li>Has asked store directly: ${summary.asked_store || '--'}</li>
    <li>Knows others who would buy: ${summary.others || '--'}</li>
  </ul>
  <p style="font-size:13px;line-height:1.6;color:#2A3138;margin-top:18px">If you stock this product or can source it, please reply to this email. Mexausa Food Group serves as the intermediary -- consumer identity is protected. We will connect you with verified demand at no cost.</p>
  <p style="font-size:13px;line-height:1.6;color:#2A3138;margin-top:14px"><strong>Reference:</strong> <code>${req_data.id}</code></p>
  <hr style="border:none;border-top:1px solid #D4DBD3;margin:24px 0 12px 0" />
  <div style="font-size:10px;color:#64748B;line-height:1.5">
    Mexausa Food Group, Inc. | We Source / Oui Source<br/>
    Connecting verified consumer demand with retail and wholesale supply.<br/>
    To opt out of these notices, reply with "UNSUBSCRIBE".
  </div>
</div>
    ` : `
<div style="font-family:Arial,sans-serif;color:#0F1419;max-width:600px;margin:0 auto;padding:24px">
  <div style="font-size:11px;font-weight:800;color:#0F7B41;letter-spacing:0.15em">MEXAUSA FOOD GROUP, INC. -- WE SOURCE</div>
  <h2 style="font-size:18px;font-weight:700;color:#0F1419;margin:8px 0 16px 0">Aviso de Demanda del Consumidor</h2>
  <p style="font-size:13px;line-height:1.6;color:#2A3138">Un consumidor verificado en <strong>${req_data.city}, ${req_data.state} ${req_data.zip}</strong> ha solicitado formalmente comprar el siguiente producto localmente:</p>
  <table style="width:100%;border-collapse:collapse;margin:14px 0;border:1px solid #D4DBD3">
    <tr><td style="padding:8px;background:#F4F6F4;font-size:11px;font-weight:700;width:30%">PRODUCTO</td><td style="padding:8px;font-size:13px">${req_data.product_name}</td></tr>
    ${req_data.product_brand ? `<tr><td style="padding:8px;background:#F4F6F4;font-size:11px;font-weight:700">MARCA</td><td style="padding:8px;font-size:13px">${req_data.product_brand}</td></tr>` : ''}
  </table>
  <p style="font-size:13px;line-height:1.6;color:#2A3138">Si vende o puede obtener este producto, por favor responda a este correo. Mexausa Food Group sirve como intermediario.</p>
  <p style="font-size:13px;line-height:1.6;color:#2A3138;margin-top:14px"><strong>Referencia:</strong> <code>${req_data.id}</code></p>
  <hr style="border:none;border-top:1px solid #D4DBD3;margin:24px 0 12px 0" />
  <div style="font-size:10px;color:#64748B;line-height:1.5">Mexausa Food Group, Inc. | We Source / Oui Source</div>
</div>
    `).trim();

    // 4. Mark request as DISPATCHED
    await db.query('UPDATE wesource_requests SET status = $1, dispatched_at = NOW(), updated_at = NOW() WHERE id = $2', ['DISPATCHED', req.params.id]);

    // 5. Return draft + recipients to frontend
    res.json({
      ok: true,
      recipients: retailers.rows.map(r => ({
        email: r.email,
        name: r.first_name ? (r.first_name + ' ' + (r.last_name||'')).trim() : (r.company_name || r.email.split('@')[0]),
        company: r.company_name,
        type: r.buyer_type || r.business_type,
        state: r.state_region,
        zip: r.zip,
      })),
      draft: { subject, body_html },
      consumer_pii_excluded: true,
      radius_miles,
    });
  } catch (err) {
    console.error('[wesource] dispatch error:', err.message);
    res.status(500).json({ ok:false, error: err.message });
  }
});

module.exports = router;
