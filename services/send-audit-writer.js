// ============================================================
// File: send-audit-writer.js
// Save to: C:\AuditDNA\backend\services\send-audit-writer.js
// ============================================================
// Writes one row per recipient to email_activity_log on every send.
// Called from routes/gmail.js /send-bulk after each successful send.
// Non-blocking - errors are logged but never thrown.
// ============================================================

const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'auditdna',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'auditdna2026',
});

/**
 * Infer industry from subject + body keywords.
 * Uses Mexausa product taxonomy: Produce / Mortgage / Coconut / Investor / Avocado / etc.
 */
function inferIndustry(subject, body) {
  const text = ((subject || '') + ' ' + (body || '')).toLowerCase();
  if (/avocado|hass|guacamole|aguacate/.test(text)) return 'Avocado Program';
  if (/coconut|cocolove|coco/.test(text)) return 'Coconut';
  if (/mortgage|loan|refinance|nmls|escrow/.test(text)) return 'Mortgage';
  if (/factoring|po finance|purchase order|trade finance|advance/.test(text)) return 'Trade Finance';
  if (/investor|safe note|equity|valuation|seed round|term sheet/.test(text)) return 'Investor';
  if (/loaf|sponsor position|carrousel/.test(text)) return 'LOAF Platform';
  if (/strawberr|berries|raspberr|blueberr|blackberr/.test(text)) return 'Berries';
  if (/citrus|lemon|orange|lime|grapefruit/.test(text)) return 'Citrus';
  if (/produce|grower|buyer|wholesale|fob|paca/.test(text)) return 'Produce';
  if (/real estate|property|listing|enjoybaja|baja/.test(text)) return 'Real Estate';
  return 'General';
}

/**
 * Infer commodity slug from subject keywords.
 */
function inferCommodity(subject) {
  const t = (subject || '').toLowerCase();
  const map = {
    avocado: 'avocado', strawberry: 'strawberry', raspberry: 'raspberry',
    blueberry: 'blueberry', lemon: 'lemon', lime: 'lime', orange: 'orange',
    coconut: 'coconut', mango: 'mango', grape: 'grape', tomato: 'tomato',
    pepper: 'pepper', cucumber: 'cucumber', squash: 'squash', onion: 'onion'
  };
  for (const [k, v] of Object.entries(map)) {
    if (t.includes(k)) return v;
  }
  return null;
}

/**
 * Write an audit row for one recipient.
 * Best-effort, non-blocking, never throws.
 *
 * @param {Object} args
 * @param {string} args.senderEmail   - team member who triggered the send
 * @param {string} args.recipientEmail
 * @param {string} args.recipientName
 * @param {string} args.subject
 * @param {string} args.body          - plaintext or HTML, used for preview + industry inference
 * @param {number} args.attachmentCount
 * @param {number} args.recipientCount - total recipients in this blast
 * @param {string} args.blastId       - shared id grouping all recipients of one blast
 * @param {string} args.gmailMessageId
 * @param {string} args.agentId       - 'human' or A1-A15 / autonomous-agent name
 * @param {string} args.intent        - 'outreach' | 'follow_up' | 'transactional' | 'omnibus'
 */
async function writeAuditRow(args) {
  try {
    const subject = args.subject || '';
    const body = args.body || '';
    const industry = inferIndustry(subject, body);
    const commodity = inferCommodity(subject);
    const bodyPreview = body.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().substring(0, 500);

    await pool.query(`
      INSERT INTO email_activity_log
        (direction, contact_email, contact_name, contact_type, commodity, industry,
         subject, snippet, body_preview, intent, agent_id, sender_email,
         attachment_count, recipient_count, blast_id, gmail_message_id, created_at)
      VALUES
        ('sent', $1, $2, $3, $4, $5,
         $6, $7, $8, $9, $10, $11,
         $12, $13, $14, $15, NOW())
      ON CONFLICT (contact_email, commodity, intent, agent_id) DO UPDATE
        SET subject = EXCLUDED.subject,
            sender_email = EXCLUDED.sender_email,
            body_preview = EXCLUDED.body_preview,
            attachment_count = EXCLUDED.attachment_count,
            recipient_count = EXCLUDED.recipient_count,
            blast_id = EXCLUDED.blast_id,
            gmail_message_id = EXCLUDED.gmail_message_id,
            created_at = NOW()
    `, [
      args.recipientEmail || '',
      args.recipientName || null,
      args.contactType || null,
      commodity,
      industry,
      subject.substring(0, 500),
      bodyPreview.substring(0, 200),
      bodyPreview,
      args.intent || 'outreach',
      args.agentId || 'human',
      args.senderEmail || 'unknown',
      args.attachmentCount || 0,
      args.recipientCount || 1,
      args.blastId || null,
      args.gmailMessageId || null
    ]);
    return true;
  } catch (e) {
    console.error('[send-audit-writer] failed to log row:', e.message);
    return false;
  }
}

module.exports = { writeAuditRow, inferIndustry, inferCommodity };
