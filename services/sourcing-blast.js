// File: C:\AuditDNA\backend\services\sourcing-blast.js
// REWRITTEN 2026-05-04 - uses Brevo HTTP API (port 443) instead of SMTP
// Reason: Railway blocks outbound SMTP on ports 587/2525. HTTP API works on 443.
'use strict';

const FROM_NAME  = process.env.SMTP_FROM_NAME || 'Saul Garcia | Mexausa Food Group';
const FROM_EMAIL = process.env.SMTP_FROM      || 'saul@mexausafg.com';
const BREVO_API  = 'https://api.brevo.com/v3/smtp/email';

function emailTemplate(commodity, regionLabel, contactName) {
  const cName = (commodity || '').toLowerCase();
  const cTitle = cName.charAt(0).toUpperCase() + cName.slice(1);
  const greeting = contactName && contactName.trim()
    ? `Hi ${contactName.trim().split(' ')[0]}`
    : 'Hello';

  const subject = `Sourcing Inquiry: ${cTitle} Volume Available — ${regionLabel}`;

  const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#0F1419;background:#F4F6F4;margin:0;padding:0">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#FFFFFF">
<tr><td style="background:linear-gradient(135deg,#0F7B41 0%,#075028 100%);padding:24px;text-align:center">
<div style="color:#FFFFFF;font-size:20px;font-weight:700;letter-spacing:2px">MEXAUSA FOOD GROUP, INC.</div>
<div style="color:#C9A55C;font-size:11px;letter-spacing:1.5px;margin-top:6px">WHOLESALE PRODUCE INTELLIGENCE</div>
</td></tr>
<tr><td style="padding:30px 24px">
<p style="font-size:15px;color:#0F1419;margin:0 0 14px">${greeting},</p>
<p style="font-size:14px;color:#2A3138;line-height:1.6;margin:0 0 14px">
We are actively sourcing <strong>${cTitle}</strong> for our Texas and California buyer programs. Looking for committed load volume from reliable growers and packers in <strong>${regionLabel}</strong>.
</p>
<p style="font-size:14px;color:#2A3138;line-height:1.6;margin:0 0 14px">
If you have current availability or upcoming production for ${cName}, please reply to this email with:
</p>
<ul style="font-size:14px;color:#2A3138;line-height:1.7;margin:0 0 18px;padding-left:20px">
<li>Available volume (cases / pallets / loads per week)</li>
<li>FOB pricing by size and pack</li>
<li>Origin region and harvest dates</li>
<li>Certifications (GAP, Organic, PrimusGFS, etc.)</li>
<li>Standard payment terms</li>
</ul>
<table cellpadding="0" cellspacing="0" style="margin:18px 0">
<tr><td style="background:#0F7B41;padding:12px 24px;border-radius:4px">
<a href="mailto:saul@mexausafg.com?subject=${encodeURIComponent(cTitle + ' availability — ' + regionLabel)}" style="color:#FFFFFF;text-decoration:none;font-weight:700;font-size:13px;letter-spacing:1px">REPLY WITH AVAILABILITY</a>
</td></tr></table>
<p style="font-size:13px;color:#2A3138;line-height:1.6;margin:14px 0 0">
Best regards,<br/>
<strong style="color:#0F1419">Saul Garcia</strong><br/>
<span style="color:#5C6470;font-size:11px">Wholesale Produce Source Analyst — Importer &amp; Distributor</span><br/>
<span style="color:#5C6470;font-size:11px">Mexausa Food Group, Inc.</span>
</p>
<table cellpadding="0" cellspacing="0" style="margin-top:14px;font-size:11px;color:#5C6470">
<tr><td>US: <a href="tel:+18312513116" style="color:#0F7B41;text-decoration:none">+1-831-251-3116</a> &nbsp;|&nbsp; MX WhatsApp: <a href="tel:+526463402686" style="color:#0F7B41;text-decoration:none">+52-646-340-2686</a></td></tr>
<tr><td><a href="https://mexausafg.com" style="color:#0F7B41;text-decoration:none">mexausafg.com</a></td></tr>
</table>
</td></tr>
<tr><td style="background:#F4F6F4;padding:14px 24px;font-size:10px;color:#5C6470;text-align:center;border-top:1px solid #D4DBD3">
You are receiving this because your contact is in our wholesale produce trade network. To stop receiving sourcing inquiries, reply with UNSUBSCRIBE.
</td></tr>
</table></body></html>`;

  const text = `${greeting},

We are actively sourcing ${cTitle} for our Texas and California buyer programs. Looking for committed load volume from reliable growers and packers in ${regionLabel}.

If you have current availability or upcoming production for ${cName}, please reply with:
- Available volume (cases / pallets / loads per week)
- FOB pricing by size and pack
- Origin region and harvest dates
- Certifications (GAP, Organic, PrimusGFS, etc.)
- Standard payment terms

Reply to: saul@mexausafg.com

Best regards,
Saul Garcia
Wholesale Produce Source Analyst - Importer & Distributor
Mexausa Food Group, Inc.
US: +1-831-251-3116 | MX WhatsApp: +52-646-340-2686
mexausafg.com

To stop receiving sourcing inquiries, reply with UNSUBSCRIBE.`;

  return { subject, html, text };
}

// JET_ENGINE_v2 - delegate to brevo-universal
const { sendBrevo: __sendBrevoUniversal } = require('./brevo-universal');
async function sendViaBrevoApi(to, name, subject, html, text) {
  const r = await __sendBrevoUniversal({
    to, toName: name, subject, html, text,
    fromEmail: FROM_EMAIL, fromName: FROM_NAME,
    senderEmail: FROM_EMAIL,
    agentId: 'SOURCING_BLAST',
    skipSuppressionCheck: false
  });
  if (r.suppressed) throw new Error('Recipient is suppressed: ' + to);
  return r.messageId || 'sent';
}

async function sendSourcingBlast(pool, commodity, regionList) {
  const regionLabel = regionList.join(' / ');

  // Pull tagged growers + buyers acting as packers/shippers
  const growers = await pool.query(`
    SELECT g.email, COALESCE(g.contact_name, g.company_name) AS name
    FROM growers g
    WHERE (g.crops_grown::text ILIKE $1 OR g.notes ILIKE $1 OR g.primary_products::text ILIKE $1 OR g.company_name ILIKE $1)
      AND g.email IS NOT NULL AND g.email != ''
  `, [`%${commodity}%`]);

  const packers = await pool.query(`
    SELECT b.email, b.legal_name AS name
    FROM buyers b
    WHERE (b.legal_name ILIKE '%farms%' OR b.legal_name ILIKE '%packing%' OR b.legal_name ILIKE '%produce%' OR b.legal_name ILIKE '%grower%')
      AND b.product_specialties ILIKE $1
      AND b.email IS NOT NULL AND b.email != ''
  `, [`%${commodity}%`]);

  const all = [...growers.rows, ...packers.rows];
  const seen = new Set();
  const recipients = all.filter(r => {
    const e = r.email.toLowerCase();
    if (seen.has(e)) return false;
    seen.add(e);
    return true;
  });

  console.log(`[SOURCING-BLAST] ${commodity}/${regionLabel}: ${recipients.length} unique recipients (HTTP API mode)`);

  let sent = 0, failed = 0;
  for (const r of recipients) {
    try {
      const tpl = emailTemplate(commodity, regionLabel, r.name);
      const messageId = await sendViaBrevoApi(r.email, r.name, tpl.subject, tpl.html, tpl.text);

      try {
        await pool.query(
          `INSERT INTO email_activity_log (direction, contact_email, contact_name, commodity, subject, intent, agent_id)
           VALUES ('outbound', $1, $2, $3, $4, 'sourcing_inquiry', 'SOURCING_BLAST')
           ON CONFLICT (contact_email, commodity, intent, agent_id) DO UPDATE SET created_at = NOW(), subject = EXCLUDED.subject`,
          [r.email, r.name, commodity, tpl.subject]
        );
      } catch (logErr) {
        console.warn(`[SOURCING-BLAST] log insert failed for ${r.email}:`, logErr.message);
      }

      sent++;
      console.log(`[SOURCING-BLAST] sent ${sent}/${recipients.length} -> ${r.email} (msg ${messageId})`);

      // Brevo paid plan can handle higher rate, but throttle a bit anyway
      await new Promise(res => setTimeout(res, 200));
    } catch (e) {
      failed++;
      console.error(`[SOURCING-BLAST] ${r.email} failed:`, e.message);
    }
  }

  console.log(`[SOURCING-BLAST] complete: sent=${sent} failed=${failed} total=${recipients.length}`);
  return { commodity, regions: regionList, total: recipients.length, sent, failed };
}

module.exports = { sendSourcingBlast, emailTemplate };