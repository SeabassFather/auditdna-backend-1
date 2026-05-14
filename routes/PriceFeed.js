// PriceFeed.js — Live price feed stub
const express = require('express');
const router  = express.Router();
router.get('/health', (req, res) => res.json({ ok: true, module: 'pricefeed' }));
router.get('/', async (req, res) => {
  const pool = req.app.get('db') || global.db;
  if (!pool) return res.json({ ok: true, prices: [], source: 'unavailable' });
  try {
    const r = await pool.query(`SELECT * FROM market_listings ORDER BY created_at DESC LIMIT 50`).catch(()=>({rows:[]}));
    res.json({ ok: true, prices: r.rows, source: 'railway' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
module.exports = router;
