// =============================================================================
// FINANCIAL ROUTER â€” Self-contained (factoring, payment terms, credit risk,
// working capital, currency, reports)
// Save to: C:\AuditDNA\backend\routes\financial.js
// =============================================================================

const express = require('express');
const router  = express.Router();

// â”€â”€ Health â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/health', (req, res) => {
  res.json({
    success: true, message: 'Financial API running',
    modules: ['factoring','payment-terms','credit-risk','working-capital','currency','reports']
  });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// FACTORING
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const FACTORING_TIERS = [
  { name: 'Standard',  minAmount: 0,      maxAmount: 49999,  advanceRate: 0.80, feeRate: 0.030 },
  { name: 'Silver',    minAmount: 50000,   maxAmount: 99999,  advanceRate: 0.82, feeRate: 0.025 },
  { name: 'Gold',      minAmount: 100000,  maxAmount: 249999, advanceRate: 0.85, feeRate: 0.020 },
  { name: 'Platinum',  minAmount: 250000,  maxAmount: 499999, advanceRate: 0.88, feeRate: 0.015 },
  { name: 'Elite',     minAmount: 500000,  maxAmount: Infinity, advanceRate: 0.90, feeRate: 0.012 },
];

function getFactoringTier(amount) {
  return FACTORING_TIERS.find(t => amount >= t.minAmount && amount <= t.maxAmount) || FACTORING_TIERS[0];
}

router.get('/factoring/tiers', (req, res) => res.json({ success: true, tiers: FACTORING_TIERS }));

router.post('/factoring/calculate', (req, res) => {
  const { invoiceAmount, customAdvanceRate, customFeeRate, paymentTermsDays = 30 } = req.body;
  if (!invoiceAmount) return res.status(400).json({ success: false, error: 'invoiceAmount required' });
  const amount   = parseFloat(invoiceAmount);
  const tier     = getFactoringTier(amount);
  const advance  = customAdvanceRate ? parseFloat(customAdvanceRate) / 100 : tier.advanceRate;
  const fee      = customFeeRate     ? parseFloat(customFeeRate)     / 100 : tier.feeRate;
  const advAmt   = amount * advance;
  const feeAmt   = amount * fee;
  const reserve  = amount - advAmt;
  const netProc  = advAmt - feeAmt;
  const annRate  = (fee / paymentTermsDays) * 365 * 100;
  res.json({ success: true, result: {
    invoiceAmount: amount, tier: tier.name,
    advanceRate: advance, advanceAmount: advAmt,
    feeRate: fee, feeAmount: feeAmt,
    reserveAmount: reserve, netProceeds: netProc,
    annualizedRate: parseFloat(annRate.toFixed(2)),
    paymentTermsDays,
  }});
});

