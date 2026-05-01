// =============================================================================
// File: factor-intake.js
// Save to: C:\AuditDNA\backend\routes\factor-intake.js
// =============================================================================
// Sprint D Wave 3B - Factor Engine
//
// REPLACES the broken Sprint C P4 factor-intake (which had pdfkit dependency
// that silently killed the route at boot - "Cannot find module 'pdfkit'").
//
// This version:
//   - NO pdfkit dependency (PDFs deferred to Wave 3C if needed)
//   - Real QPF scoring algorithm (8-factor weighted)
//   - 10-partner waterfall recommendation
//   - Buyer fuzzy-match against factor_buyers (with aliases)
//   - Invoice photo stored in factor_invoice_photos (separate from notes)
//   - Brain event emission for autonomy loop
//   - Full audit trail in factor_score_history
//
// Endpoints:
//   POST   /api/factor/intake/manual         - submit invoice for factoring (THE big one)
//   GET    /api/factor/intake/health         - service health check
//   GET    /api/factor/intake/deal/:id       - retrieve scored deal
//   GET    /api/factor/intake/partners       - list active partners (admin/debug)
//   GET    /api/factor/intake/buyers/lookup  - fuzzy buyer name search (autocomplete)
//   POST   /api/factor/intake/score-only     - score WITHOUT inserting (dry-run)
// =============================================================================

const express = require('express');
const pool = require('../db');
const router = express.Router();

const db = () => pool || null;

// =============================================================================
// CONSTANTS
// =============================================================================
const NTFY_TOPIC = process.env.NTFY_NINER_TOPIC || 'mfg-niner-alerts';
const NTFY_BASE  = process.env.NTFY_BASE || 'https://ntfy.sh';
const NTFY_TOKEN = process.env.NTFY_TOKEN || '';
const BRAIN_EMIT_URL = process.env.BRAIN_EVENT_URL || ''; // optional: POST event to brain

// =============================================================================
// BUYER FUZZY-MATCH
// =============================================================================
// Lookup buyer by name with three strategies:
//   1. Exact match (case-insensitive) on buyer_name
//   2. Match against any alias in buyer_aliases array
//   3. Substring match (rawName contains stored or stored contains rawName)
async function lookupBuyer(rawName) {
  const pool = db();
  if (!pool) return { matched: false, name: rawName, credit_tier: 2, reason: 'db unavailable - default tier 2' };
  const lc = String(rawName || '').trim().toLowerCase();
  if (!lc) return { matched: false, name: rawName, credit_tier: 3, reason: 'empty name - default tier 3 watch' };
  try {
    // Strategy 1: exact name
    const r1 = await pool.query(
      `SELECT id, buyer_name, credit_tier, typical_paydays, pay_reliability, size_tier, segment, region
       FROM factor_buyers WHERE LOWER(buyer_name) = $1 AND is_active = TRUE LIMIT 1`,
      [lc]
    );
    if (r1.rows.length > 0) return { matched: true, ...r1.rows[0], match_strategy: 'exact_name' };
    // Strategy 2: alias match (Postgres array unnest)
    const r2 = await pool.query(
      `SELECT id, buyer_name, credit_tier, typical_paydays, pay_reliability, size_tier, segment, region
       FROM factor_buyers
       WHERE is_active = TRUE
         AND EXISTS (SELECT 1 FROM unnest(buyer_aliases) a WHERE LOWER(a) = $1)
       LIMIT 1`,
      [lc]
    );
    if (r2.rows.length > 0) return { matched: true, ...r2.rows[0], match_strategy: 'alias' };
    // Strategy 3: substring (in either direction)
    const r3 = await pool.query(
      `SELECT id, buyer_name, credit_tier, typical_paydays, pay_reliability, size_tier, segment, region
       FROM factor_buyers
       WHERE is_active = TRUE
         AND (LOWER(buyer_name) LIKE '%' || $1 || '%' OR $1 LIKE '%' || LOWER(buyer_name) || '%')
       ORDER BY LENGTH(buyer_name) DESC LIMIT 1`,
      [lc]
    );
    if (r3.rows.length > 0) return { matched: true, ...r3.rows[0], match_strategy: 'substring' };
    return { matched: false, name: rawName, credit_tier: 3, reason: 'no match - default tier 3 watch' };
  } catch (e) {
    return { matched: false, name: rawName, credit_tier: 2, reason: 'lookup error - default tier 2', error: e.message };
  }
}

