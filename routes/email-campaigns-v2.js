// ============================================================================
// EMAIL CAMPAIGNS ROUTE - CRUD + Cron Worker + Send Execution
// File: C:\AuditDNA\backend\routes\email-campaigns-v2.js
// Apr 29 2026
//
// Endpoints:
//   GET    /api/campaigns                  - list all campaigns
//   GET    /api/campaigns/:id              - one campaign
//   GET    /api/campaigns/:id/recipients   - preview recipient list
//   GET    /api/campaigns/:id/sends        - send history for campaign
//   POST   /api/campaigns                  - create
//   PUT    /api/campaigns/:id              - update
//   DELETE /api/campaigns/:id              - soft-delete (status=archived)
//   POST   /api/campaigns/:id/send-now     - manual fire (skips schedule)
//   POST   /api/campaigns/:id/pause        - status=paused
//   POST   /api/campaigns/:id/resume       - status=active
//   GET    /api/campaigns/templates/:slug  - return HTML template
//   POST   /api/campaigns/cron/tick        - cron ping (also auto-runs every 60s internally)
// ============================================================================
const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');
const nodemailer = require('nodemailer');
const pool = require('../db');

const TEMPLATE_DIR = path.join(__dirname, '..', 'email-templates');

// SMTP transporter using existing Gmail credentials
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  }
});

// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------
function getPool(req) {
  return req.app.get('pool') || pool || global.pool;
}

function loadTemplate(slug) {
  const file = path.join(TEMPLATE_DIR, slug + '.html');
  if (!fs.existsSync(file)) throw new Error('Template not found: ' + slug);
  return fs.readFileSync(file, 'utf8');
}

function renderTemplate(html, vars) {
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => (vars[key] != null ? String(vars[key]) : ''));
}

function computeNextRun(days, hour, minute, fromDate) {
  const now = fromDate || new Date();
  for (let i = 0; i < 8; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    d.setHours(hour, minute, 0, 0);
    const dow = d.getDay();
    if (days.includes(dow) && d > now) return d;
  }
  return null;
}

async function fetchRecipients(pool, campaign) {
  const params = [];
  const conds  = [campaign.filter_clause];
  if (campaign.filter_country) {
    params.push(campaign.filter_country);
    conds.push('country = $' + params.length);
  }
  if (campaign.filter_states && campaign.filter_states.length > 0) {
    params.push(campaign.filter_states);
    conds.push('state_region = ANY($' + params.length + ')');
  }
  conds.push("email IS NOT NULL");
  conds.push("email <> ''");

  const sql = `
    SELECT id, legal_name, trade_name, primary_contact, email, country, state_region, city
    FROM buyers
    WHERE ${conds.join(' AND ')}
      AND id NOT IN (SELECT buyer_id FROM email_campaign_sends WHERE campaign_id = ${campaign.id} AND sent_at > NOW() - INTERVAL '20 hours')
  `;
  const r = await pool.query(sql, params);
  return r.rows;
}

