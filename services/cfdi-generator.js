/**
 * C:\AuditDNA\backend\services\cfdi-generator.js
 *
 * CFDI 4.0 generator (Mexico SAT compliance).
 *  - Builds CFDI 4.0 XML from a deal_lock + rfq + buyer/grower data
 *  - Submits to a PAC (Proveedor Autorizado de Certificacion) for stamping
 *  - Stores stamped XML + generates PDF representation
 *  - Handles cancellation per SAT rules (motivo 01-04)
 *
 * Supported PAC providers (configured per emisor in cfdi_emisor_config):
 *  - finkok (default)
 *  - solucion-factible
 *  - smarter-web
 *
 * Mount in server.js:
 *   const cfdiGen = require('./services/cfdi-generator');
 *   app.use('/api/cfdi', cfdiGen.router);
 *
 * REQUIRED ENV (set in Railway / .env):
 *   CFDI_TEST_MODE=true      // false to use production SAT
 *   CFDI_DEFAULT_RFC=...     // Mexausa Food Group MX RFC if registered
 *   CFDI_PAC_PROVIDER=finkok
 *
 * NOTE: Production CFDI requires:
 *  - SAT-issued CSD certificate (.cer + .key files)
 *  - Active PAC contract (Finkok, Solucion Factible, etc. — ~$0.50-1.50 per stamp)
 *  - RFC registered with SAT for the emisor
 *  - Valid CSD password
 *  This module assumes those credentials are stored encrypted in cfdi_emisor_config.
 */

const express = require('express');
const { Pool } = require('pg');
const crypto = require('crypto');
const { create } = require('xmlbuilder2');

const getPool = require('../db');
const pool = getPool();

const TEST_MODE = String(process.env.CFDI_TEST_MODE || 'true').toLowerCase() === 'true';
const CFDI_VERSION = '4.0';
const CFDI_NS = 'http://www.sat.gob.mx/cfd/4';
const XSI_NS = 'http://www.w3.org/2001/XMLSchema-instance';
const CFDI_XSD = 'http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd';

// ----------------------------------------------------------------------------
// Build CFDI 4.0 XML (unsigned)
// ----------------------------------------------------------------------------
/**
 * @param {object} input
 *   emisor:   { rfc, razon_social, regimen_fiscal }
 *   receptor: { rfc, razon_social, regimen, uso_cfdi, domicilio_zip }
 *   serie:    'A'
 *   folio:    'INV-1234'
 *   forma_pago: '03'
 *   metodo_pago: 'PUE' | 'PPD'
 *   moneda: 'MXN'|'USD'
 *   tipo_cambio: optional
 *   lugar_expedicion: '95076'  // emisor's ZIP
 *   conceptos: [{ clave_prod_serv, no_identif, cantidad, clave_unidad, unidad, descripcion, valor_unitario, importe, descuento, iva_traslado_pct }]
 */
