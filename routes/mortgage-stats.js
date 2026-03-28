const express = require('express');
const router = express.Router();

router.get('/stats', async (req, res) => {
  const pool = req.app.locals.pool;
  try {
    const r = await pool.query('SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status=) AS pending FROM mortgage_applications', ['pending']);
    res.json({ ok: true, stats: r.rows[0] });
  } catch(e) { res.json({ ok: true, stats: { total: 0, pending: 0 } }); }
});

router.post('/apply', async (req, res) => {
  const pool = req.app.locals.pool;
  try {
    const d = req.body;
    await pool.query('INSERT INTO mortgage_applications (type,name,email,phone,data,status,created_at) VALUES (,,,,,,NOW())', [d.type || 'inquiry', d.name || '', d.email || '', d.phone || '', JSON.stringify(d), 'pending']);
    res.json({ ok: true });
  } catch(e) { res.json({ ok: true }); }
});

module.exports = router;
