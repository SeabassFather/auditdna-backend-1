// routes/globalCompliance.js
// SENASICA crosswalk engine + border-ready doc builder + Verified Exporter Network
// Replaces 42-line stub — uses existing tables only
// AuditDNA Agriculture — Mexausa Food Group, Inc.
const express = require('express');
const router  = express.Router();

router.get('/health', (req, res) => res.json({ ok: true, module: 'globalCompliance' }));

// ── COMMODITY CROSSWALK: USDA ↔ SENASICA ↔ FDA ↔ GS1 ↔ HTS ─────────────────
const CROSSWALK = {
  avocado:    { usda:'AVOCADOS',     senasica:'AGUACATE HASS',  fda_code:'0804400000', hs:'0804.40', gs1:'01040000', aphis_permit:true,  quarantine_pests:['Mediterranean fruit fly','Avocado seed moth'] },
  lettuce:    { usda:'LETTUCE',      senasica:'LECHUGA',        fda_code:'0705190000', hs:'0705',    gs1:'01030000', aphis_permit:false, quarantine_pests:['Lettuce mosaic virus'] },
  tomato:     { usda:'TOMATOES',     senasica:'JITOMATE',       fda_code:'0702000000', hs:'0702',    gs1:'01050000', aphis_permit:false, quarantine_pests:['Tomato yellow leaf curl virus','Tuta absoluta'] },
  strawberry: { usda:'STRAWBERRIES', senasica:'FRESA',          fda_code:'0810100000', hs:'0810.10', gs1:'01090000', aphis_permit:false, quarantine_pests:['Botrytis cinerea'] },
  broccoli:   { usda:'BROCCOLI',     senasica:'BROCOLI',        fda_code:'0704100000', hs:'0704.10', gs1:'01020000', aphis_permit:false, quarantine_pests:['Cabbage looper','Imported cabbageworm'] },
  pepper:     { usda:'PEPPERS',      senasica:'CHILE BELL',     fda_code:'0709600000', hs:'0709.60', gs1:'01060000', aphis_permit:false, quarantine_pests:['Pepper weevil','Anthracnose'] },
  cucumber:   { usda:'CUCUMBERS',    senasica:'PEPINO',         fda_code:'0707000000', hs:'0707',    gs1:'01070000', aphis_permit:false, quarantine_pests:['Cucumber mosaic virus'] },
  spinach:    { usda:'SPINACH',      senasica:'ESPINACA',       fda_code:'0709700000', hs:'0709.70', gs1:'01080000', aphis_permit:false, quarantine_pests:['Downy mildew'] },
  mango:      { usda:'MANGOES',      senasica:'MANGO ATAULFO',  fda_code:'0804502000', hs:'0804.50', gs1:'01091000', aphis_permit:true,  quarantine_pests:['Mexican fruit fly','Mango weevil'] },
  blueberry:  { usda:'BLUEBERRIES',  senasica:'ARANDANO AZUL',  fda_code:'0810400000', hs:'0810.40', gs1:'01092000', aphis_permit:false, quarantine_pests:['Spotted wing drosophila'] },
  grape:      { usda:'GRAPES',       senasica:'UVA DE MESA',    fda_code:'0806100000', hs:'0806.10', gs1:'01093000', aphis_permit:false, quarantine_pests:['Grape phylloxera','Pierce disease'] },
};

// ── PORT OF ENTRY CODES ───────────────────────────────────────────────────────
const PORTS = {
  san_ysidro:   { code:'2506', name:'San Ysidro, CA',      cbp_district:'San Diego' },
  otay_mesa:    { code:'2507', name:'Otay Mesa, CA',       cbp_district:'San Diego' },
  calexico:     { code:'2501', name:'Calexico, CA',        cbp_district:'San Diego' },
  nogales:      { code:'2601', name:'Nogales, AZ',         cbp_district:'Tucson' },
  el_paso:      { code:'2401', name:'El Paso, TX',         cbp_district:'El Paso' },
  laredo:       { code:'2301', name:'Laredo, TX',          cbp_district:'Laredo' },
};