// =============================================================================
// QPF SCORING (Quality Performance Factor)
// =============================================================================
// 8-factor weighted score, range 0.0 - 1.0
//   F1: Buyer credit tier        (35% weight) - dominant factor
//   F2: Invoice amount           (15% weight) - bigger = better terms
//   F3: Invoice age (days)       (10% weight) - fresh = best
//   F4: Payment terms (Net days) (10% weight) - shorter = better
//   F5: Pay reliability %        (10% weight) - from buyer history
//   F6: Commodity volatility     (10% weight) - some commodities riskier
//   F7: Document quality         (5%  weight) - photo + invoice number + PO
//   F8: Grower history           (5%  weight) - if grower in CRM with closes
function calculateQPF(inputs) {
  const factors = [];
  let totalScore = 0;

  // F1: Buyer credit tier (35%)
  const tierMap = { 1: 1.00, 2: 0.65, 3: 0.30 };
  const f1 = tierMap[inputs.credit_tier] || 0.50;
  factors.push({ key: 'buyer_credit', weight: 0.35, raw: inputs.credit_tier, score: f1, contribution: f1 * 0.35,
    note: `Tier ${inputs.credit_tier} buyer (${inputs.credit_tier === 1 ? 'premium' : inputs.credit_tier === 2 ? 'mid' : 'watch'})` });
  totalScore += f1 * 0.35;

  // F2: Invoice amount (15%) - sweet spot 25K-250K
  const amt = Number(inputs.invoice_amount) || 0;
  let f2 = 0.50;
  if (amt >= 25000 && amt <= 250000) f2 = 0.95;
  else if (amt >= 10000 && amt < 25000) f2 = 0.80;
  else if (amt > 250000 && amt <= 1000000) f2 = 0.85;
  else if (amt >= 5000 && amt < 10000) f2 = 0.65;
  else if (amt < 5000) f2 = 0.40;
  else if (amt > 1000000) f2 = 0.70;
  factors.push({ key: 'invoice_amount', weight: 0.15, raw: amt, score: f2, contribution: f2 * 0.15,
    note: amt >= 25000 && amt <= 250000 ? 'In sweet spot' : 'Outside ideal range' });
  totalScore += f2 * 0.15;

  // F3: Invoice age (10%) - fresh = best
  const age = Number(inputs.invoice_age_days) || 0;
  let f3 = 0.50;
  if (age <= 7) f3 = 1.00;
  else if (age <= 14) f3 = 0.85;
  else if (age <= 30) f3 = 0.70;
  else if (age <= 60) f3 = 0.40;
  else f3 = 0.20;
  factors.push({ key: 'invoice_age', weight: 0.10, raw: age, score: f3, contribution: f3 * 0.10,
    note: `${age} days old (${age <= 7 ? 'fresh' : age <= 30 ? 'workable' : 'aged'})` });
  totalScore += f3 * 0.10;

  // F4: Payment terms (10%) - parse Net X
  const termsMatch = String(inputs.payment_terms || '').match(/(\d+)/);
  const netDays = termsMatch ? parseInt(termsMatch[1], 10) : 30;
  let f4 = 0.50;
  if (netDays <= 14) f4 = 1.00;
  else if (netDays <= 21) f4 = 0.90;
  else if (netDays <= 30) f4 = 0.80;
  else if (netDays <= 45) f4 = 0.60;
  else if (netDays <= 60) f4 = 0.45;
  else f4 = 0.30;
  factors.push({ key: 'payment_terms', weight: 0.10, raw: netDays, score: f4, contribution: f4 * 0.10,
    note: `Net ${netDays}` });
  totalScore += f4 * 0.10;

  // F5: Pay reliability (10%) - from buyer history if available
  const rel = Number(inputs.pay_reliability) || 90;
  const f5 = Math.min(1.0, rel / 100);
  factors.push({ key: 'pay_reliability', weight: 0.10, raw: rel, score: f5, contribution: f5 * 0.10,
    note: `${rel}% historical pay rate` });
  totalScore += f5 * 0.10;

  // F6: Commodity volatility (10%) - berries = volatile, leafy_greens = volatile, citrus = stable
  const cat = String(inputs.commodity_category || '').toLowerCase();
  const volatilityMap = {
    'leafy_greens': 0.55,   // perishable, price swings
    'berries':      0.50,
    'tomato':       0.65,
    'avocado':      0.60,
    'citrus':       0.85,   // shelf-stable
    'melons':       0.70,
    'herbs':        0.55,
    'peppers':      0.70,
    'squash':       0.80,
    'onion':        0.95,   // very stable
    'potato':       0.90
  };
  const f6 = volatilityMap[cat] || 0.65;
  factors.push({ key: 'commodity_volatility', weight: 0.10, raw: cat || 'unknown', score: f6, contribution: f6 * 0.10,
    note: cat ? `${cat} category` : 'Uncategorized' });
  totalScore += f6 * 0.10;

  // F7: Document quality (5%) - photo + invoice_number + po_number
  let docPoints = 0.30;
  if (inputs.has_photo) docPoints += 0.30;
  if (inputs.has_invoice_number) docPoints += 0.20;
  if (inputs.has_po_number) docPoints += 0.20;
  const f7 = Math.min(1.0, docPoints);
  factors.push({ key: 'document_quality', weight: 0.05, raw: { photo: !!inputs.has_photo, inv: !!inputs.has_invoice_number, po: !!inputs.has_po_number }, score: f7, contribution: f7 * 0.05,
    note: `${(f7 * 100).toFixed(0)}% complete docs` });
  totalScore += f7 * 0.05;

  // F8: Grower history (5%)
  let f8 = 0.50;
  if (inputs.grower_closes_count >= 5) f8 = 1.00;
  else if (inputs.grower_closes_count >= 1) f8 = 0.75;
  else if (inputs.grower_known) f8 = 0.60;
  factors.push({ key: 'grower_history', weight: 0.05, raw: inputs.grower_closes_count || 0, score: f8, contribution: f8 * 0.05,
    note: `${inputs.grower_closes_count || 0} prior closes` });
  totalScore += f8 * 0.05;

  // Final QPF score
  const qpf = Math.round(totalScore * 100) / 100;

  // Recommended advance %: maps QPF to advance band
  let advancePct = 75;
  if (qpf >= 0.90) advancePct = 95;
  else if (qpf >= 0.80) advancePct = 92;
  else if (qpf >= 0.70) advancePct = 88;
  else if (qpf >= 0.60) advancePct = 85;
  else if (qpf >= 0.50) advancePct = 80;
  else if (qpf >= 0.40) advancePct = 75;
  else advancePct = 70;

  return {
    qpf_score: qpf,
    qpf_factors: factors,
    expected_advance_pct: advancePct,
    expected_advance_usd: amt > 0 ? Math.round(amt * advancePct / 100 * 100) / 100 : null,
    decision_band: qpf >= 0.80 ? 'top_tier' : qpf >= 0.60 ? 'mid_tier' : qpf >= 0.40 ? 'conservative' : 'high_risk'
  };
}

