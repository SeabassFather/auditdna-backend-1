// ═══════════════════════════════════════════════════════════════
// AUDITDNA WATER TECHNOLOGY ROUTES
// Water quality testing, irrigation management, AgriMAXX integration
// ═══════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// ═══════════════════════════════════════════════════════════════
// INIT: Create water management tables
// ═══════════════════════════════════════════════════════════════

const initWaterTables = async () => {
  const createTablesSQL = `
    CREATE TABLE IF NOT EXISTS water_tests (
      id SERIAL PRIMARY KEY,
      grower_id INTEGER NOT NULL,
      grower_name VARCHAR(255),
      test_type VARCHAR(50) NOT NULL,
      sample_location VARCHAR(255),
      sample_date TIMESTAMP DEFAULT NOW(),
      ph_level DECIMAL(4,2),
      tds_ppm INTEGER,
      ec_value DECIMAL(6,2),
      nitrate_ppm INTEGER,
      phosphate_ppm INTEGER,
      potassium_ppm INTEGER,
      calcium_ppm INTEGER,
      magnesium_ppm INTEGER,
      sulfur_ppm INTEGER,
      iron_ppm DECIMAL(6,2),
      chloride_ppm INTEGER,
      sodium_ppm INTEGER,
      bacterial_count INTEGER,
      e_coli_present BOOLEAN DEFAULT false,
      coliform_present BOOLEAN DEFAULT false,
      status VARCHAR(50) DEFAULT 'pending',
      compliance_status VARCHAR(50) DEFAULT 'pending',
      lab_name VARCHAR(255),
      lab_certification VARCHAR(100),
      results_date TIMESTAMP,
      next_test_due DATE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS irrigation_systems (
      id SERIAL PRIMARY KEY,
      grower_id INTEGER NOT NULL,
      grower_name VARCHAR(255),
      system_type VARCHAR(100),
      coverage_acres DECIMAL(10,2),
      water_source VARCHAR(100),
      pump_capacity_gpm INTEGER,
      efficiency_rating DECIMAL(5,2),
      last_maintenance DATE,
      next_maintenance DATE,
      status VARCHAR(50) DEFAULT 'active',
      agrimaxx_installed BOOLEAN DEFAULT false,
      treatment_system TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS water_treatments (
      id SERIAL PRIMARY KEY,
      grower_id INTEGER NOT NULL,
      treatment_date TIMESTAMP DEFAULT NOW(),
      treatment_type VARCHAR(100),
      chemical_used VARCHAR(255),
      dosage_amount DECIMAL(10,2),
      dosage_unit VARCHAR(50),
      area_treated_acres DECIMAL(10,2),
      water_volume_gallons INTEGER,
      operator_name VARCHAR(255),
      agrimaxx_product BOOLEAN DEFAULT false,
      results TEXT,
      status VARCHAR(50) DEFAULT 'completed',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_water_tests_grower ON water_tests(grower_id);
    CREATE INDEX IF NOT EXISTS idx_water_tests_status ON water_tests(status);
    CREATE INDEX IF NOT EXISTS idx_irrigation_grower ON irrigation_systems(grower_id);
    CREATE INDEX IF NOT EXISTS idx_treatments_grower ON water_treatments(grower_id);
  `;

  try {
    await pool.query(createTablesSQL);
    console.log('✅ [Water Tech] Tables initialized');
  } catch (error) {
    console.error('❌ [Water Tech] Table init failed:', error.message);
  }
};

initWaterTables();

// ═══════════════════════════════════════════════════════════════
// POST /water/tests - Submit new water test
// ═══════════════════════════════════════════════════════════════

