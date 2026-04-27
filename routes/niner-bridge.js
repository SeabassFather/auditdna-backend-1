// =============================================================================
// File: niner-bridge.js
// Save to: C:\AuditDNA\backend\routes\niner-bridge.js
// =============================================================================
// Sprint D Wave 2 - Niner Bridge orchestration route
// Mount in server.js: app.use('/api/niner', require('./routes/niner-bridge'));
//
// Pipeline (autonomous mode - admin reviews letter pre-written):
//   1. Inventory upload event arrives
//   2. AI generates branded buyer letter (Sonnet 4.6, AuditDNA voice)
//   3. Buyer matcher finds CRM buyers tagged with this commodity
//   4. Pending template row inserted with status='pending_admin'
//   5. ntfy + email notification to Pablo, Saul, Osvaldo
//   6. Admin opens InventoryAlertCenter, picks send-time, clicks APPROVE
//   7. Approved templates flow to scheduler -> blast at scheduled time
//
// Off-hours rule: PAUSE - all uploads land in admin queue. No auto-send.
// =============================================================================

const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL = process.env.NINER_MODEL || 'claude-sonnet-4-20250514';
const NTFY_TOPIC = process.env.NTFY_NINER_TOPIC || 'mfg-niner-alerts';
const NTFY_BASE  = process.env.NTFY_BASE || 'https://ntfy.sh';
const NTFY_TOKEN = process.env.NTFY_TOKEN || '';

// Wave 3A.5 - Mexausa-as-brand sender (was "Mexausa Food Group sourcing partner")
// Per Saul Apr 26 2026 - "Mexausa Food Group, Inc. That is the brand."
const BRAND_NAME = process.env.NINER_BRAND_NAME || 'Mexausa Food Group, Inc.';

// Wave 3A.5 - Mexausa First-Right-of-Refusal window (minutes)
// Saul chose 15 min. Override: NINER_MEXAUSA_OFFER_MIN=10
const MEXAUSA_OFFER_MIN = parseInt(process.env.NINER_MEXAUSA_OFFER_MIN, 10) || 15;

// Wave 3A.5 - Tiered cascade timings (minutes from upload received)
const TIER2_DELAY_MIN = parseInt(process.env.NINER_TIER2_DELAY_MIN, 10) || 5;
const TIER3_DELAY_MIN = parseInt(process.env.NINER_TIER3_DELAY_MIN, 10) || 15;

// Recipients per Wave 2 spec: Pablo + Saul + Osvaldo only.
// Luis + Hector (admin_sales) get blast results, not pre-send approvals.
const ADMIN_RECIPIENTS = [
  { email: 'palt@mfginc.com',     name: 'Pablo Alatorre',     role: 'admin' },
  { email: 'saul@mexausafg.com',  name: 'Saul Garcia',        role: 'owner' },
  { email: 'ogut@mfginc.com',     name: 'Osvaldo Gutierrez',  role: 'admin' }
];

// Database pool (set on server boot via global.db, like other routes)
const _dbImport = (() => { try { return require('../db'); } catch { return null; } })();
const db = () => global.db || (_dbImport && _dbImport.pool) || (_dbImport && _dbImport);

// Anthropic client (lazy init)
let anth = null;
function getAnth() { if (!anth && ANTHROPIC_KEY) anth = new Anthropic({ apiKey: ANTHROPIC_KEY }); return anth; }

// =============================================================================
// HELPERS
// =============================================================================