// =============================================================================
// PARTNER WATERFALL - tier-gated recommendation
// =============================================================================
async function recommendPartners(qpf, creditTier, invoiceAmount, spanishGrower) {
  const pool = db();
  if (!pool) return { recommended: null, fallbacks: [] };
  try {
    const r = await pool.query(
      `SELECT * FROM v_factor_partner_active
       WHERE min_credit_tier <= $1 AND max_credit_tier >= $1
         AND min_invoice_usd <= $2 AND max_invoice_usd >= $2
       ORDER BY priority_rank ASC`,
      [creditTier, invoiceAmount || 0]
    );
    if (r.rows.length === 0) return { recommended: null, fallbacks: [], reason: 'No partners match tier+amount constraints' };

    // Apply QPF-based filtering: top_tier gets best partners, conservative gets willing-to-go-low partners
    let scored = r.rows.map(p => {
      let score = 100 - (p.priority_rank || 100); // base = lower rank wins
      // Mexausa Capital boost (priority 5) - already winning by default
      if (p.partner_code === 'MEX') score += 50;
      // QPF gating: if QPF < 0.6, prefer partners that explicitly take tier 3
      if (qpf < 0.60 && p.max_credit_tier >= 3) score += 20;
      if (qpf >= 0.85 && p.min_advance_pct >= 90) score += 15; // top tier prefers high advance
      // Spanish capability bonus if grower flagged
      if (spanishGrower && p.spanish_capable) score += 10;
      // Produce specialist bonus
      if (p.produce_specialist) score += 8;
      return { ...p, _score: score };
    }).sort((a, b) => b._score - a._score);

    return {
      recommended: scored[0],
      fallbacks: scored.slice(1, 4) // next 3
    };
  } catch (e) {
    return { recommended: null, fallbacks: [], error: e.message };
  }
}

