'use strict';
const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const nodemailer = require('nodemailer');

const SMTP = { host:'smtpout.secureserver.net', port:465, secure:true, auth:{ user:'saul@mexausafg.com', pass:'PurpleRain321' }};
const mailer = nodemailer.createTransport(SMTP);

const bootstrap = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lender_panel (
      id SERIAL PRIMARY KEY,
      code VARCHAR(20) UNIQUE NOT NULL,
      name_internal TEXT NOT NULL,
      email VARCHAR(255) NOT NULL,
      email_cc VARCHAR(255),
      specialties TEXT,
      min_amount NUMERIC DEFAULT 10000,
      max_amount NUMERIC DEFAULT 5000000,
      advance_rate_typical NUMERIC DEFAULT 85,
      fee_rate_typical NUMERIC DEFAULT 3.5,
      response_hours INTEGER DEFAULT 24,
      status VARCHAR(20) DEFAULT 'active',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS factoring_bids (
      id SERIAL PRIMARY KEY,
      deal_id VARCHAR(50) NOT NULL,
      commodity TEXT,
      amount NUMERIC NOT NULL,
      buyer_tier VARCHAR(10),
      paca_compliant BOOLEAN DEFAULT true,
      payment_terms TEXT,
      deal_structure TEXT,
      status VARCHAR(20) DEFAULT 'shopping',
      sent_to INTEGER,
      sent_at TIMESTAMPTZ,
      responses JSONB DEFAULT '[]',
      winning_lender_code VARCHAR(20),
      winning_rate NUMERIC,
      winning_advance NUMERIC,
      closed_at TIMESTAMPTZ,
      notes TEXT,
      created_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS lender_responses (
      id SERIAL PRIMARY KEY,
      bid_id INTEGER REFERENCES factoring_bids(id),
      lender_code VARCHAR(20),
      advance_rate NUMERIC,
      fee_rate NUMERIC,
      advance_amount NUMERIC,
      net_amount NUMERIC,
      conditions TEXT,
      response_at TIMESTAMPTZ DEFAULT NOW()
    );
  `).catch(e => console.warn('[lender-panel] bootstrap:', e.message));
};
bootstrap();

// GET /api/lender-panel/lenders
router.get('/lenders', async (req, res) => {
  try {
    const r = await pool.query('SELECT id, code, email, specialties, min_amount, max_amount, advance_rate_typical, fee_rate_typical, response_hours, status, notes FROM lender_panel ORDER BY code');
    res.json({ ok:true, lenders: r.rows });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

// POST /api/lender-panel/lenders
router.post('/lenders', async (req, res) => {
  try {
    const { code, name_internal, email, email_cc, specialties, min_amount, max_amount, advance_rate_typical, fee_rate_typical, response_hours, notes } = req.body;
    const r = await pool.query(
      `INSERT INTO lender_panel (code, name_internal, email, email_cc, specialties, min_amount, max_amount, advance_rate_typical, fee_rate_typical, response_hours, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id, code`,
      [code, name_internal, email, email_cc, specialties, min_amount||10000, max_amount||5000000, advance_rate_typical||85, fee_rate_typical||3.5, response_hours||24, notes]
    );
    try { pool.query("INSERT INTO brain_events (event_type, module, payload, created_at) VALUES ($1,$2,$3,NOW())", ['LENDER_ADDED','lender-panel',JSON.stringify({code,email})]).catch(()=>{}); } catch(e) {}
    res.json({ ok:true, id:r.rows[0].id, code:r.rows[0].code });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

// PATCH /api/lender-panel/lenders/:id
router.patch('/lenders/:id', async (req, res) => {
  try {
    const { status, notes, advance_rate_typical, fee_rate_typical } = req.body;
    await pool.query('UPDATE lender_panel SET status=$1, notes=$2, advance_rate_typical=$3, fee_rate_typical=$4 WHERE id=$5',
      [status, notes, advance_rate_typical, fee_rate_typical, req.params.id]);
    res.json({ ok:true });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

// GET /api/lender-panel/deals
router.get('/deals', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM factoring_bids ORDER BY created_at DESC LIMIT 50');
    res.json({ ok:true, deals: r.rows });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

// POST /api/lender-panel/shop — create deal + blast blind emails
router.post('/shop', async (req, res) => {
  try {
    const { amount, commodity, buyer_tier, payment_terms, deal_structure, notes, created_by } = req.body;
    if (!amount || !commodity) return res.status(400).json({ ok:false, error:'Amount and commodity required' });

    const dealId = 'DEAL-' + Date.now();
    const deal = await pool.query(
      `INSERT INTO factoring_bids (deal_id, commodity, amount, buyer_tier, payment_terms, deal_structure, notes, created_by, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'shopping') RETURNING id`,
      [dealId, commodity, amount, buyer_tier||'A', payment_terms||'Net 30', deal_structure||'Invoice factoring', notes, created_by||'owner']
    );
    const bidId = deal.rows[0].id;

    // Get active lenders
    const lenders = await pool.query("SELECT * FROM lender_panel WHERE status = 'active'");
    if (!lenders.rows.length) return res.json({ ok:true, deal_id:dealId, sent:0, message:'No active lenders — add lenders first' });

    const advance = (parseFloat(amount) * 0.87).toFixed(2);
    const fee = (parseFloat(amount) * 0.03).toFixed(2);

    // Send blind email to each lender
    let sent = 0;
    for (const lender of lenders.rows) {
      try {
        const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8f9fa;padding:20px;border-radius:8px;">
<div style="background:#0f172a;color:#cba658;padding:16px 20px;border-radius:8px 8px 0 0;font-size:14px;font-weight:bold;letter-spacing:2px;">
  FACTORING OPPORTUNITY — BLIND SUBMISSION
</div>
<div style="background:#fff;padding:20px;border-radius:0 0 8px 8px;">
  <p style="color:#475569;font-size:13px;margin-bottom:16px;">
    Mexausa Food Group, Inc. (PACA #20241168) is soliciting competitive factoring terms for the following receivable.
    <strong>Parties are not disclosed at this stage. NDA required before disclosure.</strong>
  </p>
  <table style="width:100%;border-collapse:collapse;font-size:13px;">
    <tr style="background:#f1f5f9;"><td style="padding:10px;color:#64748b;font-weight:bold;">Deal Reference</td><td style="padding:10px;font-family:monospace;">${dealId}</td></tr>
    <tr><td style="padding:10px;color:#64748b;font-weight:bold;">Commodity Category</td><td style="padding:10px;">${commodity}</td></tr>
    <tr style="background:#f1f5f9;"><td style="padding:10px;color:#64748b;font-weight:bold;">Invoice Amount</td><td style="padding:10px;font-weight:bold;color:#0f172a;">$${parseFloat(amount).toLocaleString()}</td></tr>
    <tr><td style="padding:10px;color:#64748b;font-weight:bold;">Buyer Credit Tier</td><td style="padding:10px;">${buyer_tier||'A'} — PACA Eligible Buyer</td></tr>
    <tr style="background:#f1f5f9;"><td style="padding:10px;color:#64748b;font-weight:bold;">Payment Terms</td><td style="padding:10px;">${payment_terms||'Net 30'}</td></tr>
    <tr><td style="padding:10px;color:#64748b;font-weight:bold;">PACA Compliant</td><td style="padding:10px;">YES — PACA #20241168</td></tr>
    <tr style="background:#f1f5f9;"><td style="padding:10px;color:#64748b;font-weight:bold;">Deal Structure</td><td style="padding:10px;">${deal_structure||'Invoice factoring'}</td></tr>
    <tr><td style="padding:10px;color:#64748b;font-weight:bold;">Estimated Advance (87%)</td><td style="padding:10px;color:#16a34a;font-weight:bold;">$${parseFloat(advance).toLocaleString()}</td></tr>
    <tr style="background:#f1f5f9;"><td style="padding:10px;color:#64748b;font-weight:bold;">Estimated Fee (3%)</td><td style="padding:10px;">$${parseFloat(fee).toLocaleString()}</td></tr>
  </table>
  <div style="background:#fef9c3;border-left:4px solid #ca8a04;padding:12px 16px;margin:16px 0;font-size:12px;color:#713f12;">
    <strong>CONFIDENTIALITY NOTICE:</strong> Buyer and seller identities are not disclosed. An NDA and commission agreement must be executed before party disclosure.
    LOI → NDA → Term Sheet → Party Disclosure sequence applies.
  </div>
  <p style="font-size:13px;color:#475569;">
    Please reply with your: <strong>Advance Rate (%), Fee Rate (%), Conditions, and Timeline.</strong><br>
    Reference: <strong>${dealId}</strong> in your reply subject line.
  </p>
  <div style="margin-top:16px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;">
    Mexausa Food Group, Inc. · PACA License #20241168 · EIN 93-2597001<br>
    saul@mexausafg.com · +1-831-251-3116 · mexausafg.com
  </div>
</div></div>`;

        await mailer.sendMail({
          from: '"Mexausa Food Group, Inc." <saul@mexausafg.com>',
          to: lender.email,
          cc: lender.email_cc||'',
          subject: `Factoring Opportunity — ${dealId} — $${parseFloat(amount).toLocaleString()} — ${commodity}`,
          html
        });

        await pool.query('UPDATE factoring_bids SET sent_to=sent_to+1, sent_at=NOW() WHERE id=$1', [bidId]).catch(()=>{});
        sent++;
      } catch(e) {
        console.warn('[lender-panel] email failed to', lender.code, ':', e.message);
      }
    }

    try { pool.query("INSERT INTO brain_events (event_type, module, payload, created_at) VALUES ($1,$2,$3,NOW())", ['DEAL_SHOPPED','lender-panel',JSON.stringify({deal_id:dealId,amount,commodity,sent})]).catch(()=>{}); } catch(e) {}
    res.json({ ok:true, deal_id:dealId, bid_id:bidId, sent, lenders_count:lenders.rows.length, message:`Deal ${dealId} sent to ${sent} lenders` });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

// POST /api/lender-panel/respond — log lender response
router.post('/respond', async (req, res) => {
  try {
    const { bid_id, lender_code, advance_rate, fee_rate, conditions } = req.body;
    const amount_r = await pool.query('SELECT amount FROM factoring_bids WHERE id=$1', [bid_id]);
    const amount = parseFloat(amount_r.rows[0]?.amount||0);
    const advance_amount = (amount * (parseFloat(advance_rate)||0) / 100).toFixed(2);
    const fee_amount = (amount * (parseFloat(fee_rate)||0) / 100).toFixed(2);
    const net_amount = (amount - parseFloat(fee_amount)).toFixed(2);

    await pool.query(
      'INSERT INTO lender_responses (bid_id, lender_code, advance_rate, fee_rate, advance_amount, net_amount, conditions) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [bid_id, lender_code, advance_rate, fee_rate, advance_amount, net_amount, conditions]
    );

    // Update responses JSON on the bid
    const existing = await pool.query('SELECT responses FROM factoring_bids WHERE id=$1', [bid_id]);
    const responses = existing.rows[0]?.responses || [];
    responses.push({ lender_code, advance_rate, fee_rate, advance_amount, net_amount, conditions, received_at: new Date() });
    await pool.query('UPDATE factoring_bids SET responses=$1 WHERE id=$2', [JSON.stringify(responses), bid_id]);

    res.json({ ok:true, advance_amount, net_amount });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

// POST /api/lender-panel/select-winner
router.post('/select-winner', async (req, res) => {
  try {
    const { bid_id, lender_code, rate, advance } = req.body;
    await pool.query(
      'UPDATE factoring_bids SET winning_lender_code=$1, winning_rate=$2, winning_advance=$3, status=$4, closed_at=NOW() WHERE id=$5',
      [lender_code, rate, advance, 'won', bid_id]
    );
    try { pool.query("INSERT INTO brain_events (event_type, module, payload, created_at) VALUES ($1,$2,$3,NOW())", ['LENDER_SELECTED','lender-panel',JSON.stringify({bid_id,lender_code,rate})]).catch(()=>{}); } catch(e) {}
    res.json({ ok:true, message:'Winner selected. Proceed to LOI → NDA → disclosure.' });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

// GET /api/lender-panel/stats
router.get('/stats', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM lender_panel WHERE status='active') as active_lenders,
        (SELECT COUNT(*) FROM factoring_bids) as total_deals,
        (SELECT COUNT(*) FROM factoring_bids WHERE status='shopping') as open_deals,
        (SELECT COUNT(*) FROM factoring_bids WHERE status='won') as closed_deals,
        (SELECT COALESCE(SUM(amount),0) FROM factoring_bids WHERE status='won') as total_funded
    `);
    res.json({ ok:true, stats: r.rows[0] });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

module.exports = router;
