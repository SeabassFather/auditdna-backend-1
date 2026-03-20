// ============================================================
// ag-intel.js — Agricultural Intelligence API Routes
// AuditDNA Backend | Port 5050
// Aggregates: USDA NASS, FAOSTAT, USDA FAS
// Cache: Railway PostgreSQL (24hr TTL)
// ============================================================
// Save to: C:\AuditDNA\backend\routes\ag-intel.js

const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const pool = require('../db'); // existing pool

const USDA_KEY = '4F158DB1-85C2-3243-BFFA-58B53FB40D23';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── ENSURE CACHE TABLE EXISTS ────────────────────────────────
const ensureCache = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ag_intel_cache (
        cache_key   TEXT PRIMARY KEY,
        payload     JSONB NOT NULL,
        fetched_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  } catch (e) {
    console.error('[ag-intel] cache table init error:', e.message);
  }
};
ensureCache();

// ─── CACHE HELPERS ────────────────────────────────────────────
const getCache = async (key) => {
  try {
    const r = await pool.query(
      `SELECT payload, fetched_at FROM ag_intel_cache WHERE cache_key = $1`, [key]
    );
    if (!r.rows.length) return null;
    const age = Date.now() - new Date(r.rows[0].fetched_at).getTime();
    if (age > CACHE_TTL_MS) return null;
    return r.rows[0].payload;
  } catch { return null; }
};

const setCache = async (key, payload) => {
  try {
    await pool.query(
      `INSERT INTO ag_intel_cache (cache_key, payload, fetched_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (cache_key) DO UPDATE SET payload = $2, fetched_at = NOW()`,
      [key, JSON.stringify(payload)]
    );
  } catch (e) {
    console.error('[ag-intel] cache write error:', e.message);
  }
};

// ─── COMMODITY MAP ─────────────────────────────────────────────
// Maps friendly names → USDA NASS commodity strings + FAO item codes
const COMMODITY_MAP = {
  avocado:      { nass: 'AVOCADOS',          fao_code: '572',  fao_name: 'Avocados'         },
  strawberry:   { nass: 'STRAWBERRIES',       fao_code: '768',  fao_name: 'Strawberries'     },
  blueberry:    { nass: 'BLUEBERRIES',        fao_code: '769',  fao_name: 'Blueberries'      },
  raspberry:    { nass: 'RASPBERRIES',        fao_code: '771',  fao_name: 'Raspberries'      },
  lime:         { nass: 'LIMES',              fao_code: '497',  fao_name: 'Lemons and limes' },
  lemon:        { nass: 'LEMONS',             fao_code: '497',  fao_name: 'Lemons and limes' },
  tomato:       { nass: 'TOMATOES',           fao_code: '388',  fao_name: 'Tomatoes'         },
  pepper:       { nass: 'PEPPERS, BELL',      fao_code: '401',  fao_name: 'Chillies and peppers, green' },
  lettuce:      { nass: 'LETTUCE',            fao_code: '372',  fao_name: 'Lettuce and chicory' },
  cilantro:     { nass: 'HERBS',              fao_code: '463',  fao_name: 'Herbs (e.g. parsley)' },
  onion:        { nass: 'ONIONS',             fao_code: '403',  fao_name: 'Onions, dry'      },
  garlic:       { nass: 'GARLIC',             fao_code: '406',  fao_name: 'Garlic'           },
  broccoli:     { nass: 'BROCCOLI',           fao_code: '358',  fao_name: 'Cauliflowers and broccoli' },
  cucumber:     { nass: 'CUCUMBERS',          fao_code: '397',  fao_name: 'Cucumbers and gherkins' },
  mango:        { nass: 'MANGOS',             fao_code: '571',  fao_name: 'Mangoes, mangosteens, guavas' },
  asparagus:    { nass: 'ASPARAGUS',          fao_code: '367',  fao_name: 'Asparagus'        },
  carrot:       { nass: 'CARROTS',            fao_code: '426',  fao_name: 'Carrots and turnips' },
  cabbage:      { nass: 'CABBAGE',            fao_code: '358',  fao_name: 'Cabbages'         },
  grape:        { nass: 'GRAPES',             fao_code: '560',  fao_name: 'Grapes'           },
  watermelon:   { nass: 'WATERMELONS',        fao_code: '567',  fao_name: 'Watermelons'      },
  cantaloupe:   { nass: 'CANTALOUPES',        fao_code: '568',  fao_name: 'Cantaloupes, other melons' },
};

