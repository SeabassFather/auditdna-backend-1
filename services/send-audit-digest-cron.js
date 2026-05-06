// ============================================================
// File: send-audit-digest-cron.js
// Save to: C:\AuditDNA\backend\services\send-audit-digest-cron.js
// ============================================================
// Runs daily at 6 AM PT - emails saul@mexausafg.com yesterday's
// per-team-member send report.
//
// Registered in server.js with:
//   require('./services/send-audit-digest-cron').start();
// ============================================================

const { Pool } = require('pg');
const nodemailer = require('nodemailer');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'auditdna',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'auditdna2026',
});

const DIGEST_RECIPIENT = process.env.DIGEST_RECIPIENT || 'saul@mexausafg.com';
const DIGEST_HOUR_PT = 6;       // 6 AM Pacific
const DIGEST_MINUTE = 0;

// ---------- helpers ----------

function pacificNow() {
  // Get current time in PT (UTC-7 PDT)
  const now = new Date();
  return new Date(now.getTime() - (7 * 60 * 60 * 1000));
}

function yesterdayPTBounds() {
  const ptNow = pacificNow();
  const ptYesterday = new Date(ptNow.getFullYear(), ptNow.getMonth(), ptNow.getDate() - 1);
  // Convert PT midnight back to UTC (add 7 hours)
  const start = new Date(ptYesterday.getTime() + (7 * 60 * 60 * 1000));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end, dateStr: ptYesterday.toISOString().split('T')[0] };
}

// ---------- digest builder ----------

async function buildDigest() {
  const { start, end, dateStr } = yesterdayPTBounds();

  const totals = await pool.query(`
    SELECT
      COUNT(*)::int AS total_sends,
      COUNT(DISTINCT contact_email)::int AS unique_recipients,
      COUNT(DISTINCT sender_email)::int AS active_senders,
      COALESCE(SUM(attachment_count), 0)::int AS total_attachments
    FROM email_activity_log
    WHERE direction = 'sent' AND created_at >= $1 AND created_at < $2
  `, [start, end]);

  const bySender = await pool.query(`
    SELECT
      COALESCE(sender_email, 'unknown') AS sender_email,
      COUNT(*)::int AS sends,
      COUNT(DISTINCT contact_email)::int AS unique_recipients,
      ARRAY_AGG(DISTINCT industry) FILTER (WHERE industry IS NOT NULL) AS industries,
      ARRAY_AGG(DISTINCT commodity) FILTER (WHERE commodity IS NOT NULL) AS commodities
    FROM email_activity_log
    WHERE direction = 'sent' AND created_at >= $1 AND created_at < $2
    GROUP BY sender_email
    ORDER BY sends DESC
  `, [start, end]);

  const byIndustry = await pool.query(`
    SELECT
      COALESCE(industry, 'Uncategorized') AS industry,
      COUNT(*)::int AS sends,
      COUNT(DISTINCT contact_email)::int AS unique_recipients
    FROM email_activity_log
    WHERE direction = 'sent' AND created_at >= $1 AND created_at < $2
    GROUP BY industry
    ORDER BY sends DESC
  `, [start, end]);

  return {
    dateStr,
    totals: totals.rows[0],
    bySender: bySender.rows,
    byIndustry: byIndustry.rows
  };
}

// ---------- HTML renderer ----------

