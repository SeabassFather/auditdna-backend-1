// ============================================================================
// AuditDNA - MULTI-VERTICAL CAMPAIGN ENGINE
// File: C:\AuditDNA\backend\routes\campaigns-engine.js
//
// Routes:
//   GET  /api/campaigns/verticals           List 8 vertical configs (with stats)
//   GET  /api/campaigns/employees           List employees + vertical access
//   POST /api/campaigns/run                 Fire campaign (immediate or scheduled)
//   GET  /api/campaigns/runs                List recent runs (filter by status/vertical)
//   GET  /api/campaigns/runs/:id            Run detail + send log
//   POST /api/campaigns/preview-ai          AI-generate preview body for a vertical
//   POST /api/campaigns/upload-asset        Upload flyer/brochure to vertical folder
//   GET  /api/campaigns/throttle-check      Pre-fire safety: which contacts are at cap
//   POST /api/campaigns/optout              Vertical-level opt-out
//   GET  /api/email/unsubscribe             Public footer link handler
//   POST /api/campaigns/suppression         Add to master suppression list
// ============================================================================
'use strict';

const express = require('express');
const router  = express.Router();
const nodemailer = require('nodemailer');
const path    = require('path');
const fs      = require('fs');

// Use the global pool from server.js (per AuditDNA convention)
function db() { return global.db || require('../db').pool; }

// ----------------------------------------------------------------------------
// SMTP transporter (Gmail per platform rules)
// ----------------------------------------------------------------------------
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'sgarcia1911@gmail.com',
    pass: process.env.SMTP_PASS || 'izvbtgxxogchstym'
  }
});

// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------
function buildSenderHeader(vertical, employee) {
  const name  = vertical.sender_name_static  || employee?.display_name || 'Saul Garcia';
  const title = vertical.sender_title_static || employee?.title         || 'Founder & CEO';
  const email = vertical.sender_email        || employee?.primary_email || 'saul@mfginc.com';
  return { name, title, email, brand_line: vertical.brand_line, brand_url: vertical.brand_url };
}

function buildSignatureHTML(sender, addr) {
  return `<br/><p>Best regards,<br/>
<strong>${sender.name}</strong><br/>
${sender.title}<br/>
<strong>${sender.brand_line}</strong><br/>
${sender.email} | <a href="https://${sender.brand_url}">${sender.brand_url}</a><br/>
US: +1-831-251-3116 | MX: +52-646-340-2686<br/>
${addr}</p>`;
}

function buildFooterHTML(vertical, recipientEmail) {
  const verticalLabel = vertical.name_en;
  const unsubVertical = `${process.env.PUBLIC_API_URL || 'https://mexausafg.com'}/api/email/unsubscribe?email=${encodeURIComponent(recipientEmail)}&v=${vertical.id}`;
  const unsubAll      = `${process.env.PUBLIC_API_URL || 'https://mexausafg.com'}/api/email/unsubscribe?email=${encodeURIComponent(recipientEmail)}&v=ALL`;
  return `<hr style="border:0;border-top:1px solid #ddd;margin:24px 0"/>
<p style="font-size:11px;color:#666;line-height:1.5">
${vertical.brand_line} - a division of Mexausa Food Group, Inc.<br/>
${vertical.footer_addr}<br/>
You received this because you are a registered contact in our ${verticalLabel} list.<br/>
<a href="${unsubVertical}">Unsubscribe from ${verticalLabel}</a> | <a href="${unsubAll}">Unsubscribe from all MFG email</a>
</p>`;
}

async function isSuppressed(email) {
  const r = await db().query('SELECT 1 FROM email_suppression WHERE email=$1 LIMIT 1', [email.toLowerCase()]);
  return r.rowCount > 0;
}

async function isOptedOut(email, verticalId) {
  const r = await db().query('SELECT 1 FROM vertical_optouts WHERE email=$1 AND vertical_id=$2 LIMIT 1', [email.toLowerCase(), verticalId]);
  return r.rowCount > 0;
}

