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
const db      = pool || require('../db/connection');

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
const pool = require('../db');
    req.user = jwt.verify(token, process.env.JWT_SECRET);
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
  const b = req.body || {};
  const legal_name = (b.legal_name || b.companyLegal || '').trim();
  const country = (b.country || 'USA').trim();
  if (!legal_name || !country) return res.status(400).json({ success:false, error:'legal_name and country required' });
  try {
    const commodities = Array.isArray(b.commodities_preferred) ? b.commodities_preferred.join(',') : (b.commodities_preferred || '');
    const regions = Array.isArray(b.regions_served) ? b.regions_served.join(',') : (b.regions_served || '');
    const cold = !!(b.cold_chain_capability === true || b.cold_chain_capability === 'true');
    const r = await db.query(
      `INSERT INTO secure_buyers(legal_name,dba,country,state_province,city,address_line1,postal_code,business_type,paca_license,commodities_preferred,regions_served,cold_chain_capability,payment_terms_requested,registration_status,created_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'pending',NOW())
       RETURNING id,legal_name,country,registration_status`,
      [legal_name,b.dba||'',country,b.state_province||b.state||'',b.city||'',b.address_line1||'',b.postal_code||'',b.business_type||'wholesale',b.paca_license||'',commodities,regions,cold,b.payment_terms_requested||'net30']
    );
    const buyer = r.rows[0];
    console.log('[BUYERS] register:', buyer.legal_name, buyer.id);
    db.query('INSERT INTO brain_events(event_type,payload,created_at)VALUES($1,$2,NOW())',
      ['BUYER_REGISTERED',JSON.stringify({id:buyer.id,legal_name:buyer.legal_name,country:buyer.country})]).catch(()=>{});
    res.status(201).json({ success:true, buyer, message:'Welcome to the Mexausa network.' });
  } catch(err) {
    console.error('[BUYERS] register error:', err.message);
    res.status(500).json({ success:false, error:err.message, code:err.code });
  }
});

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

// ───────────────────────���──────────────────────────────────────────────────
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


// ── Buyer wants & demand signals ─────────────────────────────────────────────
const buyerWants = [];
const demandSignals = [];

router.get('/wants', async (req, res) => {
    try {
        const pool = req.app.get('pool');
        if (pool) {
            const r = await pool.query(
                `SELECT id, commodity, volume_lbs_needed AS volume, price_target_cwt AS price,
                        preferred_origin AS origin, buyer_email, status, created_at
                 FROM buyer_wants WHERE status = 'OPEN' ORDER BY created_at DESC LIMIT 100`
            ).catch(() => ({ rows: [] }));
            if (r.rows.length) return res.json({ wants: r.rows });
        }
    } catch (_) {}
    res.json({ wants: buyerWants });
});

router.post('/want', async (req, res) => {
    const { commodity, volume, price, origin, buyer, contact } = req.body;
    if (!commodity) return res.status(400).json({ error: 'commodity required' });
    const want = {
        id: `BW-${Date.now()}`, commodity,
        volume_lbs_needed: parseFloat(volume || 0),
        price_target_cwt: parseFloat(price || 0),
        preferred_origin: origin || 'US',
        buyer_email: contact || buyer || '',
        status: 'OPEN',
        created_at: new Date().toISOString()
    };
    try {
        const pool = req.app.get('pool');
        if (pool) {
            const r = await pool.query(
                `INSERT INTO buyer_wants (commodity, volume_lbs_needed, price_target_cwt, preferred_origin, buyer_email, status)
                 VALUES ($1,$2,$3,$4,$5,'OPEN') RETURNING *`,
                [commodity, want.volume_lbs_needed, want.price_target_cwt, want.preferred_origin, want.buyer_email]
            ).catch(() => ({ rows: [] }));
            if (r.rows.length) return res.status(201).json({ want: r.rows[0] });
        }
    } catch (_) {}
    buyerWants.unshift(want);
    res.status(201).json({ want });
});

router.post('/demand-signal', async (req, res) => {
    const signal = {
        id: `SIG-${Date.now()}`,
        ...req.body,
        created_at: new Date().toISOString()
    };
    try {
        const pool = req.app.get('pool');
        if (pool) {
            await pool.query(
                `INSERT INTO demand_signals (commodity, volume_lbs, price_target, urgency, weeks_out, notes, type, created_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
                [signal.commodity, signal.volume||signal.targetVol||0, signal.price||signal.priceTarget||0,
                 signal.urgency||'MEDIUM', signal.weeks||2, signal.notes||'', signal.type||'DEMAND']
            ).catch(() => {});
        }
    } catch (_) {}
    demandSignals.unshift(signal);
    res.status(201).json({ signal });
});

module.exports = router;
