// routes/lot-fingerprint.js
// Save to: C:\AuditDNA\backend\routes\lot-fingerprint.js
'use strict';
const express = require('express');
const router  = express.Router();
let _pool = null;
router.use((req, res, next) => { _pool = req.app.get('pool') || _pool; next(); });

const ensureTable = async (pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lot_fingerprints (
      id SERIAL PRIMARY KEY,
      lot_id VARCHAR(60) UNIQUE,
      commodity VARCHAR(120),
      grower VARCHAR(200),
      region VARCHAR(120),
      country VARCHAR(10),
      harvest_date DATE,
      weight_lbs NUMERIC,
      integrity_score INTEGER,
      farm_data JSONB,
      seed_data JSONB,
      water_data JSONB,
      soil_data JSONB,
      fert_data JSONB,
      po_number VARCHAR(60),
      manifest_number VARCHAR(60),
      invoice_number VARCHAR(60),
      bound BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {});
};

// POST /api/traceability/fingerprint
router.post('/', async (req, res) => {
  if (!_pool) return res.status(503).json({ error: 'db unavailable' });
  const { lotID, farm, seed, water, soil, fert, integrity, binding, bound } = req.body;
  try {
    await ensureTable(_pool);
    const r = await _pool.query(
      `INSERT INTO lot_fingerprints
       (lot_id, commodity, grower, region, country, harvest_date, weight_lbs,
        integrity_score, farm_data, seed_data, water_data, soil_data, fert_data,
        po_number, manifest_number, invoice_number, bound)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       ON CONFLICT (lot_id) DO UPDATE SET
         integrity_score=EXCLUDED.integrity_score,
         po_number=EXCLUDED.po_number, manifest_number=EXCLUDED.manifest_number,
         invoice_number=EXCLUDED.invoice_number, bound=EXCLUDED.bound
       RETURNING *`,
      [lotID, farm?.commodity, farm?.grower, farm?.region, farm?.country,
       farm?.harvestDate||null, farm?.weightLbs||null, integrity||0,
       JSON.stringify(farm), JSON.stringify(seed), JSON.stringify(water),
       JSON.stringify(soil), JSON.stringify(fert),
       binding?.po||null, binding?.manifest||null, binding?.invoice||null, !!bound]
    );
    res.status(201).json({ fingerprint: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/traceability/fingerprint
router.get('/', async (req, res) => {
  if (!_pool) return res.json({ fingerprints: [] });
  try {
    await ensureTable(_pool);
    const r = await _pool.query(
      `SELECT * FROM lot_fingerprints ORDER BY created_at DESC LIMIT 100`
    );
    res.json({ fingerprints: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/traceability/fingerprint/:lotId — public scan
router.get('/:lotId', async (req, res) => {
  if (!_pool) return res.status(503).json({ error: 'db unavailable' });
  try {
    await ensureTable(_pool);
    const r = await _pool.query(
      `SELECT lot_id, commodity, grower, region, country, harvest_date,
              integrity_score, farm_data, seed_data, water_data, soil_data,
              fert_data, bound, po_number, manifest_number, created_at
       FROM lot_fingerprints WHERE lot_id=$1`, [req.params.lotId]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Lot not found' });
    res.json({ fingerprint: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