router.post('/tests', async (req, res) => {
  try {
    const {
      growerId, growerName, testType, sampleLocation,
      phLevel, tdsPpm, ecValue, nitratePpm, phosphatePpm,
      potassiumPpm, calciumPpm, magnesiumPpm, sulfurPpm,
      ironPpm, chloridePpm, sodiumPpm, bacterialCount,
      eColiPresent, coliformPresent, labName, labCertification
    } = req.body;

    // Determine compliance status based on water quality parameters
    let complianceStatus = 'compliant';
    const issues = [];

    if (phLevel < 6.0 || phLevel > 8.5) {
      complianceStatus = 'non-compliant';
      issues.push('pH out of acceptable range');
    }
    if (eColiPresent) {
      complianceStatus = 'critical';
      issues.push('E. coli detected');
    }
    if (coliformPresent) {
      complianceStatus = 'warning';
      issues.push('Coliform bacteria detected');
    }

    const result = await pool.query(
      `INSERT INTO water_tests (
        grower_id, grower_name, test_type, sample_location,
        ph_level, tds_ppm, ec_value, nitrate_ppm, phosphate_ppm,
        potassium_ppm, calcium_ppm, magnesium_ppm, sulfur_ppm,
        iron_ppm, chloride_ppm, sodium_ppm, bacterial_count,
        e_coli_present, coliform_present, status, compliance_status,
        lab_name, lab_certification, results_date, next_test_due
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19, 'completed', $20, $21, $22, NOW(), NOW() + INTERVAL '90 days'
      ) RETURNING *`,
      [
        growerId, growerName, testType, sampleLocation,
        phLevel, tdsPpm, ecValue, nitratePpm, phosphatePpm,
        potassiumPpm, calciumPpm, magnesiumPpm, sulfurPpm,
        ironPpm, chloridePpm, sodiumPpm, bacterialCount,
        eColiPresent || false, coliformPresent || false,
        complianceStatus, labName, labCertification
      ]
    );

    res.json({
      success: true,
      test: result.rows[0],
      complianceStatus,
      issues: issues.length > 0 ? issues : null,
      message: 'Water test recorded successfully'
    });

  } catch (error) {
    console.error('[Water Tech] Test submission error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /water/tests/:growerId - Get all tests for a grower
// ═══════════════════════════════════════════════════════════════

router.get('/tests/:growerId', async (req, res) => {
  try {
    const { growerId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const result = await pool.query(
      `SELECT * FROM water_tests 
       WHERE grower_id = $1 
       ORDER BY sample_date DESC 
       LIMIT $2`,
      [growerId, limit]
    );

    res.json({
      success: true,
      tests: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('[Water Tech] Get tests error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /water/irrigation - Register irrigation system
// ═══════════════════════════════════════════════════════════════

router.post('/irrigation', async (req, res) => {
  try {
    const {
      growerId, growerName, systemType, coverageAcres,
      waterSource, pumpCapacityGpm, efficiencyRating,
      agrimaxXInstalled, treatmentSystem
    } = req.body;

    const result = await pool.query(
      `INSERT INTO irrigation_systems (
        grower_id, grower_name, system_type, coverage_acres,
        water_source, pump_capacity_gpm, efficiency_rating,
        agrimaxx_installed, treatment_system, last_maintenance,
        next_maintenance
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW() + INTERVAL '6 months')
      RETURNING *`,
      [
        growerId, growerName, systemType, coverageAcres,
        waterSource, pumpCapacityGpm, efficiencyRating,
        agrimaxXInstalled || false, treatmentSystem
      ]
    );

    res.json({
      success: true,
      system: result.rows[0],
      message: 'Irrigation system registered'
    });

  } catch (error) {
    console.error('[Water Tech] Irrigation registration error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /water/treatment - Record water treatment
// ═══════════════════════════════════════════════════════════════

router.post('/treatment', async (req, res) => {
  try {
    const {
      growerId, treatmentType, chemicalUsed, dosageAmount,
      dosageUnit, areaTreatedAcres, waterVolumeGallons,
      operatorName, agrimaxXProduct, results
    } = req.body;

    const result = await pool.query(
      `INSERT INTO water_treatments (
        grower_id, treatment_type, chemical_used, dosage_amount,
        dosage_unit, area_treated_acres, water_volume_gallons,
        operator_name, agrimaxx_product, results
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        growerId, treatmentType, chemicalUsed, dosageAmount,
        dosageUnit, areaTreatedAcres, waterVolumeGallons,
        operatorName, agrimaxXProduct || false, results
      ]
    );

    res.json({
      success: true,
      treatment: result.rows[0],
      message: 'Water treatment recorded'
    });

  } catch (error) {
    console.error('[Water Tech] Treatment recording error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /water/compliance/:growerId - Get compliance status
// ═══════════════════════════════════════════════════════════════

router.get('/compliance/:growerId', async (req, res) => {
  try {
    const { growerId } = req.params;

    // Get latest test
    const latestTest = await pool.query(
      `SELECT * FROM water_tests 
       WHERE grower_id = $1 
       ORDER BY sample_date DESC 
       LIMIT 1`,
      [growerId]
    );

    // Get irrigation systems
    const systems = await pool.query(
      `SELECT * FROM irrigation_systems 
       WHERE grower_id = $1 AND status = 'active'`,
      [growerId]
    );

    // Get recent treatments
    const treatments = await pool.query(
      `SELECT * FROM water_treatments 
       WHERE grower_id = $1 
       ORDER BY treatment_date DESC 
       LIMIT 10`,
      [growerId]
    );

    const compliance = {
      overallStatus: latestTest.rows[0]?.compliance_status || 'unknown',
      lastTestDate: latestTest.rows[0]?.sample_date || null,
      nextTestDue: latestTest.rows[0]?.next_test_due || null,
      activeSystems: systems.rowCount,
      recentTreatments: treatments.rowCount,
      agrimaxXPartner: systems.rows.some(s => s.agrimaxx_installed)
    };

    res.json({
      success: true,
      compliance,
      latestTest: latestTest.rows[0] || null,
      systems: systems.rows,
      treatments: treatments.rows
    });

  } catch (error) {
    console.error('[Water Tech] Compliance check error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /water/dashboard - Overall water management dashboard
// ═══════════════════════════════════════════════════════════════

router.get('/dashboard', async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(DISTINCT grower_id) as total_growers,
        COUNT(*) FILTER (WHERE compliance_status = 'compliant') as compliant_tests,
        COUNT(*) FILTER (WHERE compliance_status = 'non-compliant') as noncompliant_tests,
        COUNT(*) FILTER (WHERE compliance_status = 'critical') as critical_tests,
        COUNT(*) FILTER (WHERE e_coli_present = true) as ecoli_detections
      FROM water_tests
      WHERE sample_date > NOW() - INTERVAL '90 days'
    `);

    const systemStats = await pool.query(`
      SELECT 
        COUNT(*) as total_systems,
        SUM(coverage_acres) as total_acres,
        COUNT(*) FILTER (WHERE agrimaxx_installed = true) as agrimaxx_systems
      FROM irrigation_systems
      WHERE status = 'active'
    `);

    res.json({
      success: true,
      waterTests: stats.rows[0],
      irrigationSystems: systemStats.rows[0],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Water Tech] Dashboard error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

module.exports = router;