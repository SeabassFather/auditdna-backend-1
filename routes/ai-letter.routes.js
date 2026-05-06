/**
 * ai-letter.routes.js
 *
 * Save to: C:\AuditDNA\backend\routes\ai-letter.routes.js
 *
 * Mount in server.js:
 *   app.use('/api/ai-letter', require('./routes/ai-letter.routes'));
 *
 * Endpoints:
 *   POST /api/ai-letter/compose - Generate bilingual EN/ES letter via Claude
 *   GET  /api/ai-letter/usage   - Today's usage count + remaining (for the UI badge)
 *   GET  /api/ai-letter/history - Last 20 generations (for review)
 *
 * Uses Claude Sonnet 4.6 anchored on MFG_OMNIBUS content for brand consistency.
 * 50/day soft rate-limit per user_email (configurable via env DAILY_LIMIT).
 * Logs every generation to ai_letters_log with token counts + cost estimate.
 */

const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'auditdna',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'auditdna2026',
});

const DAILY_LIMIT = parseInt(process.env.AI_LETTER_DAILY_LIMIT || '50');
const MODEL = 'claude-sonnet-4-5-20250929';

// Sonnet 4.5 pricing per million tokens (used for cost estimate logging)
const COST_INPUT_PER_M  = 3.00;   // $/M input tokens
const COST_OUTPUT_PER_M = 15.00;  // $/M output tokens

// ============================================================
// MFG omnibus context - kept as a string so the route is self-contained
// (avoids requiring the frontend module from backend)
// ============================================================
const MFG_BRAND_CONTEXT = `
You are writing on behalf of MEXAUSA FOOD GROUP, INC. (MFG) - an integrated
agricultural intelligence + trading platform owned by Saul Garcia.

MFG operates two distinct platforms:
1. AuditDNA Agriculture (mexausafg.com) - grower/buyer matching, USDA intelligence,
   factoring, trade finance. AuditDNA carries ZERO NMLS or PACA references in any letter.
2. EnjoyBaja Real Estate (enjoybaja.com, NMLS #337526) - separate platform, do NOT mix.

Core MFG capabilities Claude may reference:
- Year-round Hass avocado program from Michoacan, Jalisco, Nayarit (premium calibers)
- Trade finance: invoice factoring 80-90% advance in 48 hours; PO finance 70-85% in 24 hours, PACA-compliant
- LOAF platform - field-worker grower compliance + sponsor advertising marketplace
- 33,971+ contact CRM with auto-categorization (growers, buyers, packers, shippers)
- Daily USDA NASS pricing intel + FDA alert overlay for 35+ commodities
- Niner Miners SI engine (synthetic intelligence) for commodity matching

Brand voice rules:
- Direct, professional, action-oriented. No fluff, no exclamation marks, no emoji.
- Always include a clear call-to-action (book a call, request a quote, reply to confirm).
- Sign-off: "Saul Garcia | Mexausa Food Group, Inc." with US +1-831-251-3116 OR MX +52-646-340-2686.
- Email: saul@mexausafg.com (preferred) or sgarcia1911@gmail.com (legacy).
- NEVER fabricate prices or specifications. If unsure, write "[insert current FOB]".
- NEVER reference Cowboys (use "Niner Miners" if SI engine is mentioned).
- NEVER cross-reference EnjoyBaja real estate from an AuditDNA letter.
`.trim();

// ============================================================
// Cost estimator
// ============================================================
function estimateCost(inputTokens, outputTokens) {
  const i = (inputTokens  || 0) * COST_INPUT_PER_M  / 1_000_000;
  const o = (outputTokens || 0) * COST_OUTPUT_PER_M / 1_000_000;
  return Number((i + o).toFixed(6));
}