async function checkThrottle(email) {
  // Returns { ok: bool, today: int, this_week: int, this_month: int }
  const r = await db().query(
    `SELECT
       COUNT(*) FILTER (WHERE sent_at > NOW() - INTERVAL '1 day')   AS today,
       COUNT(*) FILTER (WHERE sent_at > NOW() - INTERVAL '7 days')  AS this_week,
       COUNT(*) FILTER (WHERE sent_at > NOW() - INTERVAL '30 days') AS this_month
     FROM contact_send_log WHERE email=$1`, [email.toLowerCase()]);
  const row = r.rows[0];
  const today = parseInt(row.today), week = parseInt(row.this_week), month = parseInt(row.this_month);
  return { ok: today < 1 && week < 3 && month < 8, today, this_week: week, this_month: month };
}

async function logSend(email, verticalId) {
  await db().query('INSERT INTO contact_send_log (email, vertical_id) VALUES ($1, $2)', [email.toLowerCase(), verticalId]);
}

// ----------------------------------------------------------------------------
// GET /api/campaigns/verticals
// ----------------------------------------------------------------------------
router.get('/verticals', async (req, res) => {
  try {
    const r = await db().query(`
      SELECT v.*,
        (SELECT COUNT(*) FROM campaign_runs WHERE vertical_id=v.id AND scheduled_for > NOW() - INTERVAL '7 days') AS runs_7d,
        (SELECT COALESCE(SUM(sent_count), 0) FROM campaign_runs WHERE vertical_id=v.id AND scheduled_for > NOW() - INTERVAL '7 days') AS sent_7d,
        (SELECT COALESCE(SUM(opens), 0) FROM campaign_runs WHERE vertical_id=v.id AND scheduled_for > NOW() - INTERVAL '7 days') AS opens_7d,
        (SELECT MIN(scheduled_for) FROM campaign_runs WHERE vertical_id=v.id AND status='queued' AND scheduled_for > NOW()) AS next_run_at
      FROM campaign_verticals v
      ORDER BY v.id`);
    res.json({ ok: true, verticals: r.rows });
  } catch (e) {
    console.error('[campaigns/verticals]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ----------------------------------------------------------------------------
// GET /api/campaigns/employees
// ----------------------------------------------------------------------------
router.get('/employees', async (req, res) => {
  try {
    const r = await db().query('SELECT username, display_name, title, primary_email, vertical_access, workspace_active, active FROM mfg_employees WHERE active=true ORDER BY id');
    res.json({ ok: true, employees: r.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ----------------------------------------------------------------------------
// POST /api/campaigns/run - fire campaign
// Body: { verticalId, fired_by, recipients:[{email,name,...}], subject, body_html, scheduled_for? }
// ----------------------------------------------------------------------------
router.post('/run', async (req, res) => {
  const { verticalId, fired_by, recipients, subject, body_html, scheduled_for, asset_ids } = req.body;
  if (!verticalId || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ ok: false, error: 'verticalId and recipients required' });
  }

  try {
    // Load vertical config
    const vRes = await db().query('SELECT * FROM campaign_verticals WHERE id=$1 AND enabled=true', [verticalId]);
    if (!vRes.rowCount) return res.status(404).json({ ok: false, error: 'Vertical not found or disabled' });
    const vertical = vRes.rows[0];

    // Load firing employee profile
    let employee = null;
    if (fired_by) {
      const eRes = await db().query('SELECT * FROM mfg_employees WHERE username=$1', [fired_by]);
      if (eRes.rowCount) employee = eRes.rows[0];
      // Verify employee has access to this vertical
      if (employee && Array.isArray(employee.vertical_access)) {
        if (!employee.vertical_access.includes(verticalId) && verticalId !== 'RE_BAJA') {
          return res.status(403).json({ ok: false, error: `${fired_by} does not have access to ${verticalId}` });
        }
      }
    }

    // Insert run
    const runRes = await db().query(`
      INSERT INTO campaign_runs (vertical_id, fired_by_user, scheduled_for, status, recipient_count, subject_template, body_template, attached_assets)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id`,
      [verticalId, fired_by || null, scheduled_for || new Date(), scheduled_for ? 'queued' : 'sending', recipients.length, subject, body_html, JSON.stringify(asset_ids || [])]);
    const runId = runRes.rows[0].id;

    // If scheduled for future, return queued
    if (scheduled_for && new Date(scheduled_for) > new Date()) {
      return res.json({ ok: true, run_id: runId, status: 'queued', recipient_count: recipients.length });
    }

    // FIRE NOW
    const sender = buildSenderHeader(vertical, employee);
    const fromHeader = `"${sender.name}" <${sender.email}>`;
    let sent = 0, suppressed = 0, throttled = 0, errors = 0;

    for (const rcpt of recipients) {
      const email = (rcpt.email || '').toLowerCase().trim();
      if (!email || !email.includes('@')) { errors++; continue; }

      if (await isSuppressed(email)) { suppressed++; continue; }
      if (await isOptedOut(email, verticalId)) { suppressed++; continue; }

      const t = await checkThrottle(email);
      if (!t.ok) { throttled++; continue; }

      const personalized = (body_html || '')
        .replace(/\{\{first_name\}\}/g, rcpt.name?.split(' ')[0] || 'there')
        .replace(/\{\{name\}\}/g, rcpt.name || '')
        .replace(/\{\{company\}\}/g, rcpt.company || '');

      const fullBody = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#333;max-width:640px;margin:0 auto;padding:20px">
${personalized}
${buildSignatureHTML(sender, vertical.footer_addr)}
${buildFooterHTML(vertical, email)}
</body></html>`;

      try {
        const info = await transporter.sendMail({
          from: fromHeader,
          to: email,
          subject: subject || `${vertical.brand_line} - ${vertical.name_en}`,
          html: fullBody,
          headers: { 'List-Unsubscribe': `<${process.env.PUBLIC_API_URL || 'https://mexausafg.com'}/api/email/unsubscribe?email=${encodeURIComponent(email)}&v=${verticalId}>` }
        });

        await db().query(`
          INSERT INTO campaign_sends_v2 (run_id, contact_id, email, subject, body_html, sent_at, message_id)
          VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
          [runId, rcpt.id || null, email, subject, fullBody.substring(0, 50000), info.messageId]);

        await logSend(email, verticalId);
        sent++;
      } catch (sendErr) {
        console.error(`[campaign/${runId}] send failed to ${email}: ${sendErr.message}`);
        errors++;
      }

      await new Promise(r => setTimeout(r, 250));  // rate-limit 4/sec
    }

    await db().query(`UPDATE campaign_runs SET status='sent', sent_count=$1, completed_at=NOW() WHERE id=$2`, [sent, runId]);

    res.json({ ok: true, run_id: runId, status: 'sent', sent, suppressed, throttled, errors, total: recipients.length });

  } catch (e) {
    console.error('[campaigns/run]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ----------------------------------------------------------------------------
// POST /api/campaigns/preview-ai - AI-generate preview body
// Body: { verticalId, fired_by, language: 'en'|'es', topic_extra }
// Returns: { subject, body_html }
// ----------------------------------------------------------------------------
router.post('/preview-ai', async (req, res) => {
  const { verticalId, fired_by, language = 'en', topic_extra = '' } = req.body;
  try {
    const vRes = await db().query('SELECT * FROM campaign_verticals WHERE id=$1', [verticalId]);
    if (!vRes.rowCount) return res.status(404).json({ ok: false });
    const vertical = vRes.rows[0];

    let employee = null;
    if (fired_by) {
      const eRes = await db().query('SELECT * FROM mfg_employees WHERE username=$1', [fired_by]);
      if (eRes.rowCount) employee = eRes.rows[0];
    }
    const sender = buildSenderHeader(vertical, employee);

    // Build prompt
    const prompt = vertical.ai_prompt_template
      .replace(/\{\{user_name\}\}/g, sender.name)
      .replace(/\{\{user_title\}\}/g, sender.title)
      + `\n\nLanguage: ${language === 'es' ? 'Spanish (Mexico)' : 'English (USA)'}.`
      + (topic_extra ? `\nAdditional topic: ${topic_extra}` : '')
      + '\n\nReturn ONLY: Line 1 = "Subject: <subject>". Blank line. HTML body using <p>, <strong>, <ul><li>. NO markdown, NO emojis. Start with <p>Hi {{first_name}},</p>. End with: <p>{{SIGNATURE_PLACEHOLDER}}</p>.';

    // Call Claude API via existing pattern - this expects ANTHROPIC_API_KEY to be set
    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_KEY) {
      return res.json({
        ok: false,
        error: 'ANTHROPIC_API_KEY not set',
        fallback_subject: `${vertical.name_en} - Update`,
        fallback_body: `<p>Hi {{first_name}},</p><p>${vertical.name_en} update from ${sender.brand_line}. Reply for details.</p>`
      });
    }

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const aiData = await aiRes.json();
    const text = aiData.content?.[0]?.text || '';
    const subjMatch = text.match(/^Subject:\s*(.+)/im);
    const subject = subjMatch ? subjMatch[1].trim() : `${vertical.name_en} - Update`;
    const body = text.replace(/^Subject:\s*.+\n?/im, '').trim();

    res.json({ ok: true, subject, body_html: body });

  } catch (e) {
    console.error('[campaigns/preview-ai]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ----------------------------------------------------------------------------
// GET /api/campaigns/runs - list recent runs
// ----------------------------------------------------------------------------
router.get('/runs', async (req, res) => {
  const { vertical_id, status, limit = 50 } = req.query;
  try {
    const where = [], params = [];
    if (vertical_id) { params.push(vertical_id); where.push(`vertical_id=$${params.length}`); }
    if (status)      { params.push(status);      where.push(`status=$${params.length}`); }
    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
    params.push(parseInt(limit));
    const r = await db().query(`SELECT * FROM campaign_runs ${whereSql} ORDER BY created_at DESC LIMIT $${params.length}`, params);
    res.json({ ok: true, runs: r.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ----------------------------------------------------------------------------
// GET /api/email/unsubscribe?email=X&v=VERTICAL_ID|ALL
// ----------------------------------------------------------------------------
router.get('/unsubscribe-public', async (req, res) => {
  const { email, v } = req.query;
  if (!email || !v) return res.status(400).send('Missing parameters');
  const e = email.toLowerCase().trim();
  try {
    if (v === 'ALL') {
      await db().query('INSERT INTO email_suppression (email, reason, added_by) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING', [e, 'global_unsub', 'self']);
      return res.send(`<html><body style="font-family:Arial;text-align:center;padding:40px"><h2>Unsubscribed from all Mexausa Food Group email.</h2><p>Your email ${e} has been removed from all lists.</p></body></html>`);
    }
    await db().query('INSERT INTO vertical_optouts (email, vertical_id, ip_address) VALUES ($1, $2, $3) ON CONFLICT (email, vertical_id) DO NOTHING', [e, v, req.ip]);
    res.send(`<html><body style="font-family:Arial;text-align:center;padding:40px"><h2>Unsubscribed from ${v}.</h2><p>You will no longer receive ${v} emails. <a href="/api/campaigns/unsubscribe-public?email=${encodeURIComponent(e)}&v=ALL">Unsubscribe from all</a></p></body></html>`);
  } catch (err) {
    res.status(500).send('Error processing unsubscribe: ' + err.message);
  }
});

// ----------------------------------------------------------------------------
// POST /api/campaigns/throttle-check
// ----------------------------------------------------------------------------
router.post('/throttle-check', async (req, res) => {
  const { emails } = req.body;
  if (!Array.isArray(emails)) return res.status(400).json({ ok: false });
  const out = [];
  for (const e of emails) {
    const t = await checkThrottle(e);
    out.push({ email: e, ...t });
  }
  res.json({ ok: true, results: out });
});

module.exports = router;