// =============================================================================
// COMMODITY NORMALIZATION (reuses Wave 3A.5 commodity_aliases)
// =============================================================================
async function normalizeCommodity(rawName) {
  const pool = db();
  if (!pool) return { category: null, raw: rawName };
  const lc = String(rawName || '').toLowerCase().trim();
  if (!lc) return { category: null, raw: rawName };
  try {
    const r = await pool.query(`SELECT category FROM commodity_aliases WHERE LOWER(alias) = $1 LIMIT 1`, [lc]);
    if (r.rows.length > 0) return { category: r.rows[0].category, raw: rawName };
    const r2 = await pool.query(
      `SELECT category, alias FROM commodity_aliases
       WHERE $1 LIKE '%' || LOWER(alias) || '%'
       ORDER BY LENGTH(alias) DESC LIMIT 1`, [lc]
    );
    if (r2.rows.length > 0) return { category: r2.rows[0].category, raw: rawName, matched_alias: r2.rows[0].alias };
    return { category: lc.replace(/\s+/g, '_'), raw: rawName, fallback: true };
  } catch (e) {
    return { category: lc.replace(/\s+/g, '_'), raw: rawName, error: e.message };
  }
}

// =============================================================================
// INVOICE AGE (days from invoice_date to today)
// =============================================================================
function invoiceAgeDays(invoiceDate) {
  if (!invoiceDate) return 0;
  const d = new Date(invoiceDate);
  if (isNaN(d.getTime())) return 0;
  const now = new Date();
  return Math.max(0, Math.floor((now - d) / (1000 * 60 * 60 * 24)));
}

