// =============================================================================
// SWARM NOTIFIER (v3 - bulletproof + debug logging)
// File: C:\AuditDNA\backend\services\swarm-notifier.js
// =============================================================================

'use strict';

const https = require('https');
const nodemailer = require('nodemailer');
const { Pool: PgPool } = require('pg');

// IMPORTANT: read env vars FRESH on each call, not at module load time.
// This avoids stale captures when env was updated between restarts.
function env(k, dflt = '') { return process.env[k] || dflt; }

const THROTTLE_MS = 5 * 60 * 1000;
const SEVERITY_TEXT_TO_INT = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };
const throttleMap = new Map();

console.log('[notifier] module loaded - SMTP_PASS len at load:', (process.env.SMTP_PASS || '').length, 'SMTP_USER:', process.env.SMTP_USER || '<unset>');

// ----------------------------------------------------------------------------
// Mailer - fresh transport every time (no caching - prevents stale env issues)
// ----------------------------------------------------------------------------
function buildMailer() {
  const pass = env('SMTP_PASS');
  const user = env('SMTP_USER', 'saul@mexausafg.com');
  if (!pass) {
    console.error('[notifier] buildMailer: SMTP_PASS is empty - cannot build transporter');
    return null;
  }
  try {
    const t = nodemailer.createTransport({
      host: env('SMTP_HOST', 'smtp.gmail.com'),
      port: parseInt(env('SMTP_PORT', '587'), 10),
      secure: false,
      auth: { user, pass }
    });
    return t;
  } catch (err) {
    console.error('[notifier] buildMailer threw:', err.message);
    return null;
  }
}

// ----------------------------------------------------------------------------
// BRAIN channel - DB write
// ----------------------------------------------------------------------------
let brainPool = null;
function getBrainPool() {
  if (brainPool) return brainPool;
  try {
    brainPool = new PgPool({
      host: env('DB_HOST', 'localhost'),
      port: parseInt(env('DB_PORT', '5432'), 10),
      database: env('DB_NAME', 'auditdna'),
      user: env('DB_USER', 'postgres'),
      password: env('DB_PASSWORD'),
      max: 2
    });
    brainPool.on('error', () => {});
    return brainPool;
  } catch { return null; }
}

