'use strict';
const express = require('express');
const router  = express.Router();
const { pool } = require('../db');

const bootstrap = async (req) => {
  
  await global.db.query(`
    CREATE TABLE IF NOT EXISTS credit_applications (
      id               SERIAL PRIMARY KEY,
      app_type         VARCHAR(50)  NOT NULL DEFAULT 'factoring',
      company_name     VARCHAR(255),
      contact_name     VARCHAR(255),
      email            VARCHAR(255),
      phone            VARCHAR(50),
      paca_license     VARCHAR(100),
      annual_revenue   NUMERIC(15,2),
      credit_limit_req NUMERIC(15,2),
      factoring_tier   VARCHAR(50),
      payment_terms    VARCHAR(50),
      bank_name        VARCHAR(255),
      bank_contact     VARCHAR(255),
      references_json  JSONB,
      notes            TEXT,
      status           VARCHAR(50) DEFAULT 'pending',
      reviewed_by      VARCHAR(100),
      reviewed_at      TIMESTAMPTZ,
      created_at       TIMESTAMPTZ DEFAULT NOW(),
      data_json        JSONB
    );
  `).catch(e => console.warn('[credit-apps] bootstrap warning:', e.message));
};

const FACTORING_TIERS = {
  premium:    { label: 'Premium',    fee: '1.5% - 2.5%', min_revenue: 10000000, advance: 90, turnaround: '24 hrs' },
  standard:   { label: 'Standard',   fee: '2.5% - 4.0%', min_revenue: 2000000,  advance: 85, turnaround: '48 hrs' },
  developing: { label: 'Developing', fee: '4.0% - 6.0%', min_revenue: 500000,   advance: 80, turnaround: '72 hrs' },
  startup:    { label: 'Startup',    fee: '6.0% - 8.0%', min_revenue: 0,        advance: 75, turnaround: '5 days' },
};

// GET /api/credit-apps/admin/tiers
router.get('/admin/tiers', (req, res) => {
  res.json({ ok: true, tiers: FACTORING_TIERS });
});

// POST /api/credit-apps/trade-credit
router.post('/trade-credit', async (req, res) => {
  try {
    
    await bootstrap(req);
    const { company_name, contact_name, email, phone, paca_license, annual_revenue, credit_limit_req, payment_terms, bank_name, bank_contact, notes } = req.body;
    const result = await global.db.query(
      `INSERT INTO credit_applications (app_type, company_name, contact_name, email, phone, paca_license, annual_revenue, credit_limit_req, payment_terms, bank_name, bank_contact, notes)
       VALUES ('trade_credit', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [company_name, contact_name, email, phone, paca_license, annual_revenue, credit_limit_req, payment_terms, bank_name, bank_contact, notes]
    );
    try { await global.db.query("INSERT INTO brain_events (event_type, module, payload, created_at) VALUES ($1, $2, $3, NOW())", ['TRADE_CREDIT_APP', 'credit-apps', JSON.stringify(req.body)]); } catch(e) {}
    res.json({ ok: true, id: result.rows[0].id, message: 'Trade credit application submitted.' });
  } catch (e) {
    console.error('[credit-apps] trade-credit error:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/credit-apps/factoring
router.post('/factoring', async (req, res) => {
  try {
    
    await bootstrap(req);
    const { company_name, contact_name, email, phone, paca_license, annual_revenue, credit_limit_req, factoring_tier, notes } = req.body;
    const result = await global.db.query(
      `INSERT INTO credit_applications (app_type, company_name, contact_name, email, phone, paca_license, annual_revenue, credit_limit_req, factoring_tier, notes)
       VALUES ('factoring', $1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [company_name, contact_name, email, phone, paca_license, annual_revenue, credit_limit_req, factoring_tier, notes]
    );
    try { await global.db.query("INSERT INTO brain_events (event_type, module, payload, created_at) VALUES ($1, $2, $3, NOW())", ['FACTORING_APP', 'credit-apps', JSON.stringify(req.body)]); } catch(e) {}
    res.json({ ok: true, id: result.rows[0].id, message: 'Factoring application submitted.' });
  } catch (e) {
    console.error('[credit-apps] factoring error:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/credit-apps/net-terms
router.post('/net-terms', async (req, res) => {
  try {
    
    await bootstrap(req);
    const { company_name, contact_name, email, phone, payment_terms, notes } = req.body;
    const result = await global.db.query(
      `INSERT INTO credit_applications (app_type, company_name, contact_name, email, phone, payment_terms, notes)
       VALUES ('net_terms', $1, $2, $3, $4, $5, $6) RETURNING id`,
      [company_name, contact_name, email, phone, payment_terms, notes]
    );
    try { await global.db.query("INSERT INTO brain_events (event_type, module, payload, created_at) VALUES ($1, $2, $3, NOW())", ['NET_TERMS_APP', 'credit-apps', JSON.stringify(req.body)]); } catch(e) {}
    res.json({ ok: true, id: result.rows[0].id, message: 'Net terms application submitted.' });
  } catch (e) {
    console.error('[credit-apps] net-terms error:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/credit-apps/list
router.get('/list', async (req, res) => {
  try {
    
    await bootstrap(req);
    const { app_type, status } = req.query;
    const where = [];
    const params = [];
    if (app_type) { where.push('app_type = $' + (params.push(app_type))); }
    if (status)   { where.push('status = $'   + (params.push(status)));   }
    const clause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const result = await global.db.query(
      'SELECT id, app_type, company_name, contact_name, email, phone, paca_license, annual_revenue, credit_limit_req, factoring_tier, payment_terms, bank_name, bank_contact, notes, status, reviewed_by, reviewed_at, created_at FROM credit_applications ' + clause + ' ORDER BY created_at DESC LIMIT 100',
      params
    );
    res.json({ ok: true, total: result.rows.length, applications: result.rows });
  } catch (e) {
    console.error('[credit-apps] list error:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/credit-apps/:id
router.get('/:id', async (req, res) => {
  try {
    
    const result = await global.db.query('SELECT * FROM credit_applications WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ ok: false, error: 'Not found' });
    res.json({ ok: true, application: result.rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// PATCH /api/credit-apps/:id/status
router.patch('/:id/status', async (req, res) => {
  try {
    
    const { status, reviewed_by } = req.body;
    await global.db.query(
      'UPDATE credit_applications SET status = $1, reviewed_by = $2, reviewed_at = NOW() WHERE id = $3',
      [status, reviewed_by, req.params.id]
    );
    try { await global.db.query("INSERT INTO brain_events (event_type, module, payload, created_at) VALUES ($1, $2, $3, NOW())", ['CREDIT_APP_STATUS_UPDATE', 'credit-apps', JSON.stringify({id: req.params.id, status})]); } catch(e) {}
    res.json({ ok: true, message: 'Status updated.' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/credit-apps/stats/summary
router.get('/stats/summary', async (req, res) => {
  try {
    
    await bootstrap(req);
    const result = await global.db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending')  as pending,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE app_type = 'factoring')    as factoring,
        COUNT(*) FILTER (WHERE app_type = 'trade_credit') as trade_credit,
        COUNT(*) FILTER (WHERE app_type = 'net_terms')    as net_terms,
        COALESCE(SUM(credit_limit_req),0) as total_credit_requested,
        COALESCE(SUM(annual_revenue),0)   as total_annual_revenue
      FROM credit_applications
    `);
    res.json({ ok: true, stats: result.rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;

