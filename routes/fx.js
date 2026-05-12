const express = require('express');
const router = express.Router();
const pool = require('../db');

// MXN/USD rate — fetched from open exchange API or cached
let cachedRate = { usd_to_mxn: 17.15, mxn_to_usd: 0.0583, updated: null };

async function refreshRate() {
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD').then(r=>r.json());
    if (r.rates && r.rates.MXN) {
      cachedRate = {
        usd_to_mxn: r.rates.MXN,
        mxn_to_usd: 1 / r.rates.MXN,
        updated: new Date().toISOString(),
        source: 'open.er-api.com'
      };
    }
  } catch(_) {}
}
refreshRate();
setInterval(refreshRate, 3600000); // refresh every hour

// GET /api/fx/rate
router.get('/rate', (req, res) => {
  res.json({ ok:true, ...cachedRate });
});

// POST /api/fx/convert
router.post('/convert', (req, res) => {
  const { amount, from='USD', to='MXN' } = req.body;
  if (!amount) return res.status(400).json({ error: 'amount required' });
  const val = parseFloat(amount);
  let result;
  if (from.toUpperCase()==='USD' && to.toUpperCase()==='MXN') {
    result = val * cachedRate.usd_to_mxn;
  } else if (from.toUpperCase()==='MXN' && to.toUpperCase()==='USD') {
    result = val * cachedRate.mxn_to_usd;
  } else {
    return res.status(400).json({ error: 'Only USD/MXN supported' });
  }
  res.json({
    ok: true,
    input: { amount: val, currency: from.toUpperCase() },
    output: { amount: parseFloat(result.toFixed(2)), currency: to.toUpperCase() },
    rate: cachedRate.usd_to_mxn,
    updated: cachedRate.updated
  });
});

// POST /api/fx/deal-convert — convert a full deal value
router.post('/deal-convert', async (req, res) => {
  const { deal_ref, target_currency='MXN' } = req.body;
  try {
    const r = await pool.query(
      'SELECT deal_ref,commodity,total_value,commission_amt,price_agreed,grower_country FROM deals WHERE deal_ref=$1',
      [deal_ref]
    ).catch(()=>({rows:[]}));
    const deal = r.rows[0];
    if (!deal) return res.status(404).json({ error: 'Deal not found' });

    const rate = cachedRate.usd_to_mxn;
    const tv = parseFloat(deal.total_value||0);
    const ca = parseFloat(deal.commission_amt||0);

    res.json({
      ok: true,
      deal_ref,
      commodity: deal.commodity,
      usd: { total_value: tv, commission: ca, currency:'USD' },
      mxn: { total_value: parseFloat((tv*rate).toFixed(2)),
              commission: parseFloat((ca*rate).toFixed(2)), currency:'MXN' },
      rate_used: rate,
      updated: cachedRate.updated
    });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

module.exports = router;