function buildCfdiXml(input) {
  const {
    emisor, receptor, serie = 'A', folio,
    forma_pago = '99', metodo_pago = 'PUE',
    moneda = 'MXN', tipo_cambio,
    lugar_expedicion,
    conceptos,
  } = input;

  // Calculate totals
  let subtotal = 0;
  let descuento = 0;
  let ivaTrasladoTotal = 0;

  for (const c of conceptos) {
    subtotal += Number(c.importe) || 0;
    descuento += Number(c.descuento) || 0;
    if (c.iva_traslado_pct) {
      const base = (Number(c.importe) - Number(c.descuento || 0));
      ivaTrasladoTotal += +(base * (Number(c.iva_traslado_pct) / 100)).toFixed(2);
    }
  }
  const total = +(subtotal - descuento + ivaTrasladoTotal).toFixed(2);

  const fecha = new Date().toISOString().slice(0, 19); // YYYY-MM-DDTHH:mm:ss

  // Build XML using xmlbuilder2
  const root = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('cfdi:Comprobante', {
      'xmlns:cfdi': CFDI_NS,
      'xmlns:xsi': XSI_NS,
      'xsi:schemaLocation': CFDI_XSD,
      Version: CFDI_VERSION,
      Serie: serie,
      Folio: folio,
      Fecha: fecha,
      FormaPago: forma_pago,
      NoCertificado: '',          // filled by signing step
      Sello: '',                  // filled by signing step
      SubTotal: subtotal.toFixed(2),
      ...(descuento > 0 ? { Descuento: descuento.toFixed(2) } : {}),
      Moneda: moneda,
      ...(moneda !== 'MXN' && tipo_cambio ? { TipoCambio: Number(tipo_cambio).toFixed(4) } : {}),
      Total: total.toFixed(2),
      TipoDeComprobante: 'I',     // I = Ingreso (invoice)
      Exportacion: '01',          // 01 = No aplica, 02 = definitiva
      MetodoPago: metodo_pago,
      LugarExpedicion: lugar_expedicion,
    });

  // Emisor
  root.ele('cfdi:Emisor', {
    Rfc: emisor.rfc,
    Nombre: emisor.razon_social,
    RegimenFiscal: emisor.regimen_fiscal,
  });

  // Receptor
  root.ele('cfdi:Receptor', {
    Rfc: receptor.rfc,
    Nombre: receptor.razon_social,
    DomicilioFiscalReceptor: receptor.domicilio_zip,
    RegimenFiscalReceptor: receptor.regimen,
    UsoCFDI: receptor.uso_cfdi,
  });

  // Conceptos
  const conceptosNode = root.ele('cfdi:Conceptos');
  for (const c of conceptos) {
    const conceptoNode = conceptosNode.ele('cfdi:Concepto', {
      ClaveProdServ: c.clave_prod_serv || '50000000',  // generic agricultural code
      ...(c.no_identif ? { NoIdentificacion: c.no_identif } : {}),
      Cantidad: Number(c.cantidad).toFixed(2),
      ClaveUnidad: c.clave_unidad || 'H87',           // H87 = Pieza
      ...(c.unidad ? { Unidad: c.unidad } : {}),
      Descripcion: c.descripcion,
      ValorUnitario: Number(c.valor_unitario).toFixed(2),
      Importe: Number(c.importe).toFixed(2),
      ...(c.descuento ? { Descuento: Number(c.descuento).toFixed(2) } : {}),
      ObjetoImp: c.iva_traslado_pct ? '02' : '01',     // 01=No, 02=Si objeto de impuesto
    });

    if (c.iva_traslado_pct) {
      const base = (Number(c.importe) - Number(c.descuento || 0));
      const iva = +(base * (Number(c.iva_traslado_pct) / 100)).toFixed(2);
      conceptoNode.ele('cfdi:Impuestos').ele('cfdi:Traslados').ele('cfdi:Traslado', {
        Base: base.toFixed(2),
        Impuesto: '002',        // 002 = IVA
        TipoFactor: 'Tasa',
        TasaOCuota: (Number(c.iva_traslado_pct) / 100).toFixed(6),
        Importe: iva.toFixed(2),
      });
    }
  }

  // Global Impuestos (IVA traslado total)
  if (ivaTrasladoTotal > 0) {
    const impuestosNode = root.ele('cfdi:Impuestos', { TotalImpuestosTrasladados: ivaTrasladoTotal.toFixed(2) });
    const trasladosNode = impuestosNode.ele('cfdi:Traslados');
    trasladosNode.ele('cfdi:Traslado', {
      Base: subtotal.toFixed(2),
      Impuesto: '002',
      TipoFactor: 'Tasa',
      TasaOCuota: '0.160000',
      Importe: ivaTrasladoTotal.toFixed(2),
    });
  }

  return {
    xml: root.end({ prettyPrint: true }),
    totals: { subtotal, descuento, iva_traslado: ivaTrasladoTotal, total, fecha },
  };
}

