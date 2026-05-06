/**
 * brevo-universal.js
 *
 * Save to: C:\AuditDNA\backend\services\brevo-universal.js
 *
 * SINGLE SOURCE OF TRUTH for Brevo HTTP API sends across the platform.
 * Replaces 4 duplicate implementations:
 *   - routes/gmail.js         sendViaBrevo()
 *   - services/sourcing-blast.js  sendViaBrevoApi()
 *   - services/blind-matcher.js   inline fetch
 *   - routes/match-engine.routes.js inline fetch (debug endpoint)
 *
 * Built-in:
 *   1. Audit logging via writeAuditRow (every send hits email_activity_log)
 *   2. Suppression check via filterSuppressed (skip dead/bouncing addresses)
 *   3. Sender enforcement (defaults to saul@mexausafg.com - DKIM verified)
 *   4. Standardized error handling + return shape
 *
 * Usage:
 *   const { sendBrevo } = require('./brevo-universal');
 *   const result = await sendBrevo({
 *     to:        'recipient@example.com',
 *     toName:    'Recipient Name',
 *     subject:   'Hello',
 *     html:      '<p>Body</p>',
 *     text:      'Plain text',           // optional
 *     fromEmail: 'saul@mexausafg.com',   // optional, defaults to saul@mexausafg.com
 *     fromName:  'Saul Garcia',          // optional
 *     replyTo:   'saul@mexausafg.com',   // optional
 *     senderEmail: 'saul@mexausafg.com', // for audit log - who initiated send
 *     agentId:   'BLIND_MATCHER',        // optional - for audit log
 *     attachmentCount: 0,                // optional - for audit log
 *     skipSuppressionCheck: false        // optional - bypass suppression filter
 *   });
 *
 * Returns: { ok: true, messageId, suppressed: false }
 *       OR { ok: false, suppressed: true, reason: 'suppressed' }
 *       OR throws on actual API failure
 */

'use strict';

const { writeAuditRow } = require('./send-audit-writer');
const { isSuppressed } = require('./email-suppression-check');

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';
const DEFAULT_FROM_EMAIL = process.env.SMTP_FROM || 'saul@mexausafg.com';
const DEFAULT_FROM_NAME  = process.env.SMTP_FROM_NAME || 'Saul Garcia | Mexausa Food Group';

/**
 * Send a single email via Brevo HTTP API.
 * Handles suppression check + audit log automatically.
 *
 * @param {Object} args
 * @returns {Object} { ok, messageId?, suppressed?, reason? }
 */
async function sendBrevo(args) {
  const {
    to,
    toName       = '',
    subject      = '',
    html         = '',
    text         = '',
    fromEmail    = DEFAULT_FROM_EMAIL,
    fromName     = DEFAULT_FROM_NAME,
    replyTo      = null,
    senderEmail  = fromEmail,
    agentId      = null,
    attachmentCount = 0,
    skipSuppressionCheck = false
  } = args || {};

  if (!to) throw new Error('[brevo-universal] missing required field: to');
  if (!subject) throw new Error('[brevo-universal] missing required field: subject');
  if (!html && !text) throw new Error('[brevo-universal] missing body: html or text required');

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('[brevo-universal] BREVO_API_KEY env var not set on Railway');

  // 1. SUPPRESSION CHECK
  if (!skipSuppressionCheck) {
    try {
      if (await isSuppressed(to)) {
        console.log(`[brevo-universal] SUPPRESSED - skipping ${to}`);
        return { ok: false, suppressed: true, reason: 'suppressed' };
      }
    } catch (e) {
      console.error('[brevo-universal] suppression check failed (allowing through):', e.message);
    }
  }

  // 2. BUILD PAYLOAD
  const payload = {
    sender: { name: fromName, email: fromEmail },
    to: [{ email: to, name: toName || to }],
    subject: subject,
    htmlContent: html || `<p>${text}</p>`,
  };
  if (text) payload.textContent = text;
  if (replyTo) {
    payload.replyTo = typeof replyTo === 'string'
      ? { email: replyTo }
      : replyTo;
  }

  // 3. POST TO BREVO
  const fetchFn = global.fetch || require('node-fetch');
  const resp = await fetchFn(BREVO_ENDPOINT, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '<no body>');
    throw new Error(`[brevo-universal] Brevo HTTP ${resp.status}: ${errText.slice(0, 300)}`);
  }

  const data = await resp.json().catch(() => ({}));
  const messageId = data.messageId || `brevo-${Date.now()}`;

  // 4. AUDIT LOG (non-blocking)
  try {
    writeAuditRow({
      senderEmail,
      recipientEmail: to,
      recipientName: toName,
      subject,
      body: html || text,
      attachmentCount,
      recipientCount: 1,
      blastId: null,
      gmailMessageId: messageId,
      agentId,
      transport: 'brevo'
    });
  } catch (e) {
    console.error('[brevo-universal] audit write failed (send still succeeded):', e.message);
  }

  return { ok: true, messageId, suppressed: false, transport: 'brevo' };
}

/**
 * Bulk send via Brevo - fans out to multiple recipients with throttling.
 * Returns { sent, failed, suppressed, results: [...] }
 */
async function sendBrevoBulk(recipients, template, options = {}) {
  const {
    throttleMs = 100,
    senderEmail,
    agentId,
    fromEmail = DEFAULT_FROM_EMAIL,
    fromName  = DEFAULT_FROM_NAME,
    replyTo
  } = options;

  let sent = 0, failed = 0, suppressed = 0;
  const results = [];

  for (const r of recipients) {
    try {
      const email = typeof r === 'string' ? r : r.email;
      const name  = typeof r === 'string' ? '' : (r.name || r.contact_name || '');
      if (!email) { failed++; continue; }

      const result = await sendBrevo({
        to: email,
        toName: name,
        subject: template.subject,
        html: template.html,
        text: template.text,
        fromEmail,
        fromName,
        replyTo,
        senderEmail,
        agentId
      });

      if (result.suppressed) {
        suppressed++;
        results.push({ email, suppressed: true });
      } else {
        sent++;
        results.push({ email, success: true, messageId: result.messageId });
      }
    } catch (e) {
      failed++;
      results.push({ email: r.email || r, success: false, error: e.message });
    }

    if (throttleMs > 0) await new Promise(res => setTimeout(res, throttleMs));
  }

  return { sent, failed, suppressed, results, total: recipients.length };
}

module.exports = { sendBrevo, sendBrevoBulk };