// ── ROUTES ────────────────────────────────────────────────────────────────────

// GET /api/global-compliance/crosswalk
router.get('/crosswalk', (req, res) => {
  const { commodity } = req.query;
  if (commodity && CROSSWALK[commodity.toLowerCase()]) {
    return res.json({ ok:true, commodity, crosswalk: CROSSWALK[commodity.toLowerCase()] });
  }
  res.json({ ok:true, crosswalk: CROSSWALK, commodities: Object.keys(CROSSWALK), ports: PORTS });
});

// POST /api/global-compliance/border-packet — generate full border-ready doc set
router.post('/border-packet', async (req, res) => {
  const db = req.app.get('db') || global.db;
  const { lot_code, commodity, port_of_entry = 'otay_mesa', importer, carrier } = req.body;
  if (!lot_code || !commodity) return res.status(400).json({ error: 'lot_code and commodity required' });
  const cx = CROSSWALK[commodity.toLowerCase()];
  if (!cx) return res.status(400).json({ error: `Unknown commodity. Known: ${Object.keys(CROSSWALK).join(', ')}` });
  const port = PORTS[port_of_entry] || PORTS.otay_mesa;
  let decls = [];
  if (db) {
    const r = await db.query(
      `SELECT * FROM production_declarations WHERE traceability_lot_code=$1 ORDER BY event_date ASC`, [lot_code]
    ).catch(()=>({rows:[]}));
    decls = r.rows;
  }
  const harvest = decls.find(d=>d.cte_type==='HARVEST');
  const ship    = decls.find(d=>d.cte_type==='SHIPPING');
  const certs   = db ? await db.query(
    `SELECT * FROM compliance_certs WHERE grower_id=$1 AND expiry_date > NOW()`,
    [harvest?.grower_id||'']
  ).catch(()=>({rows:[]})) : {rows:[]};

  const packet = {
    generated_at: new Date().toISOString(),
    lot_code, commodity,
    documents: {
      // 1. CBP Entry
      cbp_entry: {
        type: 'CBP Form 3461 / ACE Entry',
        port: port.name, port_code: port.code,
        importer: importer || 'Mexausa Food Group, Inc.',
        carrier: carrier || '',
        commodity_description: `Fresh ${cx.senasica}`,
        hs_code: cx.hs,
        fda_product_code: cx.fda_code,
        country_of_origin: 'MX',
        quantity: ship?.quantity_value || harvest?.quantity_value || '',
        unit: ship?.quantity_unit || '',
        lot_reference: lot_code,
      },
      // 2. SENASICA Phytosanitary Certificate (structure for validation)
      senasica_phyto: {
        type: 'Certificado Fitosanitario Internacional SENASICA',
        commodity_mx: cx.senasica,
        commodity_en: commodity.toUpperCase(),
        origin_state: harvest?.location_description || 'Baja California',
        grower_id: harvest?.grower_id || '',
        inspection_required: true,
        quarantine_pests: cx.quarantine_pests,
        aphis_permit_required: cx.aphis_permit,
        gs1_code: cx.gs1,
        note: 'Obtain from SENASICA regional office. Validate at: https://www.gob.mx/senasica',
      },
      // 3. USDA APHIS PPQ
      aphis_ppq: {
        type: cx.aphis_permit ? 'USDA APHIS PPQ Permit Required' : 'USDA APHIS Inspection at POE',
        commodity: cx.usda,
        permit_required: cx.aphis_permit,
        inspection_point: port.name,
        cbp_agriculture_specialist: true,
        reference: 'https://www.aphis.usda.gov/import_export/plants',
      },
      // 4. FDA Prior Notice
      fda_prior_notice: {
        type: 'FDA Prior Notice (FSMA 107)',
        product_code: cx.fda_code,
        submit_via: 'FDA PNSI at https://www.access.fda.gov',
        submission_window: '2-72 hours before arrival',
        lot_code,
        fsma_204_cte_count: decls.length,
        traceability_compliant: decls.length >= 2,
      },
      // 5. Active compliance certs
      compliance_certs: certs.rows.map(c=>({ type:c.cert_type, number:c.cert_number, expiry:c.expiry_date })),
    },
    cbp_readiness_score: Math.round((decls.length/7)*40 + (certs.rows.length>0?30:0) + 30),
    missing_items: [
      ...(!harvest?['Harvest CTE not recorded']:[]),
      ...(!ship?['Shipping CTE not recorded']:[]),
      ...(certs.rows.length===0?['No active compliance certs on file']:[]),
      ...(cx.aphis_permit?['APHIS import permit required — obtain before shipment']:[]),
    ],
  };
  res.json({ ok:true, packet });
});

