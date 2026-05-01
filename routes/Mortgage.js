// ================================================================
// mortgage.js â€” EnjoyBaja Backend Mortgage Route Stubs
// C:\AuditDNA\auditdna-realestate\backend\routes\mortgage.js
// Handles all /api/mortgage/* endpoints called by USAMortgage.jsx
// ================================================================

'use strict';
const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// Helper â€” log to brain silently
const brainLog = (event, data) => {
  try {
    const API = process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : 'http://process.env.DB_HOST:5000';
    fetch(`${API}/api/brain/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, data }),
    }).catch(() => {});
  } catch {}
};

// â”€â”€ POST /api/mortgage/pre-approval â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/pre-approval', async (req, res) => {
  try {
    const d = req.body;
    await pool.query(
      `INSERT INTO mortgage_applications (type, name, email, phone, data, status, created_at)
       VALUES ($1,$2,$3,$4,$5,'pending',NOW())
       ON CONFLICT DO NOTHING`,
      ['pre-approval', d.firstName || d.name || '', d.email || '', d.phone || '', JSON.stringify(d)]
    ).catch(() => {});
    brainLog('MORTGAGE_PRE_APPROVAL', { email: d.email, name: d.firstName || d.name });
    res.json({ ok: true, message: 'Pre-approval application received.' });
  } catch (err) {
    console.warn('[mortgage] pre-approval:', err.message);
    res.json({ ok: true, message: 'Pre-approval application received.' });
  }
});

// â”€â”€ POST /api/mortgage/mexico-application â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/mexico-application', async (req, res) => {
  try {
    const d = req.body;
    await pool.query(
      `INSERT INTO mortgage_applications (type, name, email, phone, data, status, created_at)
       VALUES ($1,$2,$3,$4,$5,'pending',NOW())
       ON CONFLICT DO NOTHING`,
      ['mexico-application', d.firstName || d.name || '', d.email || '', d.phone || '', JSON.stringify(d)]
    ).catch(() => {});
    brainLog('MORTGAGE_MEXICO_APP', { email: d.email });
    res.json({ ok: true, message: 'Mexico loan application received.' });
  } catch (err) {
    console.warn('[mortgage] mexico-application:', err.message);
    res.json({ ok: true, message: 'Mexico loan application received.' });
  }
});

// â”€â”€ POST /api/mortgage/inquiry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/inquiry', async (req, res) => {
  try {
    brainLog('MORTGAGE_BUYER_INQUIRY', { email: req.body.email });
    res.json({ ok: true, message: 'Buyer inquiry received.' });
  } catch { res.json({ ok: true }); }
});

// â”€â”€ POST /api/mortgage/agent-register â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/agent-register', async (req, res) => {
  try {
    brainLog('MORTGAGE_AGENT_REGISTER', { email: req.body.email });
    res.json({ ok: true, message: 'Agent registration received.' });
  } catch { res.json({ ok: true }); }
});

// â”€â”€ POST /api/mortgage/fsbo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/fsbo', async (req, res) => {
  try {
    brainLog('MORTGAGE_FSBO_LISTING', { email: req.body.sellerEmail });
    res.json({ ok: true, message: 'FSBO listing received.' });
  } catch { res.json({ ok: true }); }
});

// â”€â”€ POST /api/mortgage/property-request â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/property-request', async (req, res) => {
  try {
    brainLog('MORTGAGE_PROPERTY_REQUEST', { email: req.body.email });
    res.json({ ok: true, message: 'Property request received.' });
  } catch { res.json({ ok: true }); }
});

// â”€â”€ POST /api/mortgage/contact â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/contact', async (req, res) => {
  try {
    brainLog('MORTGAGE_CONTACT', { email: req.body.email });
    res.json({ ok: true, message: 'Contact request received.' });
  } catch { res.json({ ok: true }); }
});

// â”€â”€ GET /api/mortgage/stats (Admin) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/stats', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE type='pre-approval')      AS pre_approvals,
         COUNT(*) FILTER (WHERE type='mexico-application') AS mexico_apps,
         COUNT(*) FILTER (WHERE type='inquiry')            AS inquiries,
         COUNT(*) FILTER (WHERE status='pending')          AS pending,
         COUNT(*) FILTER (WHERE status='approved')         AS approved,
         COUNT(*)                                           AS total
       FROM mortgage_applications`
    );
    res.json({ ok: true, stats: result.rows[0] });
  } catch (err) {
    console.warn('[mortgage] stats fallback:', err.message);
    res.json({ ok: true, stats: { pre_approvals: 0, mexico_apps: 0, inquiries: 0, pending: 0, approved: 0, total: 0 } });
  }
});

module.exports = router;

