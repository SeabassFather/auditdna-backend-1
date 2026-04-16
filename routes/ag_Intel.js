/**
 * AG Intelligence Routes — AuditDNA Backend
 * Save to: C:\AuditDNA\backend\routes\ag_Intel.js
 * Auto-loaded by server.js route scanner → mounts at /api/ag_Intel
 *
 * Endpoints:
 *   GET /api/ag_Intel/usda-price?commodity=avocado&state=CA
 *   GET /api/ag_Intel/fao-global?commodity=avocado&country=MX
 *   GET /api/ag_Intel/fas-trade?commodity=avocado&country=MX
 *   GET /api/ag_Intel/snapshot?commodity=avocado
 *   GET /api/ag_Intel/commodities
 *   DELETE /api/ag_Intel/cache
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');

// ─── USDA NASS commodity map — Mexico + Central/South America + USA ──────────
const USDA_COMMODITY_MAP = {
  // BERRIES
  avocado:      { commodity_desc: 'AVOCADOS',      statisticcat_desc: 'PRICE RECEIVED' },
  strawberry:   { commodity_desc: 'STRAWBERRIES',  statisticcat_desc: 'PRICE RECEIVED' },
  blueberry:    { commodity_desc: 'BLUEBERRIES',   statisticcat_desc: 'PRICE RECEIVED' },
  raspberry:    { commodity_desc: 'RASPBERRIES',   statisticcat_desc: 'PRICE RECEIVED' },
  blackberry:   { commodity_desc: 'BLACKBERRIES',  statisticcat_desc: 'PRICE RECEIVED' },
  cranberry:    { commodity_desc: 'CRANBERRIES',   statisticcat_desc: 'PRICE RECEIVED' },
  // VEGETABLES — Mexico / Baja / Sonora / Sinaloa / CA
  tomato:       { commodity_desc: 'TOMATOES',      statisticcat_desc: 'PRICE RECEIVED' },
  pepper:       { commodity_desc: 'PEPPERS',       statisticcat_desc: 'PRICE RECEIVED' },
  cucumber:     { commodity_desc: 'CUCUMBERS',     statisticcat_desc: 'PRICE RECEIVED' },
  lettuce:      { commodity_desc: 'LETTUCE',       statisticcat_desc: 'PRICE RECEIVED' },
  spinach:      { commodity_desc: 'SPINACH',       statisticcat_desc: 'PRICE RECEIVED' },
  broccoli:     { commodity_desc: 'BROCCOLI',      statisticcat_desc: 'PRICE RECEIVED' },
  cauliflower:  { commodity_desc: 'CAULIFLOWER',   statisticcat_desc: 'PRICE RECEIVED' },
  celery:       { commodity_desc: 'CELERY',        statisticcat_desc: 'PRICE RECEIVED' },
  garlic:       { commodity_desc: 'GARLIC',        statisticcat_desc: 'PRICE RECEIVED' },
  onion:        { commodity_desc: 'ONIONS',        statisticcat_desc: 'PRICE RECEIVED' },
  cilantro:     { commodity_desc: 'CILANTRO',      statisticcat_desc: 'PRICE RECEIVED' },
  squash:       { commodity_desc: 'SQUASH',        statisticcat_desc: 'PRICE RECEIVED' },
  eggplant:     { commodity_desc: 'EGGPLANT',      statisticcat_desc: 'PRICE RECEIVED' },
  asparagus:    { commodity_desc: 'ASPARAGUS',     statisticcat_desc: 'PRICE RECEIVED' },
  cabbage:      { commodity_desc: 'CABBAGE',       statisticcat_desc: 'PRICE RECEIVED' },
  carrot:       { commodity_desc: 'CARROTS',       statisticcat_desc: 'PRICE RECEIVED' },
  tomatillo:    { commodity_desc: 'TOMATILLOS',    statisticcat_desc: 'PRICE RECEIVED' },
  chayote:      { commodity_desc: 'CHAYOTE',       statisticcat_desc: 'PRICE RECEIVED' },
  sweet_potato: { commodity_desc: 'SWEETPOTATOES', statisticcat_desc: 'PRICE RECEIVED' },
  potato:       { commodity_desc: 'POTATOES',      statisticcat_desc: 'PRICE RECEIVED' },
  kale:         { commodity_desc: 'KALE',          statisticcat_desc: 'PRICE RECEIVED' },
  arugula:      { commodity_desc: 'ARUGULA',       statisticcat_desc: 'PRICE RECEIVED' },
  // CITRUS — Mexico / CA / FL
  lime:         { commodity_desc: 'LIMES',         statisticcat_desc: 'PRICE RECEIVED' },
  lemon:        { commodity_desc: 'LEMONS',        statisticcat_desc: 'PRICE RECEIVED' },
  orange:       { commodity_desc: 'ORANGES',       statisticcat_desc: 'PRICE RECEIVED' },
  grapefruit:   { commodity_desc: 'GRAPEFRUIT',    statisticcat_desc: 'PRICE RECEIVED' },
  tangerine:    { commodity_desc: 'TANGERINES',    statisticcat_desc: 'PRICE RECEIVED' },
  // TROPICAL — Mexico / Central America / South America
  mango:        { commodity_desc: 'MANGOES',       statisticcat_desc: 'PRICE RECEIVED' },
  papaya:       { commodity_desc: 'PAPAYAS',       statisticcat_desc: 'PRICE RECEIVED' },
  pineapple:    { commodity_desc: 'PINEAPPLES',    statisticcat_desc: 'PRICE RECEIVED' },
  banana:       { commodity_desc: 'BANANAS',       statisticcat_desc: 'PRICE RECEIVED' },
  coconut:      { commodity_desc: 'COCONUTS',      statisticcat_desc: 'PRICE RECEIVED' },
  guava:        { commodity_desc: 'GUAVAS',        statisticcat_desc: 'PRICE RECEIVED' },
  // GRAPES / STONE FRUIT — CA / Chile / Peru
  grape:        { commodity_desc: 'GRAPES',        statisticcat_desc: 'PRICE RECEIVED' },
  peach:        { commodity_desc: 'PEACHES',       statisticcat_desc: 'PRICE RECEIVED' },
  plum:         { commodity_desc: 'PLUMS',         statisticcat_desc: 'PRICE RECEIVED' },
  nectarine:    { commodity_desc: 'NECTARINES',    statisticcat_desc: 'PRICE RECEIVED' },
  cherry:       { commodity_desc: 'CHERRIES',      statisticcat_desc: 'PRICE RECEIVED' },
  // TREE NUTS — CA / Mexico
  almond:       { commodity_desc: 'ALMONDS',       statisticcat_desc: 'PRICE RECEIVED' },
  walnut:       { commodity_desc: 'WALNUTS',       statisticcat_desc: 'PRICE RECEIVED' },
  pistachio:    { commodity_desc: 'PISTACHIOS',    statisticcat_desc: 'PRICE RECEIVED' },
  pecan:        { commodity_desc: 'PECANS',        statisticcat_desc: 'PRICE RECEIVED' },
  // GRAINS / FIELD CROPS — Mexico / USA / South America
  corn:         { commodity_desc: 'CORN',          statisticcat_desc: 'PRICE RECEIVED' },
  wheat:        { commodity_desc: 'WHEAT',         statisticcat_desc: 'PRICE RECEIVED' },
  sorghum:      { commodity_desc: 'SORGHUM',       statisticcat_desc: 'PRICE RECEIVED' },
  soybean:      { commodity_desc: 'SOYBEANS',      statisticcat_desc: 'PRICE RECEIVED' },
  rice:         { commodity_desc: 'RICE',          statisticcat_desc: 'PRICE RECEIVED' },
  bean:         { commodity_desc: 'BEANS',         statisticcat_desc: 'PRICE RECEIVED' },
  chickpea:     { commodity_desc: 'CHICKPEAS',     statisticcat_desc: 'PRICE RECEIVED' },
};

// ─── FAO commodity code map ───────────────────────────────────────────────────
const FAO_ITEM_MAP = {
  avocado:      '572',  strawberry:   '677',  blueberry:    '2029000',
  raspberry:    '2029100', blackberry: '2029200', cranberry: '95',
  tomato:       '388',  pepper:       '401',  cucumber:     '397',
  lettuce:      '372',  spinach:      '373',  broccoli:     '358',
  cauliflower:  '357',  celery:       '425',  garlic:       '406',
  onion:        '403',  cilantro:     '384',  squash:       '507',
  eggplant:     '399',  asparagus:    '367',  cabbage:      '358',
  carrot:       '426',  tomatillo:    '388',  chayote:      '312',
  sweet_potato: '122',  potato:       '116',  kale:         '358',
  arugula:      '372',
  lime:         '490',  lemon:        '489',  orange:       '490',
  grapefruit:   '507',  tangerine:    '495',
  mango:        '571',  papaya:       '600',  pineapple:    '574',
  banana:       '486',  coconut:      '249',  guava:        '569',
  grape:        '560',  peach:        '534',  plum:         '536',
  nectarine:    '534',  cherry:       '531',
  almond:       '515',  walnut:       '521',  pistachio:    '525',
  pecan:        '517',
  corn:         '56',   wheat:        '15',   sorghum:      '83',
  soybean:      '236',  rice:         '27',   bean:         '176',
  chickpea:     '191',
};

// ─── FAO country area code map ───────────────────────────────────────────────
const FAO_COUNTRY_MAP = {
  MX: '138', US: '231', CN: '41',  IN: '100',
  PE: '170', CL: '40',  CO: '44',  EC: '58',
  GT: '89',  HN: '95',  CR: '47',  DO: '59',
  BR: '21',  AR: '9',   BO: '19',  PY: '169',
  UY: '234', VE: '236', PA: '166', NI: '155',
  SV: '73',  BZ: '23',
};

const USDA_KEY = process.env.USDA_NASS_API_KEY || '4F158DB1-85C2-3243-BFFA-58B53FB40D23';
const CACHE_TTL_HOURS = 24;

// ─── cache table ─────────────────────────────────────────────────────────────
async function ensureCacheTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ag_intel_cache (
      cache_key  TEXT PRIMARY KEY,
      payload    JSONB NOT NULL,
      fetched_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function getCached(key) {
  try {
    const r = await pool.query(
      `SELECT payload, fetched_at FROM ag_intel_cache WHERE cache_key = $1`, [key]
    );
    if (!r.rows.length) return null;
    const age = (Date.now() - new Date(r.rows[0].fetched_at).getTime()) / 3600000;
    return age < CACHE_TTL_HOURS ? r.rows[0].payload : null;
  } catch { return null; }
}

async function setCached(key, payload) {
  try {
    await pool.query(`
      INSERT INTO ag_intel_cache (cache_key, payload, fetched_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (cache_key) DO UPDATE SET payload = $2, fetched_at = NOW()
    `, [key, payload]);
  } catch (e) { console.error('[ag_Intel] cache write error:', e.message); }
}

// ─── external fetchers ────────────────────────────────────────────────────────
async function fetchUsda(commodity, state) {
  const meta = USDA_COMMODITY_MAP[commodity.toLowerCase()];
  if (!meta) return { error: 'Commodity not mapped', commodity };
  const params = new URLSearchParams({
    key: USDA_KEY,
    commodity_desc: meta.commodity_desc,
    statisticcat_desc: meta.statisticcat_desc,
    freq_desc: 'ANNUAL',
    agg_level_desc: state ? 'STATE' : 'NATIONAL',
    year__GE: new Date().getFullYear() - 2,
    format: 'json',
  });
  if (state) params.set('state_alpha', state.toUpperCase());
  const r = await fetch(`https://quickstats.nass.usda.gov/api/api_GET/?${params}`, { signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error(`USDA HTTP ${r.status}`);
  const json = await r.json();
  const rows = (json.data || []).sort((a, b) => b.year - a.year).slice(0, 5).map(d => ({
    year: d.year, value: d.Value, unit: d.unit_desc, state: d.state_name || 'National',
  }));
  return { source: 'USDA NASS', commodity, latest: rows[0] || null, history: rows, fetched: new Date().toISOString() };
}

async function fetchFao(commodity, country) {
  const itemCode = FAO_ITEM_MAP[commodity.toLowerCase()];
  const areaCode = FAO_COUNTRY_MAP[(country || 'MX').toUpperCase()];
  if (!itemCode) return { error: 'Commodity not in FAO map', commodity };
  const url = `https://fenixservices.fao.org/faostat/api/v1/en/data/PP?item=${itemCode}${areaCode ? '&area=' + areaCode : ''}&element=5531&year_gte=${new Date().getFullYear() - 3}&output_type=objects`;
  const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error(`FAO HTTP ${r.status}`);
  const json = await r.json();
  const rows = (json.data || []).sort((a, b) => b.year - a.year).slice(0, 4).map(d => ({
    year: d.year, value: d.value, unit: 'USD/tonne', country: d.area || country,
  }));
  return { source: 'FAOSTAT', commodity, country, latest: rows[0] || null, history: rows, fetched: new Date().toISOString() };
}

async function fetchFas(commodity, country) {
  const HS = {
    avocado: '0804400000', strawberry: '0810100000', tomato: '0702000000',
    lime: '0805500400', mango: '0804502040', blueberry: '0810400020',
    raspberry: '0810200010', blackberry: '0810200020', grape: '0806100060',
    onion: '0703100000', garlic: '0703200000', broccoli: '0704100000',
    pepper: '0709600000', cucumber: '0707000000', lettuce: '0705110000',
    asparagus: '0709200000', banana: '0803901000', pineapple: '0804300000',
    papaya: '0807200000', lemon: '0805500010', orange: '0805100000',
  };
  const hs = HS[commodity.toLowerCase()];
  if (!hs) return { note: 'FAS HS code not mapped', commodity };
  const ctry = (country || 'MX').toUpperCase();
  const year = new Date().getFullYear() - 1;
  try {
    const r = await fetch(`https://apps.fas.usda.gov/gats/ExpressQuery1.aspx?USER_EMAIL=&type=EXPORT&commodity=${hs}&country=${ctry}&unitCode=MT&year=${year}&format=JSON`, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return { source: 'USDA FAS', note: `HTTP ${r.status}`, commodity, country };
    const json = await r.json();
    return { source: 'USDA FAS GATS', commodity, country, hs_code: hs, year, trade_data: json, fetched: new Date().toISOString() };
  } catch (e) {
    return { source: 'USDA FAS', commodity, country, error: e.message, fetched: new Date().toISOString() };
  }
}

// ─── ROUTES ──────────────────────────────────────────────────────────────────

router.get('/commodities', (req, res) => {
  res.json({
    commodities: Object.keys(USDA_COMMODITY_MAP),
    count: Object.keys(USDA_COMMODITY_MAP).length,
    fao_mapped: Object.keys(FAO_ITEM_MAP).length,
    countries_supported: Object.keys(FAO_COUNTRY_MAP).length,
  });
});

router.get('/usda-price', async (req, res) => {
  await ensureCacheTable();
  const { commodity = 'avocado', state = '' } = req.query;
  const key = `usda:${commodity}:${state}`;
  let data = await getCached(key);
  if (!data) {
    try { data = await fetchUsda(commodity, state); await setCached(key, data); }
    catch (e) { return res.status(502).json({ error: e.message, source: 'USDA NASS' }); }
  }
  res.json(data);
});

router.get('/fao-global', async (req, res) => {
  await ensureCacheTable();
  const { commodity = 'avocado', country = 'MX' } = req.query;
  const key = `fao:${commodity}:${country}`;
  let data = await getCached(key);
  if (!data) {
    try { data = await fetchFao(commodity, country); await setCached(key, data); }
    catch (e) { return res.status(502).json({ error: e.message, source: 'FAOSTAT' }); }
  }
  res.json(data);
});

router.get('/fas-trade', async (req, res) => {
  await ensureCacheTable();
  const { commodity = 'avocado', country = 'MX' } = req.query;
  const key = `fas:${commodity}:${country}`;
  let data = await getCached(key);
  if (!data) { data = await fetchFas(commodity, country); await setCached(key, data); }
  res.json(data);
});

router.get('/snapshot', async (req, res) => {
  await ensureCacheTable();
  const { commodity = 'avocado', state = '', country = 'MX' } = req.query;
  const key = `snap:${commodity}:${country}`;
  let cached = await getCached(key);
  if (cached) return res.json({ ...cached, from_cache: true });
  try {
    const [usda, fao, fas] = await Promise.allSettled([
      fetchUsda(commodity, state), fetchFao(commodity, country), fetchFas(commodity, country)
    ]);
    const usdaData = usda.status === 'fulfilled' ? usda.value : { error: usda.reason?.message };
    const faoData  = fao.status  === 'fulfilled' ? fao.value  : { error: fao.reason?.message };
    const fasData  = fas.status  === 'fulfilled' ? fas.value  : { error: fas.reason?.message };
    const snapshot = {
      commodity, country,
      summary: `${commodity.toUpperCase()} — USDA: ${usdaData.latest?.value || 'N/A'} ${usdaData.latest?.unit || ''} (${usdaData.latest?.year || '—'}) | FAO: ${faoData.latest?.value || 'N/A'} USD/tonne (${faoData.latest?.year || '—'})`,
      usda: usdaData, fao: faoData, fas: fasData,
      fetched: new Date().toISOString(),
    };
    await setCached(key, snapshot);
    res.json(snapshot);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/cache', async (req, res) => {
  try {
    await ensureCacheTable();
    const r = await pool.query(`DELETE FROM ag_intel_cache WHERE fetched_at < NOW() - INTERVAL '${CACHE_TTL_HOURS} hours'`);
    res.json({ deleted: r.rowCount, message: 'Expired cache cleared' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
