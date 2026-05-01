// =============================================================================
// PLASTPAC ROUTES
// File: C:\AuditDNA\backend\routes\plastpac.routes.js
// Mount in server.js:  app.use('/api/plastpac', require('./routes/plastpac.routes'));
// =============================================================================

'use strict';

const express = require('express');
const router = express.Router();
const svc = require('../services/plastpac-inquiry');
const { pool } = require('../db');

// Body parser - in case parent app didn't mount express.json globally
router.use(express.json({ limit: '256kb' }));

// ----------------------------------------------------------------------------
// PUBLIC: submit an inquiry from the LOAF EcoCrate card
// POST /api/plastpac/inquiry
// ----------------------------------------------------------------------------
router.post('/inquiry', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.email && !b.phone) {
      return res.status(400).json({ ok: false, error: 'email or phone required' });
    }
    if (!b.company && !b.contact_name) {
      return res.status(400).json({ ok: false, error: 'company or contact_name required' });
    }

    const data = {
      product_slug: b.product_slug || 'plastpac-ecocrate',
      source: b.source || 'loaf',
      company: (b.company || '').toString().slice(0, 255),
      contact_name: (b.contact_name || '').toString().slice(0, 255),
      contact_role: (b.contact_role || '').toString().slice(0, 128),
      email: (b.email || '').toString().slice(0, 255),
      phone: (b.phone || '').toString().slice(0, 64),
      current_packaging: (b.current_packaging || '').toString().slice(0, 64),
      box_dimensions: (b.box_dimensions || '').toString().slice(0, 128),
      board_style: (b.board_style || '').toString().slice(0, 128),
      print_requirements: (b.print_requirements || '').toString().slice(0, 2000),
      weight_limit: (b.weight_limit || '').toString().slice(0, 64),
      pallet_pattern: (b.pallet_pattern || '').toString().slice(0, 128),
      shipping_address: (b.shipping_address || '').toString().slice(0, 1000),
      ordering_contact: (b.ordering_contact || '').toString().slice(0, 255),
      notes: (b.notes || '').toString().slice(0, 4000),
      ip_address: (req.headers['x-forwarded-for'] || req.ip || '').toString().slice(0, 64),
      user_agent: (req.headers['user-agent'] || '').toString().slice(0, 500),
      utm_source: (b.utm_source || '').toString().slice(0, 128),
      utm_medium: (b.utm_medium || '').toString().slice(0, 128),
      utm_campaign: (b.utm_campaign || '').toString().slice(0, 128)
    };

    const result = await svc.handleInquiry(data);
    return res.json(result);
  } catch (err) {
    console.error('[POST /api/plastpac/inquiry] error:', err.message, err.stack);
    return res.status(500).json({ ok: false, error: 'server error' });
  }
});

