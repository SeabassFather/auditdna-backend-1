// ════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS MODULE — C:\AuditDNA\backend\routes\notifications.js
// Used by: properties.js, leads.js, properties01-Sg.js
// ════════════════════════════════════════════════════════════════════════════
const nodemailer = require('nodemailer');

let transporter = null;

try {
  transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtpout.secureserver.net',
    port:   Number(process.env.SMTP_PORT || 465),
    secure: true,
    auth: {
      user: process.env.SMTP_USER || process.env.EMAIL_USER,
      pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
    },
  });
} catch (e) {
  console.warn('[NOTIFICATIONS] SMTP init skipped:', e.message);
}

const notifications = {

  // Generic send
  send: async ({ to, subject, text, html }) => {
    if (!transporter) return console.warn('[NOTIFY] No transporter — skipped');
    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER || 'noreply@mexausafg.com',
        to, subject,
        text: text || '',
        html: html  || text || '',
      });
      console.log(`[NOTIFY] Sent to ${to}: ${subject}`);
    } catch (e) {
      console.error('[NOTIFY] Send failed:', e.message);
    }
  },

  // Email alias
  sendEmail: async (opts) => notifications.send(opts),

  // Property inquiry alert
  propertyInquiry: async ({ property, contact }) => {
    console.log('[NOTIFY] Property inquiry:', property?.title, '—', contact?.email);
    await notifications.send({
      to:      process.env.ADMIN_EMAIL || process.env.SMTP_USER,
      subject: `New Inquiry: ${property?.title || 'Property'}`,
      text:    `Contact: ${contact?.name} | ${contact?.email} | ${contact?.phone}`,
    });
  },

  // Lead alert
  newLead: async ({ lead }) => {
    console.log('[NOTIFY] New lead:', lead?.email);
    await notifications.send({
      to:      process.env.ADMIN_EMAIL || process.env.SMTP_USER,
      subject: `New Lead: ${lead?.name || lead?.email}`,
      text:    JSON.stringify(lead, null, 2),
    });
  },

  // Generic alert
  alert: async (message) => {
    console.log('[NOTIFY] Alert:', message);
  },
};

module.exports = notifications;