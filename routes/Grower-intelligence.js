// ============================================================================
// GROWER INTELLIGENCE COMPANION ROUTES
// ============================================================================
// Mounts at: /api/grower-intelligence
// READS from existing growers table (23K+ contacts) - NEVER writes to it
// Creates own tables: grower_intel_yields, grower_intel_events
// Pulls from grower-recommendations and growerworkflow data
// Brain wired for all major operations
//
// Mexausa Food Group, Inc. | MexaUSA Food Group, Inc.
// ============================================================================

const express = require('express');
const router = express.Router();
const { pool } = require('../db');

let brain;
try { brain = require('../Brain'); } catch (e) { brain = null; }

const brainTask = (action, data, priority) => {
  if (brain && brain.assignTask) {
    brain.assignTask({ type: 'agriculture', module: 'Grower Intelligence', data: { action, ...data }, priority: priority || 'LOW' });
  }
};

// ============================================================================
// INIT: Intelligence tables ONLY (never touches growers table)
// ============================================================================
const initIntelTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS grower_intel_yields (
        id SERIAL PRIMARY KEY,
        grower_id INTEGER NOT NULL,
        grower_code VARCHAR(50),
        year INTEGER NOT NULL,
        yield_lbs INTEGER DEFAULT 0,
        yield_tons DECIMAL(12,2) DEFAULT 0,
        revenue DECIMAL(14,2) DEFAULT 0,
        acres_harvested DECIMAL(10,2) DEFAULT 0,
        yield_per_acre DECIMAL(10,2) DEFAULT 0,
        product VARCHAR(100),
        season VARCHAR(20),
        quality_avg DECIMAL(3,1),
        notes TEXT,
        source VARCHAR(50) DEFAULT 'manual',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(grower_id, year, product)
      );

      CREATE TABLE IF NOT EXISTS grower_intel_availability (
        id SERIAL PRIMARY KEY,
        grower_id INTEGER NOT NULL,
        grower_code VARCHAR(50),
        product VARCHAR(100) NOT NULL,
        available_lbs INTEGER DEFAULT 0,
        capacity_weekly_lbs INTEGER DEFAULT 0,
        next_harvest DATE,
        price_per_lb DECIMAL(8,4),
        open_market BOOLEAN DEFAULT true,
        updated_by VARCHAR(100) DEFAULT 'system',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(grower_id, product)
      );

      CREATE TABLE IF NOT EXISTS grower_intel_events (
        id SERIAL PRIMARY KEY,
        grower_id INTEGER,
        grower_code VARCHAR(50),
        event_type VARCHAR(50) NOT NULL,
        module_source VARCHAR(50) DEFAULT 'GROWER_INTELLIGENCE',
        data JSONB DEFAULT '{}',
        user_id VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_intel_yields_grower ON grower_intel_yields(grower_id);
      CREATE INDEX IF NOT EXISTS idx_intel_yields_year ON grower_intel_yields(year);
      CREATE INDEX IF NOT EXISTS idx_intel_avail_grower ON grower_intel_availability(grower_id);
      CREATE INDEX IF NOT EXISTS idx_intel_events_grower ON grower_intel_events(grower_id);
      CREATE INDEX IF NOT EXISTS idx_intel_events_type ON grower_intel_events(event_type);
    `);
    console.log('[GROWER-INTEL] Intelligence tables initialized');
  } catch (err) {
    console.error('[GROWER-INTEL] Table init error:', err.message);
  }
};
initIntelTables();

// ============================================================================
// GET /api/grower-intelligence/network - Network overview
// Reads existing growers table, aggregates stats
// ============================================================================
router.get('/network', async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT
        COUNT(*) as total_growers,
        COUNT(*) FILTER (WHERE status = 'active') as active_growers,
        COUNT(*) FILTER (WHERE verified = true) as verified_growers,
        COUNT(*) FILTER (WHERE small_grower_program = true) as small_program,
        COUNT(*) FILTER (WHERE tier_level = 0) as tier_0,
        COUNT(*) FILTER (WHERE tier_level = 1) as tier_1,
        COUNT(*) FILTER (WHERE tier_level = 2) as tier_2,
        COUNT(*) FILTER (WHERE tier_level = 3) as tier_3,
        COUNT(*) FILTER (WHERE fsma_compliant = true) as fsma_compliant,
        COUNT(*) FILTER (WHERE gfsi_certified = true) as gfsi_certified,
        COALESCE(SUM(total_acres), 0) as total_acres,
        COALESCE(SUM(annual_volume_tons), 0) as total_volume_tons,
        COALESCE(AVG(compliance_score), 0) as avg_compliance,
        COALESCE(AVG(total_acres), 0) as avg_acres
      FROM growers
    `);

    const byCountry = await pool.query(`
      SELECT country, COUNT(*) as count,
        SUM(total_acres) as acres,
        SUM(annual_volume_tons) as volume_tons
      FROM growers WHERE status = 'active'
      GROUP BY country ORDER BY count DESC
    `);

    const byState = await pool.query(`
      SELECT state_province, country, COUNT(*) as count
      FROM growers WHERE status = 'active' AND state_province IS NOT NULL
      GROUP BY state_province, country ORDER BY count DESC LIMIT 20
    `);

    const byCert = await pool.query(`
      SELECT certification_type, COUNT(*) as count
      FROM growers WHERE certification_type IS NOT NULL AND status = 'active'
      GROUP BY certification_type ORDER BY count DESC
    `);

    const byRisk = await pool.query(`
      SELECT risk_rating, COUNT(*) as count
      FROM growers WHERE status = 'active'
      GROUP BY risk_rating ORDER BY count DESC
    `);

    brainTask('network_viewed', { total: stats.rows[0]?.total_growers });

    res.json({
      success: true,
      stats: stats.rows[0],
      byCountry: byCountry.rows,
      byState: byState.rows,
      byCertification: byCert.rows,
      byRisk: byRisk.rows,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[GROWER-INTEL] Network error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// GET /api/grower-intelligence/directory - Enhanced grower directory
// Reads existing growers table with intelligence enrichment
// ============================================================================
router.get('/directory', async (req, res) => {
  try {
    const { country, tier, status, risk, search, fsma, verified, small, limit = 100, offset = 0 } = req.query;
    let query = `
      SELECT g.*,
        (SELECT COUNT(*) FROM grower_intel_yields y WHERE y.grower_id = g.id) as yield_records,
        (SELECT COALESCE(SUM(available_lbs), 0) FROM grower_intel_availability a WHERE a.grower_id = g.id) as intel_available_lbs
      FROM growers g WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (country) { query += ` AND g.country = $${idx++}`; params.push(country); }
    if (tier !== undefined) { query += ` AND g.tier_level = $${idx++}`; params.push(parseInt(tier)); }
    if (status) { query += ` AND g.status = $${idx++}`; params.push(status); }
    if (risk) { query += ` AND g.risk_rating = $${idx++}`; params.push(risk); }
    if (fsma === 'true') query += ' AND g.fsma_compliant = true';
    if (verified === 'true') query += ' AND g.verified = true';
    if (small === 'true') query += ' AND g.small_grower_program = true';
    if (search) {
      query += ` AND (g.company_name ILIKE $${idx} OR g.grower_code ILIKE $${idx} OR g.contact_name ILIKE $${idx} OR g.city ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    query += ` ORDER BY g.compliance_score DESC, g.company_name ASC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(parseInt(limit), parseInt(offset));

    const { rows } = await pool.query(query, params);
    const countRes = await pool.query('SELECT COUNT(*) FROM growers WHERE status = $1', [status || 'active']);

    brainTask('directory_viewed', { count: rows.length, filters: req.query });

    res.json({
      success: true,
      growers: rows,
      count: rows.length,
      total: parseInt(countRes.rows[0].count),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[GROWER-INTEL] Directory error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// GET /api/grower-intelligence/yields - Yield analytics from intel table
// ============================================================================
router.get('/yields', async (req, res) => {
  try {
    const { grower_id, year, product } = req.query;
    let query = `
      SELECT y.*, g.company_name, g.grower_code, g.country, g.state_province, g.tier_level
      FROM grower_intel_yields y
      JOIN growers g ON g.id = y.grower_id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (grower_id) { query += ` AND y.grower_id = $${idx++}`; params.push(parseInt(grower_id)); }
    if (year) { query += ` AND y.year = $${idx++}`; params.push(parseInt(year)); }
    if (product) { query += ` AND y.product ILIKE $${idx++}`; params.push(`%${product}%`); }

    query += ' ORDER BY y.year DESC, y.yield_lbs DESC';
    const { rows } = await pool.query(query, params);

    // Aggregate by year
    const byYear = {};
    rows.forEach(r => {
      if (!byYear[r.year]) byYear[r.year] = { year: r.year, total_lbs: 0, total_revenue: 0, growers: 0 };
      byYear[r.year].total_lbs += r.yield_lbs || 0;
      byYear[r.year].total_revenue += parseFloat(r.revenue || 0);
      byYear[r.year].growers++;
    });

    res.json({
      success: true,
      yields: rows,
      byYear: Object.values(byYear).sort((a, b) => b.year - a.year),
      count: rows.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[GROWER-INTEL] Yields error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// POST /api/grower-intelligence/yields - Record yield data
// ============================================================================
router.post('/yields', async (req, res) => {
  try {
    const { grower_id, grower_code, year, yield_lbs, yield_tons, revenue, acres_harvested, product, season, quality_avg, notes, source } = req.body;

    const yieldPerAcre = acres_harvested > 0 ? Math.round((yield_lbs || 0) / acres_harvested) : 0;

    const { rows } = await pool.query(`
      INSERT INTO grower_intel_yields (grower_id, grower_code, year, yield_lbs, yield_tons, revenue, acres_harvested, yield_per_acre, product, season, quality_avg, notes, source)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (grower_id, year, product)
      DO UPDATE SET yield_lbs=$4, yield_tons=$5, revenue=$6, acres_harvested=$7, yield_per_acre=$8, quality_avg=$11, notes=$12, updated_at=NOW()
      RETURNING *
    `, [grower_id, grower_code, year, yield_lbs || 0, yield_tons || 0, revenue || 0, acres_harvested || 0, yieldPerAcre, product, season, quality_avg, notes, source || 'manual']);

    await pool.query('INSERT INTO grower_intel_events (grower_id, grower_code, event_type, data) VALUES ($1,$2,$3,$4)',
      [grower_id, grower_code, 'YIELD_RECORDED', JSON.stringify({ year, product, yield_lbs, revenue })]);

    brainTask('yield_recorded', { grower_id, year, product, yield_lbs }, 'NORMAL');

    res.status(201).json({ success: true, yield: rows[0] });
  } catch (err) {
    console.error('[GROWER-INTEL] Yield record error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// GET /api/grower-intelligence/availability - Current availability
// ============================================================================
router.get('/availability', async (req, res) => {
  try {
    const { product, open_market } = req.query;
    let query = `
      SELECT a.*, g.company_name, g.grower_code, g.country, g.state_province,
        g.tier_level, g.certification_type, g.compliance_score
      FROM grower_intel_availability a
      JOIN growers g ON g.id = a.grower_id
      WHERE g.status = 'active'
    `;
    const params = [];
    let idx = 1;

    if (product) { query += ` AND a.product ILIKE $${idx++}`; params.push(`%${product}%`); }
    if (open_market === 'true') query += ' AND a.open_market = true';

    query += ' ORDER BY a.available_lbs DESC';
    const { rows } = await pool.query(query, params);

    const totalAvail = rows.reduce((s, r) => s + (r.available_lbs || 0), 0);
    const totalCapacity = rows.reduce((s, r) => s + (r.capacity_weekly_lbs || 0), 0);

    res.json({
      success: true,
      availability: rows,
      summary: { totalAvailable: totalAvail, totalCapacity, growerCount: rows.length },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[GROWER-INTEL] Availability error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// POST /api/grower-intelligence/availability - Update availability
// ============================================================================
router.post('/availability', async (req, res) => {
  try {
    const { grower_id, grower_code, product, available_lbs, capacity_weekly_lbs, next_harvest, price_per_lb, open_market } = req.body;

    const { rows } = await pool.query(`
      INSERT INTO grower_intel_availability (grower_id, grower_code, product, available_lbs, capacity_weekly_lbs, next_harvest, price_per_lb, open_market)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (grower_id, product)
      DO UPDATE SET available_lbs=$4, capacity_weekly_lbs=$5, next_harvest=$6, price_per_lb=$7, open_market=$8, updated_at=NOW()
      RETURNING *
    `, [grower_id, grower_code, product, available_lbs || 0, capacity_weekly_lbs || 0, next_harvest, price_per_lb, open_market !== false]);

    brainTask('availability_updated', { grower_id, product, available_lbs }, 'NORMAL');

    res.status(201).json({ success: true, availability: rows[0] });
  } catch (err) {
    console.error('[GROWER-INTEL] Availability update error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// GET /api/grower-intelligence/certifications - Cert analysis from growers table
// ============================================================================
router.get('/certifications', async (req, res) => {
  try {
    const byCert = await pool.query(`
      SELECT certification_type, COUNT(*) as count,
        COUNT(*) FILTER (WHERE verified = true) as verified,
        COUNT(*) FILTER (WHERE fsma_compliant = true) as fsma,
        COUNT(*) FILTER (WHERE gfsi_certified = true) as gfsi,
        AVG(compliance_score) as avg_compliance
      FROM growers
      WHERE status = 'active' AND certification_type IS NOT NULL
      GROUP BY certification_type ORDER BY count DESC
    `);

    const expiring = await pool.query(`
      SELECT id, grower_code, company_name, certification_type, certification_number, certification_expiry
      FROM growers
      WHERE certification_expiry IS NOT NULL
        AND certification_expiry <= NOW() + INTERVAL '90 days'
        AND status = 'active'
      ORDER BY certification_expiry ASC LIMIT 50
    `);

    const complianceDist = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE compliance_score >= 90) as excellent,
        COUNT(*) FILTER (WHERE compliance_score >= 70 AND compliance_score < 90) as good,
        COUNT(*) FILTER (WHERE compliance_score >= 50 AND compliance_score < 70) as needs_improvement,
        COUNT(*) FILTER (WHERE compliance_score < 50) as critical,
        COUNT(*) FILTER (WHERE compliance_score = 0 OR compliance_score IS NULL) as unscored
      FROM growers WHERE status = 'active'
    `);

    brainTask('certifications_analyzed', { certTypes: byCert.rows.length, expiring: expiring.rows.length });

    res.json({
      success: true,
      byCertification: byCert.rows,
      expiringSoon: expiring.rows,
      complianceDistribution: complianceDist.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[GROWER-INTEL] Certs error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// GET /api/grower-intelligence/small-grower - Small grower program analytics
// ============================================================================
router.get('/small-grower', async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE small_grower_program = true) as enrolled,
        COUNT(*) FILTER (WHERE total_acres < 50) as under_50_acres,
        COUNT(*) FILTER (WHERE total_acres >= 50 AND total_acres < 200) as acres_50_200,
        COUNT(*) FILTER (WHERE fsma_compliant = true AND small_grower_program = true) as fsma_enrolled,
        AVG(compliance_score) FILTER (WHERE small_grower_program = true) as avg_compliance_enrolled,
        AVG(compliance_score) FILTER (WHERE small_grower_program = false OR small_grower_program IS NULL) as avg_compliance_not_enrolled
      FROM growers WHERE status = 'active'
    `);

    const byTier = await pool.query(`
      SELECT tier_level, COUNT(*) as count, AVG(compliance_score) as avg_score
      FROM growers WHERE status = 'active'
      GROUP BY tier_level ORDER BY tier_level
    `);

    const smallGrowers = await pool.query(`
      SELECT id, grower_code, company_name, country, state_province, total_acres,
        tier_level, compliance_score, risk_rating, fsma_compliant, gfsi_certified,
        certification_type, primary_products
      FROM growers
      WHERE status = 'active' AND (small_grower_program = true OR total_acres < 200)
      ORDER BY compliance_score DESC LIMIT 50
    `);

    res.json({
      success: true,
      stats: stats.rows[0],
      byTier: byTier.rows,
      smallGrowers: smallGrowers.rows,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[GROWER-INTEL] Small grower error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// GET /api/grower-intelligence/grower/:id - Single grower intelligence profile
// Aggregates from growers + intel tables + workflow + recommendations
// ============================================================================
router.get('/grower/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const grower = await pool.query('SELECT * FROM growers WHERE id = $1 OR grower_code = $1', [id]);
    if (grower.rows.length === 0) return res.status(404).json({ success: false, error: 'Grower not found' });

    const g = grower.rows[0];
    const growerId = g.id;

    const yields = await pool.query('SELECT * FROM grower_intel_yields WHERE grower_id = $1 ORDER BY year DESC', [growerId]);
    const availability = await pool.query('SELECT * FROM grower_intel_availability WHERE grower_id = $1', [growerId]);
    const events = await pool.query('SELECT * FROM grower_intel_events WHERE grower_id = $1 ORDER BY created_at DESC LIMIT 30', [growerId]);

    // Try to get workflow data
    let workflow = null;
    try {
      const wf = await pool.query('SELECT * FROM grower_workflows WHERE grower_id = $1 ORDER BY created_at DESC LIMIT 1', [growerId]);
      if (wf.rows.length > 0) workflow = wf.rows[0];
    } catch (e) { /* workflow table may not exist yet */ }

    brainTask('grower_profile_viewed', { id: growerId, name: g.company_name }, 'LOW');

    res.json({
      success: true,
      grower: g,
      intelligence: {
        yields: yields.rows,
        availability: availability.rows,
        recentEvents: events.rows,
        workflow
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[GROWER-INTEL] Profile error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// GET /api/grower-intelligence/products - Product coverage across network
// ============================================================================
router.get('/products', async (req, res) => {
  try {
    // From crops_grown array
    const crops = await pool.query(`
      SELECT unnest(crops_grown) as crop, COUNT(*) as grower_count
      FROM growers WHERE status = 'active' AND crops_grown IS NOT NULL
      GROUP BY crop ORDER BY grower_count DESC
    `);

    // From primary_products array
    const primary = await pool.query(`
      SELECT unnest(primary_products) as product, COUNT(*) as grower_count
      FROM growers WHERE status = 'active' AND primary_products IS NOT NULL
      GROUP BY product ORDER BY grower_count DESC
    `);

    res.json({
      success: true,
      cropsGrown: crops.rows,
      primaryProducts: primary.rows,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[GROWER-INTEL] Products error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// POST /api/grower-intelligence/event - Log intelligence event
// ============================================================================
router.post('/event', async (req, res) => {
  try {
    const { grower_id, grower_code, event_type, data, user_id } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO grower_intel_events (grower_id, grower_code, event_type, data, user_id) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [grower_id, grower_code, event_type, JSON.stringify(data || {}), user_id || 'SYSTEM']
    );
    brainTask('intel_event', { grower_id, event_type }, 'LOW');
    res.status(201).json({ success: true, event: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

console.log('[GROWER-INTEL] Routes loaded: /network, /directory, /yields, /availability, /certifications, /small-grower, /grower/:id, /products, /event');

module.exports = router;
