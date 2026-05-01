// ═══════════════════════════════════════════════════════════════════════════
// HOT LEADS — Backend Routes (Express)
// Mexausa Food Group, Inc. | AuditDNA Agriculture Intelligence
// Save to: C:\AuditDNA\backend\routes\hot-leads.routes.js
// Mount in server.js: app.use('/api/hot-leads', require('./routes/hot-leads.routes'));
//
// Surfaces HOT/WARM pre-scored leads from shipper_contacts + growers + buyers.
// Drafts personalized outreach letters using template engine + user letterhead.
// ═══════════════════════════════════════════════════════════════════════════

const express = require('express');
const router  = express.Router();
const db      = pool || require('../db/connection');

async function pingBrain(eventType, payload) {
  try {
    await db.query(
      `INSERT INTO brain_events(event_type, payload, source, created_at)
       VALUES ($1, $2, 'hot-leads.routes', NOW())`,
      [eventType, JSON.stringify(payload)]
    );
  } catch {}
}

function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ success: false, error: 'No auth token' });
  try {
    const jwt = require('jsonwebtoken');
const pool = require('../db');
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

// ──────────────────────────────────────────────────────────────────────────
// GET /api/hot-leads/stats   — overview tiles
// ──────────────────────────────────────────────────────────────────────────
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const r = await db.query(`
      SELECT 'shipper' AS source,
             COUNT(*) FILTER (WHERE lead_temperature = 'HOT')  AS hot,
             COUNT(*) FILTER (WHERE lead_temperature = 'WARM') AS warm,
             COUNT(*) FILTER (WHERE lead_temperature = 'COLD') AS cold,
             COUNT(*)                                          AS total
        FROM shipper_contacts
      UNION ALL
      SELECT 'grower',
             COUNT(*) FILTER (WHERE lead_temperature = 'HOT'),
             COUNT(*) FILTER (WHERE lead_temperature = 'WARM'),
             COUNT(*) FILTER (WHERE lead_temperature = 'COLD'),
             COUNT(*)
        FROM growers
      UNION ALL
      SELECT 'buyer',
             COUNT(*) FILTER (WHERE lead_temperature = 'HOT'),
             COUNT(*) FILTER (WHERE lead_temperature = 'WARM'),
             COUNT(*) FILTER (WHERE lead_temperature = 'COLD'),
             COUNT(*)
        FROM buyers
    `);
    const by_source = {};
    let totals = { hot: 0, warm: 0, cold: 0, total: 0 };
    r.rows.forEach(row => {
      by_source[row.source] = {
        hot:   parseInt(row.hot)   || 0,
        warm:  parseInt(row.warm)  || 0,
        cold:  parseInt(row.cold)  || 0,
        total: parseInt(row.total) || 0
      };
      totals.hot   += parseInt(row.hot)   || 0;
      totals.warm  += parseInt(row.warm)  || 0;
      totals.cold  += parseInt(row.cold)  || 0;
      totals.total += parseInt(row.total) || 0;
    });
    res.json({ success: true, totals, by_source });
  } catch (err) {
    console.error('[HOT-LEADS] stats error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// GET /api/hot-leads?temperature=HOT&source=shipper&q=&limit=200&offset=0
// ──────────────────────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { temperature = 'HOT', source, q, limit = 200, offset = 0 } = req.query;
    const params = [];
    const lim = parseInt(limit) || 200;
    const off = parseInt(offset) || 0;

    // Unify the 3 source tables into one result set with a normalized shape
    const srcs = source ? [source] : ['shipper', 'grower', 'buyer'];
    const unionParts = [];

    if (srcs.includes('shipper')) {
      unionParts.push(`
        SELECT 'shipper'::text AS source_type,
               id, shipper_name AS company, contact_name,
               email, phone, country, state AS state_region,
               lead_temperature, created_at, updated_at
          FROM shipper_contacts
      `);
    }
    if (srcs.includes('grower')) {
      unionParts.push(`
        SELECT 'grower'::text,
               id, company_name, contact_name,
               email, phone, country_code AS country, state AS state_region,
               lead_temperature, created_at, updated_at
          FROM growers
      `);
    }
    if (srcs.includes('buyer')) {
      unionParts.push(`
        SELECT 'buyer'::text,
               id, company_name, contact_name,
               email, phone, country_code AS country, state AS state_region,
               lead_temperature, created_at, updated_at
          FROM buyers
      `);
    }
    if (!unionParts.length) return res.json({ success: true, total: 0, data: [] });

    let unionSql = unionParts.join('\nUNION ALL\n');
    const whereTemp = temperature !== 'ALL' ? `WHERE lead_temperature = $${params.length + 1}` : '';
    if (temperature !== 'ALL') params.push(temperature);
    let sql = `SELECT * FROM (${unionSql}) AS t ${whereTemp}`;

    if (q) {
      params.push(`%${q}%`);
      sql += ` ${whereTemp ? 'AND' : 'WHERE'} (company ILIKE $${params.length} OR contact_name ILIKE $${params.length} OR email ILIKE $${params.length})`;
    }
    params.push(lim, off);
    sql += ` ORDER BY CASE lead_temperature WHEN 'HOT' THEN 1 WHEN 'WARM' THEN 2 ELSE 3 END, updated_at DESC NULLS LAST LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const r = await db.query(sql, params);
    res.json({ success: true, count: r.rowCount, data: r.rows });
  } catch (err) {
    console.error('[HOT-LEADS] list error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// POST /api/hot-leads/draft-letter
// body: { source_type, lead_id, template_key, sender_name, sender_title }
// Returns a draft subject + body using templates + the lead's data.
// ──────────────────────────────────────────────────────────────────────────
const LETTER_TEMPLATES = {
  introduction: {
    label: 'Introduction — Open the door',
    subject: (ctx) => `Quick introduction — ${ctx.sender_company} × ${ctx.company}`,
    body: (ctx) => `Hello ${ctx.contact_name || 'there'},

I'm ${ctx.sender_name} with ${ctx.sender_company}, and I've been following ${ctx.company}'s work in ${ctx.state_region || ctx.country || 'produce'}. Wanted to open a short conversation.

We run a grower-to-buyer matching platform in the US-Mexico corridor that handles compliance (FSMA 204, cold-chain, traceability) end-to-end, with escrow-first terms so both sides sleep at night. Right now we're onboarding a handful of quality ${ctx.source_type === 'shipper' ? 'shippers' : ctx.source_type === 'grower' ? 'growers' : 'buyers'} ahead of our Q2 season ramp.

Does a 15-minute call next week work to see if there's overlap? I can send you our one-pager first if easier.

Best,
${ctx.sender_name}
${ctx.sender_title}
${ctx.sender_company}`
  },
  reconnect: {
    label: 'Reconnect — Warm lead follow-up',
    subject: (ctx) => `Circling back — ${ctx.sender_company}`,
    body: (ctx) => `Hi ${ctx.contact_name || 'there'},

It's been a minute since we last connected. Wanted to check in and share a quick update on what we're building at ${ctx.sender_company}.

Since we talked, we've added ${ctx.source_type === 'shipper' ? 'FSMA 204 traceability + cold-chain certification' : 'escrow-first deal flow + blind lender marketplace'} to the platform. That's meaningful for anyone moving serious volume in ${ctx.state_region || ctx.country || 'the corridor'}.

If the timing is better now, I'd love to pick the thread back up. 15 minutes, your call format.

Best,
${ctx.sender_name}
${ctx.sender_title}
${ctx.sender_company}`
  },
  season_ramp: {
    label: 'Season Ramp — Seasonal positioning',
    subject: (ctx) => `Q2 season — ${ctx.sender_company} is opening ${ctx.source_type} slots`,
    body: (ctx) => `${ctx.contact_name || 'Hello'},

Q2 is around the corner and we're finalizing our ${ctx.source_type === 'shipper' ? 'shipping partners' : ctx.source_type === 'grower' ? 'preferred growers' : 'buyer network'} for the season at ${ctx.sender_company}.

Given your footprint in ${ctx.state_region || ctx.country || 'the region'}, ${ctx.company} was on my short list. The structure is simple — escrow-first deals, we handle compliance, you handle what you do best.

If you'd like to talk through terms, I can do 15 minutes this week or next.

Best,
${ctx.sender_name}
${ctx.sender_title}
${ctx.sender_company}`
  },
  referral_ask: {
    label: 'Referral Ask — Network expansion',
    subject: (ctx) => `Brief ask — who should I be talking to in ${ctx.state_region || ctx.country || 'your network'}?`,
    body: (ctx) => `${ctx.contact_name || 'Hi'},

Short one. ${ctx.sender_company} is expanding our ${ctx.source_type} network in ${ctx.state_region || ctx.country || 'your region'} and I'm trying to skip the cold-outreach grind by asking people I trust for pointers.

Who are 2–3 ${ctx.source_type === 'shipper' ? 'shippers or freight partners' : ctx.source_type === 'grower' ? 'growers' : 'buyers or retailers'} you'd personally vouch for? Happy to return the favor anytime.

No expectation, zero pressure. Appreciate it either way.

Best,
${ctx.sender_name}
${ctx.sender_title}
${ctx.sender_company}`
  }
};

router.post('/draft-letter', requireAuth, async (req, res) => {
  try {
    const { source_type, lead_id, template_key = 'introduction', sender_name, sender_title, sender_company = 'Mexausa Food Group, Inc.' } = req.body || {};
    if (!source_type || !lead_id) return res.status(400).json({ success: false, error: 'source_type and lead_id required' });

    const tbl = source_type === 'shipper' ? 'shipper_contacts' : source_type === 'grower' ? 'growers' : 'buyers';
    const nameCol = source_type === 'shipper' ? 'shipper_name' : 'company_name';
    const stateCol = source_type === 'grower' || source_type === 'buyer' ? 'state' : 'state';
    const r = await db.query(`SELECT id, ${nameCol} AS company, contact_name, email, phone, country, ${stateCol} AS state_region FROM ${tbl} WHERE id = $1`, [lead_id]);
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Lead not found' });
    const lead = r.rows[0];

    const template = LETTER_TEMPLATES[template_key] || LETTER_TEMPLATES.introduction;
    const ctx = {
      ...lead,
      source_type,
      sender_name:    sender_name    || 'Saul Garcia',
      sender_title:   sender_title   || 'Founder & CEO',
      sender_company: sender_company || 'Mexausa Food Group, Inc.'
    };

    const subject = template.subject(ctx);
    const body    = template.body(ctx);

    await pingBrain('LETTER_DRAFTED', { source_type, lead_id, template_key });
    res.json({ success: true, draft: { subject, body, template_label: template.label, to: lead.email, lead } });
  } catch (err) {
    console.error('[HOT-LEADS] draft-letter error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// POST /api/hot-leads/update-temperature
// body: { source_type, lead_id, temperature }
// ──────────────────────────────────────────────────────────────────────────
router.post('/update-temperature', requireAuth, async (req, res) => {
  try {
    const { source_type, lead_id, temperature } = req.body || {};
    if (!['HOT', 'WARM', 'COLD'].includes(temperature)) return res.status(400).json({ success: false, error: 'Invalid temperature' });
    const tbl = source_type === 'shipper' ? 'shipper_contacts' : source_type === 'grower' ? 'growers' : 'buyers';
    await db.query(`UPDATE ${tbl} SET lead_temperature = $1, updated_at = NOW() WHERE id = $2`, [temperature, lead_id]);
    await pingBrain('LEAD_TEMPERATURE_CHANGED', { source_type, lead_id, temperature });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// GET /api/hot-leads/templates  — list available letter templates
// ──────────────────────────────────────────────────────────────────────────
router.get('/templates', requireAuth, (req, res) => {
  res.json({
    success: true,
    templates: Object.entries(LETTER_TEMPLATES).map(([key, t]) => ({ key, label: t.label }))
  });
});

module.exports = router;
