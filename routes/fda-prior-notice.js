// routes/fda-prior-notice.js
// FDA Prior Notice auto-builder + AI contamination probability engine
// Pulls from: production_declarations, intake_water_tests, intake_soil_reports,
//             lab_test_results, compliance_certs (all existing tables)
// AuditDNA Agriculture — Mexausa Food Group, Inc.
const express = require('express');
const router  = express.Router();

// ── CONTAMINATION RISK FACTORS (FSMA-aligned) ────────────────────────────────
const RISK_WEIGHTS = {
  ecoli_detected:          40,  // E. coli in water test = severe
  coliform_detected:       20,  // Total coliform present
  listeria_detected:       35,  // Listeria in lab test
  salmonella_detected:     35,  // Salmonella in lab test
  nitrate_exceeds_10:      10,  // FSMA ag water threshold
  cert_expired:            15,  // GAP/GlobalGAP/Primus expired
  no_water_test_90d:       20,  // No water test in 90 days
  no_soil_report_1y:       10,  // No soil report in 1 year
  pesticide_preharvest:    25,  // Pesticide applied < 7 days pre-harvest
  fda_import_alert_active: 30,  // Supplier on OpenFDA import alert
  recall_history_12m:      20,  // Grower had recall in last 12 months
};

router.get('/health', (req, res) => res.json({ ok: true, module: 'fda-prior-notice' }));

