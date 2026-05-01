// ============================================================================
// AuditDNA - Deal Risk Center
// Sprint C P10 / 4.25.2026
// DRS = Deal Readiness Score (extends GRI/DPS/ADS for deal-level decisions)
// 10-factor weighted score 0-100 per deal
// ============================================================================

const express = require('express');
const pool = require('../../db');
const router = express.Router();

// ---- Self-migrating schema ------------------------------------------------
async function ensureSchema() {
  if (!pool) return;
  try {
    // Add borrower_id to financing_deals (idempotent, nullable)
    await pool.query(`
      ALTER TABLE financing_deals
      ADD COLUMN IF NOT EXISTS borrower_id INTEGER REFERENCES borrower_entities(id) ON DELETE SET NULL
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_financing_deals_borrower ON financing_deals(borrower_id);`);
    console.log('[riskCenter] schema OK (borrower_id added to financing_deals)');
  } catch (e) {
    console.error('[riskCenter] schema error (non-fatal):', e.message);
  }
}
setTimeout(ensureSchema, 2000);

function emitBrain(type, payload) {
  try { if (typeof global.brainEmit === 'function') global.brainEmit(type, payload); } catch (e) {}
}

// ---- Risk factor definitions ----------------------------------------------
const FACTOR_DEFS = [
  { id:'borrower_kyc', label:'Borrower KYC Approved', weight:15, category:'borrower',
    impact:'Lenders require KYC clearance before funding any deal.' },
  { id:'master_signed', label:'Master Agreement Signed', weight:10, category:'borrower',
    impact:'Master agreement establishes legal framework for repeated transactions.' },
  { id:'bank_verified', label:'Bank Account Verified', weight:10, category:'borrower',
    impact:'Bank verification confirms ACH funding path to borrower.' },
  { id:'business_tenure', label:'5+ Years in Business', weight:10, category:'borrower',
    impact:'Established operators have lower default rates.' },
  { id:'revenue', label:'Annual Revenue >$1M', weight:10, category:'borrower',
    impact:'Revenue scale supports debt service capacity.' },
  { id:'fico', label:'FICO 700+', weight:10, category:'borrower',
    impact:'Strong personal credit history of beneficial owners.' },
  { id:'docs', label:'Deal Documents Uploaded', weight:10, category:'deal',
    impact:'Lenders cannot underwrite without supporting paperwork.' },
  { id:'responses', label:'Lender Responses Received', weight:10, category:'deal',
    impact:'Active partner engagement = market validation.' },
  { id:'insurance', label:'Insurance Active', weight:10, category:'compliance',
    impact:'Active liability + cargo insurance is mandatory for most lenders.' },
  { id:'paca', label:'PACA License On File', weight:5, category:'compliance',
    impact:'Required for produce factoring under PACA Trust provisions.' }
];

