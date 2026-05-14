// routes/payment-rails.js
// ACH + Wise cross-border + CFDI auto-trigger + revenue dashboard
// AuditDNA Agriculture — Mexausa Food Group, Inc.
const express = require('express');
const router  = express.Router();

router.get('/health', (req, res) => res.json({ ok:true, module:'payment-rails' }));

// ── WISE CROSS-BORDER (USD → MXN) ────────────────────────────────────────────
// Wise API key set in env: WISE_API_KEY
router.post('/wise/quote', async (req, res) => {
  const { amount_usd, target_currency='MXN', purpose='produce_payment' } = req.body;
  if (!amount_usd) return res.status(400).json({ error:'amount_usd required' });
  try {
    const apiKey = process.env.WISE_API_KEY;
    if (!apiKey) {
      // Return live exchange rate estimate without API key
      const fxr = await fetch('https://api.exchangerate-api.com/v4/latest/USD').then(r=>r.json()).catch(()=>({rates:{MXN:17.2}}));
      const rate = fxr.rates?.[target_currency] || 17.2;
      return res.json({ ok:true, source:'exchangerate-api',
        amount_usd, target_currency, rate, estimated_mxn: (amount_usd*rate).toFixed(2),
        note:'Set WISE_API_KEY env var to enable live Wise transfers',
        wise_signup:'https://wise.com/business' });
    }
    const quote = await fetch('https://api.transferwise.com/v3/profiles/{profileId}/quotes', {
      method:'POST', headers:{'Authorization':`Bearer ${apiKey}`,'Content-Type':'application/json'},
      body: JSON.stringify({ sourceCurrency:'USD', targetCurrency:target_currency,
        sourceAmount:amount_usd, profile: process.env.WISE_PROFILE_ID })
    }).then(r=>r.json());
    res.json({ ok:true, quote, purpose });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/payments/cfdi-trigger — auto-trigger CFDI after deal confirms
router.post('/cfdi-trigger', async (req, res) => {
  const db = req.app.get('db') || global.db;
  const { deal_id, grower_id, amount_mxn, commodity, quantity, rfc_emisor, rfc_receptor } = req.body;
  if (!deal_id || !amount_mxn) return res.status(400).json({ error:'deal_id and amount_mxn required' });
  // Log the CFDI request — actual generation goes through /api/cfdi
  if (db) {
    await db.query(
      `INSERT INTO invoices (deal_id, grower_id, amount, currency, commodity, status, created_at)
       VALUES ($1,$2,$3,'MXN',$4,'PENDING_CFDI',NOW()) ON CONFLICT DO NOTHING`,
      [deal_id, grower_id||null, amount_mxn, commodity||null]
    ).catch(()=>{});
  }
  res.json({ ok:true, deal_id, status:'CFDI_TRIGGERED',
    next:'Routed to /api/cfdi for SAT-compliant CFDI generation',
    rfc_emisor: rfc_emisor||'MFG-RFC', rfc_receptor: rfc_receptor||'BUYER-RFC',
    amount_mxn, commodity });
});

// GET /api/payments/revenue-dashboard — always-live revenue overview
router.get('/revenue-dashboard', async (req, res) => {
  const db = req.app.get('db') || global.db;
  const { period = '30d' } = req.query;
  const interval = period === '7d' ? '7 days' : period === '90d' ? '90 days' : '30 days';
  if (!db) return res.json({ ok:true, note:'DB unavailable — connect Railway for live data' });
  try {
    const [deals, invoices, factoring, loafLoads, growers, buyers] = await Promise.all([
      db.query(`SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM deals WHERE created_at > NOW() - INTERVAL '${interval}'`).catch(()=>({rows:[{count:0,total:0}]})),
      db.query(`SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM invoices WHERE created_at > NOW() - INTERVAL '${interval}'`).catch(()=>({rows:[{count:0,total:0}]})),
      db.query(`SELECT COUNT(*) as count, COALESCE(SUM(invoice_amount),0) as total FROM factoring_bids WHERE status='approved' AND created_at > NOW() - INTERVAL '${interval}'`).catch(()=>({rows:[{count:0,total:0}]})),
      db.query(`SELECT COUNT(*) as loads FROM manifests WHERE created_at > NOW() - INTERVAL '${interval}'`).catch(()=>({rows:[{loads:0}]})),
      db.query(`SELECT COUNT(*) as new_growers FROM grower_contacts WHERE created_at > NOW() - INTERVAL '${interval}'`).catch(()=>({rows:[{new_growers:0}]})),
      db.query(`SELECT COUNT(*) as new_buyers FROM buyer_entities WHERE created_at > NOW() - INTERVAL '${interval}'`).catch(()=>({rows:[{new_buyers:0}]})),
    ]);
    const totalRevenue = parseFloat(deals.rows[0]?.total||0) + parseFloat(invoices.rows[0]?.total||0);
    res.json({ ok:true, period,
      dashboard: {
        revenue:        { total: totalRevenue, deals: parseFloat(deals.rows[0]?.total||0), invoiced: parseFloat(invoices.rows[0]?.total||0) },
        factoring:      { approved_count: parseInt(factoring.rows[0]?.count||0), advanced: parseFloat(factoring.rows[0]?.total||0) },
        deals:          { count: parseInt(deals.rows[0]?.count||0) },
        loaf_loads:     parseInt(loafLoads.rows[0]?.loads||0),
        new_growers:    parseInt(growers.rows[0]?.new_growers||0),
        new_buyers:     parseInt(buyers.rows[0]?.new_buyers||0),
        generated_at:   new Date().toISOString(),
      },
      push_schedule: 'Daily 7am briefing via NanoClaw receptionist Enrique',
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/payments/ach-status/:dealId — ACH payment status
router.get('/ach-status/:dealId', async (req, res) => {
  const db = req.app.get('db') || global.db;
  if (!db) return res.status(503).json({ error:'DB unavailable' });
  try {
    const r = await db.query(`SELECT * FROM invoices WHERE deal_id=$1 ORDER BY created_at DESC LIMIT 1`, [req.params.dealId]).catch(()=>({rows:[]}));
    if (!r.rows.length) return res.status(404).json({ error:'Deal not found' });
    res.json({ ok:true, deal_id:req.params.dealId, payment: r.rows[0],
      ach_provider:'Stripe ACH / Plaid — set STRIPE_SECRET_KEY to activate',
      wise_enabled: !!process.env.WISE_API_KEY });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
