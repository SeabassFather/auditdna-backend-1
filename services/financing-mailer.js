// ============================================================
// financing-mailer.js — INTERNAL SERVICE
// Sends factoring-deal notification emails to financing partners
// FROM: saul@mexausafg.com
// Each email contains two signed-JWT decision links (accept/pass)
// so partners don't need to log into any dashboard.
// ============================================================
'use strict';

const nodemailer = require('nodemailer');
const crypto = require('crypto');

const FROM_EMAIL   = 'saul@mexausafg.com';
const FROM_NAME    = 'Saul Garcia — Mexausa Food Group, Inc.';
const REPLY_TO     = 'saul@mexausafg.com';
const DECISION_BASE_URL = process.env.PARTNER_DECISION_URL
  || 'http://localhost:5050/api/financing/decision-link';
const DECISION_SECRET = process.env.FINANCING_DECISION_SECRET
  || 'CHANGE_ME_IN_ENV_financing_decision_signing_secret_2026';

// ------------------------------------------------------------
// SMTP transport (uses existing GoDaddy credentials from .env)
// ------------------------------------------------------------
let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtpout.secureserver.net',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: (process.env.SMTP_SECURE || 'true') === 'true',
    auth: {
      user: process.env.SMTP_USER || FROM_EMAIL,
      pass: process.env.SMTP_PASS
    }
  });
  return transporter;
}

