// traceabilityWorkflow.js — FSMA 204 CTE workflow engine
// Writes to production_declarations + intake_traceability_lots (existing tables)
// AuditDNA Agriculture — Mexausa Food Group
const express = require('express');
const router  = express.Router();

const CTE_SEQUENCE = ['HARVEST','COOLING','INITIAL_PACKING','FIRST_RECEIVER','SHIPPING','RECEIVING','TRANSFORMATION'];

const KDE_REQUIRED = {
  HARVEST:         ['lot','commodity','grower_id','location_code','event_date','quantity_value','quantity_unit','harvest_method'],
  COOLING:         ['lot','commodity','location_code','event_date','temperature_log'],
  INITIAL_PACKING: ['lot','commodity','packer_entity_id','location_code','event_date','pack_style','quantity_value'],
  FIRST_RECEIVER:  ['lot','commodity','receiver_entity_id','location_code','event_date','quantity_value'],
  SHIPPING:        ['lot','commodity','shipper_entity_id','receiver_entity_id','event_date','quantity_value'],
  RECEIVING:       ['lot','commodity','receiver_entity_id','location_code','event_date','quantity_value'],
  TRANSFORMATION:  ['lot','commodity','location_code','event_date','input_lots','quantity_value'],
};

router.get('/health', (req, res) => res.json({ ok: true, module: 'traceabilityWorkflow', cte_types: CTE_SEQUENCE }));

