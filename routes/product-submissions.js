const express = require('express');
const router = express.Router();

async function initTable(pool) {
  await pool.query(
    CREATE TABLE IF NOT EXISTS product_submissions (
      id SERIAL PRIMARY KEY,
      grower_name TEXT, grower_email TEXT, grower_phone TEXT, company TEXT,
      commodity TEXT, variety TEXT, quantity INTEGER, unit TEXT DEFAULT 'Carton',
      pack_size TEXT, fob_price NUMERIC(10,2), available_date DATE,
      shelf_life INTEGER, harvest_location TEXT, destination_market TEXT,
      quality_grade TEXT DEFAULT 'US No. 1', certifications TEXT[],
      organic_cert BOOLEAN DEFAULT false, notes TEXT,
      status TEXT DEFAULT 'pending', admin_note TEXT,
      approved_by TEXT, approved_at TIMESTAMPTZ,
      rejected_by TEXT, rejected_at TIMESTAMPTZ,
      submitted_at TIMESTAMPTZ DEFAULT NOW(), created_at TIMESTAMPTZ DEFAULT NOW()
    );
  );
  console.log('[PRODUCT-SUBMISSIONS] Table ready');
}

router.get('/', async (req, res) => {
  const pool = req.app.locals.pool;
  try {
    const { status, limit = 100, offset = 0 } = req.query;
    const where = status ? 'WHERE status = ' : '';
    const params = status ? [status, parseInt(limit), parseInt(offset)] : [parseInt(limit), parseInt(offset)];
    const q = status
      ? 'SELECT * FROM product_submissions WHERE status= ORDER BY submitted_at DESC LIMIT  OFFSET '
      : 'SELECT * FROM product_submissions ORDER BY submitted_at DESC LIMIT  OFFSET ';
    const r = await pool.query(q, params);
    const c = await pool.query(status ? 'SELECT COUNT(*) FROM product_submissions WHERE status=' : 'SELECT COUNT(*) FROM product_submissions', status ? [status] : []);
    res.json({ data: r.rows, total: parseInt(c.rows[0].count) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/stats', async (req, res) => {
  const pool = req.app.locals.pool;
  try {
    const r = await pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='pending') AS pending, COUNT(*) FILTER (WHERE status='approved') AS approved, COUNT(*) FILTER (WHERE status='rejected') AS rejected FROM product_submissions");
    res.json(r.rows[0]);
  } catch(e) { res.json({ total:0, pending:0, approved:0, rejected:0 }); }
});

router.post('/', async (req, res) => {
  const pool = req.app.locals.pool;
  try {
    const d = req.body;
    const r = await pool.query(
      'INSERT INTO product_submissions (grower_name,grower_email,grower_phone,company,commodity,variety,quantity,unit,pack_size,fob_price,available_date,shelf_life,harvest_location,destination_market,quality_grade,certifications,organic_cert,notes) VALUES (,,,,,,,,,,,,,,,,,) RETURNING *',
      [d.growerName,d.growerEmail,d.growerPhone,d.company,d.commodity,d.variety,d.quantity,d.unit||'Carton',d.packSize,d.fobPrice,d.availableDate,d.shelfLife,d.harvestLocation,d.destinationMarket,d.qualityGrade||'US No. 1',d.certifications||[],d.organicCert||false,d.notes]
    );
    res.status(201).json({ success: true, submission: r.rows[0] });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/approve', async (req, res) => {
  const pool = req.app.locals.pool;
  try {
    const r = await pool.query("UPDATE product_submissions SET status='approved', admin_note=, approved_by=, approved_at=NOW() WHERE id= RETURNING *", [req.body.note, req.body.approvedBy||'admin', req.params.id]);
    res.json({ success: true, submission: r.rows[0] });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/reject', async (req, res) => {
  const pool = req.app.locals.pool;
  try {
    const r = await pool.query("UPDATE product_submissions SET status='rejected', admin_note=, rejected_by=, rejected_at=NOW() WHERE id= RETURNING *", [req.body.note, req.body.rejectedBy||'admin', req.params.id]);
    res.json({ success: true, submission: r.rows[0] });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
module.exports.initTable = initTable;