async function executeCampaign(pool, campaign, opts = {}) {
  const dryRun  = !!opts.dryRun;
  const recipients = await fetchRecipients(pool, campaign);
  const result = { campaign_id: campaign.id, queued: recipients.length, sent: 0, failed: 0, errors: [] };
  if (recipients.length === 0) return result;

  let htmlEn = '', htmlEs = '';
  try { htmlEn = loadTemplate(campaign.template_en); } catch(e) { result.errors.push('EN template: ' + e.message); }
  try { htmlEs = loadTemplate(campaign.template_es); } catch(e) { result.errors.push('ES template: ' + e.message); }

  for (const r of recipients) {
    const isEs = (r.country === 'Mexico' || r.country === 'MX');
    const html = isEs && htmlEs ? htmlEs : (htmlEn || htmlEs);
    const subject = isEs ? campaign.subject_es : campaign.subject_en;
    const vars = {
      contact_name: r.primary_contact || r.trade_name || r.legal_name || 'Buyer',
      company:      r.legal_name || r.trade_name || '',
      city:         r.city || '',
      state:        r.state_region || '',
      country:      r.country || '',
      email:        r.email,
      campaign_id:  campaign.id,
      year:         new Date().getFullYear(),
    };
    const renderedHtml = renderTemplate(html, vars);
    const renderedSubj = renderTemplate(subject, vars);

    if (dryRun) {
      result.sent++;
      continue;
    }

    try {
      const info = await transporter.sendMail({
        from: `"${campaign.sender_name}" <${campaign.sender_email}>`,
        to: r.email,
        replyTo: campaign.reply_to,
        subject: renderedSubj,
        html: renderedHtml
      });
      await pool.query(
        `INSERT INTO email_campaign_sends (campaign_id, buyer_id, recipient_email, subject, status, message_id, sent_at)
         VALUES ($1,$2,$3,$4,'sent',$5,NOW())`,
        [campaign.id, r.id, r.email, renderedSubj, info.messageId || null]
      );
      result.sent++;
    } catch (err) {
      await pool.query(
        `INSERT INTO email_campaign_sends (campaign_id, buyer_id, recipient_email, subject, status, error)
         VALUES ($1,$2,$3,$4,'failed',$5)`,
        [campaign.id, r.id, r.email, renderedSubj, String(err.message || err)]
      );
      result.failed++;
      result.errors.push(r.email + ': ' + (err.message || err));
    }
    await new Promise(res => setTimeout(res, 600));
  }

  const next = computeNextRun(campaign.schedule_days, campaign.schedule_hour, campaign.schedule_minute);
  await pool.query(
    `UPDATE email_campaigns
       SET last_run_at = NOW(),
           next_run_at = $1,
           total_sends = total_sends + $2,
           updated_at  = NOW()
     WHERE id = $3`,
    [next, result.sent, campaign.id]
  );

  return result;
}