// ----------------------------------------------------------------------------
// PAC submission (stamping)
// ----------------------------------------------------------------------------
/**
 * Submits unsigned XML to PAC for stamping. Returns stamped XML + UUID.
 * Implementation is a stub — actual PAC integration is provider-specific.
 * In test mode returns a synthetic UUID and echoes the XML so flow can be tested.
 */
async function submitToPac(emisorConfig, unsignedXml) {
  if (TEST_MODE) {
    const uuid = crypto.randomUUID().toUpperCase();
    return {
      ok: true,
      uuid,
      sello_cfd: 'TEST_SELLO_' + crypto.randomBytes(16).toString('hex'),
      sello_sat: 'TEST_SELLO_SAT_' + crypto.randomBytes(16).toString('hex'),
      no_certificado_sat: '00001000000500000000',
      fecha_timbrado: new Date().toISOString(),
      xml_stamped: unsignedXml,  // in test mode we return as-is
    };
  }

  // ----- PRODUCTION PAC INTEGRATION -----
  // Each PAC has its own API. Pseudo for Finkok:
  //
  //   const soap = require('soap');
  //   const url = 'https://facturacion.finkok.com/servicios/soap/stamp.wsdl';
  //   const client = await soap.createClientAsync(url);
  //   const result = await client.stampAsync({
  //     username: decryptedUsername,
  //     password: decryptedPassword,
  //     xml: Buffer.from(signedXml).toString('base64'),
  //   });
  //   ...parse result, extract uuid + stamped xml...
  //
  throw new Error('Production PAC integration not configured. Set CFDI_TEST_MODE=true or wire PAC client.');
}

