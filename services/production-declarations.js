/**
 * C:\AuditDNA\backend\services\production-declarations.js
 *
 * Phase 2 - Grower weekly inventory declarations.
 *
 * When a grower posts a declaration, we auto-scan open RFQs for matches
 * and emit `production.declared` brain event. The brain event handler
 * fans out a Web Push to the buyer ("New supply matches your need").
 *
 * Routes:
 *   POST   /api/declarations              create
 *   GET    /api/declarations/grower/:id   list grower's declarations
 *   GET    /api/declarations/open         list all open declarations (admin)
 *   GET    /api/declarations/match/:rfqId find declarations matching an RFQ
 *   PATCH  /api/declarations/:id          update (grower-only)
 *   DELETE /api/declarations/:id          close
 *
 * Mount: app.use('/api/declarations', require('./services/production-declarations').router);
 */

const express = require('express');
const router = express.Router();
const getPool = require('../db');
const pool = getPool();

let brainEvents = null;
function getBrainEvents() {
  if (!brainEvents) {
    try { brainEvents = require('./brain-events'); } catch (e) {}
  }
  return brainEvents;
}

// ----------------------------------------------------------------------------
// POST /  create declaration + auto-match
// ----------------------------------------------------------------------------
router.post('/', express.json(), async (req, res) => {
  try {
    const {
      grower_id, commodity_category, commodity_subcategory,
      estimated_volume, volume_unit, available_from, available_to,
      ask_price, ask_price_currency, pack_size, quality_grade,
      organic, certifications, origin_country, origin_state, origin_region,
      notes, expires_at,
    } = req.body || {};
    if (!grower_id || !commodity_category || !estimated_volume || !available_from) {
      return res.status(400).json({ error: 'grower_id, commodity_category, estimated_volume, available_from required' });
    }

    const r = await pool.query(`
      INSERT INTO production_declarations_v2 (
        grower_id, commodity_category, commodity_subcategory,
        estimated_volume, volume_unit, available_from, available_to,
        ask_price, ask_price_currency, pack_size, quality_grade,
        organic, certifications, origin_country, origin_state, origin_region,
        notes, expires_at
      ) VALUES (
        $1,$2,$3,$4,COALESCE($5,'cases'),$6,$7,$8,COALESCE($9,'USD'),
        $10,$11,COALESCE($12,FALSE),$13,$14,$15,$16,$17,$18
      )
      RETURNING *
    `, [
      parseInt(grower_id, 10), commodity_category, commodity_subcategory || null,
      estimated_volume, volume_unit, available_from, available_to || null,
      ask_price || null, ask_price_currency, pack_size || null, quality_grade || null,
      organic, certifications || null, origin_country || null, origin_state || null,
      origin_region || null, notes || null, expires_at || null,
    ]);
    const decl = r.rows[0];

    // Auto-match against open RFQs
    const matchedIds = await autoMatchToOpenRFQs(decl);
    if (matchedIds.length > 0) {
      await pool.query(`UPDATE production_declarations_v2 SET matched_rfqs = $1 WHERE id = $2`, [matchedIds, decl.id]);
      decl.matched_rfqs = matchedIds;
    }

    // Brain event
    const be = getBrainEvents();
    if (be) {
      await be.emitEvent('production.declared', null, {
        declaration_id: decl.id,
        grower_id: decl.grower_id,
        commodity: decl.commodity_subcategory || decl.commodity_category,
        volume: decl.estimated_volume,
        unit: decl.volume_unit,
        ask_price: decl.ask_price,
        matched_rfq_count: matchedIds.length,
        matched_rfq_ids: matchedIds,
      }, decl.grower_id, 'grower');
    }

    res.json({ ok: true, declaration: decl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------------------------------
// Auto-match: find open RFQs that this declaration could fulfill
// ----------------------------------------------------------------------------
async function autoMatchToOpenRFQs(decl) {
  try {
    const r = await pool.query(`
      SELECT id FROM rfq_needs
       WHERE status = 'open'
         AND commodity_category = $1
         AND (delivery_date_start IS NULL OR delivery_date_start >= $2)
         AND (delivery_date_end IS NULL OR $2 <= delivery_date_end)
         AND ($3::text IS NULL OR commodity_subcategory IS NULL OR commodity_subcategory = $3)
       LIMIT 50
    `, [decl.commodity_category, decl.available_from, decl.commodity_subcategory]);
    return r.rows.map(row => Number(row.id));
  } catch (e) {
    console.error('[declarations] auto-match failed:', e.message);
    return [];
  }
}

// ----------------------------------------------------------------------------
// Lists
// ----------------------------------------------------------------------------
router.get('/grower/:id', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT * FROM production_declarations_v2
       WHERE grower_id = $1
       ORDER BY created_at DESC
       LIMIT 100
    `, [req.params.id]);
    res.json({ declarations: r.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/open', async (req, res) => {
  try {
    const { commodity, country } = req.query;
    const params = [];
    let where = `status = 'open' AND (expires_at IS NULL OR expires_at > NOW())`;
    if (commodity) { params.push(commodity); where += ` AND commodity_category = $${params.length}`; }
    if (country)   { params.push(country);   where += ` AND origin_country = $${params.length}`; }
    const r = await pool.query(`
      SELECT pd.*, g.company_name, g.country AS grower_country, g.grs_score
        FROM production_declarations_v2 pd
        JOIN growers g ON g.id = pd.grower_id
       WHERE ${where}
       ORDER BY pd.created_at DESC
       LIMIT 200
    `, params);
    res.json({ declarations: r.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/match/:rfqId', async (req, res) => {
  try {
    const rfq = (await pool.query(`SELECT * FROM rfq_needs WHERE id = $1`, [req.params.rfqId])).rows[0];
    if (!rfq) return res.status(404).json({ error: 'rfq not found' });
    const r = await pool.query(`
      SELECT pd.*, g.company_name, g.grs_score, g.country AS grower_country
        FROM production_declarations_v2 pd
        JOIN growers g ON g.id = pd.grower_id
       WHERE pd.status = 'open'
         AND pd.commodity_category = $1
         AND (pd.expires_at IS NULL OR pd.expires_at > NOW())
         AND (pd.available_to IS NULL OR pd.available_to >= $2)
         AND pd.available_from <= COALESCE($3, pd.available_from)
       ORDER BY g.grs_score DESC NULLS LAST, pd.ask_price ASC NULLS LAST
       LIMIT 50
    `, [rfq.commodity_category, rfq.delivery_date_start, rfq.delivery_date_end]);
    res.json({ rfq_id: rfq.id, rfq_code: rfq.rfq_code, matches: r.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------------------------------
// PATCH /:id  grower update
// ----------------------------------------------------------------------------
router.patch('/:id', express.json(), async (req, res) => {
  try {
    const { grower_id, ...updates } = req.body || {};
    if (!grower_id) return res.status(400).json({ error: 'grower_id required' });
    const allowed = ['estimated_volume', 'available_to', 'ask_price', 'notes', 'status', 'expires_at'];
    const sets = [];
    const params = [parseInt(grower_id, 10), parseInt(req.params.id, 10)];
    for (const key of Object.keys(updates)) {
      if (!allowed.includes(key)) continue;
      params.push(updates[key]);
      sets.push(`${key} = $${params.length}`);
    }
    if (sets.length === 0) return res.status(400).json({ error: 'no updatable fields provided' });
    sets.push(`updated_at = NOW()`);
    const r = await pool.query(`
      UPDATE production_declarations_v2 SET ${sets.join(', ')}
       WHERE id = $2 AND grower_id = $1
       RETURNING *
    `, params);
    if (r.rows.length === 0) return res.status(403).json({ error: 'not authorized or not found' });
    res.json({ ok: true, declaration: r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', express.json(), async (req, res) => {
  try {
    const { grower_id } = req.body || {};
    if (!grower_id) return res.status(400).json({ error: 'grower_id required' });
    const r = await pool.query(`
      UPDATE production_declarations_v2 SET status = 'closed', updated_at = NOW()
       WHERE id = $1 AND grower_id = $2 RETURNING id
    `, [req.params.id, parseInt(grower_id, 10)]);
    if (r.rows.length === 0) return res.status(403).json({ error: 'not authorized or not found' });
    res.json({ ok: true, id: r.rows[0].id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = { router, autoMatchToOpenRFQs };
