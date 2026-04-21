// ============================================================
// financing-waterfall.js — INTERNAL SERVICE
// Core routing + disclosure enforcement for factoring deals.
//
// RULE: legal_name and contact_email NEVER leave this file
//       unless caller explicitly requests disclosure AND
//       deal.stage === 'PARTY_DISCLOSURE'.
// ============================================================
'use strict';

const crypto = require('crypto');

function getDB() {
  if (global.db && typeof global.db.query === 'function') return global.db;
  throw new Error('[financing-waterfall] global.db not available');
}

function generateDealId() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `DEAL_${yyyy}${mm}${dd}_${rand}`;
}

// Fires a Brain event (non-blocking) for every partner routing action.
function pingBrain(type, payload) {
  try {
    const fetchFn = (typeof fetch === 'function') ? fetch : null;
    if (!fetchFn) return;
    const base = process.env.BRAIN_EVENTS_URL || 'http://localhost:5050/api/brain/events';
    fetchFn(base, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: [{ type, payload, source: 'financing-waterfall', timestamp: Date.now() }]
      })
    }).catch(() => {});
  } catch {}
}

// ------------------------------------------------------------
// CREATE DEAL
// ------------------------------------------------------------
async function createDeal(input) {
  const db = getDB();
  const id = generateDealId();

  const {
    deal_type = 'factoring',
    client_id, client_type, client_company_name,
    client_contact_name, client_email, client_phone,
    commodity, amount_requested, advance_percent,
    term_days, invoice_reference, notes, submitted_by
  } = input;

  await db.query(`
    INSERT INTO financing_deals (
      id, deal_type, client_id, client_type, client_company_name,
      client_contact_name, client_email, client_phone,
      commodity, amount_requested, advance_percent,
      term_days, invoice_reference, notes, submitted_by, stage
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'SUBMITTED'
    )
  `, [
    id, deal_type, client_id, client_type, client_company_name,
    client_contact_name, client_email, client_phone,
    commodity, amount_requested, advance_percent,
    term_days, invoice_reference, notes, submitted_by
  ]);

  await logEvent(id, 'stage_change', null, 'SUBMITTED', null, submitted_by, { input });
  pingBrain('FINANCING_DEAL_SUBMITTED', { dealId: id, deal_type, commodity, amount_requested });
  return id;
}

// ------------------------------------------------------------
// GET NEXT PARTNER IN WATERFALL
// Returns full partner record (internal use only).
// ------------------------------------------------------------
async function getNextPartner(dealId, dealType = 'factoring', excludeIds = []) {
  const db = getDB();

  // Pull IDs of partners who've already made a decision on this deal
  const { rows: decided } = await db.query(`
    SELECT DISTINCT partner_id FROM financing_partner_decisions
    WHERE deal_id = $1 AND decision IN ('passed', 'expired')
  `, [dealId]);
  const passedIds = decided.map(r => r.partner_id).concat(excludeIds);

  const params = [dealType];
  let exclusionClause = '';
  if (passedIds.length > 0) {
    const placeholders = passedIds.map((_, i) => `$${i + 2}`).join(',');
    exclusionClause = `AND id NOT IN (${placeholders})`;
    params.push(...passedIds);
  }

  const { rows } = await db.query(`
    SELECT id, legal_name, contact_name, contact_email,
           role, waterfall_order, public_label
    FROM financing_partner_registry
    WHERE deal_type = $1 AND active = TRUE ${exclusionClause}
    ORDER BY waterfall_order ASC
    LIMIT 1
  `, params);

  return rows[0] || null;
}

// ------------------------------------------------------------
// ROUTE DEAL TO NEXT PARTNER
// Sets current_partner_id + stage, creates pending decision row.
// Returns the partner record (INTERNAL — mailer uses it to send).
// ------------------------------------------------------------
async function routeToNextPartner(dealId) {
  const db = getDB();

  const partner = await getNextPartner(dealId, 'factoring');
  if (!partner) {
    await updateStage(dealId, 'NO_FINANCING_AVAILABLE', 'system');
    pingBrain('FINANCING_NO_PARTNER_AVAILABLE', { dealId });
    return null;
  }

  const newStage = partner.role === 'primary' ? 'PRIMARY_REVIEW' : 'SECONDARY_REVIEW';

  await db.query(`
    UPDATE financing_deals
       SET current_partner_id = $1,
           stage = $2,
           last_stage_change_at = NOW(),
           updated_at = NOW()
     WHERE id = $3
  `, [partner.id, newStage, dealId]);

  await db.query(`
    INSERT INTO financing_partner_decisions (deal_id, partner_id, decision)
    VALUES ($1, $2, 'pending')
    ON CONFLICT DO NOTHING
  `, [dealId, partner.id]);

  await logEvent(dealId, 'partner_assigned', null, newStage, partner.id, 'system',
    { partner_role: partner.role });
  pingBrain('FINANCING_PARTNER_ASSIGNED', { dealId, partnerId: partner.id, role: partner.role });

  return partner;
}

