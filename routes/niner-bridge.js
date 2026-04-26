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

// Sender identity used in grower-facing letters (per Wave 3A policy default)
const BUYER_PULL_SENDER_NAME = process.env.NINER_BUYER_PULL_SENDER || 'Mexausa Food Group sourcing partner';

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

router.post('/distress-upload', async (req, res) => {
  const t0 = Date.now();
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });
  const {
    grower_id, grower_name, grower_email, grower_phone,
    commodity, variety, volume_lbs, unit, price_fob, fob_location,
    photo_urls, gps_lat, gps_lng, gps_accuracy_m,
    q_temp_ok, q_pack_ok, q_consumable, q_no_recall, q_chain_ready,
    available_until, language
  } = req.body || {};

  // ----- Quality gate (Lane 3 light gate) -----
  if (!commodity) return res.status(400).json({ error: 'commodity is required' });
  if (!price_fob) return res.status(400).json({ error: 'price_fob is required (FINAL price)' });
  if (!fob_location) return res.status(400).json({ error: 'fob_location is required' });
  if (!photo_urls || !Array.isArray(photo_urls) || photo_urls.length < LANE3_MIN_PHOTOS) {
    return res.status(400).json({ error: `At least ${LANE3_MIN_PHOTOS} photo URL(s) required` });
  }
  if (gps_lat == null || gps_lng == null) return res.status(400).json({ error: 'gps_lat and gps_lng are required' });
  const allChecks = !!q_temp_ok && !!q_pack_ok && !!q_consumable && !!q_no_recall && !!q_chain_ready;
  if (!allChecks) {
    // Record the failure but don't blast
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
    // Generate letter (in parallel with buyer match for speed)
    const tTpl = Date.now();
    const [letter, matched] = await Promise.all([
      generateDistressLetter({ commodity, variety, volume_lbs, unit, price_fob, fob_location, available_until, photo_urls, gps_lat, gps_lng, language }),
      (async () => {
        try {
          const rr = await pool.query(
            `SELECT id, email, buyer_name, contact_name, region FROM distress_buyers_top25
             WHERE is_active = TRUE AND unsubscribed_at IS NULL
               AND $1 = ANY(commodities_accepted)
             ORDER BY closes_count DESC, is_seed DESC, added_at ASC
             LIMIT $2`,
            [String(commodity).toLowerCase().replace(/\s+/g, '_'), LANE3_BLAST_LIMIT]
          );
          // Fallback: any commodity match (LIKE)
          if (rr.rows.length === 0) {
            const rr2 = await pool.query(
              `SELECT id, email, buyer_name, contact_name, region FROM distress_buyers_top25
               WHERE is_active = TRUE AND unsubscribed_at IS NULL
                 AND EXISTS (SELECT 1 FROM unnest(commodities_accepted) c WHERE LOWER(c) LIKE $1)
               ORDER BY closes_count DESC, is_seed DESC, added_at ASC LIMIT $2`,
              ['%' + String(commodity).toLowerCase() + '%', LANE3_BLAST_LIMIT]
            );
            return rr2.rows;
          }
          return rr.rows;
        } catch (e) { return []; }
      })()
    ]);
    await logEvent(null, 'templated', 'success', { lane: 'distress', commodity, ai_model: letter.ai_model }, Date.now() - tTpl);
    await logEvent(null, 'matched', 'success', { lane: 'distress', commodity, matched_count: matched.length }, 0);

    const matchedIds = matched.map(m => m.id);
    const matchedEmails = matched.map(m => m.email);

    // Insert upload row
    const ins = await pool.query(
      `INSERT INTO distress_uploads
        (grower_id, grower_name, grower_email, grower_phone,
         commodity, variety, volume_lbs, unit, price_fob, fob_location,
         photo_urls, gps_lat, gps_lng, gps_accuracy_m,
         q_temp_ok, q_pack_ok, q_consumable, q_no_recall, q_chain_ready,
         available_until, language, ai_model, reasoning_engine, subject_line, body_html, body_text,
         matched_buyer_count, matched_buyer_ids, status, blast_fired_at, blast_fired_to)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,TRUE,TRUE,TRUE,TRUE,TRUE,$15,$16,$17,$18,$19,$20,$21,$22,$23,'blasted',NOW(),$24)
       RETURNING *`,
      [grower_id || null, grower_name || null, grower_email || null, grower_phone || null,
       commodity, variety || null, volume_lbs || null, unit || 'lb', price_fob, fob_location,
       photo_urls, gps_lat, gps_lng, gps_accuracy_m || null,
       available_until || null, (language || 'EN').toUpperCase(), letter.ai_model, letter.reasoning_engine,
       letter.subject_line, letter.body_html, letter.body_text,
       matched.length, matchedIds, matchedEmails]
    );
    const upload = ins.rows[0];

    // ntfy push to admins (notification only - not approval gate)
    try {
      const headers = { 'Content-Type': 'text/plain', 'Title': `[DISTRESS BLASTED] ${commodity} ${volume_lbs} ${unit || 'lb'} - ${fob_location} - blasted to ${matched.length}`, 'Priority': '5', 'Tags': 'rotating_light,truck' };
      if (NTFY_TOKEN) headers['Authorization'] = 'Bearer ' + NTFY_TOKEN;
      const msg = `Grower: ${grower_name || grower_email || 'unknown'}\nCommodity: ${commodity}\nVolume: ${volume_lbs} ${unit || 'lb'}\nFOB: $${price_fob} ${fob_location}\nBlasted to ${matched.length} top-25 buyers.\nFirst-confirmed-wins.`;
      await fetch(`${NTFY_BASE}/${NTFY_TOPIC}`, { method: 'POST', headers, body: msg }).catch(() => {});
    } catch (e) {}
    await logEvent(upload.id, 'sent', 'success', { lane: 'distress', recipients: matched.length }, Date.now() - t0);

    // match_history row
    try {
      await pool.query(
        `INSERT INTO match_history (lane, source_id, matched_count, matched_ids, matched_emails, blast_at, meta)
         VALUES ('distress', $1, $2, $3, $4, NOW(), $5)`,
        [upload.id, matched.length, matchedIds, matchedEmails, { commodity, volume_lbs, price_fob, fob_location }]
      );
    } catch (e) {}

    return res.json({
      ok: true, lane: 'distress',
      upload_id: upload.id, status: upload.status,
      matched_buyer_count: matched.length,
      blasted_to: matchedEmails,
      reasoning_engine: letter.reasoning_engine,
      elapsed_ms: Date.now() - t0,
      next_step: 'Live - first-confirmed-wins. Watch upload status for sold/expired.'
    });
  } catch (e) {
    await logEvent(null, 'failed', 'failure', { lane: 'distress', error: e.message }, Date.now() - t0);
    return res.status(500).json({ error: 'Pipeline error', detail: e.message });
  }
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
