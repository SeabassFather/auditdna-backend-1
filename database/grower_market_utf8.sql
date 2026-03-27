// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PRODUCT MARKET ENGINE v1.0 â€” Grower-to-Buyer Pipeline
// Save to: C:\AuditDNA\backend\routes\product-market.js
// Auto-mounts at: /api/product-market (via server.js auto-loader)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Flow: Grower submits product â†’ hits calendar â†’ AI matches buyers â†’
//       generates open market offer â†’ Saul pushes email â†’ PO/factoring
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const express = require('express');
const router  = express.Router();
const path    = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Dedicated pool (same pattern as grower-pipeline)
const mktPool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME     || 'auditdna',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD,
  max:      5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 8000,
});
mktPool.on('error', err => console.error('[MKT-POOL] Error:', err.message));

const pool = () => mktPool;

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 1. TERMS ACCEPTANCE â€” POST /api/product-market/terms/accept
//    Grower must accept before products go live
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.post('/terms/accept', async (req, res) => {
  const {
    grower_id, digital_signature, accepted_ip,
    po_fee_pct, factoring_fee_pct, advance_pct, balance_pct,
    billing_basis, buyer_paca_license,
  } = req.body;

  if (!grower_id || !digital_signature) {
    return res.status(400).json({ error: 'grower_id and digital_signature required' });
  }

  try {
    // Check grower exists
    const gCheck = await pool().query('SELECT id, email FROM grower_profiles WHERE id = $1', [grower_id]);
    if (gCheck.rows.length === 0) return res.status(404).json({ error: 'Grower not found' });

    const result = await pool().query(`
      INSERT INTO grower_terms (
        grower_id, digital_signature, accepted_ip, accepted, accepted_at,
        po_fee_pct, factoring_fee_pct, advance_pct, balance_pct,
        billing_basis, buyer_paca_license, paca_acknowledged
      ) VALUES ($1, $2, $3, TRUE, NOW(), $4, $5, $6, $7, $8, $9, TRUE)
      ON CONFLICT (grower_id) WHERE terms_version = '1.0'
      DO UPDATE SET
        digital_signature = $2, accepted_ip = $3, accepted = TRUE, accepted_at = NOW(),
        po_fee_pct = $4, factoring_fee_pct = $5, advance_pct = $6, balance_pct = $7
      RETURNING *
    `, [
      grower_id, digital_signature, accepted_ip || null,
      po_fee_pct || 3.00, factoring_fee_pct || 3.00,
      advance_pct || 83.00, balance_pct || 17.00,
      billing_basis || 'per_transaction',
      buyer_paca_license || null,
    ]);

    // Fire brain event
    try {
      await pool().query(
        `INSERT INTO brain_events (event_type, payload, created_at) VALUES ($1, $2, NOW())`,
        ['GROWER_TERMS_ACCEPTED', JSON.stringify({ grower_id, email: gCheck.rows[0].email })]
      );
    } catch { /* brain_events may not exist */ }

    res.status(201).json({ success: true, terms: result.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 2. GET TERMS STATUS â€” GET /api/product-market/terms/:grower_id
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.get('/terms/:grower_id', async (req, res) => {
  try {
    const result = await pool().query(
      'SELECT * FROM grower_terms WHERE grower_id = $1 ORDER BY created_at DESC LIMIT 1',
      [parseInt(req.params.grower_id)]
    );
    res.json({ accepted: result.rows.length > 0 && result.rows[0].accepted, terms: result.rows[0] || null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 3. SUBMIT PRODUCT â€” POST /api/product-market/submit
//    Grower submits product availability for the open market
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.post('/submit', async (req, res) => {
  const {
    grower_id, commodity, variety, origin_region, origin_country,
    quantity, unit, packaging, pack_size,
    available_from, available_to, delivery_frequency,
    fob_price, price_unit, price_negotiable,
    certifications, organic, globalgap, primus_gfs,
    water_test_doc_id, soil_test_doc_id, fertilizer_test_doc_id, seed_germ_doc_id,
    notes,
  } = req.body;

  if (!grower_id || !commodity) {
    return res.status(400).json({ error: 'grower_id and commodity required' });
  }

  try {
    // Verify grower exists and terms accepted
    const [gCheck, tCheck] = await Promise.all([
      pool().query('SELECT id, compliance_status, risk_tier FROM grower_profiles WHERE id = $1', [grower_id]),
      pool().query('SELECT accepted FROM grower_terms WHERE grower_id = $1 AND accepted = TRUE', [grower_id]),
    ]);

    if (gCheck.rows.length === 0) return res.status(404).json({ error: 'Grower not found' });
    if (tCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Grower must accept trade terms before submitting products', code: 'TERMS_NOT_ACCEPTED' });
    }

    const result = await pool().query(`
      INSERT INTO product_submissions (
        grower_id, commodity, variety, origin_region, origin_country,
        quantity, unit, packaging, pack_size,
        available_from, available_to, delivery_frequency,
        fob_price, price_unit, price_negotiable,
        certifications, organic, globalgap, primus_gfs,
        water_test_doc_id, soil_test_doc_id, fertilizer_test_doc_id, seed_germ_doc_id,
        notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
      RETURNING *
    `, [
      grower_id, commodity, variety || null, origin_region || null, origin_country || 'Mexico',
      quantity || null, unit || null, packaging || null, pack_size || null,
      available_from || null, available_to || null, delivery_frequency || null,
      fob_price || null, price_unit || 'per_case', price_negotiable !== false,
      certifications || null, organic || false, globalgap || false, primus_gfs || false,
      water_test_doc_id || null, soil_test_doc_id || null,
      fertilizer_test_doc_id || null, seed_germ_doc_id || null,
      notes || null,
    ]);

    // Fire brain event
    try {
      await pool().query(
        `INSERT INTO brain_events (event_type, payload, created_at) VALUES ($1, $2, NOW())`,
        ['PRODUCT_SUBMITTED', JSON.stringify({
          grower_id, commodity, quantity, fob_price,
          available_from, available_to, submission_id: result.rows[0].id,
        })]
      );
    } catch { /* non-critical */ }

    res.status(201).json({ success: true, submission: result.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 4. LIST SUBMISSIONS â€” GET /api/product-market/submissions
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.get('/submissions', async (req, res) => {
  const { grower_id, commodity, status, limit: lim, page: pg } = req.query;
  const page  = Math.max(1, parseInt(pg || '1'));
  const limit = Math.min(200, Math.max(1, parseInt(lim || '50')));
  const offset = (page - 1) * limit;

  let where = [], values = [], idx = 1;
  if (grower_id)  { where.push(`ps.grower_id = $${idx++}`); values.push(parseInt(grower_id)); }
  if (commodity)   { where.push(`ps.commodity ILIKE $${idx++}`); values.push(`%${commodity}%`); }
  if (status)      { where.push(`ps.status = $${idx++}`); values.push(status); }

  const clause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  try {
    const result = await pool().query(`
      SELECT ps.*, gp.first_name, gp.last_name, gp.company_name, gp.compliance_status, gp.grs_score
      FROM product_submissions ps
      JOIN grower_profiles gp ON gp.id = ps.grower_id
      ${clause}
      ORDER BY ps.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, [...values, limit, offset]);

    const count = await pool().query(`SELECT COUNT(*) FROM product_submissions ps ${clause}`, values);

    res.json({ data: result.rows, total: parseInt(count.rows[0].count), page, limit });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 5. APPROVE SUBMISSION â€” PATCH /api/product-market/submissions/:id/approve
//    Admin approves product for the open market + calendar
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.patch('/submissions/:id/approve', async (req, res) => {
  const id = parseInt(req.params.id);
  const { approved_by } = req.body;

  try {
    const result = await pool().query(`
      UPDATE product_submissions
      SET status = 'listed', approved_by = $1, approved_at = NOW(), listed_at = NOW()
      WHERE id = $2 AND status IN ('submitted', 'approved')
      RETURNING *
    `, [approved_by || 'admin', id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Submission not found or already listed' });

    // Fire brain event â€” product is now on the calendar
    try {
      const sub = result.rows[0];
      await pool().query(
        `INSERT INTO brain_events (event_type, payload, created_at) VALUES ($1, $2, NOW())`,
        ['PRODUCT_LISTED', JSON.stringify({
          submission_id: sub.id, grower_id: sub.grower_id,
          commodity: sub.commodity, quantity: sub.quantity,
          fob_price: sub.fob_price,
          available_from: sub.available_from, available_to: sub.available_to,
        })]
      );
    } catch { /* non-critical */ }

    res.json({ success: true, submission: result.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 6. MATCH BUYERS â€” POST /api/product-market/match/:submission_id
//    AI/SI matches listed product to buyers based on commodity preferences
//    Returns matched buyers + generates draft email offers
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.post('/match/:submission_id', async (req, res) => {
  const submission_id = parseInt(req.params.submission_id);

  try {
    // Get the product submission
    const subR = await pool().query(`
      SELECT ps.*, gp.first_name, gp.last_name, gp.company_name, gp.country
      FROM product_submissions ps
      JOIN grower_profiles gp ON gp.id = ps.grower_id
      WHERE ps.id = $1
    `, [submission_id]);

    if (subR.rows.length === 0) return res.status(404).json({ error: 'Submission not found' });
    const sub = subR.rows[0];

    // Match buyers from the buyers table whose product_specialties overlap
    // Uses ILIKE for fuzzy commodity matching
    const commodity = sub.commodity.split(',')[0].trim(); // primary commodity
    const buyersR = await pool().query(`
      SELECT id, first_name, last_name, email, email_address, company_name,
             product_specialties, delivery_destination, buyer_type, city, state_region
      FROM buyers
      WHERE (product_specialties ILIKE $1 OR product_specialties ILIKE $2)
        AND (email IS NOT NULL OR email_address IS NOT NULL)
      ORDER BY id DESC
      LIMIT 100
    `, [`%${commodity}%`, `%${sub.commodity}%`]);

    const buyers = buyersR.rows;
    const growerName = `${sub.first_name} ${sub.last_name || ''}`.trim();
    const offers = [];

    // Generate draft email offers for each matched buyer
    for (const buyer of buyers) {
      const buyerEmail = buyer.email || buyer.email_address;
      const buyerName  = buyer.first_name ? `${buyer.first_name} ${buyer.last_name || ''}`.trim() : (buyer.company_name || 'Valued Buyer');
      const deliveryWindow = sub.available_from && sub.available_to
        ? `${new Date(sub.available_from).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(sub.available_to).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        : 'Immediate availability';

      const emailSubject = `Fresh ${sub.commodity} Available â€” ${sub.origin_region || sub.origin_country} Origin | CM Products Group`;

      const emailBody = `Dear ${buyerName},

CM Products Group, LLC. is pleased to offer the following product from our verified grower network:

PRODUCT: ${sub.commodity}${sub.variety ? ' (' + sub.variety + ')' : ''}
ORIGIN: ${sub.origin_region || ''} ${sub.origin_country || 'Mexico'}
GROWER: ${sub.company_name || growerName} (GRS Score: ${sub.grs_score || 'Pending'})
QUANTITY: ${sub.quantity || 'Contact for availability'}
PACKAGING: ${sub.packaging || 'Standard'}
FOB PRICE: ${sub.fob_price ? '$' + sub.fob_price + ' ' + (sub.price_unit || 'per case') : 'Contact for pricing'}
DELIVERY: ${deliveryWindow}
FREQUENCY: ${sub.delivery_frequency || 'As needed'}

CERTIFICATIONS: ${sub.certifications || 'Available upon request'}
${sub.organic ? 'USDA ORGANIC CERTIFIED' : ''}${sub.globalgap ? ' | GlobalGAP' : ''}${sub.primus_gfs ? ' | PrimusGFS' : ''}

All products are fully traceable via the AuditDNA Agriculture Intelligence Platform with complete water, soil, fertilizer, and seed germination analysis on file. FSMA 204 compliant.

CM Products Group, LLC. is a PACA-licensed buyer. Purchase orders and invoice factoring available.

To place an order or request samples, reply to this email or contact us directly.

Best regards,
Saul Garcia
CM Products Group, LLC. | Mexausa Food Group, Inc.
NMLS #337526
Saul@mexausafg.com | +1-831-251-3116`;

      // Insert draft offer
      const offerR = await pool().query(`
        INSERT INTO market_offers (
          submission_id, grower_id, buyer_id, buyer_email, buyer_name, buyer_company,
          commodity, quantity_offered, fob_price, delivery_window,
          email_subject, email_body, email_status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'draft')
        RETURNING id, buyer_email, buyer_name, buyer_company, email_status
      `, [
        submission_id, sub.grower_id,
        buyer.id, buyerEmail, buyerName, buyer.company_name || '',
        sub.commodity, sub.quantity, sub.fob_price, deliveryWindow,
        emailSubject, emailBody,
      ]);

      offers.push(offerR.rows[0]);
    }

    // Update submission with match count
    await pool().query(
      `UPDATE product_submissions SET buyers_matched = $1, status = 'matched' WHERE id = $2`,
      [buyers.length, submission_id]
    );

    // Fire brain event
    try {
      await pool().query(
        `INSERT INTO brain_events (event_type, payload, created_at) VALUES ($1, $2, NOW())`,
        ['BUYERS_MATCHED', JSON.stringify({
          submission_id, commodity: sub.commodity,
          buyers_matched: buyers.length, offers_created: offers.length,
        })]
      );
    } catch { /* non-critical */ }

    res.json({
      success: true,
      submission_id,
      commodity: sub.commodity,
      buyers_matched: buyers.length,
      offers: offers,
      message: `${offers.length} draft offers created. Review and push to send.`,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 7. LIST OFFERS â€” GET /api/product-market/offers
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.get('/offers', async (req, res) => {
  const { submission_id, email_status, grower_id } = req.query;
  let where = [], values = [], idx = 1;
  if (submission_id) { where.push(`submission_id = $${idx++}`); values.push(parseInt(submission_id)); }
  if (email_status)  { where.push(`email_status = $${idx++}`); values.push(email_status); }
  if (grower_id)     { where.push(`grower_id = $${idx++}`); values.push(parseInt(grower_id)); }

  const clause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  try {
    const result = await pool().query(
      `SELECT * FROM market_offers ${clause} ORDER BY created_at DESC LIMIT 200`,
      values
    );
    res.json({ offers: result.rows, total: result.rows.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 8. PUSH OFFERS â€” POST /api/product-market/offers/push
//    Saul pushes the button â€” queues selected offers for email send
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.post('/offers/push', async (req, res) => {
  const { offer_ids } = req.body; // array of offer IDs to send

  if (!offer_ids || !Array.isArray(offer_ids) || offer_ids.length === 0) {
    return res.status(400).json({ error: 'offer_ids array required' });
  }

  try {
    const placeholders = offer_ids.map((_, i) => `$${i + 1}`).join(',');
    const result = await pool().query(
      `UPDATE market_offers SET email_status = 'queued', updated_at = NOW()
       WHERE id IN (${placeholders}) AND email_status = 'draft'
       RETURNING id, buyer_email, buyer_name, commodity, email_status`,
      offer_ids
    );

    // Update submission offer counts
    const submissions = [...new Set(result.rows.map(r => r.submission_id))];
    for (const sid of submissions) {
      if (sid) {
        await pool().query(
          `UPDATE product_submissions SET offers_sent = offers_sent + $1, last_offered_at = NOW() WHERE id = $2`,
          [result.rows.filter(r => r.submission_id === sid).length, sid]
        );
      }
    }

    // Fire brain event
    try {
      await pool().query(
        `INSERT INTO brain_events (event_type, payload, created_at) VALUES ($1, $2, NOW())`,
        ['OFFERS_PUSHED', JSON.stringify({ count: result.rows.length, offer_ids: result.rows.map(r => r.id) })]
      );
    } catch { /* non-critical */ }

    res.json({
      success: true,
      queued: result.rows.length,
      offers: result.rows,
      message: `${result.rows.length} offers queued for email delivery.`,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 9. RECORD TESTING â€” POST /api/product-market/testing
//    Upload/record testing results (water, soil, fertilizer, seed germ)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.post('/testing', async (req, res) => {
  const {
    grower_id, submission_id, test_type, commodity, season,
    doc_id, lab_name, test_date, expiry_date, result_summary, pass_fail,
  } = req.body;

  if (!grower_id || !test_type) {
    return res.status(400).json({ error: 'grower_id and test_type required' });
  }

  const validTypes = ['water', 'soil', 'fertilizer', 'seed_germination', 'pesticide_residue'];
  if (!validTypes.includes(test_type)) {
    return res.status(400).json({ error: `test_type must be one of: ${validTypes.join(', ')}` });
  }

  try {
    const result = await pool().query(`
      INSERT INTO grower_testing (
        grower_id, submission_id, test_type, commodity, season,
        doc_id, lab_name, test_date, expiry_date, result_summary, pass_fail, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *
    `, [
      grower_id, submission_id || null, test_type, commodity || null, season || null,
      doc_id || null, lab_name || null, test_date || null, expiry_date || null,
      result_summary || null, pass_fail || null, doc_id ? 'uploaded' : 'pending',
    ]);

    res.status(201).json({ success: true, testing: result.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 10. GET TESTING STATUS â€” GET /api/product-market/testing/:grower_id
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.get('/testing/:grower_id', async (req, res) => {
  try {
    const result = await pool().query(
      'SELECT * FROM grower_testing WHERE grower_id = $1 ORDER BY created_at DESC',
      [parseInt(req.params.grower_id)]
    );

    // Check completeness
    const types = result.rows.map(r => r.test_type);
    const required = ['water', 'soil', 'fertilizer', 'seed_germination'];
    const missing = required.filter(t => !types.includes(t));
    const allPassed = result.rows.every(r => r.pass_fail === 'pass' || r.status === 'approved');

    res.json({
      tests: result.rows,
      total: result.rows.length,
      missing,
      complete: missing.length === 0,
      all_passed: allPassed,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 11. ACTIVE PRODUCTS VIEW â€” GET /api/product-market/active
//     What's currently available on the calendar for buyers
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.get('/active', async (req, res) => {
  try {
    const result = await pool().query('SELECT * FROM v_active_products ORDER BY available_from');
    res.json({ products: result.rows, total: result.rows.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 12. OFFER PIPELINE VIEW â€” GET /api/product-market/pipeline
//     Full pipeline: all offers with grower + buyer info
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.get('/pipeline', async (req, res) => {
  try {
    const result = await pool().query('SELECT * FROM v_offer_pipeline ORDER BY created_at DESC LIMIT 500');
    res.json({ pipeline: result.rows, total: result.rows.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 13. MARKET STATS â€” GET /api/product-market/stats
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.get('/stats', async (req, res) => {
  try {
    const result = await pool().query(`
      SELECT
        (SELECT COUNT(*) FROM product_submissions)::int AS total_submissions,
        (SELECT COUNT(*) FROM product_submissions WHERE status = 'listed')::int AS active_listings,
        (SELECT COUNT(*) FROM product_submissions WHERE status = 'matched')::int AS matched,
        (SELECT COUNT(*) FROM market_offers)::int AS total_offers,
        (SELECT COUNT(*) FROM market_offers WHERE email_status = 'draft')::int AS draft_offers,
        (SELECT COUNT(*) FROM market_offers WHERE email_status = 'queued')::int AS queued_offers,
        (SELECT COUNT(*) FROM market_offers WHERE email_status = 'sent')::int AS sent_offers,
        (SELECT COUNT(*) FROM grower_terms WHERE accepted = TRUE)::int AS terms_accepted,
        (SELECT COUNT(*) FROM grower_testing)::int AS total_tests
    `);
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

process.on('exit', () => mktPool.end().catch(() => {}));
