const express = require('express');
const router = express.Router();
const pool = require('../db');

pool.query(`CREATE TABLE IF NOT EXISTS production_declarations (
  id SERIAL PRIMARY KEY,
  grower_id VARCHAR(60), grower_name VARCHAR(200), grower_email VARCHAR(200),
  farm_name VARCHAR(200), farm_location VARCHAR(300), farm_acres NUMERIC(10,2),
  commodity VARCHAR(120), variety VARCHAR(120), estimated_yield VARCHAR(80),
  harvest_date VARCHAR(40), availability_date VARCHAR(40),
  water_source VARCHAR(80), certifications TEXT,
  fsma_compliant BOOLEAN DEFAULT false, gfsi_certified BOOLEAN DEFAULT false,
  notes TEXT, status VARCHAR(40) DEFAULT 'submitted',
  created_at TIMESTAMP DEFAULT NOW()
)`).catch(()=>{});

router.post('/', async (req, res) => {
  const { grower_id, grower_name, grower_email, farm_name, farm_location,
    farm_acres, commodity, variety, estimated_yield, harvest_date,
    availability_date, water_source, certifications, fsma_compliant,
    gfsi_certified, notes } = req.body;
  try {
    const r = await pool.query(`
      INSERT INTO production_declarations
      (grower_id,grower_name,grower_email,farm_name,farm_location,farm_acres,
       commodity,variety,estimated_yield,harvest_date,availability_date,
       water_source,certifications,fsma_compliant,gfsi_certified,notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [grower_id,grower_name,grower_email,farm_name,farm_location,farm_acres,
       commodity,variety,estimated_yield,harvest_date,availability_date,
       water_source,certifications||'',fsma_compliant||false,gfsi_certified||false,notes||'']
    );
    res.json({ ok: true, declaration: r.rows[0] });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/', async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT * FROM production_declarations ORDER BY created_at DESC LIMIT 100'
    );
    res.json({ ok: true, declarations: r.rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
