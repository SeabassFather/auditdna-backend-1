// C:\AuditDNA\backend\services\predict-service.js
// Sprint C - Grower Predictive Engine service layer
// Calls Claude Opus 4.7, persists prediction, creates financing_deal row

const Anthropic = require('@anthropic-ai/sdk');
const prompts = require('../prompts/grower-predict-prompts');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL_PREDICT = process.env.PREDICT_MODEL || 'claude-opus-4-7';
const MODEL_LETTER  = process.env.LETTER_MODEL  || 'claude-haiku-4-5-20251001';

async function predictCrop({ pool, grower, commodity, acres, planting_date, expected_yield_per_acre, region, variety, organic }) {
  if (!pool) throw new Error('pool is required');
  if (!grower || !grower.id) throw new Error('grower.id is required');
  if (!commodity) throw new Error('commodity is required');
  if (!acres || acres <= 0) throw new Error('acres must be positive');

  const userPayload = {
    grower: {
      id: grower.id,
      name: grower.name || grower.company_name || 'Unknown',
      grs_score: grower.grs_score || null,
      region: region || grower.region || 'Unknown',
      prior_harvests: grower.prior_harvests || []
    },
    crop: {
      commodity, acres, planting_date, expected_yield_per_acre,
      variety: variety || null,
      organic: !!organic
    },
    context: {
      current_date: new Date().toISOString().split('T')[0],
      platform: 'AuditDNA',
      currency: 'USD',
      pricing_basis: 'FOB wholesale'
    }
  };

  const response = await anthropic.messages.create({
    model: MODEL_PREDICT,
    max_tokens: 2000,
    system: prompts.predictSystem,
    messages: [{
      role: 'user',
      content: 'Predict the harvest outcome for this planned crop. Return ONLY JSON per the schema:\n\n' + JSON.stringify(userPayload, null, 2)
    }]
  });

  let raw = '';
  for (const block of response.content) {
    if (block.type === 'text') raw += block.text;
  }
  raw = raw.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

  let prediction;
  try {
    prediction = JSON.parse(raw);
  } catch (e) {
    throw new Error('Claude returned invalid JSON: ' + raw.substring(0, 200));
  }

  const yieldInsert = await pool.query(
    'INSERT INTO grower_intel_yields (grower_id, commodity, acres, planting_date, expected_yield_per_acre, predicted_cases, predicted_margin, predicted_margin_pct, harvest_window_start, harvest_window_end, confidence_score, claude_reasoning, generated_at, claude_model) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),$13) RETURNING id',
    [
      grower.id, commodity, acres, planting_date, expected_yield_per_acre,
      prediction.predicted_cases, prediction.predicted_margin, prediction.predicted_margin_pct,
      prediction.harvest_window_start, prediction.harvest_window_end,
      prediction.confidence_score, prediction.reasoning, MODEL_PREDICT
    ]
  );
  const yield_id = yieldInsert.rows[0].id;

  const volumeLbs = Math.round((prediction.predicted_cases || 0) * 40);
  const dealInsert = await pool.query(
    "INSERT INTO financing_deals (grower_id, commodity, volume_lbs, invoice_amount, status, stage, source_type, predictive_yield_id) VALUES ($1,$2,$3,$4,'ELIGIBLE','PROPOSAL','predict',$5) RETURNING id",
    [
      grower.id, commodity, volumeLbs,
      prediction.estimated_total_revenue || prediction.predicted_margin || 0,
      yield_id
    ]
  );
  const deal_id = dealInsert.rows[0].id;

  return { prediction, yield_id, deal_id };
}

async function draftCourtesyLetter({ buyer, grower, prediction, commodity, volume_lbs, harvest_window_start, pricing }) {
  const payload = {
    buyer: {
      company: buyer.company || 'Unknown',
      language_preference: buyer.language_preference || 'en',
      buyer_type: buyer.buyer_type || 'wholesale',
      prior_purchases: buyer.prior_purchases || []
    },
    offer: {
      commodity, volume_lbs, harvest_window_start,
      pricing_range_per_case: pricing || null,
      grower_region: grower.region || null,
      organic: grower.organic || false
    }
  };

  const response = await anthropic.messages.create({
    model: MODEL_LETTER,
    max_tokens: 2000,
    system: prompts.courtesyLetterSystem,
    messages: [{
      role: 'user',
      content: 'Draft a courtesy letter for this opportunity. Return ONLY JSON per schema:\n\n' + JSON.stringify(payload, null, 2)
    }]
  });

  let raw = '';
  for (const block of response.content) {
    if (block.type === 'text') raw += block.text;
  }
  raw = raw.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

  return JSON.parse(raw);
}

async function findMatchedBuyers({ pool, commodity, volume_lbs, region, min_score = 0.25 }) {
  const result = await pool.query(
    "SELECT id, company_name, contact_name, contact_email, commodity_focus, state_province, country, 1.0::numeric AS match_score FROM contacts WHERE contact_email IS NOT NULL AND contact_email != '' AND (commodity_focus ILIKE $1 OR company_name ILIKE $1) LIMIT 100",
    ['%' + commodity + '%']
  );
  return result.rows.filter(r => r.match_score >= min_score);
}

module.exports = {
  predictCrop,
  draftCourtesyLetter,
  findMatchedBuyers,
  MODEL_PREDICT,
  MODEL_LETTER
};