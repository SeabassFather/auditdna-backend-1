// routes/cold-chain.js
// Save to: C:\AuditDNA\backend\routes\cold-chain.js
'use strict';
const express = require('express');
const router  = express.Router();
let _pool = null;
router.use((req, res, next) => { _pool = req.app.get('pool') || _pool; next(); });

const ensureTables = async (pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cold_chain_shipments (
      id SERIAL PRIMARY KEY,
      load_id VARCHAR(40) UNIQUE,
      commodity VARCHAR(120),
      origin VARCHAR(120),
      destination VARCHAR(120),
      carrier VARCHAR(120),
      set_temp NUMERIC,
      vehicle VARCHAR(60),
      status VARCHAR(30) DEFAULT 'ACTIVE',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {});
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cold_chain_logs (
      id SERIAL PRIMARY KEY,
      load_id VARCHAR(40),
      location VARCHAR(120),
      temp_reading NUMERIC,
      deviation NUMERIC,
      logged_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {});
};

// GET /api/cold-chain/shipments
router.get('/shipments', async (req, res) => {
  if (!_pool) return res.json({ shipments: [] });
  try {
    await ensureTables(_pool);
    const r = await _pool.query(
      `SELECT s.*, json_agg(l ORDER BY l.logged_at) FILTER (WHERE l.id IS NOT NULL) AS logs
       FROM cold_chain_shipments s
       LEFT JOIN cold_chain_logs l ON l.load_id = s.load_id
       WHERE s.status != 'CLOSED'
       GROUP BY s.id ORDER BY s.created_at DESC LIMIT 50`
    );
    res.json({ shipments: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/cold-chain/shipment
router.post('/shipment', async (req, res) => {
  if (!_pool) return res.status(503).json({ error: 'db unavailable' });
  const { load_id, commodity, origin, destination, carrier, set_temp, vehicle } = req.body;
  try {
    await ensureTables(_pool);
    const id = load_id || `CCM-${Date.now()}`;
    const r = await _pool.query(
      `INSERT INTO cold_chain_shipments (load_id, commodity, origin, destination, carrier, set_temp, vehicle)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (load_id) DO UPDATE SET status='ACTIVE'
       RETURNING *`,
      [id, commodity, origin, destination, carrier, set_temp, vehicle]
    );
    res.status(201).json({ shipment: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/cold-chain/temp-log
router.post('/temp-log', async (req, res) => {
  if (!_pool) return res.status(503).json({ error: 'db unavailable' });
  const { load_id, location, temp_reading, set_temp } = req.body;
  const deviation = parseFloat(temp_reading) - parseFloat(set_temp || 36);
  const status = Math.abs(deviation) > 4 ? 'BREACH' : Math.abs(deviation) > 2 ? 'WARNING' : 'OK';
  try {
    await ensureTables(_pool);
    await _pool.query(
      `INSERT INTO cold_chain_logs (load_id, location, temp_reading, deviation) VALUES ($1,$2,$3,$4)`,
      [load_id, location, temp_reading, deviation]
    );
    await _pool.query(
      `UPDATE cold_chain_shipments SET status=$1 WHERE load_id=$2`,
      [status, load_id]
    );
    res.json({ logged: true, status, deviation });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
