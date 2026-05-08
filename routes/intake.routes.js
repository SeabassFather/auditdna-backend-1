// ============================================================
// intake.routes.js — AuditDNA Agriculture Intake Pipeline
// Mounts at: /api/intake (called from server.js line 473)
// Endpoints:
//   POST /api/intake/water-test
//   POST /api/intake/soil-report
//   POST /api/intake/seed-record
//   POST /api/intake/fertilizer-log
//   POST /api/intake/traceability-lot
//   GET  /api/intake/lots
//   GET  /api/intake/lots/:lot_id
//   GET  /api/intake/grower/:grower_id
// ============================================================
const express = require('express');

module.exports = function(pool) {
  const router = express.Router();

  // ============================================================
  // INIT TABLES
  // ============================================================
  (async () => {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS intake_water_tests (
          id            SERIAL PRIMARY KEY,
          lot_id        VARCHAR(100),
          grower_id     INTEGER,
          test_date     DATE NOT NULL,
          source        VARCHAR(100),
          ph            NUMERIC(4,2),
          tds_ppm       INTEGER,
          bacteria_cfu  INTEGER,
          nitrates_ppm  NUMERIC(6,2),
          result        VARCHAR(20) DEFAULT 'PENDING',
          notes         TEXT,
          submitted_by  VARCHAR(100),
          created_at    TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS intake_soil_reports (
          id            SERIAL PRIMARY KEY,
          lot_id        VARCHAR(100),
          grower_id     INTEGER,
          report_date   DATE NOT NULL,
          field_id      VARCHAR(100),
          ph            NUMERIC(4,2),
          nitrogen_ppm  NUMERIC(8,2),
          phosphorus_ppm NUMERIC(8,2),
          potassium_ppm NUMERIC(8,2),
          organic_matter_pct NUMERIC(5,2),
          texture       VARCHAR(50),
          result        VARCHAR(20) DEFAULT 'PENDING',
          notes         TEXT,
          submitted_by  VARCHAR(100),
          created_at    TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS intake_seed_records (
          id            SERIAL PRIMARY KEY,
          lot_id        VARCHAR(100),
          grower_id     INTEGER,
          seed_date     DATE NOT NULL,
          commodity     VARCHAR(100) NOT NULL,
          variety       VARCHAR(100),
          supplier      VARCHAR(200),
          lot_number    VARCHAR(100),
          quantity_lbs  NUMERIC(10,2),
          field_id      VARCHAR(100),
          germ_rate_pct NUMERIC(5,2),
          organic       BOOLEAN DEFAULT FALSE,
          notes         TEXT,
          submitted_by  VARCHAR(100),
          created_at    TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS intake_fertilizer_logs (
          id              SERIAL PRIMARY KEY,
          lot_id          VARCHAR(100),
          grower_id       INTEGER,
          application_date DATE NOT NULL,
          field_id        VARCHAR(100),
          product_name    VARCHAR(200) NOT NULL,
          active_ingredient VARCHAR(200),
          rate_per_acre   NUMERIC(10,3),
          unit            VARCHAR(20),
          total_applied   NUMERIC(10,3),
          method          VARCHAR(50),
          epa_reg_number  VARCHAR(100),
          phi_days        INTEGER,
          rei_hours       INTEGER,
          operator        VARCHAR(100),
          notes           TEXT,
          submitted_by    VARCHAR(100),
          created_at      TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS intake_traceability_lots (
          id              SERIAL PRIMARY KEY,
          lot_id          VARCHAR(100) UNIQUE NOT NULL,
          grower_id       INTEGER,
          commodity       VARCHAR(100) NOT NULL,
          variety         VARCHAR(100),
          field_id        VARCHAR(100),
          harvest_date    DATE,
          pack_date       DATE,
          ship_date       DATE,
          quantity_cases  INTEGER,
          quantity_lbs    NUMERIC(10,2),
          pallet_count    INTEGER,
          gtin            VARCHAR(50),
          sscc            VARCHAR(50),
          buyer_id        INTEGER,
          destination     VARCHAR(200),
          temp_f          NUMERIC(5,2),
          fsma_204        BOOLEAN DEFAULT TRUE,
          status          VARCHAR(30) DEFAULT 'ACTIVE',
          notes           TEXT,
          submitted_by    VARCHAR(100),
          created_at      TIMESTAMPTZ DEFAULT NOW(),
          updated_at      TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      console.log('[OK] intake routes: all 5 tables ready');
    } catch (e) {
      console.error('[FAIL] intake table init:', e.message);
    }
  })();

  // ============================================================
  // BRAIN PING HELPER
  // ============================================================
  const brainPing = (event, data) => {
    pool.query(
      `INSERT INTO mortgage_brain_log (module, event, data, source) VALUES ($1,$2,$3,$4)`,
      ['intake', event, JSON.stringify(data), 'intake_pipeline']
    ).catch(() => {});
  };

  // ============================================================
  // POST /api/intake/water-test
  // ============================================================
  router.post('/water-test', async (req, res) => {
    try {
      const { lot_id, grower_id, test_date, source, ph, tds_ppm, bacteria_cfu, nitrates_ppm, result, notes, submitted_by } = req.body;
      if (!test_date) return res.status(400).json({ success: false, error: 'test_date required' });
      const r = await pool.query(
        `INSERT INTO intake_water_tests (lot_id, grower_id, test_date, source, ph, tds_ppm, bacteria_cfu, nitrates_ppm, result, notes, submitted_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [lot_id||null, grower_id||null, test_date, source||null, ph||null, tds_ppm||null, bacteria_cfu||null, nitrates_ppm||null, result||'PENDING', notes||null, submitted_by||null]
      );
      brainPing('WATER_TEST_INTAKE', { id: r.rows[0].id, lot_id, grower_id, result: result||'PENDING' });
      res.json({ success: true, id: r.rows[0].id });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ============================================================
  // POST /api/intake/soil-report
  // ============================================================
  router.post('/soil-report', async (req, res) => {
    try {
      const { lot_id, grower_id, report_date, field_id, ph, nitrogen_ppm, phosphorus_ppm, potassium_ppm, organic_matter_pct, texture, result, notes, submitted_by } = req.body;
      if (!report_date) return res.status(400).json({ success: false, error: 'report_date required' });
      const r = await pool.query(
        `INSERT INTO intake_soil_reports (lot_id, grower_id, report_date, field_id, ph, nitrogen_ppm, phosphorus_ppm, potassium_ppm, organic_matter_pct, texture, result, notes, submitted_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
        [lot_id||null, grower_id||null, report_date, field_id||null, ph||null, nitrogen_ppm||null, phosphorus_ppm||null, potassium_ppm||null, organic_matter_pct||null, texture||null, result||'PENDING', notes||null, submitted_by||null]
      );
      brainPing('SOIL_REPORT_INTAKE', { id: r.rows[0].id, lot_id, grower_id, field_id });
      res.json({ success: true, id: r.rows[0].id });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ============================================================
  // POST /api/intake/seed-record
  // ============================================================
  router.post('/seed-record', async (req, res) => {
    try {
      const { lot_id, grower_id, seed_date, commodity, variety, supplier, lot_number, quantity_lbs, field_id, germ_rate_pct, organic, notes, submitted_by } = req.body;
      if (!seed_date || !commodity) return res.status(400).json({ success: false, error: 'seed_date and commodity required' });
      const r = await pool.query(
        `INSERT INTO intake_seed_records (lot_id, grower_id, seed_date, commodity, variety, supplier, lot_number, quantity_lbs, field_id, germ_rate_pct, organic, notes, submitted_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
        [lot_id||null, grower_id||null, seed_date, commodity, variety||null, supplier||null, lot_number||null, quantity_lbs||null, field_id||null, germ_rate_pct||null, organic||false, notes||null, submitted_by||null]
      );
      brainPing('SEED_RECORD_INTAKE', { id: r.rows[0].id, lot_id, grower_id, commodity });
      res.json({ success: true, id: r.rows[0].id });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ============================================================
  // POST /api/intake/fertilizer-log
  // ============================================================
  router.post('/fertilizer-log', async (req, res) => {
    try {
      const { lot_id, grower_id, application_date, field_id, product_name, active_ingredient, rate_per_acre, unit, total_applied, method, epa_reg_number, phi_days, rei_hours, operator, notes, submitted_by } = req.body;
      if (!application_date || !product_name) return res.status(400).json({ success: false, error: 'application_date and product_name required' });
      const r = await pool.query(
        `INSERT INTO intake_fertilizer_logs (lot_id, grower_id, application_date, field_id, product_name, active_ingredient, rate_per_acre, unit, total_applied, method, epa_reg_number, phi_days, rei_hours, operator, notes, submitted_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
        [lot_id||null, grower_id||null, application_date, field_id||null, product_name, active_ingredient||null, rate_per_acre||null, unit||null, total_applied||null, method||null, epa_reg_number||null, phi_days||null, rei_hours||null, operator||null, notes||null, submitted_by||null]
      );
      brainPing('FERTILIZER_LOG_INTAKE', { id: r.rows[0].id, lot_id, grower_id, product_name, phi_days });
      res.json({ success: true, id: r.rows[0].id });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ============================================================
  // POST /api/intake/traceability-lot
  // ============================================================
  router.post('/traceability-lot', async (req, res) => {
    try {
      const { lot_id, grower_id, commodity, variety, field_id, harvest_date, pack_date, ship_date, quantity_cases, quantity_lbs, pallet_count, gtin, sscc, buyer_id, destination, temp_f, fsma_204, notes, submitted_by } = req.body;
      if (!lot_id || !commodity) return res.status(400).json({ success: false, error: 'lot_id and commodity required' });
      const r = await pool.query(
        `INSERT INTO intake_traceability_lots (lot_id, grower_id, commodity, variety, field_id, harvest_date, pack_date, ship_date, quantity_cases, quantity_lbs, pallet_count, gtin, sscc, buyer_id, destination, temp_f, fsma_204, notes, submitted_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING id
         ON CONFLICT (lot_id) DO UPDATE SET updated_at=NOW(), status='UPDATED'`,
        [lot_id, grower_id||null, commodity, variety||null, field_id||null, harvest_date||null, pack_date||null, ship_date||null, quantity_cases||null, quantity_lbs||null, pallet_count||null, gtin||null, sscc||null, buyer_id||null, destination||null, temp_f||null, fsma_204!==false, notes||null, submitted_by||null]
      );
      brainPing('TRACEABILITY_LOT_INTAKE', { lot_id, grower_id, commodity, quantity_cases, fsma_204: fsma_204!==false });
      res.json({ success: true, id: r.rows[0].id, lot_id });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ============================================================
  // GET /api/intake/lots
  // ============================================================
  router.get('/lots', async (req, res) => {
    try {
      const { commodity, grower_id, status, limit = 100, offset = 0 } = req.query;
      let q = `SELECT * FROM intake_traceability_lots WHERE 1=1`;
      const params = [];
      if (commodity) { params.push(commodity); q += ` AND commodity ILIKE $${params.length}`; }
      if (grower_id) { params.push(grower_id); q += ` AND grower_id=$${params.length}`; }
      if (status)    { params.push(status);    q += ` AND status=$${params.length}`; }
      params.push(limit); q += ` ORDER BY created_at DESC LIMIT $${params.length}`;
      params.push(offset); q += ` OFFSET $${params.length}`;
      const r = await pool.query(q, params);
      res.json({ success: true, lots: r.rows, count: r.rows.length });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ============================================================
  // GET /api/intake/lots/:lot_id
  // ============================================================
  router.get('/lots/:lot_id', async (req, res) => {
    try {
      const { lot_id } = req.params;
      const [lot, water, soil, seeds, fert] = await Promise.all([
        pool.query(`SELECT * FROM intake_traceability_lots WHERE lot_id=$1`, [lot_id]),
        pool.query(`SELECT * FROM intake_water_tests WHERE lot_id=$1 ORDER BY test_date DESC`, [lot_id]),
        pool.query(`SELECT * FROM intake_soil_reports WHERE lot_id=$1 ORDER BY report_date DESC`, [lot_id]),
        pool.query(`SELECT * FROM intake_seed_records WHERE lot_id=$1 ORDER BY seed_date DESC`, [lot_id]),
        pool.query(`SELECT * FROM intake_fertilizer_logs WHERE lot_id=$1 ORDER BY application_date DESC`, [lot_id]),
      ]);
      if (!lot.rows.length) return res.status(404).json({ success: false, error: 'Lot not found' });
      res.json({ success: true, lot: lot.rows[0], water_tests: water.rows, soil_reports: soil.rows, seed_records: seeds.rows, fertilizer_logs: fert.rows });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ============================================================
  // GET /api/intake/grower/:grower_id
  // ============================================================
  router.get('/grower/:grower_id', async (req, res) => {
    try {
      const { grower_id } = req.params;
      const [lots, water, soil, seeds, fert] = await Promise.all([
        pool.query(`SELECT * FROM intake_traceability_lots WHERE grower_id=$1 ORDER BY created_at DESC LIMIT 50`, [grower_id]),
        pool.query(`SELECT * FROM intake_water_tests WHERE grower_id=$1 ORDER BY test_date DESC LIMIT 20`, [grower_id]),
        pool.query(`SELECT * FROM intake_soil_reports WHERE grower_id=$1 ORDER BY report_date DESC LIMIT 20`, [grower_id]),
        pool.query(`SELECT * FROM intake_seed_records WHERE grower_id=$1 ORDER BY seed_date DESC LIMIT 20`, [grower_id]),
        pool.query(`SELECT * FROM intake_fertilizer_logs WHERE grower_id=$1 ORDER BY application_date DESC LIMIT 20`, [grower_id]),
      ]);
      res.json({ success: true, grower_id: parseInt(grower_id), lots: lots.rows, water_tests: water.rows, soil_reports: soil.rows, seed_records: seeds.rows, fertilizer_logs: fert.rows, totals: { lots: lots.rows.length, water_tests: water.rows.length, soil_reports: soil.rows.length, seed_records: seeds.rows.length, fertilizer_logs: fert.rows.length } });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  return router;
};
