// =============================================================================
// File: C:\AuditDNA\backend\swarm\gatekeepers\06-mill.js
// STAGE 6 - MILL: business logic, calculations, derived fields
// =============================================================================

function scoreInquiry(data) {
  let score = 0;
  if (data.email && /@/.test(data.email)) score += 20;
  if (data.phone) score += 15;
  if (data.company) score += 15;
  if (data.commodity) score += 10;
  if (data.volume_estimate) score += 25;
  if (data.country && data.country.toUpperCase() === 'MX') score += 10;
  if (data.country && data.country.toUpperCase() === 'US') score += 5;
  return Math.min(100, score);
}

function priceMortgage(data) {
  const amount = parseFloat(data.loan_amount) || 0;
  if (amount <= 0) return null;
  // Simple estimate: 6.5% APR, 30yr fixed
  const monthlyRate = 0.065 / 12;
  const months = 360;
  const payment = amount * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
  return {
    estimated_apr: 6.5,
    estimated_monthly: Math.round(payment * 100) / 100,
    term_months: months
  };
}

async function run(ctx) {
  const type = ctx.request.request_type;
  const data = ctx.normalized || {};
  const out = { type };

  switch (type) {
    case 'plastpac.inquiry':
    case 'buyer.inquire':
    case 'grower.onboard':
      out.lead_score = scoreInquiry(data);
      out.tier = out.lead_score >= 70 ? 'hot' : out.lead_score >= 40 ? 'warm' : 'cold';
      break;
    case 'mortgage.lead':
      out.estimate = priceMortgage(data);
      out.lead_score = scoreInquiry(data);
      break;
    case 'factor.invoice':
      out.fee_estimate_pct = 2.5;
      out.fee_estimate_amount = Math.round((parseFloat(data.amount) || 0) * 0.025 * 100) / 100;
      break;
    default:
      out.processed = true;
  }

  ctx.business = out;
  return out;
}

module.exports = {
  number: 6,
  name: 'process',
  agent: 'mill',
  run
};