// =============================================================================
// HEALTH
// =============================================================================
router.get('/health', async (req, res) => {
  const pool = db();
  if (!pool) return res.json({ ok: true, service: 'factor-intake', version: '3B', db: false });
  try {
    const r1 = await pool.query(`SELECT COUNT(*)::int AS n FROM factor_partners WHERE is_active = TRUE`);
    const r2 = await pool.query(`SELECT COUNT(*)::int AS n FROM factor_buyers WHERE is_active = TRUE`);
    res.json({
      ok: true, service: 'factor-intake', version: '3B', db: true,
      active_partners: r1.rows[0].n,
      registered_buyers: r2.rows[0].n,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.json({ ok: false, service: 'factor-intake', version: '3B', error: e.message });
  }
});

// =============================================================================
// LIST PARTNERS (admin/debug)
// =============================================================================
router.get('/partners', async (req, res) => {
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });
  try {
    const r = await pool.query(`SELECT * FROM v_factor_partner_active`);
    res.json({ ok: true, count: r.rows.length, rows: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// =============================================================================
// BUYER LOOKUP (autocomplete)
// =============================================================================
router.get('/buyers/lookup', async (req, res) => {
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });
  const q = String(req.query.q || '').trim().toLowerCase();
  if (q.length < 2) return res.json({ ok: true, count: 0, rows: [] });
  try {
    const r = await pool.query(
      `SELECT id, buyer_name, credit_tier, size_tier, segment, region
       FROM factor_buyers
       WHERE is_active = TRUE
         AND (LOWER(buyer_name) LIKE $1
              OR EXISTS (SELECT 1 FROM unnest(buyer_aliases) a WHERE LOWER(a) LIKE $1))
       ORDER BY credit_tier ASC, buyer_name ASC LIMIT 10`,
      ['%' + q + '%']
    );
    res.json({ ok: true, count: r.rows.length, rows: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// =============================================================================
// SCORE-ONLY (dry run - no DB insert, returns scoring)
// =============================================================================
router.post('/score-only', async (req, res) => {
  const t0 = Date.now();
  const b = req.body || {};
  if (!b.buyer_name || !b.invoice_amount || !b.commodity) {
    return res.status(400).json({ error: 'buyer_name, invoice_amount, and commodity required' });
  }
  try {
    const buyer = await lookupBuyer(b.buyer_name);
    const commodity = await normalizeCommodity(b.commodity);
    const scoring = calculateQPF({
      credit_tier:    buyer.credit_tier,
      invoice_amount: b.invoice_amount,
      invoice_age_days: invoiceAgeDays(b.invoice_date),
      payment_terms:  b.payment_terms || 'Net 30',
      pay_reliability: buyer.pay_reliability || 90,
      commodity_category: commodity.category,
      has_photo:        !!b.invoice_photo_base64,
      has_invoice_number: !!b.invoice_number,
      has_po_number:    !!b.po_number,
      grower_known:     !!b.grower_id,
      grower_closes_count: 0
    });
    const partners = await recommendPartners(scoring.qpf_score, buyer.credit_tier, b.invoice_amount, b.source_lang === 'es');
    res.json({
      ok: true, dry_run: true,
      buyer_match: buyer,
      commodity_normalizer: commodity,
      ...scoring,
      recommended_partner: partners.recommended,
      fallback_partners: partners.fallbacks,
      reasoning_engine: 'AuditDNA Platform Reasoning',
      elapsed_ms: Date.now() - t0
    });
  } catch (e) { res.status(500).json({ error: e.message, stack: e.stack }); }
});

// =============================================================================
// MAIN INTAKE - the big one
// =============================================================================
router.post('/manual', async (req, res) => {
  const t0 = Date.now();
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });
  const b = req.body || {};

  // ----- Validation -----
  if (!b.buyer_name)     return res.status(400).json({ error: 'buyer_name is required' });
  if (!b.invoice_amount) return res.status(400).json({ error: 'invoice_amount is required' });
  if (!b.commodity)      return res.status(400).json({ error: 'commodity is required' });

  try {
    // ----- 1. Lookup buyer + normalize commodity -----
    const [buyer, commodity] = await Promise.all([
      lookupBuyer(b.buyer_name),
      normalizeCommodity(b.commodity)
    ]);

    // ----- 2. Calculate QPF -----
    const scoring = calculateQPF({
      credit_tier:        buyer.credit_tier,
      invoice_amount:     b.invoice_amount,
      invoice_age_days:   invoiceAgeDays(b.invoice_date),
      payment_terms:      b.payment_terms || 'Net 30',
      pay_reliability:    buyer.pay_reliability || 90,
      commodity_category: commodity.category,
      has_photo:          !!b.invoice_photo_base64,
      has_invoice_number: !!b.invoice_number,
      has_po_number:      !!b.po_number,
      grower_known:       !!b.grower_id,
      grower_closes_count: 0 // TODO Wave 3C: lookup from CRM
    });

    // ----- 3. Recommend partner -----
    const partners = await recommendPartners(
      scoring.qpf_score,
      buyer.credit_tier,
      b.invoice_amount,
      String(b.source_lang || '').toLowerCase() === 'es'
    );

    // ----- 4. Insert into financing_deals -----
    // The financing_deals table has 32 columns from Sprint C P4. We populate what we know.
    const dealIns = await pool.query(
      `INSERT INTO financing_deals
        (invoice_number, po_number, grower_name, buyer_name, commodity,
         quantity, unit, unit_price, invoice_amount, invoice_date, due_date,
         payment_terms, notes, source_type, source_lang, status, created_by, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'PROPOSAL',$16,NOW())
       RETURNING id`,
      [
        b.invoice_number || null,
        b.po_number || null,
        b.grower_name || null,
        b.buyer_name,
        b.commodity,
        b.quantity || null,
        b.unit || 'lb',
        b.unit_price || null,
        b.invoice_amount,
        b.invoice_date || null,
        b.due_date || null,
        b.payment_terms || 'Net 30',
        b.notes || null,
        b.source_type || 'manual',
        b.source_lang || 'en',
        b.created_by || null
      ]
    );
    const dealId = dealIns.rows[0].id;

    // ----- 5. Store invoice photo (if provided) -----
    if (b.invoice_photo_base64) {
      try {
        const sizeKb = Math.round(b.invoice_photo_base64.length * 3 / 4 / 1024);
        const mimeMatch = b.invoice_photo_base64.match(/^data:([^;]+);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        await pool.query(
          `INSERT INTO factor_invoice_photos (deal_id, photo_data, photo_size_kb, mime_type, uploaded_by)
           VALUES ($1,$2,$3,$4,$5)`,
          [dealId, b.invoice_photo_base64, sizeKb, mime, b.created_by || null]
        );
      } catch (e) { /* photo store failure non-fatal */ }
    }

    // ----- 6. Persist score history -----
    try {
      await pool.query(
        `INSERT INTO factor_score_history
          (deal_id, buyer_name, buyer_id, buyer_credit_tier, invoice_amount, invoice_age_days,
           payment_terms, commodity, qpf_score, qpf_factors, expected_advance_pct, expected_advance_usd,
           recommended_partner_id, recommended_partner_code, fallback_partner_codes,
           source_type, source_lang)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
        [
          dealId, b.buyer_name, buyer.id || null, buyer.credit_tier,
          b.invoice_amount, invoiceAgeDays(b.invoice_date),
          b.payment_terms || 'Net 30', b.commodity,
          scoring.qpf_score, JSON.stringify(scoring.qpf_factors),
          scoring.expected_advance_pct, scoring.expected_advance_usd,
          partners.recommended ? partners.recommended.id : null,
          partners.recommended ? partners.recommended.partner_code : null,
          partners.fallbacks.map(p => p.partner_code),
          b.source_type || 'manual', b.source_lang || 'en'
        ]
      );
    } catch (e) { /* score history failure non-fatal */ }

    // ----- 7. Brain event (autonomy loop) -----
    try {
      const evt = {
        event: 'factor.intake.scored',
        deal_id: dealId,
        qpf_score: scoring.qpf_score,
        decision_band: scoring.decision_band,
        buyer_credit_tier: buyer.credit_tier,
        recommended_partner: partners.recommended ? partners.recommended.partner_code : null,
        invoice_amount: b.invoice_amount,
        source_type: b.source_type || 'manual',
        timestamp: new Date().toISOString()
      };
      // Try in-process brain emitter first
      if (global.brainEmit && typeof global.brainEmit === 'function') {
        try { global.brainEmit(evt); } catch (e) {}
      }
      // Fallback: HTTP POST to brain event URL if configured
      if (BRAIN_EMIT_URL) {
        fetch(BRAIN_EMIT_URL, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(evt)
        }).catch(() => {});
      }
    } catch (e) { /* brain failure non-fatal */ }

    // ----- 8. ntfy push to admins (high-value deals only) -----
    if (b.invoice_amount >= 25000) {
      try {
        const headers = {
          'Content-Type': 'text/plain',
          'Title': `[FACTOR DEAL] ${b.buyer_name} ${b.commodity} $${Number(b.invoice_amount).toLocaleString()} - QPF ${scoring.qpf_score} - ${partners.recommended ? partners.recommended.partner_code : 'NO_PARTNER'}`,
          'Priority': '4',
          'Tags': 'money,handshake'
        };
        if (NTFY_TOKEN) headers['Authorization'] = 'Bearer ' + NTFY_TOKEN;
        const msg = [
          `Deal #${dealId} - ${b.source_type || 'manual'}`,
          `Buyer: ${b.buyer_name} (Tier ${buyer.credit_tier})`,
          `Amount: $${Number(b.invoice_amount).toLocaleString()}`,
          `QPF: ${scoring.qpf_score} (${scoring.decision_band})`,
          `Recommended: ${partners.recommended ? partners.recommended.partner_name + ' (' + partners.recommended.partner_code + ')' : 'NONE'}`,
          `Advance: ${scoring.expected_advance_pct}% = $${Number(scoring.expected_advance_usd || 0).toLocaleString()}`
        ].join('\n');
        fetch(`${NTFY_BASE}/${NTFY_TOPIC}`, { method: 'POST', headers, body: msg }).catch(() => {});
      } catch (e) { /* push failure non-fatal */ }
    }

    // ----- 9. Return rich response -----
    return res.json({
      ok: true,
      deal_id: dealId,
      status: 'PROPOSAL',
      buyer_match: {
        matched: buyer.matched,
        canonical_name: buyer.buyer_name || buyer.name,
        credit_tier: buyer.credit_tier,
        match_strategy: buyer.match_strategy || null,
        size_tier: buyer.size_tier || null,
        segment: buyer.segment || null
      },
      commodity_normalizer: commodity,
      qpf_score: scoring.qpf_score,
      qpf_factors: scoring.qpf_factors,
      decision_band: scoring.decision_band,
      expected_advance_pct: scoring.expected_advance_pct,
      expected_advance_usd: scoring.expected_advance_usd,
      recommended_partner: partners.recommended ? {
        partner_code: partners.recommended.partner_code,
        partner_name: partners.recommended.partner_name,
        contact_name: partners.recommended.contact_name,
        funding_speed_hrs: partners.recommended.funding_speed_hrs,
        min_advance_pct: partners.recommended.min_advance_pct,
        max_advance_pct: partners.recommended.max_advance_pct,
        produce_specialist: partners.recommended.produce_specialist,
        spanish_capable: partners.recommended.spanish_capable
      } : null,
      fallback_partners: partners.fallbacks.map(p => ({
        partner_code: p.partner_code,
        partner_name: p.partner_name,
        funding_speed_hrs: p.funding_speed_hrs
      })),
      reasoning_engine: 'AuditDNA Platform Reasoning',
      elapsed_ms: Date.now() - t0,
      next_step: partners.recommended
        ? `Term sheet from ${partners.recommended.partner_name} expected within ${partners.recommended.funding_speed_hrs} hours. Open Deal Floor to track.`
        : 'No matching partner under current constraints. Admin review required.'
    });
  } catch (e) {
    return res.status(500).json({ error: 'Intake failed', detail: e.message, stack: e.stack });
  }
});

// =============================================================================
// GET DEAL BY ID
// =============================================================================
router.get('/deal/:id', async (req, res) => {
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });
  try {
    const d = await pool.query(`SELECT * FROM financing_deals WHERE id = $1`, [req.params.id]);
    if (d.rows.length === 0) return res.status(404).json({ error: 'Deal not found' });
    const s = await pool.query(`SELECT * FROM factor_score_history WHERE deal_id = $1 ORDER BY scored_at DESC LIMIT 1`, [req.params.id]);
    const p = await pool.query(`SELECT id, photo_size_kb, mime_type, uploaded_at FROM factor_invoice_photos WHERE deal_id = $1`, [req.params.id]);
    res.json({ ok: true, deal: d.rows[0], score: s.rows[0] || null, photos: p.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