// ============================================================
// GET /api/ai-letter/usage
// Returns today's count + remaining for rate-limit badge in UI
// ============================================================
router.get('/usage', async (req, res) => {
  try {
    const userEmail = (req.query.user_email || 'anonymous').toString();
    const r = await pool.query(`
      SELECT COUNT(*)::int AS used_today
      FROM ai_letters_log
      WHERE user_email = $1
        AND status = 'success'
        AND created_at >= NOW() - INTERVAL '24 hours'
    `, [userEmail]);
    const used = r.rows[0].used_today;
    res.json({
      ok: true,
      used_today: used,
      daily_limit: DAILY_LIMIT,
      remaining: Math.max(0, DAILY_LIMIT - used)
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ============================================================
// GET /api/ai-letter/history?n=20
// ============================================================
router.get('/history', async (req, res) => {
  try {
    const userEmail = (req.query.user_email || 'anonymous').toString();
    const n = Math.min(parseInt(req.query.n || '20', 10), 100);
    const r = await pool.query(`
      SELECT id, tone, commodity, recipient_role, length_preset,
             subject, LEFT(body_en, 280) AS body_preview,
             input_tokens, output_tokens, cost_estimate_usd, created_at
      FROM ai_letters_log
      WHERE user_email = $1 AND status = 'success'
      ORDER BY created_at DESC
      LIMIT $2
    `, [userEmail, n]);
    res.json({ ok: true, history: r.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ============================================================
// POST /api/ai-letter/compose
// Body: {
//   tone:           'Professional' | 'Friendly' | 'Urgent' | 'Investor',
//   commodity:      'Avocado' | 'Strawberry' | 'Mortgage' | etc,
//   recipient_role: 'Grower' | 'Buyer' | 'Packer' | 'Investor',
//   custom_prompt:  string (optional - extra instructions),
//   length_preset:  'Short' | 'Medium' | 'Long',
//   user_email:     string (for rate limit + audit log)
// }
// Returns: { ok, subject, body_en, body_es, suggested_attachments, generation_id }
// ============================================================
router.post('/compose', async (req, res) => {
  const ip = (req.headers['x-forwarded-for'] || req.ip || '').toString().slice(0, 64);
  const {
    tone = 'Professional',
    commodity = 'Avocado',
    recipient_role = 'Buyer',
    custom_prompt = '',
    length_preset = 'Medium',
    user_email = 'anonymous'
  } = req.body || {};

  // ---- Rate limit ----
  try {
    const usage = await pool.query(`
      SELECT COUNT(*)::int AS used_today FROM ai_letters_log
      WHERE user_email = $1 AND status = 'success' AND created_at >= NOW() - INTERVAL '24 hours'
    `, [user_email]);
    if (usage.rows[0].used_today >= DAILY_LIMIT) {
      return res.status(429).json({
        ok: false,
        error: `Daily limit of ${DAILY_LIMIT} AI generations reached. Try again in 24 hours or contact admin to raise the limit.`,
        used_today: usage.rows[0].used_today,
        daily_limit: DAILY_LIMIT
      });
    }
  } catch (e) {
    console.warn('[ai-letter] rate-limit check failed (allowing through):', e.message);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ ok: false, error: 'ANTHROPIC_API_KEY not configured on backend' });
  }

  // ---- Compose user prompt ----
  const lengthGuide = {
    Short:  '120-180 words for the English body',
    Medium: '220-320 words for the English body',
    Long:   '380-500 words for the English body'
  }[length_preset] || '220-320 words for the English body';

  const toneGuide = {
    Professional: 'formal, specifications-first, calm authority',
    Friendly:     'warm, conversational, first-name basis but still business-grade',
    Urgent:       'time-sensitive, price-window framing, clear deadline',
    Investor:     'numbers-driven, traction metrics, concise asks, SAFE/term-sheet awareness'
  }[tone] || 'professional';

  const userPrompt = `
Write an outbound email letter for a MEXAUSA FOOD GROUP campaign.

Inputs:
- Recipient role: ${recipient_role}
- Commodity / topic: ${commodity}
- Tone: ${tone} (${toneGuide})
- Length: ${lengthGuide}
${custom_prompt ? `- Additional instructions from sender: ${custom_prompt}` : ''}

Required output format - return ONLY a JSON object, no preamble, no markdown fences:
{
  "subject": "...",
  "body_en": "Full English letter body. Use {{name}} where the recipient first name should be substituted server-side. Two newlines between paragraphs. Sign-off included.",
  "body_es": "Full Spanish translation matching the same structure. Same {{name}} placeholder.",
  "suggested_attachments": ["array of suggested PDF/CSV filenames the user might attach, e.g. 'Avocado_Calibers_Sheet.pdf', 'Q3_FOB_Pricing.csv'"]
}

Critical constraints:
- The letter must read like Saul Garcia personally wrote it. Confident, no fluff, no exclamation marks.
- Include exactly ONE clear call-to-action.
- Use {{name}} (literal text, with double-braces) where the recipient first name goes.
- Sign-off must be "Saul Garcia | Mexausa Food Group, Inc." with phone +1-831-251-3116 (US) or +52-646-340-2686 (MX).
- DO NOT fabricate prices, specifications, or volumes - if unsure, write "[current FOB]" or "[volume on request]".
- DO NOT reference EnjoyBaja real estate.
- DO NOT use NMLS or PACA references in the body (AuditDNA carries neither).
- Spanish translation must be Mexico business Spanish, not Iberian.
`.trim();

  // ---- Call Claude ----
  let resp, parsed, inputTokens = 0, outputTokens = 0;
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2200,
      system: MFG_BRAND_CONTEXT,
      messages: [{ role: 'user', content: userPrompt }]
    });
    inputTokens  = resp.usage?.input_tokens  || 0;
    outputTokens = resp.usage?.output_tokens || 0;

    // Extract JSON from response - Claude sometimes wraps it in markdown
    let raw = (resp.content[0]?.text || '').trim();
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error('[ai-letter/compose] Claude call failed:', err.message);
    // Log the failure
    try {
      await pool.query(`
        INSERT INTO ai_letters_log
          (user_email, tone, commodity, recipient_role, custom_prompt, length_preset,
           model, input_tokens, output_tokens, cost_estimate_usd, status, error_message, ip_address)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      `, [user_email, tone, commodity, recipient_role, custom_prompt, length_preset,
          MODEL, inputTokens, outputTokens, estimateCost(inputTokens, outputTokens),
          'failed', err.message.substring(0, 1000), ip]);
    } catch(_) {}
    return res.status(502).json({ ok: false, error: 'AI generation failed: ' + err.message });
  }

  // ---- Log success ----
  let generationId = null;
  try {
    const ins = await pool.query(`
      INSERT INTO ai_letters_log
        (user_email, tone, commodity, recipient_role, custom_prompt, length_preset,
         subject, body_en, body_es, suggested_attachments,
         model, input_tokens, output_tokens, cost_estimate_usd, status, ip_address)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'success',$15)
      RETURNING id
    `, [
      user_email, tone, commodity, recipient_role, custom_prompt, length_preset,
      parsed.subject || '', parsed.body_en || '', parsed.body_es || '',
      Array.isArray(parsed.suggested_attachments) ? parsed.suggested_attachments : [],
      MODEL, inputTokens, outputTokens, estimateCost(inputTokens, outputTokens), ip
    ]);
    generationId = ins.rows[0].id;
  } catch (e) {
    console.warn('[ai-letter/compose] log insert failed (returning result anyway):', e.message);
  }

  res.json({
    ok: true,
    generation_id: generationId,
    subject: parsed.subject || '',
    body_en: parsed.body_en || '',
    body_es: parsed.body_es || '',
    suggested_attachments: parsed.suggested_attachments || [],
    tone_applied: tone,
    recipient_role,
    commodity,
    length_preset,
    model: MODEL,
    tokens: { input: inputTokens, output: outputTokens },
    cost_estimate_usd: estimateCost(inputTokens, outputTokens)
  });
});

module.exports = router;
