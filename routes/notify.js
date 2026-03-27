// ============================================================================
// ADMIN NOTIFY ROUTE — AuditDNA
// Save to: C:\AuditDNA\backend\routes\notify.js
// Fires on: user login, admin login, registration request
// Channels: Zadarma SMS + ntfy.sh push (instant smartwatch ping)
// ============================================================================

const express  = require('express');
const router   = express.Router();
const crypto   = require('crypto');
const https    = require('https');

// ── Config ──────────────────────────────────────────────────────────────────
const ADMIN_US_PHONE   = process.env.ADMIN_US_PHONE   || '+18312513116';
const ADMIN_MX_PHONE   = process.env.ADMIN_MX_PHONE   || '+526463402686';
const ZADARMA_KEY      = process.env.ZADARMA_API_KEY  || '';
const ZADARMA_SECRET   = process.env.ZADARMA_API_SECRET || '';
const NTFY_TOPIC       = process.env.NTFY_TOPIC       || 'auditdna-saul-alerts-x9k2';
const SMTP_HOST        = process.env.SMTP_HOST        || 'smtpout.secureserver.net';
const SMTP_PORT        = parseInt(process.env.SMTP_PORT || '465');
const SMTP_USER        = process.env.SMTP_USER        || 'saul@mexausafg.com';
const SMTP_PASS        = process.env.SMTP_PASS        || '';

// ── Zadarma SMS ──────────────────────────────────────────────────────────────
async function sendZadarmaSMS(to, message) {
  if (!ZADARMA_KEY || !ZADARMA_SECRET) {
    console.log(`[NOTIFY] Zadarma not configured. SMS to ${to}: ${message}`);
    return false;
  }
  try {
    const params = new URLSearchParams({ number: to, message, caller_id: ADMIN_US_PHONE });
    const paramStr = params.toString();
    const hash = crypto.createHmac('sha1', ZADARMA_SECRET)
      .update('/v1/sms/send/' + paramStr + crypto.createHash('md5').update(paramStr).digest('hex'))
      .digest('base64');
    const authStr = `${ZADARMA_KEY}:${hash}`;

    const res = await fetch(`https://api.zadarma.com/v1/sms/send/?${paramStr}`, {
      headers: { Authorization: authStr }
    });
    const data = await res.json();
    console.log(`[NOTIFY] Zadarma SMS to ${to}:`, data.status);
    return data.status === 'success';
  } catch (err) {
    console.error('[NOTIFY] Zadarma SMS error:', err.message);
    return false;
  }
}

// ── ntfy.sh Push (instant — no credentials needed) ───────────────────────────
async function sendPush(title, body, priority = 'high') {
  try {
    const res = await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method:  'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Title':        title,
        'Priority':     priority,
        'Tags':         'bell,lock',
      },
      body: body
    });
    console.log(`[NOTIFY] ntfy.sh push: ${res.status}`);
    return res.ok;
  } catch (err) {
    console.error('[NOTIFY] ntfy.sh error:', err.message);
    return false;
  }
}

// ── Nodemailer email alert ────────────────────────────────────────────────────
async function sendAlertEmail(subject, text) {
  if (!SMTP_PASS) return;
  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST, port: SMTP_PORT, secure: true,
      auth: { user: SMTP_USER, pass: SMTP_PASS }
    });
    await transporter.sendMail({
      from: `"AuditDNA Alert" <${SMTP_USER}>`,
      to:   SMTP_USER,
      subject,
      text
    });
    console.log('[NOTIFY] Alert email sent');
  } catch (err) {
    console.error('[NOTIFY] Email error:', err.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/notify/admin-alert
// Called by Brain events on login and registration
// Body: { type, email, role, company, entity, timestamp, agent }
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/admin-alert', async (req, res) => {
  const { type, email, role, company, entity, timestamp, agent } = req.body || {};
  const ts  = new Date(timestamp || Date.now()).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
  const ip  = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';

  let smsText  = '';
  let pushTitle = '';
  let pushBody  = '';
  let emailSubject = '';
  let emailText = '';

  if (type === 'ADMIN_LOGIN') {
    pushTitle    = 'ADMIN LOGIN — AuditDNA';
    pushBody     = `Admin authenticated at ${ts} | IP: ${ip}`;
    smsText      = `AuditDNA: ADMIN LOGIN @ ${ts}`;
    emailSubject = 'AuditDNA — Admin Login Detected';
    emailText    = `Admin login at ${ts}\nIP: ${ip}\nAgent: ${agent || 'unknown'}`;
  } else if (type === 'CLIENT_LOGIN') {
    pushTitle    = `CLIENT LOGIN — ${email || 'unknown'}`;
    pushBody     = `${email} | Role: ${role || 'client'} | ${ts}`;
    smsText      = `AuditDNA: LOGIN ${email} @ ${ts}`;
    emailSubject = `AuditDNA — Client Login: ${email}`;
    emailText    = `Client: ${email}\nRole: ${role}\nTime: ${ts}\nIP: ${ip}`;
  } else if (type === 'REGISTRATION_REQUEST_SUBMITTED') {
    pushTitle    = `NEW REGISTRATION — ${company || email}`;
    pushBody     = `${company} | ${entity} | ${email} | ${ts}`;
    smsText      = `AuditDNA: NEW REG ${company} (${entity}) @ ${ts}`;
    emailSubject = `AuditDNA — New Registration: ${company}`;
    emailText    = `Company: ${company}\nEntity: ${entity}\nEmail: ${email}\nTime: ${ts}\nIP: ${ip}`;
  } else {
    pushTitle = `AuditDNA Alert — ${type}`;
    pushBody  = `${email || ''} @ ${ts}`;
    smsText   = `AuditDNA: ${type} @ ${ts}`;
  }

  // Fire all channels in parallel — don't block response
  res.json({ success: true, type, ts });

  // Async notifications after response
  setImmediate(async () => {
    await Promise.allSettled([
      sendPush(pushTitle, pushBody),
      sendZadarmaSMS(ADMIN_US_PHONE, smsText),
      sendAlertEmail(emailSubject, emailText),
    ]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/notify/test
// Quick test endpoint — hit this to verify your smartwatch gets pinged
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/test', async (req, res) => {
  const ts = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
  await Promise.allSettled([
    sendPush('AuditDNA TEST PING', `Test fired at ${ts} — smartwatch check`),
    sendZadarmaSMS(ADMIN_US_PHONE, `AuditDNA: TEST PING @ ${ts}`),
  ]);
  res.json({ success: true, message: 'Test ping fired', ntfy_topic: NTFY_TOPIC, ts });
});

module.exports = router;