// ------------------------------------------------------------
// Sign a decision link — simple HMAC token, expires in 14 days
// ------------------------------------------------------------
function signDecisionToken(dealId, partnerId, decision) {
  const expiresAt = Date.now() + 14 * 24 * 60 * 60 * 1000;
  const payload = `${dealId}|${partnerId}|${decision}|${expiresAt}`;
  const sig = crypto.createHmac('sha256', DECISION_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}|${sig}`).toString('base64url');
}

function verifyDecisionToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parts = decoded.split('|');
    if (parts.length !== 5) return null;
    const [dealId, partnerId, decision, expiresAt, sig] = parts;
    const payload = `${dealId}|${partnerId}|${decision}|${expiresAt}`;
    const expected = crypto.createHmac('sha256', DECISION_SECRET).update(payload).digest('hex');
    if (sig !== expected) return null;
    if (Date.now() > parseInt(expiresAt, 10)) return { expired: true };
    return { dealId, partnerId, decision, expiresAt: parseInt(expiresAt, 10) };
  } catch {
    return null;
  }
}

// ------------------------------------------------------------
// Build the HTML email body
// Partner sees the deal details — NOT the client's internal contact info
// ------------------------------------------------------------
function buildPartnerEmail(deal, partner) {
  const acceptToken = signDecisionToken(deal.id, partner.id, 'accepted');
  const passToken   = signDecisionToken(deal.id, partner.id, 'passed');
  const acceptUrl = `${DECISION_BASE_URL}?token=${acceptToken}`;
  const passUrl   = `${DECISION_BASE_URL}?token=${passToken}`;

  const fmt = (n) => n == null ? '—' : `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const subject = `New Factoring Deal — ${deal.id} — ${deal.commodity || 'Produce'} — ${fmt(deal.amount_requested)}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Georgia,'Times New Roman',serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;padding:24px;">
    <tr><td style="background:#0f172a;color:#cba658;padding:18px 24px;border-radius:4px 4px 0 0;">
      <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;opacity:0.7;">Mexausa Food Group, Inc.</div>
      <div style="font-size:20px;font-weight:600;margin-top:4px;">New Factoring Deal for Review</div>
    </td></tr>
    <tr><td style="background:#ffffff;padding:24px;border:1px solid #e5e7eb;border-top:none;">
      <p style="margin:0 0 14px;font-size:14px;line-height:1.6;">
        ${partner.contact_name || 'Team'},
      </p>
      <p style="margin:0 0 18px;font-size:14px;line-height:1.6;">
        A new factoring opportunity is available for ${partner.role === 'primary' ? 'primary' : 'secondary'} review.
        Please respond by clicking Accept or Pass below.
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0;border:1px solid #e5e7eb;border-radius:4px;">
        <tr><td style="padding:14px 16px;background:#f9fafb;border-bottom:1px solid #e5e7eb;">
          <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;">Deal ID</div>
          <div style="font-size:14px;font-weight:600;margin-top:3px;">${deal.id}</div>
        </td></tr>
        <tr><td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;">
          <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;">Commodity</div>
          <div style="font-size:14px;margin-top:3px;">${deal.commodity || '—'}</div>
        </td></tr>
        <tr><td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;">
          <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;">Amount Requested</div>
          <div style="font-size:18px;font-weight:600;color:#b8944d;margin-top:3px;">${fmt(deal.amount_requested)} ${deal.currency || 'USD'}</div>
        </td></tr>
        <tr><td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;">
          <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;">Advance %</div>
          <div style="font-size:14px;margin-top:3px;">${deal.advance_percent != null ? deal.advance_percent + '%' : '—'}</div>
        </td></tr>
        <tr><td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;">
          <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;">Term</div>
          <div style="font-size:14px;margin-top:3px;">${deal.term_days ? deal.term_days + ' days' : '—'}</div>
        </td></tr>
        <tr><td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;">
          <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;">Client Type</div>
          <div style="font-size:14px;margin-top:3px;">${deal.client_type || 'buyer'}</div>
        </td></tr>
        <tr><td style="padding:14px 16px;">
          <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;">Notes</div>
          <div style="font-size:13px;margin-top:3px;line-height:1.5;color:#334155;">${(deal.notes || 'No additional notes provided.').replace(/</g, '&lt;')}</div>
        </td></tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 8px;">
        <tr>
          <td align="center" style="padding:0 6px;">
            <a href="${acceptUrl}" style="display:inline-block;padding:14px 28px;background:#cba658;color:#0f172a;font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;border-radius:3px;">Accept Deal</a>
          </td>
          <td align="center" style="padding:0 6px;">
            <a href="${passUrl}" style="display:inline-block;padding:14px 28px;background:#ffffff;color:#334155;font-size:13px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;border-radius:3px;border:1px solid #cbd5e1;">Pass on Deal</a>
          </td>
        </tr>
      </table>

      <p style="margin:18px 0 0;font-size:11px;color:#64748b;line-height:1.5;">
        Links above are signed and expire in 14 days. Reply to this email if you need additional information,
        want to discuss terms, or have any conditions before committing.
      </p>
    </td></tr>
    <tr><td style="background:#0f172a;color:#94a3b8;padding:14px 24px;font-size:11px;text-align:center;border-radius:0 0 4px 4px;">
      Mexausa Food Group, Inc. &nbsp;|&nbsp; PACA #20241168 &nbsp;|&nbsp; saul@mexausafg.com
    </td></tr>
  </table>
</body>
</html>`.trim();

  const text = `
${partner.contact_name || 'Team'},

A new factoring opportunity is available for ${partner.role === 'primary' ? 'primary' : 'secondary'} review.

Deal ID:          ${deal.id}
Commodity:        ${deal.commodity || '-'}
Amount:           ${fmt(deal.amount_requested)} ${deal.currency || 'USD'}
Advance:          ${deal.advance_percent != null ? deal.advance_percent + '%' : '-'}
Term:             ${deal.term_days ? deal.term_days + ' days' : '-'}
Client Type:      ${deal.client_type || 'buyer'}
Notes:            ${deal.notes || 'None'}

To ACCEPT: ${acceptUrl}
To PASS:   ${passUrl}

Links expire in 14 days. Reply to this email for questions.

Saul Garcia
Mexausa Food Group, Inc.
PACA #20241168
  `.trim();

  return { subject, html, text };
}

// ------------------------------------------------------------
// SEND PARTNER NOTIFICATION
// ------------------------------------------------------------
async function sendPartnerNotification(deal, partner) {
  const { subject, html, text } = buildPartnerEmail(deal, partner);
  const t = getTransporter();

  const info = await t.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: partner.contact_email,
    replyTo: REPLY_TO,
    subject,
    html,
    text
  });

  return {
    sent: true,
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected
  };
}

// ------------------------------------------------------------
// SEND SAUL ALERT — when deal hits a critical state
// ------------------------------------------------------------
async function sendSaulAlert(subject, bodyText) {
  const t = getTransporter();
  const info = await t.sendMail({
    from: `"AuditDNA Financing Engine" <${FROM_EMAIL}>`,
    to: FROM_EMAIL,
    subject: `[Financing] ${subject}`,
    text: bodyText
  });
  return info;
}

module.exports = {
  sendPartnerNotification,
  sendSaulAlert,
  signDecisionToken,
  verifyDecisionToken,
  FROM_EMAIL
};