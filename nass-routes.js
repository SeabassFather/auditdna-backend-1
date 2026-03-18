// ════════════════════════════════════════════════════════════════════════════
// USDA NASS — FULL ROUTE MODULE
// Add to: C:\AuditDNA\backend\MiniAPI\server.js
// Key: 4F158DB1-85C2-3243-BFFA-58B53FB40D23
// Docs: https://quickstats.nass.usda.gov/api
// ════════════════════════════════════════════════════════════════════════════

const NASS_KEY = process.env.USDA_NASS_KEY || '4F158DB1-85C2-3243-BFFA-58B53FB40D23';
const NASS_BASE = 'https://quickstats.nass.usda.gov/api/api_GET/';

// Helper — fetch from NASS with timeout failover
async function nassQuery(params) {
  const url = new URL(NASS_BASE);
  url.searchParams.set('key', NASS_KEY);
  url.searchParams.set('format', 'JSON');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const r = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeout);
    if (!r.ok) throw new Error(`NASS HTTP ${r.status}`);
    const d = await r.json();
    return d.data || [];
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

// ── PASTE THESE ROUTES INTO MiniAPI/server.js ─────────────────────────────

// Route 1: Commodity production by state
// GET /api/nass/production?commodity=AVOCADOS&state=CA&year=2023
app.get('/api/nass/production', async (req, res) => {
  try {
    const { commodity = 'TOMATOES', state, year = new Date().getFullYear() - 1 } = req.query;
    const params = {
      source_desc: 'SURVEY',
      commodity_desc: commodity.toUpperCase(),
      statisticcat_desc: 'PRODUCTION',
      year,
    };
    if (state) params.state_alpha = state.toUpperCase();
    const data = await nassQuery(params);
    res.json({ success: true, count: data.length, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Route 2: Grower counts / operations by county — LEAD GENERATOR
// GET /api/nass/growers?commodity=STRAWBERRIES&state=CA
app.get('/api/nass/growers', async (req, res) => {
  try {
    const { commodity = 'VEGETABLES', state, county } = req.query;
    const params = {
      source_desc: 'CENSUS',
      commodity_desc: commodity.toUpperCase(),
      statisticcat_desc: 'OPERATIONS WITH SALES',
      year: '2022', // Census year
    };
    if (state) params.state_alpha = state.toUpperCase();
    if (county) params.county_name = county.toUpperCase();
    const data = await nassQuery(params);
    res.json({ success: true, count: data.length, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Route 3: Price received by farmers — FOB intelligence
// GET /api/nass/prices?commodity=AVOCADOS&state=CA
app.get('/api/nass/prices', async (req, res) => {
  try {
    const { commodity = 'TOMATOES', state, year = new Date().getFullYear() - 1 } = req.query;
    const params = {
      source_desc: 'SURVEY',
      commodity_desc: commodity.toUpperCase(),
      statisticcat_desc: 'PRICE RECEIVED',
      year,
    };
    if (state) params.state_alpha = state.toUpperCase();
    const data = await nassQuery(params);
    res.json({ success: true, count: data.length, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Route 4: Acreage / area planted — supply forecast
// GET /api/nass/acreage?commodity=STRAWBERRIES&state=CA&year=2024
app.get('/api/nass/acreage', async (req, res) => {
  try {
    const { commodity = 'TOMATOES', state, year = new Date().getFullYear() } = req.query;
    const params = {
      source_desc: 'SURVEY',
      commodity_desc: commodity.toUpperCase(),
      statisticcat_desc: 'AREA PLANTED',
      year,
    };
    if (state) params.state_alpha = state.toUpperCase();
    const data = await nassQuery(params);
    res.json({ success: true, count: data.length, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Route 5: County-level data — full lead map
// GET /api/nass/counties?commodity=AVOCADOS&state=CA
app.get('/api/nass/counties', async (req, res) => {
  try {
    const { commodity = 'AVOCADOS', state = 'CA' } = req.query;
    const params = {
      source_desc: 'CENSUS',
      commodity_desc: commodity.toUpperCase(),
      agg_level_desc: 'COUNTY',
      state_alpha: state.toUpperCase(),
      year: '2022',
    };
    const data = await nassQuery(params);
    // Group by county
    const byCounty = {};
    data.forEach(r => {
      const key = r.county_name || 'STATEWIDE';
      if (!byCounty[key]) byCounty[key] = { county: key, state: r.state_alpha, items: [] };
      byCounty[key].items.push({ stat: r.statisticcat_desc, value: r.Value, unit: r.unit_desc });
    });
    res.json({ success: true, counties: Object.values(byCounty) });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Route 6: MASTER SNAPSHOT — all key stats for one commodity
// GET /api/nass/snapshot?commodity=TOMATOES
app.get('/api/nass/snapshot', async (req, res) => {
  try {
    const { commodity = 'TOMATOES' } = req.query;
    const year = new Date().getFullYear() - 1;
    const [production, prices, acreage] = await Promise.allSettled([
      nassQuery({ source_desc: 'SURVEY', commodity_desc: commodity.toUpperCase(), statisticcat_desc: 'PRODUCTION', year }),
      nassQuery({ source_desc: 'SURVEY', commodity_desc: commodity.toUpperCase(), statisticcat_desc: 'PRICE RECEIVED', year }),
      nassQuery({ source_desc: 'SURVEY', commodity_desc: commodity.toUpperCase(), statisticcat_desc: 'AREA PLANTED', year }),
    ]);
    res.json({
      success: true,
      commodity,
      year,
      production: production.status === 'fulfilled' ? production.value : [],
      prices: prices.status === 'fulfilled' ? prices.value : [],
      acreage: acreage.status === 'fulfilled' ? acreage.value : [],
    });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Route 7: Lead generator — find all grower operations in a state
// GET /api/nass/leads?state=CA&commodity=STRAWBERRIES
app.get('/api/nass/leads', async (req, res) => {
  try {
    const { state = 'CA', commodity } = req.query;
    const commodities = commodity
      ? [commodity.toUpperCase()]
      : ['TOMATOES', 'STRAWBERRIES', 'AVOCADOS', 'GRAPES', 'LETTUCE', 'BROCCOLI', 'PEPPERS'];

    const results = await Promise.allSettled(
      commodities.map(c => nassQuery({
        source_desc: 'CENSUS',
        commodity_desc: c,
        statisticcat_desc: 'OPERATIONS WITH SALES',
        state_alpha: state.toUpperCase(),
        year: '2022',
        agg_level_desc: 'COUNTY',
      }))
    );

    const leads = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        r.value.forEach(row => {
          leads.push({
            commodity: commodities[i],
            county: row.county_name,
            state: row.state_alpha,
            operations: row.Value,
            year: row.year,
          });
        });
      }
    });

    // Sort by operations count descending
    leads.sort((a, b) => parseInt(b.operations || 0) - parseInt(a.operations || 0));
    res.json({ success: true, state, count: leads.length, leads });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});
