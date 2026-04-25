// routes/factor-intake.js  --  Sprint C P4 Deal Floor intake
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

router.post('/manual', authRequired, async (req, res) => {
  const db = getDb();
  if (!db) return res.status(500).json({ error: 'db_unavailable' });
  try {
    const b = req.body || {};
    const userId = (req.user && (req.user.id || req.user.user_id)) || null;

    const grower_name    = b.grower_name || null;
    const buyer_name     = b.buyer_name || null;
    const commodity      = b.commodity || null;
    const quantity       = b.quantity != null ? Number(b.quantity) : null;
    const unit           = b.unit || b.quantity_unit || null;
    const unit_price     = b.unit_price != null ? Number(b.unit_price) : null;
    const invoice_amount = b.invoice_amount != null ? Number(b.invoice_amount)
                         : (b.total_value != null ? Number(b.total_value) : null);
    const volume_lbs     = b.volume_lbs != null ? Number(b.volume_lbs) : null;
    const invoice_number = b.invoice_number || null;
    const po_number      = b.po_number || null;
    const invoice_date   = b.invoice_date || b.ship_date || null;
    const due_date       = b.due_date || null;
    const payment_terms  = b.payment_terms || null;
    const origin_region  = b.origin_region
                         || [b.origin_state, b.origin_country].filter(Boolean).join(', ') || null;
    const destination_region = b.destination_region
                         || [b.dest_state, b.dest_country].filter(Boolean).join(', ') || null;
    const harvest_window = b.harvest_window || null;
    const notes          = b.notes || null;
    const source_lang    = b.source_lang || 'en';
    const source_type    = b.source_type || b.source_channel || 'manual';

    const sql = `
      INSERT INTO financing_deals
        (grower_name, buyer_name, commodity,
         quantity, unit, unit_price, invoice_amount, volume_lbs,
         invoice_number, po_number, invoice_date, due_date, payment_terms,
         origin_region, destination_region, harvest_window,
         notes, source_lang, source_type,
         status, stage, created_by, created_at, updated_at)
      VALUES
        ($1,$2,$3,
         $4,$5,$6,$7,$8,
         $9,$10,$11,$12,$13,
         $14,$15,$16,
         $17,$18,$19,
         'ELIGIBLE','PROPOSAL',$20, NOW(), NOW())
      RETURNING id, invoice_number, po_number, invoice_amount, created_at`;

    const r = await db.query(sql, [
      grower_name, buyer_name, commodity,
      quantity, unit, unit_price, invoice_amount, volume_lbs,
      invoice_number, po_number, invoice_date, due_date, payment_terms,
      origin_region, destination_region, harvest_window,
      notes, source_lang, source_type,
      userId
    ]);
    const row = r.rows[0];
    return res.json({
      ok: true,
      deal_id: row.id,
      invoice_number: row.invoice_number,
      po_number: row.po_number,
      invoice_amount: row.invoice_amount,
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
      `SELECT id, grower_name, buyer_name, commodity, invoice_amount, status, stage, created_at
       FROM financing_deals ORDER BY created_at DESC LIMIT 50`
    );
    return res.json({ ok: true, deals: r.rows });
  } catch (e) {
    console.error('[factor-intake/deals] ERROR:', e.message);
    return res.status(500).json({ error: 'query_failed', detail: e.message });
  }
});

router.get('/health', (req, res) => res.json({ ok: true, route: 'factor-intake' }));

module.exports = router;