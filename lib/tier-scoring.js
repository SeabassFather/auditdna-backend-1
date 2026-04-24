// ═══════════════════════════════════════════════════════════════════════════
// SI AUTO-TIERING ENGINE — Rule-based credit tier scoring
// Mexausa Food Group, Inc. | AuditDNA Agriculture Intelligence
// Save to: C:\AuditDNA\backend\lib\tier-scoring.js
//
// Scores a buyer on 10 dimensions (max 100 points), maps to tier A/B/C/D.
// Deterministic, offline, defensible — no AI dependency.
// Returns: { tier, score, breakdown, risk_flags, rationale }
// ═══════════════════════════════════════════════════════════════════════════

function scoreBuyer(buyer, contacts = [], trade_refs = []) {
  const breakdown = [];
  const risk_flags = [];
  let score = 0;

  // ── 1. Legal ID present (15 pts) — country-specific
  const legalIds = [buyer.fein, buyer.rfc, buyer.ruc_peru, buyer.rut_empresa, buyer.nit_colombia];
  const hasLegalId = legalIds.some(x => x && String(x).trim().length > 3);
  if (hasLegalId) { score += 15; breakdown.push({ factor: 'Legal tax ID verified', points: 15 }); }
  else { risk_flags.push({ severity: 'high', flag: 'No legal tax ID on file' }); breakdown.push({ factor: 'Legal tax ID missing', points: 0 }); }

  // ── 2. D-U-N-S Number (15 pts) — strongest credit signal
  if (buyer.duns_number && String(buyer.duns_number).trim().length >= 8) {
    score += 15;
    breakdown.push({ factor: 'D-U-N-S Number present', points: 15 });
  } else if (buyer.country === 'US') {
    risk_flags.push({ severity: 'medium', flag: 'US buyer without D-U-N-S Number' });
    breakdown.push({ factor: 'D-U-N-S missing (US buyer)', points: 0 });
  }

  // ── 3. Industry license (10 pts) — PACA (US), SENASICA (MX), SENASA (PE), SAG (CL), ICA (CO)
  const licenses = [buyer.paca_license, buyer.senasica_permit, buyer.senasa_peru_permit, buyer.sag_permit, buyer.ica_import_permit];
  const hasLicense = licenses.some(x => x && String(x).trim().length > 3);
  if (hasLicense) { score += 10; breakdown.push({ factor: 'Industry license verified', points: 10 }); }
  else { breakdown.push({ factor: 'No industry license', points: 0 }); }

  // ── 4. Years in business (15 pts)
  const yr = parseInt(buyer.year_established);
  const age = yr && yr > 1900 && yr <= new Date().getFullYear() ? (new Date().getFullYear() - yr) : 0;
  if (age >= 20)      { score += 15; breakdown.push({ factor: `${age} years in business`, points: 15 }); }
  else if (age >= 10) { score += 10; breakdown.push({ factor: `${age} years in business`, points: 10 }); }
  else if (age >= 5)  { score += 5;  breakdown.push({ factor: `${age} years in business`, points: 5  }); }
  else if (age > 0)   { breakdown.push({ factor: `Only ${age} years in business`, points: 0 }); risk_flags.push({ severity: 'medium', flag: 'Less than 5 years established' }); }
  else                { breakdown.push({ factor: 'Year established not provided', points: 0 }); }

  // ── 5. Website presence (5 pts)
  if (buyer.website && /^https?:\/\//i.test(buyer.website)) {
    score += 5;
    breakdown.push({ factor: 'Verifiable web presence', points: 5 });
  }

  // ── 6. Physical address (5 pts)
  if (buyer.address_line1 && buyer.city && buyer.postal_code) {
    score += 5;
    breakdown.push({ factor: 'Complete physical address', points: 5 });
  } else {
    risk_flags.push({ severity: 'low', flag: 'Incomplete address on file' });
  }

  // ── 7. Trade references (max 12 pts — 3 per ref up to 4)
  const validRefs = (trade_refs || []).filter(r => r.company_name && (r.contact_email || r.contact_phone));
  const refPts = Math.min(validRefs.length * 3, 12);
  if (refPts > 0) { score += refPts; breakdown.push({ factor: `${validRefs.length} trade references`, points: refPts }); }
  else { risk_flags.push({ severity: 'medium', flag: 'No verifiable trade references' }); }

  // ── 8. Contact matrix depth (max 9 pts — 3 per role)
  const roles = new Set((contacts || []).map(c => c.role).filter(Boolean));
  const contactPts = Math.min(roles.size * 3, 9);
  if (contactPts > 0) { score += contactPts; breakdown.push({ factor: `${roles.size} contact role(s) on file`, points: contactPts }); }

  // ── 9. Commodity diversification (max 10 pts — 2 per commodity)
  const commodities = Array.isArray(buyer.commodities_preferred) ? buyer.commodities_preferred : [];
  const commodityPts = Math.min(commodities.length * 2, 10);
  if (commodityPts > 0) { score += commodityPts; breakdown.push({ factor: `${commodities.length} commodity preference(s)`, points: commodityPts }); }

  // ── 10. Regional reach (max 5 pts — 1 per region)
  const regions = Array.isArray(buyer.regions_served) ? buyer.regions_served : [];
  const regionPts = Math.min(regions.length, 5);
  if (regionPts > 0) { score += regionPts; breakdown.push({ factor: `${regions.length} region(s) served`, points: regionPts }); }

  // ── Negative signals
  if ((buyer.deals_disputed_count || 0) > 0) {
    const penalty = Math.min(buyer.deals_disputed_count * 5, 20);
    score -= penalty;
    breakdown.push({ factor: `${buyer.deals_disputed_count} disputed deal(s)`, points: -penalty });
    risk_flags.push({ severity: 'high', flag: `${buyer.deals_disputed_count} historical dispute(s)` });
  }

  // Clamp
  score = Math.max(0, Math.min(100, score));

  // Tier mapping
  let tier, suggested_limit_usd, suggested_terms;
  if (score >= 75)       { tier = 'A'; suggested_limit_usd = 250000; suggested_terms = 'net30'; }
  else if (score >= 55)  { tier = 'B'; suggested_limit_usd = 100000; suggested_terms = 'net21'; }
  else if (score >= 35)  { tier = 'C'; suggested_limit_usd = 25000;  suggested_terms = 'net14'; }
  else                   { tier = 'D'; suggested_limit_usd = 5000;   suggested_terms = 'net7';  }

  // Rationale (plain English)
  const positives = breakdown.filter(b => b.points > 0).slice(0, 4).map(b => b.factor);
  const gaps      = breakdown.filter(b => b.points === 0).slice(0, 3).map(b => b.factor);
  const rationale = [
    `SI-scored ${score}/100 → Tier ${tier}.`,
    positives.length ? `Strengths: ${positives.join(', ')}.` : '',
    gaps.length      ? `Gaps: ${gaps.join(', ')}.` : '',
    risk_flags.length ? `${risk_flags.length} risk flag(s) raised.` : 'No risk flags.'
  ].filter(Boolean).join(' ');

  return {
    tier,
    score,
    suggested_limit_usd,
    suggested_terms,
    breakdown,
    risk_flags,
    rationale,
    scored_at: new Date().toISOString(),
    scored_by: 'SI_TIER_ENGINE_v1'
  };
}

module.exports = { scoreBuyer };
