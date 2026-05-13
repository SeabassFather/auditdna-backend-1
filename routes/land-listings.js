// land-listings.js — Universal Property Listings API
// Serves both enjoybaja.com and mexausafg.com
// Property types: Oceanfront, Residential, Agricultural, Commercial, Lot, Ranch, Development
// Save to: C:\AuditDNA\backend\routes\land-listings.js
const express = require('express');
const router  = express.Router();

const PROPERTY_TYPES = ['Oceanfront','Residential','Agricultural','Commercial','Vacant Lot','Rancho','Development Parcel','Mixed Use','Condo','Marina','Island'];
const AG_TYPES       = ['Agricultural','Rancho','Development Parcel'];

// GET /api/land-listings — all listings
router.get('/', async (req, res) => {
  const pool = req.app.get('db') || global.db;
  const { type, min_price, max_price, region, platform, featured } = req.query;
  try {
    let q = `SELECT * FROM land_listings WHERE status = 'active'`;
    const params = [];
    if (type)      { params.push(type);           q += ` AND property_type = $${params.length}`; }
    if (min_price) { params.push(min_price);       q += ` AND price_usd >= $${params.length}`; }
    if (max_price) { params.push(max_price);       q += ` AND price_usd <= $${params.length}`; }
    if (region)    { params.push(`%${region}%`);  q += ` AND region ILIKE $${params.length}`; }
    if (platform)  { params.push(platform);        q += ` AND (platform = $${params.length} OR platform = 'both')`; }
    if (featured === 'true') q += ` AND featured = true`;
    q += ` ORDER BY featured DESC, created_at DESC LIMIT 100`;
    const result = await pool.query(q, params);
    res.json({ ok: true, count: result.rows.length, listings: result.rows });
  } catch(e) {
    console.error('[land-listings] GET error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/land-listings/:id
router.get('/:id', async (req, res) => {
  const pool = req.app.get('db') || global.db;
  try {
    const r = await pool.query('SELECT * FROM land_listings WHERE id = $1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true, listing: r.rows[0] });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/land-listings — create listing (admin only)
router.post('/', async (req, res) => {
  const pool = req.app.get('db') || global.db;
  const {
    title, property_type, description, price_usd, price_mxn,
    region, state, municipality, address, lat, lng,
    size_sqm, size_hectares, bedrooms, bathrooms, parking,
    ocean_front, ocean_view, beach_access, pool, dock,
    platform = 'both', featured = false, status = 'active',
    images = [],
    // Agricultural fields
    water_rights, current_crop, soil_type, certifications,
    water_risk_score, food_security_zone, loaf_production_value,
    irrigated_hectares, well_depth_meters, annual_yield_tons,
    // Contact
    agent_name, agent_phone, agent_email,
    // MLS/ref
    ref_id, video_url, virtual_tour_url,
  } = req.body;

  try {
    const r = await pool.query(`
      INSERT INTO land_listings (
        title, property_type, description, price_usd, price_mxn,
        region, state, municipality, address, lat, lng,
        size_sqm, size_hectares, bedrooms, bathrooms, parking,
        ocean_front, ocean_view, beach_access, pool, dock,
        platform, featured, status, images,
        water_rights, current_crop, soil_type, certifications,
        water_risk_score, food_security_zone, loaf_production_value,
        irrigated_hectares, well_depth_meters, annual_yield_tons,
        agent_name, agent_phone, agent_email,
        ref_id, video_url, virtual_tour_url,
        created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
        $17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,
        $31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,NOW(),NOW()
      ) RETURNING *
    `, [
      title, property_type, description, price_usd, price_mxn,
      region, state, municipality, address, lat, lng,
      size_sqm, size_hectares, bedrooms, bathrooms, parking,
      ocean_front, ocean_view, beach_access, pool, dock,
      platform, featured, status, JSON.stringify(images),
      water_rights, current_crop, soil_type, certifications,
      water_risk_score, food_security_zone, loaf_production_value,
      irrigated_hectares, well_depth_meters, annual_yield_tons,
      agent_name, agent_phone, agent_email,
      ref_id, video_url, virtual_tour_url,
    ]);
    res.json({ ok: true, listing: r.rows[0] });
  } catch(e) {
    console.error('[land-listings] POST error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/land-listings/setup-table — create table if not exists
router.post('/setup-table', async (req, res) => {
  const pool = req.app.get('db') || global.db;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS land_listings (
        id                   SERIAL PRIMARY KEY,
        title                VARCHAR(300) NOT NULL,
        property_type        VARCHAR(60),
        description          TEXT,
        price_usd            NUMERIC(15,2),
        price_mxn            NUMERIC(15,2),
        region               VARCHAR(100),
        state                VARCHAR(100),
        municipality         VARCHAR(100),
        address              TEXT,
        lat                  NUMERIC(10,6),
        lng                  NUMERIC(10,6),
        size_sqm             NUMERIC(12,2),
        size_hectares        NUMERIC(12,4),
        bedrooms             INTEGER,
        bathrooms            NUMERIC(4,1),
        parking              INTEGER,
        ocean_front          BOOLEAN DEFAULT false,
        ocean_view           BOOLEAN DEFAULT false,
        beach_access         BOOLEAN DEFAULT false,
        pool                 BOOLEAN DEFAULT false,
        dock                 BOOLEAN DEFAULT false,
        platform             VARCHAR(20) DEFAULT 'both',
        featured             BOOLEAN DEFAULT false,
        status               VARCHAR(20) DEFAULT 'active',
        images               JSONB DEFAULT '[]',
        water_rights         VARCHAR(200),
        current_crop         VARCHAR(200),
        soil_type            VARCHAR(200),
        certifications       VARCHAR(300),
        water_risk_score     INTEGER,
        food_security_zone   VARCHAR(20),
        loaf_production_value NUMERIC(15,2),
        irrigated_hectares   NUMERIC(10,2),
        well_depth_meters    NUMERIC(8,1),
        annual_yield_tons    NUMERIC(10,2),
        agent_name           VARCHAR(200),
        agent_phone          VARCHAR(50),
        agent_email          VARCHAR(200),
        ref_id               VARCHAR(50),
        video_url            TEXT,
        virtual_tour_url     TEXT,
        views                INTEGER DEFAULT 0,
        created_at           TIMESTAMPTZ DEFAULT NOW(),
        updated_at           TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_land_listings_type ON land_listings(property_type);
      CREATE INDEX IF NOT EXISTS idx_land_listings_region ON land_listings(region);
      CREATE INDEX IF NOT EXISTS idx_land_listings_platform ON land_listings(platform);
      CREATE INDEX IF NOT EXISTS idx_land_listings_featured ON land_listings(featured);
    `);
    res.json({ ok: true, message: 'land_listings table ready' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
module.exports.PROPERTY_TYPES = PROPERTY_TYPES;
module.exports.AG_TYPES = AG_TYPES;
