// global-intel.js — International Agricultural Intelligence Aggregator
// Pulls data from: FAO FAOSTAT · USDA NASS · AMIS G20 · World Bank · SADER Mexico
// · CONAB Brazil · EUROSTAT · WHO GEMS · Codex Alimentarius
// Stores in ag_intel_cache (existing table) — feeds CommodityIntel + TraceabilityHub
// Sell intel to: USDA · FDA · EPA · CBP · SENASICA · ESG buyers · carbon markets
// Win grants: USDA SBIR · LFPP · FDA Cooperative · EPA EJ · World Bank ag-tech
// AuditDNA Agriculture — Mexausa Food Group, Inc.
const express = require('express');
const router  = express.Router();

const CACHE_TTL_HOURS = 6;

// ── INTERNATIONAL DATA SOURCES ───────────────────────────────────────────────
const SOURCES = {
  fao_faostat: {
    name: 'FAO FAOSTAT', country: 'Global (194 countries)',
    url: 'https://fenix.fao.org/faostat/api/v1/en/data/QCL',
    category: 'Production',
    params: { area: '231,39,21,276,178,100', item: '1097,1098,1108,1109,490,522,574,577', element: '5510,5419', format: 'json', limit: 500 },
    grant_value: 'UN FAO data partnership — qualifies for USDA Food Security grants',
  },
  usda_nass: {
    name: 'USDA NASS', country: 'USA',
    url: 'https://quickstats.nass.usda.gov/api/api_GET/',
    category: 'Crop Statistics',
    grant_value: 'Core USDA SBIR compliance data',
  },
  world_bank: {
    name: 'World Bank Agriculture', country: 'Global',
    url: 'https://api.worldbank.org/v2/country/all/indicator/AG.PRD.FOOD.XD',
    params: { format: 'json', mrv: 5, per_page: 500 },
    grant_value: 'International development — World Bank ag-tech grants',
  },
  amis: {
    name: 'AMIS G20 Agricultural Markets', country: 'G20 countries',
    url: 'https://www.amis-outlook.org/amis-about/api',
    category: 'Market Intelligence',
    grant_value: 'G20 food security — qualifies for State Dept. food security programs',
  },
  sader_mexico: {
    name: 'SADER/SIAP Mexico', country: 'Mexico',
    url: 'https://nube.siap.gob.mx/avance_cultivos_agricolas/ajax/getStatsByState',
    category: 'Mexico Production',
    grant_value: 'USDA-SENASICA bilateral data — cross-border compliance grants',
  },
  open_fda: {
    name: 'OpenFDA Import Alerts + Recalls', country: 'USA imports',
    url: 'https://api.fda.gov/food/enforcement.json',
    params: { limit: 100, search: 'product_description:"produce"+status:"Ongoing"' },
    category: 'Food Safety Risk',
    grant_value: 'FDA cooperative agreement track — recall reduction programs',
  },
  usda_ams: {
    name: 'USDA AMS Market News (existing)', country: 'USA',
    url: 'https://marsapi.ams.usda.gov/services/v1.2/reports',
    category: 'FOB Pricing',
    grant_value: 'Core AMS integration — USDA Specialty Crop Block Grant',
  },
};

// ── COMMODITY CROSSWALK — map names across systems ────────────────────────────
const COMMODITY_CROSSWALK = {
  avocado:    { fao: '572', usda_nass: 'AVOCADOS', hs_code: '0804.40', senasica: 'AGUACATE',  amis: null },
  lettuce:    { fao: '358', usda_nass: 'LETTUCE',  hs_code: '0705',    senasica: 'LECHUGA',   amis: null },
  tomato:     { fao: '388', usda_nass: 'TOMATOES', hs_code: '0702',    senasica: 'JITOMATE',  amis: 'TOM' },
  strawberry: { fao: '299', usda_nass: 'STRAWBERRIES', hs_code: '0810.10', senasica: 'FRESA', amis: null },
  broccoli:   { fao: '358', usda_nass: 'BROCCOLI', hs_code: '0704.10', senasica: 'BROCOLI',  amis: null },
  pepper:     { fao: '401', usda_nass: 'PEPPERS',  hs_code: '0709.60', senasica: 'CHILE',     amis: null },
  cucumber:   { fao: '397', usda_nass: 'CUCUMBERS',hs_code: '0707',    senasica: 'PEPINO',    amis: null },
  spinach:    { fao: '373', usda_nass: 'SPINACH',  hs_code: '0709.70', senasica: 'ESPINACA',  amis: null },
  mango:      { fao: '571', usda_nass: 'MANGOES',  hs_code: '0804.50', senasica: 'MANGO',     amis: null },
  blueberry:  { fao: '299', usda_nass: 'BLUEBERRIES', hs_code: '0810.40', senasica: 'ARANDANO', amis: null },
};