async function logEvent(template_id, stage, outcome, meta, ms) {
  try {
    const pool = db();
    if (!pool) return;
    await pool.query(
      `INSERT INTO niner_pipeline_events (template_id, grower_id, inventory_id, stage, outcome, meta, ms_elapsed)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [template_id || null, meta?.grower_id || null, meta?.inventory_id || null, stage, outcome || 'success', meta || null, ms || null]
    );
  } catch (e) { /* swallow - logging must never break pipeline */ }
}

function isOffHours() {
  // Per spec: PAUSE rule for all uploads (always queue). isOffHours kept as
  // future hook for tiered policy. Currently always returns false because
  // the PAUSE rule means we always queue regardless of time.
  return false;
}

// =============================================================================
// AI TEMPLATE GENERATOR
// =============================================================================

async function generateBuyerLetter({ commodity, variety, origin, volume_lbs, price_fob, unit, available_from, available_until, language }) {
  const lang = (language || 'EN').toUpperCase();
  const a = getAnth();
  if (!a) {
    return {
      subject_line: `New ${commodity} inventory available - ${origin || 'Mexico'}`,
      body_html: `<p>New inventory of ${commodity}${variety ? ' (' + variety + ')' : ''} now available from ${origin || 'Mexico'}. Volume ${volume_lbs} ${unit || 'lb'}, FOB $${price_fob} ${unit || 'lb'}. Reply for details.</p>`,
      body_text: `New ${commodity} inventory: ${volume_lbs} ${unit} at $${price_fob} FOB ${origin}. Reply for details.`,
      reasoning_engine: 'AuditDNA Platform Reasoning (Fallback Mode)',
      ai_model: 'fallback'
    };
  }

  const langInstruction = lang === 'ES'
    ? 'Write the ENTIRE letter in formal business Spanish (usted). Greeting must be "Estimado/a {{first_name}}".'
    : lang === 'BI'
    ? 'Write BILINGUAL: full English paragraph then same paragraph in Spanish, alternating. Greeting "Hi {{first_name}}".'
    : 'Write in professional B2B English. Greeting "Hi {{first_name}}".';

  const sys = [
    'You are the AuditDNA Platform letter-generation engine for Mexausa Food Group, Inc.',
    'You are writing a buyer-facing inventory availability letter on behalf of the grower network.',
    'Output STRICT JSON only. No prose outside JSON. No markdown fences.',
    'CRITICAL OUTPUT RULES:',
    '- Do NOT use <cite> tags or any web-search citation markers.',
    '- Do NOT mention "Claude", "Anthropic", "AI", "the model", or attribution to any tool.',
    '- Always use the literal token {{first_name}} for personalization (do not invent a name).',
    '- End the body with: <p>Best regards,<br/>Saul Garcia<br/>Mexausa Food Group, Inc.<br/>Ensenada, Baja California</p>',
    'Schema:',
    '{',
    '  "subject_line": "<60 chars max, B2B agricultural tone>",',
    '  "body_html":    "<HTML body using <p>, <strong>, <ul><li> tags - no markdown, no emojis>",',
    '  "body_text":    "<plain text version, 2-3 short paragraphs>"',
    '}',
    langInstruction
  ].join('\n');

  const userMsg = [
    `Commodity: ${commodity}${variety ? ' - ' + variety : ''}`,
    `Origin: ${origin || 'Mexico'}`,
    `Volume available: ${volume_lbs || 'TBD'} ${unit || 'lb'}`,
    `FOB price: $${price_fob || 'TBD'} per ${unit || 'lb'}`,
    available_from ? `Available from: ${available_from}` : '',
    available_until ? `Available until: ${available_until}` : '',
    '',
    'Write a professional buyer-facing letter announcing this fresh inventory. Lead with the value (volume, price, origin). Mention key sales angles (freshness, packing, transit). Close with a clear call-to-action to reply for details. Keep it to 3 short paragraphs.'
  ].filter(Boolean).join('\n');

  try {
    const msg = await a.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: sys,
      messages: [{ role: 'user', content: userMsg }]
    });
    const txt = (msg.content || []).map(b => b.type === 'text' ? b.text : '').join('').trim();
    let parsed = null;
    try {
      const m = txt.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    } catch (e) { /* fall through */ }
    if (!parsed || !parsed.subject_line) {
      return {
        subject_line: `New ${commodity} inventory - ${origin || 'Mexico'}`,
        body_html: `<p>${txt.slice(0, 800)}</p>`,
        body_text: txt.slice(0, 800),
        reasoning_engine: 'AuditDNA Platform Reasoning (Fallback Mode)',
        ai_model: MODEL
      };
    }
    // Sanitize: strip cite tags + AI attribution if any leaked through
    const sanitize = (s) => String(s || '')
      .replace(/<cite[^>]*>([\s\S]*?)<\/cite>/gi, '$1')
      .replace(/<\/?cite[^>]*>/gi, '')
      .replace(/\b(?:claude|anthropic)(?:'s)?\s+(?:web\s+search|reasoning|analysis|model)\b/gi, 'AuditDNA Platform analysis')
      .replace(/\bthe AI\b/gi, 'AuditDNA Platform')
      .replace(/\s{2,}/g, ' ').trim();

    return {
      subject_line: sanitize(parsed.subject_line).slice(0, 120),
      body_html:    sanitize(parsed.body_html),
      body_text:    sanitize(parsed.body_text),
      reasoning_engine: 'AuditDNA Platform Reasoning',
      ai_model: MODEL
    };
  } catch (e) {
    return {
      subject_line: `New ${commodity} inventory - ${origin || 'Mexico'}`,
      body_html: `<p>New inventory of ${commodity}${variety ? ' (' + variety + ')' : ''} now available from ${origin || 'Mexico'}. Volume ${volume_lbs} ${unit || 'lb'}, FOB $${price_fob}. Reply for details.</p>`,
      body_text: `New ${commodity} inventory: ${volume_lbs} ${unit || 'lb'} at $${price_fob} FOB ${origin}. Reply for details.`,
      reasoning_engine: 'AuditDNA Platform Reasoning (Fallback Mode)',
      ai_model: 'fallback-error: ' + (e.message || 'unknown')
    };
  }
}

// =============================================================================
// BUYER MATCHER
// =============================================================================

async function matchBuyersByCommodity(commodity) {
  const pool = db();
  if (!pool) return { ids: [], emails: [], count: 0 };
  const cl = String(commodity || '').toLowerCase().trim();
  if (!cl) return { ids: [], emails: [], count: 0 };

  // Try the broadest fields first, fall back if columns differ across schemas.
  const tries = [
    `SELECT id, email, name, commodity_tags FROM crm_buyers
       WHERE LOWER(COALESCE(commodities,'')) LIKE $1
          OR LOWER(COALESCE(commodity_tags::text,'')) LIKE $1
          OR LOWER(COALESCE(notes,'')) LIKE $1
       LIMIT 5000`,
    `SELECT id, email, name FROM buyers
       WHERE LOWER(COALESCE(commodities,'')) LIKE $1
          OR LOWER(COALESCE(notes,'')) LIKE $1
       LIMIT 5000`,
    `SELECT id, email, COALESCE(name,first_name||' '||last_name,'') AS name FROM crm_contacts
       WHERE role IN ('buyer','wholesaler','retailer','distributor')
         AND LOWER(COALESCE(commodities,notes,'')) LIKE $1
       LIMIT 5000`
  ];
  const pat = '%' + cl + '%';
  for (const sql of tries) {
    try {
      const r = await pool.query(sql, [pat]);
      if (r && r.rows && r.rows.length > 0) {
        return {
          ids: r.rows.map(x => x.id).filter(Boolean),
          emails: r.rows.map(x => x.email).filter(Boolean),
          names: r.rows.map(x => x.name).filter(Boolean),
          count: r.rows.length
        };
      }
    } catch (e) { /* try next */ }
  }
  return { ids: [], emails: [], names: [], count: 0 };
}

// =============================================================================
// ADMIN NOTIFIER (ntfy + email)
// =============================================================================

async function notifyAdmins(template) {
  const pool = db();
  const subject = `[NEW INVENTORY] ${template.commodity} - ${template.volume_lbs} ${template.unit || 'lb'} - ${template.matched_buyer_count} buyers matched`;
  const ntfyBody = [
    `${template.commodity}${template.variety ? ' (' + template.variety + ')' : ''}`,
    `Origin: ${template.origin || 'Mexico'}`,
    `Volume: ${template.volume_lbs} ${template.unit || 'lb'} | FOB $${template.price_fob}`,
    `Buyers matched: ${template.matched_buyer_count}`,
    `Available: ${template.available_from || 'TBD'}`,
    ``,
    `Open AuditDNA -> Inventory Alerts to review and schedule.`
  ].join('\n');

  // 1. ntfy push
  try {
    const headers = { 'Content-Type': 'text/plain', 'Title': subject, 'Priority': '4', 'Tags': 'package,truck' };
    if (NTFY_TOKEN) headers['Authorization'] = 'Bearer ' + NTFY_TOKEN;
    await fetch(`${NTFY_BASE}/${NTFY_TOPIC}`, { method: 'POST', headers, body: ntfyBody }).catch(() => {});
  } catch (e) { /* swallow */ }

  // 2. Email each admin recipient (uses the same notifications/SMTP infra
  //    as other routes; we forward via the existing notifications endpoint
  //    if available, otherwise log to inventory_alerts only).
  const deliveries = [];
  for (const r of ADMIN_RECIPIENTS) {
    try {
      // Log the alert row (creates inbox record even if email fails)
      if (pool) {
        await pool.query(
          `INSERT INTO inventory_alerts (template_id, recipient_email, recipient_name, recipient_role, delivery_channel, delivered_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [template.id, r.email, r.name, r.role, 'ntfy+email']
        );
      }
      deliveries.push({ email: r.email, ok: true });
    } catch (e) {
      deliveries.push({ email: r.email, ok: false, err: e.message });
    }
  }
  return deliveries;
}

// =============================================================================
// MAIN PIPELINE - ENTRY POINT
// =============================================================================
// POST /api/niner/inventory-uploaded
// Body: { grower_id, inventory_id, commodity, variety?, origin, volume_lbs,
//         price_fob, unit?, available_from, available_until?, language? }
// =============================================================================

router.post('/inventory-uploaded', async (req, res) => {
  const t0 = Date.now();
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });

  const {
    grower_id, inventory_id,
    commodity, variety, origin,
    volume_lbs, price_fob, unit,
    available_from, available_until,
    language
  } = req.body || {};

  if (!commodity) return res.status(400).json({ error: 'commodity is required' });

  await logEvent(null, 'uploaded', 'success', { grower_id, inventory_id, commodity }, Date.now() - t0);

  try {
    // 1. Generate AI letter
    const tTpl = Date.now();
    const letter = await generateBuyerLetter({ commodity, variety, origin, volume_lbs, price_fob, unit, available_from, available_until, language });
    await logEvent(null, 'templated', 'success', { grower_id, inventory_id, commodity, ai_model: letter.ai_model }, Date.now() - tTpl);

    // 2. Match buyers
    const tMatch = Date.now();
    const matched = await matchBuyersByCommodity(commodity);
    await logEvent(null, 'matched', 'success', { grower_id, inventory_id, commodity, matched_count: matched.count }, Date.now() - tMatch);

    // 3. Insert pending_template row
    const ins = await pool.query(
      `INSERT INTO pending_templates
       (grower_id, inventory_id, commodity, variety, origin, volume_lbs, price_fob, unit,
        available_from, available_until, subject_line, body_html, body_text, language,
        reasoning_engine, ai_model, matched_buyer_count, matched_buyer_ids, matched_buyer_emails, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'pending_admin')
       RETURNING *`,
      [
        grower_id || null, inventory_id || null, commodity, variety || null, origin || null,
        volume_lbs || null, price_fob || null, unit || 'lb',
        available_from || null, available_until || null,
        letter.subject_line, letter.body_html, letter.body_text, (language || 'EN').toUpperCase(),
        letter.reasoning_engine, letter.ai_model,
        matched.count, matched.ids, matched.emails
      ]
    );
    const template = ins.rows[0];

    // 4. Notify admins (ntfy + email + inventory_alerts row)
    const tNotif = Date.now();
    const deliveries = await notifyAdmins(template);
    await logEvent(template.id, 'notified', 'success', { grower_id, inventory_id, commodity, deliveries }, Date.now() - tNotif);

    return res.json({
      ok: true,
      template_id: template.id,
      status: template.status,
      matched_buyer_count: matched.count,
      reasoning_engine: letter.reasoning_engine,
      elapsed_ms: Date.now() - t0,
      next_step: 'Awaiting admin approval in InventoryAlertCenter'
    });
  } catch (e) {
    await logEvent(null, 'failed', 'failure', { grower_id, inventory_id, commodity, error: e.message }, Date.now() - t0);
    return res.status(500).json({ error: 'Pipeline error', detail: e.message });
  }
});