// GET /api/global-compliance/verified-exporters — Verified Exporter Network
router.get('/verified-exporters', async (req, res) => {
  const db = req.app.get('db') || global.db;
  if (!db) return res.status(503).json({ error: 'DB unavailable' });
  try {
    const { commodity, state, min_score } = req.query;
    let q = `SELECT gc.*, cc.cert_type, cc.expiry_date,
             COUNT(DISTINCT pd.traceability_lot_code) as lots_tracked,
             COUNT(DISTINCT pd.id) as cte_events
             FROM grower_contacts gc
             LEFT JOIN compliance_certs cc ON cc.grower_id::text = gc.id::text AND cc.expiry_date > NOW()
             LEFT JOIN production_declarations pd ON pd.grower_id::text = gc.id::text
             WHERE 1=1`;
    const params = [];
    if (commodity) { params.push(commodity); q += ` AND gc.commodity_focus ILIKE '%' || $${params.length} || '%'`; }
    if (state)     { params.push(state);     q += ` AND gc.state ILIKE '%' || $${params.length} || '%'`; }
    q += ` GROUP BY gc.id, cc.cert_type, cc.expiry_date ORDER BY lots_tracked DESC LIMIT 100`;
    const r = await db.query(q, params).catch(()=>({rows:[]}));
    const exporters = r.rows.map(e => ({
      id: e.id, name: e.company_name || e.contact_name,
      commodity: e.commodity_focus, state: e.state, country: e.country||'MX',
      cert_type: e.cert_type, cert_expiry: e.expiry_date,
      lots_tracked: parseInt(e.lots_tracked||0),
      cte_events: parseInt(e.cte_events||0),
      verified_score: Math.min(100, (parseInt(e.lots_tracked||0)*5) + (e.cert_type?30:0) + 20),
      status: e.cert_type && new Date(e.expiry_date)>new Date() ? 'VERIFIED' : 'UNVERIFIED',
    })).filter(e => !min_score || e.verified_score >= parseInt(min_score));
    res.json({ ok:true, exporters, count: exporters.length,
      verified_count: exporters.filter(e=>e.status==='VERIFIED').length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/global-compliance/senasica-validate — validate SENASICA cert structure
router.post('/senasica-validate', (req, res) => {
  const { cert_number, commodity, grower_name, issue_date, expiry_date, origin_state } = req.body;
  const warnings = [];
  if (!cert_number)   warnings.push('Missing certificate number');
  if (!commodity)     warnings.push('Missing commodity');
  if (!issue_date)    warnings.push('Missing issue date');
  if (!expiry_date)   warnings.push('Missing expiry date');
  if (!origin_state)  warnings.push('Missing origin state');
  if (expiry_date && new Date(expiry_date) < new Date()) warnings.push('EXPIRED — cert is past expiry date');
  const cx = commodity ? CROSSWALK[commodity.toLowerCase()] : null;
  if (cx?.aphis_permit) warnings.push('This commodity requires USDA APHIS import permit');
  const valid = warnings.filter(w=>!w.includes('APHIS')).length === 0;
  res.json({ ok:true, valid, warnings, crosswalk: cx || null,
    senasica_portal: 'https://www.gob.mx/senasica',
    verification_url: 'https://senasicaweb.senasica.gob.mx:8443/eCertInspComerInt/index.xhtml' });
});

module.exports = router;
