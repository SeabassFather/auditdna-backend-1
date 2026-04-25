// ============================================================================
// AuditDNA - Lender Marketplace + LOI Broadcast
// Sprint C P17 / 4.25.2026
// Partner directory + smart match scoring + bulk LOI broadcast
// ============================================================================

const express = require('express');
const router = express.Router();
const heavyJson = express.json({ limit: '1mb' });

// ---- Schema ---------------------------------------------------------------
async function ensureSchema() {
  if (!global.db) return;
  try {
    await global.db.query(`
      CREATE TABLE IF NOT EXISTS lender_partners (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        contact_name VARCHAR(200),
        contact_email VARCHAR(200),
        contact_phone VARCHAR(50),
        lanes_supported TEXT,
        min_amount NUMERIC(14,2),
        max_amount NUMERIC(14,2),
        advance_rate_typical NUMERIC(5,2),
        factor_rate_typical NUMERIC(5,2),
        interest_rate_typical NUMERIC(5,2),
        turnaround_days INTEGER,
        accepts_recourse BOOLEAN DEFAULT true,
        accepts_non_recourse BOOLEAN DEFAULT true,
        paca_only BOOLEAN DEFAULT false,
        commodity_blacklist TEXT,
        geo_focus TEXT,
        active BOOLEAN DEFAULT true,
        last_funded_at TIMESTAMP,
        deals_funded_count INTEGER DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await global.db.query(`CREATE INDEX IF NOT EXISTS idx_lender_partners_active ON lender_partners(active);`);

    await global.db.query(`
      CREATE TABLE IF NOT EXISTS loi_broadcasts (
        id SERIAL PRIMARY KEY,
        deal_id INTEGER NOT NULL,
        lane VARCHAR(50) NOT NULL,
        partner_ids INTEGER[],
        partner_count INTEGER,
        broadcast_message TEXT,
        broadcast_by VARCHAR(100),
        broadcast_at TIMESTAMP DEFAULT NOW(),
        notes TEXT
      );
    `);
    await global.db.query(`CREATE INDEX IF NOT EXISTS idx_broadcasts_deal ON loi_broadcasts(deal_id, lane, broadcast_at DESC);`);

    // Seed common partners if empty (factoring + PO + commercial)
    const existing = await global.db.query(`SELECT COUNT(*)::int as c FROM lender_partners`);
    if (existing.rows[0].c === 0) {
      await seedDefaultPartners();
    }

    console.log('[lenderMarketplace] schema OK');
  } catch (e) {
    console.error('[lenderMarketplace] schema error:', e.message);
  }
}

async function seedDefaultPartners() {
  // 18 well-known ag finance partners pre-seeded with realistic specs
  const seeds = [
    // FACTORING
    { name:'Far West Capital',           lanes:'factoring',                      min:50000,   max:5000000,  adv:85, fct:1.5, tat:3,  recourse:true,  nonrecourse:true,  paca:false, geo:'CA,AZ,TX,WA' },
    { name:'White Oak Commercial Finance',lanes:'factoring,commercial',          min:250000,  max:25000000, adv:85, fct:1.2, tat:5,  recourse:true,  nonrecourse:true,  paca:false, geo:'US' },
    { name:'TBS Factoring (PACA)',       lanes:'factoring',                      min:25000,   max:1000000,  adv:80, fct:2.5, tat:2,  recourse:false, nonrecourse:true,  paca:true,  geo:'US' },
    { name:'Triumph Business Capital',   lanes:'factoring',                      min:25000,   max:2000000,  adv:90, fct:2.0, tat:2,  recourse:false, nonrecourse:true,  paca:false, geo:'US' },
    { name:'altLINE / Southern Bank',    lanes:'factoring',                      min:50000,   max:4000000,  adv:90, fct:1.0, tat:3,  recourse:true,  nonrecourse:true,  paca:false, geo:'US' },
    { name:'CapitalPlus Financial',      lanes:'factoring,po',                   min:25000,   max:3000000,  adv:80, fct:2.0, tat:3,  recourse:true,  nonrecourse:false, paca:false, geo:'US' },
    { name:'BlueVine Capital',           lanes:'factoring,commercial',           min:20000,   max:5000000,  adv:90, fct:1.7, tat:1,  recourse:true,  nonrecourse:true,  paca:false, geo:'US' },
    { name:'Quickpay Funding (Veronica)',lanes:'factoring',                      min:10000,   max:500000,   adv:90, fct:1.5, tat:1,  recourse:false, nonrecourse:true,  paca:true,  geo:'CA,AZ,FL,TX' },
    { name:'Riviera Finance',            lanes:'factoring',                      min:5000,    max:2000000,  adv:90, fct:1.5, tat:1,  recourse:false, nonrecourse:true,  paca:false, geo:'US' },
    { name:'Crestmark / Pathward',       lanes:'factoring,commercial',           min:50000,   max:10000000, adv:85, fct:1.5, tat:3,  recourse:true,  nonrecourse:true,  paca:false, geo:'US' },

    // PO FINANCE
    { name:'Liquid Capital',             lanes:'po,factoring',                   min:50000,   max:5000000,  adv:80, fct:2.5, tat:5,  recourse:true,  nonrecourse:false, paca:false, geo:'US' },
    { name:'King Trade Capital',         lanes:'po',                             min:100000,  max:25000000, adv:75, fct:3.0, tat:7,  recourse:true,  nonrecourse:false, paca:false, geo:'US' },
    { name:'Hatch Trade Finance',        lanes:'po',                             min:250000,  max:10000000, adv:80, fct:2.5, tat:5,  recourse:true,  nonrecourse:false, paca:false, geo:'US,MX' },

    // COMMERCIAL / SBA / USDA
    { name:'Rabobank',                   lanes:'commercial',                     min:500000,  max:50000000, ir:7.5,                tat:30, recourse:true,  nonrecourse:true,  paca:false, geo:'CA,AZ,WA,OR' },
    { name:'Compeer Financial',          lanes:'commercial',                     min:100000,  max:25000000, ir:7.0,                tat:21, recourse:true,  nonrecourse:false, paca:false, geo:'IL,WI,MN' },
    { name:'AgCarolina Farm Credit',     lanes:'commercial',                     min:100000,  max:15000000, ir:7.0,                tat:21, recourse:true,  nonrecourse:false, paca:false, geo:'NC,SC,VA' },
    { name:'USDA SBIR / Rural Dev',      lanes:'commercial',                     min:50000,   max:10000000, ir:5.0,                tat:60, recourse:true,  nonrecourse:false, paca:false, geo:'US' },
    { name:'Live Oak Bank',              lanes:'commercial',                     min:250000,  max:15000000, ir:8.0,                tat:30, recourse:true,  nonrecourse:false, paca:false, geo:'US' }
  ];

  for (const p of seeds) {
    try {
      await global.db.query(
        `INSERT INTO lender_partners
           (name, lanes_supported, min_amount, max_amount,
            advance_rate_typical, factor_rate_typical, interest_rate_typical, turnaround_days,
            accepts_recourse, accepts_non_recourse, paca_only, geo_focus, active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true)`,
        [
          p.name, p.lanes, p.min, p.max,
          p.adv || null, p.fct || null, p.ir || null, p.tat || null,
          p.recourse, p.nonrecourse, p.paca, p.geo
        ]
      );
    } catch (e) { console.error('[lenderMarketplace] seed error:', e.message); }
  }
  console.log(`[lenderMarketplace] seeded ${seeds.length} default partners`);
}
setTimeout(ensureSchema, 2000);

function emitBrain(type, payload) {
  try { if (typeof global.brainEmit === 'function') global.brainEmit(type, payload); } catch (e) {}
}

// ============================================================================
// MATCH SCORING
// ============================================================================
function scorePartner(partner, deal) {
  let score = 0;
  const reasons = [];

  // Lane support (mandatory - 0 score if no match means filter out)
  const lanes = (partner.lanes_supported || '').split(',').map(s => s.trim().toLowerCase());
  if (!lanes.includes(deal.lane)) return { score: 0, reasons: ['LANE_NOT_SUPPORTED'], excluded: true };
  score += 10; reasons.push('+10 lane match');

  // Amount in range
  const amt = Number(deal.amount || deal.invoice_amount || 0);
  if (amt > 0) {
    if (partner.min_amount && amt < Number(partner.min_amount)) {
      return { score: 0, reasons: [`amount $${amt} below min $${partner.min_amount}`], excluded: true };
    }
    if (partner.max_amount && amt > Number(partner.max_amount)) {
      return { score: 0, reasons: [`amount $${amt} above max $${partner.max_amount}`], excluded: true };
    }
    score += 10; reasons.push(`+10 amount in range ($${amt.toLocaleString()})`);
  }

  // Commodity blacklist check
  if (deal.commodity && partner.commodity_blacklist) {
    const blacklist = partner.commodity_blacklist.split(',').map(s => s.trim().toLowerCase());
    if (blacklist.includes(deal.commodity.toLowerCase())) {
      return { score: 0, reasons: [`commodity ${deal.commodity} blacklisted`], excluded: true };
    }
  }
  if (deal.commodity) { score += 3; reasons.push('+3 commodity OK'); }

  // PACA filter
  if (partner.paca_only) {
    score += 3; reasons.push('+3 PACA-only partner');
  }

  // Track record bonus (capped at +10)
  const fundedCount = partner.deals_funded_count || 0;
  if (fundedCount > 0) {
    const trackBonus = Math.min(10, fundedCount);
    score += trackBonus;
    reasons.push(`+${trackBonus} track record (${fundedCount} prior funded)`);
  }

  // Stale penalty
  if (partner.last_funded_at) {
    const days = (Date.now() - new Date(partner.last_funded_at).getTime()) / 86400000;
    if (days > 90) {
      score -= 5;
      reasons.push(`-5 stale (last funded ${Math.round(days)}d ago)`);
    } else if (days < 30) {
      score += 5;
      reasons.push(`+5 active recently (last ${Math.round(days)}d ago)`);
    }
  }

  // Fast turnaround bonus
  if (partner.turnaround_days && partner.turnaround_days <= 3) {
    score += 5; reasons.push(`+5 fast turnaround (${partner.turnaround_days}d)`);
  }

  return { score, reasons, excluded: false };
}

// ============================================================================
// ROUTES
// ============================================================================

// GET partners list
router.get('/api/marketplace/partners', async (req, res) => {
  const { active_only, lane } = req.query;
  const conditions = []; const params = []; let pidx = 1;
  if (active_only === 'true') conditions.push(`active = true`);
  if (lane) {
    conditions.push(`lanes_supported ILIKE $${pidx++}`);
    params.push(`%${lane}%`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  try {
    const r = await global.db.query(
      `SELECT * FROM lender_partners ${where} ORDER BY name ASC`, params
    );
    res.json({ partners: r.rows, count: r.rows.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET single partner
router.get('/api/marketplace/partners/:id', async (req, res) => {
  try {
    const r = await global.db.query(`SELECT * FROM lender_partners WHERE id = $1`, [parseInt(req.params.id, 10)]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'not found' });
    res.json({ partner: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST add partner
router.post('/api/marketplace/partners', heavyJson, async (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'name required' });
  try {
    const r = await global.db.query(
      `INSERT INTO lender_partners
         (name, contact_name, contact_email, contact_phone,
          lanes_supported, min_amount, max_amount,
          advance_rate_typical, factor_rate_typical, interest_rate_typical, turnaround_days,
          accepts_recourse, accepts_non_recourse, paca_only,
          commodity_blacklist, geo_focus, active, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       RETURNING id`,
      [
        b.name, b.contact_name || null, b.contact_email || null, b.contact_phone || null,
        b.lanes_supported || 'factoring', b.min_amount || null, b.max_amount || null,
        b.advance_rate_typical || null, b.factor_rate_typical || null, b.interest_rate_typical || null,
        b.turnaround_days || null,
        b.accepts_recourse !== false, b.accepts_non_recourse !== false, b.paca_only === true,
        b.commodity_blacklist || null, b.geo_focus || null,
        b.active !== false, b.notes || null
      ]
    );
    res.json({ ok: true, id: r.rows[0].id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT update
router.put('/api/marketplace/partners/:id', heavyJson, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const b = req.body || {};
  const fields = ['name','contact_name','contact_email','contact_phone','lanes_supported',
    'min_amount','max_amount','advance_rate_typical','factor_rate_typical','interest_rate_typical',
    'turnaround_days','accepts_recourse','accepts_non_recourse','paca_only',
    'commodity_blacklist','geo_focus','active','notes'];
  const sets = []; const params = []; let pidx = 1;
  fields.forEach(f => { if (b[f] !== undefined) { sets.push(`${f} = $${pidx++}`); params.push(b[f]); } });
  if (sets.length === 0) return res.json({ ok: true, no_changes: true });
  sets.push(`updated_at = NOW()`); params.push(id);
  try {
    await global.db.query(`UPDATE lender_partners SET ${sets.join(', ')} WHERE id = $${pidx}`, params);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE
router.delete('/api/marketplace/partners/:id', async (req, res) => {
  try {
    await global.db.query(`DELETE FROM lender_partners WHERE id = $1`, [parseInt(req.params.id, 10)]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// MATCH engine - rank partners for a deal
router.get('/api/marketplace/match/:lane/:dealId', async (req, res) => {
  const { lane, dealId } = req.params;
  try {
    const dq = await global.db.query(`SELECT * FROM financing_deals WHERE id = $1`, [parseInt(dealId, 10)]);
    if (dq.rows.length === 0) return res.status(404).json({ error: 'deal not found' });
    const deal = { ...dq.rows[0], lane };

    const pq = await global.db.query(`SELECT * FROM lender_partners WHERE active = true`);
    const ranked = pq.rows.map(p => {
      const scored = scorePartner(p, deal);
      return {
        partner: p,
        score: scored.score,
        reasons: scored.reasons,
        excluded: scored.excluded
      };
    }).filter(r => !r.excluded).sort((a, b) => b.score - a.score);

    const excluded = pq.rows.map(p => {
      const scored = scorePartner(p, deal);
      return scored.excluded ? { partner_name: p.name, reason: scored.reasons.join(', ') } : null;
    }).filter(Boolean);

    res.json({ deal, matches: ranked, excluded, total_active: pq.rows.length });
  } catch (e) {
    console.error('[lenderMarketplace] match error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// BROADCAST LOI to multiple partners
router.post('/api/marketplace/broadcast', heavyJson, async (req, res) => {
  const { deal_id, lane, partner_ids, message, broadcast_by } = req.body || {};
  if (!deal_id || !lane || !Array.isArray(partner_ids) || partner_ids.length === 0) {
    return res.status(400).json({ error: 'deal_id, lane, and partner_ids[] required' });
  }
  try {
    // Record broadcast
    const bcast = await global.db.query(
      `INSERT INTO loi_broadcasts (deal_id, lane, partner_ids, partner_count, broadcast_message, broadcast_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, broadcast_at`,
      [parseInt(deal_id, 10), lane, partner_ids, partner_ids.length, message || null, broadcast_by || 'saul']
    );

    // Get partner details for each
    const pq = await global.db.query(
      `SELECT id, name, contact_email FROM lender_partners WHERE id = ANY($1::int[])`,
      [partner_ids]
    );

    // Create draft lender_response stubs for each partner (so they appear in inbox)
    let stubsCreated = 0;
    for (const p of pq.rows) {
      try {
        await global.db.query(
          `INSERT INTO lender_responses (deal_id, lane, partner_id, partner_name, response_type, decision, notes)
           VALUES ($1, $2, $3, $4, 'loi_sent', 'pending', $5)`,
          [parseInt(deal_id, 10), lane, p.id, p.name, `LOI broadcast - awaiting response`]
        );
        stubsCreated++;
      } catch (e) { /* lender_response table may not exist or column mismatch - non-fatal */ }
    }

    // Emit brain event for each partner so notifications fire
    for (const p of pq.rows) {
      emitBrain('LOI_SENT', {
        deal_id: parseInt(deal_id, 10), lane,
        partner_id: p.id, partner_name: p.name,
        partner_email: p.contact_email,
        broadcast_id: bcast.rows[0].id,
        actor: broadcast_by || 'saul'
      });
    }
    emitBrain('LOI_BROADCAST', {
      deal_id: parseInt(deal_id, 10), lane,
      partner_count: partner_ids.length,
      broadcast_id: bcast.rows[0].id,
      actor: broadcast_by || 'saul'
    });

    res.json({
      ok: true,
      broadcast_id: bcast.rows[0].id,
      partner_count: partner_ids.length,
      stubs_created: stubsCreated,
      partners: pq.rows.map(p => ({ id: p.id, name: p.name, email: p.contact_email }))
    });
  } catch (e) {
    console.error('[lenderMarketplace] broadcast error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Broadcasts list
router.get('/api/marketplace/broadcasts', async (req, res) => {
  const { deal_id, lane, limit } = req.query;
  const conditions = []; const params = []; let pidx = 1;
  if (deal_id) { conditions.push(`deal_id = $${pidx++}`); params.push(parseInt(deal_id, 10)); }
  if (lane) { conditions.push(`lane = $${pidx++}`); params.push(lane); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const lim = Math.min(parseInt(limit || '100', 10), 500);
  try {
    const r = await global.db.query(
      `SELECT * FROM loi_broadcasts ${where} ORDER BY broadcast_at DESC LIMIT ${lim}`, params
    );
    res.json({ broadcasts: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Stats
router.get('/api/marketplace/stats', async (req, res) => {
  try {
    const partners = await global.db.query(`SELECT COUNT(*)::int as total, SUM(CASE WHEN active THEN 1 ELSE 0 END)::int as active FROM lender_partners`);
    const broadcasts = await global.db.query(`SELECT COUNT(*)::int as total, SUM(partner_count)::int as total_lois FROM loi_broadcasts WHERE broadcast_at > NOW() - INTERVAL '30 days'`);
    const byLane = await global.db.query(`
      SELECT lanes_supported, COUNT(*)::int as count
      FROM lender_partners WHERE active = true
      GROUP BY lanes_supported ORDER BY count DESC
    `);
    res.json({
      partners: partners.rows[0],
      broadcasts_30d: broadcasts.rows[0],
      by_lane: byLane.rows
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
