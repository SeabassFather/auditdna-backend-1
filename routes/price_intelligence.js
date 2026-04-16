// ════════════════════════════════════════════════════════════════════════════
// PRICE INTELLIGENCE ENGINE v1.0 — Predictive Commodity Pricing
// Save to: C:\AuditDNA\backend\routes\price-intelligence.js
// Auto-mounts at: /api/price-intelligence (via server.js auto-loader)
// ════════════════════════════════════════════════════════════════════════════
// Analyzes: Historical USDA/FAO data, seasonal trends, harvest windows,
//           supply/demand patterns. Recommends optimal buy windows.
//           Integrates with product-market submissions.
// ════════════════════════════════════════════════════════════════════════════

const express = require('express');
const router  = express.Router();
const path    = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pricePool = new Pool({
  host:     process.env.DB_HOST     || 'process.env.DB_HOST',
  port:     Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME     || 'auditdna',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD,
  max:      5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 8000,
});
pricePool.on('error', err => console.error('[PRICE-POOL] Error:', err.message));

const pool = () => pricePool;

// ════════════════════════════════════════════════════════════════════════════
// COMMODITY DATABASE — seasonal patterns, historical baselines, volatility
// ════════════════════════════════════════════════════════════════════════════

const COMMODITY_INTEL = {
  'avocado': {
    name: 'Hass Avocado', origin: 'Michoacan/Jalisco', unit: '48ct case',
    baseline_fob: 42.50, current_fob: 46.50,
    seasonal: [1.05,1.08,1.12,1.10,1.02,0.95,0.88,0.85,0.90,0.95,1.00,1.03],
    harvest_months: [1,1,1,1,1,1,1,1,1,1,1,1], // year-round
    volatility: 0.18, trend: 'up', demand_strength: 'high',
    buy_window: { best_months: [7,8], reason: 'Peak Michoacan supply, lowest seasonal prices' },
  },
  'strawberry': {
    name: 'Strawberry', origin: 'Baja California', unit: '8x1lb flat',
    baseline_fob: 27.00, current_fob: 27.00,
    seasonal: [0.92,0.88,0.85,0.90,1.00,1.15,1.20,1.18,1.10,1.05,0.95,0.90],
    harvest_months: [1,1,1,1,1,0,0,0,0,0,1,1],
    volatility: 0.22, trend: 'up', demand_strength: 'high',
    buy_window: { best_months: [2,3], reason: 'Baja peak harvest, maximum supply' },
  },
  'blueberry': {
    name: 'Blueberry', origin: 'Jalisco', unit: '12x6oz',
    baseline_fob: 42.50, current_fob: 42.50,
    seasonal: [1.10,1.05,0.90,0.85,0.88,0.95,1.10,1.15,1.12,1.08,1.05,1.10],
    harvest_months: [0,0,1,1,1,1,0,0,0,0,0,0],
    volatility: 0.25, trend: 'up', demand_strength: 'high',
    buy_window: { best_months: [3,4], reason: 'Jalisco harvest peak, fresh supply' },
  },
  'raspberry': {
    name: 'Raspberry', origin: 'Jalisco/Baja CA', unit: '12x6oz',
    baseline_fob: 46.00, current_fob: 46.00,
    seasonal: [0.95,0.92,0.90,0.92,0.98,1.05,1.10,1.08,1.02,0.98,0.95,0.95],
    harvest_months: [1,1,1,1,1,1,1,1,1,1,1,1],
    volatility: 0.20, trend: 'stable', demand_strength: 'high',
    buy_window: { best_months: [2,3], reason: 'Dual region peak, competitive pricing' },
  },
  'tomato': {
    name: 'Roma Tomato', origin: 'Sinaloa', unit: '25lb case',
    baseline_fob: 21.50, current_fob: 21.50,
    seasonal: [0.85,0.82,0.88,0.95,1.10,1.15,1.18,1.20,1.12,1.00,0.90,0.85],
    harvest_months: [1,1,1,1,0,0,0,0,0,1,1,1],
    volatility: 0.28, trend: 'down', demand_strength: 'medium',
    buy_window: { best_months: [1,2,12], reason: 'Sinaloa peak harvest, lowest FOB' },
  },
  'lime': {
    name: 'Persian Lime', origin: 'Veracruz/Colima', unit: '40lb case',
    baseline_fob: 19.00, current_fob: 19.00,
    seasonal: [1.00,0.95,0.90,0.88,0.92,1.05,1.15,1.20,1.18,1.10,1.02,1.00],
    harvest_months: [1,1,1,1,1,1,1,1,1,1,1,1],
    volatility: 0.30, trend: 'up', demand_strength: 'high',
    buy_window: { best_months: [3,4], reason: 'Spring flush, maximum Veracruz output' },
  },
  'pepper': {
    name: 'Bell Pepper Green', origin: 'Sinaloa', unit: '25lb case',
    baseline_fob: 16.50, current_fob: 16.50,
    seasonal: [0.88,0.85,0.90,0.95,1.08,1.12,1.15,1.18,1.10,1.00,0.92,0.88],
    harvest_months: [1,1,1,1,0,0,0,0,0,1,1,1],
    volatility: 0.24, trend: 'stable', demand_strength: 'medium',
    buy_window: { best_months: [1,2], reason: 'Sinaloa peak, Nogales crossing efficient' },
  },
  'mango': {
    name: 'Mango Ataulfo', origin: 'Chiapas/Oaxaca', unit: '10lb case',
    baseline_fob: 15.00, current_fob: 15.00,
    seasonal: [1.20,1.15,0.95,0.85,0.82,0.88,0.90,1.05,1.12,1.18,1.22,1.25],
    harvest_months: [0,0,1,1,1,1,1,0,0,0,0,0],
    volatility: 0.32, trend: 'up', demand_strength: 'high',
    buy_window: { best_months: [4,5], reason: 'Peak Chiapas/Oaxaca harvest, maximum supply' },
  },
  'asparagus': {
    name: 'Asparagus', origin: 'Sonora/Caborca', unit: '11lb case',
    baseline_fob: 32.00, current_fob: 32.00,
    seasonal: [1.10,0.85,0.80,0.82,1.05,1.15,1.20,1.22,1.18,1.12,1.10,1.12],
    harvest_months: [0,1,1,1,0,0,0,0,0,0,0,0],
    volatility: 0.26, trend: 'up', demand_strength: 'high',
    buy_window: { best_months: [2,3], reason: 'Caborca peak, short window, lock it in early' },
  },
  'cucumber': {
    name: 'Cucumber', origin: 'Sinaloa/Sonora', unit: '1-1/9 bushel',
    baseline_fob: 14.25, current_fob: 14.25,
    seasonal: [0.90,0.88,0.85,0.90,0.95,1.08,1.12,1.15,1.10,1.00,0.95,0.92],
    harvest_months: [1,1,1,1,1,0,0,0,0,1,1,1],
    volatility: 0.20, trend: 'stable', demand_strength: 'medium',
    buy_window: { best_months: [2,3], reason: 'Dual region overlap, competitive' },
  },
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ════════════════════════════════════════════════════════════════════════════
// PREDICTION ENGINE — seasonal adjustment + trend + volatility
// ════════════════════════════════════════════════════════════════════════════

function predictPrice(commodity, targetMonth, monthsAhead) {
  const intel = COMMODITY_INTEL[commodity];
  if (!intel) return null;

  const seasonalFactor = intel.seasonal[targetMonth];
  const trendFactor = intel.trend === 'up' ? 1 + (0.005 * monthsAhead)
                    : intel.trend === 'down' ? 1 - (0.003 * monthsAhead)
                    : 1.0;

  const predicted = intel.current_fob * seasonalFactor * trendFactor;
  const low  = predicted * (1 - intel.volatility * 0.5);
  const high = predicted * (1 + intel.volatility * 0.5);

  return {
    predicted: Math.round(predicted * 100) / 100,
    low: Math.round(low * 100) / 100,
    high: Math.round(high * 100) / 100,
    confidence: Math.max(0.5, 1 - (monthsAhead * 0.08)),
    seasonal_factor: seasonalFactor,
    trend_factor: Math.round(trendFactor * 1000) / 1000,
  };
}

function generate12MonthForecast(commodity) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const forecast = [];

  for (let i = 0; i < 12; i++) {
    const targetMonth = (currentMonth + i) % 12;
    const pred = predictPrice(commodity, targetMonth, i);
    if (pred) {
      forecast.push({
        month: MONTHS[targetMonth],
        month_index: targetMonth,
        months_ahead: i,
        ...pred,
      });
    }
  }

  return forecast;
}