// ------------------------------------------------------------
// RECORD PARTNER DECISION — accept / pass / expire
// On 'passed' → triggers next waterfall step.
// On 'accepted' → moves deal to LOI_PENDING.
// ------------------------------------------------------------
async function recordDecision(dealId, partnerId, decision, notes = '', decidedBy = 'partner') {
  const db = getDB();
  const allowed = ['accepted', 'passed', 'expired'];
  if (!allowed.includes(decision)) throw new Error(`Invalid decision: ${decision}`);

  await db.query(`
    INSERT INTO financing_partner_decisions (deal_id, partner_id, decision, decided_by, notes)
    VALUES ($1, $2, $3, $4, $5)
  `, [dealId, partnerId, decision, decidedBy, notes]);

  await logEvent(dealId, 'decision_recorded', null, null, partnerId, decidedBy,
    { decision, notes });
  pingBrain('FINANCING_DECISION_RECORDED', { dealId, partnerId, decision });

  let nextAction = null;
  if (decision === 'accepted') {
    await updateStage(dealId, 'LOI_PENDING', decidedBy);
    nextAction = { type: 'LOI_REQUESTED', partnerId };
  } else if (decision === 'passed' || decision === 'expired') {
    // Waterfall: find next partner
    const nextPartner = await routeToNextPartner(dealId);
    nextAction = nextPartner
      ? { type: 'ROUTED_TO_NEXT', partnerId: nextPartner.id, role: nextPartner.role }
      : { type: 'NO_FINANCING_AVAILABLE' };
  }
  return nextAction;
}

// ------------------------------------------------------------
// UPDATE DEAL STAGE (internal use)
// ------------------------------------------------------------
async function updateStage(dealId, newStage, actor = 'system') {
  const db = getDB();
  const { rows } = await db.query(`SELECT stage FROM financing_deals WHERE id = $1`, [dealId]);
  if (!rows[0]) throw new Error(`Deal ${dealId} not found`);
  const fromStage = rows[0].stage;

  await db.query(`
    UPDATE financing_deals
       SET stage = $1, last_stage_change_at = NOW(), updated_at = NOW()
     WHERE id = $2
  `, [newStage, dealId]);

  await logEvent(dealId, 'stage_change', fromStage, newStage, null, actor, null);
  pingBrain('FINANCING_STAGE_CHANGE', { dealId, fromStage, toStage: newStage });
}

// ------------------------------------------------------------
// GET STATUS (PUBLIC-SAFE) — never returns partner identity
// This is what frontend endpoints return to clients.
// ------------------------------------------------------------
async function getPublicStatus(dealId) {
  const db = getDB();
  const { rows } = await db.query(`
    SELECT d.id, d.deal_type, d.commodity, d.amount_requested, d.stage,
           d.submitted_at, d.last_stage_change_at,
           r.public_label
      FROM financing_deals d
      LEFT JOIN financing_partner_registry r ON r.id = d.current_partner_id
     WHERE d.id = $1
  `, [dealId]);
  if (!rows[0]) return null;
  const d = rows[0];
  return {
    dealId: d.id,
    deal_type: d.deal_type,
    commodity: d.commodity,
    amount_requested: d.amount_requested,
    stage: d.stage,
    financing_partner_label: d.public_label || 'Mexausa Food Group financing partner',
    submitted_at: d.submitted_at,
    last_stage_change_at: d.last_stage_change_at,
    estimated_response: estimateResponse(d.stage)
  };
}

function estimateResponse(stage) {
  switch (stage) {
    case 'SUBMITTED':
    case 'PRIMARY_REVIEW':
    case 'SECONDARY_REVIEW': return '48 hours';
    case 'LOI_PENDING':
    case 'NDA_PENDING':
    case 'TERM_SHEET_PENDING': return '5 business days';
    case 'PARTY_DISCLOSURE':
    case 'FUNDED': return 'completed';
    default: return null;
  }
}

// ------------------------------------------------------------
// GET PARTNER IDENTITY — GATED
// Only returns legal_name/contact_email if deal.stage === 'PARTY_DISCLOSURE'.
// All access logged for audit.
// ------------------------------------------------------------
async function getPartnerIdentityForDeal(dealId, requestedBy = 'unknown') {
  const db = getDB();
  const { rows } = await db.query(`
    SELECT d.stage, d.current_partner_id,
           r.legal_name, r.contact_name, r.contact_email, r.public_label
      FROM financing_deals d
      LEFT JOIN financing_partner_registry r ON r.id = d.current_partner_id
     WHERE d.id = $1
  `, [dealId]);
  if (!rows[0]) return null;
  const d = rows[0];

  if (d.stage !== 'PARTY_DISCLOSURE' && d.stage !== 'FUNDED') {
    await logEvent(dealId, 'disclosure_denied', null, null, d.current_partner_id, requestedBy,
      { reason: `stage=${d.stage}` });
    return {
      disclosed: false,
      financing_partner_label: d.public_label || 'Mexausa Food Group financing partner',
      reason: `Partner identity is disclosed only after Term Sheet acceptance (current stage: ${d.stage})`
    };
  }

  await logEvent(dealId, 'disclosure_released', null, null, d.current_partner_id, requestedBy, null);
  pingBrain('FINANCING_IDENTITY_DISCLOSED', { dealId, partnerId: d.current_partner_id, to: requestedBy });

  return {
    disclosed: true,
    legal_name: d.legal_name,
    contact_name: d.contact_name,
    contact_email: d.contact_email
  };
}

// ------------------------------------------------------------
// EVENT LOGGING
// ------------------------------------------------------------
async function logEvent(dealId, eventType, fromStage, toStage, partnerId, actor, payload) {
  try {
    const db = getDB();
    await db.query(`
      INSERT INTO financing_deal_events
        (deal_id, event_type, from_stage, to_stage, partner_id, actor, payload)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [dealId, eventType, fromStage, toStage, partnerId, actor, payload ? JSON.stringify(payload) : null]);
  } catch (err) {
    console.error('[financing-waterfall] logEvent failed:', err.message);
  }
}

module.exports = {
  generateDealId,
  createDeal,
  getNextPartner,
  routeToNextPartner,
  recordDecision,
  updateStage,
  getPublicStatus,
  getPartnerIdentityForDeal,
  logEvent
};