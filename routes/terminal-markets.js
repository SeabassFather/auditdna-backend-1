// ============================================================================
// TERMINAL MARKET INTELLIGENCE ENGINE v1.0
// Save to: C:\AuditDNA\backend\routes\terminal-markets.js
// Auto-mounts at: /api/terminal-markets (via server.js auto-loader)
// ============================================================================
// CONNECTS TO:
//   Brain (81 miners)  - fires events on price changes, alerts, email sends
//   CM Products Tenant - shares market intel with buyer base (LA/MW/EC)
//   Price Intelligence - feeds predicted vs actual terminal pricing
//   Product Market     - links grower submissions to terminal delivery quotes
//   Email Marketing    - schedules 3am EST buyer outreach with live pricing
// ============================================================================
// DATA FLOW:
//   USDA AMS API -> terminal-markets -> Brain -> CM Products Tenant
//                                    -> Price Intelligence (predicted vs actual)
//                                    -> Email Scheduler -> Matched Buyers
//                                    -> Frontend Dashboard (charts/tables)
// ============================================================================

const express = require('express');
const router  = express.Router();
const path    = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const termPool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME     || 'auditdna',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD,
  max:      5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 8000,
});
termPool.on('error', err => console.error('[TERM-MKT] Pool error:', err.message));
const db = () => termPool;

const USDA_API_KEY = process.env.USDA_API_KEY || '4F158DB1-85C2-3243-BFFA-58B53FB40D23';

// ============================================================================
// BRAIN EVENT HELPER - fires to brain_events table + dispatches to miners
// ============================================================================
async function fireBrainEvent(eventType, payload) {
  try {
    await db().query(
      'INSERT INTO brain_events (event_type, payload, created_at) VALUES ($1, $2, NOW())',
      [eventType, JSON.stringify(payload)]
    );
  } catch (e) { /* brain_events table may not exist yet - non-critical */ }
}

// ============================================================================
// 20 USA TERMINAL MARKETS
// ============================================================================
const MARKETS = {
  los_angeles:   { name:'Los Angeles',          state:'CA', region:'West Coast',    code:'LA',  lat:34.05,  lng:-118.24, hub:'primary' },
  san_francisco: { name:'San Francisco',        state:'CA', region:'West Coast',    code:'SF',  lat:37.77,  lng:-122.42, hub:'primary' },
  seattle:       { name:'Seattle',              state:'WA', region:'Pacific NW',    code:'SE',  lat:47.61,  lng:-122.33, hub:'secondary' },
  phoenix:       { name:'Phoenix',              state:'AZ', region:'Southwest',     code:'PH',  lat:33.45,  lng:-112.07, hub:'secondary' },
  nogales:       { name:'Nogales',              state:'AZ', region:'Border-MX',     code:'NO',  lat:31.34,  lng:-110.94, hub:'crossing' },
  mcallen:       { name:'McAllen/Pharr',        state:'TX', region:'Border-MX',     code:'MC',  lat:26.20,  lng:-98.23,  hub:'crossing' },
  dallas:        { name:'Dallas',               state:'TX', region:'South Central', code:'DA',  lat:32.78,  lng:-96.80,  hub:'primary' },
  houston:       { name:'Houston',              state:'TX', region:'South Central', code:'HO',  lat:29.76,  lng:-95.37,  hub:'primary' },
  san_antonio:   { name:'San Antonio',          state:'TX', region:'South Central', code:'SA',  lat:29.42,  lng:-98.49,  hub:'secondary' },
  chicago:       { name:'Chicago',              state:'IL', region:'Midwest',       code:'CH',  lat:41.88,  lng:-87.63,  hub:'primary' },
  detroit:       { name:'Detroit',              state:'MI', region:'Midwest',       code:'DT',  lat:42.33,  lng:-83.05,  hub:'secondary' },
  minneapolis:   { name:'Minneapolis',          state:'MN', region:'Upper Midwest', code:'MN',  lat:44.98,  lng:-93.27,  hub:'secondary' },
  denver:        { name:'Denver',               state:'CO', region:'Mountain',      code:'DE',  lat:39.74,  lng:-104.99, hub:'secondary' },
  atlanta:       { name:'Atlanta',              state:'GA', region:'Southeast',     code:'AT',  lat:33.75,  lng:-84.39,  hub:'primary' },
  miami:         { name:'Miami',                state:'FL', region:'Southeast',     code:'MI',  lat:25.76,  lng:-80.19,  hub:'primary' },
  columbia:      { name:'Columbia',             state:'SC', region:'Southeast',     code:'CO',  lat:34.00,  lng:-81.03,  hub:'secondary' },
  new_york:      { name:'New York/Hunts Point', state:'NY', region:'Northeast',     code:'NY',  lat:40.71,  lng:-74.01,  hub:'primary' },
  philadelphia:  { name:'Philadelphia',         state:'PA', region:'Northeast',     code:'PL',  lat:39.95,  lng:-75.17,  hub:'primary' },
  boston:         { name:'Boston',               state:'MA', region:'Northeast',     code:'BO',  lat:42.36,  lng:-71.06,  hub:'secondary' },
  baltimore:     { name:'Baltimore',            state:'MD', region:'Mid-Atlantic',  code:'BA',  lat:39.29,  lng:-76.61,  hub:'secondary' },
};

