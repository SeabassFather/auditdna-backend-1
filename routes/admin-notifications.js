const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  const pool = req.app.locals.pool;
  try {
    const r = await pool.query(SELECT * FROM admin_notifications ORDER BY created_at DESC LIMIT 50);
    res.json({ ok: true, notifications: r.rows });
  } catch(e) {
    res.json({ ok: true, notifications: [] });
  }
});

router.post('/', async (req, res) => {
  const pool = req.app.locals.pool;
  try {
    await pool.query(CREATE TABLE IF NOT EXISTS admin_notifications (id SERIAL PRIMARY KEY, type TEXT, message TEXT, read BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW()));
    await pool.query(INSERT INTO admin_notifications (type, message) VALUES (,), [req.body.type||'info', req.body.message||'']);
    res.json({ ok: true });
  } catch(e) { res.json({ ok: true }); }
});

router.post('/read/:id', async (req, res) => {
  const pool = req.app.locals.pool;
  try {
    await pool.query(UPDATE admin_notifications SET read=true WHERE id=, [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.json({ ok: true }); }
});

module.exports = router;