// GET /api/traceability/lot/:lotCode — full chain for a lot
router.get('/lot/:lotCode', async (req, res) => {
  const db = req.app.get('db') || global.db;
  if (!db) return res.status(503).json({ error: 'DB unavailable' });
  try {
    const r = await db.query(
      `SELECT * FROM production_declarations WHERE traceability_lot_code = $1 ORDER BY event_date ASC, created_at ASC`,
      [req.params.lotCode]
    );
    const chain = r.rows;
    const cte_sequence = chain.map(c => c.cte_type);
    const missing_ctes = CTE_SEQUENCE.filter(c => !cte_sequence.includes(c));
    res.json({ ok: true, lot: req.params.lotCode, chain, cte_count: chain.length, cte_sequence, missing_ctes });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/traceability/recall/:lotCode — full traceback for recall
router.get('/recall/:lotCode', async (req, res) => {
  const db = req.app.get('db') || global.db;
  if (!db) return res.status(503).json({ error: 'DB unavailable' });
  try {
    // Walk input_lots recursively to reconstruct contamination tree
    const visited = new Set();
    const tree = [];
    const queue = [req.params.lotCode];
    while (queue.length) {
      const lot = queue.shift();
      if (visited.has(lot)) continue;
      visited.add(lot);
      const r = await db.query(
        `SELECT * FROM production_declarations WHERE traceability_lot_code = $1 ORDER BY event_date ASC`, [lot]
      );
      for (const row of r.rows) {
        tree.push(row);
        const inputs = Array.isArray(row.input_lots) ? row.input_lots : (row.input_lots || []);
        inputs.forEach(il => il && !visited.has(il) && queue.push(il));
      }
    }
    // Identify all entities touched
    const entities = [...new Set(tree.flatMap(r => [
      r.grower_id, r.packer_entity_id, r.shipper_entity_id,
      r.receiver_entity_id, r.buyer_entity_id
    ].filter(Boolean)))];
    const commodities = [...new Set(tree.map(r => r.commodity).filter(Boolean))];
    res.json({
      ok: true, lot: req.params.lotCode,
      recall_chain: tree, lots_in_scope: [...visited],
      entities_touched: entities, commodities, cte_count: tree.length,
      financial_exposure_units: tree.reduce((s,r) => s + (parseFloat(r.quantity_value)||0), 0)
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/traceability/feed — recent CTEs across all lots
router.get('/feed', async (req, res) => {
  const db = req.app.get('db') || global.db;
  if (!db) return res.status(503).json({ error: 'DB unavailable' });
  try {
    const limit = Math.min(parseInt(req.query.limit)||50, 200);
    const r = await db.query(
      `SELECT pd.*, gc.company_name as grower_name
       FROM production_declarations pd
       LEFT JOIN grower_contacts gc ON gc.id::text = pd.grower_id::text
       ORDER BY pd.created_at DESC LIMIT $1`, [limit]
    );
    res.json({ ok: true, ctes: r.rows, total: r.rows.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/traceability/kde-schema — full KDE requirements per CTE type
router.get('/kde-schema', (req, res) => {
  res.json({ ok: true, schema: KDE_REQUIRED, cte_types: CTE_SEQUENCE,
    fsma_204_section: 'Section 204 of the FDA Food Safety Modernization Act',
    effective_date: '2026-01-20',
    covered_foods: ['Leafy Greens','Tomatoes','Peppers','Cucumbers','Herbs','Melons','Tropical Tree Fruits','Berries'],
    source: 'https://www.fda.gov/food/food-safety-modernization-act-fsma/fsma-rule-requirements-additional-traceability-records-certain-foods'
  });
});

// GET /api/traceability/intel-report — aggregate data for gov agency reports
router.get('/intel-report', async (req, res) => {
  const db = req.app.get('db') || global.db;
  if (!db) return res.status(503).json({ error: 'DB unavailable' });
  try {
    const [decls, water, soil, lab] = await Promise.all([
      db.query(`SELECT commodity, cte_type, COUNT(*) as count, SUM(quantity_value) as total_qty,
                AVG(quantity_value) as avg_qty, location_code, DATE_TRUNC('month', event_date) as month
                FROM production_declarations WHERE event_date > NOW() - INTERVAL '12 months'
                GROUP BY commodity, cte_type, location_code, DATE_TRUNC('month', event_date)
                ORDER BY month DESC`).catch(()=>({rows:[]})),
      db.query(`SELECT * FROM intake_water_tests ORDER BY created_at DESC LIMIT 500`).catch(()=>({rows:[]})),
      db.query(`SELECT * FROM intake_soil_reports ORDER BY created_at DESC LIMIT 500`).catch(()=>({rows:[]})),
      db.query(`SELECT * FROM lab_test_results ORDER BY created_at DESC LIMIT 500`).catch(()=>({rows:[]})),
    ]);
    const report = {
      generated_at: new Date().toISOString(),
      platform: 'AuditDNA Agriculture — Mexausa Food Group, Inc.',
      period: 'Last 12 months',
      traceability: {
        total_cte_events: decls.rows.reduce((s,r) => s+parseInt(r.count),0),
        commodities_tracked: [...new Set(decls.rows.map(r=>r.commodity).filter(Boolean))],
        cte_distribution: decls.rows,
        locations: [...new Set(decls.rows.map(r=>r.location_code).filter(Boolean))],
      },
      water_safety: {
        tests_total: water.rows.length,
        ecoli_violations: water.rows.filter(r => parseFloat(r.ecoli||0) > 0).length,
        nitrate_violations: water.rows.filter(r => parseFloat(r.nitrate||0) > 10).length,
      },
      soil_health: {
        reports_total: soil.rows.length,
      },
      lab_tests: {
        total: lab.rows.length,
        positive_pathogens: lab.rows.filter(r => r.pathogen_detected).length,
      },
      grant_eligibility: [
        'USDA SBIR Phase I — Section 204 Traceability Technology',
        'USDA LFPP — Local Food Promotion Program (Deadline Aug 2026)',
        'USDA AMS Specialty Crop Block Grant',
        'FDA Cooperative Agreement — FSMA Implementation',
        'EPA Environmental Justice Collaborative Problem-Solving',
        'USDA RBEG — Rural Business Enterprise Grant',
      ]
    };
    res.json({ ok: true, report });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
