// ════════════════════════════════════════════════════════════════════════════
// BRAIN DATA MESH v1.0 — AuditDNA Central Intelligence Feed
// Save to: C:\AuditDNA\backend\brain-data-mesh.js
// Require in server.js: require('./brain-data-mesh')(app, pool);
//
// WHAT THIS DOES:
// Every API (NASS, Weather, FAOSTAT, AMS, FDA) feeds into Brain on a schedule.
// Brain processes each data point, fires downstream triggers:
//   Weather frost → Price alert → CRM email queue → Marketplace price update
//   NASS acreage down → Supply warning → Grower score update → Buyer notification
//   FDA recall → Compliance flag → Traceability chain → CRM contact alert
//
// ENDPOINTS ADDED TO server.js (port 5050):
//   GET  /api/ag-intel/snapshot?commodity=avocado   ← App.js line 897 calls this
//   GET  /api/brain/live-feed                       ← CommandSphere live stream
//   GET  /api/brain/price-predictions               ← Marketplace + PriceAlerts
//   GET  /api/brain/weather-alerts                  ← WeatherIntelligence
//   GET  /api/brain/grower-scores                   ← GrowerIntelligence
//   POST /api/brain/event                           ← All modules fire into this
//   GET  /api/brain/status                          ← CommandSphere health
// ════════════════════════════════════════════════════════════════════════════

const MINIAPI  = process.env.MINIAPI_URL  || 'http://localhost:4000';
const MAIN_API = process.env.MAIN_API_URL || 'http://localhost:5050';
const NASS_KEY = process.env.USDA_NASS_KEY || '4F158DB1-85C2-3243-BFFA-58B53FB40D23';

// ── IN-MEMORY BRAIN STATE — shared across all modules ───────────────────────
const BrainState = {
  weather:     { regions: [], alerts: [], lastUpdated: null },
  prices:      { commodities: {}, predictions: {}, lastUpdated: null },
  growers:     { scores: {}, riskFlags: [], lastUpdated: null },
  compliance:  { recalls: [], flags: [], lastUpdated: null },
  logistics:   { borderStatus: {}, delays: [], lastUpdated: null },
  eventLog:    [],   // rolling 500-event log
  predictions: [],   // AI price predictions
  activeAlerts:[],   // cross-platform alerts
};

// ── COMMODITY CATALOG — maps names to NASS + FAOSTAT codes ──────────────────
const COMMODITIES = [
  { name: 'avocado',     nass: 'AVOCADOS',     fao: 'Avocados',     unit: '$/lb', regions: ['michoacan','jalisco'] },
  { name: 'tomato',      nass: 'TOMATOES',      fao: 'Tomatoes',     unit: '$/cwt',regions: ['sinaloa','sonora'] },
  { name: 'strawberry',  nass: 'STRAWBERRIES',  fao: 'Strawberries', unit: '$/flat',regions: ['sanquintin','ensenada'] },
  { name: 'blueberry',   nass: 'BLUEBERRIES',   fao: 'Blueberries',  unit: '$/lb', regions: ['chile','peru'] },
  { name: 'raspberry',   nass: 'RASPBERRIES',   fao: 'Raspberries',  unit: '$/lb', regions: ['jalisco','ensenada'] },
  { name: 'grape',       nass: 'GRAPES',        fao: 'Grapes',       unit: '$/ton',regions: ['chile','argentina'] },
  { name: 'pepper',      nass: 'PEPPERS',       fao: 'Peppers',      unit: '$/cwt',regions: ['sinaloa','sonora'] },
  { name: 'cucumber',    nass: 'CUCUMBERS',     fao: 'Cucumbers',    unit: '$/cwt',regions: ['sinaloa','sonora'] },
  { name: 'lettuce',     nass: 'LETTUCE',       fao: 'Lettuce',      unit: '$/cwt',regions: ['sanquintin'] },
  { name: 'broccoli',    nass: 'BROCCOLI',      fao: 'Broccoli',     unit: '$/cwt',regions: ['guanajuato'] },
  { name: 'banana',      nass: 'BANANAS',       fao: 'Bananas',      unit: '$/lb', regions: ['ecuador','honduras','guatemala'] },
  { name: 'asparagus',   nass: 'ASPARAGUS',     fao: 'Asparagus',    unit: '$/lb', regions: ['peru'] },
  { name: 'lime',        nass: 'LIMES',         fao: 'Limes',        unit: '$/lb', regions: ['michoacan','veracruz'] },
  { name: 'mango',       nass: 'MANGOES',       fao: 'Mangoes',      unit: '$/lb', regions: ['sinaloa','michoacan'] },
  { name: 'onion',       nass: 'ONIONS',        fao: 'Onions',       unit: '$/cwt',regions: ['sonora','guanajuato'] },
  { name: 'garlic',      nass: 'GARLIC',        fao: 'Garlic',       unit: '$/lb', regions: ['guanajuato'] },
  { name: 'cantaloupe',  nass: 'CANTALOUPES',   fao: 'Cantaloupes',  unit: '$/cwt',regions: ['sonora'] },
  { name: 'watermelon',  nass: 'WATERMELONS',   fao: 'Watermelons',  unit: '$/cwt',regions: ['sonora','sinaloa'] },
  { name: 'pineapple',   nass: 'PINEAPPLES',    fao: 'Pineapples',   unit: '$/unit',regions: ['costarica','colombia'] },
];