// ----------------------------------------------------------------------------
// LIST + READ
// ----------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const pool = getPool(req);
    const r = await pool.query(`
      SELECT * FROM email_campaigns
      WHERE status <> 'archived'
      ORDER BY id ASC
    `);
    res.json({ ok: true, campaigns: r.rows });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const pool = getPool(req);
    const r = await pool.query('SELECT * FROM email_campaigns WHERE id = $1', [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, campaign: r.rows[0] });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/:id/recipients', async (req, res) => {
  try {
    const pool = getPool(req);
    const r = await pool.query('SELECT * FROM email_campaigns WHERE id = $1', [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'not found' });
    const recipients = await fetchRecipients(pool, r.rows[0]);
    res.json({ ok: true, count: recipients.length, recipients: recipients.slice(0, 100) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/:id/sends', async (req, res) => {
  try {
    const pool = getPool(req);
    const r = await pool.query(
      'SELECT * FROM email_campaign_sends WHERE campaign_id = $1 ORDER BY id DESC LIMIT 200',
      [req.params.id]
    );
    res.json({ ok: true, sends: r.rows });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/templates/:slug', (req, res) => {
  try {
    const html = loadTemplate(req.params.slug);
    res.json({ ok: true, slug: req.params.slug, html });
  } catch (e) { res.status(404).json({ ok: false, error: e.message }); }
});

// ----------------------------------------------------------------------------
// CREATE / UPDATE / DELETE
// ----------------------------------------------------------------------------
router.post('/', async (req, res) => {
  try {
    const pool = getPool(req);
    const b = req.body;
    const next = computeNextRun(b.schedule_days || [2,5], b.schedule_hour || 7, b.schedule_minute || 0);
    const r = await pool.query(`
      INSERT INTO email_campaigns
        (name, commodity, variant, filter_country, filter_states, filter_clause,
         subject_en, subject_es, template_en, template_es,
         sender_email, sender_name, reply_to,
         schedule_days, schedule_hour, schedule_minute, schedule_tz,
         status, next_run_at, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      RETURNING *
    `, [
      b.name, b.commodity, b.variant || 'fresh',
      b.filter_country || null, b.filter_states || null, b.filter_clause,
      b.subject_en, b.subject_es, b.template_en, b.template_es,
      b.sender_email || 'sgarcia1911@gmail.com',
      b.sender_name  || 'Saul Garcia - Mexausa Food Group',
      b.reply_to     || 'saul@mexausafg.com',
      b.schedule_days || [2,5], b.schedule_hour || 7, b.schedule_minute || 0,
      b.schedule_tz || 'America/Los_Angeles',
      b.status || 'active', next, b.created_by || 'saul'
    ]);
    res.json({ ok: true, campaign: r.rows[0] });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const pool = getPool(req);
    const b = req.body;
    const next = computeNextRun(b.schedule_days || [2,5], b.schedule_hour || 7, b.schedule_minute || 0);
    const r = await pool.query(`
      UPDATE email_campaigns SET
        name=$1, commodity=$2, variant=$3,
        filter_country=$4, filter_states=$5, filter_clause=$6,
        subject_en=$7, subject_es=$8, template_en=$9, template_es=$10,
        sender_email=$11, sender_name=$12, reply_to=$13,
        schedule_days=$14, schedule_hour=$15, schedule_minute=$16, schedule_tz=$17,
        status=$18, next_run_at=$19, updated_at=NOW()
      WHERE id=$20 RETURNING *
    `, [
      b.name, b.commodity, b.variant,
      b.filter_country, b.filter_states, b.filter_clause,
      b.subject_en, b.subject_es, b.template_en, b.template_es,
      b.sender_email, b.sender_name, b.reply_to,
      b.schedule_days, b.schedule_hour, b.schedule_minute, b.schedule_tz,
      b.status, next, req.params.id
    ]);
    res.json({ ok: true, campaign: r.rows[0] });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const pool = getPool(req);
    await pool.query("UPDATE email_campaigns SET status='archived', updated_at=NOW() WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/:id/pause',  async (req, res) => {
  try {
    const pool = getPool(req);
    await pool.query("UPDATE email_campaigns SET status='paused', updated_at=NOW() WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/:id/resume', async (req, res) => {
  try {
    const pool = getPool(req);
    const r = await pool.query('SELECT * FROM email_campaigns WHERE id=$1', [req.params.id]);
    const c = r.rows[0];
    const next = computeNextRun(c.schedule_days, c.schedule_hour, c.schedule_minute);
    await pool.query("UPDATE email_campaigns SET status='active', next_run_at=$1, updated_at=NOW() WHERE id=$2",
      [next, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ----------------------------------------------------------------------------
// MANUAL SEND
// ----------------------------------------------------------------------------
router.post('/:id/send-now', async (req, res) => {
  try {
    const pool = getPool(req);
    const r = await pool.query('SELECT * FROM email_campaigns WHERE id=$1', [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'not found' });
    const result = await executeCampaign(pool, r.rows[0], { dryRun: !!req.query.dryRun });
    res.json({ ok: true, result });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ----------------------------------------------------------------------------
// CRON
// ----------------------------------------------------------------------------
async function cronTick(pool) {
  const r = await pool.query(`
    SELECT * FROM email_campaigns
    WHERE status='active' AND next_run_at IS NOT NULL AND next_run_at <= NOW()
    ORDER BY next_run_at ASC LIMIT 5
  `);
  const results = [];
  for (const c of r.rows) {
    try {
      const out = await executeCampaign(pool, c);
      results.push(out);
    } catch (err) {
      results.push({ campaign_id: c.id, error: err.message });
    }
  }
  return results;
}

router.post('/cron/tick', async (req, res) => {
  try {
    const out = await cronTick(getPool(req));
    res.json({ ok: true, results: out });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// auto cron - runs every 60 seconds
function startCron(pool) {
  if (global.__campaignCronStarted) return;
  global.__campaignCronStarted = true;
  setInterval(() => {
    cronTick(pool).catch(err => console.error('[campaign cron]', err.message));
  }, 60000);
  console.log('[campaign cron] started - tick every 60s');
}

module.exports = router;
module.exports.startCron = startCron;
