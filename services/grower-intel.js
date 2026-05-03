const { Pool } = require('pg');

const USDA_KEY = '4F158DB1-85C2-3243-BFFA-58B53FB40D23';
const pool = new Pool({
  connectionString: 'postgresql://postgres:PMJobEqMsVuiwvFwHlHFUrGXarncSAQj@hopper.proxy.rlwy.net:55424/railway'
});

const COMMODITIES = [
  { key: 'AVOCADOS', tag: 'avocado' },
  { key: 'TOMATOES', tag: 'tomato' },
  { key: 'STRAWBERRIES', tag: 'strawberry' },
  { key: 'BLUEBERRIES', tag: 'blueberry' },
  { key: 'LETTUCE', tag: 'lettuce' },
  { key: 'CITRUS', tag: 'citrus' },
  { key: 'ONIONS', tag: 'onion' },
  { key: 'PEPPERS', tag: 'pepper' },
  { key: 'CUCUMBERS', tag: 'cucumber' },
  { key: 'SQUASH', tag: 'squash' },
  { key: 'GRAPES', tag: 'grape' },
  { key: 'APPLES', tag: 'apple' },
  { key: 'MANGOES', tag: 'mango' },
  { key: 'LIMES', tag: 'lime' }
];

const US_STATES = ['CALIFORNIA','FLORIDA','TEXAS','OHIO','ARIZONA','GEORGIA','WASHINGTON','OREGON','MICHIGAN','NEW YORK','PENNSYLVANIA','NORTH CAROLINA'];

async function pullUSDA(commodity, state) {
  const url = `https://quickstats.nass.usda.gov/api/api_GET/?key=${USDA_KEY}&source_desc=CENSUS&sector_desc=CROPS&commodity_desc=${encodeURIComponent(commodity)}&statisticcat_desc=AREA+HARVESTED&year=2022&state_name=${encodeURIComponent(state)}&format=JSON`;
  try {
    const r = await fetch(url);
    if (!r.ok) return { ok: false, count: 0 };
    const j = await r.json();
    return { ok: true, count: (j.data || []).length };
  } catch (e) { return { ok: false, count: 0 }; }
}

async function enrichExistingGrowers() {
  const updated = { byCommodity: {}, total: 0 };
  for (const c of COMMODITIES) {
    const sql = `
      UPDATE growers
      SET crops_grown = CASE
        WHEN crops_grown IS NULL THEN ARRAY[$1]::text[]
        WHEN NOT ($1 = ANY(crops_grown)) THEN array_append(crops_grown, $1)
        ELSE crops_grown
      END
      WHERE (
        notes ILIKE $2
        OR primary_products::text ILIKE $2
        OR primary_product ILIKE $2
        OR secondary_products::text ILIKE $2
        OR business_name ILIKE $2
        OR legal_name ILIKE $2
        OR company_name ILIKE $2
        OR trade_name ILIKE $2
        OR email ILIKE $2
      )
      AND email IS NOT NULL AND email != '';
    `;
    const res = await pool.query(sql, [c.tag, `%${c.tag}%`]);
    updated.byCommodity[c.tag] = res.rowCount;
    updated.total += res.rowCount;
  }
  return updated;
}

async function tagFromCommodityTagsTable() {
  const tagged = { growers: 0, buyers: 0 };
  for (const c of COMMODITIES) {
    const g = await pool.query(
      `INSERT INTO contact_commodity_tags (contact_id, contact_type, commodity, country, state_region, source)
       SELECT id, 'grower', $1::varchar, country, state_province, 'usda-enrich'
       FROM growers
       WHERE ($1::text = ANY(crops_grown) OR crops_grown::text ILIKE $2)
         AND email IS NOT NULL AND email != ''
       ON CONFLICT DO NOTHING`,
      [c.tag, `%${c.tag}%`]
    );
    tagged.growers += g.rowCount;
    const b = await pool.query(
      `INSERT INTO contact_commodity_tags (contact_id, contact_type, commodity, country, state_region, source)
       SELECT id, 'buyer', $1::varchar, country, state_region, 'usda-enrich'
       FROM buyers
       WHERE product_specialties ILIKE $2
         AND email IS NOT NULL AND email != ''
       ON CONFLICT DO NOTHING`,
      [c.tag, `%${c.tag}%`]
    );
    tagged.buyers += b.rowCount;
  }
  return tagged;
}

async function pullUSDAIntel() {
  const intel = [];
  for (const c of COMMODITIES) {
    for (const s of US_STATES) {
      const r = await pullUSDA(c.key, s);
      if (r.ok && r.count > 0) intel.push({ commodity: c.tag, state: s, records: r.count });
      await new Promise(res => setTimeout(res, 150));
    }
  }
  return intel;
}

(async () => {
  console.log('=== GROWER INTEL F15 (Railway) ===');
  console.log('Phase 1: Enriching growers from text fields...');
  const enriched = await enrichExistingGrowers();
  console.log('  Updated:', JSON.stringify(enriched.byCommodity), '| Total ops:', enriched.total);

  console.log('Phase 2: Populating contact_commodity_tags...');
  const tagged = await tagFromCommodityTagsTable();
  console.log('  Tagged growers:', tagged.growers, '| Tagged buyers:', tagged.buyers);

  console.log('Phase 3: USDA NASS scan (14 commodities x 12 states)...');
  const intel = await pullUSDAIntel();
  console.log(`  USDA hits: ${intel.length} commodity/state pairs with production data`);

  console.log('Phase 4: Final pool counts per commodity...');
  for (const c of COMMODITIES) {
    const r = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM growers WHERE $1 = ANY(crops_grown) AND email IS NOT NULL AND email != '') AS growers,
        (SELECT COUNT(*) FROM buyers WHERE product_specialties ILIKE $2 AND email IS NOT NULL AND email != '') AS buyers`,
      [c.tag, `%${c.tag}%`]
    );
    console.log(`  ${c.tag.padEnd(12)} growers=${r.rows[0].growers} buyers=${r.rows[0].buyers}`);
  }

  await pool.end();
  console.log('=== DONE ===');
})().catch(e => { console.error('FATAL:', e.message); process.exit(2); });