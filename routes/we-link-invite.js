// we-link-invite.js — Supplier Invitation Blast
// Blasts invite emails to relevant contacts in ag_contacts DB
// Save to: C:\AuditDNA\backend\routes\we-link-invite.js
const express  = require('express');
const router   = express.Router();
const nodemailer = require('nodemailer');

const SMTP = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: 587, secure: false,
  auth: { user: process.env.SMTP_USER || process.env.GMAIL_USER || 'sgarcia1911@gmail.com',
          pass: process.env.SMTP_PASS || process.env.GMAIL_PASS || process.env.GMAIL_PASS }
};

function buildInviteHTML(contact_name, category) {
  const firstName = (contact_name||'').split(' ')[0] || 'there';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body style="font-family:Inter,Arial,sans-serif;background:#f1f5f9;padding:0;margin:0">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;margin-top:20px">
<div style="background:linear-gradient(135deg,#0a5a2f,#0F7B41);padding:28px 32px">
  <div style="color:#C9A55C;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">WE LINK — Mexausa Food Group</div>
  <div style="color:#fff;font-size:22px;font-weight:800;line-height:1.2">You are invited to join the Americas Agricultural Supplier Network</div>
</div>
<div style="padding:28px 32px">
  <p style="color:#0F1419;font-size:15px;margin-bottom:16px">Hi ${firstName},</p>
  <p style="color:#475569;font-size:14px;line-height:1.7;margin-bottom:16px">Mexausa Food Group is building the largest agricultural land + grower + buyer network in the Americas — and we want <strong>${category||'your business'}</strong> in it.</p>
  <p style="color:#475569;font-size:14px;line-height:1.7;margin-bottom:20px">Our WE LINK platform connects 33,000+ active growers, land owners, shippers and buyers across <strong>Mexico, Central America, South America, and the entire United States</strong>. When a grower-land partnership activates on our platform, your products and services are offered first.</p>
  <div style="background:#f8fafc;border-radius:8px;padding:18px;margin-bottom:20px">
    <div style="font-size:12px;font-weight:800;color:#0F1419;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px">What you get:</div>
    <div style="font-size:13px;color:#475569;line-height:2">&#10003; &nbsp;Free listing in the WE LINK Supplier Network<br/>&#10003; &nbsp;Direct email placement to matched growers in your region<br/>&#10003; &nbsp;Priority placement when WE LINK deals activate<br/>&#10003; &nbsp;Performance analytics — see who clicked, who bought<br/>&#10003; &nbsp;MFG earns 3% commission only when a referral converts — zero cost to you otherwise</div>
  </div>
  <div style="text-align:center;margin-bottom:24px">
    <a href="https://mexausafg.com/we-link-supplier.html" style="display:inline-block;background:#0F7B41;color:#fff;font-size:15px;font-weight:800;padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.5px">JOIN THE SUPPLIER NETWORK</a>
  </div>
  <p style="color:#475569;font-size:13px;line-height:1.6">Registration takes 2 minutes. No contracts. No upfront cost. Cancel anytime.</p>
  <p style="color:#475569;font-size:13px;line-height:1.6;margin-top:12px">Mexico · Central America · South America → USA</p>
</div>
<div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0">
  <p style="color:#94a3b8;font-size:11px;margin:0">Mexausa Food Group, Inc. &nbsp;|&nbsp; EIN: 88-1698129 &nbsp;|&nbsp; loaf.mexausafg.com<br/>
  <a href="https://mexausafg.com/we-link-supplier.html?unsub=1" style="color:#94a3b8">Unsubscribe</a></p>
</div>
</div></body></html>`;
}

// POST /api/we-link-invite/blast — blast invite emails to relevant contacts
router.post('/blast', async (req, res) => {
  const pool = req.app.get('db') || global.db;
  if (!pool) return res.status(500).json({ error: 'No DB pool' });
  const { categories, limit = 50, dry_run = false } = req.body;

  try {
    // Pull contacts with valid emails — ag_contacts is the Railway master table (33,971 records)
        const result = await pool.query(`
      SELECT email,
        COALESCE(contact_name, full_name, first_name, company_name, 'Friend') as contact_name,
        COALESCE(company_name, '') as company_name,
        COALESCE(role, title, commodity, 'Agricultural Partner') as role
      FROM (
        SELECT DISTINCT email, contact_name, company_name, role, commodity, title, full_name, first_name
        FROM shipper_contacts
        WHERE email IS NOT NULL AND email != '' AND email LIKE '%@%'
        UNION
        SELECT DISTINCT email, contact_name, company_name, role, NULL as commodity, NULL as title, NULL as full_name, NULL as first_name
        FROM contacts
        WHERE email IS NOT NULL AND email != '' AND email LIKE '%@%'
        UNION
        SELECT DISTINCT email, contact_name, company_name, NULL as role, commodity, NULL as title, NULL as full_name, NULL as first_name
        FROM grower_contacts
        WHERE email IS NOT NULL AND email != '' AND email LIKE '%@%'
      ) combined
      LIMIT $1
    `, [parseInt(limit)]);

    if (dry_run) return res.json({ ok:true, dry_run:true, would_send: result.rows.length, contacts: result.rows.slice(0,5) });

    const transporter = nodemailer.createTransport(SMTP);
    let sent = 0, failed = 0;

    for (const contact of result.rows) {
      try {
        await transporter.sendMail({
          from: `"Saul Garcia | Mexausa Food Group" <${SMTP.auth.user}>`,
          to: contact.email,
          subject: 'Invitation: Join the WE LINK Agricultural Supplier Network — Americas',
          html: buildInviteHTML(contact.contact_name, contact.role || contact.commodity),
        });
        sent++;
        await new Promise(r => setTimeout(r, 200)); // rate limit
      } catch(e) { failed++; }
    }

    res.json({ ok:true, sent, failed, total: result.rows.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/we-link-invite/preview — returns HTML preview of invite email
router.get('/preview', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(buildInviteHTML('Carlos', 'Agricultural Input Supplier'));
});

module.exports = router;
