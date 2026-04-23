'use strict';
const { matchBuyersForInventory } = require('./contact-classifier');

const SIGNATURE_EN = `<br/>
<div style="border-top:1px solid #cba658;padding-top:14px;margin-top:24px;font-family:Arial,sans-serif;font-size:12px;color:#475569;">
  <div style="font-weight:700;color:#0f172a;font-size:13px;">Saul Garcia</div>
  <div style="color:#b8944d;letter-spacing:0.5px;">CEO, Mexausa Food Group, Inc.</div>
  <div style="margin-top:4px;">Saul@mexausafg.com</div>
  <div>MX: +52-646-340-2686 &middot; US: +1-831-251-3116</div>
  <div style="margin-top:3px;"><a href="https://mexausafg.com" style="color:#cba658;text-decoration:none;">mexausafg.com</a></div>
  <div style="font-size:10px;color:#94a3b0;margin-top:8px;">PACA #20241168 &middot; Licensed Importer &middot; FSMA 204 Compliant</div>
</div>`;

const SIGNATURE_ES = `<br/>
<div style="border-top:1px solid #cba658;padding-top:14px;margin-top:24px;font-family:Arial,sans-serif;font-size:12px;color:#475569;">
  <div style="font-weight:700;color:#0f172a;font-size:13px;">Saul Garcia</div>
  <div style="color:#b8944d;letter-spacing:0.5px;">CEO, Mexausa Food Group, Inc.</div>
  <div style="margin-top:4px;">Saul@mexausafg.com</div>
  <div>MX: +52-646-340-2686 &middot; US: +1-831-251-3116</div>
  <div style="margin-top:3px;"><a href="https://mexausafg.com" style="color:#cba658;text-decoration:none;">mexausafg.com</a></div>
  <div style="font-size:10px;color:#94a3b0;margin-top:8px;">PACA #20241168 &middot; Importador Licenciado &middot; FSMA 204 Compliant</div>
</div>`;

function buildSubject(item, lang='en'){
  const origin = item.origin_country === 'MX' ? 'Mexico' : (item.origin_country || '');
  const name = item.name || item.commodity_category || 'Fresh Produce';
  if(lang==='es') return `Disponible: ${name} FOB ${origin} — $${item.fob_price}/${item.unit||'unidad'}`;
  return `Available: ${name} FOB ${origin} — $${item.fob_price}/${item.unit||'unit'}`;
}

