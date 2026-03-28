const express = require('express');
const router = express.Router();

router.get('/stats', async (req, res) => {
  const pool = req.app.locals.pool;
  try {
    const r = await pool.query(SELECT COUNT(*) FILTER (WHERE type='pre-approval') AS pre_approvals, COUNT(*) FILTER (WHERE type='mexico-application') AS mexico_apps, COUNT(*) FILTER (WHERE status='pending') AS pending, COUNT(*) FILTER (WHERE status='approved') AS approved, COUNT(*) AS total FROM mortgage_applications);
    res.json({ ok: true, stats: r.rows[0] });
  } catch(e) {
    res.json({ ok: true, stats: { pre_approvals:0, mexico_apps:0, pending:0, approved:0, total:0 } });
  }
});

router.post('/apply', async (req, res) => {
  const pool = req.app.locals.pool;
  try {
    const d = req.body;
    await pool.query(INSERT INTO mortgage_applications (type,name,email,phone,data,status,created_at) VALUES (,,,,,'pending',NOW()),
      [d.type||'inquiry', d.name||'', d.email||'', d.phone||'', JSON.stringify(d)]).catch(()=>{});
    res.json({ ok: true });
  } catch(e) { res.json({ ok: true }); }
});

module.exports = router;