async function writeBrainEvent({ event_type, agent_id, severity_int, payload }) {
  const p = getBrainPool();
  if (!p) return false;
  try {
    await p.query(
      `INSERT INTO brain_events (event_type, payload, agent_id, severity, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        (event_type || 'agent.alert').slice(0, 100),
        payload ? JSON.stringify(payload) : null,
        (agent_id || 'unknown').toString().slice(0, 64),
        severity_int
      ]
    );
    return true;
  } catch (err) {
    console.error('[notifier] brain DB write failed:', err.message);
    return false;
  }
}

async function sendToBrain({ agent, event_type, severity, summary, context }) {
  const severity_int = SEVERITY_TEXT_TO_INT[severity] ?? 1;
  const payload = { severity, summary, ...context };
  try {
    if (typeof global.brainEmit === 'function') {
      global.brainEmit({
        event: event_type, agent_id: agent, severity: severity_int, ...payload
      });
      return true;
    }
  } catch {}
  return await writeBrainEvent({ event_type, agent_id: agent, severity_int, payload });
}

// ----------------------------------------------------------------------------
// NTFY (smartwatch)
// ----------------------------------------------------------------------------
function sendToNtfy({ agent, severity, summary, context }) {
  return new Promise((resolve) => {
    const topic = env('NTFY_TOPIC', 'auditdna-agro-saul2026');
    const priority = severity === 'critical' ? '5' : severity === 'high' ? '4' : severity === 'medium' ? '3' : '2';
    const tags = severity === 'critical' ? 'rotating_light,red_circle' : severity === 'high' ? 'warning' : 'gear';
    const title = `[${agent}] ${severity.toUpperCase()}`;
    const body  = summary + (context && context.error ? `\n\nError: ${context.error}` : '');

    const opts = {
      hostname: 'ntfy.sh', port: 443, path: '/' + topic, method: 'POST',
      headers: { 'Title': title, 'Priority': priority, 'Tags': tags, 'Content-Type': 'text/plain' },
      timeout: 5000
    };

    const req = https.request(opts, (res) => {
      res.on('data', () => {});
      res.on('end', () => resolve(res.statusCode === 200));
    });
    req.on('error', (e) => { console.error('[notifier] ntfy error:', e.message); resolve(false); });
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.write(body);
    req.end();
  });
}

// ----------------------------------------------------------------------------
// EMAIL (Gmail API first - Railway-safe, SMTP fallback for local)
// ----------------------------------------------------------------------------
async function sendToEmail({ agent, severity, summary, context }) {
  console.log('[notifier-email] entry: agent=', agent, 'severity=', severity);

  const tag = severity === 'critical' ? '[CRITICAL]' : severity === 'high' ? '[HIGH]' : '[ALERT]';
  const subject = `${tag} ${agent}: ${summary.slice(0, 80)}`;
  const lines = [
    `Agent:    ${agent}`,
    `Severity: ${severity}`,
    `Time:     ${new Date().toISOString()}`,
    '',
    `Summary:`,
    summary,
    ''
  ];
  if (context && Object.keys(context).length > 0) {
    lines.push('Context:');
    lines.push(JSON.stringify(context, null, 2));
  }
  const text = lines.join('\n');
  const to = env('ALERT_EMAIL', 'saul@mexausafg.com');

  // Path 1: Gmail API via routes/gmail.js (HTTPS port 443 - works on Railway)
  try {
    const gmailRoute = require('../routes/gmail');
    if (gmailRoute && typeof gmailRoute.gmailApiSend === 'function') {
      console.log('[notifier-email] trying Gmail API to=', to, 'subject=', subject.slice(0, 60));
      const info = await gmailRoute.gmailApiSend({
        to: to,
        subject: subject,
        text: text,
        html: '<pre style="font-family:monospace;font-size:12px;line-height:1.5">' + text.replace(/</g,'&lt;') + '</pre>',
        attachments: []
      });
      console.log('[notifier-email] Gmail API SUCCESS messageId=', info.messageId);
      return true;
    }
  } catch (apiErr) {
    console.warn('[notifier-email] Gmail API failed, falling back to SMTP:', apiErr.message);
  }

  // Path 2: SMTP fallback (works locally; blocked on Railway but try anyway)
  const m = buildMailer();
  if (!m) {
    console.error('[notifier-email] Gmail API unavailable AND buildMailer returned null - aborting');
    return false;
  }
  console.log('[notifier-email] attempting SMTP sendMail to=', to, 'subject=', subject.slice(0, 60));

  try {
    const info = await m.sendMail({
      from: 'Saul Garcia | Mexausa Food Group <saul@mexausafg.com>',
      to,
      subject,
      text: text
    });
    console.log('[notifier-email] SMTP SUCCESS messageId=', info.messageId);
    return true;
  } catch (err) {
    console.error('[notifier-email] SMTP FAILED message=', err.message);
    console.error('[notifier-email] SMTP FAILED code=', err.code);
    console.error('[notifier-email] SMTP FAILED response=', err.response);
    return false;
  }
}

// ----------------------------------------------------------------------------
// Public: notify
// ----------------------------------------------------------------------------
async function notify({ agent, event_type, severity = 'low', summary, context = {} }) {
  if (!agent || !summary) return { ok: false, error: 'missing agent or summary' };

  const key = `${agent}:${event_type || 'default'}`;
  const last = throttleMap.get(key) || 0;
  const now  = Date.now();
  const throttled = (now - last) < THROTTLE_MS && severity !== 'critical';
  throttleMap.set(key, now);

  const tag = severity === 'critical' ? '[CRITICAL]' : `[${severity.toUpperCase()}]`;
  console.log(`${tag} [${agent}] ${summary}`);

  // Brain channel - always try
  let brainOk = false;
  try {
    brainOk = await sendToBrain({ agent, event_type: event_type || 'agent.alert', severity, summary, context });
  } catch (err) {
    console.error('[notifier] sendToBrain threw:', err.message);
  }

  if (throttled) return { ok: true, throttled: true, brain: brainOk };

  // ntfy + email by severity
  let ntfyOk = false, emailOk = false;
  if (severity === 'medium' || severity === 'high' || severity === 'critical') {
    try { ntfyOk = await sendToNtfy({ agent, severity, summary, context }); }
    catch (err) { console.error('[notifier] sendToNtfy threw:', err.message); }
  }
  if (severity === 'high' || severity === 'critical') {
    try { emailOk = await sendToEmail({ agent, severity, summary, context }); }
    catch (err) { console.error('[notifier] sendToEmail threw:', err.message); }
  }

  return { ok: true, throttled: false, brain: brainOk, ntfy: ntfyOk, email: emailOk };
}

const info     = (agent, summary, context, event_type) => notify({ agent, severity: 'info',     summary, context, event_type });
const low      = (agent, summary, context, event_type) => notify({ agent, severity: 'low',      summary, context, event_type });
const medium   = (agent, summary, context, event_type) => notify({ agent, severity: 'medium',   summary, context, event_type });
const high     = (agent, summary, context, event_type) => notify({ agent, severity: 'high',     summary, context, event_type });
const critical = (agent, summary, context, event_type) => notify({ agent, severity: 'critical', summary, context, event_type });

module.exports = { notify, info, low, medium, high, critical };