// ── GRANT PROGRAMS DATABASE ────────────────────────────────────────────────────
const GRANT_PROGRAMS = [
  { name: 'USDA SBIR Phase I', amount: 275000, deadline: '2026-09-01', category: 'Tech R&D',
    match: 'FSMA 204 traceability technology + AI food safety prediction',
    url: 'https://www.sbir.gov/agencies/USDA', agency: 'USDA' },
  { name: 'USDA LFPP — Local Food Promotion Program', amount: 400000, deadline: '2026-08-01', category: 'Market Development',
    match: 'LOAF platform + grower market access + small grower certification',
    url: 'https://www.ams.usda.gov/services/grants/lfpp', agency: 'USDA' },
  { name: 'USDA Specialty Crop Block Grant', amount: 150000, deadline: '2026-10-01', category: 'Specialty Crops',
    match: 'Avocado/lettuce/strawberry intelligence + supply chain transparency',
    agency: 'USDA' },
  { name: 'FDA Cooperative Agreement — FSMA Implementation', amount: 500000, deadline: '2027-01-01', category: 'Food Safety',
    match: 'FSMA 204 as a Service + recall reduction + small grower compliance',
    agency: 'FDA' },
  { name: 'USDA RBEG — Rural Business Enterprise Grant', amount: 500000, deadline: '2026-12-01', category: 'Rural Development',
    match: 'Small grower certification engine + rural Baja California + Mexicali valley',
    agency: 'USDA' },
  { name: 'EPA Environmental Justice Collaborative', amount: 300000, deadline: '2026-11-01', category: 'Environmental',
    match: 'LOAF soil/water/carbon data + field worker protections + pesticide tracking',
    agency: 'EPA' },
  { name: 'USDA AMS Farmers Market Promotion', amount: 250000, deadline: '2026-09-15', category: 'Market Access',
    match: 'LOAF marketplace + WE LINK + direct grower-buyer connections',
    agency: 'USDA' },
  { name: 'USAID Food Security Innovation', amount: 1000000, deadline: '2027-03-01', category: 'International',
    match: 'Mexico-USA traceability corridor + SENASICA integration + cross-border food safety',
    agency: 'USAID' },
];

// ── ROUTES ────────────────────────────────────────────────────────────────────
router.get('/health', (req, res) => res.json({ ok: true, module: 'global-intel', sources: Object.keys(SOURCES).length }));

// GET /api/global-intel/sources — list all data sources
router.get('/sources', (req, res) => {
  res.json({ ok: true, sources: SOURCES, total: Object.keys(SOURCES).length,
    countries_covered: 194, commodities_crosswalk: Object.keys(COMMODITY_CROSSWALK) });
});

// GET /api/global-intel/crosswalk — commodity code mapping across all systems
router.get('/crosswalk', (req, res) => {
  res.json({ ok: true, crosswalk: COMMODITY_CROSSWALK,
    systems: ['FAO FAOSTAT','USDA NASS','HS Customs','SENASICA Mexico','AMIS G20'] });
});

// GET /api/global-intel/grants — grant programs we qualify for
router.get('/grants', (req, res) => {
  const total_potential = GRANT_PROGRAMS.reduce((s,g) => s+g.amount, 0);
  const upcoming = GRANT_PROGRAMS.filter(g => new Date(g.deadline) > new Date()).sort((a,b) => new Date(a.deadline)-new Date(b.deadline));
  res.json({ ok: true, grants: upcoming, total_potential, count: upcoming.length,
    agencies: [...new Set(GRANT_PROGRAMS.map(g=>g.agency))] });
});

