// =============================================================================
// SWARM NOTIFIER - 4-channel alert pipeline
// File: C:\AuditDNA\backend\services\swarm-notifier.js
//
// Channels (configurable per call):
//   1. BRAIN          - posts to brain_events table (visible in COMMAND SPHERE)
//   2. NTFY           - smartwatch push via ntfy.sh (topic: auditdna-agro-saul2026)
//   3. EMAIL          - to sgarcia1911@gmail.com via Gmail SMTP (lands on his phone)
//   4. CONSOLE        - always on
//
// Severity-based routing:
//   - low/info     -> brain + console
//   - medium       -> brain + console + ntfy
//   - high         -> brain + console + ntfy + email
//   - critical     -> brain + console + ntfy + email (with [CRITICAL] tag)
//
// Throttling: same agent + same event_type within 5 min = brain only (no spam)
// =============================================================================

'use strict';

const https = require('https');
const nodemailer = require('nodemailer');

const NTFY_TOPIC      = process.env.NTFY_TOPIC || 'auditdna-agro-saul2026';
const ALERT_EMAIL     = process.env.ALERT_EMAIL || 'sgarcia1911@gmail.com';
const SMTP_HOST       = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT       = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER       = process.env.SMTP_USER || 'sgarcia1911@gmail.com';
const SMTP_PASS       = process.env.SMTP_PASS;       // app password from env
const THROTTLE_MS     = 5 * 60 * 1000;

// Throttle map: key = agent:event_type, value = last_sent_at
const throttleMap = new Map();

let mailer = null;
function getMailer() {
  if (mailer) return mailer;
  if (!SMTP_PASS) return null;
  mailer = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
  return mailer;
}

// ----------------------------------------------------------------------------
// Channel: BRAIN
// ----------------------------------------------------------------------------
function sendToBrain({ agent, event_type, severity, summary, context }) {
  try {
    if (typeof global.brainEmit === 'function') {
      global.brainEmit({
        event: event_type,
        source_module: agent,
        severity,
        summary,
        ...context
      });
      return true;
    }
  } catch (err) {
    console.error('[notifier] brain emit failed:', err.message);
  }
  return false;
}

// ----------------------------------------------------------------------------
// Channel: NTFY (smartwatch push)
// ----------------------------------------------------------------------------
function sendToNtfy({ agent, severity, summary, context }) {
  return new Promise((resolve) => {
    const priority = (severity === 'critical') ? '5' : (severity === 'high') ? '4' : (severity === 'medium') ? '3' : '2';
    const tags = severity === 'critical' ? 'rotating_light,red_circle' : severity === 'high' ? 'warning' : 'gear';
    const title = `[${agent}] ${severity.toUpperCase()}`;
    const body  = summary + (context?.error ? `\n\nError: ${context.error}` : '');

    const opts = {
      hostname: 'ntfy.sh',
      port: 443,
      path: '/' + NTFY_TOPIC,
      method: 'POST',
      headers: {
        'Title':    title,
        'Priority': priority,
        'Tags':     tags,
        'Content-Type': 'text/plain'
      },
      timeout: 5000
    };

    const req = https.request(opts, (res) => {
      res.on('data', () => {});
      res.on('end', () => resolve(res.statusCode === 200));
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.write(body);
    req.end();
  });
}

// ----------------------------------------------------------------------------
// Channel: EMAIL (to phone)
// ----------------------------------------------------------------------------
async function sendToEmail({ agent, severity, summary, context }) {
  const m = getMailer();
  if (!m) return false;

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

  try {
    await m.sendMail({
      from: 'Saul Garcia | Mexausa Food Group <sgarcia1911@gmail.com>',
      to: ALERT_EMAIL,
      subject,
      text: lines.join('\n')
    });
    return true;
  } catch (err) {
    console.error('[notifier] email failed:', err.message);
    return false;
  }
}

// ----------------------------------------------------------------------------
// Public: notify
// ----------------------------------------------------------------------------
async function notify({ agent, event_type, severity = 'low', summary, context = {} }) {
  if (!agent || !summary) return { ok: false, error: 'missing agent or summary' };

  // Throttle key = agent:event_type
  const key = `${agent}:${event_type || 'default'}`;
  const last = throttleMap.get(key) || 0;
  const now  = Date.now();
  const throttled = (now - last) < THROTTLE_MS && severity !== 'critical';
  throttleMap.set(key, now);

  // Always log to console
  const tag = severity === 'critical' ? '[CRITICAL]' : `[${severity.toUpperCase()}]`;
  console.log(`${tag} [${agent}] ${summary}`);

  // Always emit to brain
  const brainOk = sendToBrain({ agent, event_type: event_type || 'agent.alert', severity, summary, context });

  // If throttled, stop here (brain only)
  if (throttled) {
    return { ok: true, throttled: true, brain: brainOk };
  }

  // Severity-based escalation
  let ntfyOk = false, emailOk = false;
  if (severity === 'medium' || severity === 'high' || severity === 'critical') {
    ntfyOk = await sendToNtfy({ agent, severity, summary, context });
  }
  if (severity === 'high' || severity === 'critical') {
    emailOk = await sendToEmail({ agent, severity, summary, context });
  }

  return { ok: true, throttled: false, brain: brainOk, ntfy: ntfyOk, email: emailOk };
}

// Convenience helpers
const info     = (agent, summary, context, event_type) => notify({ agent, severity: 'info',     summary, context, event_type });
const low      = (agent, summary, context, event_type) => notify({ agent, severity: 'low',      summary, context, event_type });
const medium   = (agent, summary, context, event_type) => notify({ agent, severity: 'medium',   summary, context, event_type });
const high     = (agent, summary, context, event_type) => notify({ agent, severity: 'high',     summary, context, event_type });
const critical = (agent, summary, context, event_type) => notify({ agent, severity: 'critical', summary, context, event_type });

module.exports = { notify, info, low, medium, high, critical };
