// ═══════════════════════════════════════════════════════════════════════════
// SECURE BUYERS — Backend Routes (Express)
// Mexausa Food Group, Inc. | AuditDNA Agriculture Intelligence
// Save to: C:\AuditDNA\backend\routes\buyers.routes.js
// Mount in server.js:
//   const buyersRouter = require('./routes/buyers.routes');
//   app.use('/api/buyers', buyersRouter);
//   console.log('[OK] buyers.routes: mounted at /api/buyers');
// ═══════════════════════════════════════════════════════════════════════════

const express = require('express');
const router  = express.Router();
const db      = global.db || require('../db/connection');

// ──────────────────────────────────────────────────────────────────────────
// Brain event fire helper (non-blocking)
// ──────────────────────────────────────────────────────────────────────────
async function pingBrain(eventType, payload, source = 'buyers.routes') {
  try {
    await db.query(
      `INSERT INTO brain_events(event_type, payload, source, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [eventType, JSON.stringify(payload), source]
    );
  } catch (e) {
    // brain_events table may not exist yet — swallow
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Auth middleware (reuse existing JWT from auth.js)
// ──────────────────────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ success: false, error: 'No auth token' });
  try {
    const jwt = require('jsonwebtoken');
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'auditdna2026secret');
    next();
  } catch (e) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

function requireOwnerOrAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const role = String(req.user.role || '').toLowerCase();
  if (role === 'owner' || role === 'admin' || role === 'compliance') return next();
  return res.status(403).json({ success: false, error: 'Owner/admin/compliance role required' });
}

// ──────────────────────────────────────────────────────────────────────────
// POST /api/buyers/register   (PUBLIC - no auth required, self-serve)
// Creates registration in pending status. Fires brain event.
// ──────────────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const {
      legal_name, dba, country, state_province, city, address_line1, address_line2,
      postal_code, website, year_established, business_type,
      fein, duns_number, paca_license, state_license, sales_tax_id,
      rfc, agace_caat, senasica_permit, padron_importadores, customs_broker_patente,
      ruc_peru, senasa_peru_permit, adex_member,
      rut_empresa, sag_permit,
      nit_colombia, ica_import_permit,
      payment_terms_requested, commodities_preferred, regions_served, cold_chain_capability,
      contacts, trade_refs
    } = req.body || {};

    if (!legal_name || !country) {
      return res.status(400).json({ success: false, error: 'legal_name and country required' });
    }

    const insert = await db.query(`
      INSERT INTO secure_buyers
        (legal_name, dba, country, state_province, city, address_line1, address_line2,
         postal_code, website, year_established, business_type,
         fein, duns_number, paca_license, state_license, sales_tax_id,
         rfc, agace_caat, senasica_permit, padron_importadores, customs_broker_patente,
         ruc_peru, senasa_peru_permit, adex_member,
         rut_empresa, sag_permit,
         nit_colombia, ica_import_permit,
         payment_terms_requested, commodities_preferred, regions_served, cold_chain_capability,
         registration_status)
      VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
         $12,$13,$14,$15,$16,
         $17,$18,$19,$20,$21,
         $22,$23,$24,
         $25,$26,
         $27,$28,
         $29,$30::jsonb,$31::jsonb,$32::jsonb,
         'pending')
      RETURNING id, legal_name, country, registration_status, created_at
    `, [
      legal_name, dba||null, country, state_province||null, city||null, address_line1||null, address_line2||null,
      postal_code||null, website||null, year_established||null, business_type||null,
      fein||null, duns_number||null, paca_license||null, state_license||null, sales_tax_id||null,
      rfc||null, agace_caat||null, senasica_permit||null, padron_importadores||null, customs_broker_patente||null,
      ruc_peru||null, senasa_peru_permit||null, adex_member||false,
      rut_empresa||null, sag_permit||null,
      nit_colombia||null, ica_import_permit||null,
      payment_terms_requested||'net30',
      JSON.stringify(commodities_preferred||[]),
      JSON.stringify(regions_served||[]),
      JSON.stringify(cold_chain_capability||{})
    ]);

    const newBuyer = insert.rows[0];

    // Save contacts
    if (Array.isArray(contacts)) {
      for (const c of contacts) {
        if (!c.role || !c.email) continue;
        await db.query(`
          INSERT INTO buyer_contacts (buyer_id, role, full_name, title, email, phone, whatsapp, is_signatory, preferred_language)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        `, [newBuyer.id, c.role, c.full_name||null, c.title||null, c.email, c.phone||null, c.whatsapp||null, !!c.is_signatory, c.preferred_language||'EN']);
      }
    }

    // Save trade refs
    if (Array.isArray(trade_refs)) {
      for (const t of trade_refs) {
        if (!t.company_name) continue;
        await db.query(`
          INSERT INTO buyer_trade_refs (buyer_id, ref_type, company_name, contact_name, contact_email, contact_phone, years_relationship, credit_limit_reported, payment_terms_reported)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        `, [newBuyer.id, t.ref_type||'supplier', t.company_name, t.contact_name||null, t.contact_email||null, t.contact_phone||null, t.years_relationship||null, t.credit_limit_reported||null, t.payment_terms_reported||null]);
      }
    }

    await pingBrain('BUYER_REGISTRATION_SUBMITTED', {
      buyer_id: newBuyer.id, country, legal_name, commodities: (commodities_preferred||[]).length
    });

    res.json({
      success: true,
      buyer: newBuyer,
      message: 'Registration submitted. You will receive an email when approved.'
    });
  } catch (err) {
    console.error('[BUYERS] register error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// GET /api/buyers   (list, filtered by role)
// ──────────────────────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, country, tier, q, limit = 200 } = req.query;
    const params = [];
    const where = [];
    if (status)  { params.push(status);  where.push(`registration_status = $${params.length}`); }
    if (country) { params.push(country); where.push(`country = $${params.length}`); }
    if (tier)    { params.push(tier);    where.push(`credit_tier = $${params.length}`); }
    if (q)       { params.push(`%${q}%`); where.push(`(legal_name ILIKE $${params.length} OR buyer_code ILIKE $${params.length})`); }
    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
    params.push(parseInt(limit) || 200);

    const role = String(req.user.role || '').toLowerCase();
    const isOwner = (role === 'owner' || role === 'compliance');

    // Non-owner roles see anonymized data (buyer_code + tier only, not legal_name)
    const sql = isOwner
      ? `SELECT * FROM secure_buyers ${whereSql} ORDER BY created_at DESC LIMIT $${params.length}`
      : `SELECT id, buyer_code, registration_status, credit_tier, country, state_province,
                business_type, commodities_preferred, regions_served, volume_ytd_usd,
                deals_completed_count, credit_limit_usd, last_activity_at, created_at
         FROM secure_buyers ${whereSql} ORDER BY created_at DESC LIMIT $${params.length}`;

    const r = await db.query(sql, params);
    res.json({ success: true, total: r.rowCount, data: r.rows, anonymized: !isOwner });
  } catch (err) {
    console.error('[BUYERS] list error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// GET /api/buyers/:id   (single buyer 360° view)
// ──────────────────────────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [buyer, contacts, docs, refs, events, deals] = await Promise.all([
      db.query('SELECT * FROM secure_buyers WHERE id=$1', [id]),
      db.query('SELECT * FROM buyer_contacts WHERE buyer_id=$1 ORDER BY role', [id]),
      db.query('SELECT * FROM buyer_documents WHERE buyer_id=$1 ORDER BY uploaded_at DESC', [id]),
      db.query('SELECT * FROM buyer_trade_refs WHERE buyer_id=$1', [id]),
      db.query('SELECT * FROM buyer_credit_events WHERE buyer_id=$1 ORDER BY created_at DESC LIMIT 50', [id]),
      db.query('SELECT * FROM buyer_deals WHERE buyer_id=$1 ORDER BY created_at DESC LIMIT 100', [id])
    ]);

    if (!buyer.rows.length) return res.status(404).json({ success: false, error: 'Not found' });

    const role = String(req.user.role || '').toLowerCase();
    const isOwner = (role === 'owner' || role === 'compliance');

    // Anonymize for non-owner
    const b = buyer.rows[0];
    if (!isOwner) {
      delete b.legal_name; delete b.dba; delete b.fein; delete b.rfc;
      delete b.duns_number; delete b.ruc_peru; delete b.rut_empresa; delete b.nit_colombia;
      delete b.address_line1; delete b.address_line2;
    }

    res.json({
      success: true,
      buyer: b,
      contacts: isOwner ? contacts.rows : contacts.rows.map(c => ({ role: c.role, preferred_language: c.preferred_language })),
      documents: isOwner ? docs.rows : [],
      trade_refs: isOwner ? refs.rows : [],
      credit_events: events.rows,
      deals: deals.rows,
      anonymized: !isOwner
    });
  } catch (err) {
    console.error('[BUYERS] detail error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// POST /api/buyers/:id/approve   (owner-only, generates buyer_code)
// ──────────────────────────────────────────────────────────────────────────
router.post('/:id/approve', requireAuth, requireOwnerOrAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { credit_limit_usd, payment_terms_approved, credit_tier, tenant_assigned_rep } = req.body || {};

    // Fetch buyer for code generation
    const buyer = await db.query('SELECT country, state_province FROM secure_buyers WHERE id=$1', [id]);
    if (!buyer.rows.length) return res.status(404).json({ success: false, error: 'Not found' });

    const codeResult = await db.query(
      'SELECT generate_buyer_code($1,$2) AS code',
      [buyer.rows[0].country, buyer.rows[0].state_province || 'XX']
    );
    const buyer_code = codeResult.rows[0].code;

    await db.query(`
      UPDATE secure_buyers
      SET registration_status = 'approved',
          buyer_code = $1,
          credit_tier = COALESCE($2, 'C'),
          credit_limit_usd = COALESCE($3, 0),
          credit_limit_available = COALESCE($3, 0),
          payment_terms_approved = COALESCE($4, 'net14'),
          tenant_assigned_rep = $5,
          approved_at = NOW(),
          approved_by_user_id = $6,
          updated_at = NOW()
      WHERE id = $7
    `, [buyer_code, credit_tier||null, credit_limit_usd||null, payment_terms_approved||null, tenant_assigned_rep||null, req.user.id || null, id]);

    // Log credit event
    if (credit_limit_usd) {
      await db.query(`
        INSERT INTO buyer_credit_events (buyer_id, event_type, amount_usd, new_value, triggered_by)
        VALUES ($1, 'limit_set', $2, $3, $4)
      `, [id, credit_limit_usd, String(credit_limit_usd), req.user.username || 'owner']);
    }

    await pingBrain('BUYER_APPROVED', { buyer_id: id, buyer_code, credit_tier, credit_limit_usd });

    res.json({ success: true, buyer_code, message: 'Buyer approved and activated.' });
  } catch (err) {
    console.error('[BUYERS] approve error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// POST /api/buyers/:id/suspend
// ──────────────────────────────────────────────────────────────────────────
router.post('/:id/suspend', requireAuth, requireOwnerOrAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { reason } = req.body || {};
    await db.query(`UPDATE secure_buyers SET registration_status='suspended', suspended_at=NOW(), updated_at=NOW() WHERE id=$1`, [id]);
    await db.query(`INSERT INTO buyer_credit_events (buyer_id, event_type, new_value, triggered_by) VALUES ($1,'suspend',$2,$3)`,
      [id, reason || 'manual', req.user.username || 'owner']);
    await pingBrain('BUYER_SUSPENDED', { buyer_id: id, reason });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// POST /api/buyers/convert-from-crm   (pre-fill from existing CRM contact)
// ──────────────────────────────────────────────────────────────────────────
router.post('/convert-from-crm', requireAuth, async (req, res) => {
  try {
    const { crm_contact_id } = req.body || {};
    if (!crm_contact_id) return res.status(400).json({ success: false, error: 'crm_contact_id required' });

    const crm = await db.query(
      `SELECT * FROM crm_contacts WHERE id = $1 OR contact_id = $1 LIMIT 1`,
      [crm_contact_id]
    );
    if (!crm.rows.length) return res.status(404).json({ success: false, error: 'CRM contact not found' });
    const c = crm.rows[0];

    // Create skeleton secure_buyer from CRM data
    const insert = await db.query(`
      INSERT INTO secure_buyers (legal_name, country, state_province, city, business_type, registration_status, created_by_user_id)
      VALUES ($1, $2, $3, $4, 'wholesale', 'pending', $5)
      RETURNING id, buyer_code, registration_status
    `, [c.company || c.legal_name || c.name || 'Unknown', c.country_code || 'US', c.state || null, c.municipality || c.city || null, req.user.id || null]);

    const newBuyer = insert.rows[0];
    if (c.email) {
      await db.query(`INSERT INTO buyer_contacts (buyer_id, role, full_name, email, phone) VALUES ($1,'principal',$2,$3,$4)`,
        [newBuyer.id, c.contact_name || null, c.email, c.phone || null]);
    }

    await pingBrain('BUYER_CONVERTED_FROM_CRM', { buyer_id: newBuyer.id, crm_contact_id });
    res.json({ success: true, buyer: newBuyer, prefilled: { ...c } });
  } catch (err) {
    console.error('[BUYERS] convert error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// GET /api/buyers/stats/summary   (dashboard tiles)
// ──────────────────────────────────────────────────────────────────────────
router.get('/stats/summary', requireAuth, async (req, res) => {
  try {
    const r = await db.query(`
      SELECT
        COUNT(*)                                                 AS total,
        COUNT(*) FILTER (WHERE registration_status='pending')    AS pending,
        COUNT(*) FILTER (WHERE registration_status='approved')   AS approved,
        COUNT(*) FILTER (WHERE registration_status='suspended')  AS suspended,
        COUNT(DISTINCT country)                                  AS countries,
        COALESCE(SUM(credit_limit_usd) FILTER (WHERE registration_status='approved'), 0) AS total_credit_extended,
        COALESCE(SUM(volume_ytd_usd), 0)                         AS total_volume_ytd
      FROM secure_buyers
    `);
    res.json({ success: true, stats: r.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// POST /api/buyers/:id/suggest-tier   (SI rule-based tier recommendation)
// Reads buyer + contacts + trade_refs, runs tier-scoring engine, returns
// { tier, score, suggested_limit_usd, suggested_terms, breakdown, risk_flags, rationale }
// Does NOT mutate the buyer — owner must call /approve to apply.
// ──────────────────────────────────────────────────────────────────────────
router.post('/:id/suggest-tier', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { scoreBuyer } = require('../lib/tier-scoring');
    const [buyer, contacts, refs] = await Promise.all([
      db.query('SELECT * FROM secure_buyers WHERE id=$1', [id]),
      db.query('SELECT * FROM buyer_contacts WHERE buyer_id=$1', [id]),
      db.query('SELECT * FROM buyer_trade_refs WHERE buyer_id=$1', [id])
    ]);
    if (!buyer.rows.length) return res.status(404).json({ success: false, error: 'Not found' });

    const suggestion = scoreBuyer(buyer.rows[0], contacts.rows, refs.rows);
    await pingBrain('BUYER_TIER_SUGGESTED', { buyer_id: id, tier: suggestion.tier, score: suggestion.score });
    res.json({ success: true, suggestion });
  } catch (err) {
    console.error('[BUYERS] suggest-tier error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
