// notify_ping.js
// Save to: C:\AuditDNA\backend\utils\notify_ping.js
const nodemailer = require('nodemailer');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args)).catch(() => null);

const CHANNEL = process.env.NTFY_CHANNEL || 'auditdna-agro-saul2026';
const NTFY_BASE = 'https://ntfy.sh';

const transporter = nodemailer.createTransport({
  host: 'smtpout.secureserver.net',
  port: 465,
  secure: true,
  auth: {
    user: 'saul@mexausafg.com',
    pass: process.env.SMTP_PASS || 'PurpleRain321',
  },
});

const ping = async ({ title = 'AuditDNA Alert', message = '', priority = 'default', tags = [] } = {}) => {
  try {
    const r = await fetch(`${NTFY_BASE}/${CHANNEL}`, {
      method: 'POST',
      headers: {
        'Title': title,
        'Priority': priority,
        'Tags': tags.join(',') || 'auditdna',
        'Content-Type': 'text/plain',
      },
      body: message || title,
    });
    return r && r.ok;
  } catch (e) {
    console.warn('[ntfy] ping failed:', e.message);
    return false;
  }
};

const sendEmail = async ({ to = 'saul@mexausafg.com', subject = 'AuditDNA Alert', html = '' } = {}) => {
  try {
    await transporter.sendMail({ from: '"AuditDNA" <saul@mexausafg.com>', to, subject, html });
    return true;
  } catch (e) {
    console.warn('[email] send failed:', e.message);
    return false;
  }
};

module.exports = { ping, sendEmail, CHANNEL, NTFY_BASE };
