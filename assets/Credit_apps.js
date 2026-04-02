// ============================================================================
// Credit Applications Route
// File: C:\AuditDNA\backend\routes\credit-apps.js
// ============================================================================
'use strict';
const express  = require('express');
const router   = express.Router();
const path     = require('path');
const fs       = require('fs');
const nodemailer = require('nodemailer');

const getPool = () => {
  const { Pool } = require('pg');
  return new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:auditdna2026@localhost:5432/auditdna' });
};

const mailer = nodemailer.createTransport({
  host: 'smtp.gmail.com', port: 465, secure: true,
  auth: { user: 'sgarcia1911@gmail.com', pass: 'izvbtgxxogchstym' }
});

// ── INIT TABLE ───────────────────────────────────────────────────────────────
const initTable = async () => {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS credit_applications (
      id SERIAL PRIMARY KEY,
      legal_name VARCHAR(255),
      role_type VARCHAR(100),
      biz_data JSONB,
      officers JSONB,
      trade_refs JSONB,
      bank_refs JSONB,
      signature JSONB,
      status VARCHAR(50) DEFAULT 'PENDING',
      tier VARCHAR(10),
      credit_limit NUMERIC(12,2),
      is_priority BOOLEAN DEFAULT false,
      submitted_at TIMESTAMP DEFAULT NOW(),
      reviewed_at TIMESTAMP,
      reviewed_by VARCHAR(100),
      notes TEXT
    )
  `).catch(()=>{});
  await pool.end();
  console.log('[CREDIT-APPS] Table ready');
};
initTable();

// ── POST /api/credit-apps — submit new application ───────────────────────────
router.post('/', async (req, res) => {
  const { biz, officers, tradeRefs, bankRefs, sig, isPriority, submittedAt } = req.body;
  if (!biz?.legalName) return res.status(400).json({ error: 'Legal name required' });

  const pool = getPool();
  try {
    const result = await pool.query(`
      INSERT INTO credit_applications (legal_name, role_type, biz_data, officers, trade_refs, bank_refs, signature, is_priority, status, submitted_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id
    `, [biz.legalName, biz.roleType, JSON.stringify(biz), JSON.stringify(officers),
        JSON.stringify(tradeRefs), JSON.stringify(bankRefs), JSON.stringify(sig),
        isPriority||false, isPriority?'PRIORITY':'PENDING', submittedAt||new Date().toISOString()]);

    const appId = result.rows[0].id;

    // Notify Saul + Jose
    const priorityTag = isPriority ? '[PRIORITY ACCOUNT]' : '[NEW APPLICATION]';
    await mailer.sendMail({
      from: '"CM Products Credit" <sgarcia1911@gmail.com>',
      to: 'saul@mexausafg.com, solreal1110@gmail.com',
      replyTo: 'saul@mexausafg.com',
      subject: `${priorityTag} Credit App #${appId} — ${biz.legalName} (${biz.roleType})`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#0f172a;padding:24px;text-align:center">
            <h2 style="color:#cba658;margin:0">CM PRODUCTS GROUP LLC</h2>
            <p style="color:#94a3b0;margin:6px 0 0;font-size:12px">New Credit Application Received</p>
          </div>
          <div style="padding:24px;background:#fff;color:#334155">
            ${isPriority?'<div style="background:#dcfce7;border:1px solid #86efac;border-radius:8px;padding:12px;margin-bottom:16px;color:#166534;font-weight:700">PRIORITY ACCOUNT — Buyer/Wholesaler with Purchase Orders. Call directly.</div>':''}
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              ${[['App ID','#'+appId],['Company',biz.legalName],['Role',biz.roleType],['Phone',biz.phone||'—'],['Fed Tax ID',biz.fedTaxId||'—'],
                 ['PACA #',biz.pacanumber||'—'],['Blue Book',biz.bluebook||'—'],['Red Book',biz.redbook||'—'],
                 ['Credit Req','$'+(biz.creditRequested||'—')],['Terms Req',biz.terms||'Net 30'],
                 ['POs Used',biz.usePOs||'—'],['City/State',(biz.city||'')+(biz.state?', '+biz.state:'')],
                 ['Purchasing',biz.purchasingName+' | '+biz.purchasingEmail],
                 ['AP Contact',biz.apName+' | '+biz.apEmail]
                ].map(([k,v])=>`<tr><td style="padding:6px 0;border-bottom:1px solid #e2e8f0;color:#64748b;width:40%">${k}</td><td style="padding:6px 0;border-bottom:1px solid #e2e8f0;font-weight:600">${v}</td></tr>`).join('')}
            </table>
            <p style="margin-top:16px;font-size:12px;color:#64748b">Review in AuditDNA: CM Products Intelligence → Credit Application → Admin Review</p>
          </div>
        </div>`
    }).catch(e => console.error('[CREDIT-APPS] Email error:', e.message));

    // Confirm to applicant
    if (biz.purchasingEmail || biz.apEmail) {
      const toEmail = biz.purchasingEmail || biz.apEmail;
      await mailer.sendMail({
        from: '"CM Products Group LLC" <sgarcia1911@gmail.com>',
        to: toEmail,
        replyTo: 'solreal1110@gmail.com',
        subject: `Credit Application Received — ${biz.legalName} | CM Products Group LLC`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <div style="background:#0f172a;padding:24px;text-align:center">
              <h2 style="color:#cba658;margin:0">CM PRODUCTS GROUP LLC</h2>
            </div>
            <div style="padding:24px;background:#fff;color:#334155">
              <p>Dear ${biz.legalName},</p>
              <p>We have received your credit application (Reference #${appId}). ${isPriority
                ? 'As a priority buyer account, Saul Garcia will contact you directly within 24 hours to complete your onboarding.'
                : 'Our team will review your application within 2-3 business days. You will receive your login credentials and PIN upon approval.'}</p>
              <p><strong>Important Notice — Factoring:</strong> CM Products Group LLC may factor its accounts receivable. If applicable, you will be notified in writing to remit payments to our designated finance company.</p>
              <p>Questions? Contact us at <strong>solreal1110@gmail.com</strong> or <strong>(928) 246-3858</strong></p>
            </div>
          </div>`
      }).catch(()=>{});
    }

    res.json({ success: true, id: appId, isPriority });
  } catch(e) {
    console.error('[CREDIT-APPS] Submit error:', e.message);
    res.status(500).json({ error: e.message });
  } finally { await pool.end(); }
});