// ─── ROUTE 1: USDA NASS PRICE ──────────────────────────────────
// GET /api/intel/usda-price?commodity=avocado&state=CA&year=2024
router.get('/usda-price', async (req, res) => {
  const { commodity = 'avocado', state = '', year = new Date().getFullYear() } = req.query;
  const key = `usda_price_${commodity}_${state}_${year}`;

  const cached = await getCache(key);
  if (cached) return res.json({ source: 'cache', ...cached });

  const map = COMMODITY_MAP[commodity.toLowerCase()];
  if (!map) return res.status(400).json({ error: 'Unknown commodity', available: Object.keys(COMMODITY_MAP) });

  try {
    const params = new URLSearchParams({
      key: USDA_KEY,
      commodity_desc: map.nass,
      statisticcat_desc: 'PRICE RECEIVED',
      unit_desc: '$ / CWT',
      freq_desc: 'ANNUAL',
      year: String(year),
      format: 'JSON'
    });
    if (state) params.set('state_alpha', state.toUpperCase());

    const url = `https://quickstats.nass.usda.gov/api/api_GET/?${params}`;
    const r = await fetch(url, { timeout: 10000 });
    const raw = await r.json();

    const items = (raw.data || []).map(d => ({
      commodity: d.commodity_desc,
      year: d.year,
      state: d.state_name,
      value: parseFloat(d.Value?.replace(',', '') || 0),
      unit: d.unit_desc,
      period: d.reference_period_desc
    })).filter(d => d.value > 0);

    const payload = {
      commodity,
      year,
      state: state || 'ALL',
      count: items.length,
      avg_price_cwt: items.length
        ? (items.reduce((s, i) => s + i.value, 0) / items.length).toFixed(2)
        : null,
      data: items.slice(0, 50),
      fetched_at: new Date().toISOString()
    };

    await setCache(key, payload);
    res.json({ source: 'live', ...payload });
  } catch (e) {
    res.status(500).json({ error: 'USDA NASS fetch failed', detail: e.message });
  }
});

// ─── ROUTE 2: FAOSTAT GLOBAL PRICE ─────────────────────────────
// GET /api/intel/fao-global?commodity=avocado&country=MX&year=2022
router.get('/fao-global', async (req, res) => {
  const { commodity = 'avocado', country = '', year = '2022' } = req.query;
  const key = `fao_global_${commodity}_${country}_${year}`;

  const cached = await getCache(key);
  if (cached) return res.json({ source: 'cache', ...cached });

  const map = COMMODITY_MAP[commodity.toLowerCase()];
  if (!map) return res.status(400).json({ error: 'Unknown commodity', available: Object.keys(COMMODITY_MAP) });

  // Country codes: MX=138, US=231, GT=89, PE=180, CL=40, CO=44, EC=58
  const COUNTRY_CODES = { MX:'138', US:'231', GT:'89', PE:'180', CL:'40', CO:'44', EC:'58', CR:'50' };
  const countryCode = COUNTRY_CODES[country.toUpperCase()] || '';

  try {
    const params = new URLSearchParams({
      item: map.fao_code,
      element: '5532', // Producer price (USD/tonne)
      year,
      ...(countryCode ? { area: countryCode } : {})
    });

    const url = `https://fenixservices.fao.org/faostat/api/v1/en/data/PP/?${params}&output_type=objects`;
    const r = await fetch(url, { timeout: 12000, headers: { 'Accept': 'application/json' } });
    const raw = await r.json();

    const items = ((raw.data || raw.Data || []).slice(0, 100)).map(d => ({
      country: d.Area || d.area,
      year: d.Year || d.year,
      commodity: d.Item || d.item,
      value_usd_tonne: parseFloat(d.Value || d.value || 0),
      flag: d.Flag
    })).filter(d => d.value_usd_tonne > 0);

    const payload = {
      commodity,
      fao_item: map.fao_name,
      year,
      country: country || 'ALL',
      count: items.length,
      avg_usd_tonne: items.length
        ? (items.reduce((s, i) => s + i.value_usd_tonne, 0) / items.length).toFixed(2)
        : null,
      data: items,
      fetched_at: new Date().toISOString()
    };

    await setCache(key, payload);
    res.json({ source: 'live', ...payload });
  } catch (e) {
    res.status(500).json({ error: 'FAOSTAT fetch failed', detail: e.message });
  }
});