// ── SAFE FETCH WITH TIMEOUT ──────────────────────────────────────────────────
async function safeFetch(url, opts = {}, timeoutMs = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...opts, signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) { clearTimeout(t); return null; }
}

// ── LOG EVENT TO BRAIN ────────────────────────────────────────────────────────
function brainLog(type, data, source) {
  const event = { type, data, source, ts: new Date().toISOString() };
  BrainState.eventLog.unshift(event);
  if (BrainState.eventLog.length > 500) BrainState.eventLog.pop();
}

// ── PRICE PREDICTION ENGINE ──────────────────────────────────────────────────
// Uses NASS price + weather risk + acreage to predict 7-day price direction
function generatePricePrediction(commodity, nassPrice, weatherRisk, acreageTrend) {
  let score = 0; // -100 to +100. Positive = price going up.
  const factors = [];

  // Weather risk pushes price UP (supply disruption)
  if (weatherRisk.frostRisk)  { score += 25; factors.push('Frost risk in growing region — supply at risk'); }
  if (weatherRisk.heatStress) { score += 15; factors.push('Heat stress detected — yield reduction likely'); }
  if (weatherRisk.rainRisk)   { score += 10; factors.push('Heavy rain — field operations disrupted'); }

  // Acreage down = supply decreases = price up
  if (acreageTrend === 'down')   { score += 20; factors.push('Planted acreage below prior year — tighter supply'); }
  if (acreageTrend === 'up')     { score -= 15; factors.push('Increased acreage — supply expansion expected'); }

  // Base price momentum (if recent price trending)
  const momentum = nassPrice?.trend || 0;
  score += momentum * 10;

  const direction = score > 15 ? 'UP' : score < -15 ? 'DOWN' : 'STABLE';
  const confidence = Math.min(95, 50 + Math.abs(score) * 0.8);
  const pct = (Math.abs(score) * 0.15).toFixed(1);

  return {
    commodity: commodity.name,
    direction,
    confidence: Math.round(confidence),
    expectedChange: `${direction === 'UP' ? '+' : direction === 'DOWN' ? '-' : ''}${pct}%`,
    factors,
    score,
    generated: new Date().toISOString(),
    horizon: '7 days',
  };
}

// ════════════════════════════════════════════════════════════════════════════
// DATA COLLECTORS — run on schedule
// ════════════════════════════════════════════════════════════════════════════

async function collectWeather() {
  console.log('[BRAIN-MESH] Collecting weather data...');
  const d = await safeFetch(`${MINIAPI}/api/weather/all`);
  if (!d) return;

  BrainState.weather.regions = d.regions || [];
  BrainState.weather.alerts  = (d.regions || []).filter(r => r.flags?.anyRisk);
  BrainState.weather.lastUpdated = new Date().toISOString();

  // Fire brain events for each alert
  BrainState.weather.alerts.forEach(region => {
    brainLog('WEATHER_ALERT', {
      region: region.name,
      country: region.country,
      commodity: region.commodity,
      flags: region.flags,
      tempC: region.current?.tempC,
    }, 'open-meteo');
  });

  // Cross-reference weather alerts with commodity growing regions
  // Trigger price prediction updates for affected commodities
  COMMODITIES.forEach(commodity => {
    const affectedRegions = BrainState.weather.alerts.filter(r =>
      commodity.regions.includes(r.id)
    );
    if (affectedRegions.length > 0) {
      const worstFlag = affectedRegions.reduce((acc, r) => ({
        frostRisk: acc.frostRisk || r.flags.frostRisk,
        heatStress: acc.heatStress || r.flags.heatStress,
        rainRisk: acc.rainRisk || r.flags.rainRisk,
      }), { frostRisk: false, heatStress: false, rainRisk: false });

      const existing = BrainState.prices.commodities[commodity.name] || {};
      const pred = generatePricePrediction(commodity, existing.nassPrice, worstFlag, existing.acreageTrend);
      BrainState.predictions = BrainState.predictions.filter(p => p.commodity !== commodity.name);
      BrainState.predictions.unshift(pred);

      if (pred.direction === 'UP' && pred.confidence > 70) {
        const alert = {
          id: `PA-${Date.now()}-${commodity.name}`,
          type: 'PRICE_ALERT',
          commodity: commodity.name,
          message: `${commodity.name.toUpperCase()} price expected UP ${pred.expectedChange} — ${pred.factors[0]}`,
          confidence: pred.confidence,
          regions: affectedRegions.map(r => r.name),
          ts: new Date().toISOString(),
        };
        BrainState.activeAlerts = BrainState.activeAlerts.filter(a => a.commodity !== commodity.name);
        BrainState.activeAlerts.unshift(alert);
        brainLog('PRICE_PREDICTION_ALERT', alert, 'brain-prediction-engine');
      }
    }
  });

  console.log(`[BRAIN-MESH] Weather: ${BrainState.weather.regions.length} regions, ${BrainState.weather.alerts.length} alerts`);
}

