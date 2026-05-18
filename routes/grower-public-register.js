// ============================================================================
// GROWER PUBLIC REGISTRATION ROUTE
// Save to: C:\AuditDNA\backend\routes\grower-public-register.js
// Mount in server.js: app.use('/api/growers', require('./routes/grower-public-register'));
// ============================================================================
const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const bcrypt  = require('bcryptjs');

// â”€â”€ POST /api/growers/register-public â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Called from the login card Register form (no auth required)
// POST /api/growers/register-public — public grower registration
router.post('/register-public', async (req, res) => {
  const {
    companyLegal, company_name, contactName, contactEmail, email,
    contactPhone, phone, entityType, state, state_province, city,
    country, region, commodities, notes, ein, pacaNum
  } = req.body || {};

  const company = (companyLegal || company_name || '').trim();
  const contact = (contactName || '').trim();
  const mail = (contactEmail || email || '').trim();
  const tel = (contactPhone || phone || '').trim();
  const cntry = (region || country || 'Mexico').trim();
  const st = (state || state_province || '').trim();

  if (!company) return res.status(400).json({ error: 'Company name required' });
  if (!mail) return res.status(400).json({ error: 'Contact email required' });

  try {
    const result = await pool.query(
      `INSERT INTO growers
        (company_name, contact_name, email, phone, country, state_province, city, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending_review')
       RETURNING id, company_name, contact_name, email, country, status`,
      [company, contact, mail, tel, cntry, st, city || '']
    );
    const grower = result.rows[0];
    console.log('[GROWER REGISTER] New grower:', grower.company_name, grower.id);
    res.status(201).json({
      success: true,
      grower,
      message: 'Registration received. Mexausa team will review within 24 hours.'
    });
  } catch (err) {
    console.error('[GROWER REGISTER ERROR]', err.message, err.code);
    res.status(500).json({ error: err.message, code: err.code });
  }
});

module.exports = router;

