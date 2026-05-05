// services/usda-grower-geography.js
// Pulls USDA NASS Quickstats production data for our 26 commodities
// Maps top-producing states per commodity to inform grower outreach targeting
// USDA NASS does NOT expose grower emails - this is GEOGRAPHIC INTELLIGENCE only

const NASS_KEY = process.env.USDA_API_KEY || '4F158DB1-85C2-3243-BFFA-58B53FB40D23';

const COMMODITY_NASS_MAP = {
  'avocado-hass': 'AVOCADOS',
  'strawberry': 'STRAWBERRIES',
  'blueberry': 'BLUEBERRIES',
  'raspberry': 'RASPBERRIES',
  'tomato-roma': 'TOMATOES',
  'lime-persian': 'LIMES',
  'lemon': 'LEMONS',
  'orange': 'ORANGES',
  'grapefruit': 'GRAPEFRUIT',
  'mango': 'MANGOES',
  'pineapple': 'PINEAPPLES',
  'banana': 'BANANAS',
  'pepper-bell': 'PEPPERS',
  'cucumber': 'CUCUMBERS',
  'lettuce-iceberg': 'LETTUCE',
  'spinach': 'SPINACH',
  'broccoli': 'BROCCOLI',
  'cauliflower': 'CAULIFLOWER',
  'carrot': 'CARROTS',
  'beet': 'BEETS',
  'celery': 'CELERY',
  'asparagus': 'ASPARAGUS',
  'garlic': 'GARLIC',
  'onion': 'ONIONS',
  'potato': 'POTATOES',
  'sweet-potato': 'SWEET POTATOES'
};

async function fetchProductionByState(commoditySlug, year) {
  const fetch = global.fetch || require('node-fetch');
  const nassCommodity = COMMODITY_NASS_MAP[commoditySlug];
  if (!nassCommodity) return { ok: false, error: 'no NASS mapping for ' + commoditySlug };
  const url = 'https://quickstats.nass.usda.gov/api/api_GET/?key=' + NASS_KEY +
    '&commodity_desc=' + encodeURIComponent(nassCommodity) +
    '&statisticcat_desc=PRODUCTION' +
    '&agg_level_desc=STATE' +
    '&year=' + (year || new Date().getFullYear() - 1) +
    '&format=JSON';
  try {
    const resp = await fetch(url, { timeout: 15000 });
    if (!resp.ok) return { ok: false, error: 'NASS ' + resp.status };
    const data = await resp.json();
    return { ok: true, count: (data.data || []).length, rows: data.data || [] };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function populateGeography(pool, year) {
  let inserted = 0, errors = 0;
  const slugs = Object.keys(COMMODITY_NASS_MAP);
  for (const slug of slugs) {
    const r = await fetchProductionByState(slug, year);
    if (!r.ok) { errors++; console.log('[usda-geo]', slug, r.error); continue; }
    for (const row of r.rows.slice(0, 10)) {
      try {
        await pool.query(
          'INSERT INTO grower_geography (commodity_slug, country, state_code, state_name, production_volume, production_unit, year, raw_data) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING',
          [slug, 'US', row.state_alpha || row.state_ansi, row.state_name, parseFloat((row.Value || '0').replace(/,/g, '')) || null, row.unit_desc || 'units', parseInt(row.year) || year, row]
        );
        inserted++;
      } catch (e) { errors++; }
    }
    await new Promise(r => setTimeout(r, 600));
  }
  return { inserted, errors, commodities: slugs.length };
}

module.exports = { fetchProductionByState, populateGeography, COMMODITY_NASS_MAP };