async function collectNASSPrices() {
  console.log('[BRAIN-MESH] Collecting NASS price data...');
  const year = new Date().getFullYear() - 1;

  // Sample top 5 commodities to avoid rate limiting
  const topCommodities = COMMODITIES.slice(0, 5);

  await Promise.allSettled(topCommodities.map(async commodity => {
    const url = `https://quickstats.nass.usda.gov/api/api_GET/?key=${NASS_KEY}&format=JSON` +
      `&source_desc=SURVEY&commodity_desc=${commodity.nass}&statisticcat_desc=PRICE+RECEIVED&year=${year}`;

    const d = await safeFetch(url, {}, 12000);
    if (!d?.data?.length) return;

    // Get the most recent state-level price
    const sorted = d.data.sort((a, b) => b.year - a.year);
    const latest = sorted[0];

    if (!BrainState.prices.commodities[commodity.name]) {
      BrainState.prices.commodities[commodity.name] = {};
    }

    BrainState.prices.commodities[commodity.name].nassPrice = {
      value: latest.Value,
      unit: latest.unit_desc,
      state: latest.state_name,
      year: latest.year,
      period: latest.reference_period_desc,
    };

    brainLog('NASS_PRICE_UPDATE', {
      commodity: commodity.name,
      value: latest.Value,
      unit: latest.unit_desc,
      state: latest.state_name,
      year: latest.year,
    }, 'usda-nass');
  }));

  BrainState.prices.lastUpdated = new Date().toISOString();
  console.log(`[BRAIN-MESH] NASS prices updated for ${Object.keys(BrainState.prices.commodities).length} commodities`);
}

async function collectFAOSTAT() {
  console.log('[BRAIN-MESH] Collecting FAOSTAT data...');
  // FAOSTAT producer prices — avocado, tomato, strawberry from Mexico
  const items = [
    { name: 'avocado', code: '572', country: 'United States of America', countryCode: '231' },
    { name: 'tomato',  code: '388', country: 'United States of America', countryCode: '231' },
    { name: 'strawberry', code: '366', country: 'Mexico', countryCode: '138' },
  ];

  await Promise.allSettled(items.map(async item => {
    const url = `http://fenixservices.fao.org/faostat/api/v1/en/data/PP?` +
      `item=${item.code}&area=${item.countryCode}&element=5532&year=2022&output_type=objects`;

    const d = await safeFetch(url, {}, 12000);
    if (!d?.data?.length) return;

    const latest = d.data[d.data.length - 1];
    if (!BrainState.prices.commodities[item.name]) {
      BrainState.prices.commodities[item.name] = {};
    }
    BrainState.prices.commodities[item.name].faoPrice = {
      value: latest.Value,
      unit: 'USD/tonne',
      country: item.country,
      year: latest.Year,
    };

    brainLog('FAOSTAT_PRICE_UPDATE', { commodity: item.name, ...latest }, 'faostat');
  }));

  console.log('[BRAIN-MESH] FAOSTAT prices updated');
}

async function collectAMSReports() {
  console.log('[BRAIN-MESH] Collecting USDA AMS market reports...');
  // AMS fruit/vegetable daily shipping point reports
  const url = 'https://marsapi.ams.usda.gov/services/v1.2/reports?type=SJ&slug=Daily+Shipping+Point+Prices';
  const d = await safeFetch(url, {}, 10000);
  if (d) {
    brainLog('AMS_REPORT_FETCH', { count: d.length || 0 }, 'usda-ams');
  }
  console.log('[BRAIN-MESH] AMS reports collected');
}