// ─── ROUTE 3: USDA FAS TRADE FLOWS ─────────────────────────────
// GET /api/intel/fas-trade?commodity=avocado&country=MX&type=imports
router.get('/fas-trade', async (req, res) => {
  const { commodity = 'avocado', country = 'MX', type = 'imports' } = req.query;
  const key = `fas_trade_${commodity}_${country}_${type}`;

  const cached = await getCache(key);
  if (cached) return res.json({ source: 'cache', ...cached });

  // FAS commodity codes (HS codes for major produce)
  const FAS_CODES = {
    avocado: '08044000', strawberry: '08101000', blueberry: '08104000',
    lime: '08055000', lemon: '08055000', tomato: '07020000',
    pepper: '07096000', lettuce: '07051100', onion: '07031000',
    garlic: '07032000', mango: '08045020', asparagus: '07051100',
    broccoli: '07040000', cucumber: '07070000', grape: '08061000'
  };

  const hsCode = FAS_CODES[commodity.toLowerCase()];
  if (!hsCode) return res.status(400).json({ error: 'No FAS code for commodity' });

  // FAS GATS API - US trade data
  const year = new Date().getFullYear() - 1;
  try {
    const url = `https://apps.fas.usda.gov/psdonline/api/psd/commodity/${hsCode}/country/${country}`;
    const r = await fetch(url, { timeout: 10000, headers: { 'Accept': 'application/json' } });

    let tradeData = [];
    if (r.ok) {
      const raw = await r.json();
      tradeData = Array.isArray(raw) ? raw.slice(0, 20) : [];
    }

    // Fallback: use NASS export data if FAS fails
    const payload = {
      commodity,
      hs_code: hsCode,
      country,
      trade_type: type,
      year,
      data: tradeData,
      note: tradeData.length === 0
        ? 'FAS PSD data unavailable for this commodity/country — use USDA GATS portal for detailed trade flows'
        : undefined,
      fas_portal: `https://apps.fas.usda.gov/gats/default.aspx`,
      fetched_at: new Date().toISOString()
    };

    await setCache(key, payload);
    res.json({ source: tradeData.length ? 'live' : 'partial', ...payload });
  } catch (e) {
    res.status(500).json({ error: 'FAS trade fetch failed', detail: e.message });
  }
});