// ---- Compute score for one deal -------------------------------------------
async function computeDealScore(lane, dealId) {
  // Fetch deal
  const dealQ = await pool.query(
    `SELECT * FROM financing_deals WHERE id = $1`,
    [parseInt(dealId, 10)]
  );
  if (dealQ.rows.length === 0) return null;
  const deal = dealQ.rows[0];

  // Resolve borrower (by borrower_id, fallback to fuzzy match on grower_name)
  let borrower = null;
  if (deal.borrower_id) {
    const bq = await pool.query(`SELECT * FROM borrower_entities WHERE id = $1`, [deal.borrower_id]);
    borrower = bq.rows[0] || null;
  } else if (deal.grower_name) {
    const fuzzy = await pool.query(
      `SELECT * FROM borrower_entities WHERE LOWER(legal_name) = LOWER($1) OR LOWER(dba) = LOWER($1) LIMIT 1`,
      [deal.grower_name]
    );
    borrower = fuzzy.rows[0] || null;
  }

  // Documents count
  let docCount = 0;
  try {
    const dq = await pool.query(
      `SELECT COUNT(*)::int as c FROM deal_documents WHERE deal_id = $1 AND lane = $2`,
      [parseInt(dealId, 10), lane]
    );
    docCount = dq.rows[0].c;
  } catch (e) { /* table may not exist yet */ }

  // Lender responses count
  let respCount = 0;
  try {
    const rq = await pool.query(
      `SELECT COUNT(*)::int as c FROM lender_responses WHERE deal_id = $1 AND lane = $2`,
      [parseInt(dealId, 10), lane]
    );
    respCount = rq.rows[0].c;
  } catch (e) { /* table may not exist yet */ }

  // Evaluate each factor
  const insuranceActive = borrower && borrower.insurance_carrier &&
    borrower.insurance_expires && new Date(borrower.insurance_expires) > new Date();

  const factorMet = {
    borrower_kyc: borrower && borrower.kyc_status === 'approved',
    master_signed: borrower && borrower.master_agreement_signed === true,
    bank_verified: borrower && borrower.bank_verified === true,
    business_tenure: borrower && Number(borrower.years_in_business || 0) >= 5,
    revenue: borrower && Number(borrower.annual_revenue || 0) >= 1000000,
    fico: borrower && Number(borrower.fico_score || 0) >= 700,
    docs: docCount > 0,
    responses: respCount > 0,
    insurance: insuranceActive,
    paca: borrower && !!borrower.paca_number
  };

  const factors = FACTOR_DEFS.map(def => ({
    ...def,
    met: !!factorMet[def.id],
    earned: factorMet[def.id] ? def.weight : 0
  }));

  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  const earnedWeight = factors.reduce((s, f) => s + f.earned, 0);
  const score = Math.round((earnedWeight / totalWeight) * 100);

  let category = 'high';
  if (score >= 80) category = 'low';
  else if (score >= 60) category = 'medium';

  return {
    deal_id: parseInt(dealId, 10),
    lane,
    score,
    category,
    factors,
    earned_weight: earnedWeight,
    total_weight: totalWeight,
    deal: {
      id: deal.id,
      grower_name: deal.grower_name,
      buyer_name: deal.buyer_name,
      commodity: deal.commodity,
      invoice_amount: deal.invoice_amount,
      stage: deal.stage,
      status: deal.status
    },
    borrower: borrower ? {
      id: borrower.id,
      legal_name: borrower.legal_name,
      borrower_role: borrower.borrower_role,
      kyc_status: borrower.kyc_status
    } : null,
    counts: { docs: docCount, responses: respCount }
  };
}

// ---- Recommendation engine ------------------------------------------------
function buildRecommendations(scoreResult) {
  if (!scoreResult) return [];
  const recs = scoreResult.factors
    .filter(f => !f.met)
    .sort((a, b) => b.weight - a.weight)
    .map(f => ({
      factor_id: f.id,
      label: f.label,
      lift: f.weight,
      category: f.category,
      action: getActionForFactor(f.id, scoreResult),
      impact: f.impact
    }));
  return recs;
}

function getActionForFactor(factorId, scoreResult) {
  const hasBorrower = !!scoreResult.borrower;
  switch (factorId) {
    case 'borrower_kyc':
      return hasBorrower ? 'Open Borrowers > select borrower > APPROVE KYC' : 'Link a borrower to this deal first';
    case 'master_signed':
      return hasBorrower ? 'Borrowers > select borrower > SIGN MASTER' : 'Link a borrower first';
    case 'bank_verified':
      return hasBorrower ? 'Borrowers > select borrower > VERIFY BANK (after ACH micro-deposits clear)' : 'Link a borrower first';
    case 'business_tenure':
      return hasBorrower ? 'Update borrower years_in_business if data is incomplete' : 'Link a borrower with business tenure data';
    case 'revenue':
      return hasBorrower ? 'Update borrower annual_revenue with audited financials' : 'Link a borrower first';
    case 'fico':
      return hasBorrower ? 'Update borrower fico_score from credit report' : 'Link a borrower first';
    case 'docs':
      return 'Open Deal Documents > upload invoice/BOL/PO/financials';
    case 'responses':
      return 'Send LOIs to factor partners, paste replies in Lender Responses';
    case 'insurance':
      return hasBorrower ? 'Add insurance carrier + policy + expiration to borrower record' : 'Link a borrower first';
    case 'paca':
      return hasBorrower ? 'Add PACA license number to borrower record' : 'Link a borrower first';
    default:
      return 'Review borrower and deal records';
  }
}

