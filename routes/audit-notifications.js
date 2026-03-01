// =============================================================================
// NOTIFICATIONS — Audit Legal Notification Chain
// =============================================================================
// Patent Pending AuditDNA NMLS #337526
// Exports: onCFPBComplaint, onEscrowOpenRequest, onAuditConfirmed, onAuditAdminAlert
// Used by: routes/audits.js (finalize endpoint)
// =============================================================================

const nodemailer = require('nodemailer');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'saul@mexausafg.com';
const FROM_EMAIL  = process.env.EMAIL_FROM  || 'AuditDNA <saul@mexausafg.com>';

let transporter;
try {
  transporter = nodemailer.createTransport({
    host:   process.env.EMAIL_SMTP_HOST || 'mail.mexausafg.com',
    port:   parseInt(process.env.EMAIL_SMTP_PORT || '587'),
    secure: process.env.EMAIL_SMTP_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_SMTP_USER,
      pass: process.env.EMAIL_SMTP_PASS,
    },
  });
  console.log('[NOTIFICATIONS] SMTP transporter ready');
} catch (e) {
  console.log('[NOTIFICATIONS] SMTP not configured:', e.message);
}

// Helper: send email with fallback
async function sendEmail(to, subject, html) {
  if (!transporter) {
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

// Helper: format currency
const fmt = (n) => '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// =============================================================================
// 1. CFPB COMPLAINT NOTIFICATION
// =============================================================================
async function onCFPBComplaint({ caseId, consumer, violations, fees, selectedPath, loanData }) {
  const violationCount = Array.isArray(violations) ? violations.length : 0;
  const totalRecovery  = fees?.total || 0;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #ddd;border-radius:8px;overflow:hidden;">
      <div style="background:#1e293b;color:#cba658;padding:20px;text-align:center;">
        <h2 style="margin:0;">CFPB Complaint Filed</h2>
        <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">AuditDNA Case ${caseId}</p>
      </div>
      <div style="padding:20px;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Consumer</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${consumer?.name || consumer?.email || 'N/A'}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">State</td><td style="padding:8px;border-bottom:1px solid #eee;">${consumer?.state || 'N/A'}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Violations Found</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;color:#dc2626;">${violationCount}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Total Recovery</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;color:#047857;">${fmt(totalRecovery)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Path</td><td style="padding:8px;border-bottom:1px solid #eee;">${selectedPath || 'Standard'}</td></tr>
          <tr><td style="padding:8px;color:#666;">Lender</td><td style="padding:8px;">${loanData?.originalLender || 'N/A'}</td></tr>
        </table>
        <p style="margin-top:16px;font-size:12px;color:#94a3b8;">This is an automated notification from AuditDNA NMLS #337526. CFPB complaint documentation has been generated and queued for filing.</p>
      </div>
    </div>`;

  return sendEmail(ADMIN_EMAIL, `[CFPB] Case ${caseId} — ${violationCount} Violations — ${fmt(totalRecovery)}`, html);
}

// =============================================================================
// 2. ESCROW OPEN REQUEST
// =============================================================================
async function onEscrowOpenRequest({ caseId, consumer, fees, selectedPath }) {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #ddd;border-radius:8px;overflow:hidden;">
      <div style="background:#1e293b;color:#cba658;padding:20px;text-align:center;">
        <h2 style="margin:0;">Escrow Account Request</h2>
        <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">AuditDNA Case ${caseId}</p>
      </div>
      <div style="padding:20px;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Consumer</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${consumer?.name || consumer?.email || 'N/A'}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Property</td><td style="padding:8px;border-bottom:1px solid #eee;">${consumer?.address || 'N/A'}, ${consumer?.city || ''} ${consumer?.state || ''} ${consumer?.zip || ''}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Path Selected</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${selectedPath === 'escrow' ? 'ESCROW (39%)' : 'STANDARD (30%)'}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Total Recovery</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;color:#047857;">${fmt(fees?.total)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Our Fee</td><td style="padding:8px;border-bottom:1px solid #eee;">${fmt(fees?.fee)} (${fees?.percentage || 30}%)</td></tr>
          <tr><td style="padding:8px;color:#666;">Consumer Receives</td><td style="padding:8px;font-weight:bold;color:#047857;">${fmt(fees?.youReceive)}</td></tr>
        </table>
        <p style="margin-top:16px;font-size:12px;color:#94a3b8;">Action Required: Open escrow account with First American Title for recovery disbursement.</p>
      </div>
    </div>`;

  return sendEmail(ADMIN_EMAIL, `[ESCROW] Open Request — Case ${caseId} — ${fmt(fees?.total)}`, html);
}

// =============================================================================
// 3. AUDIT CONFIRMED — Consumer notification
// =============================================================================
async function onAuditConfirmed({ caseId, consumer, fees, selectedPath }) {
  const consumerEmail = consumer?.email;
  if (!consumerEmail) {
    console.log(`[NOTIFICATIONS] No consumer email for case ${caseId} — skipping confirmation`);
    return { skipped: true };
  }

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #ddd;border-radius:8px;overflow:hidden;">
      <div style="background:#1e293b;color:#cba658;padding:20px;text-align:center;">
        <h2 style="margin:0;">Your Audit Has Been Confirmed</h2>
        <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">Case Reference: ${caseId}</p>
      </div>
      <div style="padding:20px;">
        <p style="font-size:14px;color:#333;">Dear ${consumer?.name || 'Valued Client'},</p>
        <p style="font-size:14px;color:#333;">Your mortgage audit has been authorized and is now in the recovery process.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;">
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Total Recovery</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;color:#047857;">${fmt(fees?.total)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Service Fee</td><td style="padding:8px;border-bottom:1px solid #eee;">${fmt(fees?.fee)} (${fees?.percentage || 30}%)</td></tr>
          <tr><td style="padding:8px;color:#666;">You Receive</td><td style="padding:8px;font-weight:bold;color:#047857;font-size:18px;">${fmt(fees?.youReceive)}</td></tr>
        </table>
        <p style="font-size:14px;color:#333;">A 3-day cooling-off period is now in effect. You will receive updates as your case progresses.</p>
        <p style="font-size:12px;color:#94a3b8;margin-top:20px;">AuditDNA | NMLS #337526 | CM Products International<br>This is a confidential communication.</p>
      </div>
    </div>`;

  return sendEmail(consumerEmail, `AuditDNA — Your Audit Is Confirmed — Case ${caseId}`, html);
}

// =============================================================================
// 4. ADMIN ALERT — Internal dashboard notification
// =============================================================================
async function onAuditAdminAlert({ caseId, consumer, fees, selectedPath }) {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #ddd;border-radius:8px;overflow:hidden;">
      <div style="background:#047857;color:#fff;padding:20px;text-align:center;">
        <h2 style="margin:0;">NEW AUDIT AUTHORIZED</h2>
        <p style="margin:4px 0 0;color:#d1fae5;font-size:12px;">Case ${caseId} — Action Required</p>
      </div>
      <div style="padding:20px;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Consumer</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${consumer?.name || 'N/A'} (${consumer?.email || 'N/A'})</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Location</td><td style="padding:8px;border-bottom:1px solid #eee;">${consumer?.city || ''} ${consumer?.state || ''} ${consumer?.zip || ''}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Path</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${selectedPath === 'escrow' ? 'ESCROW (39%)' : 'STANDARD (30%)'}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Recovery</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;color:#047857;">${fmt(fees?.total)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Our Fee</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;color:#cba658;">${fmt(fees?.fee)}</td></tr>
          <tr><td style="padding:8px;color:#666;">Consumer Gets</td><td style="padding:8px;font-weight:bold;">${fmt(fees?.youReceive)}</td></tr>
        </table>
        <div style="margin-top:16px;padding:12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:4px;font-size:12px;color:#047857;">
          <strong>Next Steps:</strong> Cooling-off period started. Review violations, prepare CFPB filing, ${selectedPath === 'escrow' ? 'open escrow with First American Title.' : 'prepare direct settlement.'}
        </div>
      </div>
    </div>`;

  return sendEmail(ADMIN_EMAIL, `[AUTHORIZED] Case ${caseId} — ${fmt(fees?.fee)} Fee — ${consumer?.state || 'N/A'}`, html);
}

// =============================================================================
// EXPORTS
// =============================================================================
module.exports = {
  onCFPBComplaint,
  onEscrowOpenRequest,
  onAuditConfirmed,
  onAuditAdminAlert,
};