// ----------------------------------------------------------------------------
// PDF generator (CFDI representation)
// ----------------------------------------------------------------------------
function buildCfdiPdfHtml(data) {
  // Returns an HTML representation that can be passed to puppeteer/pdfkit/wkhtmltopdf
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"/>
<title>CFDI ${data.serie}-${data.folio}</title>
<style>
body{font-family:Arial,sans-serif;margin:20px;font-size:11px;color:#000}
h1{font-size:14px;margin:0 0 8px 0;border-bottom:2px solid #333;padding-bottom:4px}
table{width:100%;border-collapse:collapse;margin:8px 0}
th,td{border:1px solid #888;padding:4px 6px;text-align:left}
th{background:#eee}
.right{text-align:right}
.totals td{font-weight:600}
.qr{float:right;margin-left:16px}
</style></head><body>
<h1>FACTURA CFDI 4.0 - ${data.emisor_razon_social}</h1>
<table>
  <tr><td><b>RFC Emisor:</b> ${data.emisor_rfc}</td><td><b>Folio Fiscal (UUID):</b> ${data.cfdi_uuid || '(pendiente)'}</td></tr>
  <tr><td><b>Razon Social:</b> ${data.emisor_razon_social}</td><td><b>Fecha:</b> ${data.fecha_timbrado || data.created_at}</td></tr>
  <tr><td><b>Serie-Folio:</b> ${data.cfdi_serie}-${data.cfdi_folio}</td><td><b>Lugar Expedicion:</b> ${data.lugar_expedicion}</td></tr>
</table>
<h1>Receptor</h1>
<table>
  <tr><td><b>RFC:</b> ${data.receptor_rfc}</td><td><b>Nombre:</b> ${data.receptor_razon_social}</td></tr>
  <tr><td><b>Uso CFDI:</b> ${data.receptor_uso_cfdi}</td><td><b>CP:</b> ${data.receptor_domicilio_zip}</td></tr>
</table>
<h1>Conceptos</h1>
<table>
<tr><th>Cant.</th><th>Descripcion</th><th>P. Unit.</th><th>Importe</th></tr>
${(data.conceptos || []).map(c => `
<tr><td>${c.cantidad}</td><td>${c.descripcion}</td><td class="right">${Number(c.valor_unitario).toFixed(2)}</td><td class="right">${Number(c.importe).toFixed(2)}</td></tr>
`).join('')}
</table>
<table class="totals">
  <tr><td class="right">Subtotal:</td><td class="right">${Number(data.subtotal).toFixed(2)} ${data.moneda}</td></tr>
  ${Number(data.iva_traslado) > 0 ? `<tr><td class="right">IVA 16%:</td><td class="right">${Number(data.iva_traslado).toFixed(2)} ${data.moneda}</td></tr>` : ''}
  <tr><td class="right"><b>TOTAL:</b></td><td class="right"><b>${Number(data.total).toFixed(2)} ${data.moneda}</b></td></tr>
</table>
<p style="font-size:9px;color:#555;margin-top:24px">
  Este documento es una representacion impresa de un CFDI. Forma de pago: ${data.forma_pago} | Metodo: ${data.metodo_pago}
</p>
</body></html>`;
}

// ----------------------------------------------------------------------------
// Generate CFDI for a deal lock
// ----------------------------------------------------------------------------
async function generateCfdiForDeal(deal_lock_id) {
  // Pull deal + RFQ + emisor config + receptor info
  const dealQ = await pool.query(`
    SELECT dl.*, rn.commodity_category, rn.commodity_subcategory, rn.pack_size, rn.spec_notes
      FROM rfq_deal_locks dl
      JOIN rfq_needs rn ON rn.id = dl.rfq_id
     WHERE dl.id = $1`, [deal_lock_id]);
  if (!dealQ.rows.length) throw new Error('deal_lock_id not found');
  const deal = dealQ.rows[0];

  const emisorQ = await pool.query(`SELECT * FROM cfdi_emisor_config WHERE is_active = TRUE ORDER BY id LIMIT 1`);
  if (!emisorQ.rows.length) throw new Error('No active CFDI emisor configured');
  const emisorRow = emisorQ.rows[0];

  // Receptor: in real flow, look up buyer's RFC + razon social from buyer table
  // Stub here pulls from rfq_buyer_vetting if available
  const buyerQ = await pool.query(`SELECT rfc FROM rfq_buyer_vetting WHERE buyer_id = $1 ORDER BY id DESC LIMIT 1`, [deal.buyer_id]);
  const receptor = {
    rfc: buyerQ.rows[0]?.rfc || 'XAXX010101000',     // generic foreigner RFC
    razon_social: 'CLIENTE VERIFICADO',                // anonymized; real buyer name on stamped copy only
    regimen: '601',
    uso_cfdi: 'G01',                                   // Adquisicion de mercancias
    domicilio_zip: emisorRow.lugar_expedicion,
  };

  // Build single concepto from deal
  const conceptos = [{
    clave_prod_serv: '50101500',                       // SAT code: live plants and animals (agricultural)
    no_identif: deal.commodity_subcategory,
    cantidad: Number(deal.final_quantity),
    clave_unidad: 'XBX',                               // Box
    unidad: 'CAJA',
    descripcion: `${deal.commodity_category} - ${deal.commodity_subcategory} ${deal.pack_size || ''}`.trim(),
    valor_unitario: Number(deal.final_price) / Math.max(Number(deal.final_quantity), 1),
    importe: Number(deal.gmv),
    iva_traslado_pct: 16,
  }];

  // Build XML
  const folio = `MFG-${deal_lock_id.toString().padStart(6, '0')}`;
  const built = buildCfdiXml({
    emisor: {
      rfc: emisorRow.rfc,
      razon_social: emisorRow.razon_social,
      regimen_fiscal: emisorRow.regimen_fiscal,
    },
    receptor,
    serie: 'A',
    folio,
    forma_pago: '03',                                  // Transferencia
    metodo_pago: deal.finance_mode === 'A' ? 'PPD' : 'PUE',
    moneda: deal.final_currency,
    lugar_expedicion: emisorRow.lugar_expedicion,
    conceptos,
  });

  // Submit to PAC
  const pacResult = await submitToPac(emisorRow, built.xml);

  // Persist
  const ins = await pool.query(`
    INSERT INTO cfdi_invoices (
      rfq_id, deal_lock_id, cfdi_uuid, cfdi_serie, cfdi_folio, tipo_comprobante,
      forma_pago, metodo_pago, moneda, tipo_cambio,
      subtotal, descuento, iva_traslado, iva_retenido, isr_retenido, total,
      emisor_rfc, emisor_razon_social, emisor_regimen,
      receptor_rfc, receptor_razon_social, receptor_regimen, receptor_uso_cfdi, receptor_domicilio_zip,
      conceptos,
      sat_xml_signed, sat_xml_unsigned,
      sello_cfd, sello_sat, no_certificado_sat, fecha_timbrado,
      status
    ) VALUES (
      $1,$2,$3,'A',$4,'I',
      $5,$6,$7,$8,
      $9,$10,$11,$12,$13,$14,
      $15,$16,$17,
      $18,$19,$20,$21,$22,
      $23,
      $24,$25,
      $26,$27,$28,$29,
      'stamped'
    ) RETURNING id, cfdi_uuid, cfdi_folio, total
  `, [
    deal.rfq_id, deal_lock_id, pacResult.uuid, folio,
    '03', deal.finance_mode === 'A' ? 'PPD' : 'PUE', deal.final_currency, null,
    built.totals.subtotal, built.totals.descuento, built.totals.iva_traslado, 0, 0, built.totals.total,
    emisorRow.rfc, emisorRow.razon_social, emisorRow.regimen_fiscal,
    receptor.rfc, receptor.razon_social, receptor.regimen, receptor.uso_cfdi, receptor.domicilio_zip,
    JSON.stringify(conceptos),
    pacResult.xml_stamped, built.xml,
    pacResult.sello_cfd, pacResult.sello_sat, pacResult.no_certificado_sat, pacResult.fecha_timbrado,
  ]);

  return ins.rows[0];
}

// ----------------------------------------------------------------------------
// Cancel CFDI per SAT rules
// ----------------------------------------------------------------------------
async function cancelCfdi(cfdi_id, motivo) {
  if (!['01','02','03','04'].includes(motivo)) {
    throw new Error('motivo must be 01|02|03|04 per SAT cancellation rules');
  }
  // In production: hit PAC cancel endpoint with UUID + motivo
  // Stub:
  await pool.query(`
    UPDATE cfdi_invoices
       SET status='cancelled',
           cancelled_at = NOW(),
           cancellation_reason = $2,
           updated_at = NOW()
     WHERE id = $1`, [cfdi_id, motivo]);
  return { ok: true, cfdi_id, motivo };
}

// ----------------------------------------------------------------------------
// Express router
// ----------------------------------------------------------------------------
const router = express.Router();

router.post('/generate/:deal_lock_id', async (req, res) => {
  try {
    const out = await generateCfdiForDeal(parseInt(req.params.deal_lock_id, 10));
    res.json({ ok: true, ...out });
  } catch (e) {
    console.error('[CFDI] Generate failed:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/cancel/:cfdi_id', async (req, res) => {
  try {
    const out = await cancelCfdi(parseInt(req.params.cfdi_id, 10), req.body.motivo);
    res.json(out);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/preview/:cfdi_id', async (req, res) => {
  const r = await pool.query(`SELECT * FROM cfdi_invoices WHERE id = $1`, [req.params.cfdi_id]);
  if (!r.rows.length) return res.status(404).send('Not found');
  const html = buildCfdiPdfHtml({ ...r.rows[0], conceptos: r.rows[0].conceptos });
  res.set('Content-Type','text/html; charset=utf-8');
  res.send(html);
});

router.get('/xml/:cfdi_id', async (req, res) => {
  const r = await pool.query(`SELECT sat_xml_signed FROM cfdi_invoices WHERE id = $1`, [req.params.cfdi_id]);
  if (!r.rows.length) return res.status(404).send('Not found');
  res.set('Content-Type','application/xml; charset=utf-8');
  res.send(r.rows[0].sat_xml_signed);
});

module.exports = {
  router,
  buildCfdiXml,
  buildCfdiPdfHtml,
  generateCfdiForDeal,
  cancelCfdi,
  submitToPac,
};