function renderDigestHTML(d) {
  const senderRows = d.bySender.length === 0
    ? '<tr><td colspan="5" style="padding:14px;text-align:center;color:#94a3b8">No sends recorded</td></tr>'
    : d.bySender.map(s => `
        <tr style="border-bottom:1px solid #D4DBD3">
          <td style="padding:10px 14px;font-weight:700;color:#0F1419">${s.sender_email}</td>
          <td style="padding:10px 14px;text-align:right;font-weight:800;color:#0F7B41">${s.sends}</td>
          <td style="padding:10px 14px;text-align:right;color:#2A3138">${s.unique_recipients}</td>
          <td style="padding:10px 14px;font-size:11px;color:#075028">${(s.industries || []).join(', ') || '-'}</td>
          <td style="padding:10px 14px;font-size:11px;color:#075028">${(s.commodities || []).join(', ') || '-'}</td>
        </tr>`).join('');

  const industryRows = d.byIndustry.length === 0
    ? '<tr><td colspan="3" style="padding:14px;text-align:center;color:#94a3b8">No industries tracked</td></tr>'
    : d.byIndustry.map(i => `
        <tr style="border-bottom:1px solid #D4DBD3">
          <td style="padding:10px 14px;font-weight:700;color:#0F1419">${i.industry}</td>
          <td style="padding:10px 14px;text-align:right;font-weight:800;color:#0F7B41">${i.sends}</td>
          <td style="padding:10px 14px;text-align:right;color:#2A3138">${i.unique_recipients}</td>
        </tr>`).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F4F6F4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0F1419">
  <div style="max-width:780px;margin:0 auto;background:#FFFFFF;border:1px solid #D4DBD3">
    <div style="background:linear-gradient(135deg,#0F7B41 0%,#075028 100%);padding:22px 28px;color:#FFFFFF">
      <div style="font-size:11px;letter-spacing:3px;color:#C9A55C;font-weight:800;text-transform:uppercase">Mexausa Food Group, Inc.</div>
      <div style="font-size:20px;font-weight:800;margin-top:4px">Daily Send Audit Report</div>
      <div style="font-size:13px;opacity:.92;margin-top:2px">For ${d.dateStr} (Pacific Time)</div>
    </div>

    <div style="padding:24px 28px">
      <table style="width:100%;border-collapse:collapse;margin-bottom:22px">
        <tr>
          <td style="padding:14px;background:#F4F6F4;text-align:center;border:1px solid #D4DBD3">
            <div style="font-size:28px;font-weight:800;color:#0F7B41">${d.totals.total_sends}</div>
            <div style="font-size:10px;letter-spacing:1.5px;color:#2A3138;margin-top:4px">TOTAL SENDS</div>
          </td>
          <td style="padding:14px;background:#F4F6F4;text-align:center;border:1px solid #D4DBD3">
            <div style="font-size:28px;font-weight:800;color:#0F7B41">${d.totals.unique_recipients}</div>
            <div style="font-size:10px;letter-spacing:1.5px;color:#2A3138;margin-top:4px">UNIQUE RECIPIENTS</div>
          </td>
          <td style="padding:14px;background:#F4F6F4;text-align:center;border:1px solid #D4DBD3">
            <div style="font-size:28px;font-weight:800;color:#0F7B41">${d.totals.active_senders}</div>
            <div style="font-size:10px;letter-spacing:1.5px;color:#2A3138;margin-top:4px">ACTIVE SENDERS</div>
          </td>
          <td style="padding:14px;background:#F4F6F4;text-align:center;border:1px solid #D4DBD3">
            <div style="font-size:28px;font-weight:800;color:#0F7B41">${d.totals.total_attachments}</div>
            <div style="font-size:10px;letter-spacing:1.5px;color:#2A3138;margin-top:4px">ATTACHMENTS</div>
          </td>
        </tr>
      </table>

      <h3 style="font-size:13px;letter-spacing:1.5px;color:#0F7B41;text-transform:uppercase;border-bottom:2px solid #C9A55C;padding-bottom:6px;margin:0 0 12px 0">By Sender</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:22px;font-size:13px">
        <thead>
          <tr style="background:#0F1419;color:#C9A55C">
            <th style="padding:10px 14px;text-align:left;letter-spacing:1px;font-size:11px">SENDER</th>
            <th style="padding:10px 14px;text-align:right;letter-spacing:1px;font-size:11px">SENDS</th>
            <th style="padding:10px 14px;text-align:right;letter-spacing:1px;font-size:11px">RECIPIENTS</th>
            <th style="padding:10px 14px;text-align:left;letter-spacing:1px;font-size:11px">INDUSTRIES</th>
            <th style="padding:10px 14px;text-align:left;letter-spacing:1px;font-size:11px">COMMODITIES</th>
          </tr>
        </thead>
        <tbody>${senderRows}</tbody>
      </table>

      <h3 style="font-size:13px;letter-spacing:1.5px;color:#0F7B41;text-transform:uppercase;border-bottom:2px solid #C9A55C;padding-bottom:6px;margin:0 0 12px 0">By Industry</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:22px;font-size:13px">
        <thead>
          <tr style="background:#0F1419;color:#C9A55C">
            <th style="padding:10px 14px;text-align:left;letter-spacing:1px;font-size:11px">INDUSTRY</th>
            <th style="padding:10px 14px;text-align:right;letter-spacing:1px;font-size:11px">SENDS</th>
            <th style="padding:10px 14px;text-align:right;letter-spacing:1px;font-size:11px">RECIPIENTS</th>
          </tr>
        </thead>
        <tbody>${industryRows}</tbody>
      </table>
    </div>

    <div style="background:#0F1419;color:#C9A55C;padding:12px 28px;font-size:11px;letter-spacing:1px;text-align:center">
      MEXAUSA FOOD GROUP, INC. &middot; Auto-generated 6 AM PT
    </div>
  </div>
</body></html>`;
}

// ---------- email send ----------

async function sendDigestEmail(d) {
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || 'sgarcia1911@gmail.com',
      pass: process.env.SMTP_PASS || ''
    }
  });

  const html = renderDigestHTML(d);
  const subject = `[MFG Send Report] ${d.dateStr} - ${d.totals.total_sends} sends, ${d.totals.unique_recipients} recipients`;

  await transport.sendMail({
    from: `"AuditDNA Reports" <${process.env.SMTP_USER || 'sgarcia1911@gmail.com'}>`,
    to: DIGEST_RECIPIENT,
    subject,
    html
  });
  console.log(`[send-audit-digest] Sent to ${DIGEST_RECIPIENT}: ${subject}`);
}

// ---------- main job ----------

async function runDigestJob() {
  try {
    console.log('[send-audit-digest] running daily digest job...');
    const d = await buildDigest();
    if (d.totals.total_sends === 0) {
      console.log(`[send-audit-digest] No sends for ${d.dateStr}, sending zero-day report anyway`);
    }
    await sendDigestEmail(d);
  } catch (e) {
    console.error('[send-audit-digest] FAILED:', e.message);
  }
}

// ---------- scheduler ----------

let lastRunDay = null;

function tick() {
  const now = pacificNow();
  const today = now.toISOString().split('T')[0];
  if (now.getHours() === DIGEST_HOUR_PT && now.getMinutes() === DIGEST_MINUTE && lastRunDay !== today) {
    lastRunDay = today;
    runDigestJob();
  }
}

function start() {
  console.log(`[send-audit-digest] scheduler started - will run daily at ${DIGEST_HOUR_PT}:${String(DIGEST_MINUTE).padStart(2,'0')} PT`);
  // Check every minute
  setInterval(tick, 60 * 1000);
  // Also run once on startup if it's already past 6 AM today and we haven't run yet
  // (commented out by default - uncomment to enable startup catch-up)
  // tick();
}

module.exports = { start, runDigestJob, buildDigest, renderDigestHTML };