function findBuyWindows(commodity) {
  const intel = COMMODITY_INTEL[commodity];
  if (!intel) return [];

  const forecast = generate12MonthForecast(commodity);
  const sorted = [...forecast].sort((a, b) => a.predicted - b.predicted);
  const cheapest3 = sorted.slice(0, 3);
  const priciest3 = sorted.slice(-3);

  return {
    buy_now: forecast[0],
    best_windows: cheapest3.map(f => ({
      month: f.month,
      predicted_price: f.predicted,
      savings_vs_current: Math.round((intel.current_fob - f.predicted) * 100) / 100,
      savings_pct: Math.round(((intel.current_fob - f.predicted) / intel.current_fob) * 10000) / 100,
      in_harvest: intel.harvest_months[f.month_index] === 1,
    })),
    worst_windows: priciest3.map(f => ({
      month: f.month,
      predicted_price: f.predicted,
      premium_vs_current: Math.round((f.predicted - intel.current_fob) * 100) / 100,
    })),
    recommendation: intel.buy_window,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 1. COMMODITY LIST — GET /api/price-intelligence/commodities
// ════════════════════════════════════════════════════════════════════════════

router.get('/commodities', (req, res) => {
  const commodities = Object.entries(COMMODITY_INTEL).map(([key, val]) => ({
    key,
    name: val.name,
    origin: val.origin,
    unit: val.unit,
    current_fob: val.current_fob,
    baseline_fob: val.baseline_fob,
    trend: val.trend,
    volatility: val.volatility,
    demand_strength: val.demand_strength,
    buy_window: val.buy_window,
  }));
  res.json({ commodities, total: commodities.length });
});

// ════════════════════════════════════════════════════════════════════════════
// 2. SINGLE COMMODITY ANALYSIS — GET /api/price-intelligence/analyze/:commodity
// ════════════════════════════════════════════════════════════════════════════

router.get('/analyze/:commodity', (req, res) => {
  const key = req.params.commodity.toLowerCase().replace(/[^a-z]/g, '');
  const intel = COMMODITY_INTEL[key];
  if (!intel) return res.status(404).json({ error: 'Commodity not found', available: Object.keys(COMMODITY_INTEL) });

  const forecast = generate12MonthForecast(key);
  const windows = findBuyWindows(key);

  res.json({
    commodity: key,
    ...intel,
    forecast,
    windows,
    analysis: {
      current_vs_baseline: Math.round(((intel.current_fob - intel.baseline_fob) / intel.baseline_fob) * 10000) / 100,
      seasonal_range: {
        low: Math.round(intel.current_fob * Math.min(...intel.seasonal) * 100) / 100,
        high: Math.round(intel.current_fob * Math.max(...intel.seasonal) * 100) / 100,
        spread_pct: Math.round((Math.max(...intel.seasonal) - Math.min(...intel.seasonal)) * 10000) / 100,
      },
      best_month_to_buy: MONTHS[intel.seasonal.indexOf(Math.min(...intel.seasonal))],
      worst_month_to_buy: MONTHS[intel.seasonal.indexOf(Math.max(...intel.seasonal))],
    },
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 3. PREDICT PRICE — GET /api/price-intelligence/predict/:commodity/:month
// ════════════════════════════════════════════════════════════════════════════

router.get('/predict/:commodity/:month', (req, res) => {
  const key = req.params.commodity.toLowerCase().replace(/[^a-z]/g, '');
  const monthIdx = parseInt(req.params.month);
  if (monthIdx < 0 || monthIdx > 11) return res.status(400).json({ error: 'month must be 0-11' });

  const now = new Date();
  const currentMonth = now.getMonth();
  const monthsAhead = monthIdx >= currentMonth ? monthIdx - currentMonth : 12 - currentMonth + monthIdx;

  const prediction = predictPrice(key, monthIdx, monthsAhead);
  if (!prediction) return res.status(404).json({ error: 'Commodity not found' });

  res.json({
    commodity: key,
    target_month: MONTHS[monthIdx],
    months_ahead: monthsAhead,
    ...prediction,
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 4. BUY WINDOWS — GET /api/price-intelligence/buy-windows/:commodity
// ════════════════════════════════════════════════════════════════════════════

router.get('/buy-windows/:commodity', (req, res) => {
  const key = req.params.commodity.toLowerCase().replace(/[^a-z]/g, '');
  const windows = findBuyWindows(key);
  if (!windows.buy_now) return res.status(404).json({ error: 'Commodity not found' });

  res.json({ commodity: key, ...windows });
});

// ════════════════════════════════════════════════════════════════════════════
// 5. ALL FORECASTS — GET /api/price-intelligence/forecast-all
//    12-month forecast for every tracked commodity
// ════════════════════════════════════════════════════════════════════════════

router.get('/forecast-all', (req, res) => {
  const forecasts = {};
  for (const key of Object.keys(COMMODITY_INTEL)) {
    forecasts[key] = {
      name: COMMODITY_INTEL[key].name,
      current_fob: COMMODITY_INTEL[key].current_fob,
      trend: COMMODITY_INTEL[key].trend,
      forecast: generate12MonthForecast(key),
      buy_window: COMMODITY_INTEL[key].buy_window,
    };
  }
  res.json({ forecasts, commodities: Object.keys(forecasts).length });
});

// ════════════════════════════════════════════════════════════════════════════
// 6. SUBMISSION PRICE CHECK — POST /api/price-intelligence/check-submission
//    Analyzes a product submission's FOB price vs predicted market price
// ════════════════════════════════════════════════════════════════════════════

router.post('/check-submission', (req, res) => {
  const { commodity, fob_price, available_from, available_to } = req.body;
  if (!commodity || !fob_price) return res.status(400).json({ error: 'commodity and fob_price required' });

  const key = commodity.toLowerCase().replace(/[^a-z]/g, '');
  const intel = COMMODITY_INTEL[key];
  if (!intel) return res.status(404).json({ error: 'Commodity not tracked', available: Object.keys(COMMODITY_INTEL) });

  const fromMonth = available_from ? new Date(available_from).getMonth() : new Date().getMonth();
  const toMonth = available_to ? new Date(available_to).getMonth() : fromMonth;

  // Predict price for the delivery window
  const predictions = [];
  let m = fromMonth;
  while (true) {
    const now = new Date();
    const monthsAhead = m >= now.getMonth() ? m - now.getMonth() : 12 - now.getMonth() + m;
    const pred = predictPrice(key, m, monthsAhead);
    predictions.push({ month: MONTHS[m], ...pred });
    if (m === toMonth) break;
    m = (m + 1) % 12;
    if (predictions.length > 12) break;
  }

  const avgPredicted = predictions.reduce((s, p) => s + p.predicted, 0) / predictions.length;
  const priceDiff = fob_price - avgPredicted;
  const priceDiffPct = (priceDiff / avgPredicted) * 100;

  let verdict, signal;
  if (priceDiffPct < -10) { verdict = 'EXCELLENT PRICE'; signal = 'strong_buy'; }
  else if (priceDiffPct < -3) { verdict = 'GOOD PRICE'; signal = 'buy'; }
  else if (priceDiffPct < 3) { verdict = 'FAIR MARKET'; signal = 'hold'; }
  else if (priceDiffPct < 10) { verdict = 'ABOVE MARKET'; signal = 'negotiate'; }
  else { verdict = 'OVERPRICED'; signal = 'pass'; }

  res.json({
    commodity: key,
    submitted_fob: parseFloat(fob_price),
    avg_predicted_fob: Math.round(avgPredicted * 100) / 100,
    difference: Math.round(priceDiff * 100) / 100,
    difference_pct: Math.round(priceDiffPct * 100) / 100,
    verdict,
    signal,
    delivery_window: predictions,
    recommendation: signal === 'strong_buy' || signal === 'buy'
      ? `Lock this price in. ${intel.name} is predicted to rise during this window.`
      : signal === 'hold'
      ? `Fair market price. Proceed if quality and terms are right.`
      : `Negotiate down. Market prediction shows lower prices available.`,
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 7. PRICE ALERTS SUMMARY — GET /api/price-intelligence/alerts
//    Which commodities are at buy/sell signals right now
// ════════════════════════════════════════════════════════════════════════════

router.get('/alerts', (req, res) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const alerts = [];

  for (const [key, intel] of Object.entries(COMMODITY_INTEL)) {
    const seasonalFactor = intel.seasonal[currentMonth];
    const predicted = intel.current_fob * seasonalFactor;
    const vsBaseline = ((intel.current_fob - intel.baseline_fob) / intel.baseline_fob) * 100;

    let signal;
    if (seasonalFactor <= 0.90) signal = 'BUY NOW';
    else if (seasonalFactor <= 0.95) signal = 'GOOD ENTRY';
    else if (seasonalFactor >= 1.15) signal = 'SELL / PASS';
    else if (seasonalFactor >= 1.08) signal = 'CAUTION';
    else signal = 'NEUTRAL';

    if (signal === 'BUY NOW' || signal === 'GOOD ENTRY' || signal === 'SELL / PASS' || signal === 'CAUTION') {
      alerts.push({
        commodity: key,
        name: intel.name,
        current_fob: intel.current_fob,
        seasonal_factor: seasonalFactor,
        predicted_this_month: Math.round(predicted * 100) / 100,
        vs_baseline_pct: Math.round(vsBaseline * 100) / 100,
        trend: intel.trend,
        signal,
        best_buy_months: intel.buy_window.best_months.map(m => MONTHS[m]),
        reason: intel.buy_window.reason,
      });
    }
  }

  // Sort: BUY NOW first
  const order = { 'BUY NOW': 0, 'GOOD ENTRY': 1, 'CAUTION': 2, 'SELL / PASS': 3 };
  alerts.sort((a, b) => (order[a.signal] || 9) - (order[b.signal] || 9));

  res.json({ alerts, month: MONTHS[currentMonth], total: alerts.length });
});

module.exports = router;

process.on('exit', () => pricePool.end().catch(() => {}));
