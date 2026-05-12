const express = require('express');
const router = express.Router();
const pool = require('../db');

// Commodity keyword mapping from SENASICA campaign_id + activities
const COMMODITY_MAP = {
  avocado:      ['avocado','aguacate','hass','michoacan'],
  strawberry:   ['strawberry','fresa','berry','baya'],
  tomato:       ['tomato','tomate','jitomate'],
  pepper:       ['pepper','chile','jalapeño','pimiento','capsicum'],
  cucumber:     ['cucumber','pepino'],
  broccoli:     ['broccoli','brocoli','brassica'],
  lettuce:      ['lettuce','lechuga','leafy','verde'],
  citrus:       ['citrus','limon','lemon','naranja','orange','lime','mandarina'],
  mango:        ['mango'],
  grape:        ['grape','uva','vino','wine','vineyard','vitivinicola'],
  grain:        ['grain','grano','corn','maiz','wheat','trigo','sorghum','sorgo','cereales','feed_manufacturers'],
  dairy:        ['dairy','lacteo','leche','milk','queso','cheese','yogurt','mantequilla'],
  livestock:    ['livestock','ganado','cattle','beef','pork','cerdo','poultry','aves','meat','carne'],
  seafood:      ['seafood','mariscos','fish','pescado','shrimp','camaron','tuna','atun'],
  herb:         ['herb','hierba','cilantro','basil','albahaca','oregano','mint','menta'],
  berry:        ['berry','blueberry','arandano','raspberry','frambuesa','blackberry'],
  asparagus:    ['asparagus','esparragos','espárrago'],
  garlic:       ['garlic','ajo'],
  onion:        ['onion','cebolla'],
  organic:      ['organic','organico','certifi'],
  produce:      ['produce','verdura','hortaliza','vegetable','fruit_vegetables','frutas','agriculture'],
  packing:      ['packing','empaque','maquila','procesadora','packaging'],
  distribution: ['distribut','comercializ','wholesale','mayoreo','logistics','logistica'],
};

function detectCommodity(text) {
  if (!text) return 'agriculture';
  const t = text.toLowerCase();
  for (const [commodity, keywords] of Object.entries(COMMODITY_MAP)) {
    if (keywords.some(k => t.includes(k))) return commodity;
  }
  return 'agriculture';
}

// Update commodity tags on all ag_contacts
router.post('/classify', async (req, res) => {
  try {
    const contacts = await pool.query(
      `SELECT id, industry_segment, notes FROM ag_contacts WHERE country='MX'`
    );
    let updated = 0;
    for (const c of contacts.rows) {
      const commodity = detectCommodity((c.industry_segment||'') + ' ' + (c.notes||''));
      await pool.query(
        `UPDATE ag_contacts SET campaign_track=$1 WHERE id=$2`,
        [commodity, c.id]
      ).catch(()=>{});
      updated++;
    }
    res.json({ ok: true, classified: updated });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Search Mexico contacts by commodity
router.get('/search', async (req, res) => {
  const { commodity, q, limit=50, offset=0 } = req.query;
  try {
    const where = ["country='MX'"];
    const params = [];
    let idx = 1;

    if (commodity && commodity !== 'all') {
      params.push(`%${commodity}%`);
      where.push(`(campaign_track ILIKE $${idx} OR industry_segment ILIKE $${idx} OR notes ILIKE $${idx})`);
      idx++;
    }
    if (q) {
      params.push(`%${q}%`);
      where.push(`(contact_name ILIKE $${idx} OR company_name ILIKE $${idx} OR email ILIKE $${idx} OR state_province ILIKE $${idx} OR city ILIKE $${idx})`);
      idx++;
    }

    params.push(parseInt(limit));
    params.push(parseInt(offset));

    const sql = `SELECT id,email,contact_name,company_name,state_province,city,country,
      industry_segment,campaign_track,source,language_pref,created_at
      FROM ag_contacts
      WHERE ${where.join(' AND ')}
      ORDER BY company_name ASC
      LIMIT $${idx} OFFSET $${idx+1}`;

    const countSql = `SELECT COUNT(*) FROM ag_contacts WHERE ${where.join(' AND ')}`;

    const [rows, count] = await Promise.all([
      pool.query(sql, params),
      pool.query(countSql, params.slice(0, -2))
    ]);

    res.json({ ok: true, total: parseInt(count.rows[0].count), contacts: rows.rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Get commodity breakdown for Mexico
router.get('/commodities', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT
        COALESCE(campaign_track, industry_segment, 'agriculture') as commodity,
        COUNT(*) as count,
        COUNT(DISTINCT state_province) as states
      FROM ag_contacts
      WHERE country='MX'
      GROUP BY COALESCE(campaign_track, industry_segment, 'agriculture')
      ORDER BY count DESC
    `);
    res.json({ ok: true, commodities: r.rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Also search across ALL contact tables — unified grower+buyer+shipper+ag search
router.get('/unified', async (req, res) => {
  const { q, commodity, country, type, limit=100 } = req.query;
  try {
    const results = [];

    // Search growers
    if (!type || type==='grower') {
      const r = await pool.query(`
        SELECT id, legal_name as name, email, phone, state_region as state,
          city, country, 'grower' as crmtype, primary_products as commodity,
          certifications, status
        FROM growers
        WHERE ($1::text IS NULL OR legal_name ILIKE $1 OR email ILIKE $1 OR primary_products ILIKE $1)
        AND ($2::text IS NULL OR country=$2)
        AND ($3::text IS NULL OR primary_products ILIKE $3)
        LIMIT $4`,
        [q?`%${q}%`:null, country||null, commodity?`%${commodity}%`:null, Math.floor(parseInt(limit)/3)]
      ).catch(()=>({rows:[]}));
      results.push(...r.rows);
    }

    // Search buyers
    if (!type || type==='buyer') {
      const r = await pool.query(`
        SELECT id, company_name as name, email, phone, state, city, country,
          'buyer' as crmtype, commodities as commodity, NULL as certifications, 'active' as status
        FROM buyers
        WHERE ($1::text IS NULL OR company_name ILIKE $1 OR email ILIKE $1 OR commodities ILIKE $1)
        AND ($2::text IS NULL OR country=$2)
        AND ($3::text IS NULL OR commodities ILIKE $3)
        LIMIT $4`,
        [q?`%${q}%`:null, country||null, commodity?`%${commodity}%`:null, Math.floor(parseInt(limit)/3)]
      ).catch(()=>({rows:[]}));
      results.push(...r.rows);
    }

    // Search ag_contacts (Mexico SENASICA)
    if (!type || type==='mx_grower') {
      const r = await pool.query(`
        SELECT id, company_name as name, email, '' as phone, state_province as state,
          city, country, 'mx_grower' as crmtype,
          COALESCE(campaign_track, industry_segment) as commodity,
          NULL as certifications, 'active' as status
        FROM ag_contacts
        WHERE ($1::text IS NULL OR company_name ILIKE $1 OR email ILIKE $1 OR industry_segment ILIKE $1 OR campaign_track ILIKE $1)
        AND ($2::text IS NULL OR country=$2)
        AND ($3::text IS NULL OR campaign_track ILIKE $3 OR industry_segment ILIKE $3)
        LIMIT $4`,
        [q?`%${q}%`:null, country||null, commodity?`%${commodity}%`:null, Math.floor(parseInt(limit)/3)]
      ).catch(()=>({rows:[]}));
      results.push(...r.rows);
    }

    res.json({ ok: true, total: results.length, results });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
