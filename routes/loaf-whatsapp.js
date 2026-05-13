// loaf-whatsapp.js — LOAF x WhatsApp Integration Engine
// Outbound blasts: offer matches, Reverse pings, consolidated loads, financing offers, escrow stages
// Save to: C:\AuditDNA\backend\routes\loaf-whatsapp.js
const express = require('express');
const router  = express.Router();
const { getFreshnessZone, haversine } = require('./freshness-router');

const OC_GATEWAY = process.env.OPENCLAW_GATEWAY || 'http://127.0.0.1:18789';
const OC_TOKEN   = process.env.OPENCLAW_TOKEN   || 'f8500ee7115a28d7aea6d694ee853eca797d72278d72c627';

// Volume threshold for financing offer
const FINANCE_THRESHOLD_CASES = 100;
const FINANCE_THRESHOLD_USD   = 10000;

// Send WhatsApp message via OpenClaw gateway
async function sendWA(phone, message) {
  try {
    const fetch = (await import('node-fetch')).default;
    const normalized = phone.replace(/\D/g, '');
    const r = await fetch(`${OC_GATEWAY}/api/message/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OC_TOKEN}` },
      body: JSON.stringify({ channel: 'whatsapp', to: normalized, message }),
      timeout: 8000,
    });
    const d = await r.json();
    console.log(`[loaf-wa] sent to ${normalized}: ${d.ok ? 'OK' : 'FAIL'}`);
    return d;
  } catch (e) {
    console.error('[loaf-wa] send error:', e.message);
    return { ok: false, error: e.message };
  }
}

