// mortgage.js — Mortgage route stub — AuditDNA ag financing
// AuditDNA Agriculture — Mexausa Food Group, Inc.
const express = require('express');
const router  = express.Router();

router.get('/health', (req, res) => res.json({ ok: true, module: 'mortgage' }));

router.get('/', async (req, res) => {
  const pool = req.app.get('db') || global.db;
  if (!pool) return res.status(503).json({ error: 'DB unavailable' });
  try {
    const r = await pool.query('SELECT NOW() as ts');
    res.json({ ok: true, module: 'mortgage', ts: r.rows[0].ts });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