router.post('/factoring/batch', (req, res) => {
  const { invoices = [] } = req.body;
  const results = invoices.map(inv => {
    const amount  = parseFloat(inv.amount || 0);
    const tier    = getFactoringTier(amount);
    const advAmt  = amount * tier.advanceRate;
    const feeAmt  = amount * tier.feeRate;
    return { ...inv, tier: tier.name, advanceAmount: advAmt, feeAmount: feeAmt, netProceeds: advAmt - feeAmt };
  });
  const totals = results.reduce((s, r) => ({
    totalInvoices:    s.totalInvoices  + (parseFloat(r.amount) || 0),
    totalAdvances:    s.totalAdvances  + r.advanceAmount,
    totalFees:        s.totalFees      + r.feeAmount,
    totalNetProceeds: s.totalNetProceeds + r.netProceeds,
  }), { totalInvoices: 0, totalAdvances: 0, totalFees: 0, totalNetProceeds: 0 });
  res.json({ success: true, results, totals });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PAYMENT TERMS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const STANDARD_TERMS = [
  { code: 'NET10',   days: 10,  discount: 0,    description: 'Net 10 days' },
  { code: 'NET15',   days: 15,  discount: 0,    description: 'Net 15 days' },
  { code: 'NET30',   days: 30,  discount: 0,    description: 'Net 30 days' },
  { code: 'NET45',   days: 45,  discount: 0,    description: 'Net 45 days' },
  { code: 'NET60',   days: 60,  discount: 0,    description: 'Net 60 days' },
  { code: '2NET10',  days: 30,  discount: 0.02, description: '2/10 Net 30 â€” 2% if paid in 10 days' },
  { code: '1NET15',  days: 45,  discount: 0.01, description: '1/15 Net 45 â€” 1% if paid in 15 days' },
  { code: 'CIA',     days: 0,   discount: 0,    description: 'Cash in advance' },
  { code: 'COD',     days: 0,   discount: 0,    description: 'Cash on delivery' },
];

router.get('/payment-terms/standard', (req, res) => res.json({ success: true, terms: STANDARD_TERMS }));

router.post('/payment-terms/discount-analysis', (req, res) => {
  const { invoiceAmount, discountRate, discountDays, netDays, costOfCapital = 0.10 } = req.body;
  const amount  = parseFloat(invoiceAmount);
  const disc    = parseFloat(discountRate) / 100;
  const discAmt = amount * disc;
  const savings = amount - discAmt;
  const days    = netDays - discountDays;
  const annRate = (disc / days) * 365 * 100;
  const worthIt = annRate > costOfCapital * 100;
  res.json({ success: true, result: {
    invoiceAmount: amount, discountAmount: discAmt,
    amountIfDiscounted: savings, annualizedRate: parseFloat(annRate.toFixed(2)),
    recommendation: worthIt ? 'TAKE the discount' : 'DO NOT take discount',
  }});
});

router.post('/payment-terms/compare', (req, res) => {
  const { invoiceAmount, terms = [] } = req.body;
  const amount  = parseFloat(invoiceAmount);
  const results = terms.map(t => {
    const disc    = (parseFloat(t.discountRate) || 0) / 100;
    const discAmt = disc > 0 ? amount * disc : 0;
    return { ...t, discountAmount: discAmt, effectiveAmount: amount - discAmt };
  });
  res.json({ success: true, comparison: results });
});

router.post('/payment-terms/aging', (req, res) => {
  const { invoices = [] } = req.body;
  const now = Date.now();
  const buckets = { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, over90: 0 };
  invoices.forEach(inv => {
    const age = Math.floor((now - new Date(inv.dueDate)) / 86400000);
    const amt = parseFloat(inv.amount) || 0;
    if (age <= 0) buckets.current += amt;
    else if (age <= 30) buckets['1-30'] += amt;
    else if (age <= 60) buckets['31-60'] += amt;
    else if (age <= 90) buckets['61-90'] += amt;
    else buckets.over90 += amt;
  });
  res.json({ success: true, aging: buckets, total: Object.values(buckets).reduce((a, b) => a + b, 0) });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// CREDIT RISK
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.get('/credit-risk/tiers', (req, res) => res.json({ success: true, tiers: [
  { name: 'AAA', minScore: 90, maxScore: 100, riskLevel: 'Minimal',  creditLimit: 500000, terms: 'NET60' },
  { name: 'AA',  minScore: 80, maxScore: 89,  riskLevel: 'Low',      creditLimit: 250000, terms: 'NET45' },
  { name: 'A',   minScore: 70, maxScore: 79,  riskLevel: 'Moderate', creditLimit: 100000, terms: 'NET30' },
  { name: 'BBB', minScore: 60, maxScore: 69,  riskLevel: 'Elevated', creditLimit: 50000,  terms: 'NET15' },
  { name: 'BB',  minScore: 50, maxScore: 59,  riskLevel: 'High',     creditLimit: 25000,  terms: 'NET10' },
  { name: 'B',   minScore: 0,  maxScore: 49,  riskLevel: 'Critical', creditLimit: 0,      terms: 'CIA'   },
]}));

router.post('/credit-risk/score', (req, res) => {
  const { paymentHistory = 0, yearsInBusiness = 0, revenue = 0, outstandingDebt = 0, industryRisk = 'medium' } = req.body;
  const industryScores = { low: 20, medium: 15, high: 10 };
  const score = Math.min(100, Math.round(
    (Math.min(paymentHistory, 35)) +
    (Math.min(yearsInBusiness * 2, 20)) +
    (revenue > 1000000 ? 15 : revenue > 500000 ? 10 : revenue > 100000 ? 5 : 0) +
    (outstandingDebt === 0 ? 10 : outstandingDebt < revenue * 0.3 ? 5 : 0) +
    (industryScores[industryRisk] || 15)
  ));
  const tier = ['AAA','AA','A','BBB','BB','B'].find((t, i) => score >= [90,80,70,60,50,0][i]) || 'B';
  res.json({ success: true, score, tier, riskLevel: score >= 80 ? 'Low' : score >= 60 ? 'Moderate' : 'High' });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// WORKING CAPITAL
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.post('/working-capital/calculate', (req, res) => {
  const { currentAssets = 0, currentLiabilities = 0, inventory = 0, receivables = 0 } = req.body;
  const wc    = currentAssets - currentLiabilities;
  const ratio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;
  const quick = currentLiabilities > 0 ? (currentAssets - inventory) / currentLiabilities : 0;
  res.json({ success: true, result: {
    workingCapital: wc, currentRatio: parseFloat(ratio.toFixed(2)),
    quickRatio: parseFloat(quick.toFixed(2)),
    status: ratio >= 2 ? 'Strong' : ratio >= 1.5 ? 'Adequate' : ratio >= 1 ? 'Tight' : 'Critical',
  }});
});

router.post('/working-capital/dso', (req, res) => {
  const { accountsReceivable = 0, annualRevenue = 0 } = req.body;
  const dailyRev = annualRevenue / 365;
  const dso = dailyRev > 0 ? accountsReceivable / dailyRev : 0;
  res.json({ success: true, dso: parseFloat(dso.toFixed(1)), status: dso <= 30 ? 'Excellent' : dso <= 45 ? 'Good' : dso <= 60 ? 'Fair' : 'Poor' });
});

router.post('/working-capital/cash-conversion-cycle', (req, res) => {
  const { dso = 0, dpo = 0, dio = 0 } = req.body;
  res.json({ success: true, ccc: dso + dio - dpo, dso, dpo, dio });
});

router.post('/working-capital/cash-flow-projection', (req, res) => {
  const { startingCash = 0, monthlyRevenue = 0, monthlyExpenses = 0, months = 12 } = req.body;
  const projection = [];
  let cash = parseFloat(startingCash);
  for (let i = 1; i <= months; i++) {
    cash += parseFloat(monthlyRevenue) - parseFloat(monthlyExpenses);
    projection.push({ month: i, cashBalance: parseFloat(cash.toFixed(2)), netFlow: parseFloat(monthlyRevenue) - parseFloat(monthlyExpenses) });
  }
  res.json({ success: true, projection, finalCash: projection[projection.length - 1]?.cashBalance });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// CURRENCY
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const RATES = { USD: 1, MXN: 17.15, EUR: 0.92, CAD: 1.36, GBP: 0.79, BRL: 5.05, COP: 3900, PEN: 3.78, CLP: 950, ARS: 870 };

router.get('/currency/rates',     (req, res) => res.json({ success: true, base: 'USD', rates: RATES, note: 'Static reference rates â€” not live' }));
router.get('/currency/supported', (req, res) => res.json({ success: true, currencies: Object.keys(RATES) }));

router.post('/currency/convert', (req, res) => {
  const { amount, from = 'USD', to = 'MXN' } = req.body;
  const usd    = parseFloat(amount) / (RATES[from] || 1);
  const result = usd * (RATES[to] || 1);
  res.json({ success: true, from, to, amount: parseFloat(amount), result: parseFloat(result.toFixed(4)), rate: RATES[to] / RATES[from] });
});

router.post('/currency/batch-convert', (req, res) => {
  const { amounts = [], from = 'USD', to = 'MXN' } = req.body;
  const rate    = (RATES[to] || 1) / (RATES[from] || 1);
  const results = amounts.map(a => ({ amount: a, converted: parseFloat((a * rate).toFixed(4)) }));
  res.json({ success: true, from, to, rate, results });
});

router.get('/currency/historical', (req, res) => {
  res.json({ success: true, note: 'Historical rates require external API integration', pairs: ['USD/MXN','USD/EUR','USD/CAD'] });
});

router.post('/currency/risk-exposure', (req, res) => {
  const { exposures = [] } = req.body;
  const total = exposures.reduce((s, e) => s + (parseFloat(e.amount) || 0) / (RATES[e.currency] || 1), 0);
  res.json({ success: true, totalUSD: parseFloat(total.toFixed(2)), exposureCount: exposures.length });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// REPORTS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.post('/reports/summary', (req, res) => {
  const { revenue = 0, expenses = 0, receivables = 0, payables = 0, inventory = 0 } = req.body;
  const grossProfit = revenue - expenses;
  const margin      = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  res.json({ success: true, summary: {
    revenue, expenses, grossProfit, margin: parseFloat(margin.toFixed(2)),
    receivables, payables, inventory,
    netPosition: receivables - payables,
    timestamp: new Date().toISOString(),
  }});
});

router.post('/reports/ar-aging', (req, res) => {
  const { invoices = [] } = req.body;
  const now     = Date.now();
  const aging   = { current: [], '1-30': [], '31-60': [], '61-90': [], over90: [] };
  invoices.forEach(inv => {
    const age = Math.floor((now - new Date(inv.dueDate || inv.date)) / 86400000);
    if (age <= 0)       aging.current.push(inv);
    else if (age <= 30) aging['1-30'].push(inv);
    else if (age <= 60) aging['31-60'].push(inv);
    else if (age <= 90) aging['61-90'].push(inv);
    else                aging.over90.push(inv);
  });
  const totals = Object.fromEntries(
    Object.entries(aging).map(([k, v]) => [k, v.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0)])
  );
  res.json({ success: true, aging, totals, grandTotal: Object.values(totals).reduce((a, b) => a + b, 0) });
});

router.post('/reports/profitability', (req, res) => {
  const { products = [] } = req.body;
  const results = products.map(p => ({
    ...p,
    grossProfit:  (parseFloat(p.revenue) || 0) - (parseFloat(p.cogs) || 0),
    margin:       p.revenue > 0 ? (((p.revenue - p.cogs) / p.revenue) * 100).toFixed(2) : '0.00',
  }));
  res.json({ success: true, products: results });
});

router.post('/reports/cash-flow', (req, res) => {
  const { operating = 0, investing = 0, financing = 0, openingBalance = 0 } = req.body;
  const net     = parseFloat(operating) + parseFloat(investing) + parseFloat(financing);
  const closing = parseFloat(openingBalance) + net;
  res.json({ success: true, cashFlow: {
    operating, investing, financing,
    netCashFlow: net, openingBalance,
    closingBalance: closing,
    status: net >= 0 ? 'Positive' : 'Negative',
  }});
});

router.get('/reports/dashboard', (req, res) => {
  res.json({ success: true, dashboard: {
    message: 'Connect to your database for live financial dashboard data',
    endpoints: ['/reports/summary', '/reports/ar-aging', '/reports/profitability', '/reports/cash-flow'],
    timestamp: new Date().toISOString(),
  }});
});

module.exports = router;

