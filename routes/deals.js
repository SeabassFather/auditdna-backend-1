// ============================================================================
// UNIFIED DEAL RECORD — Mexausa Food Group
// The spine that connects LOAF match → negotiation → PO → invoice →
// factoring → payment → commission → report
// POST   /api/deals/create
// GET    /api/deals/:id
// PATCH  /api/deals/:id/status
// GET    /api/deals/summary (Saul dashboard feed)
// ============================================================================
const express = require('express');
const { calcCommission } = require('../services/commission-engine');
const router = express.Router();
const pool = require('../db');

const SMTP = {
  host: 'smtp.gmail.com', port: 587, secure: false,
  auth: { user: 'sgarcia1911@gmail.com', pass: process.env.GMAIL_APP_PASSWORD || 'emgptqrmqdbxrpil' }
};

// Auto-create deals table on first load
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS deals (
      id              SERIAL PRIMARY KEY,
      deal_ref        VARCHAR(24) UNIQUE NOT NULL,
      status          VARCHAR(32) DEFAULT 'matched',
      origin          VARCHAR(32) DEFAULT 'loaf',
      commodity       VARCHAR(120),
      volume          VARCHAR(80),
      unit            VARCHAR(40),
      price_fob       NUMERIC(12,2),
      price_agreed    NUMERIC(12,2),
      total_value     NUMERIC(14,2),
      grower_name     VARCHAR(120),
      grower_phone    VARCHAR(40),
      grower_email    VARCHAR(120),
      grower_location VARCHAR(200),
      grower_country  VARCHAR(4) DEFAULT 'MX',
      buyer_name      VARCHAR(120),
      buyer_phone     VARCHAR(40),
      buyer_email     VARCHAR(120),
      buyer_company   VARCHAR(120),
      buyer_location  VARCHAR(200),
      sale_type       VARCHAR(24) DEFAULT 'direct',
      buy_type        VARCHAR(24) DEFAULT 'direct',
      radius_mi       INTEGER DEFAULT 100,
      freight_region  VARCHAR(40),
      freight_per_ctn NUMERIC(8,2),
      landed_cost     NUMERIC(12,2),
      commission_pct  NUMERIC(5,3) DEFAULT 2.500,
      commission_amt  NUMERIC(10,2),
      factoring_partner VARCHAR(80) DEFAULT 'Liquid Capital Group',
      factoring_amt   NUMERIC(14,2),
      factoring_status VARCHAR(32) DEFAULT 'pending',
      po_number       VARCHAR(60),
      invoice_number  VARCHAR(60),
      invoice_amt     NUMERIC(14,2),
      payment_status  VARCHAR(32) DEFAULT 'unpaid',
      payment_date    TIMESTAMP,
      stage_matched   TIMESTAMP DEFAULT NOW(),
      stage_negotiating TIMESTAMP,
      stage_po_issued TIMESTAMP,
      stage_invoiced  TIMESTAMP,
      stage_factored  TIMESTAMP,
      stage_paid      TIMESTAMP,
      stage_closed    TIMESTAMP,
      notes           TEXT,
      created_at      TIMESTAMP DEFAULT NOW(),
      updated_at      TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS deals_status_idx ON deals(status);
    CREATE INDEX IF NOT EXISTS deals_commodity_idx ON deals(commodity);
    CREATE INDEX IF NOT EXISTS deals_created_idx ON deals(created_at DESC);
  `).catch(e => console.warn('[deals] table init:', e.message));
}
ensureTable();

// Generate deal reference: MFG-YYYYMMDD-XXXX
function dealRef() {
  const d = new Date();
  const dt = d.toISOString().slice(0,10).replace(/-/g,'');
  const rnd = Math.random().toString(36).slice(2,6).toUpperCase();
  return `MFG-${dt}-${rnd}`;
}

async function notify(subject, body) {
  try {
    const nodemailer = require('nodemailer');
    const t = nodemailer.createTransport(SMTP);
    await t.sendMail({ from:'"Mexausa LOAF" <sgarcia1911@gmail.com>',
      to:'sgarcia1911@gmail.com', subject, text: body });
  } catch(_) {}
}

// ── CREATE DEAL ──────────────────────────────────────────────────────────────
router.post('/create', async (req, res) => {
  const ref = dealRef();
  const {
    commodity, volume, unit, price_fob, price_agreed, total_value,
    grower_name, grower_phone, grower_email, grower_location, grower_country,
    buyer_name, buyer_phone, buyer_email, buyer_company, buyer_location,
    sale_type, buy_type, radius_mi, freight_region, freight_per_ctn,
    commission_pct, factoring_partner, origin, notes
  } = req.body;

  const tv = parseFloat(total_value) || (parseFloat(price_agreed||price_fob||0) * parseFloat(volume||1));
  const commCalc = calcCommission({
    commodity: commodity||'',
    grower_country: grower_country||'MX',
    total_value: tv,
    prior_deals: parseInt(req.body.prior_deals)||0,
    deal_duration_days: parseInt(req.body.deal_duration_days)||0,
    sale_type: sale_type||'direct',
  });
  const commPct = commCalc.pct;
  const commAmt = commCalc.amount.toFixed(2);
  const landed = (parseFloat(price_fob||0) + parseFloat(freight_per_ctn||0)).toFixed(2);

  try {
    const r = await pool.query(`
      INSERT INTO deals (
        deal_ref, status, origin, commodity, volume, unit,
        price_fob, price_agreed, total_value,
        grower_name, grower_phone, grower_email, grower_location, grower_country,
        buyer_name, buyer_phone, buyer_email, buyer_company, buyer_location,
        sale_type, buy_type, radius_mi, freight_region, freight_per_ctn,
        landed_cost, commission_pct, commission_amt, factoring_partner, notes
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
        $15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29
      ) RETURNING *`,
      [ref,'matched',origin||'loaf',commodity,volume,unit,
       price_fob,price_agreed,tv,
       grower_name,grower_phone,grower_email,grower_location,grower_country||'MX',
       buyer_name,buyer_phone,buyer_email,buyer_company,buyer_location,
       sale_type||'direct',buy_type||'direct',radius_mi||100,
       freight_region,freight_per_ctn,landed,commPct,commAmt,
       factoring_partner||'Liquid Capital Group',notes||'']
    );
    const deal = r.rows[0];

    await notify(
      `[DEAL CREATED] ${ref} — ${commodity} — $${parseFloat(tv).toLocaleString()}`,
      `NEW DEAL RECORD

Ref: ${ref}
Commodity: ${commodity}
Volume: ${volume}
Value: $${parseFloat(tv).toLocaleString()}

Grower: ${grower_name} — ${grower_phone}
Buyer: ${buyer_name} (${buyer_company}) — ${buyer_phone}

Commission: ${commPct}% = $${commAmt}
Factoring: ${factoring_partner||'Liquid Capital Group'}

Status: MATCHED
View at mexausafg.com

Ref: ${ref}`
    );

    res.json({ ok: true, deal_ref: ref, deal, commission: commCalc });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── UPDATE DEAL STATUS ────────────────────────────────────────────────────────
router.patch('/:id/status', async (req, res) => {
  const { status, po_number, invoice_number, invoice_amt,
          payment_status, payment_date, price_agreed, notes } = req.body;
  const id = req.params.id;

  const stageMap = {
    negotiating:  'stage_negotiating',
    po_issued:    'stage_po_issued',
    invoiced:     'stage_invoiced',
    factored:     'stage_factored',
    paid:         'stage_paid',
    closed:       'stage_closed',
  };

  const stageCol = stageMap[status];
  const stageSQL = stageCol ? `, ${stageCol} = NOW()` : '';

  try {
    const r = await pool.query(`
      UPDATE deals SET
        status = COALESCE($1, status),
        po_number = COALESCE($2, po_number),
        invoice_number = COALESCE($3, invoice_number),
        invoice_amt = COALESCE($4, invoice_amt),
        payment_status = COALESCE($5, payment_status),
        payment_date = COALESCE($6::timestamp, payment_date),
        price_agreed = COALESCE($7, price_agreed),
        notes = COALESCE($8, notes),
        updated_at = NOW()
        ${stageSQL}
      WHERE id = $9 OR deal_ref = $9
      RETURNING *`,
      [status, po_number, invoice_number, invoice_amt,
       payment_status, payment_date||null, price_agreed, notes, id]
    );
    const deal = r.rows[0];
    if (!deal) return res.status(404).json({ error: 'Deal not found' });

    const tv = parseFloat(deal.total_value||0);
    await notify(
      `[DEAL ${status?.toUpperCase()}] ${deal.deal_ref} — ${deal.commodity}`,
      `DEAL UPDATE

Ref: ${deal.deal_ref}
Status: ${status}
Commodity: ${deal.commodity}
Value: $${tv.toLocaleString()}
Grower: ${deal.grower_name}
Buyer: ${deal.buyer_name}
${po_number?'PO: '+po_number+'
':''}${invoice_number?'Invoice: '+invoice_number+'
':''}Commission: $${deal.commission_amt}
Mexausa earns when PAID.`
    );

    res.json({ ok: true, deal });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET DEAL ─────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT * FROM deals WHERE id = $1 OR deal_ref = $1 LIMIT 1`,
      [req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true, deal: r.rows[0] });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── DASHBOARD SUMMARY — Saul's feed ──────────────────────────────────────────
router.get('/summary/all', async (req, res) => {
  try {
    const [totals, recent, pipeline, commissions] = await Promise.all([
      pool.query(`SELECT
        COUNT(*) as total_deals,
        COUNT(*) FILTER (WHERE status='matched') as matched,
        COUNT(*) FILTER (WHERE status='negotiating') as negotiating,
        COUNT(*) FILTER (WHERE status='po_issued') as po_issued,
        COUNT(*) FILTER (WHERE status='invoiced') as invoiced,
        COUNT(*) FILTER (WHERE status='factored') as factored,
        COUNT(*) FILTER (WHERE status='paid') as paid,
        COUNT(*) FILTER (WHERE status='closed') as closed,
        COALESCE(SUM(total_value),0) as total_value,
        COALESCE(SUM(commission_amt),0) as total_commission,
        COALESCE(SUM(commission_amt) FILTER (WHERE payment_status='paid'),0) as earned_commission
        FROM deals`),
      pool.query(`SELECT deal_ref,status,commodity,volume,total_value,
        commission_amt,grower_name,buyer_name,created_at
        FROM deals ORDER BY created_at DESC LIMIT 10`),
      pool.query(`SELECT status, COUNT(*) as count,
        COALESCE(SUM(total_value),0) as value
        FROM deals GROUP BY status ORDER BY MIN(created_at)`),
      pool.query(`SELECT
        COALESCE(SUM(commission_amt),0) as pending,
        COALESCE(SUM(commission_amt) FILTER (WHERE payment_status='paid'),0) as paid
        FROM deals`)
    ]);

    res.json({
      ok: true,
      totals: totals.rows[0],
      recent: recent.rows,
      pipeline: pipeline.rows,
      commissions: commissions.rows[0]
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── LIST DEALS ────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { status, commodity, limit=50, offset=0 } = req.query;
  try {
    const where = [];
    const params = [];
    if (status) { params.push(status); where.push(`status=$${params.length}`); }
    if (commodity) { params.push(`%${commodity}%`); where.push(`commodity ILIKE $${params.length}`); }
    params.push(parseInt(limit)); params.push(parseInt(offset));
    const r = await pool.query(
      `SELECT * FROM deals ${where.length?'WHERE '+where.join(' AND '):''}
       ORDER BY created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`,
      params
    );
    const ct = await pool.query(`SELECT COUNT(*) FROM deals ${where.length?'WHERE '+where.slice(0,-2).join(' AND '):''}`);
    res.json({ ok: true, total: parseInt(ct.rows[0].count), deals: r.rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