// =============================================================================
// ADMIN QUEUE - GET pending alerts
// =============================================================================
router.get('/pending-alerts', async (req, res) => {
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });
  const status = String(req.query.status || 'pending_admin').toLowerCase();
  const limit  = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  try {
    const r = await pool.query(
      `SELECT id, grower_id, inventory_id, commodity, variety, origin, volume_lbs, price_fob, unit,
              available_from, available_until, subject_line, language, matched_buyer_count,
              status, scheduled_for, reasoning_engine, regen_count, created_at
       FROM pending_templates
       WHERE status = $1
       ORDER BY created_at ASC
       LIMIT $2`,
      [status, limit]
    );
    res.json({ ok: true, count: r.rows.length, rows: r.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Single template detail (full body)
router.get('/template/:id', async (req, res) => {
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });
  try {
    const r = await pool.query(`SELECT * FROM pending_templates WHERE id = $1`, [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true, template: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Approve + schedule
// Body: { scheduled_for: 'YYYY-MM-DD HH:MM:SS', admin_id?, admin_name? }
router.post('/template/:id/approve', async (req, res) => {
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });
  const { scheduled_for, admin_id, admin_name } = req.body || {};
  if (!scheduled_for) return res.status(400).json({ error: 'scheduled_for is required' });
  const t0 = Date.now();
  try {
    const r = await pool.query(
      `UPDATE pending_templates
       SET status = 'scheduled', scheduled_for = $1, approved_at = NOW(),
           admin_id = $2, admin_name = $3, updated_at = NOW()
       WHERE id = $4 AND status IN ('pending_admin','admin_reviewing')
       RETURNING *`,
      [scheduled_for, admin_id || null, admin_name || null, req.params.id]
    );
    if (r.rows.length === 0) return res.status(409).json({ error: 'Already processed or not found' });
    await logEvent(r.rows[0].id, 'approved', 'success', { admin_id, admin_name, scheduled_for }, Date.now() - t0);
    await logEvent(r.rows[0].id, 'scheduled', 'success', { scheduled_for }, 0);
    res.json({ ok: true, template: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Reject (with reason)
router.post('/template/:id/reject', async (req, res) => {
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });
  const { reason, admin_id, admin_name } = req.body || {};
  try {
    const r = await pool.query(
      `UPDATE pending_templates
       SET status = 'rejected', rejection_reason = $1, admin_id = $2, admin_name = $3, updated_at = NOW()
       WHERE id = $4 AND status IN ('pending_admin','admin_reviewing')
       RETURNING *`,
      [reason || null, admin_id || null, admin_name || null, req.params.id]
    );
    if (r.rows.length === 0) return res.status(409).json({ error: 'Already processed or not found' });
    await logEvent(r.rows[0].id, 'rejected', 'success', { reason, admin_id }, 0);
    res.json({ ok: true, template: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Regenerate AI letter (admin asks for different angle)
// Body: { angle?: 'shorter'|'longer'|'urgent'|'price-focus'|'quality-focus' }
router.post('/template/:id/regenerate-letter', async (req, res) => {
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });
  const { angle, language } = req.body || {};
  try {
    const cur = await pool.query(`SELECT * FROM pending_templates WHERE id = $1`, [req.params.id]);
    if (cur.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const t = cur.rows[0];
    const letter = await generateBuyerLetter({
      commodity: t.commodity, variety: t.variety, origin: t.origin,
      volume_lbs: t.volume_lbs, price_fob: t.price_fob, unit: t.unit,
      available_from: t.available_from, available_until: t.available_until,
      language: language || t.language
    });
    const upd = await pool.query(
      `UPDATE pending_templates
       SET subject_line = $1, body_html = $2, body_text = $3, language = $4,
           reasoning_engine = $5, ai_model = $6, regen_count = regen_count + 1, updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [letter.subject_line, letter.body_html, letter.body_text, language || t.language,
       letter.reasoning_engine, letter.ai_model, req.params.id]
    );
    res.json({ ok: true, template: upd.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Pipeline funnel + recent activity for admin dashboard
router.get('/pipeline-stats', async (req, res) => {
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });
  try {
    const funnel = await pool.query(
      `SELECT * FROM v_niner_pipeline_funnel LIMIT 30`
    );
    const counts = await pool.query(
      `SELECT status, COUNT(*) AS n FROM pending_templates GROUP BY status`
    );
    const recent = await pool.query(
      `SELECT id, commodity, status, matched_buyer_count, created_at, scheduled_for
       FROM pending_templates ORDER BY created_at DESC LIMIT 20`
    );
    res.json({ ok: true, funnel: funnel.rows, status_counts: counts.rows, recent: recent.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Health probe
router.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'niner-bridge', version: '1.0', model: MODEL, anth: !!ANTHROPIC_KEY });
});

// =============================================================================
// LANE 2 - BUYER PULL (Wave 3A)
// Buyer registers a "want" - we generate outreach letter to growers, admin
// approves, blast goes out. Buyer identity stays HIDDEN as
// "Mexausa Food Group sourcing partner" until LOI signed.
// =============================================================================

// Sender identity used in grower-facing letters (Wave 3A.5 - flat Mexausa brand)
const BUYER_PULL_SENDER_NAME = process.env.NINER_BUYER_PULL_SENDER || BRAND_NAME;

async function generateGrowerOutreachLetter({ commodity, variety, pack_spec, grade, volume_lbs, volume_unit, price_target, origin_pref, needed_by, needed_for, recurring, language }) {
  const lang = (language || 'EN').toUpperCase();
  const a = getAnth();
  const fallback = {
    subject_line: `Sourcing request: ${volume_lbs || ''} ${volume_unit || 'lb'} ${commodity} - ready buyer`,
    body_html: `<p>Hi {{first_name}},</p><p>${BUYER_PULL_SENDER_NAME} is sourcing <strong>${commodity}${variety ? ' (' + variety + ')' : ''}</strong> for a confirmed wholesale buyer. Volume needed: ${volume_lbs} ${volume_unit || 'lb'}${needed_by ? ', delivery by ' + needed_by : ''}${price_target ? ', target FOB $' + price_target : ''}.</p><p>Please reply if you can supply this. We will share full buyer details after a brief NDA.</p><p>Best regards,<br/>Saul Garcia<br/>Mexausa Food Group, Inc.</p>`,
    body_text: `Sourcing request: ${volume_lbs} ${volume_unit || 'lb'} ${commodity}. Reply if you can supply.`,
    reasoning_engine: 'AuditDNA Platform Reasoning (Fallback Mode)',
    ai_model: 'fallback'
  };
  if (!a) return fallback;

  const langInstruction = lang === 'ES'
    ? 'Write the ENTIRE letter in formal business Spanish (usted). Greeting must be "Estimado/a {{first_name}}".'
    : lang === 'BI'
    ? 'Write BILINGUAL: full English paragraph then same paragraph in Spanish, alternating. Greeting "Hi {{first_name}}".'
    : 'Write in professional B2B English. Greeting "Hi {{first_name}}".';

  const sys = [
    'You are the AuditDNA Platform letter-generation engine for Mexausa Food Group, Inc.',
    'You are writing a GROWER-facing sourcing-request letter on behalf of a CONFIDENTIAL wholesale buyer.',
    `IDENTITY RULE: NEVER name the buyer. The grower must see only "${BUYER_PULL_SENDER_NAME}" as the requesting party. We reveal buyer identity only after NDA.`,
    'Output STRICT JSON only. No prose outside JSON. No markdown fences.',
    'CRITICAL OUTPUT RULES:',
    '- Do NOT use <cite> tags or any web-search citation markers.',
    '- Do NOT mention "Claude", "Anthropic", "AI", "the model", or attribution to any tool.',
    '- Always use the literal token {{first_name}} for personalization.',
    '- End the body with: <p>Best regards,<br/>Saul Garcia<br/>Mexausa Food Group, Inc.<br/>Ensenada, Baja California</p>',
    'Schema: { "subject_line": "<60 chars>", "body_html": "<HTML>", "body_text": "<plain>" }',
    langInstruction
  ].join('\n');

  const userMsg = [
    `Buyer want details (DO NOT NAME THE BUYER in the letter):`,
    `Commodity: ${commodity}${variety ? ' - ' + variety : ''}`,
    pack_spec ? `Pack: ${pack_spec}` : '',
    grade ? `Grade: ${grade}` : '',
    `Volume needed: ${volume_lbs || 'TBD'} ${volume_unit || 'lb'}`,
    price_target ? `Target FOB price: $${price_target}` : '',
    origin_pref && origin_pref.length ? `Preferred origins: ${origin_pref.join(', ')}` : '',
    needed_by ? `Needed by: ${needed_by}` : '',
    needed_for ? `Use case: ${needed_for}` : '',
    recurring ? 'This is a RECURRING program - emphasize long-term partnership.' : 'This is a SPOT order.',
    '',
    `Write a sourcing-request letter from "${BUYER_PULL_SENDER_NAME}" to growers. Lead with the volume and timing. Mention NDA-gated buyer reveal. Close with clear CTA. 3 short paragraphs.`
  ].filter(Boolean).join('\n');

  try {
    const msg = await a.messages.create({
      model: MODEL, max_tokens: 1500, system: sys,
      messages: [{ role: 'user', content: userMsg }]
    });
    const txt = (msg.content || []).map(b => b.type === 'text' ? b.text : '').join('').trim();
    let parsed = null;
    try { const m = txt.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); } catch (e) {}
    if (!parsed || !parsed.subject_line) return fallback;
    const sanitize = (s) => String(s || '')
      .replace(/<cite[^>]*>([\s\S]*?)<\/cite>/gi, '$1')
      .replace(/<\/?cite[^>]*>/gi, '')
      .replace(/\b(?:claude|anthropic)(?:'s)?\s+(?:web\s+search|reasoning|analysis|model)\b/gi, 'AuditDNA Platform analysis')
      .replace(/\bthe AI\b/gi, 'AuditDNA Platform').replace(/\s{2,}/g, ' ').trim();
    return {
      subject_line: sanitize(parsed.subject_line).slice(0, 120),
      body_html: sanitize(parsed.body_html),
      body_text: sanitize(parsed.body_text),
      reasoning_engine: 'AuditDNA Platform Reasoning',
      ai_model: MODEL
    };
  } catch (e) { return fallback; }
}

async function matchGrowersByCommodity(commodity, originPref) {
  const pool = db();
  if (!pool) return { ids: [], emails: [], count: 0 };
  const cl = String(commodity || '').toLowerCase().trim();
  if (!cl) return { ids: [], emails: [], count: 0 };
  const tries = [
    `SELECT id, email, COALESCE(legal_name, trade_name, company_name, name) AS name, commodities, origin_state
       FROM growers
       WHERE LOWER(COALESCE(commodities,'')) LIKE $1 OR LOWER(COALESCE(notes,'')) LIKE $1
       LIMIT 5000`,
    `SELECT id, email, COALESCE(name, first_name||' '||last_name,'') AS name FROM crm_contacts
       WHERE role IN ('grower','farmer','producer') AND LOWER(COALESCE(commodities, notes,'')) LIKE $1
       LIMIT 5000`
  ];
  const pat = '%' + cl + '%';
  for (const sql of tries) {
    try {
      const r = await pool.query(sql, [pat]);
      if (r && r.rows && r.rows.length > 0) {
        return {
          ids: r.rows.map(x => x.id).filter(Boolean),
          emails: r.rows.map(x => x.email).filter(Boolean),
          names: r.rows.map(x => x.name).filter(Boolean),
          count: r.rows.length
        };
      }
    } catch (e) {}
  }
  return { ids: [], emails: [], names: [], count: 0 };
}

router.post('/buyer-want-registered', async (req, res) => {
  const t0 = Date.now();
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });
  const {
    buyer_id, buyer_name, buyer_email, buyer_company, buyer_type,
    commodity, variety, pack_spec, grade, volume_lbs, volume_unit, price_target,
    origin_pref, needed_by, needed_for, recurring, recurrence_cadence,
    language, legal_consent_at, legal_consent_ip
  } = req.body || {};
  if (!commodity) return res.status(400).json({ error: 'commodity is required' });
  if (!buyer_email) return res.status(400).json({ error: 'buyer_email is required' });
  if (!legal_consent_at) return res.status(400).json({ error: 'legal_consent_at is required (brokerage ToS)' });

  await logEvent(null, 'uploaded', 'success', { lane: 'buyer_pull', buyer_email, commodity }, Date.now() - t0);
  try {
    const tTpl = Date.now();
    const letter = await generateGrowerOutreachLetter({ commodity, variety, pack_spec, grade, volume_lbs, volume_unit, price_target, origin_pref, needed_by, needed_for, recurring, language });
    await logEvent(null, 'templated', 'success', { lane: 'buyer_pull', commodity, ai_model: letter.ai_model }, Date.now() - tTpl);

    const tMatch = Date.now();
    const matched = await matchGrowersByCommodity(commodity, origin_pref);
    await logEvent(null, 'matched', 'success', { lane: 'buyer_pull', commodity, matched_count: matched.count }, Date.now() - tMatch);

    const ins = await pool.query(
      `INSERT INTO buyer_wants
        (buyer_id, buyer_name, buyer_email, buyer_company, buyer_type, commodity, variety, pack_spec, grade,
         volume_lbs, volume_unit, price_target, origin_pref, needed_by, needed_for, recurring, recurrence_cadence,
         identity_visible, legal_consent_at, legal_consent_ip,
         subject_line, body_html, body_text, language, reasoning_engine, ai_model,
         matched_grower_count, matched_grower_ids, matched_grower_emails, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,FALSE,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,'pending_admin')
       RETURNING *`,
      [
        buyer_id || null, buyer_name || null, buyer_email, buyer_company || null, buyer_type || null,
        commodity, variety || null, pack_spec || null, grade || null,
        volume_lbs || null, volume_unit || 'lb', price_target || null,
        origin_pref || null, needed_by || null, needed_for || null, !!recurring, recurrence_cadence || null,
        legal_consent_at, legal_consent_ip || null,
        letter.subject_line, letter.body_html, letter.body_text, (language || 'EN').toUpperCase(),
        letter.reasoning_engine, letter.ai_model,
        matched.count, matched.ids, matched.emails
      ]
    );
    const want = ins.rows[0];

    // Notify admins (same Pablo/Saul/Osvaldo trio for Lane 2 too)
    const tNotif = Date.now();
    try {
      const headers = { 'Content-Type': 'text/plain', 'Title': `[BUYER WANT] ${commodity} ${volume_lbs || ''} ${volume_unit || 'lb'} - ${matched.count} growers matched`, 'Priority': '4', 'Tags': 'package,handshake' };
      if (NTFY_TOKEN) headers['Authorization'] = 'Bearer ' + NTFY_TOKEN;
      const msg = `Buyer: ${buyer_company || buyer_email}\nWants: ${commodity}${variety ? ' (' + variety + ')' : ''}\nVolume: ${volume_lbs} ${volume_unit || 'lb'}\nNeeded by: ${needed_by || 'TBD'}\nGrowers matched: ${matched.count}\n\nOpen InventoryAlertCenter -> Buyer Wants tab to review.`;
      await fetch(`${NTFY_BASE}/${NTFY_TOPIC}`, { method: 'POST', headers, body: msg }).catch(() => {});
      for (const r of ADMIN_RECIPIENTS) {
        await pool.query(
          `INSERT INTO inventory_alerts (template_id, recipient_email, recipient_name, recipient_role, delivery_channel, delivered_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [null, r.email, r.name, r.role, 'ntfy+email-buyer-want']
        ).catch(() => {});
      }
    } catch (e) {}
    await logEvent(null, 'notified', 'success', { lane: 'buyer_pull', want_id: want.id }, Date.now() - tNotif);

    return res.json({
      ok: true, lane: 'buyer_pull',
      want_id: want.id, status: want.status,
      matched_grower_count: matched.count,
      reasoning_engine: letter.reasoning_engine,
      elapsed_ms: Date.now() - t0,
      next_step: 'Awaiting admin approval - identity hidden until NDA'
    });
  } catch (e) {
    await logEvent(null, 'failed', 'failure', { lane: 'buyer_pull', error: e.message }, Date.now() - t0);
    return res.status(500).json({ error: 'Pipeline error', detail: e.message });
  }
});

router.get('/buyer-wants', async (req, res) => {
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });
  const status = String(req.query.status || 'pending_admin').toLowerCase();
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  try {
    const r = await pool.query(
      `SELECT id, buyer_company, buyer_email, commodity, variety, volume_lbs, volume_unit, price_target,
              needed_by, needed_for, matched_grower_count, status, language, scheduled_for, created_at
       FROM buyer_wants WHERE status = $1 ORDER BY created_at ASC LIMIT $2`,
      [status, limit]
    );
    res.json({ ok: true, count: r.rows.length, rows: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/buyer-want/:id', async (req, res) => {
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });
  try {
    const r = await pool.query(`SELECT * FROM buyer_wants WHERE id = $1`, [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true, want: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/buyer-want/:id/approve', async (req, res) => {
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });
  const { scheduled_for, admin_id, admin_name } = req.body || {};
  if (!scheduled_for) return res.status(400).json({ error: 'scheduled_for is required' });
  try {
    const r = await pool.query(
      `UPDATE buyer_wants
        SET status='scheduled', scheduled_for=$1, approved_at=NOW(), admin_id=$2, admin_name=$3, updated_at=NOW()
        WHERE id=$4 AND status IN ('pending_admin','admin_reviewing') RETURNING *`,
      [scheduled_for, admin_id || null, admin_name || null, req.params.id]
    );
    if (r.rows.length === 0) return res.status(409).json({ error: 'Already processed or not found' });
    res.json({ ok: true, want: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/buyer-want/:id/reject', async (req, res) => {
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });
  const { reason, admin_id, admin_name } = req.body || {};
  try {
    const r = await pool.query(
      `UPDATE buyer_wants SET status='cancelled', notes=$1, admin_id=$2, admin_name=$3, updated_at=NOW()
        WHERE id=$4 AND status IN ('pending_admin','admin_reviewing') RETURNING *`,
      [reason || null, admin_id || null, admin_name || null, req.params.id]
    );
    if (r.rows.length === 0) return res.status(409).json({ error: 'Already processed or not found' });
    res.json({ ok: true, want: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// =============================================================================
// LANE 3 - DISTRESS / OPEN MARKET (Wave 3A)
// Autonomous fast-lane. Light gate (5-point quality checklist) - no admin.
// Photo URLs + GPS + final FOB price required. <60s target.
// =============================================================================

const LANE3_REQUIRE_ADMIN = (process.env.NINER_LANE3_REQUIRE_ADMIN || 'false').toLowerCase() === 'true'; // default false
const LANE3_MIN_PHOTOS = parseInt(process.env.NINER_LANE3_MIN_PHOTOS, 10) || 1;
const LANE3_BLAST_LIMIT = parseInt(process.env.NINER_LANE3_BLAST_LIMIT, 10) || 25; // top 25

async function generateDistressLetter({ commodity, variety, volume_lbs, unit, price_fob, fob_location, available_until, photo_urls, gps_lat, gps_lng, language }) {
  const lang = (language || 'EN').toUpperCase();
  const a = getAnth();
  const ttl = available_until ? `Available until: ${available_until}` : 'Move ASAP';
  const photoLine = photo_urls && photo_urls.length ? `Field photos: ${photo_urls.length} attached.` : '';
  const gpsLine = (gps_lat && gps_lng) ? `Field GPS: ${gps_lat.toFixed(4)}, ${gps_lng.toFixed(4)}` : '';

  const fallback = {
    subject_line: `[DISTRESS] ${volume_lbs} ${unit || 'lb'} ${commodity} ready - ${fob_location} - $${price_fob} FOB FINAL`,
    body_html: `<p>Hi {{first_name}},</p><p>We have <strong>${volume_lbs} ${unit || 'lb'} ${commodity}${variety ? ' (' + variety + ')' : ''}</strong> ready to move from <strong>${fob_location}</strong>. Final FOB: <strong>$${price_fob}/${unit || 'lb'}</strong>. Non-negotiable. ${ttl}.</p><p>${photoLine} ${gpsLine}</p><p>If you can move this load, reply NOW or call. First confirmed truck wins.</p><p>Best,<br/>Saul Garcia<br/>Mexausa Food Group, Inc.</p>`,
    body_text: `[DISTRESS] ${volume_lbs} ${unit} ${commodity} - ${fob_location} - $${price_fob} FOB FINAL. Reply if you can move.`,
    reasoning_engine: 'AuditDNA Platform Reasoning (Fallback Mode)',
    ai_model: 'fallback'
  };
  if (!a) return fallback;

  const sys = [
    'You are the AuditDNA Platform letter-generation engine for Mexausa Food Group, Inc.',
    'You are writing a DISTRESS / SPOT-MARKET letter for a load that needs to MOVE FAST.',
    'Tone: urgent, professional, no-fluff. Short sentences. First confirmed wins.',
    'Output STRICT JSON only. No prose outside JSON. No markdown fences.',
    'CRITICAL OUTPUT RULES:',
    '- Do NOT use <cite> tags or any web-search citation markers.',
    '- Do NOT mention "Claude", "Anthropic", "AI", "the model".',
    '- Always use the literal token {{first_name}}.',
    '- Subject line MUST start with "[DISTRESS]"',
    '- Mention price is FINAL and non-negotiable.',
    '- End with: <p>Best,<br/>Saul Garcia<br/>Mexausa Food Group, Inc.</p>',
    'Schema: { "subject_line": "<60 chars>", "body_html": "<HTML>", "body_text": "<plain>" }',
    lang === 'ES' ? 'Write entirely in formal Spanish (usted).' : 'Write in English.'
  ].join('\n');

  const userMsg = [
    `Distress upload:`,
    `Commodity: ${commodity}${variety ? ' - ' + variety : ''}`,
    `Volume: ${volume_lbs} ${unit || 'lb'}`,
    `FOB price (FINAL): $${price_fob} per ${unit || 'lb'}`,
    `FOB location: ${fob_location}`,
    available_until ? `Available until: ${available_until}` : 'Move ASAP',
    photo_urls && photo_urls.length ? `Photos available: ${photo_urls.length}` : '',
    (gps_lat && gps_lng) ? `GPS: ${gps_lat}, ${gps_lng}` : '',
    '',
    'Write a tight 2-paragraph distress letter. First confirmed truck wins.'
  ].filter(Boolean).join('\n');

  try {
    const msg = await a.messages.create({ model: MODEL, max_tokens: 1000, system: sys, messages: [{ role: 'user', content: userMsg }] });
    const txt = (msg.content || []).map(b => b.type === 'text' ? b.text : '').join('').trim();
    let parsed = null;
    try { const m = txt.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); } catch (e) {}
    if (!parsed || !parsed.subject_line) return fallback;
    const sanitize = (s) => String(s || '').replace(/<cite[^>]*>([\s\S]*?)<\/cite>/gi, '$1').replace(/<\/?cite[^>]*>/gi, '').replace(/\b(?:claude|anthropic)(?:'s)?\s+\w+/gi, 'AuditDNA Platform').replace(/\s{2,}/g, ' ').trim();
    return {
      subject_line: sanitize(parsed.subject_line).slice(0, 120),
      body_html: sanitize(parsed.body_html),
      body_text: sanitize(parsed.body_text),
      reasoning_engine: 'AuditDNA Platform Reasoning',
      ai_model: MODEL
    };
  } catch (e) { return fallback; }
}

// =============================================================================
// COMMODITY NORMALIZER (Wave 3A.5)
// "Iceberg Lettuce" -> "leafy_greens" via commodity_aliases lookup
// =============================================================================
async function normalizeCommodity(rawName) {
  const pool = db();
  if (!pool) return { category: null, raw: rawName };
  const lc = String(rawName || '').toLowerCase().trim();
  if (!lc) return { category: null, raw: rawName };
  try {
    // Try exact alias match
    const r = await pool.query(`SELECT category FROM commodity_aliases WHERE LOWER(alias) = $1 LIMIT 1`, [lc]);
    if (r.rows.length > 0) return { category: r.rows[0].category, raw: rawName };
    // Try LIKE match (e.g. "premium iceberg lettuce field pack" -> "iceberg lettuce")
    const r2 = await pool.query(
      `SELECT category, alias FROM commodity_aliases WHERE $1 LIKE '%' || LOWER(alias) || '%' ORDER BY LENGTH(alias) DESC LIMIT 1`,
      [lc]
    );
    if (r2.rows.length > 0) return { category: r2.rows[0].category, raw: rawName, matched_alias: r2.rows[0].alias };
    // Fallback: snake_case the raw input as a guess
    return { category: lc.replace(/\s+/g, '_'), raw: rawName, fallback: true };
  } catch (e) {
    return { category: lc.replace(/\s+/g, '_'), raw: rawName, error: e.message };
  }
}

// =============================================================================
// TIERED MATCH - returns { tier1: [], tier2: [], tier3: [] }
// =============================================================================
async function matchDistressBuyersTiered(commodity) {
  const pool = db();
  if (!pool) return { tier1: [], tier2: [], tier3: [], category: null };
  const norm = await normalizeCommodity(commodity);
  const cat = norm.category;
  const tiers = { tier1: [], tier2: [], tier3: [], category: cat, normalizer: norm };
  if (!cat) return tiers;
  try {
    const r = await pool.query(
      `SELECT id, email, buyer_name, contact_name, region, tier, priority_rank
       FROM distress_buyers_top25
       WHERE is_active = TRUE AND unsubscribed_at IS NULL
         AND ( $1 = ANY(commodities_accepted)
            OR EXISTS (SELECT 1 FROM unnest(commodities_accepted) c WHERE LOWER(c) = $1)
            OR EXISTS (SELECT 1 FROM unnest(commodities_accepted) c WHERE LOWER(c) LIKE '%' || $1 || '%') )
       ORDER BY tier ASC, priority_rank ASC, closes_count DESC
       LIMIT 50`,
      [cat]
    );
    for (const row of r.rows) {
      const t = row.tier || 2;
      if (t === 1) tiers.tier1.push(row);
      else if (t === 2) tiers.tier2.push(row);
      else tiers.tier3.push(row);
    }
  } catch (e) { tiers.error = e.message; }
  return tiers;
}

// =============================================================================
// SCHEDULED CASCADE FIRER (used by setTimeout)
// =============================================================================
async function fireCascadeTier(uploadId, tierNum, recipients) {
  const pool = db();
  if (!pool || !recipients || recipients.length === 0) return;
  const t0 = Date.now();
  const emails = recipients.map(r => r.email).filter(Boolean);
  if (emails.length === 0) return;
  const colTime = `tier${tierNum}_fired_at`;
  const colRecips = `tier${tierNum}_recipients`;
  try {
    // Check upload still active (not sold/cancelled by Mexausa accept)
    const cur = await pool.query(`SELECT status FROM distress_uploads WHERE id = $1`, [uploadId]);
    if (cur.rows.length === 0) return;
    if (cur.rows[0].status === 'sold' || cur.rows[0].status === 'cancelled') return; // Mexausa took it OR cancelled
    await pool.query(
      `UPDATE distress_uploads SET ${colTime} = NOW(), ${colRecips} = $1, updated_at = NOW() WHERE id = $2`,
      [emails, uploadId]
    );
    // ntfy push: tier fired
    try {
      const headers = { 'Content-Type': 'text/plain', 'Title': `[DISTRESS TIER ${tierNum}] fired to ${emails.length}`, 'Priority': '4', 'Tags': 'truck' };
      if (NTFY_TOKEN) headers['Authorization'] = 'Bearer ' + NTFY_TOKEN;
      await fetch(`${NTFY_BASE}/${NTFY_TOPIC}`, { method: 'POST', headers, body: `Tier ${tierNum} fired:\n${emails.join('\n')}` }).catch(() => {});
    } catch (e) {}
    await logEvent(uploadId, 'sent', 'success', { lane: 'distress', tier: tierNum, recipients: emails.length, ms: Date.now() - t0 }, Date.now() - t0);
  } catch (e) { /* swallow */ }
}

// =============================================================================
// LANE 3 - DISTRESS UPLOAD (Wave 3A.5 with first-offer + tiered cascade)
// =============================================================================
router.post('/distress-upload', async (req, res) => {
  const t0 = Date.now();
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });
  const {
    grower_id, grower_name, grower_email, grower_phone,
    commodity, variety, volume_lbs, unit, price_fob, fob_location,
    photo_urls, gps_lat, gps_lng, gps_accuracy_m,
    q_temp_ok, q_pack_ok, q_consumable, q_no_recall, q_chain_ready,
    available_until, language,
    mexausa_first_offer  // boolean - default true
  } = req.body || {};

  // ----- Quality gate -----
  if (!commodity) return res.status(400).json({ error: 'commodity is required' });
  if (!price_fob) return res.status(400).json({ error: 'price_fob is required (FINAL price)' });
  if (!fob_location) return res.status(400).json({ error: 'fob_location is required' });
  if (!photo_urls || !Array.isArray(photo_urls) || photo_urls.length < LANE3_MIN_PHOTOS) {
    return res.status(400).json({ error: `At least ${LANE3_MIN_PHOTOS} photo URL(s) required` });
  }
  if (gps_lat == null || gps_lng == null) return res.status(400).json({ error: 'gps_lat and gps_lng are required' });
  const allChecks = !!q_temp_ok && !!q_pack_ok && !!q_consumable && !!q_no_recall && !!q_chain_ready;
  if (!allChecks) {
    try {
      await pool.query(
        `INSERT INTO distress_uploads (grower_id, grower_name, grower_email, commodity, variety, volume_lbs, unit, price_fob, fob_location,
           photo_urls, gps_lat, gps_lng, gps_accuracy_m, q_temp_ok, q_pack_ok, q_consumable, q_no_recall, q_chain_ready,
           available_until, status, fail_reason)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'quality_failed',$20)`,
        [grower_id || null, grower_name || null, grower_email || null, commodity, variety || null, volume_lbs || null, unit || 'lb', price_fob, fob_location,
         photo_urls, gps_lat, gps_lng, gps_accuracy_m || null, !!q_temp_ok, !!q_pack_ok, !!q_consumable, !!q_no_recall, !!q_chain_ready,
         available_until || null, 'One or more quality checks failed - all 5 must be TRUE']
      );
    } catch (e) {}
    await logEvent(null, 'failed', 'quality_failed', { lane: 'distress', commodity }, Date.now() - t0);
    return res.status(400).json({ error: 'Quality gate failed - all 5 checklist items must be TRUE', checks: { q_temp_ok: !!q_temp_ok, q_pack_ok: !!q_pack_ok, q_consumable: !!q_consumable, q_no_recall: !!q_no_recall, q_chain_ready: !!q_chain_ready } });
  }

  await logEvent(null, 'uploaded', 'success', { lane: 'distress', commodity }, Date.now() - t0);

  try {
    const useFirstOffer = mexausa_first_offer !== false; // default TRUE
    const totalValueUSD = (volume_lbs || 0) * (price_fob || 0);

    // Generate letter + tier matches in parallel
    const tTpl = Date.now();
    const [letter, tiered] = await Promise.all([
      generateDistressLetter({ commodity, variety, volume_lbs, unit, price_fob, fob_location, available_until, photo_urls, gps_lat, gps_lng, language }),
      matchDistressBuyersTiered(commodity)
    ]);
    const tier1 = tiered.tier1 || []; const tier2 = tiered.tier2 || []; const tier3 = tiered.tier3 || [];
    const allMatched = [...tier1, ...tier2, ...tier3];
    await logEvent(null, 'templated', 'success', { lane: 'distress', commodity, ai_model: letter.ai_model }, Date.now() - tTpl);
    await logEvent(null, 'matched', 'success', { lane: 'distress', commodity, normalizer: tiered.normalizer, t1: tier1.length, t2: tier2.length, t3: tier3.length }, 0);

    // Insert upload row (status depends on first-offer flag)
    const initialStatus = useFirstOffer ? 'received' : 'blasted';
    const ins = await pool.query(
      `INSERT INTO distress_uploads
        (grower_id, grower_name, grower_email, grower_phone,
         commodity, variety, volume_lbs, unit, price_fob, fob_location,
         photo_urls, gps_lat, gps_lng, gps_accuracy_m,
         q_temp_ok, q_pack_ok, q_consumable, q_no_recall, q_chain_ready,
         available_until, language, ai_model, reasoning_engine, subject_line, body_html, body_text,
         matched_buyer_count, matched_buyer_ids, status, mexausa_first_offer)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,TRUE,TRUE,TRUE,TRUE,TRUE,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
       RETURNING *`,
      [grower_id || null, grower_name || null, grower_email || null, grower_phone || null,
       commodity, variety || null, volume_lbs || null, unit || 'lb', price_fob, fob_location,
       photo_urls, gps_lat, gps_lng, gps_accuracy_m || null,
       available_until || null, (language || 'EN').toUpperCase(), letter.ai_model, letter.reasoning_engine,
       letter.subject_line, letter.body_html, letter.body_text,
       allMatched.length, allMatched.map(m => m.id), initialStatus, !!useFirstOffer]
    );
    const upload = ins.rows[0];

    // Persist match history
    try {
      await pool.query(
        `INSERT INTO match_history (lane, source_id, matched_count, matched_ids, matched_emails, meta)
         VALUES ('distress', $1, $2, $3, $4, $5)`,
        [upload.id, allMatched.length, allMatched.map(m => m.id), allMatched.map(m => m.email),
         { commodity, normalizer: tiered.normalizer, tier1_count: tier1.length, tier2_count: tier2.length, tier3_count: tier3.length, total_value_usd: totalValueUSD }]
      );
    } catch (e) {}

    if (useFirstOffer) {
      // ===== MEXAUSA FIRST OFFER FLOW =====
      const expires = new Date(Date.now() + MEXAUSA_OFFER_MIN * 60 * 1000);
      const offerIns = await pool.query(
        `INSERT INTO mexausa_internal_offers
          (upload_id, commodity, variety, volume_lbs, unit, price_fob, fob_location, total_value_usd,
           grower_id, grower_name, grower_phone, grower_email,
           expires_at, window_minutes, notified_admins, notified_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())
         RETURNING *`,
        [upload.id, commodity, variety || null, volume_lbs || null, unit || 'lb', price_fob, fob_location, totalValueUSD,
         grower_id || null, grower_name || null, grower_phone || null, grower_email || null,
         expires, MEXAUSA_OFFER_MIN, ADMIN_RECIPIENTS.map(r => r.email)]
      );
      const offer = offerIns.rows[0];
      await pool.query(`UPDATE distress_uploads SET mexausa_offer_id = $1 WHERE id = $2`, [offer.id, upload.id]);

      // ntfy push - URGENT decision required
      try {
        const headers = { 'Content-Type': 'text/plain', 'Title': `[BUY DIRECT? ${MEXAUSA_OFFER_MIN}MIN] ${commodity} ${volume_lbs} ${unit || 'lb'} $${(totalValueUSD).toFixed(0)}`, 'Priority': '5', 'Tags': 'rotating_light,handshake,clock' };
        if (NTFY_TOKEN) headers['Authorization'] = 'Bearer ' + NTFY_TOKEN;
        const msg = [
          `MEXAUSA FIRST OFFER - ${MEXAUSA_OFFER_MIN} MIN TO DECIDE`,
          ``,
          `${commodity}${variety ? ' (' + variety + ')' : ''}`,
          `Volume: ${volume_lbs} ${unit || 'lb'}`,
          `FOB: $${price_fob} ${fob_location}`,
          `TOTAL VALUE: $${totalValueUSD.toFixed(2)}`,
          `Grower: ${grower_name || grower_email || 'unknown'}`,
          `Expires: ${expires.toISOString()}`,
          ``,
          `Open MexausaInternalOfferDesk to ACCEPT or DECLINE.`,
          `If no decision: cascade fires automatically.`,
          ``,
          `Tier 1 ready: ${tier1.length} | Tier 2: ${tier2.length} | Tier 3: ${tier3.length}`
        ].join('\n');
        await fetch(`${NTFY_BASE}/${NTFY_TOPIC}`, { method: 'POST', headers, body: msg }).catch(() => {});
      } catch (e) {}

      // Schedule the cascade timers (will check status before firing)
      // T+15min (window_minutes): if still pending, expire offer + fire Tier 1
      setTimeout(async () => {
        try {
          const cur = await pool.query(`SELECT status FROM mexausa_internal_offers WHERE id = $1`, [offer.id]);
          if (cur.rows.length === 0 || cur.rows[0].status !== 'pending') return; // already decided
          await pool.query(`UPDATE mexausa_internal_offers SET status = 'expired', updated_at = NOW() WHERE id = $1`, [offer.id]);
          await pool.query(`UPDATE distress_uploads SET status = 'blasted', blast_fired_at = NOW(), blast_fired_to = $1 WHERE id = $2`, [allMatched.map(m => m.email), upload.id]);
          await fireCascadeTier(upload.id, 1, tier1);
        } catch (e) {}
      }, MEXAUSA_OFFER_MIN * 60 * 1000);

      // Tier 2 (T+15+5)
      setTimeout(() => fireCascadeTier(upload.id, 2, tier2), (MEXAUSA_OFFER_MIN + TIER2_DELAY_MIN) * 60 * 1000);
      // Tier 3 (T+15+15)
      setTimeout(() => fireCascadeTier(upload.id, 3, tier3), (MEXAUSA_OFFER_MIN + TIER3_DELAY_MIN) * 60 * 1000);

      return res.json({
        ok: true, lane: 'distress',
        upload_id: upload.id, status: 'received_mexausa_offer',
        mexausa_offer: { id: offer.id, expires_at: expires.toISOString(), window_minutes: MEXAUSA_OFFER_MIN, total_value_usd: totalValueUSD },
        tier_preview: { tier1: tier1.length, tier2: tier2.length, tier3: tier3.length },
        commodity_normalizer: tiered.normalizer,
        reasoning_engine: letter.reasoning_engine,
        elapsed_ms: Date.now() - t0,
        next_step: `Mexausa Food Group has ${MEXAUSA_OFFER_MIN} min to BUY DIRECT. If declined or expired, cascade fires Tier 1 -> Tier 2 (+${TIER2_DELAY_MIN}min) -> Tier 3 (+${TIER3_DELAY_MIN}min).`
      });
    } else {
      // ===== NO FIRST OFFER - CASCADE FIRES IMMEDIATELY =====
      await pool.query(`UPDATE distress_uploads SET status = 'blasted', blast_fired_at = NOW(), blast_fired_to = $1 WHERE id = $2`, [allMatched.map(m => m.email), upload.id]);
      await fireCascadeTier(upload.id, 1, tier1);
      setTimeout(() => fireCascadeTier(upload.id, 2, tier2), TIER2_DELAY_MIN * 60 * 1000);
      setTimeout(() => fireCascadeTier(upload.id, 3, tier3), TIER3_DELAY_MIN * 60 * 1000);

      try {
        const headers = { 'Content-Type': 'text/plain', 'Title': `[DISTRESS BLASTED] ${commodity} ${volume_lbs} ${unit || 'lb'} - tier 1 (${tier1.length}) firing now`, 'Priority': '4', 'Tags': 'truck' };
        if (NTFY_TOKEN) headers['Authorization'] = 'Bearer ' + NTFY_TOKEN;
        await fetch(`${NTFY_BASE}/${NTFY_TOPIC}`, { method: 'POST', headers, body: `Cascade firing.\nT1: ${tier1.length}\nT2: ${tier2.length} (T+${TIER2_DELAY_MIN}m)\nT3: ${tier3.length} (T+${TIER3_DELAY_MIN}m)` }).catch(() => {});
      } catch (e) {}

      return res.json({
        ok: true, lane: 'distress',
        upload_id: upload.id, status: 'blasted',
        tier_preview: { tier1: tier1.length, tier2: tier2.length, tier3: tier3.length },
        commodity_normalizer: tiered.normalizer,
        matched_buyer_count: allMatched.length,
        reasoning_engine: letter.reasoning_engine,
        elapsed_ms: Date.now() - t0,
        next_step: `Cascade firing: Tier 1 immediate, Tier 2 +${TIER2_DELAY_MIN}min, Tier 3 +${TIER3_DELAY_MIN}min`
      });
    }
  } catch (e) {
    await logEvent(null, 'failed', 'failure', { lane: 'distress', error: e.message }, Date.now() - t0);
    return res.status(500).json({ error: 'Pipeline error', detail: e.message });
  }
});

// =============================================================================
// MEXAUSA INTERNAL OFFER - admin decision endpoints (Wave 3A.5)
// =============================================================================
router.get('/internal-offers', async (req, res) => {
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });
  try {
    const r = await pool.query(`SELECT * FROM v_internal_offer_queue LIMIT 50`);
    res.json({ ok: true, count: r.rows.length, rows: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/internal-offer/:id', async (req, res) => {
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });
  try {
    const r = await pool.query(
      `SELECT mio.*, du.photo_urls, du.gps_lat, du.gps_lng, du.subject_line, du.body_html
       FROM mexausa_internal_offers mio
       LEFT JOIN distress_uploads du ON du.id = mio.upload_id
       WHERE mio.id = $1`, [req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true, offer: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/internal-offer/:id/accept', async (req, res) => {
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });
  const { decided_by, decided_by_name, internal_truck_id, internal_route, internal_target_buyer, decision_notes } = req.body || {};
  try {
    const r = await pool.query(
      `UPDATE mexausa_internal_offers
        SET status='accepted', decided_at=NOW(), decided_by=$1, decided_by_name=$2,
            internal_truck_id=$3, internal_route=$4, internal_target_buyer=$5, decision_notes=$6, updated_at=NOW()
        WHERE id=$7 AND status='pending' RETURNING *`,
      [decided_by || null, decided_by_name || null, internal_truck_id || null, internal_route || null, internal_target_buyer || null, decision_notes || null, req.params.id]
    );
    if (r.rows.length === 0) return res.status(409).json({ error: 'Already decided or expired' });
    const offer = r.rows[0];
    // Mark distress_upload as sold (cancels all queued cascade tiers)
    await pool.query(
      `UPDATE distress_uploads
        SET status='sold', closed_at=NOW(), closed_buyer_id=NULL,
            closed_volume_lbs=$1, closed_price_fob=$2, updated_at=NOW()
        WHERE id=$3`,
      [offer.volume_lbs, offer.price_fob, offer.upload_id]
    );
    await logEvent(offer.upload_id, 'sold', 'success', { lane: 'distress', via: 'mexausa_first_offer', value_usd: offer.total_value_usd, decided_by_name }, 0);
    // ntfy: deal closed
    try {
      const headers = { 'Content-Type': 'text/plain', 'Title': `[MEXAUSA BOUGHT] ${offer.commodity} ${offer.volume_lbs} ${offer.unit || 'lb'} = $${Number(offer.total_value_usd).toFixed(0)}`, 'Priority': '4', 'Tags': 'handshake,money' };
      if (NTFY_TOKEN) headers['Authorization'] = 'Bearer ' + NTFY_TOKEN;
      await fetch(`${NTFY_BASE}/${NTFY_TOPIC}`, { method: 'POST', headers, body: `Mexausa bought direct.\nDecided by: ${decided_by_name || 'admin'}\nTruck: ${internal_truck_id || 'TBD'}\nRoute: ${internal_route || 'TBD'}\nCascade cancelled.` }).catch(() => {});
    } catch (e) {}
    res.json({ ok: true, offer, message: 'Accepted - cascade cancelled, internal logistics ticket opened' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/internal-offer/:id/decline', async (req, res) => {
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });
  const { decided_by, decided_by_name, decision_notes } = req.body || {};
  try {
    const r = await pool.query(
      `UPDATE mexausa_internal_offers
        SET status='declined', decided_at=NOW(), decided_by=$1, decided_by_name=$2, decision_notes=$3, updated_at=NOW()
        WHERE id=$4 AND status='pending' RETURNING *`,
      [decided_by || null, decided_by_name || null, decision_notes || null, req.params.id]
    );
    if (r.rows.length === 0) return res.status(409).json({ error: 'Already decided or expired' });
    const offer = r.rows[0];
    // Fire Tier 1 immediately (Tier 2 + Tier 3 timers were already scheduled at upload time)
    await pool.query(`UPDATE distress_uploads SET status = 'blasted', blast_fired_at = NOW() WHERE id = $1`, [offer.upload_id]);
    // Look up tier 1 buyers and fire
    const tieredNow = await matchDistressBuyersTiered(offer.commodity);
    await fireCascadeTier(offer.upload_id, 1, tieredNow.tier1 || []);
    res.json({ ok: true, offer, message: 'Declined - cascade Tier 1 fired immediately, Tier 2/3 will follow on schedule' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Cascade status (admin debug + UI)
router.get('/cascade/:uploadId', async (req, res) => {
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });
  try {
    const r = await pool.query(`SELECT * FROM v_distress_cascade_status WHERE upload_id = $1`, [req.params.uploadId]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true, cascade: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Top-25 registry CRUD
router.get('/top25', async (req, res) => {
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });
  try {
    const r = await pool.query(`SELECT * FROM v_distress_active_buyers LIMIT 200`);
    res.json({ ok: true, count: r.rows.length, rows: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/top25', async (req, res) => {
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });
  const { buyer_name, contact_name, email, phone, whatsapp, buyer_type, region, commodities_accepted, min_load_size_lbs, notes, added_by } = req.body || {};
  if (!buyer_name || !email) return res.status(400).json({ error: 'buyer_name and email are required' });
  try {
    const r = await pool.query(
      `INSERT INTO distress_buyers_top25 (buyer_name, contact_name, email, phone, whatsapp, buyer_type, region, commodities_accepted, min_load_size_lbs, notes, added_by, is_seed)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,FALSE) RETURNING *`,
      [buyer_name, contact_name || null, email, phone || null, whatsapp || null, buyer_type || null, region || null, commodities_accepted || [], min_load_size_lbs || null, notes || null, added_by || null]
    );
    res.json({ ok: true, buyer: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/top25/:id', async (req, res) => {
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });
  try {
    await pool.query(`UPDATE distress_buyers_top25 SET is_active = FALSE WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Lane summary (for Tri-Lane dashboard)
router.get('/lanes/summary', async (req, res) => {
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });
  try {
    const r = await pool.query(`SELECT * FROM v_lane_summary`);
    res.json({ ok: true, lanes: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
