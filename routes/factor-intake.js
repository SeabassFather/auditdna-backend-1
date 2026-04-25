// routes/factor-intake.js  --  Sprint C P4 Deal Floor intake
// POST /api/factor/intake/manual   (auth required)
// POST /api/factor/intake/parse    (auth, multipart, Vision parse stub)
// GET  /api/factor/intake/deals    (auth, list)

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'auditdna-dev-secret';

function authRequired(req, res, next) {
  const h = req.headers.authorization || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!t) return res.status(401).json({ error: 'no_token' });
  try { req.user = jwt.verify(t, JWT_SECRET); next(); }
  catch (e) { return res.status(401).json({ error: 'bad_token', detail: e.message }); }
}

function getDb() {
  if (global.db) return global.db;
  try { return require('../db'); } catch (e) {}
  try { return require('../src/db'); } catch (e) {}
  return null;
}

const COLS = [
  'grower_name','buyer_name','commodity','variety',
  'quantity','quantity_unit','unit_price','total_value',
  'invoice_number','po_number','ship_date','payment_terms',
  'origin_country','origin_state','dest_country','dest_state',
  'deal_type','source_channel','notes'
];

router.post('/manual', authRequired, async (req, res) => {
  const db = getDb();
  if (!db) return res.status(500).json({ error: 'db_unavailable' });

  try {
    const b = req.body || {};
    const vals = COLS.map(c => (b[c] === undefined ? null : b[c]));
    const userId = (req.user && (req.user.id || req.user.user_id)) || null;

    const placeholders = COLS.map((_, i) => '$' + (i + 1)).join(',');
    const colList = COLS.join(',');
    const sql =
      'INSERT INTO financing_deals (' + colList + ', created_by, status, created_at) ' +
      'VALUES (' + placeholders + ', $' + (COLS.length + 1) + ", 'INTAKE', NOW()) " +
      'RETURNING id, invoice_number, po_number, total_value, created_at';

    const r = await db.query(sql, [...vals, userId]);
    const row = r.rows[0];
    return res.json({
      ok: true,
      deal_id: row.id,
      invoice_number: row.invoice_number,
      po_number: row.po_number,
      total_value: row.total_value,
      created_at: row.created_at
    });
  } catch (e) {
    console.error('[factor-intake/manual] ERROR:', e.message);
    return res.status(500).json({ error: 'insert_failed', detail: e.message });
  }
});

router.post('/parse', authRequired, async (req, res) => {
  return res.json({ ok: true, parsed: {}, note: 'vision_parse_stub' });
});

router.get('/deals', authRequired, async (req, res) => {
  const db = getDb();
  if (!db) return res.status(500).json({ error: 'db_unavailable' });
  try {
    const r = await db.query(
      'SELECT id, grower_name, buyer_name, commodity, total_value, status, created_at ' +
      'FROM financing_deals ORDER BY created_at DESC LIMIT 50'
    );
    return res.json({ ok: true, deals: r.rows });
  } catch (e) {
    console.error('[factor-intake/deals] ERROR:', e.message);
    return res.status(500).json({ error: 'query_failed', detail: e.message });
  }
});

router.get('/health', (req, res) => res.json({ ok: true, route: 'factor-intake' }));

module.exports = router;