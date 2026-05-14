// routes/data-lake.js
// AuditDNA — Master Agricultural Intelligence Data Lake
// Entity IDs, Lot Passport, FSMA 204 CTEs/KDEs, Immutable Audit Trail,
// USDA/FDA/SENASICA Connectors, Cross-Border Intelligence, AI Learning,
// Consumer QR Traceability, Regulatory Intelligence Layer

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// ─── SETUP ALL DATA LAKE TABLES ──────────────────────────────────────────────
router.post('/setup', async (req, res) => {
  try {
    await pool.query(`

      -- ── UNIVERSAL ENTITY ID REGISTRY ──────────────────────────────────────
      CREATE TABLE IF NOT EXISTS entity_registry (
        id SERIAL PRIMARY KEY,
        entity_id VARCHAR(40) UNIQUE NOT NULL,
        entity_type VARCHAR(30) NOT NULL, -- ranch, field, pallet, grower, buyer, shipment, warehouse, carrier, inspection, lot, consumer_qr
        real_name VARCHAR(200),
        blind_id VARCHAR(30),
        country VARCHAR(60),
        region VARCHAR(100),
        gps_lat NUMERIC(10,7),
        gps_lng NUMERIC(10,7),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- ── MASTER LOT REGISTRY ────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS lot_registry (
        id SERIAL PRIMARY KEY,
        lot_id VARCHAR(40) UNIQUE NOT NULL,
        grower_entity_id VARCHAR(40) REFERENCES entity_registry(entity_id),
        ranch_entity_id VARCHAR(40),
        field_entity_id VARCHAR(40),
        commodity VARCHAR(100) NOT NULL,
        variety VARCHAR(100),
        origin_country VARCHAR(60),
        origin_region VARCHAR(100),
        gps_lat NUMERIC(10,7),
        gps_lng NUMERIC(10,7),
        harvest_date DATE,
        pack_date DATE,
        total_lbs NUMERIC(12,2),
        total_cartons INTEGER,
        pallet_count INTEGER,
        status VARCHAR(30) DEFAULT 'active',
        qr_token VARCHAR(80) UNIQUE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- ── LOT PASSPORT ──────────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS lot_passport (
        id SERIAL PRIMARY KEY,
        lot_id VARCHAR(40) REFERENCES lot_registry(lot_id),
        harvest_crew_size INTEGER,
        harvest_supervisor VARCHAR(100),
        water_source VARCHAR(100),
        water_test_result VARCHAR(30),
        water_test_date DATE,
        soil_test_result VARCHAR(30),
        soil_test_date DATE,
        spray_records JSONB DEFAULT '[]',
        temp_at_harvest NUMERIC(5,2),
        temp_at_cooldown NUMERIC(5,2),
        field_photos JSONB DEFAULT '[]',
        inspection_records JSONB DEFAULT '[]',
        lab_results JSONB DEFAULT '[]',
        certifications JSONB DEFAULT '[]',
        sustainability_score NUMERIC(4,1),
        carbon_score NUMERIC(6,2),
        fsma_compliant BOOLEAN DEFAULT FALSE,
        gap_verified BOOLEAN DEFAULT FALSE,
        globalgap_verified BOOLEAN DEFAULT FALSE,
        senasica_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- ── FSMA 204 CTEs (Critical Tracking Events) ─────────────────────────
      CREATE TABLE IF NOT EXISTS fsma_ctes (
        id SERIAL PRIMARY KEY,
        cte_id VARCHAR(40) UNIQUE NOT NULL,
        lot_id VARCHAR(40) REFERENCES lot_registry(lot_id),
        cte_type VARCHAR(60) NOT NULL, -- harvesting, cooling, initial_packing, first_land_based_receiver, shipping, receiving, transformation
        entity_id VARCHAR(40), -- who performed this CTE
        entity_type VARCHAR(30),
        location_name VARCHAR(200),
        location_address VARCHAR(300),
        gps_lat NUMERIC(10,7),
        gps_lng NUMERIC(10,7),
        event_timestamp TIMESTAMP NOT NULL,
        commodity VARCHAR(100),
        quantity_lbs NUMERIC(12,2),
        reference_document VARCHAR(200),
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- ── FSMA 204 KDEs (Key Data Elements) ────────────────────────────────
      CREATE TABLE IF NOT EXISTS fsma_kdes (
        id SERIAL PRIMARY KEY,
        cte_id VARCHAR(40) REFERENCES fsma_ctes(cte_id),
        lot_id VARCHAR(40),
        kde_name VARCHAR(100) NOT NULL,
        kde_value TEXT,
        kde_unit VARCHAR(30),
        required BOOLEAN DEFAULT TRUE,
        verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- ── SUPPLY CHAIN EVENT LEDGER ─────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS supply_chain_events (
        id SERIAL PRIMARY KEY,
        event_id VARCHAR(40) UNIQUE NOT NULL,
        lot_id VARCHAR(40),
        event_type VARCHAR(60) NOT NULL, -- field_harvested, pallet_created, cooler_received, shipped, border_crossed, warehouse_received, wholesaler_sold, retailer_received, consumer_scanned
        from_entity_id VARCHAR(40),
        to_entity_id VARCHAR(40),
        carrier_entity_id VARCHAR(40),
        temp_celsius NUMERIC(5,2),
        humidity_pct NUMERIC(5,2),
        location_name VARCHAR(200),
        gps_lat NUMERIC(10,7),
        gps_lng NUMERIC(10,7),
        quantity_lbs NUMERIC(12,2),
        carton_count INTEGER,
        pallet_count INTEGER,
        reference_doc VARCHAR(200),
        border_crossing VARCHAR(100),
        customs_entry VARCHAR(100),
        inspection_result VARCHAR(30),
        notes TEXT,
        event_timestamp TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- ── PALLET REGISTRY ───────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS pallet_registry (
        id SERIAL PRIMARY KEY,
        pallet_id VARCHAR(40) UNIQUE NOT NULL,
        lot_id VARCHAR(40) REFERENCES lot_registry(lot_id),
        carton_count INTEGER,
        weight_lbs NUMERIC(10,2),
        commodity VARCHAR(100),
        pack_date DATE,
        pack_facility VARCHAR(200),
        current_location VARCHAR(200),
        current_temp NUMERIC(5,2),
        status VARCHAR(30) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- ── IMMUTABLE AUDIT TRAIL ─────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS audit_trail (
        id SERIAL PRIMARY KEY,
        trail_id VARCHAR(40) UNIQUE NOT NULL,
        table_name VARCHAR(60) NOT NULL,
        record_id VARCHAR(40) NOT NULL,
        action VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
        changed_by_user_id INTEGER,
        changed_by_role VARCHAR(30),
        changed_by_ip VARCHAR(50),
        field_name VARCHAR(100),
        old_value TEXT,
        new_value TEXT,
        reason TEXT,
        timestamp TIMESTAMP DEFAULT NOW()
      );

      -- ── PRODUCTION DATA LAKE ─────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS production_data (
        id SERIAL PRIMARY KEY,
        grower_entity_id VARCHAR(40),
        ranch_entity_id VARCHAR(40),
        field_entity_id VARCHAR(40),
        commodity VARCHAR(100),
        variety VARCHAR(100),
        season_year INTEGER,
        planted_date DATE,
        harvest_date DATE,
        acreage NUMERIC(10,2),
        yield_lbs_per_acre NUMERIC(10,2),
        total_yield_lbs NUMERIC(12,2),
        water_usage_acre_ft NUMERIC(10,3),
        fertilizer_records JSONB DEFAULT '[]',
        spray_records JSONB DEFAULT '[]',
        labor_hours NUMERIC(10,2),
        labor_cost NUMERIC(12,2),
        total_cost NUMERIC(14,2),
        revenue NUMERIC(14,2),
        ndvi_score NUMERIC(5,2),
        soil_ph NUMERIC(4,2),
        weather_notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- ── FINANCIAL DATA LAKE ───────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS financial_data_lake (
        id SERIAL PRIMARY KEY,
        entity_id VARCHAR(40),
        entity_type VARCHAR(30),
        transaction_type VARCHAR(40), -- invoice, payment, claim, deduction, factoring, po_finance, escrow
        amount NUMERIC(14,2),
        currency VARCHAR(10) DEFAULT 'USD',
        related_lot_id VARCHAR(40),
        related_po VARCHAR(40),
        counterparty_blind_id VARCHAR(30),
        payment_date DATE,
        due_date DATE,
        status VARCHAR(30),
        notes TEXT,
        source VARCHAR(60), -- platform, quickbooks, erp, manual
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- ── USDA MARKET DATA CACHE ────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS usda_market_data (
        id SERIAL PRIMARY KEY,
        commodity VARCHAR(100),
        market VARCHAR(100),
        region VARCHAR(100),
        price_low NUMERIC(10,2),
        price_high NUMERIC(10,2),
        price_avg NUMERIC(10,2),
        volume_lbs NUMERIC(14,2),
        pricing_date DATE,
        movement VARCHAR(30),
        quality VARCHAR(30),
        source VARCHAR(60) DEFAULT 'USDA_AMS',
        fetched_at TIMESTAMP DEFAULT NOW()
      );

      -- ── FDA INTELLIGENCE ──────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS fda_intelligence (
        id SERIAL PRIMARY KEY,
        record_type VARCHAR(40), -- recall, warning_letter, outbreak, import_alert, inspection
        commodity VARCHAR(100),
        company VARCHAR(200),
        reason TEXT,
        country_origin VARCHAR(60),
        region VARCHAR(100),
        severity VARCHAR(20),
        effective_date DATE,
        resolved_date DATE,
        fda_reference VARCHAR(100),
        raw_data JSONB,
        fetched_at TIMESTAMP DEFAULT NOW()
      );

      -- ── SENASICA INTELLIGENCE ─────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS senasica_intelligence (
        id SERIAL PRIMARY KEY,
        record_type VARCHAR(40), -- certification, inspection, phytosanitary, approved_facility
        entity_name VARCHAR(200),
        entity_type VARCHAR(60),
        commodity VARCHAR(100),
        region VARCHAR(100),
        state_mexico VARCHAR(60),
        certificate_number VARCHAR(100),
        valid_from DATE,
        valid_until DATE,
        status VARCHAR(30),
        inspection_result VARCHAR(30),
        raw_data JSONB,
        fetched_at TIMESTAMP DEFAULT NOW()
      );

      -- ── CROSS-BORDER INTELLIGENCE ─────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS cross_border_intel (
        id SERIAL PRIMARY KEY,
        border_crossing VARCHAR(100),
        crossing_direction VARCHAR(10), -- MX_US, US_MX, MX_CA
        date_recorded DATE,
        commodity VARCHAR(100),
        volume_lbs NUMERIC(14,2),
        avg_wait_hours NUMERIC(6,2),
        inspection_rate_pct NUMERIC(5,2),
        rejection_rate_pct NUMERIC(5,2),
        tariff_rate_pct NUMERIC(5,2),
        phytosanitary_restriction BOOLEAN DEFAULT FALSE,
        restriction_reason TEXT,
        weather_impact VARCHAR(30),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- ── AI PREDICTIONS ────────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS ai_predictions (
        id SERIAL PRIMARY KEY,
        prediction_type VARCHAR(60), -- shortage, spoilage, recall, outbreak, pricing_spike, fraud, transport_failure
        commodity VARCHAR(100),
        region VARCHAR(100),
        confidence_score NUMERIC(5,2),
        predicted_value TEXT,
        predicted_date DATE,
        actual_value TEXT,
        accuracy_score NUMERIC(5,2),
        model_version VARCHAR(20),
        data_points_used INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- ── GRAPH RELATIONSHIPS ───────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS entity_graph (
        id SERIAL PRIMARY KEY,
        from_entity_id VARCHAR(40),
        from_type VARCHAR(30),
        relationship VARCHAR(60), -- shipped_through, sold_to, carried_by, inspected_by, associated_with, originated_from
        to_entity_id VARCHAR(40),
        to_type VARCHAR(30),
        lot_id VARCHAR(40),
        weight NUMERIC(5,2) DEFAULT 1.0,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- ── CONSUMER QR SCANS ─────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS consumer_qr_scans (
        id SERIAL PRIMARY KEY,
        qr_token VARCHAR(80),
        lot_id VARCHAR(40),
        scan_timestamp TIMESTAMP DEFAULT NOW(),
        consumer_location_country VARCHAR(60),
        consumer_location_region VARCHAR(100),
        device_type VARCHAR(30),
        retailer VARCHAR(200),
        scan_count INTEGER DEFAULT 1
      );

      -- ── DATA NORMALIZATION QUEUE ──────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS normalization_queue (
        id SERIAL PRIMARY KEY,
        source_type VARCHAR(40), -- pdf, email, manifest, erp_export, spreadsheet, quickbooks
        source_name VARCHAR(200),
        raw_content TEXT,
        normalized_data JSONB,
        status VARCHAR(20) DEFAULT 'pending', -- pending, processing, normalized, failed
        entity_type VARCHAR(40),
        created_at TIMESTAMP DEFAULT NOW(),
        processed_at TIMESTAMP
      );

      -- ── REGULATORY COMPLIANCE TRACKER ────────────────────────────────────
      CREATE TABLE IF NOT EXISTS regulatory_tracker (
        id SERIAL PRIMARY KEY,
        entity_id VARCHAR(40),
        entity_type VARCHAR(30),
        regulation VARCHAR(60), -- FSMA_204, FDA_PRIOR_NOTICE, USDA_GAP, SENASICA, GLOBALGAP, PACA
        status VARCHAR(30), -- compliant, gap_detected, expired, pending_renewal
        last_audit_date DATE,
        next_audit_date DATE,
        missing_items JSONB DEFAULT '[]',
        auto_report_ready BOOLEAN DEFAULT FALSE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- INDEXES
      CREATE INDEX IF NOT EXISTS idx_lot_commodity ON lot_registry(commodity);
      CREATE INDEX IF NOT EXISTS idx_lot_origin ON lot_registry(origin_country, origin_region);
      CREATE INDEX IF NOT EXISTS idx_sce_lot ON supply_chain_events(lot_id);
      CREATE INDEX IF NOT EXISTS idx_sce_type ON supply_chain_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_audit_table ON audit_trail(table_name, record_id);
      CREATE INDEX IF NOT EXISTS idx_entity_type ON entity_registry(entity_type);
      CREATE INDEX IF NOT EXISTS idx_usda_commodity ON usda_market_data(commodity, pricing_date);
      CREATE INDEX IF NOT EXISTS idx_graph_from ON entity_graph(from_entity_id);
      CREATE INDEX IF NOT EXISTS idx_graph_to ON entity_graph(to_entity_id);
    `);
    res.json({ success: true, message: 'Agricultural Data Lake fully initialized.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── ENTITY ID GENERATOR ──────────────────────────────────────────────────────
function generateEntityId(type) {
  const prefixes = { ranch:'RNC', field:'FLD', pallet:'PLT', grower:'GRW', buyer:'BYR', shipment:'SHP', warehouse:'WHS', carrier:'CAR', inspection:'INS', lot:'LOT', consumer_qr:'QRC', broker:'BRK', shipper:'SHR', wholesaler:'WSL', retailer:'RTL' };
  const prefix = prefixes[type] || 'ENT';
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2,6).toUpperCase()}`;
}

function generateQRToken() { return `QR-${Date.now()}-${Math.random().toString(36).substr(2,12).toUpperCase()}`; }
function generateCTEId() { return `CTE-${Date.now()}-${Math.random().toString(36).substr(2,8).toUpperCase()}`; }
function generateTrailId() { return `TRL-${Date.now()}-${Math.random().toString(36).substr(2,8).toUpperCase()}`; }
function generateEventId() { return `EVT-${Date.now()}-${Math.random().toString(36).substr(2,8).toUpperCase()}`; }

// ─── AUDIT LOGGER ─────────────────────────────────────────────────────────────
async function logAudit(table_name, record_id, action, user_id, role, field, old_val, new_val, reason = '') {
  try {
    await pool.query(
      `INSERT INTO audit_trail (trail_id, table_name, record_id, action, changed_by_user_id, changed_by_role, field_name, old_value, new_value, reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [generateTrailId(), table_name, String(record_id), action, user_id, role, field, String(old_val), String(new_val), reason]
    );
  } catch {}
}

// ─── REGISTER ENTITY ──────────────────────────────────────────────────────────
router.post('/entity/register', async (req, res) => {
  const { entity_type, real_name, country, region, gps_lat, gps_lng, metadata } = req.body;
  try {
    const entity_id = generateEntityId(entity_type);
    const blind_id = `${entity_id.split('-')[0]}-BLIND-${Math.floor(Math.random()*90000+10000)}`;
    const result = await pool.query(
      `INSERT INTO entity_registry (entity_id, entity_type, real_name, blind_id, country, region, gps_lat, gps_lng, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [entity_id, entity_type, real_name, blind_id, country, region, gps_lat, gps_lng, JSON.stringify(metadata || {})]
    );
    await logAudit('entity_registry', entity_id, 'INSERT', req.body.user_id, req.body.role, 'entity_id', null, entity_id, 'Entity registered');
    res.json({ success: true, entity: result.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── CREATE LOT ───────────────────────────────────────────────────────────────
router.post('/lot/create', async (req, res) => {
  const { grower_entity_id, ranch_entity_id, field_entity_id, commodity, variety, origin_country, origin_region, gps_lat, gps_lng, harvest_date, pack_date, total_lbs, total_cartons, pallet_count } = req.body;
  try {
    const lot_id = generateEntityId('lot');
    const qr_token = generateQRToken();

    const lot = await pool.query(
      `INSERT INTO lot_registry (lot_id, grower_entity_id, ranch_entity_id, field_entity_id, commodity, variety, origin_country, origin_region, gps_lat, gps_lng, harvest_date, pack_date, total_lbs, total_cartons, pallet_count, qr_token)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [lot_id, grower_entity_id, ranch_entity_id, field_entity_id, commodity, variety, origin_country, origin_region, gps_lat, gps_lng, harvest_date, pack_date, total_lbs, total_cartons, pallet_count, qr_token]
    );

    // Seed empty lot passport
    await pool.query('INSERT INTO lot_passport (lot_id) VALUES ($1)', [lot_id]);

    // Seed FSMA 204 required CTEs
    const required_ctes = ['harvesting', 'cooling', 'initial_packing', 'first_land_based_receiver', 'shipping'];
    for (const cte_type of required_ctes) {
      const cte_id = generateCTEId();
      await pool.query(
        `INSERT INTO fsma_ctes (cte_id, lot_id, cte_type, commodity, event_timestamp) VALUES ($1,$2,$3,$4,NOW())`,
        [cte_id, lot_id, cte_type, commodity]
      );
    }

    // Register graph node
    if (grower_entity_id) {
      await pool.query(
        `INSERT INTO entity_graph (from_entity_id, from_type, relationship, to_entity_id, to_type, lot_id) VALUES ($1,'grower','produced',$2,'lot',$3)`,
        [grower_entity_id, lot_id, lot_id]
      );
    }

    await logAudit('lot_registry', lot_id, 'INSERT', req.body.user_id, 'grower', 'lot_id', null, lot_id, 'Lot created');

    res.json({ success: true, lot: lot.rows[0], qr_token, lot_id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── UPDATE LOT PASSPORT ──────────────────────────────────────────────────────
router.post('/lot/:lot_id/passport', async (req, res) => {
  const { lot_id } = req.params;
  const { harvest_crew_size, water_source, water_test_result, water_test_date, soil_test_result, spray_records, temp_at_harvest, temp_at_cooldown, certifications, sustainability_score, carbon_score, fsma_compliant, gap_verified, globalgap_verified, senasica_verified } = req.body;
  try {
    await pool.query(
      `UPDATE lot_passport SET harvest_crew_size=$1, water_source=$2, water_test_result=$3, water_test_date=$4, soil_test_result=$5, spray_records=$6, temp_at_harvest=$7, temp_at_cooldown=$8, certifications=$9, sustainability_score=$10, carbon_score=$11, fsma_compliant=$12, gap_verified=$13, globalgap_verified=$14, senasica_verified=$15, updated_at=NOW()
       WHERE lot_id=$16`,
      [harvest_crew_size, water_source, water_test_result, water_test_date, soil_test_result, JSON.stringify(spray_records||[]), temp_at_harvest, temp_at_cooldown, JSON.stringify(certifications||[]), sustainability_score, carbon_score, fsma_compliant, gap_verified, globalgap_verified, senasica_verified, lot_id]
    );
    await logAudit('lot_passport', lot_id, 'UPDATE', req.body.user_id, 'grower', 'passport', null, 'updated', 'Lot passport updated');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GET LOT PASSPORT (FULL — ADMIN) ─────────────────────────────────────────
router.get('/lot/:lot_id/passport/full', async (req, res) => {
  try {
    const lot = await pool.query('SELECT * FROM lot_registry WHERE lot_id=$1', [req.params.lot_id]);
    const passport = await pool.query('SELECT * FROM lot_passport WHERE lot_id=$1', [req.params.lot_id]);
    const ctes = await pool.query('SELECT * FROM fsma_ctes WHERE lot_id=$1 ORDER BY event_timestamp', [req.params.lot_id]);
    const events = await pool.query('SELECT * FROM supply_chain_events WHERE lot_id=$1 ORDER BY event_timestamp', [req.params.lot_id]);
    const graph = await pool.query('SELECT * FROM entity_graph WHERE lot_id=$1', [req.params.lot_id]);
    const certs = await pool.query('SELECT * FROM traceability_certs WHERE po_id IN (SELECT id FROM purchase_orders WHERE blind_grower_id IN (SELECT blind_id FROM entity_registry WHERE entity_id=$1))', [req.params.lot_id]).catch(() => ({ rows: [] }));

    res.json({
      lot: lot.rows[0],
      passport: passport.rows[0],
      ctes: ctes.rows,
      supply_chain: events.rows,
      graph: graph.rows,
      cert_checklist: certs.rows
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GET LOT PASSPORT (CONSUMER — BLIND) ─────────────────────────────────────
router.get('/qr/:qr_token', async (req, res) => {
  try {
    const lot = await pool.query('SELECT lot_id, commodity, variety, origin_country, origin_region, harvest_date, pack_date FROM lot_registry WHERE qr_token=$1', [req.params.qr_token]);
    if (!lot.rows.length) return res.status(404).json({ error: 'QR not found' });

    const passport = await pool.query(
      'SELECT water_test_result, certifications, sustainability_score, carbon_score, fsma_compliant, gap_verified, globalgap_verified, senasica_verified FROM lot_passport WHERE lot_id=$1',
      [lot.rows[0].lot_id]
    );

    const events = await pool.query(
      `SELECT event_type, location_name, event_timestamp, border_crossing FROM supply_chain_events WHERE lot_id=$1 ORDER BY event_timestamp`,
      [lot.rows[0].lot_id]
    );

    // Log consumer scan
    await pool.query(
      'INSERT INTO consumer_qr_scans (qr_token, lot_id, consumer_location_country) VALUES ($1,$2,$3)',
      [req.params.qr_token, lot.rows[0].lot_id, req.headers['cf-ipcountry'] || 'Unknown']
    );

    res.json({
      lot: lot.rows[0],
      passport: passport.rows[0],
      supply_chain: events.rows,
      message: 'AuditDNA Agriculture Intelligence — Verified Supply Chain'
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── LOG SUPPLY CHAIN EVENT ───────────────────────────────────────────────────
router.post('/lot/:lot_id/event', async (req, res) => {
  const { lot_id } = req.params;
  const { event_type, from_entity_id, to_entity_id, carrier_entity_id, temp_celsius, humidity_pct, location_name, gps_lat, gps_lng, quantity_lbs, carton_count, pallet_count, reference_doc, border_crossing, customs_entry, inspection_result, notes, event_timestamp } = req.body;
  try {
    const event_id = generateEventId();
    await pool.query(
      `INSERT INTO supply_chain_events (event_id, lot_id, event_type, from_entity_id, to_entity_id, carrier_entity_id, temp_celsius, humidity_pct, location_name, gps_lat, gps_lng, quantity_lbs, carton_count, pallet_count, reference_doc, border_crossing, customs_entry, inspection_result, notes, event_timestamp)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
      [event_id, lot_id, event_type, from_entity_id, to_entity_id, carrier_entity_id, temp_celsius, humidity_pct, location_name, gps_lat, gps_lng, quantity_lbs, carton_count, pallet_count, reference_doc, border_crossing, customs_entry, inspection_result, notes, event_timestamp || new Date()]
    );

    // Graph relationship
    if (from_entity_id && to_entity_id) {
      await pool.query(
        `INSERT INTO entity_graph (from_entity_id, from_type, relationship, to_entity_id, to_type, lot_id, metadata) VALUES ($1,'entity',$2,$3,'entity',$4,$5)`,
        [from_entity_id, event_type, to_entity_id, lot_id, JSON.stringify({ temp_celsius, border_crossing })]
      );
    }

    await logAudit('supply_chain_events', event_id, 'INSERT', req.body.user_id, req.body.role, 'event_type', null, event_type, `SCE logged: ${event_type}`);

    res.json({ success: true, event_id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── FSMA 204: UPDATE CTE ─────────────────────────────────────────────────────
router.post('/fsma/cte/:cte_id', async (req, res) => {
  const { entity_id, entity_type, location_name, location_address, gps_lat, gps_lng, event_timestamp, quantity_lbs, reference_document } = req.body;
  try {
    await pool.query(
      `UPDATE fsma_ctes SET entity_id=$1, entity_type=$2, location_name=$3, location_address=$4, gps_lat=$5, gps_lng=$6, event_timestamp=$7, quantity_lbs=$8, reference_document=$9 WHERE cte_id=$10`,
      [entity_id, entity_type, location_name, location_address, gps_lat, gps_lng, event_timestamp, quantity_lbs, reference_document, req.params.cte_id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── FSMA 204: ADD KDE ────────────────────────────────────────────────────────
router.post('/fsma/cte/:cte_id/kde', async (req, res) => {
  const { lot_id, kde_name, kde_value, kde_unit, required } = req.body;
  try {
    await pool.query(
      'INSERT INTO fsma_kdes (cte_id, lot_id, kde_name, kde_value, kde_unit, required) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.params.cte_id, lot_id, kde_name, kde_value, kde_unit, required !== false]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── FSMA 204: COMPLIANCE REPORT ─────────────────────────────────────────────
router.get('/fsma/report/:lot_id', async (req, res) => {
  try {
    const lot = await pool.query('SELECT * FROM lot_registry WHERE lot_id=$1', [req.params.lot_id]);
    const ctes = await pool.query('SELECT c.*, array_agg(json_build_object(\'kde\',k.kde_name,\'value\',k.kde_value,\'unit\',k.kde_unit,\'verified\',k.verified)) AS kdes FROM fsma_ctes c LEFT JOIN fsma_kdes k ON k.cte_id=c.cte_id WHERE c.lot_id=$1 GROUP BY c.id ORDER BY c.event_timestamp', [req.params.lot_id]);
    const required = ['harvesting','cooling','initial_packing','first_land_based_receiver','shipping'];
    const completed = ctes.rows.map(c => c.cte_type);
    const missing = required.filter(r => !completed.includes(r));
    const compliant = missing.length === 0;
    res.json({ lot: lot.rows[0], ctes: ctes.rows, required_ctes: required, missing_ctes: missing, fsma_204_compliant: compliant, generated_at: new Date() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── CROSS-BORDER INTELLIGENCE ────────────────────────────────────────────────
router.post('/border/log', async (req, res) => {
  const { border_crossing, crossing_direction, commodity, volume_lbs, avg_wait_hours, inspection_rate_pct, rejection_rate_pct, tariff_rate_pct, phytosanitary_restriction, restriction_reason, weather_impact, notes } = req.body;
  try {
    await pool.query(
      `INSERT INTO cross_border_intel (border_crossing, crossing_direction, date_recorded, commodity, volume_lbs, avg_wait_hours, inspection_rate_pct, rejection_rate_pct, tariff_rate_pct, phytosanitary_restriction, restriction_reason, weather_impact, notes)
       VALUES ($1,$2,CURRENT_DATE,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [border_crossing, crossing_direction, commodity, volume_lbs, avg_wait_hours, inspection_rate_pct, rejection_rate_pct, tariff_rate_pct, phytosanitary_restriction||false, restriction_reason, weather_impact, notes]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/border/intel', async (req, res) => {
  const { commodity, border_crossing } = req.query;
  try {
    let q = 'SELECT * FROM cross_border_intel WHERE 1=1';
    const p = [];
    if (commodity) { p.push(`%${commodity}%`); q += ` AND commodity ILIKE $${p.length}`; }
    if (border_crossing) { p.push(`%${border_crossing}%`); q += ` AND border_crossing ILIKE $${p.length}`; }
    q += ' ORDER BY date_recorded DESC LIMIT 100';
    const r = await pool.query(q, p);
    res.json({ intel: r.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── USDA MARKET DATA INGEST ──────────────────────────────────────────────────
router.post('/usda/ingest', async (req, res) => {
  const { records } = req.body;
  if (!records || !records.length) return res.status(400).json({ error: 'No records' });
  try {
    let inserted = 0;
    for (const r of records) {
      await pool.query(
        `INSERT INTO usda_market_data (commodity, market, region, price_low, price_high, price_avg, volume_lbs, pricing_date, movement, quality, source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [r.commodity, r.market, r.region, r.price_low, r.price_high, r.price_avg, r.volume_lbs, r.pricing_date, r.movement, r.quality, r.source || 'USDA_AMS']
      );
      inserted++;
    }
    res.json({ success: true, inserted });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/usda/prices', async (req, res) => {
  const { commodity, days = 30 } = req.query;
  try {
    const r = await pool.query(
      `SELECT * FROM usda_market_data WHERE commodity ILIKE $1 AND pricing_date >= NOW()-INTERVAL '${parseInt(days)} days' ORDER BY pricing_date DESC LIMIT 200`,
      [`%${commodity||''}%`]
    );
    res.json({ prices: r.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── FDA INTELLIGENCE ─────────────────────────────────────────────────────────
router.post('/fda/ingest', async (req, res) => {
  const { records } = req.body;
  try {
    let inserted = 0;
    for (const r of records) {
      await pool.query(
        `INSERT INTO fda_intelligence (record_type, commodity, company, reason, country_origin, region, severity, effective_date, fda_reference, raw_data)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [r.record_type, r.commodity, r.company, r.reason, r.country_origin, r.region, r.severity, r.effective_date, r.fda_reference, JSON.stringify(r.raw_data||{})]
      );
      inserted++;
    }
    res.json({ success: true, inserted });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/fda/alerts', async (req, res) => {
  const { commodity, days = 90 } = req.query;
  try {
    const r = await pool.query(
      `SELECT * FROM fda_intelligence WHERE commodity ILIKE $1 AND effective_date >= NOW()-INTERVAL '${parseInt(days)} days' ORDER BY effective_date DESC LIMIT 100`,
      [`%${commodity||''}%`]
    );
    res.json({ alerts: r.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── AI PREDICTION STORE ──────────────────────────────────────────────────────
router.post('/ai/prediction', async (req, res) => {
  const { prediction_type, commodity, region, confidence_score, predicted_value, predicted_date, model_version, data_points_used } = req.body;
  try {
    await pool.query(
      `INSERT INTO ai_predictions (prediction_type, commodity, region, confidence_score, predicted_value, predicted_date, model_version, data_points_used)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [prediction_type, commodity, region, confidence_score, predicted_value, predicted_date, model_version||'1.0', data_points_used||0]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/ai/predictions', async (req, res) => {
  const { prediction_type, commodity } = req.query;
  try {
    let q = 'SELECT * FROM ai_predictions WHERE predicted_date >= NOW()-INTERVAL \'30 days\'';
    const p = [];
    if (prediction_type) { p.push(prediction_type); q += ` AND prediction_type=$${p.length}`; }
    if (commodity) { p.push(`%${commodity}%`); q += ` AND commodity ILIKE $${p.length}`; }
    q += ' ORDER BY confidence_score DESC, created_at DESC LIMIT 50';
    const r = await pool.query(q, p);
    res.json({ predictions: r.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GRAPH QUERY: TRACE LOT FULL PATH ────────────────────────────────────────
router.get('/graph/trace/:lot_id', async (req, res) => {
  try {
    const nodes = await pool.query('SELECT * FROM entity_graph WHERE lot_id=$1', [req.params.lot_id]);
    const entity_ids = [...new Set([...nodes.rows.map(n => n.from_entity_id), ...nodes.rows.map(n => n.to_entity_id)])];
    const entities = entity_ids.length ? await pool.query('SELECT entity_id, entity_type, blind_id, country, region FROM entity_registry WHERE entity_id = ANY($1)', [entity_ids]) : { rows: [] };
    res.json({ graph: nodes.rows, entities: entities.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GRAPH QUERY: OUTBREAK TRACE ─────────────────────────────────────────────
router.get('/graph/outbreak/:commodity', async (req, res) => {
  try {
    // Find all lots for this commodity in last 30 days that crossed a specific border
    const r = await pool.query(
      `SELECT lr.lot_id, lr.origin_country, lr.origin_region, lr.harvest_date,
              sce.border_crossing, sce.inspection_result, sce.event_timestamp
       FROM lot_registry lr
       JOIN supply_chain_events sce ON sce.lot_id = lr.lot_id
       WHERE lr.commodity ILIKE $1
         AND sce.event_type = 'border_crossed'
         AND lr.harvest_date >= NOW() - INTERVAL '30 days'
       ORDER BY sce.event_timestamp DESC`,
      [`%${req.params.commodity}%`]
    );
    res.json({ trace: r.rows, commodity: req.params.commodity });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── NORMALIZATION QUEUE ──────────────────────────────────────────────────────
router.post('/normalize/queue', async (req, res) => {
  const { source_type, source_name, raw_content, entity_type } = req.body;
  try {
    const r = await pool.query(
      'INSERT INTO normalization_queue (source_type, source_name, raw_content, entity_type) VALUES ($1,$2,$3,$4) RETURNING id',
      [source_type, source_name, raw_content, entity_type]
    );
    res.json({ success: true, queue_id: r.rows[0].id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── REGULATORY COMPLIANCE AUTO-DETECT ───────────────────────────────────────
router.get('/regulatory/status/:entity_id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM regulatory_tracker WHERE entity_id=$1 ORDER BY regulation', [req.params.entity_id]);
    const lots = await pool.query('SELECT COUNT(*) AS total, COUNT(CASE WHEN lp.fsma_compliant THEN 1 END) AS fsma_ok FROM lot_registry lr LEFT JOIN lot_passport lp ON lp.lot_id=lr.lot_id WHERE lr.grower_entity_id=$1', [req.params.entity_id]);
    res.json({ regulatory: r.rows, lot_compliance: lots.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── DATA LAKE SUMMARY (ADMIN) ────────────────────────────────────────────────
router.get('/admin/summary', async (req, res) => {
  try {
    const [entities, lots, events, audits, usda, fda, preds, border] = await Promise.all([
      pool.query('SELECT entity_type, COUNT(*) AS count FROM entity_registry GROUP BY entity_type'),
      pool.query('SELECT COUNT(*) AS total, COUNT(CASE WHEN lp.fsma_compliant THEN 1 END) AS fsma_compliant FROM lot_registry lr LEFT JOIN lot_passport lp ON lp.lot_id=lr.lot_id'),
      pool.query('SELECT event_type, COUNT(*) AS count FROM supply_chain_events GROUP BY event_type ORDER BY count DESC LIMIT 10'),
      pool.query('SELECT COUNT(*) AS total FROM audit_trail'),
      pool.query('SELECT COUNT(*) AS total FROM usda_market_data'),
      pool.query('SELECT COUNT(*) AS total FROM fda_intelligence'),
      pool.query('SELECT prediction_type, COUNT(*) AS count FROM ai_predictions GROUP BY prediction_type'),
      pool.query('SELECT COUNT(*) AS total FROM cross_border_intel'),
    ]);
    res.json({
      entities: entities.rows,
      lots: lots.rows[0],
      supply_chain_events: events.rows,
      audit_records: audits.rows[0].total,
      usda_records: usda.rows[0].total,
      fda_records: fda.rows[0].total,
      ai_predictions: preds.rows,
      border_intel_records: border.rows[0].total,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── AUDIT TRAIL QUERY ────────────────────────────────────────────────────────
router.get('/audit/:table/:record_id', async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT * FROM audit_trail WHERE table_name=$1 AND record_id=$2 ORDER BY timestamp ASC',
      [req.params.table, req.params.record_id]
    );
    res.json({ trail: r.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── SENASICA INGEST ──────────────────────────────────────────────────────────
router.post('/senasica/ingest', async (req, res) => {
  const { records } = req.body;
  try {
    let inserted = 0;
    for (const r of records) {
      await pool.query(
        `INSERT INTO senasica_intelligence (record_type, entity_name, entity_type, commodity, region, state_mexico, certificate_number, valid_from, valid_until, status, inspection_result, raw_data)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [r.record_type, r.entity_name, r.entity_type, r.commodity, r.region, r.state_mexico, r.certificate_number, r.valid_from, r.valid_until, r.status, r.inspection_result, JSON.stringify(r.raw_data||{})]
      );
      inserted++;
    }
    res.json({ success: true, inserted });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