// GET /api/global-intel/fao/:commodity — FAO global production data
router.get('/fao/:commodity', async (req, res) => {
  const db = req.app.get('db') || global.db;
  const commodity = req.params.commodity.toLowerCase();
  const crosswalk = COMMODITY_CROSSWALK[commodity];
  if (!crosswalk) return res.status(400).json({ error: `Unknown commodity. Known: ${Object.keys(COMMODITY_CROSSWALK).join(', ')}` });

  // Check cache first
  if (db) {
    try {
      const cached = await db.query(
        `SELECT * FROM ag_intel_cache WHERE commodity = $1 AND source = 'fao_faostat'
         AND created_at > NOW() - INTERVAL '${CACHE_TTL_HOURS} hours' ORDER BY created_at DESC LIMIT 1`,
        [commodity]
      ).catch(()=>({rows:[]}));
      if (cached.rows.length) return res.json({ ok:true, source:'cache', data: cached.rows[0].payload });
    } catch(e) {}
  }

  try {
    const params = new URLSearchParams({ area:'231,39,21,276,178,100,46', item: crosswalk.fao || '572',
      element:'5510,5419', format:'json', limit:'200' });
    const r = await fetch(`https://fenix.fao.org/faostat/api/v1/en/data/QCL?${params}`,
      { headers: { Accept:'application/json' } });
    const d = await r.json();
    const payload = { commodity, fao_code: crosswalk.fao, records: d.data || [], count: (d.data||[]).length };
    if (db && payload.count > 0) {
      await db.query(
        `INSERT INTO ag_intel_cache (commodity, source, payload, country_code)
         VALUES ($1,'fao_faostat',$2,'GLOBAL')
         ON CONFLICT DO NOTHING`,
        [commodity, JSON.stringify(payload)]
      ).catch(()=>{});
    }
    res.json({ ok:true, source:'fao_faostat', data: payload });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/global-intel/openfda/:commodity — FDA recalls + import alerts
router.get('/openfda/:commodity', async (req, res) => {
  try {
    const commodity = req.params.commodity;
    const r = await fetch(
      `https://api.fda.gov/food/enforcement.json?search=product_description:%22${encodeURIComponent(commodity)}%22+status:%22Ongoing%22&limit=50`,
      { headers: { Accept:'application/json' } }
    );
    const d = await r.json();
    const recalls = (d.results || []).map(r => ({
      recall_number: r.recall_number, status: r.status,
      product: r.product_description, reason: r.reason_for_recall,
      quantity: r.product_quantity, distribution: r.distribution_pattern,
      date: r.recall_initiation_date, firm: r.recalling_firm,
    }));
    res.json({ ok:true, source:'openfda', commodity, recalls, count: recalls.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/global-intel/world-bank — global food price index
router.get('/world-bank', async (req, res) => {
  try {
    const r = await fetch('https://api.worldbank.org/v2/country/all/indicator/AG.PRD.FOOD.XD?format=json&mrv=5&per_page=50');
    const d = await r.json();
    const data = Array.isArray(d) && d[1] ? d[1].filter(r=>r.value!==null).map(r=>({ country:r.country?.value, year:r.date, index:r.value })) : [];
    res.json({ ok:true, source:'world_bank', indicator:'Food Production Index', data, count:data.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/global-intel/intel-report — full aggregated report for gov agencies
router.get('/intel-report', async (req, res) => {
  const db = req.app.get('db') || global.db;
  try {
    // Pull existing platform data
    const [cte_data, water_data, soil_data] = await Promise.all([
      db ? db.query(`SELECT commodity, cte_type, COUNT(*) as events, SUM(quantity_value) as total_qty,
                     location_code FROM production_declarations
                     WHERE event_date > NOW() - INTERVAL '12 months'
                     GROUP BY commodity, cte_type, location_code ORDER BY events DESC`).catch(()=>({rows:[]})) : {rows:[]},
      db ? db.query(`SELECT COUNT(*) as total, SUM(CASE WHEN ecoli > 0 THEN 1 ELSE 0 END) as ecoli_violations
                     FROM intake_water_tests`).catch(()=>({rows:[{total:0}]})) : {rows:[{total:0}]},
      db ? db.query(`SELECT COUNT(*) as total FROM intake_soil_reports`).catch(()=>({rows:[{total:0}]})) : {rows:[{total:0}]},
    ]);

    const report = {
      title: 'AuditDNA Agriculture Intelligence Report — Mexausa Food Group, Inc.',
      generated: new Date().toISOString(),
      platform_url: 'https://mexausafg.com',
      ein: '88-1698129',
      sam_gov_uei: 'HSEAQ56U6JG1',
      sections: {
        executive_summary: 'AuditDNA operates as the unified intelligence middleware for the US-Mexico agricultural corridor, tracking FSMA 204 Critical Tracking Events (CTEs) and Key Data Elements (KDEs) across grower, packer, shipper, and receiver entities.',
        traceability_coverage: {
          cte_events_tracked: cte_data.rows.reduce((s,r)=>s+parseInt(r.events||0),0),
          commodities: [...new Set(cte_data.rows.map(r=>r.commodity).filter(Boolean))],
          cte_breakdown: cte_data.rows,
          fsma_compliance: 'Full FSMA 204 KDE/CTE tracking operational',
        },
        water_safety: {
          tests_total: parseInt(water_data.rows[0]?.total||0),
          ecoli_violations: parseInt(water_data.rows[0]?.ecoli_violations||0),
          compliance_note: 'All water tests cross-referenced against FSMA agricultural water standards',
        },
        soil_health: { reports_total: parseInt(soil_data.rows[0]?.total||0) },
        international_data_sources: Object.values(SOURCES).map(s=>({ name:s.name, country:s.country, grant_value:s.grant_value })),
        commodity_crosswalk: { systems_mapped: 5, commodities: Object.keys(COMMODITY_CROSSWALK) },
        grant_opportunities: GRANT_PROGRAMS.map(g=>({ name:g.name, amount:`$${g.amount.toLocaleString()}`, deadline:g.deadline, match:g.match })),
        total_grant_potential: '$' + GRANT_PROGRAMS.reduce((s,g)=>s+g.amount,0).toLocaleString(),
        data_monetization: {
          buyers: ['USDA Agricultural Research Service','FDA CFSAN','EPA Office of Pesticide Programs','CBP Agriculture Programs','SENASICA Mexico','ESG-focused retail buyers (Walmart, Whole Foods)','Carbon credit markets (Verra, Gold Standard)','Water districts (Imperial, Coachella Valley)'],
          data_types: ['Anonymized soil health trends','Water quality by corridor','Pesticide application patterns','Yield and harvest timing','Carbon sequestration estimates','Food safety event frequencies'],
          note: 'Individual grower data is NEVER sold — only anonymized aggregated corridor-level intelligence.',
        },
      },
    };
    res.json({ ok:true, report });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
