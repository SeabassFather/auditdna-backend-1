const express = require('express');
const router = express.Router();

async function initTable(pool) {
  try {
    await global.db.query('CREATE TABLE IF NOT EXISTS product_submissions (id SERIAL PRIMARY KEY, grower_name TEXT, grower_email TEXT, grower_phone TEXT, company TEXT, commodity TEXT, variety TEXT, quantity INTEGER, unit TEXT, pack_size TEXT, fob_price NUMERIC(10,2), available_date DATE, shelf_life INTEGER, harvest_location TEXT, destination_market TEXT, quality_grade TEXT, notes TEXT, status TEXT DEFAULT \'pending\', admin_note TEXT, approved_by TEXT, approved_at TIMESTAMPTZ, rejected_by TEXT, rejected_at TIMESTAMPTZ, submitted_at TIMESTAMPTZ DEFAULT NOW())');
    console.log('[PRODUCT-SUBMISSIONS] Table ready');
  } catch(e) { console.warn('[PRODUCT-SUBMISSIONS] init:', e.message); }
}

router.get('/', async (req,res) => {
  try {
    const pool = req.app.locals.pool;
    const limit = parseInt(req.query.limit)||100;
    const offset = parseInt(req.query.offset)||0;
    const r = await global.db.query('SELECT * FROM product_submissions ORDER BY submitted_at DESC LIMIT  OFFSET ',[limit,offset]);
    const c = await global.db.query('SELECT COUNT(*) FROM product_submissions');
    res.json({data:r.rows,total:parseInt(c.rows[0].count)});
  } catch(e){res.status(500).json({error:e.message});}
});

router.get('/stats', async (req,res) => {
  try {
    const pool = req.app.locals.pool;
    const r = await global.db.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='pending') AS pending, COUNT(*) FILTER (WHERE status='approved') AS approved, COUNT(*) FILTER (WHERE status='rejected') AS rejected FROM product_submissions");
    res.json(r.rows[0]);
  } catch(e){res.json({total:0,pending:0,approved:0,rejected:0});}
});

router.post('/', async (req,res) => {
  try {
    const pool = req.app.locals.pool;
    const d = req.body;
    const cols = ['grower_name','grower_email','grower_phone','company','commodity','variety','quantity','unit','pack_size','fob_price','available_date','shelf_life','harvest_location','destination_market','quality_grade','notes'];
    const vals = [d.growerName||null,d.growerEmail||null,d.growerPhone||null,d.company||null,d.commodity||null,d.variety||null,d.quantity||null,d.unit||'Carton',d.packSize||null,d.fobPrice||null,d.availableDate||null,d.shelfLife||null,d.harvestLocation||null,d.destinationMarket||null,d.qualityGrade||'US No. 1',d.notes||null];
    const r = await global.db.query('INSERT INTO product_submissions (' + cols.join(',') + ') VALUES (' + cols.map((_,i)=>'$'+(i+1)).join(',') + ') RETURNING *', vals);
    res.status(201).json({success:true,submission:r.rows[0]});
  } catch(e){res.status(500).json({error:e.message});}
});

router.post('/:id/approve', async (req,res) => {
  try {
    const pool = req.app.locals.pool;
    const r = await global.db.query("UPDATE product_submissions SET status='approved',admin_note=,approved_by=,approved_at=NOW() WHERE id= RETURNING *",[req.body.note||null,req.body.approvedBy||'admin',req.params.id]);
    res.json({success:true,submission:r.rows[0]});
  } catch(e){res.status(500).json({error:e.message});}
});

router.post('/:id/reject', async (req,res) => {
  try {
    const pool = req.app.locals.pool;
    const r = await global.db.query("UPDATE product_submissions SET status='rejected',admin_note=,rejected_by=,rejected_at=NOW() WHERE id= RETURNING *",[req.body.note||null,req.body.rejectedBy||'admin',req.params.id]);
    res.json({success:true,submission:r.rows[0]});
  } catch(e){res.status(500).json({error:e.message});}
});

module.exports = router;
module.exports.initTable = initTable;