function buildBodyEN(item, buyer){
  const buyerName = (buyer && (buyer.name || buyer.first_name || buyer.company)) || 'Procurement Team';
  const origin = item.origin_country === 'MX' ? `${item.origin_state||''}${item.origin_state?', ':''}Mexico` : (item.origin_country||'Origin');
  const availText = item.available_date ? `Available starting <strong>${item.available_date}</strong>` : 'Available immediately';
  return `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;background:#fef8e7;padding:0;border:1px solid #cba658;">
  <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:18px 24px;border-bottom:2px solid #cba658;">
    <div style="color:#cba658;font-size:10px;letter-spacing:3px;font-weight:700;">MEXAUSA FOOD GROUP, INC.</div>
    <div style="color:#e5e4e2;font-size:14px;margin-top:3px;">Fresh Produce Availability &middot; US-Mexico Corridor</div>
  </div>
  <div style="padding:22px 24px;color:#1e293b;">
    <div style="font-size:13px;margin-bottom:14px;">Hello ${buyerName},</div>
    <div style="font-size:13px;line-height:1.6;margin-bottom:16px;">
      We have the following <strong>${item.commodity_category||'fresh produce'}</strong>
      inventory confirmed and ready for your next load. Pricing is firm FOB origin.
    </div>
    <div style="background:#ffffff;border:1px solid #cba658;padding:18px;margin:16px 0;">
      <div style="color:#b8944d;font-size:10px;letter-spacing:2px;font-weight:700;margin-bottom:4px;">INVENTORY AVAILABLE</div>
      <div style="color:#0f172a;font-size:20px;font-weight:700;margin-bottom:12px;">${item.name||'Fresh Produce'}</div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;color:#1e293b;">
        <tr><td style="padding:6px 0;color:#475569;width:35%;"><strong>FOB Price:</strong></td><td style="padding:6px 0;color:#b8944d;font-weight:700;">$${item.fob_price} / ${item.unit||'unit'}</td></tr>
        ${item.wholesale_price?`<tr><td style="padding:6px 0;color:#475569;"><strong>Wholesale:</strong></td><td style="padding:6px 0;">$${item.wholesale_price} / ${item.unit||'unit'}</td></tr>`:''}
        <tr><td style="padding:6px 0;color:#475569;"><strong>Volume:</strong></td><td style="padding:6px 0;">${item.volume||'Multiple loads available'}</td></tr>
        <tr><td style="padding:6px 0;color:#475569;"><strong>Origin:</strong></td><td style="padding:6px 0;">${origin}</td></tr>
        ${item.grower?`<tr><td style="padding:6px 0;color:#475569;"><strong>Grower:</strong></td><td style="padding:6px 0;">${item.grower}</td></tr>`:''}
        ${item.grade?`<tr><td style="padding:6px 0;color:#475569;"><strong>Grade / Pack:</strong></td><td style="padding:6px 0;">${item.grade}</td></tr>`:''}
        <tr><td style="padding:6px 0;color:#475569;"><strong>Availability:</strong></td><td style="padding:6px 0;">${availText}</td></tr>
      </table>
    </div>
    <div style="font-size:13px;line-height:1.6;margin:16px 0;color:#1e293b;">
      To lock in this lot or request a sample, reply directly to this email or call me at <strong>+1-831-251-3116</strong>.
      All product is PACA-backed and FSMA 204 traceable.
    </div>
    ${SIGNATURE_EN}
    <div style="border-top:1px solid rgba(203,166,88,0.3);padding-top:10px;margin-top:18px;font-size:9px;color:#94a3b0;line-height:1.5;">
      You are receiving this because you are a registered buyer or procurement contact with Mexausa Food Group, Inc. PACA #20241168.
      To opt out, <a href="https://mexausafg.com/unsubscribe?email={{EMAIL}}" style="color:#cba658;">click here</a>.
    </div>
  </div>
</div>
`.trim();
}

