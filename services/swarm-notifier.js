// =============================================================================
// SWARM NOTIFIER (schema-correct v2)
// File: C:\AuditDNA\backend\services\swarm-notifier.js
//
// 4 channels: BRAIN (DB) + NTFY (smartwatch) + EMAIL (phone) + CONSOLE
//
// brain_events schema (verified): (id, event_type, payload, created_at, deal_id, agent_id, severity, actor_id)
//   severity = smallint 0-4
// =============================================================================

'use strict';

const https = require('https');
const nodemailer = require('nodemailer');
const { Pool: PgPool } = require('pg');

const NTFY_TOPIC      = process.env.NTFY_TOPIC || 'auditdna-agro-saul2026';
const ALERT_EMAIL     = process.env.ALERT_EMAIL || 'sgarcia1911@gmail.com';
const SMTP_HOST       = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT       = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER       = process.env.SMTP_USER || 'sgarcia1911@gmail.com';
const SMTP_PASS       = process.env.SMTP_PASS;
const THROTTLE_MS     = 5 * 60 * 1000;

// Severity text -> smallint (matches brain_events.severity column)
const SEVERITY_TEXT_TO_INT = {
  info: 0, low: 1, medium: 2, high: 3, critical: 4
};

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
// BRAIN channel - direct DB write (works cross-process from MiniAPI too)
// ----------------------------------------------------------------------------
let brainPool = null;
function getBrainPool() {
  if (brainPool) return brainPool;
  try {
    brainPool = new PgPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || 5432, 10),
      database: process.env.DB_NAME || 'auditdna',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
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

  // Try in-process global.brainEmit first (main backend pattern)
  try {
    if (typeof global.brainEmit === 'function') {
      global.brainEmit({
        event: event_type,
        agent_id: agent,
        severity: severity_int,
        ...payload
      });
      return true;
    }
  } catch {}

  // Fallback: write directly to brain_events (works from any process)
  return await writeBrainEvent({ event_type, agent_id: agent, severity_int, payload });
}

// ----------------------------------------------------------------------------
// NTFY channel (smartwatch push)
// ----------------------------------------------------------------------------
function sendToNtfy({ agent, severity, summary, context }) {
  return new Promise((resolve) => {
    const priority = severity === 'critical' ? '5' : severity === 'high' ? '4' : severity === 'medium' ? '3' : '2';
    const tags = severity === 'critical' ? 'rotating_light,red_circle' : severity === 'high' ? 'warning' : 'gear';
    const title = `[${agent}] ${severity.toUpperCase()}`;
    const body  = summary + (context && context.error ? `\n\nError: ${context.error}` : '');

    const opts = {
      hostname: 'ntfy.sh', port: 443, path: '/' + NTFY_TOPIC, method: 'POST',
      headers: {
        'Title': title, 'Priority': priority, 'Tags': tags, 'Content-Type': 'text/plain'
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
// EMAIL channel
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

  const key = `${agent}:${event_type || 'default'}`;
  const last = throttleMap.get(key) || 0;
  const now  = Date.now();
  const throttled = (now - last) < THROTTLE_MS && severity !== 'critical';
  throttleMap.set(key, now);

  // Console
  const tag = severity === 'critical' ? '[CRITICAL]' : `[${severity.toUpperCase()}]`;
  console.log(`${tag} [${agent}] ${summary}`);

  // Brain (always)
  const brainOk = await sendToBrain({ agent, event_type: event_type || 'agent.alert', severity, summary, context });

  if (throttled) return { ok: true, throttled: true, brain: brainOk };

  // ntfy + email by severity
  let ntfyOk = false, emailOk = false;
  if (severity === 'medium' || severity === 'high' || severity === 'critical') {
    ntfyOk = await sendToNtfy({ agent, severity, summary, context });
  }
  if (severity === 'high' || severity === 'critical') {
    emailOk = await sendToEmail({ agent, severity, summary, context });
  }

  return { ok: true, throttled: false, brain: brainOk, ntfy: ntfyOk, email: emailOk };
}

const info     = (agent, summary, context, event_type) => notify({ agent, severity: 'info',     summary, context, event_type });
const low      = (agent, summary, context, event_type) => notify({ agent, severity: 'low',      summary, context, event_type });
const medium   = (agent, summary, context, event_type) => notify({ agent, severity: 'medium',   summary, context, event_type });
const high     = (agent, summary, context, event_type) => notify({ agent, severity: 'high',     summary, context, event_type });
const critical = (agent, summary, context, event_type) => notify({ agent, severity: 'critical', summary, context, event_type });

module.exports = { notify, info, low, medium, high, critical };