// ─── ROUTE 4: COMBINED INTEL SNAPSHOT ──────────────────────────
// GET /api/intel/snapshot?commodity=avocado
// Returns USDA + FAO + trade summary in one call for Brain Sync
router.get('/snapshot', async (req, res) => {
  const { commodity = 'avocado' } = req.query;
  const key = `snapshot_${commodity}_${new Date().toISOString().slice(0,10)}`;

  const cached = await getCache(key);
  if (cached) return res.json({ source: 'cache', ...cached });

  const map = COMMODITY_MAP[commodity.toLowerCase()];
  if (!map) return res.status(400).json({ error: 'Unknown commodity' });

  const results = { commodity, map_data: map, sources: {} };

  // Parallel fetch — don't let one failure block the others
  const [usdaResult, faoResult] = await Promise.allSettled([
    fetch(`https://quickstats.nass.usda.gov/api/api_GET/?key=${USDA_KEY}&commodity_desc=${encodeURIComponent(map.nass)}&statisticcat_desc=PRICE+RECEIVED&unit_desc=%24+%2F+CWT&freq_desc=ANNUAL&year=${new Date().getFullYear()-1}&format=JSON`, { timeout: 8000 }).then(r => r.json()),
    fetch(`https://fenixservices.fao.org/faostat/api/v1/en/data/PP/?item=${map.fao_code}&element=5532&year=2022&output_type=objects`, { timeout: 10000, headers: { Accept: 'application/json' } }).then(r => r.json())
  ]);

  if (usdaResult.status === 'fulfilled' && usdaResult.value?.data?.length) {
    const items = usdaResult.value.data.filter(d => parseFloat(d.Value?.replace(',','')) > 0);
    const avg = items.reduce((s, d) => s + parseFloat(d.Value?.replace(',','') || 0), 0) / (items.length || 1);
    results.sources.usda = {
      avg_price_cwt: avg.toFixed(2),
      unit: '$ / CWT',
      year: new Date().getFullYear()-1,
      data_points: items.length,
      note: `USDA NASS — ${items.length} state records`
    };
  }

  if (faoResult.status === 'fulfilled') {
    const faoData = (faoResult.value?.data || faoResult.value?.Data || [])
      .filter(d => parseFloat(d.Value || d.value || 0) > 0);
    if (faoData.length) {
      const avg = faoData.reduce((s, d) => s + parseFloat(d.Value || d.value || 0), 0) / faoData.length;
      results.sources.fao = {
        avg_usd_tonne: avg.toFixed(2),
        unit: 'USD / Tonne',
        year: 2022,
        countries: faoData.length,
        top_producers: faoData
          .sort((a, b) => parseFloat(b.Value||b.value||0) - parseFloat(a.Value||a.value||0))
          .slice(0, 5)
          .map(d => ({ country: d.Area || d.area, price: d.Value || d.value }))
      };
    }
  }

  results.fetched_at = new Date().toISOString();
  results.summary = buildSummary(results);

  await setCache(key, results);
  res.json({ source: 'live', ...results });
});

// ─── ROUTE 5: LIST AVAILABLE COMMODITIES ───────────────────────
router.get('/commodities', (req, res) => {
  res.json({
    count: Object.keys(COMMODITY_MAP).length,
    commodities: Object.entries(COMMODITY_MAP).map(([k, v]) => ({
      key: k,
      nass_name: v.nass,
      fao_code: v.fao_code,
      fao_name: v.fao_name
    }))
  });
});

// ─── ROUTE 6: CLEAR CACHE (admin) ──────────────────────────────
router.delete('/cache', async (req, res) => {
  try {
    await pool.query(`DELETE FROM ag_intel_cache WHERE fetched_at < NOW() - INTERVAL '24 hours'`);
    res.json({ ok: true, msg: 'Expired cache cleared' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── HELPERS ────────────────────────────────────────────────────
function buildSummary(results) {
  const lines = [];
  if (results.sources.usda?.avg_price_cwt) {
    const cwt = parseFloat(results.sources.usda.avg_price_cwt);
    const per40lb = (cwt * 40 / 100).toFixed(2);
    lines.push(`USDA avg: $${cwt}/cwt (~$${per40lb}/40lb box)`);
  }
  if (results.sources.fao?.avg_usd_tonne) {
    const tonne = parseFloat(results.sources.fao.avg_usd_tonne);
    const perBox = (tonne / 1000 * 18).toFixed(2); // ~18kg per box
    lines.push(`FAO global avg: $${tonne}/tonne (~$${perBox}/box)`);
  }
  return lines.join(' | ') || 'No price data available for this commodity';
}

module.exports = router;