// ----------------------------------------------------------------------------
// PUBLIC: get product card data (for the LOAF EcoCrate panel + landing pages)
// GET /api/plastpac/product/:slug
// ----------------------------------------------------------------------------
router.get('/product/:slug', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT p.slug, p.name, p.brand, p.short_pitch, p.description, p.description_es,
              p.features, p.benefits, p.brochure_url, p.glow,
              s.display_name AS rep_name, s.title AS rep_title, s.company AS rep_company,
              s.territory AS rep_territory, s.phone AS rep_phone, s.email AS rep_email,
              s.signature_html AS rep_signature
       FROM platform_products p
       LEFT JOIN sales_reps s ON s.username = p.rep_username
       WHERE p.slug = $1 AND p.active = TRUE`,
      [req.params.slug]
    );
    if (!r.rows[0]) return res.status(404).json({ ok: false, error: 'product not found' });
    return res.json({ ok: true, product: r.rows[0] });
  } catch (err) {
    console.error('[GET /api/plastpac/product] error:', err.message);
    return res.status(500).json({ ok: false, error: 'server error' });
  }
});

// ----------------------------------------------------------------------------
// CRM (auth-protected at app level): list inquiries
// GET /api/plastpac/inquiries?status=new&assigned_to=hector&limit=50
// ----------------------------------------------------------------------------
router.get('/inquiries', async (req, res) => {
  try {
    const rows = await svc.listInquiries({
      status: req.query.status || null,
      assigned_to: req.query.assigned_to || null,
      limit: Math.min(parseInt(req.query.limit, 10) || 50, 500),
      offset: parseInt(req.query.offset, 10) || 0
    });
    return res.json({ ok: true, count: rows.length, rows });
  } catch (err) {
    console.error('[GET /api/plastpac/inquiries] error:', err.message);
    return res.status(500).json({ ok: false, error: 'server error' });
  }
});

router.get('/inquiries/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM plastpac_inquiries WHERE id = $1', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ ok: false, error: 'not found' });
    return res.json({ ok: true, inquiry: r.rows[0] });
  } catch (err) {
    console.error('[GET /api/plastpac/inquiries/:id] error:', err.message);
    return res.status(500).json({ ok: false, error: 'server error' });
  }
});

router.post('/inquiries/:id/status', async (req, res) => {
  try {
    const { status, note } = req.body || {};
    const allowed = ['new','contacted','qualified','sample_sent','quoted','closed','rejected'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ ok: false, error: 'invalid status' });
    }
    const row = await svc.updateStatus(req.params.id, status, note || '');
    return res.json({ ok: true, inquiry: row });
  } catch (err) {
    console.error('[POST status] error:', err.message);
    return res.status(500).json({ ok: false, error: 'server error' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const stats = await svc.getStats();
    return res.json({ ok: true, stats });
  } catch (err) {
    console.error('[GET stats] error:', err.message);
    return res.status(500).json({ ok: false, error: 'server error' });
  }
});

// ----------------------------------------------------------------------------
// CRM: outreach log - record sends from EmailMarketing.jsx Hector tab
// POST /api/plastpac/outreach
// ----------------------------------------------------------------------------
router.post('/outreach', async (req, res) => {
  try {
    const b = req.body || {};
    const r = await pool.query(
      `INSERT INTO plastpac_outreach
       (product_slug, rep_username, contact_id, contact_name, contact_email, contact_company, contact_category,
        channel, message_subject, message_body)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, sent_at`,
      [
        b.product_slug || 'plastpac-ecocrate',
        b.rep_username || 'hector',
        b.contact_id || null,
        (b.contact_name || '').slice(0, 255),
        (b.contact_email || '').slice(0, 255),
        (b.contact_company || '').slice(0, 255),
        (b.contact_category || '').slice(0, 64),
        b.channel || 'email',
        (b.message_subject || '').slice(0, 255),
        (b.message_body || '').slice(0, 10000)
      ]
    );
    return res.json({ ok: true, outreach_id: r.rows[0].id, sent_at: r.rows[0].sent_at });
  } catch (err) {
    console.error('[POST outreach] error:', err.message);
    return res.status(500).json({ ok: false, error: 'server error' });
  }
});

router.get('/outreach', async (req, res) => {
  try {
    const rep = req.query.rep_username || null;
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const args = rep ? [rep, limit] : [limit];
    const where = rep ? 'WHERE rep_username = $1' : '';
    const lim = rep ? '$2' : '$1';
    const r = await pool.query(
      `SELECT * FROM plastpac_outreach ${where} ORDER BY sent_at DESC LIMIT ${lim}`,
      args
    );
    return res.json({ ok: true, count: r.rows.length, rows: r.rows });
  } catch (err) {
    console.error('[GET outreach] error:', err.message);
    return res.status(500).json({ ok: false, error: 'server error' });
  }
});

router.get('/outreach/stats', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT
        COUNT(*)::int AS total_sent,
        COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::int  AS total_opened,
        COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)::int AS total_clicked,
        COUNT(*) FILTER (WHERE replied_at IS NOT NULL)::int AS total_replied,
        COUNT(*) FILTER (WHERE sent_at >= NOW() - INTERVAL '24 hours')::int AS last_24h,
        COUNT(*) FILTER (WHERE sent_at >= NOW() - INTERVAL '7 days')::int   AS last_7d
      FROM plastpac_outreach
    `);
    return res.json({ ok: true, stats: r.rows[0] });
  } catch (err) {
    console.error('[GET outreach/stats] error:', err.message);
    return res.status(500).json({ ok: false, error: 'server error' });
  }
});

module.exports = router;
