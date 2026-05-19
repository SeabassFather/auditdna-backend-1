// routes/tracesafe.js — TraceSafe Small Grower Compliance API
'use strict';
const express = require('express');
const router  = express.Router();
let _pool = null;
router.use((req,res,next) => { _pool = req.app.get('pool') || _pool; next(); });

const ensureTable = async (pool) => {
  await pool.query(`CREATE TABLE IF NOT EXISTS tracesafe_growers (
    id VARCHAR(20) PRIMARY KEY, name VARCHAR(200), region VARCHAR(120),
    country VARCHAR(10), commodity VARCHAR(120), hectares NUMERIC,
    annual_revenue NUMERIC, tier VARCHAR(5) DEFAULT 'C',
    aci_score INTEGER DEFAULT 30, fund_balance NUMERIC DEFAULT 0,
    cert_goal VARCHAR(80), cert_cost NUMERIC, contact VARCHAR(200),
    phone VARCHAR(40), language VARCHAR(10) DEFAULT 'es',
    enrolled_at TIMESTAMPTZ DEFAULT NOW(), payload JSONB
  )`).catch(()=>{});
};

// GET /api/tracesafe/growers
router.get('/growers', async (req, res) => {
  if (!_pool) return res.json({ growers: [] });
  try {
    await ensureTable(_pool);
    const r = await _pool.query('SELECT * FROM tracesafe_growers ORDER BY enrolled_at DESC LIMIT 100');
    res.json({ growers: r.rows, count: r.rows.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/tracesafe/growers
router.post('/growers', async (req, res) => {
  const g = req.body;
  const id = g.id || `SG-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  if (!_pool) return res.status(503).json({ error: 'db unavailable' });
  try {
    await ensureTable(_pool);
    const r = await _pool.query(`
      INSERT INTO tracesafe_growers (id,name,region,country,commodity,hectares,
        annual_revenue,tier,aci_score,fund_balance,cert_goal,cert_cost,
        contact,phone,language,enrolled_at,payload)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'C',30,0,$8,$9,$10,$11,$12,NOW(),$13)
      ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, payload=EXCLUDED.payload
      RETURNING *`,
      [id,g.name,g.region||'',g.country||'MX',g.commodity||'',
       g.hectares||0,g.annual_revenue||0,g.cert_goal||'',g.cert_cost||0,
       g.contact||'',g.phone||'',g.language||'es',JSON.stringify(g)]
    );
    res.status(201).json({ grower: r.rows[0] });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/tracesafe/growers/:id
router.get('/growers/:id', async (req, res) => {
  if (!_pool) return res.status(503).json({ error: 'db unavailable' });
  try {
    const r = await _pool.query('SELECT * FROM tracesafe_growers WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ grower: r.rows[0] });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/tracesafe/growers/:id/score
router.patch('/growers/:id/score', async (req, res) => {
  if (!_pool) return res.status(503).json({ error: 'db unavailable' });
  try {
    const r = await _pool.query(
      'UPDATE tracesafe_growers SET aci_score=$1 WHERE id=$2 RETURNING *',
      [req.body.score, req.params.id]
    );
    res.json({ grower: r.rows[0] });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