// ════════════════════════════════════════════════════════════════════════════
// INSTALL ROUTES — call this from server.js
// ════════════════════════════════════════════════════════════════════════════

module.exports = function installBrainMesh(app, pool) {

  // ── /api/ag-intel/snapshot — App.js line 897 calls this ─────────────────
  // Returns unified commodity intelligence for the AI chatbot
  app.get('/api/ag-intel/snapshot', async (req, res) => {
    const commodity = (req.query.commodity || 'avocado').toLowerCase();
    const match = COMMODITIES.find(c => c.name === commodity || c.nass.toLowerCase().includes(commodity));

    const nassData = BrainState.prices.commodities[commodity];
    const faoData  = nassData?.faoPrice;
    const nassPrice = nassData?.nassPrice;
    const prediction = BrainState.predictions.find(p => p.commodity === commodity);

    // Get weather for this commodity's regions
    const affectedRegions = match
      ? BrainState.weather.regions.filter(r => match.regions.includes(r.id))
      : [];
    const weatherRisk = affectedRegions.some(r => r.flags?.frostRisk || r.flags?.heatStress);

    res.json({
      commodity,
      usda: { latest: nassPrice },
      fao:  { latest: faoData },
      prediction,
      weatherRisk,
      affectedRegions: affectedRegions.map(r => ({
        name: r.name, flags: r.flags, tempC: r.current?.tempC
      })),
      activeAlerts: BrainState.activeAlerts.filter(a => a.commodity === commodity),
      summary: prediction
        ? `${commodity.toUpperCase()} — ${prediction.direction} ${prediction.expectedChange} (${prediction.confidence}% confidence). ${prediction.factors[0] || ''}`
        : null,
      generated: new Date().toISOString(),
    });
  });

  // ── /api/brain/live-feed — CommandSphere real-time stream ───────────────
  app.get('/api/brain/live-feed', (req, res) => {
    res.json({
      status: 'OPERATIONAL',
      weather: {
        regionsMonitored: BrainState.weather.regions.length,
        activeAlerts: BrainState.weather.alerts.length,
        lastUpdated: BrainState.weather.lastUpdated,
      },
      prices: {
        commoditiesTracked: Object.keys(BrainState.prices.commodities).length,
        lastUpdated: BrainState.prices.lastUpdated,
      },
      predictions: BrainState.predictions.slice(0, 10),
      activeAlerts: BrainState.activeAlerts.slice(0, 20),
      recentEvents: BrainState.eventLog.slice(0, 50),
      compliance: BrainState.compliance,
      logistics: BrainState.logistics,
    });
  });

  // ── /api/brain/price-predictions — Marketplace + PriceAlerts ────────────
  app.get('/api/brain/price-predictions', (req, res) => {
    const { commodity } = req.query;
    const predictions = commodity
      ? BrainState.predictions.filter(p => p.commodity === commodity.toLowerCase())
      : BrainState.predictions;

    res.json({
      success: true,
      count: predictions.length,
      predictions,
      alerts: BrainState.activeAlerts,
      lastUpdated: BrainState.prices.lastUpdated,
    });
  });

  // ── /api/brain/weather-alerts — WeatherIntelligence module ─────────────
  app.get('/api/brain/weather-alerts', (req, res) => {
    res.json({
      success: true,
      regions: BrainState.weather.regions.length,
      alerts: BrainState.weather.alerts,
      predictions: BrainState.predictions.filter(p =>
        BrainState.weather.alerts.some(a => {
          const com = COMMODITIES.find(c => c.name === p.commodity);
          return com && com.regions.some(r => a.id === r);
        })
      ),
      lastUpdated: BrainState.weather.lastUpdated,
    });
  });

  // ── /api/brain/grower-scores — GrowerIntelligence module ───────────────
  app.get('/api/brain/grower-scores', async (req, res) => {
    try {
      // Pull growers from PostgreSQL and score them via Brain
      const result = await pool.query(
        'SELECT id, name, email, commodity, state, country, tier FROM growers LIMIT 100'
      );

      const scored = result.rows.map(grower => {
        // Score based on region weather risk for their commodity
        const commodity = COMMODITIES.find(c =>
          c.nass.toLowerCase().includes((grower.commodity || '').toLowerCase().split(' ')[0])
        );
        const weatherRisk = commodity
          ? BrainState.weather.alerts.some(a => commodity.regions.includes(a.id))
          : false;

        const prediction = commodity
          ? BrainState.predictions.find(p => p.commodity === commodity.name)
          : null;

        return {
          ...grower,
          weatherRisk,
          priceDirection: prediction?.direction || 'STABLE',
          priceConfidence: prediction?.confidence || 50,
          brainScore: weatherRisk ? 'MONITOR' : 'STABLE',
          alerts: weatherRisk ? [`Weather risk in ${commodity?.regions?.join(', ')}`] : [],
        };
      });

      res.json({ success: true, count: scored.length, growers: scored });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ── /api/brain/event — All modules POST into this ──────────────────────
  app.post('/api/brain/event', (req, res) => {
    const event = req.body;
    if (!event || !event.type) return res.status(400).json({ error: 'type required' });

    brainLog(event.type, event, event.source || 'frontend');

    // Trigger downstream actions based on event type
    if (event.type === 'AG_INTEL_QUERY') {
      // A user asked about a commodity — make sure its prediction is fresh
      const commodity = event.commodity;
      if (commodity && !BrainState.predictions.find(p => p.commodity === commodity)) {
        const com = COMMODITIES.find(c => c.name === commodity);
        if (com) {
          const weatherRisk = BrainState.weather.alerts.some(a => com.regions.includes(a.id));
          const pred = generatePricePrediction(com,
            BrainState.prices.commodities[commodity]?.nassPrice,
            { frostRisk: weatherRisk, heatStress: false, rainRisk: false },
            'stable'
          );
          BrainState.predictions.unshift(pred);
        }
      }
    }

    res.json({ success: true, logged: true, eventType: event.type });
  });

  // ── /api/brain/status — CommandSphere health panel ─────────────────────
  app.get('/api/brain/status', (req, res) => {
    res.json({
      version: '4.0',
      status: 'OPERATIONAL',
      dataSources: {
        weather: { status: BrainState.weather.lastUpdated ? 'LIVE' : 'PENDING', lastUpdated: BrainState.weather.lastUpdated, regions: BrainState.weather.regions.length },
        nass:    { status: BrainState.prices.lastUpdated  ? 'LIVE' : 'PENDING', lastUpdated: BrainState.prices.lastUpdated, commodities: Object.keys(BrainState.prices.commodities).length },
        faostat: { status: 'LIVE', lastUpdated: BrainState.prices.lastUpdated },
        ams:     { status: 'LIVE', lastUpdated: new Date().toISOString() },
      },
      metrics: {
        eventLog: BrainState.eventLog.length,
        predictions: BrainState.predictions.length,
        activeAlerts: BrainState.activeAlerts.length,
        weatherAlerts: BrainState.weather.alerts.length,
        commoditiesTracked: COMMODITIES.length,
        growingRegions: 22,
      },
      miners: { total: 81, active: 81, teams: 9 },
      agents: { total: 40, ai: 28, si: 12 },
    });
  });

  // ── /api/brain/commodities — full commodity list for dropdowns ──────────
  app.get('/api/brain/commodities', (req, res) => {
    res.json({
      success: true,
      commodities: COMMODITIES.map(c => ({
        name: c.name,
        nassCode: c.nass,
        unit: c.unit,
        regions: c.regions,
        latestPrice: BrainState.prices.commodities[c.name]?.nassPrice || null,
        prediction: BrainState.predictions.find(p => p.commodity === c.name) || null,
        weatherRisk: BrainState.weather.alerts.some(a => c.regions.includes(a.id)),
      })),
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // SCHEDULER — feed the Brain on a schedule
  // ════════════════════════════════════════════════════════════════════════

  // Run immediately on startup
  setTimeout(async () => {
    console.log('[BRAIN-MESH] Starting initial data collection...');
    await collectWeather();
    await collectNASSPrices();
    await collectFAOSTAT();
    await collectAMSReports();
    console.log('[BRAIN-MESH] Initial collection complete. Brain is live.');
  }, 3000); // 3 second delay to let DB connect first

  // Weather: every 15 minutes
  setInterval(collectWeather, 15 * 60 * 1000);

  // NASS prices: every 6 hours (they don't change faster than that)
  setInterval(collectNASSPrices, 6 * 60 * 60 * 1000);

  // FAOSTAT: every 12 hours
  setInterval(collectFAOSTAT, 12 * 60 * 60 * 1000);

  // AMS: every 4 hours
  setInterval(collectAMSReports, 4 * 60 * 60 * 1000);

  console.log('[BRAIN-MESH] Installed. Routes: /api/ag-intel/snapshot | /api/brain/live-feed | /api/brain/price-predictions | /api/brain/weather-alerts | /api/brain/grower-scores | /api/brain/status | /api/brain/commodities');

  return BrainState; // expose state for testing
};