// ============================================================================
// MEXAUSA COMMISSION ENGINE
// Variable 2-3% based on: product, location, grower/buyer history, longevity
//
// RULES:
//   3.0% — single spot transaction, new parties, international origin
//   2.75% — domestic, new parties OR international, repeat parties
//   2.5%  — repeat parties, domestic, standard commodity
//   2.25% — established relationship (3+ prior deals), any location
//   2.0%  — long-term contract (90+ days / multi-shipment agreement)
//
// MODIFIERS:
//   +0.25% — perishable commodity (berries, leafy greens, herbs)
//   +0.25% — cross-border (MX/LATAM → US)
//   -0.25% — deal value > $100,000 (volume discount)
//   -0.25% — deal longevity > 6 months
//   Floor: 2.0% | Ceiling: 3.0%
// ============================================================================

const PERISHABLES = ['strawberry','blueberry','raspberry','blackberry','lettuce',
  'spinach','cilantro','herbs','basil','parsley','arugula','kale','mixed greens',
  'asparagus','broccoli','cauliflower','green onion'];

const INTERNATIONAL_COUNTRIES = ['PE','CL','BR','AR','CO','EC','GT','HN','CR','PA','PT','ES'];

function calcCommission({
  commodity = '',
  grower_country = 'MX',
  total_value = 0,
  prior_deals = 0,        // # of prior deals between these two parties
  deal_duration_days = 0, // 0 = spot, 30 = 1 month, 365 = 1 year, etc.
  sale_type = 'direct',   // direct | flash | tender
} = {}) {

  const val = parseFloat(total_value) || 0;
  const comm_key = commodity.toLowerCase().split('/')[0].trim();
  const isPerishable = PERISHABLES.some(p => comm_key.includes(p));
  const isInternational = INTERNATIONAL_COUNTRIES.includes((grower_country||'MX').toUpperCase());
  const priorDeals = parseInt(prior_deals) || 0;
  const durationDays = parseInt(deal_duration_days) || 0;

  // Base rate
  let pct = 3.0;
  if (priorDeals >= 10 || durationDays >= 365) pct = 2.0;
  else if (priorDeals >= 3 || durationDays >= 90)  pct = 2.25;
  else if (priorDeals >= 1 && !isInternational)    pct = 2.5;
  else if (priorDeals >= 1 || !isInternational)    pct = 2.75;

  // Modifiers
  if (isPerishable)     pct += 0.25;  // perishable handling risk
  if (isInternational)  pct += 0.25;  // cross-border complexity
  if (val > 100000)     pct -= 0.25;  // volume discount
  if (durationDays > 180) pct -= 0.25; // longevity discount

  // Floor / ceiling
  pct = Math.min(3.0, Math.max(2.0, pct));
  pct = Math.round(pct * 100) / 100; // clean to 2 decimals

  const amount = val * (pct / 100);

  return {
    pct,
    amount: parseFloat(amount.toFixed(2)),
    basis: {
      base_rate: priorDeals >= 10 ? '2.0% (long-term partner)' :
                 priorDeals >= 3  ? '2.25% (established)' :
                 priorDeals >= 1  ? '2.5-2.75% (repeat)' : '3.0% (new)',
      perishable_add: isPerishable ? '+0.25%' : null,
      international_add: isInternational ? '+0.25% cross-border' : null,
      volume_discount: val > 100000 ? '-0.25% (>$100K)' : null,
      longevity_discount: durationDays > 180 ? '-0.25% (>6 months)' : null,
      prior_deals: priorDeals,
      deal_duration_days: durationDays,
    }
  };
}

module.exports = { calcCommission };