// POST /api/fda/prior-notice — generate FDA Prior Notice packet from lot code
router.post('/prior-notice', async (req, res) => {
  const db = req.app.get('db') || global.db;
  if (!db) return res.status(503).json({ error: 'DB unavailable' });
  const { lot_code, importer_name, importer_address, country_of_origin, port_of_entry, arrival_date } = req.body;
  if (!lot_code) return res.status(400).json({ error: 'lot_code required' });
  try {
    // Pull all CTE events for this lot
    const decls = await db.query(
      `SELECT * FROM production_declarations WHERE traceability_lot_code = $1 ORDER BY event_date ASC`,
      [lot_code]
    ).catch(() => ({ rows: [] }));
    const harvest = decls.rows.find(r => r.cte_type === 'HARVEST');
    const pack    = decls.rows.find(r => r.cte_type === 'INITIAL_PACKING');
    const ship    = decls.rows.find(r => r.cte_type === 'SHIPPING');
    const notice = {
      type: 'FDA_PRIOR_NOTICE',
      generated_at: new Date().toISOString(),
      lot_code,
      product: {
        description: harvest?.product_description || pack?.product_description || '',
        commodity: harvest?.commodity || '',
        variety: harvest?.variety || '',
        quantity: ship?.quantity_value || harvest?.quantity_value || '',
        unit: ship?.quantity_unit || harvest?.quantity_unit || '',
        pack_style: pack?.pack_style || '',
        ftl_food: harvest?.ftl_food || 'YES',
      },
      origin: {
        grower_id: harvest?.grower_id || '',
        location: harvest?.location_description || harvest?.location_code || '',
        country: country_of_origin || 'Mexico',
        harvest_date: harvest?.event_date || '',
        field_id: harvest?.field_id || '',
      },
      shipper: {
        entity_id: ship?.shipper_entity_id || '',
        ship_date: ship?.event_date || '',
      },
      import: {
        importer_name: importer_name || 'Mexausa Food Group, Inc.',
        importer_address: importer_address || 'Salinas, CA 93901',
        port_of_entry: port_of_entry || 'San Ysidro, CA',
        anticipated_arrival: arrival_date || '',
        fda_registration: 'Required — submit via PNS at prior-notice.fda.gov',
      },
      traceability_chain: decls.rows.map(d => ({
        cte: d.cte_type, date: d.event_date, location: d.location_code,
        qty: d.quantity_value, lot: d.traceability_lot_code,
      })),
      fsma_204_compliant: decls.rows.length >= 2,
      cte_count: decls.rows.length,
      note: 'Submit this packet via FDA Prior Notice System Interface (PNSI) at https://www.access.fda.gov',
    };
    res.json({ ok: true, prior_notice: notice });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/fda/contamination-risk/:lotCode — AI contamination probability
router.get('/contamination-risk/:lotCode', async (req, res) => {
  const db = req.app.get('db') || global.db;
  if (!db) return res.status(503).json({ error: 'DB unavailable' });
  const { lotCode } = req.params;
  try {
    const [decls, water, soil, lab, certs] = await Promise.all([
      db.query(`SELECT * FROM production_declarations WHERE traceability_lot_code=$1`, [lotCode]).catch(()=>({rows:[]})),
      db.query(`SELECT * FROM intake_water_tests WHERE lot_code=$1 ORDER BY created_at DESC LIMIT 5`, [lotCode]).catch(()=>({rows:[]})),
      db.query(`SELECT * FROM intake_soil_reports WHERE lot_code=$1 ORDER BY created_at DESC LIMIT 3`, [lotCode]).catch(()=>({rows:[]})),
      db.query(`SELECT * FROM lab_test_results WHERE lot_code=$1 ORDER BY created_at DESC LIMIT 10`, [lotCode]).catch(()=>({rows:[]})),
      db.query(`SELECT * FROM compliance_certs WHERE grower_id IN (SELECT grower_id FROM production_declarations WHERE traceability_lot_code=$1)`, [lotCode]).catch(()=>({rows:[]})),
    ]);
    let score = 0;
    const flags = [];
    const now = new Date();
    // Water tests
    const latestWater = water.rows[0];
    if (!latestWater) {
      score += RISK_WEIGHTS.no_water_test_90d; flags.push({ risk: 'No water test on file', weight: RISK_WEIGHTS.no_water_test_90d, severity: 'HIGH' });
    } else {
      if (parseFloat(latestWater.ecoli||0) > 0)   { score += RISK_WEIGHTS.ecoli_detected;    flags.push({ risk: 'E. coli detected in water', weight: RISK_WEIGHTS.ecoli_detected, severity: 'CRITICAL' }); }
      if (parseFloat(latestWater.coliform||0) > 0) { score += RISK_WEIGHTS.coliform_detected; flags.push({ risk: 'Total coliform in water', weight: RISK_WEIGHTS.coliform_detected, severity: 'HIGH' }); }
      if (parseFloat(latestWater.nitrate||0) > 10) { score += RISK_WEIGHTS.nitrate_exceeds_10; flags.push({ risk: 'Nitrate > 10 mg/L (FSMA threshold)', weight: RISK_WEIGHTS.nitrate_exceeds_10, severity: 'MEDIUM' }); }
    }
    // Lab tests
    for (const l of lab.rows) {
      if (l.pathogen_type === 'Listeria'   || (l.result||'').toLowerCase().includes('listeria'))   { score += RISK_WEIGHTS.listeria_detected;  flags.push({ risk: 'Listeria detected', weight: RISK_WEIGHTS.listeria_detected, severity: 'CRITICAL' }); }
      if (l.pathogen_type === 'Salmonella' || (l.result||'').toLowerCase().includes('salmonella')) { score += RISK_WEIGHTS.salmonella_detected; flags.push({ risk: 'Salmonella detected', weight: RISK_WEIGHTS.salmonella_detected, severity: 'CRITICAL' }); }
    }
    // Certs
    for (const c of certs.rows) {
      if (c.expiry_date && new Date(c.expiry_date) < now) { score += RISK_WEIGHTS.cert_expired; flags.push({ risk: `Cert expired: ${c.cert_type}`, weight: RISK_WEIGHTS.cert_expired, severity: 'HIGH' }); }
    }
    // Pesticide pre-harvest check
    const harvest = decls.rows.find(r => r.cte_type === 'HARVEST');
    if (harvest?.pesticide_records && Array.isArray(harvest.pesticide_records)) {
      const recentPesticide = harvest.pesticide_records.find(p => {
        if (!p.application_date) return false;
        const days = (new Date(harvest.event_date) - new Date(p.application_date)) / 86400000;
        return days < 7;
      });
      if (recentPesticide) { score += RISK_WEIGHTS.pesticide_preharvest; flags.push({ risk: 'Pesticide applied <7 days pre-harvest', weight: RISK_WEIGHTS.pesticide_preharvest, severity: 'HIGH' }); }
    }
    const maxScore = 100;
    const pct = Math.min(Math.round((score / maxScore) * 100), 100);
    const level = pct >= 60 ? 'CRITICAL' : pct >= 35 ? 'HIGH' : pct >= 15 ? 'MEDIUM' : 'LOW';
    res.json({
      ok: true, lot_code: lotCode,
      contamination_risk: { score: pct, level, flags, raw_score: score },
      recommendation: level === 'CRITICAL' ? 'DO NOT SHIP — immediate corrective action required'
        : level === 'HIGH'   ? 'Hold shipment — address flags before release'
        : level === 'MEDIUM' ? 'Proceed with caution — document corrective actions'
        : 'Clear to ship — maintain monitoring schedule',
      fsma_reference: 'FSMA Agricultural Water Standard (21 CFR Part 112)',
      cte_events: decls.rows.length,
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/fda/bulk-risk — risk scores for all active lots
router.get('/bulk-risk', async (req, res) => {
  const db = req.app.get('db') || global.db;
  if (!db) return res.status(503).json({ error: 'DB unavailable' });
  try {
    const lots = await db.query(
      `SELECT DISTINCT traceability_lot_code, commodity, MAX(event_date) as last_event
       FROM production_declarations WHERE event_date > NOW() - INTERVAL '30 days'
       GROUP BY traceability_lot_code, commodity ORDER BY last_event DESC LIMIT 100`
    ).catch(() => ({ rows: [] }));
    res.json({ ok: true, lots: lots.rows, count: lots.rows.length,
      note: 'Call GET /api/fda/contamination-risk/:lotCode for individual risk scores' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