// ============================================================================
// GET /api/risk/:lane/:dealId - score one deal
// ============================================================================
router.get('/api/risk/:lane/:dealId', async (req, res) => {
  try {
    const result = await computeDealScore(req.params.lane, req.params.dealId);
    if (!result) return res.status(404).json({ error: 'deal not found' });
    res.json(result);
  } catch (e) {
    console.error('[riskCenter] score error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// GET /api/risk/recommendations/:lane/:dealId - what to do to lift score
// ============================================================================
router.get('/api/risk/recommendations/:lane/:dealId', async (req, res) => {
  try {
    const result = await computeDealScore(req.params.lane, req.params.dealId);
    if (!result) return res.status(404).json({ error: 'deal not found' });
    const recs = buildRecommendations(result);
    res.json({
      score: result.score,
      category: result.category,
      potential_lift: recs.reduce((s, r) => s + r.lift, 0),
      recommendations: recs
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// GET /api/risk/dashboard - all deals scored
// ============================================================================
router.get('/api/risk/dashboard', async (req, res) => {
  const { lane, category, limit } = req.query;
  const lim = Math.min(parseInt(limit || '200', 10), 500);

  try {
    const conditions = [];
    const params = [];
    let pidx = 1;
    if (lane) { conditions.push(`lane = $${pidx++}`); params.push(lane); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Pull deals
    const dealsQ = await pool.query(
      `SELECT id, lane FROM financing_deals ${where} ORDER BY id DESC LIMIT ${lim}`,
      params
    );

    // Score each (in series to avoid hammering DB; could parallelize for speed)
    const results = [];
    for (const row of dealsQ.rows) {
      const r = await computeDealScore(row.lane || 'factoring', row.id);
      if (r) results.push(r);
    }

    let filtered = results;
    if (category) filtered = filtered.filter(r => r.category === category);

    // Summary stats
    const summary = {
      total: results.length,
      low: results.filter(r => r.category === 'low').length,
      medium: results.filter(r => r.category === 'medium').length,
      high: results.filter(r => r.category === 'high').length,
      avg_score: results.length > 0
        ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
        : 0
    };

    res.json({ summary, deals: filtered, count: filtered.length });
  } catch (e) {
    console.error('[riskCenter] dashboard error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// POST /api/financing/deals/:dealId/link-borrower
// Attach a borrower entity to an existing deal
// ============================================================================
router.post('/api/financing/deals/:dealId/link-borrower', express.json({ limit: '1mb' }), async (req, res) => {
  const dealId = parseInt(req.params.dealId, 10);
  const borrowerId = req.body && req.body.borrower_id;
  if (!borrowerId) return res.status(400).json({ error: 'borrower_id required' });

  try {
    // Verify borrower exists
    const bq = await pool.query(`SELECT id, legal_name FROM borrower_entities WHERE id = $1`, [parseInt(borrowerId, 10)]);
    if (bq.rows.length === 0) return res.status(404).json({ error: 'borrower not found' });

    const r = await pool.query(
      `UPDATE financing_deals SET borrower_id = $1, updated_at = NOW() WHERE id = $2 RETURNING id, lane`,
      [parseInt(borrowerId, 10), dealId]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'deal not found' });

    emitBrain('DEAL_BORROWER_LINKED', {
      deal_id: dealId,
      borrower_id: parseInt(borrowerId, 10),
      borrower_name: bq.rows[0].legal_name,
      lane: r.rows[0].lane
    });

    res.json({ ok: true, deal_id: dealId, borrower_id: parseInt(borrowerId, 10) });
  } catch (e) {
    console.error('[riskCenter] link-borrower error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// GET /api/risk/factor-definitions - frontend reference
// ============================================================================
router.get('/api/risk/factor-definitions', (req, res) => {
  res.json({ factors: FACTOR_DEFS, total_weight: FACTOR_DEFS.reduce((s, f) => s + f.weight, 0) });
});

module.exports = router;