// ── GET /api/credit-apps — list all (owner only) ─────────────────────────────
router.get('/', async (req, res) => {
  const pool = getPool();
  try {
    const r = await pool.query(`SELECT id, legal_name, role_type, biz_data as biz, is_priority, status, tier, credit_limit, submitted_at FROM credit_applications ORDER BY is_priority DESC, submitted_at DESC`);
    res.json({ apps: r.rows.map(row => ({
      id: row.id, biz: row.biz, isPriority: row.is_priority,
      status: row.status, tier: row.tier, creditLimit: row.credit_limit,
      submittedAt: row.submitted_at
    }))});
  } catch(e) { res.status(500).json({ error: e.message }); }
  finally { await pool.end(); }
});

// ── PATCH /api/credit-apps/:id — update status ───────────────────────────────
router.patch('/:id', async (req, res) => {
  const { status, tier, creditLimit } = req.body;
  const pool = getPool();
  try {
    await pool.query(`UPDATE credit_applications SET status=$1, tier=$2, credit_limit=$3, reviewed_at=NOW() WHERE id=$4`,
      [status, tier||null, creditLimit||null, req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
  finally { await pool.end(); }
});

// ── GET /api/credit-apps/download/:file — serve PDFs ─────────────────────────
router.get('/download/:file', (req, res) => {
  const allowed = ['CM_Credit_Application.pdf','CM_Tax_Exemption.pdf','CM_Auth_Release.pdf','W9_CM_Products.pdf'];
  if (!allowed.includes(req.params.file)) return res.status(404).json({ error: 'File not found' });
  const filePath = path.join(__dirname, '../assets/credit-docs', req.params.file);
  if (fs.existsSync(filePath)) return res.sendFile(filePath);
  res.status(404).json({ error: 'PDF not found on server', instructions: `Place ${req.params.file} in C:\\AuditDNA\\backend\\assets\\credit-docs\\` });
});

module.exports = router;