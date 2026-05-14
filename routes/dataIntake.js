// dataIntake.js — Field data intake
const express = require('express');
const router  = express.Router();
router.get('/health', (req, res) => res.json({ ok: true, module: 'dataIntake' }));
router.post('/', async (req, res) => {
  const pool = req.app.get('db') || global.db;
  if (!pool) return res.status(503).json({ error: 'DB unavailable' });
  try {
    const { type, payload, source } = req.body;
    await pool.query(
      `INSERT INTO field_submissions (type, payload, source, submitted_at) VALUES ($1,$2,$3,NOW())
       ON CONFLICT DO NOTHING`,
      [type || 'general', JSON.stringify(payload || req.body), source || 'api']
    ).catch(()=>{});
    res.json({ ok: true, received: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
module.exports = router;