// POST /api/loaf-wa/blast-offer
// Blasts registered buyers when a grower posts a new LOAF offer
// Applies freshness radius filter automatically
router.post('/blast-offer', async (req, res) => {
  const pool = req.app.get('db') || global.db;
  const { offer_id, grower_phone, commodity, volume_cases, price_per_case,
          fob_port, harvest_date, cooler_days, origin_lat, origin_lng } = req.body;

  const zone = getFreshnessZone(harvest_date, parseInt(cooler_days || 0));
  const pushAltruistic = zone.label === 'ALTRUISTIC';

  try {
    // Get buyers who buy this commodity
    const buyers = await pool.query(`
      SELECT contact_name, phone, email, city, country,
             buyer_lat, buyer_lng
      FROM ag_contacts
      WHERE role IN ('buyer','chain_store','distributor','wholesaler')
        AND (LOWER(primary_product) LIKE $1 OR LOWER(secondary_products) LIKE $1 OR primary_product IS NULL)
        AND phone IS NOT NULL AND phone != ''
      LIMIT 200
    `, [`%${commodity.toLowerCase()}%`]);

    let eligible = buyers.rows;

    // Apply freshness radius filter if origin coords available
    if (origin_lat && origin_lng) {
      eligible = eligible.filter(b => {
        if (!b.buyer_lat || !b.buyer_lng) return true;
        const dist = haversine(parseFloat(origin_lat), parseFloat(origin_lng), parseFloat(b.buyer_lat), parseFloat(b.buyer_lng));
        b.distance_miles = Math.round(dist);
        return dist <= zone.radiusMiles;
      });
    }

    const totalValue = parseInt(volume_cases) * parseFloat(price_per_case || 0);
    const offerFinance = parseInt(volume_cases) >= FINANCE_THRESHOLD_CASES || totalValue >= FINANCE_THRESHOLD_USD;

    // Build message
    const altruisticTag = pushAltruistic ? '\nOFERTA ESPECIAL — Precio reducido, disponibilidad inmediata.' : '';
    const msg = `Mexausa Food Group — Nueva oferta disponible:\n\n` +
      `Producto: ${commodity}\n` +
      `Volumen: ${volume_cases} cajas\n` +
      `Precio: $${price_per_case} FOB ${fob_port}\n` +
      `Frescura: ${zone.label} — ${zone.desc}\n` +
      `${altruisticTag}\n` +
      `Responde INTERESADO para conectar con el proveedor.\n` +
      `Ref oferta: LOAF-${offer_id}`;

    // Send to each eligible buyer
    const results = [];
    for (const b of eligible.slice(0, 50)) { // cap at 50 per blast
      if (!b.phone) continue;
      const r = await sendWA(b.phone, msg);
      results.push({ buyer: b.contact_name, phone: b.phone, ok: r.ok, distance: b.distance_miles });
    }

    // If finance threshold crossed, also message the grower
    if (offerFinance && grower_phone) {
      const financeMsg = `Su oferta LOAF fue publicada.\n\n` +
        `Volumen grande detectado (${volume_cases} cajas).\n` +
        `Necesita adelanto de pago via factoraje?\n` +
        `Responda FACTOR para iniciar solicitud.\n\n` +
        `Mexausa Food Group — mexausafg.com`;
      await sendWA(grower_phone, financeMsg);
    }

    res.json({
      ok: true,
      zone: zone.label,
      radiusMiles: zone.radiusMiles,
      totalBuyers: buyers.rows.length,
      eligibleBuyers: eligible.length,
      blasted: results.length,
      financeOfferSent: offerFinance,
      results,
    });
  } catch (e) {
    console.error('[loaf-wa] blast-offer error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/loaf-wa/blast-reverse
// Blasts registered growers when a buyer posts a Reverse (need)
router.post('/blast-reverse', async (req, res) => {
  const pool = req.app.get('db') || global.db;
  const { reverse_id, commodity, volume_cases, fob_port, delivery_date, price_target, buyer_blind_id } = req.body;

  const totalValue = parseInt(volume_cases) * parseFloat(price_target || 0);
  const offerFinance = parseInt(volume_cases) >= FINANCE_THRESHOLD_CASES || totalValue >= FINANCE_THRESHOLD_USD;

  try {
    const growers = await pool.query(`
      SELECT contact_name, phone, primary_product, secondary_products, state_province, country
      FROM ag_contacts
      WHERE role IN ('grower','producer','supplier')
        AND (LOWER(primary_product) LIKE $1 OR LOWER(secondary_products) LIKE $1)
        AND phone IS NOT NULL AND phone != ''
      LIMIT 100
    `, [`%${commodity.toLowerCase()}%`]);

    const msg = `Mexausa Food Group — Comprador necesita su producto:\n\n` +
      `Producto: ${commodity}\n` +
      `Volumen: ${volume_cases} cajas\n` +
      `Puerto: FOB ${fob_port}\n` +
      `Entrega: ${delivery_date || 'Por confirmar'}\n` +
      `Precio objetivo: $${price_target || 'Negociable'}\n\n` +
      `Tiene disponibilidad? Responda SI con su volumen disponible.\n` +
      `Ref: REV-${reverse_id}`;

    const financeMsg = offerFinance
      ? `\n\nNota: Pedido grande. Si necesita financiamiento de orden de compra, responda PO.`
      : '';

    const results = [];
    for (const g of growers.rows.slice(0, 50)) {
      if (!g.phone) continue;
      const r = await sendWA(g.phone, msg + financeMsg);
      results.push({ grower: g.contact_name, phone: g.phone, ok: r.ok });
    }

    res.json({
      ok: true,
      totalGrowers: growers.rows.length,
      blasted: results.length,
      financeOfferIncluded: offerFinance,
      results,
    });
  } catch (e) {
    console.error('[loaf-wa] blast-reverse error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/loaf-wa/blast-consolidation
// Sends blind split offer to multiple growers for consolidated load
router.post('/blast-consolidation', async (req, res) => {
  const { sessionId, allocations, commodity, fob_port, delivery_date, price_per_case } = req.body;
  const results = [];

  for (const a of allocations) {
    if (!a.phone) continue;
    const msg = `Mexausa Food Group — Oportunidad de venta:\n\n` +
      `Producto: ${commodity}\n` +
      `Su parte: ${a.volumeAllocated} cajas\n` +
      `Precio: $${price_per_case} FOB ${fob_port}\n` +
      `Entrega: ${delivery_date || 'Por confirmar'}\n\n` +
      `Su ID de referencia: ${a.blindId}\n\n` +
      `Acepta esta oferta? Responda SI o NO.\n` +
      `Ref sesion: ${sessionId}`;
    const r = await sendWA(a.phone, msg);
    results.push({ blindId: a.blindId, ok: r.ok });
  }

  res.json({ ok: true, sessionId, blasted: results.length, results });
});

// POST /api/loaf-wa/escrow-notify
// Notifies both parties of escrow stage advancement
router.post('/escrow-notify', async (req, res) => {
  const { stage, stage_name, grower_phone, buyer_phone, deal_ref, amount } = req.body;
  const total = 10;

  const growerMsg = `Mexausa Food Group — Actualizacion de escrow:\n\n` +
    `Etapa ${stage} de ${total}: ${stage_name}\n` +
    `Referencia: ${deal_ref}\n` +
    `Monto: $${amount}\n\n` +
    `Siguiente paso sera notificado automaticamente.\n` +
    `Dudas: +1-831-251-3116`;

  const buyerMsg = `Mexausa Food Group — Escrow update:\n\n` +
    `Stage ${stage} of ${total}: ${stage_name}\n` +
    `Reference: ${deal_ref}\n` +
    `Amount: $${amount}\n\n` +
    `Next step will be notified automatically.\n` +
    `Questions: +1-831-251-3116`;

  const results = [];
  if (grower_phone) results.push({ party: 'grower', ...await sendWA(grower_phone, growerMsg) });
  if (buyer_phone)  results.push({ party: 'buyer',  ...await sendWA(buyer_phone,  buyerMsg) });

  res.json({ ok: true, stage, deal_ref, notified: results });
});

// POST /api/loaf-wa/finance-response
// Handles FACTOR or PO response from WhatsApp
router.post('/finance-response', async (req, res) => {
  const pool = req.app.get('db') || global.db;
  const { phone, response_type, invoice_amount, due_days, company_name, offer_ref } = req.body;

  const ref = `MFG-${response_type}-${Date.now()}`;

  try {
    await pool.query(`
      INSERT INTO financing_requests
        (phone, type, invoice_amount, due_days, company_name, offer_ref, ref_id, status, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',NOW())
      ON CONFLICT DO NOTHING
    `, [phone, response_type, invoice_amount, due_days, company_name, offer_ref, ref]);
  } catch(e) { /* table may not exist yet — log only */ console.warn('[finance-response] DB insert skipped:', e.message); }

  const confirmMsg = response_type === 'FACTOR'
    ? `Solicitud de factoraje recibida.\n\nRef: ${ref}\nMonto: $${invoice_amount}\nVencimiento: ${due_days} dias\n\nSu solicitud fue enviada a nuestra red de socios financieros (anonimos hasta aceptacion de terminos).\nLe contactamos en menos de 24 hrs.\n\nMexausa Food Group — mexausafg.com`
    : `Solicitud de financiamiento PO recibida.\n\nRef: ${ref}\nMonto de orden: $${invoice_amount}\n\nSu solicitud fue enviada a nuestra red de socios financieros.\nLe contactamos en menos de 24 hrs con opciones.\n\nMexausa Food Group — mexausafg.com`;

  await sendWA(phone, confirmMsg);
  res.json({ ok: true, ref, type: response_type });
});

module.exports = router;
module.exports.sendWA = sendWA;
