// =============================================================================
// AUDIT NOTIFICATIONS — Router + Notification Functions
// Save to: C:\AuditDNA\backend\routes\audit-notifications.js
// =============================================================================

const express    = require('express');
const router     = express.Router();
const nodemailer = require('nodemailer');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'saul@mexausafg.com';
const FROM_EMAIL  = process.env.EMAIL_FROM  || 'AuditDNA <saul@mexausafg.com>';

let transporter;
try {
  transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST || process.env.EMAIL_SMTP_HOST || 'smtpout.secureserver.net',
    port:   parseInt(process.env.SMTP_PORT || process.env.EMAIL_SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || process.env.EMAIL_SMTP_USER,
      pass: process.env.SMTP_PASS || process.env.EMAIL_SMTP_PASS,
    },
  });
  console.log('[NOTIFICATIONS] SMTP transporter ready');
} catch (e) {
  console.warn('[NOTIFICATIONS] SMTP not configured:', e.message);
}

async function sendEmail(to, subject, html) {
  if (!transporter || !process.env.SMTP_PASS) {
    console.log(`[NOTIFICATIONS] SMTP offline — would send to ${to}: ${subject}`);
    return { accepted: [to], offline: true };
  }
  try {
    const result = await transporter.sendMail({ from: FROM_EMAIL, to, subject, html });
    console.log(`[NOTIFICATIONS] Sent to ${to}: ${subject}`);
    return result;
  } catch (err) {
    console.error(`[NOTIFICATIONS] Send failed to ${to}:`, err.message);
    return { error: err.message };
  }
}

const fmt = (n) => '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

// ── Notification functions ────────────────────────────────────────────────────

async function onCFPBComplaint({ caseId, consumer, violations, fees, selectedPath, loanData }) {
  const violationCount = Array.isArray(violations) ? violations.length : 0;
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;border:1px solid #ddd;border-radius:8px;overflow:hidden;">
    <div style="background:#1e293b;color:#cba658;padding:20px;text-align:center;"><h2 style="margin:0;">CFPB Complaint Filed</h2><p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">AuditDNA Case ${caseId}</p></div>
    <div style="padding:20px;"><table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Consumer</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${consumer?.name || consumer?.email || 'N/A'}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Violations</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;color:#dc2626;">${violationCount}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Total Recovery</td><td style="padding:8px;font-weight:bold;color:#047857;">${fmt(fees?.total)}</td></tr>
    </table></div></div>`;
  return sendEmail(ADMIN_EMAIL, `[CFPB] Case ${caseId} — ${violationCount} Violations — ${fmt(fees?.total)}`, html);
}

async function onEscrowOpenRequest({ caseId, consumer, fees, selectedPath }) {
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;border:1px solid #ddd;border-radius:8px;overflow:hidden;">
    <div style="background:#1e293b;color:#cba658;padding:20px;text-align:center;"><h2 style="margin:0;">Escrow Account Request</h2><p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">AuditDNA Case ${caseId}</p></div>
    <div style="padding:20px;"><table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Consumer</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${consumer?.name || 'N/A'}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Total Recovery</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;color:#047857;">${fmt(fees?.total)}</td></tr>
      <tr><td style="padding:8px;color:#666;">Our Fee</td><td style="padding:8px;">${fmt(fees?.fee)}</td></tr>
    </table></div></div>`;
  return sendEmail(ADMIN_EMAIL, `[ESCROW] Open Request — Case ${caseId} — ${fmt(fees?.total)}`, html);
}

async function onAuditConfirmed({ caseId, consumer, fees }) {
  const consumerEmail = consumer?.email;
  if (!consumerEmail) return { skipped: true };
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;border:1px solid #ddd;border-radius:8px;overflow:hidden;">
    <div style="background:#1e293b;color:#cba658;padding:20px;text-align:center;"><h2 style="margin:0;">Your Audit Has Been Confirmed</h2><p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">Case: ${caseId}</p></div>
    <div style="padding:20px;"><p>Dear ${consumer?.name || 'Valued Client'},</p>
    <p>Your mortgage audit has been authorized. Recovery estimate: <strong>${fmt(fees?.total)}</strong>. You receive: <strong>${fmt(fees?.youReceive)}</strong>.</p>
    <p style="font-size:12px;color:#94a3b8;">AuditDNA | NMLS #337526 | Mexausa Food Group, Inc.</p></div></div>`;
  return sendEmail(consumerEmail, `AuditDNA — Your Audit Is Confirmed — Case ${caseId}`, html);
}

async function onAuditAdminAlert({ caseId, consumer, fees, selectedPath }) {
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;border:1px solid #ddd;border-radius:8px;overflow:hidden;">
    <div style="background:#047857;color:#fff;padding:20px;text-align:center;"><h2 style="margin:0;">NEW AUDIT AUTHORIZED</h2><p style="margin:4px 0 0;font-size:12px;">Case ${caseId}</p></div>
    <div style="padding:20px;"><table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Consumer</td><td style="padding:8px;font-weight:bold;">${consumer?.name || 'N/A'} (${consumer?.email || 'N/A'})</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Recovery</td><td style="padding:8px;font-weight:bold;color:#047857;">${fmt(fees?.total)}</td></tr>
      <tr><td style="padding:8px;color:#666;">Our Fee</td><td style="padding:8px;font-weight:bold;color:#cba658;">${fmt(fees?.fee)}</td></tr>
    </table></div></div>`;
  return sendEmail(ADMIN_EMAIL, `[AUTHORIZED] Case ${caseId} — ${fmt(fees?.fee)} Fee`, html);
}

// ── API Routes ────────────────────────────────────────────────────────────────

router.post('/cfpb', async (req, res) => {
  try { res.json({ success: true, result: await onCFPBComplaint(req.body) }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/escrow', async (req, res) => {
  try { res.json({ success: true, result: await onEscrowOpenRequest(req.body) }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/confirmed', async (req, res) => {
  try { res.json({ success: true, result: await onAuditConfirmed(req.body) }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/admin-alert', async (req, res) => {
  try { res.json({ success: true, result: await onAuditAdminAlert(req.body) }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/health', (req, res) => {
  res.json({ success: true, smtp: !!transporter, adminEmail: ADMIN_EMAIL });
});

// Export both router AND functions so audits.js can require them
module.exports = router;
module.exports.onCFPBComplaint    = onCFPBComplaint;
module.exports.onEscrowOpenRequest = onEscrowOpenRequest;
module.exports.onAuditConfirmed   = onAuditConfirmed;
module.exports.onAuditAdminAlert  = onAuditAdminAlert;
