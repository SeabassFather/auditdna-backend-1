// File: C:\AuditDNA\backend\services\sourcing-blast.js
// On-demand commodity sourcing blast - email growers + packers, invite to LOAF
'use strict';
const nodemailer = require('nodemailer');

const FROM_EMAIL = process.env.SMTP_USER || 'sgarcia1911@gmail.com';
const FROM_NAME = 'Saul Garcia | Mexausa Food Group';
const LOAF_URL = 'https://loaf.mexausafg.com';
const PLATFORM_URL = 'https://mexausafg.com';

function buildTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user: FROM_EMAIL, pass: process.env.SMTP_PASS }
  });
}

function emailTemplate(commodity, region, recipientName) {
  const cap = commodity.charAt(0).toUpperCase() + commodity.slice(1);
  const greeting = recipientName ? `Hello ${recipientName.split(' ')[0]}` : 'Hello';
  const greetingEs = recipientName ? `Hola ${recipientName.split(' ')[0]}` : 'Hola';

  return {
    subject: `${cap} Sourcing Inquiry - ${region} | Mexausa Food Group / Consulta de Abasto`,
    html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#0F1419">
<div style="border-bottom:3px solid #0F7B41;padding-bottom:12px;margin-bottom:20px">
  <div style="color:#0F7B41;font-size:22px;font-weight:bold">MEXAUSA FOOD GROUP</div>
  <div style="color:#C9A55C;font-size:13px">Direct Source. Verified. Year-Round.</div>
</div>

<p><strong>${greeting},</strong></p>
<p>We have active buyer demand for <strong>${cap}</strong> from <strong>${region}</strong>. Looking for direct grower/shipper partners with consistent volume.</p>

<p><strong>What we need:</strong></p>
<ul>
  <li>Available volume (loads/week or pallets)</li>
  <li>Variety + sizing</li>
  <li>FOB price + packing location</li>
  <li>Earliest ship date</li>
</ul>

<p>If you have ${commodity} available, reply to this email with your specs. We close deals fast - escrow-first, factoring available, payment on cut.</p>

<p><strong>Join our grower platform:</strong> <a href="${LOAF_URL}" style="color:#0F7B41;font-weight:bold">${LOAF_URL}</a> - load board, RFQs, real-time buyer demand. Free to list.</p>

<p style="margin-top:24px;border-top:1px solid #ddd;padding-top:12px">
<strong>Saul Garcia</strong><br>
Mexausa Food Group, Inc.<br>
<a href="${PLATFORM_URL}">${PLATFORM_URL}</a><br>
US: +1-831-251-3116 | MX WhatsApp: +52-646-340-2686
</p>

<hr style="border:none;border-top:1px dashed #ccc;margin:24px 0">

<p><strong>${greetingEs},</strong></p>
<p>Tenemos demanda activa de <strong>${cap}</strong> desde <strong>${region}</strong>. Buscamos productores/empacadores directos con volumen consistente.</p>

<p><strong>Necesitamos:</strong></p>
<ul>
  <li>Volumen disponible (cargas/semana o tarimas)</li>
  <li>Variedad y calibre</li>
  <li>Precio FOB + ubicacion de empaque</li>
  <li>Primera fecha de embarque</li>
</ul>

<p>Si tiene ${commodity} disponible, responda con sus especificaciones. Cerramos rapido - escrow primero, factoraje disponible, pago al corte.</p>

<p><strong>Plataforma para productores:</strong> <a href="${LOAF_URL}" style="color:#0F7B41;font-weight:bold">${LOAF_URL}</a> - tablero de cargas, RFQs, demanda en tiempo real. Gratis registrarse.</p>

</body></html>`,
    text: `${greeting},\n\nMexausa Food Group has active buyer demand for ${cap} from ${region}. Reply with available volume, variety, FOB price, and ship date.\n\nJoin our platform: ${LOAF_URL}\n\nSaul Garcia | ${PLATFORM_URL}\n+1-831-251-3116 | +52-646-340-2686\n\n---\n\n${greetingEs}, tenemos demanda de ${cap} desde ${region}. Responda con volumen, variedad, precio FOB y fecha. Plataforma: ${LOAF_URL}`
  };
}

async function sendSourcingBlast(pool, commodity, regions) {
  const tx = buildTransporter();
  const regionList = Array.isArray(regions) ? regions : [regions];
  const regionLabel = regionList.join(' / ');

  // Pull tagged growers + buyers acting as packers/shippers
  const growers = await pool.query(`
    SELECT g.email, COALESCE(g.contact_name, g.legal_name, g.company_name) AS name
    FROM growers g
    WHERE (g.crops_grown::text ILIKE $1 OR g.notes ILIKE $1 OR g.primary_products::text ILIKE $1 OR g.legal_name ILIKE $1 OR g.company_name ILIKE $1)
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

  console.log(`[SOURCING-BLAST] ${commodity}/${regionLabel}: ${recipients.length} unique recipients`);

  let sent = 0, failed = 0;
  for (const r of recipients) {
    try {
      const tpl = emailTemplate(commodity, regionLabel, r.name);
      await tx.sendMail({
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to: r.email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text
      });
      await pool.query(
        `INSERT INTO email_activity_log (direction, contact_email, contact_name, commodity, subject, intent, agent_id)
         VALUES ('outbound', $1, $2, $3, $4, 'sourcing_inquiry', 'SOURCING_BLAST')`,
        [r.email, r.name, commodity, tpl.subject]
      );
      sent++;
      await new Promise(res => setTimeout(res, 1500));
    } catch (e) {
      failed++;
      console.error(`[SOURCING-BLAST] ${r.email} failed:`, e.message);
    }
  }
  return { commodity, regions: regionList, total: recipients.length, sent, failed };
}

module.exports = { sendSourcingBlast, emailTemplate };