// ============================================================================
// 15 COMMODITIES - Full pricing chain: Mexico FOB -> logistics -> terminal
// wholesale -> retail -> chain store -> consumer
// ============================================================================
const COMMODITIES = {
  avocado: {
    name:'Hass Avocado', origin:'Michoacan/Jalisco', unit:'48ct case', usda_group:'Fruits',
    mexico_fob: 28.50, usda_avg_wholesale: 42.00,
    margin_vs_usda: -0.15, // CM Products is 15% under USDA avg
    logistics: { truck_to_border:2.50, customs:1.20, cold_chain:0.80, phyto:0.30, total:4.80 },
    terminals: {
      los_angeles:   { wholesale:36.00, retail:52.00, chain:48.00, transit_days:2, freight:3.50 },
      san_francisco: { wholesale:37.50, retail:54.00, chain:49.50, transit_days:3, freight:4.20 },
      dallas:        { wholesale:38.50, retail:54.00, chain:50.00, transit_days:2, freight:3.80 },
      houston:       { wholesale:38.00, retail:53.00, chain:49.00, transit_days:2, freight:3.50 },
      chicago:       { wholesale:41.00, retail:58.00, chain:53.00, transit_days:4, freight:6.20 },
      detroit:       { wholesale:42.00, retail:59.00, chain:54.00, transit_days:4, freight:6.80 },
      minneapolis:   { wholesale:42.50, retail:60.00, chain:55.00, transit_days:5, freight:7.20 },
      atlanta:       { wholesale:40.00, retail:56.00, chain:52.00, transit_days:3, freight:5.50 },
      miami:         { wholesale:39.00, retail:55.00, chain:51.00, transit_days:4, freight:6.00 },
      new_york:      { wholesale:44.00, retail:62.00, chain:56.00, transit_days:5, freight:7.50 },
      philadelphia:  { wholesale:43.00, retail:60.00, chain:55.00, transit_days:5, freight:7.20 },
      boston:         { wholesale:44.50, retail:63.00, chain:57.00, transit_days:6, freight:8.00 },
      denver:        { wholesale:40.50, retail:57.00, chain:52.50, transit_days:3, freight:5.00 },
      phoenix:       { wholesale:35.00, retail:50.00, chain:46.00, transit_days:1, freight:2.50 },
    },
  },
  strawberry: {
    name:'Strawberry', origin:'Baja California', unit:'8x1lb flat', usda_group:'Berries',
    mexico_fob: 18.00, usda_avg_wholesale: 27.00,
    margin_vs_usda: -0.18,
    logistics: { truck_to_border:1.80, customs:1.00, cold_chain:1.20, phyto:0.30, total:4.30 },
    terminals: {
      los_angeles:   { wholesale:22.00, retail:32.00, chain:28.00, transit_days:1, freight:2.50 },
      san_francisco: { wholesale:23.50, retail:34.00, chain:30.00, transit_days:2, freight:3.50 },
      dallas:        { wholesale:26.00, retail:36.00, chain:32.00, transit_days:3, freight:5.00 },
      houston:       { wholesale:25.50, retail:35.50, chain:31.50, transit_days:3, freight:4.80 },
      chicago:       { wholesale:28.00, retail:40.00, chain:35.00, transit_days:4, freight:6.50 },
      new_york:      { wholesale:30.00, retail:42.00, chain:37.00, transit_days:5, freight:7.80 },
      atlanta:       { wholesale:27.00, retail:38.00, chain:34.00, transit_days:4, freight:6.00 },
      miami:         { wholesale:26.50, retail:37.00, chain:33.00, transit_days:4, freight:6.20 },
      phoenix:       { wholesale:21.00, retail:30.00, chain:27.00, transit_days:1, freight:2.00 },
    },
  },
  blueberry: {
    name:'Blueberry', origin:'Jalisco', unit:'12x6oz', usda_group:'Berries',
    mexico_fob: 32.00, usda_avg_wholesale: 42.50,
    margin_vs_usda: -0.12,
    logistics: { truck_to_border:2.80, customs:1.00, cold_chain:1.50, phyto:0.30, total:5.60 },
    terminals: {
      los_angeles:   { wholesale:38.00, retail:54.00, chain:48.00, transit_days:2, freight:4.00 },
      chicago:       { wholesale:42.00, retail:58.00, chain:52.00, transit_days:4, freight:6.50 },
      new_york:      { wholesale:45.00, retail:62.00, chain:56.00, transit_days:5, freight:8.00 },
      dallas:        { wholesale:40.00, retail:56.00, chain:50.00, transit_days:3, freight:5.20 },
      atlanta:       { wholesale:41.00, retail:57.00, chain:51.00, transit_days:4, freight:6.00 },
    },
  },
  raspberry: {
    name:'Raspberry', origin:'Jalisco/Baja CA', unit:'12x6oz', usda_group:'Berries',
    mexico_fob: 36.00, usda_avg_wholesale: 46.00,
    margin_vs_usda: -0.10,
    logistics: { truck_to_border:2.80, customs:1.00, cold_chain:1.80, phyto:0.30, total:5.90 },
    terminals: {
      los_angeles:   { wholesale:42.00, retail:58.00, chain:52.00, transit_days:2, freight:4.00 },
      chicago:       { wholesale:46.00, retail:64.00, chain:58.00, transit_days:4, freight:6.80 },
      new_york:      { wholesale:48.00, retail:66.00, chain:60.00, transit_days:5, freight:8.20 },
      dallas:        { wholesale:44.00, retail:60.00, chain:54.00, transit_days:3, freight:5.50 },
    },
  },
  tomato_roma: {
    name:'Roma Tomato', origin:'Sinaloa', unit:'25lb case', usda_group:'Vegetables',
    mexico_fob: 14.00, usda_avg_wholesale: 21.50,
    margin_vs_usda: -0.20,
    logistics: { truck_to_border:2.00, customs:0.80, cold_chain:0.60, phyto:0.25, total:3.65 },
    terminals: {
      los_angeles:   { wholesale:18.00, retail:28.00, chain:24.00, transit_days:2, freight:3.00 },
      chicago:       { wholesale:22.00, retail:32.00, chain:28.00, transit_days:4, freight:5.50 },
      new_york:      { wholesale:24.00, retail:34.00, chain:30.00, transit_days:5, freight:6.80 },
      dallas:        { wholesale:19.50, retail:29.00, chain:25.50, transit_days:2, freight:3.50 },
      atlanta:       { wholesale:21.00, retail:31.00, chain:27.00, transit_days:3, freight:5.00 },
    },
  },
  lime: {
    name:'Persian Lime', origin:'Veracruz/Colima', unit:'40lb case', usda_group:'Citrus',
    mexico_fob: 12.00, usda_avg_wholesale: 19.00,
    margin_vs_usda: -0.18,
    logistics: { truck_to_border:2.20, customs:0.80, cold_chain:0.50, phyto:0.25, total:3.75 },
    terminals: {
      los_angeles:   { wholesale:16.00, retail:24.00, chain:20.00, transit_days:2, freight:3.20 },
      chicago:       { wholesale:20.00, retail:28.00, chain:24.50, transit_days:4, freight:5.80 },
      new_york:      { wholesale:22.00, retail:30.00, chain:26.00, transit_days:5, freight:7.00 },
      dallas:        { wholesale:17.50, retail:25.00, chain:21.50, transit_days:2, freight:3.50 },
      miami:         { wholesale:17.00, retail:24.50, chain:21.00, transit_days:3, freight:4.50 },
    },
  },
  pepper_bell: {
    name:'Bell Pepper Green', origin:'Sinaloa', unit:'25lb case', usda_group:'Vegetables',
    mexico_fob: 11.00, usda_avg_wholesale: 16.50,
    margin_vs_usda: -0.16,
    logistics: { truck_to_border:2.00, customs:0.80, cold_chain:0.60, phyto:0.25, total:3.65 },
    terminals: {
      los_angeles:   { wholesale:14.50, retail:22.00, chain:18.50, transit_days:2, freight:3.00 },
      chicago:       { wholesale:17.50, retail:26.00, chain:22.00, transit_days:4, freight:5.50 },
      new_york:      { wholesale:19.00, retail:28.00, chain:24.00, transit_days:5, freight:6.50 },
      dallas:        { wholesale:15.50, retail:23.00, chain:19.50, transit_days:2, freight:3.50 },
    },
  },
  mango: {
    name:'Mango Ataulfo', origin:'Chiapas/Oaxaca', unit:'10lb case', usda_group:'Tropical',
    mexico_fob: 10.00, usda_avg_wholesale: 15.00,
    margin_vs_usda: -0.15,
    logistics: { truck_to_border:2.50, customs:0.80, cold_chain:0.80, phyto:0.30, total:4.40 },
    terminals: {
      los_angeles:   { wholesale:13.00, retail:20.00, chain:17.00, transit_days:2, freight:3.00 },
      chicago:       { wholesale:16.00, retail:24.00, chain:20.50, transit_days:4, freight:5.50 },
      new_york:      { wholesale:17.50, retail:26.00, chain:22.00, transit_days:5, freight:7.00 },
      dallas:        { wholesale:14.00, retail:21.00, chain:18.00, transit_days:2, freight:3.50 },
      miami:         { wholesale:13.50, retail:20.50, chain:17.50, transit_days:3, freight:4.50 },
    },
  },
  asparagus: {
    name:'Asparagus', origin:'Sonora/Caborca', unit:'11lb case', usda_group:'Vegetables',
    mexico_fob: 22.00, usda_avg_wholesale: 32.00,
    margin_vs_usda: -0.14,
    logistics: { truck_to_border:2.00, customs:0.80, cold_chain:1.00, phyto:0.25, total:4.05 },
    terminals: {
      los_angeles:   { wholesale:28.00, retail:42.00, chain:36.00, transit_days:1, freight:2.50 },
      chicago:       { wholesale:33.00, retail:48.00, chain:42.00, transit_days:4, freight:6.00 },
      new_york:      { wholesale:36.00, retail:52.00, chain:46.00, transit_days:5, freight:7.50 },
      dallas:        { wholesale:30.00, retail:44.00, chain:38.00, transit_days:2, freight:4.00 },
    },
  },
  cucumber: {
    name:'Cucumber', origin:'Sinaloa/Sonora', unit:'1-1/9 bushel', usda_group:'Vegetables',
    mexico_fob: 9.50, usda_avg_wholesale: 14.25,
    margin_vs_usda: -0.17,
    logistics: { truck_to_border:1.80, customs:0.80, cold_chain:0.50, phyto:0.25, total:3.35 },
    terminals: {
      los_angeles:   { wholesale:12.50, retail:18.00, chain:15.50, transit_days:2, freight:2.80 },
      chicago:       { wholesale:15.00, retail:22.00, chain:18.50, transit_days:4, freight:5.20 },
      new_york:      { wholesale:16.50, retail:24.00, chain:20.00, transit_days:5, freight:6.50 },
      dallas:        { wholesale:13.50, retail:19.00, chain:16.50, transit_days:2, freight:3.20 },
    },
  },
  grape_table: {
    name:'Table Grape Red', origin:'Sonora', unit:'19lb box', usda_group:'Fruits',
    mexico_fob: 18.00, usda_avg_wholesale: 26.00,
    margin_vs_usda: -0.12,
    logistics: { truck_to_border:2.20, customs:0.80, cold_chain:1.00, phyto:0.30, total:4.30 },
    terminals: {
      los_angeles:   { wholesale:23.00, retail:34.00, chain:30.00, transit_days:2, freight:3.50 },
      chicago:       { wholesale:27.00, retail:38.00, chain:34.00, transit_days:4, freight:6.00 },
      new_york:      { wholesale:29.00, retail:40.00, chain:36.00, transit_days:5, freight:7.50 },
    },
  },
  squash_zucchini: {
    name:'Zucchini Squash', origin:'Sinaloa', unit:'22lb case', usda_group:'Vegetables',
    mexico_fob: 10.50, usda_avg_wholesale: 15.50,
    margin_vs_usda: -0.16,
    logistics: { truck_to_border:1.80, customs:0.80, cold_chain:0.50, phyto:0.25, total:3.35 },
    terminals: {
      los_angeles:   { wholesale:13.50, retail:20.00, chain:17.00, transit_days:2, freight:2.80 },
      chicago:       { wholesale:16.50, retail:24.00, chain:20.50, transit_days:4, freight:5.20 },
      new_york:      { wholesale:18.00, retail:26.00, chain:22.00, transit_days:5, freight:6.50 },
    },
  },
  jalapeno: {
    name:'Jalapeno Pepper', origin:'Chihuahua/Sinaloa', unit:'30lb case', usda_group:'Peppers',
    mexico_fob: 12.50, usda_avg_wholesale: 18.00,
    margin_vs_usda: -0.14,
    logistics: { truck_to_border:1.80, customs:0.80, cold_chain:0.40, phyto:0.25, total:3.25 },
    terminals: {
      los_angeles:   { wholesale:16.00, retail:24.00, chain:20.00, transit_days:2, freight:2.80 },
      chicago:       { wholesale:19.00, retail:28.00, chain:24.00, transit_days:4, freight:5.50 },
      new_york:      { wholesale:20.50, retail:30.00, chain:26.00, transit_days:5, freight:6.80 },
      dallas:        { wholesale:16.50, retail:24.50, chain:20.50, transit_days:2, freight:3.00 },
    },
  },
  papaya: {
    name:'Papaya Maradol', origin:'Chiapas/Veracruz', unit:'35lb case', usda_group:'Tropical',
    mexico_fob: 8.00, usda_avg_wholesale: 14.00,
    margin_vs_usda: -0.20,
    logistics: { truck_to_border:2.50, customs:0.80, cold_chain:0.80, phyto:0.30, total:4.40 },
    terminals: {
      los_angeles:   { wholesale:12.00, retail:18.00, chain:15.00, transit_days:3, freight:3.50 },
      chicago:       { wholesale:15.00, retail:22.00, chain:19.00, transit_days:5, freight:6.00 },
      new_york:      { wholesale:16.50, retail:24.00, chain:20.50, transit_days:5, freight:7.00 },
      miami:         { wholesale:12.50, retail:18.50, chain:15.50, transit_days:3, freight:4.50 },
    },
  },
  watermelon: {
    name:'Seedless Watermelon', origin:'Sonora/Sinaloa', unit:'per melon (avg 18lb)', usda_group:'Melons',
    mexico_fob: 3.50, usda_avg_wholesale: 6.00,
    margin_vs_usda: -0.18,
    logistics: { truck_to_border:0.80, customs:0.30, cold_chain:0.20, phyto:0.10, total:1.40 },
    terminals: {
      los_angeles:   { wholesale:5.00, retail:8.00, chain:6.50, transit_days:2, freight:1.00 },
      chicago:       { wholesale:6.50, retail:10.00, chain:8.50, transit_days:4, freight:2.00 },
      new_york:      { wholesale:7.00, retail:11.00, chain:9.00, transit_days:5, freight:2.50 },
      dallas:        { wholesale:5.50, retail:8.50, chain:7.00, transit_days:2, freight:1.20 },
    },
  },
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ============================================================================
// HELPER: Calculate full landed cost Mexico -> terminal
// ============================================================================
function calcLandedCost(commodity, terminalKey) {
  const c = COMMODITIES[commodity];
  if (!c) return null;
  const t = c.terminals[terminalKey];
  if (!t) return null;
  return {
    mexico_fob: c.mexico_fob,
    logistics: c.logistics.total,
    freight_to_terminal: t.freight,
    total_landed: Math.round((c.mexico_fob + c.logistics.total + t.freight) * 100) / 100,
    terminal_wholesale: t.wholesale,
    margin_at_wholesale: Math.round((t.wholesale - c.mexico_fob - c.logistics.total - t.freight) * 100) / 100,
    margin_pct: Math.round(((t.wholesale - c.mexico_fob - c.logistics.total - t.freight) / t.wholesale) * 10000) / 100,
    usda_avg: c.usda_avg_wholesale,
    cm_vs_usda_pct: Math.round(c.margin_vs_usda * 10000) / 100,
    retail: t.retail,
    chain: t.chain,
    transit_days: t.transit_days,
  };
}

// ============================================================================
// 1. ALL MARKETS - GET /api/terminal-markets/markets
// ============================================================================
router.get('/markets', (req, res) => {
  const markets = Object.entries(MARKETS).map(([key, m]) => ({ key, ...m }));
  res.json({ markets, total: markets.length });
});

// ============================================================================
// 2. ALL COMMODITIES - GET /api/terminal-markets/commodities
// ============================================================================
router.get('/commodities', (req, res) => {
  const list = Object.entries(COMMODITIES).map(([key, c]) => ({
    key, name: c.name, origin: c.origin, unit: c.unit, group: c.usda_group,
    mexico_fob: c.mexico_fob, usda_avg_wholesale: c.usda_avg_wholesale,
    cm_discount_pct: Math.round(c.margin_vs_usda * 10000) / 100,
    logistics_total: c.logistics.total,
    terminals_covered: Object.keys(c.terminals).length,
  }));
  res.json({ commodities: list, total: list.length });
});

// ============================================================================
// 3. FULL PRICING CHAIN - GET /api/terminal-markets/pricing/:commodity
//    FOB -> logistics -> terminal wholesale -> retail -> chain -> consumer
//    For ALL terminals that carry this commodity
// ============================================================================
router.get('/pricing/:commodity', (req, res) => {
  const key = req.params.commodity.toLowerCase().replace(/[^a-z_]/g, '');
  const c = COMMODITIES[key];
  if (!c) return res.status(404).json({ error: 'Commodity not found', available: Object.keys(COMMODITIES) });

  const pricing = {};
  for (const [tKey, tData] of Object.entries(c.terminals)) {
    pricing[tKey] = {
      market: MARKETS[tKey]?.name || tKey,
      region: MARKETS[tKey]?.region || '',
      ...calcLandedCost(key, tKey),
      logistics_breakdown: c.logistics,
    };
  }

  // Sort by margin descending (most profitable markets first)
  const sorted = Object.entries(pricing).sort((a, b) => b[1].margin_pct - a[1].margin_pct);

  res.json({
    commodity: key,
    name: c.name,
    origin: c.origin,
    unit: c.unit,
    usda_group: c.usda_group,
    mexico_fob: c.mexico_fob,
    usda_avg_wholesale: c.usda_avg_wholesale,
    cm_discount_vs_usda: `${Math.abs(Math.round(c.margin_vs_usda * 100))}% under USDA average`,
    terminals: Object.fromEntries(sorted),
    best_market: sorted[0] ? { market: sorted[0][0], margin_pct: sorted[0][1].margin_pct } : null,
    worst_market: sorted.length > 0 ? { market: sorted[sorted.length-1][0], margin_pct: sorted[sorted.length-1][1].margin_pct } : null,
  });
});

// ============================================================================
// 4. COMPARE COMMODITIES - POST /api/terminal-markets/compare
//    Compare up to 50 products side by side at a given terminal
// ============================================================================
router.post('/compare', (req, res) => {
  const { commodities: commodityKeys, terminal } = req.body;
  if (!commodityKeys || !Array.isArray(commodityKeys)) {
    return res.status(400).json({ error: 'commodities array required' });
  }
  if (commodityKeys.length > 50) {
    return res.status(400).json({ error: 'Maximum 50 commodities per comparison' });
  }

  const termKey = terminal || 'los_angeles';
  const comparison = [];

  for (const key of commodityKeys) {
    const c = COMMODITIES[key];
    if (!c) continue;
    const landed = calcLandedCost(key, termKey);
    comparison.push({
      commodity: key,
      name: c.name,
      origin: c.origin,
      unit: c.unit,
      mexico_fob: c.mexico_fob,
      usda_avg: c.usda_avg_wholesale,
      cm_discount_pct: Math.round(c.margin_vs_usda * 10000) / 100,
      ...(landed || { total_landed: null, terminal_wholesale: null, margin_pct: null }),
    });
  }

  // Sort by margin
  comparison.sort((a, b) => (b.margin_pct || 0) - (a.margin_pct || 0));

  res.json({
    terminal: termKey,
    market_name: MARKETS[termKey]?.name || termKey,
    comparison,
    total: comparison.length,
  });
});

// ============================================================================
// 5. LOGISTICS CALCULATOR - POST /api/terminal-markets/logistics
//    Mexico origin -> any terminal, with full cost breakdown
// ============================================================================
router.post('/logistics', (req, res) => {
  const { commodity, terminal, quantity_cases } = req.body;
  const key = (commodity || '').toLowerCase().replace(/[^a-z_]/g, '');
  const c = COMMODITIES[key];
  if (!c) return res.status(400).json({ error: 'commodity required', available: Object.keys(COMMODITIES) });

  const termKey = (terminal || '').toLowerCase().replace(/[^a-z_]/g, '');
  const t = c.terminals[termKey];
  if (!t) return res.status(400).json({ error: 'terminal not available for this commodity', available: Object.keys(c.terminals) });

  const qty = parseInt(quantity_cases) || 1;
  const perCase = calcLandedCost(key, termKey);

  res.json({
    commodity: key,
    name: c.name,
    origin: c.origin,
    terminal: termKey,
    market: MARKETS[termKey]?.name,
    quantity_cases: qty,
    per_case: perCase,
    total_order: {
      fob_total: Math.round(c.mexico_fob * qty * 100) / 100,
      logistics_total: Math.round(c.logistics.total * qty * 100) / 100,
      freight_total: Math.round(t.freight * qty * 100) / 100,
      grand_total_landed: Math.round(perCase.total_landed * qty * 100) / 100,
      wholesale_value: Math.round(t.wholesale * qty * 100) / 100,
      gross_margin: Math.round((t.wholesale - perCase.total_landed) * qty * 100) / 100,
    },
    transit_days: t.transit_days,
    cold_chain_required: c.logistics.cold_chain > 0,
  });
});

// ============================================================================
// 6. CM PRODUCTS TENANT VIEW - GET /api/terminal-markets/cm-products
//    Market intel formatted for CM Products buyer base
//    Regions: LA, Midwest, East Coast
// ============================================================================
router.get('/cm-products', async (req, res) => {
  const regions = {
    'West Coast (LA)': ['los_angeles', 'san_francisco', 'phoenix'],
    'Midwest': ['chicago', 'detroit', 'minneapolis', 'denver'],
    'East Coast': ['new_york', 'philadelphia', 'boston', 'baltimore'],
    'South Central': ['dallas', 'houston', 'san_antonio'],
    'Southeast': ['atlanta', 'miami', 'columbia'],
  };

  const intel = {};
  for (const [regionName, terminals] of Object.entries(regions)) {
    intel[regionName] = {};
    for (const [comKey, c] of Object.entries(COMMODITIES)) {
      const available = terminals.filter(t => c.terminals[t]);
      if (available.length === 0) continue;

      const prices = available.map(t => ({
        terminal: MARKETS[t]?.name,
        ...calcLandedCost(comKey, t),
      }));

      intel[regionName][comKey] = {
        name: c.name,
        origin: c.origin,
        mexico_fob: c.mexico_fob,
        cm_discount: `${Math.abs(Math.round(c.margin_vs_usda * 100))}% under USDA`,
        terminals: prices,
        avg_wholesale: Math.round(prices.reduce((s, p) => s + p.terminal_wholesale, 0) / prices.length * 100) / 100,
        avg_margin_pct: Math.round(prices.reduce((s, p) => s + p.margin_pct, 0) / prices.length * 100) / 100,
      };
    }
  }

  // Fire brain event for CM Products data access
  await fireBrainEvent('CM_PRODUCTS_INTEL_ACCESSED', {
    regions: Object.keys(regions),
    commodities: Object.keys(COMMODITIES).length,
    timestamp: new Date().toISOString(),
  });

  res.json({
    tenant: 'CM Products Group, LLC.',
    paca_license: true,
    nmls: '337526',
    regions: intel,
    commodities_tracked: Object.keys(COMMODITIES).length,
    markets_covered: Object.keys(MARKETS).length,
    generated_at: new Date().toISOString(),
  });
});

// ============================================================================
// 7. EMAIL SCHEDULER - POST /api/terminal-markets/schedule-email
//    Schedule buyer outreach at 3am EST with live pricing + logistics
//    Targets buyers by commodity preference from contacts DB
// ============================================================================
router.post('/schedule-email', async (req, res) => {
  const {
    commodity, terminal, send_hour_est, send_minute_est,
    custom_subject, custom_intro, include_logistics, include_usda_comparison,
  } = req.body;

  if (!commodity) return res.status(400).json({ error: 'commodity required' });

  const comKey = commodity.toLowerCase().replace(/[^a-z_]/g, '');
  const c = COMMODITIES[comKey];
  if (!c) return res.status(400).json({ error: 'commodity not found' });

  const hour = parseInt(send_hour_est) || 3;
  const minute = parseInt(send_minute_est) || 0;

  // Find matching buyers from contacts DB
  let buyers = [];
  try {
    const buyersR = await db().query(`
      SELECT id, first_name, last_name, email, email_address, company_name,
             product_specialties, delivery_destination, city, state_region
      FROM buyers
      WHERE (product_specialties ILIKE $1 OR product_specialties ILIKE $2)
        AND (email IS NOT NULL OR email_address IS NOT NULL)
      ORDER BY company_name
      LIMIT 200
    `, [`%${comKey}%`, `%${c.name.split(' ')[0]}%`]);
    buyers = buyersR.rows;
  } catch (e) {
    return res.status(500).json({ error: 'Failed to query buyers: ' + e.message });
  }

  if (buyers.length === 0) {
    return res.status(404).json({ error: 'No matching buyers found for this commodity' });
  }

  // Build pricing data for the email
  const termKey = terminal || 'los_angeles';
  const landed = calcLandedCost(comKey, termKey);

  // Generate draft offers in market_offers table
  const offers = [];
  for (const buyer of buyers) {
    const buyerEmail = buyer.email || buyer.email_address;
    const buyerName = buyer.first_name ? `${buyer.first_name} ${buyer.last_name || ''}`.trim() : (buyer.company_name || 'Valued Buyer');

    const subject = custom_subject || `Fresh ${c.name} - ${Math.abs(Math.round(c.margin_vs_usda * 100))}% Under USDA Wholesale | CM Products Group`;

    const body = `${custom_intro || `Dear ${buyerName},`}

CM Products Group, LLC. (PACA Licensed) is offering premium ${c.name} from ${c.origin}, Mexico at competitive pricing:

PRODUCT: ${c.name}
ORIGIN: ${c.origin}
PACKAGING: ${c.unit}
${include_logistics !== false ? `
PRICING BREAKDOWN:
  Mexico FOB:          $${c.mexico_fob}/${c.unit}
  Logistics to border: $${c.logistics.total}
  Freight to ${MARKETS[termKey]?.name || 'terminal'}: $${landed?.freight_to_terminal || 'TBD'}
  TOTAL LANDED:        $${landed?.total_landed || 'TBD'}/${c.unit}
  Transit time:        ${landed?.transit_days || 'TBD'} days` : ''}
${include_usda_comparison !== false ? `
USDA COMPARISON:
  USDA Avg Wholesale:  $${c.usda_avg_wholesale}/${c.unit}
  CM Products Price:   $${landed?.total_landed || c.mexico_fob}/${c.unit}
  YOUR SAVINGS:        ${Math.abs(Math.round(c.margin_vs_usda * 100))}% UNDER USDA AVERAGE` : ''}

QUALITY ASSURANCE:
  All products fully traceable via AuditDNA Agriculture Intelligence Platform
  Water, soil, fertilizer, and seed germination analysis on file
  FSMA 204 compliant | Cold chain monitored

We ship from Mexico to all USA terminal markets: ${Object.keys(c.terminals).map(t => MARKETS[t]?.name || t).join(', ')}.

To place an order or request samples, reply directly or call:

Saul Garcia
CM Products Group, LLC. | Mexausa Food Group, Inc.
NMLS #337526
Saul@mexausafg.com | +1-831-251-3116 | +52-646-340-2686`;

    offers.push({
      buyer_email: buyerEmail,
      buyer_name: buyerName,
      buyer_company: buyer.company_name || '',
      subject,
      body,
      buyer_id: buyer.id,
    });
  }

  // Store scheduled emails in DB
  let stored = 0;
  try {
    for (const offer of offers) {
      await db().query(`
        INSERT INTO market_offers (
          submission_id, grower_id, buyer_id, buyer_email, buyer_name, buyer_company,
          commodity, email_subject, email_body, email_status
        ) VALUES (0, 0, $1, $2, $3, $4, $5, $6, $7, 'scheduled')
      `, [
        offer.buyer_id, offer.buyer_email, offer.buyer_name, offer.buyer_company,
        comKey, offer.subject, offer.body,
      ]);
      stored++;
    }
  } catch (e) {
    // market_offers may require valid submission_id - store in separate scheduled table
    console.warn('[TERM-MKT] Could not store offers:', e.message);
  }

  // Calculate EST send time
  const now = new Date();
  const estOffset = -5;
  const sendTimeEST = new Date();
  sendTimeEST.setUTCHours(hour - estOffset, minute, 0, 0);
  if (sendTimeEST <= now) sendTimeEST.setDate(sendTimeEST.getDate() + 1);

  // Fire brain event
  await fireBrainEvent('EMAIL_BATCH_SCHEDULED', {
    commodity: comKey,
    buyers_matched: buyers.length,
    terminal: termKey,
    send_time_est: `${hour.toString().padStart(2,'0')}:${minute.toString().padStart(2,'0')} EST`,
    send_at: sendTimeEST.toISOString(),
    pricing: landed,
    cm_vs_usda: `${Math.abs(Math.round(c.margin_vs_usda * 100))}% under`,
  });

  res.json({
    success: true,
    commodity: comKey,
    name: c.name,
    terminal: termKey,
    market: MARKETS[termKey]?.name,
    buyers_matched: buyers.length,
    emails_stored: stored,
    send_time: `${hour.toString().padStart(2,'0')}:${minute.toString().padStart(2,'0')} EST`,
    send_at_utc: sendTimeEST.toISOString(),
    pricing_summary: landed,
    usda_discount: `${Math.abs(Math.round(c.margin_vs_usda * 100))}% under USDA wholesale average`,
    sample_email: {
      to: offers[0]?.buyer_email,
      subject: offers[0]?.subject,
      body_preview: offers[0]?.body?.substring(0, 300) + '...',
    },
    message: `${buyers.length} buyer emails scheduled for ${hour}:${minute.toString().padStart(2,'0')} AM EST targeting ${c.name} buyers.`,
  });
});

// ============================================================================
// 8. BRAIN FEED - GET /api/terminal-markets/brain-feed
//    Feeds all market intelligence to Brain for miner processing
// ============================================================================
router.get('/brain-feed', async (req, res) => {
  const feed = {
    timestamp: new Date().toISOString(),
    markets: Object.keys(MARKETS).length,
    commodities: Object.keys(COMMODITIES).length,
    pricing_snapshots: {},
    alerts: [],
  };

  const currentMonth = new Date().getMonth();

  for (const [key, c] of Object.entries(COMMODITIES)) {
    const terminals = Object.entries(c.terminals).map(([tKey, t]) => ({
      market: MARKETS[tKey]?.name,
      wholesale: t.wholesale,
      landed: calcLandedCost(key, tKey)?.total_landed,
      margin_pct: calcLandedCost(key, tKey)?.margin_pct,
    }));

    const avgMargin = terminals.reduce((s, t) => s + (t.margin_pct || 0), 0) / terminals.length;

    feed.pricing_snapshots[key] = {
      name: c.name,
      mexico_fob: c.mexico_fob,
      usda_avg: c.usda_avg_wholesale,
      cm_discount_pct: Math.round(c.margin_vs_usda * 10000) / 100,
      avg_margin_across_terminals: Math.round(avgMargin * 100) / 100,
      terminals,
    };

    // Generate alerts
    if (avgMargin > 15) {
      feed.alerts.push({ commodity: key, signal: 'HIGH_MARGIN', avg_margin: avgMargin, action: 'PUSH SALES' });
    }
    if (Math.abs(c.margin_vs_usda) >= 0.18) {
      feed.alerts.push({ commodity: key, signal: 'DEEP_DISCOUNT', discount: `${Math.abs(Math.round(c.margin_vs_usda * 100))}%`, action: 'HIGHLIGHT TO BUYERS' });
    }
  }

  // Fire to brain
  await fireBrainEvent('TERMINAL_MARKET_FEED', {
    commodities: Object.keys(feed.pricing_snapshots).length,
    alerts: feed.alerts.length,
    timestamp: feed.timestamp,
  });

  res.json(feed);
});

// ============================================================================
// 9. USDA AMS LIVE PULL - GET /api/terminal-markets/usda-live/:commodity
//    Pulls real-time data from USDA AMS Market News API
// ============================================================================
router.get('/usda-live/:commodity', async (req, res) => {
  const comKey = req.params.commodity.toLowerCase();
  const c = COMMODITIES[comKey];
  if (!c) return res.status(404).json({ error: 'Commodity not found' });

  // USDA AMS Specialty Crops Market News API
  const searchTerm = c.name.split(' ')[0]; // Primary keyword
  const url = `https://marketnews.usda.gov/mnp/api/terminals?commodity=${encodeURIComponent(searchTerm)}&format=json&key=${USDA_API_KEY}`;

  try {
    const fetch = (await import('node-fetch')).default;
    const resp = await fetch(url, { timeout: 10000 });

    if (!resp.ok) {
      // Fallback to our local data
      return res.json({
        source: 'local_cache',
        commodity: comKey,
        name: c.name,
        mexico_fob: c.mexico_fob,
        usda_avg_wholesale: c.usda_avg_wholesale,
        note: 'USDA API unavailable, using cached pricing data',
      });
    }

    const data = await resp.json();
    res.json({
      source: 'usda_ams_live',
      commodity: comKey,
      name: c.name,
      usda_data: data,
      local_comparison: {
        our_fob: c.mexico_fob,
        usda_avg: c.usda_avg_wholesale,
        discount: `${Math.abs(Math.round(c.margin_vs_usda * 100))}% under`,
      },
    });
  } catch (e) {
    // Graceful fallback
    res.json({
      source: 'local_cache',
      commodity: comKey,
      name: c.name,
      mexico_fob: c.mexico_fob,
      usda_avg_wholesale: c.usda_avg_wholesale,
      error: e.message,
      note: 'USDA API request failed, using cached data',
    });
  }
});

// ============================================================================
// 10. DASHBOARD STATS - GET /api/terminal-markets/stats
// ============================================================================
router.get('/stats', (req, res) => {
  const commodityList = Object.entries(COMMODITIES).map(([k, c]) => ({
    key: k, name: c.name,
    fob: c.mexico_fob, usda: c.usda_avg_wholesale,
    discount: `${Math.abs(Math.round(c.margin_vs_usda * 100))}%`,
  }));

  res.json({
    total_markets: Object.keys(MARKETS).length,
    total_commodities: Object.keys(COMMODITIES).length,
    total_price_points: Object.values(COMMODITIES).reduce((s, c) => s + Object.keys(c.terminals).length * 4, 0),
    regions: [...new Set(Object.values(MARKETS).map(m => m.region))],
    border_crossings: Object.entries(MARKETS).filter(([_, m]) => m.hub === 'crossing').map(([k, m]) => m.name),
    commodities: commodityList,
    avg_discount_vs_usda: Math.round(
      Object.values(COMMODITIES).reduce((s, c) => s + Math.abs(c.margin_vs_usda), 0)
      / Object.keys(COMMODITIES).length * 10000
    ) / 100 + '%',
  });
});


// GET /api/terminal-markets/shipments
router.get('/shipments', async (req, res) => {
  try {
    const r = await termPool.query('SELECT * FROM shipments ORDER BY created_at DESC LIMIT 100').catch(()=>({rows:[]}));
    res.json({ ok:true, shipments: r.rows });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

// POST /api/terminal-markets/shipments
router.post('/shipments', async (req, res) => {
  try {
    const { lot_number, commodity, grower, origin, destination, carrier, quantity, unit, border_crossing, po_number } = req.body;
    const r = await termPool.query(
      `INSERT INTO shipments (lot_number, commodity, grower, origin, destination, carrier, quantity, unit, border_crossing, po_number, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'In Transit') RETURNING *`,
      [lot_number, commodity, grower, origin, destination, carrier, quantity, unit||'lbs', border_crossing, po_number]
    );
    try { termPool.query("INSERT INTO brain_events (event_type, module, payload, created_at) VALUES ($1,$2,$3,NOW())", ['SHIPMENT_CREATED','terminal-markets',JSON.stringify(req.body)]).catch(()=>{}); } catch(e) {}
    res.json({ ok:true, shipment: r.rows[0] });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

module.exports = router;
process.on('exit', () => termPool.end().catch(() => {}));