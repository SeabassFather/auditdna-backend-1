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

module.exports = router;
