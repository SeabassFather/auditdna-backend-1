const express = require('express');
const router  = express.Router();

router.get('/', async (req, res) => {
  const pool = req.app.get('db') || global.db;
  if (!pool) return res.status(500).json({ error: 'No DB pool' });
  const { type, region, platform, featured, min_price, max_price } = req.query;
  try {
    let q = "SELECT * FROM land_listings WHERE status = 'active'";
    const params = [];
    if (type)      { params.push(type);          q += ' AND property_type = $' + params.length; }
    if (region)    { params.push('%'+region+'%'); q += ' AND region ILIKE $' + params.length; }
    if (platform)  { params.push(platform);       q += " AND (platform = $" + params.length + " OR platform = 'both')"; }
    if (min_price) { params.push(min_price);      q += ' AND price_usd >= $' + params.length; }
    if (max_price) { params.push(max_price);      q += ' AND price_usd <= $' + params.length; }
    if (featured === 'true') q += ' AND featured = true';
    q += ' ORDER BY featured DESC, created_at DESC LIMIT 100';
    const result = await pool.query(q, params);
    res.json({ ok: true, count: result.rows.length, listings: result.rows });
  } catch(e) {
    console.error('[land-listings] GET error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  const pool = req.app.get('db') || global.db;
  if (!pool) return res.status(500).json({ error: 'No DB pool' });
  try {
    const r = await pool.query('SELECT * FROM land_listings WHERE id = $1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true, listing: r.rows[0] });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  const pool = req.app.get('db') || global.db;
  if (!pool) return res.status(500).json({ error: 'No DB pool' });
  try {
    const f = req.body;
    const r = await pool.query(
      `INSERT INTO land_listings (title,property_type,description,price_usd,price_mxn,region,state,municipality,
       address,lat,lng,size_sqm,size_hectares,bedrooms,bathrooms,parking,ocean_front,ocean_view,beach_access,
       pool,dock,platform,featured,status,water_rights,current_crop,soil_type,certifications,water_risk_score,
       food_security_zone,loaf_production_value,irrigated_hectares,well_depth_meters,annual_yield_tons,
       agent_name,agent_phone,agent_email,ref_id,video_url,virtual_tour_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
       $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40)
       RETURNING *`,
      [f.title,f.property_type,f.description,f.price_usd,f.price_mxn,f.region,f.state,f.municipality,
       f.address,f.lat,f.lng,f.size_sqm,f.size_hectares,f.bedrooms,f.bathrooms,f.parking,
       f.ocean_front,f.ocean_view,f.beach_access,f.pool,f.dock,f.platform||'both',f.featured||false,
       f.status||'active',f.water_rights,f.current_crop,f.soil_type,f.certifications,f.water_risk_score,
       f.food_security_zone,f.loaf_production_value,f.irrigated_hectares,f.well_depth_meters,f.annual_yield_tons,
       f.agent_name,f.agent_phone,f.agent_email,f.ref_id,f.video_url,f.virtual_tour_url]
    );
    res.json({ ok: true, listing: r.rows[0] });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