function buildBodyES(item, buyer){
  const buyerName = (buyer && (buyer.name || buyer.first_name || buyer.company)) || 'Equipo de Compras';
  const origin = item.origin_country === 'MX' ? `${item.origin_state||''}${item.origin_state?', ':''}México` : (item.origin_country||'Origen');
  const availText = item.available_date ? `Disponible a partir del <strong>${item.available_date}</strong>` : 'Disponibilidad inmediata';
  return `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;background:#fef8e7;padding:0;border:1px solid #cba658;">
  <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:18px 24px;border-bottom:2px solid #cba658;">
    <div style="color:#cba658;font-size:10px;letter-spacing:3px;font-weight:700;">MEXAUSA FOOD GROUP, INC.</div>
    <div style="color:#e5e4e2;font-size:14px;margin-top:3px;">Disponibilidad de Producto Fresco &middot; Corredor México-EE.UU.</div>
  </div>
  <div style="padding:22px 24px;color:#1e293b;">
    <div style="font-size:13px;margin-bottom:14px;">Hola ${buyerName},</div>
    <div style="font-size:13px;line-height:1.6;margin-bottom:16px;">
      Tenemos el siguiente inventario de <strong>${item.commodity_category||'producto fresco'}</strong>
      confirmado y listo para su próxima carga. Precio firme FOB origen.
    </div>
    <div style="background:#ffffff;border:1px solid #cba658;padding:18px;margin:16px 0;">
      <div style="color:#b8944d;font-size:10px;letter-spacing:2px;font-weight:700;margin-bottom:4px;">INVENTARIO DISPONIBLE</div>
      <div style="color:#0f172a;font-size:20px;font-weight:700;margin-bottom:12px;">${item.name||'Producto Fresco'}</div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;color:#1e293b;">
        <tr><td style="padding:6px 0;color:#475569;width:35%;"><strong>Precio FOB:</strong></td><td style="padding:6px 0;color:#b8944d;font-weight:700;">$${item.fob_price} / ${item.unit||'unidad'}</td></tr>
        ${item.wholesale_price?`<tr><td style="padding:6px 0;color:#475569;"><strong>Mayoreo:</strong></td><td style="padding:6px 0;">$${item.wholesale_price} / ${item.unit||'unidad'}</td></tr>`:''}
        <tr><td style="padding:6px 0;color:#475569;"><strong>Volumen:</strong></td><td style="padding:6px 0;">${item.volume||'Múltiples cargas disponibles'}</td></tr>
        <tr><td style="padding:6px 0;color:#475569;"><strong>Origen:</strong></td><td style="padding:6px 0;">${origin}</td></tr>
        ${item.grower?`<tr><td style="padding:6px 0;color:#475569;"><strong>Productor:</strong></td><td style="padding:6px 0;">${item.grower}</td></tr>`:''}
        ${item.grade?`<tr><td style="padding:6px 0;color:#475569;"><strong>Grado / Empaque:</strong></td><td style="padding:6px 0;">${item.grade}</td></tr>`:''}
        <tr><td style="padding:6px 0;color:#475569;"><strong>Disponibilidad:</strong></td><td style="padding:6px 0;">${availText}</td></tr>
      </table>
    </div>
    <div style="font-size:13px;line-height:1.6;margin:16px 0;color:#1e293b;">
      Para asegurar este lote o solicitar muestra, responda directamente a este correo o llámeme al <strong>+52-646-340-2686</strong>.
      Todo el producto tiene respaldo PACA y es trazable bajo FSMA 204.
    </div>
    ${SIGNATURE_ES}
    <div style="border-top:1px solid rgba(203,166,88,0.3);padding-top:10px;margin-top:18px;font-size:9px;color:#94a3b0;line-height:1.5;">
      Recibe este correo porque está registrado como comprador con Mexausa Food Group, Inc. PACA #20241168.
      Para no recibir más notificaciones, <a href="https://mexausafg.com/unsubscribe?email={{EMAIL}}" style="color:#cba658;">haga clic aquí</a>.
    </div>
  </div>
</div>
`.trim();
}

function buildInventoryEmail(item, buyer, lang='en'){
  const subject = buildSubject(item, lang);
  const body = lang === 'es' ? buildBodyES(item, buyer) : buildBodyEN(item, buyer);
  const to = buyer && buyer.email ? buyer.email : null;
  if(!to) return null;
  const html = body.replace(/\{\{EMAIL\}\}/g, encodeURIComponent(to));
  return { to, subject, html, lang };
}

function buildBlastBatch(inventoryItem, categorizedContacts, options={}){
  const matched = matchBuyersForInventory(categorizedContacts, inventoryItem);
  const batch = [];
  const defaultLang = options.lang || 'auto';
  for(const buyer of matched){
    const lang = defaultLang === 'auto' ? (buyer.country === 'MX' ? 'es' : 'en') : defaultLang;
    const email = buildInventoryEmail(inventoryItem, buyer, lang);
    if(email) batch.push({ ...email, buyer_id: buyer.id });
  }
  return {
    item: inventoryItem,
    total_matched: matched.length,
    total_emails: batch.length,
    batch,
    breakdown: { en: batch.filter(b=>b.lang==='en').length, es: batch.filter(b=>b.lang==='es').length }
  };
}

module.exports = { buildInventoryEmail, buildBlastBatch, buildSubject };
