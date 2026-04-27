// ============================================================================
// loaf-data-engine.js — LOAF Institutional Data Aggregation Engine
// MexaUSA Food Group, Inc. — AuditDNA Agriculture Intelligence Platform
// Save to: C:\AuditDNA\backend\services\loaf-data-engine.js
//
// PURPOSE:
//   Aggregates all LOAF field submissions into institutional-grade datasets.
//   Produces USDA-formatted, FDA-formatted, and carbon/sustainability reports.
//   Data is anonymized at individual level — sold as aggregate corridor intelligence.
//   Buyers: USDA AMS, FDA, EPA, CBP, chain store ESG teams, water districts,
//           carbon credit markets, academic researchers.
// ============================================================================

// ── ENSURE TABLES EXIST ───────────────────────────────────────────────────────
async function ensureDataTables(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS loaf_submissions (
      id                SERIAL PRIMARY KEY,
      action            VARCHAR(20) NOT NULL,
      commodity         VARCHAR(100),
      quantity          NUMERIC(10,2),
      unit              VARCHAR(20),
      price             VARCHAR(50),
      negotiable        BOOLEAN DEFAULT FALSE,
      lot_number        VARCHAR(100),
      harvest_date      DATE,
      water_source      VARCHAR(200),
      fertilizer        VARCHAR(200),
      buyer_name        VARCHAR(200),
      invoice_amount    NUMERIC(12,2),
      invoice_date      DATE,
      broadcast_openclaw BOOLEAN DEFAULT FALSE,
      notes             TEXT,
      ai_grade          JSONB,
      gps_lat           NUMERIC(10,7),
      gps_lng           NUMERIC(10,7),
      grower_name       VARCHAR(200),
      grower_company    VARCHAR(200),
      grower_phone      VARCHAR(50),
      grower_region     VARCHAR(200),
      grower_commodity  VARCHAR(100),
      submitted_at      TIMESTAMPTZ DEFAULT NOW(),
      intelligence_sent BOOLEAN DEFAULT FALSE,
      buyers_notified   INTEGER DEFAULT 0,
      chains_notified   INTEGER DEFAULT 0
    )
  `).catch(e => console.warn('[LOAF-DATA] loaf_submissions table:', e.message));

  await db.query(`
    CREATE TABLE IF NOT EXISTS loaf_analytics_daily (
      id                   SERIAL PRIMARY KEY,
      report_date          DATE NOT NULL,
      commodity            VARCHAR(100),
      region               VARCHAR(200),
      action_type          VARCHAR(20),
      total_submissions    INTEGER DEFAULT 0,
      total_quantity       NUMERIC(12,2) DEFAULT 0,
      total_unit           VARCHAR(20),
      waste_prevented_lbs  NUMERIC(12,2) DEFAULT 0,
      water_use_gallons    NUMERIC(14,2) DEFAULT 0,
      carbon_miles_saved   NUMERIC(12,2) DEFAULT 0,
      buyers_notified      INTEGER DEFAULT 0,
      transactions_closed  INTEGER DEFAULT 0,
      avg_grade            VARCHAR(20),
      created_at           TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(report_date, commodity, region, action_type)
    )
  `).catch(e => console.warn('[LOAF-DATA] loaf_analytics_daily table:', e.message));

  await db.query(`
    CREATE TABLE IF NOT EXISTS loaf_outreach_log (
      id              SERIAL PRIMARY KEY,
      action          VARCHAR(20),
      commodity       VARCHAR(100),
      buyer_email     VARCHAR(200),
      submission_id   INTEGER,
      status          VARCHAR(30),
      response        VARCHAR(20),
      responded_at    TIMESTAMPTZ,
      sent_at         TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(e => console.warn('[LOAF-DATA] loaf_outreach_log table:', e.message));
}

// ── SAVE SUBMISSION ───────────────────────────────────────────────────────────
async function saveSubmission(db, action, data, intelligenceResult) {
  await ensureDataTables(db);
  const {
    commodity, quantity, unit, price, negotiable, notes,
    lot, harvestDate, water, fertilizer,
    buyer, invoiceAmount, invoiceDate, broadcastOpenClaw,
    grade, gps, user
  } = data;

  try {
    const result = await db.query(`
      INSERT INTO loaf_submissions (
        action, commodity, quantity, unit, price, negotiable,
        lot_number, harvest_date, water_source, fertilizer,
        buyer_name, invoice_amount, invoice_date, broadcast_openclaw,
        notes, ai_grade, gps_lat, gps_lng,
        grower_name, grower_company, grower_phone, grower_region, grower_commodity,
        intelligence_sent, buyers_notified, chains_notified
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,
        $19,$20,$21,$22,$23,$24,$25,$26
      ) RETURNING id
    `, [
      action, commodity, parseFloat(quantity)||null, unit, price, negotiable||false,
      lot||null, harvestDate||null, water||null, fertilizer||null,
      buyer||null, parseFloat(invoiceAmount)||null, invoiceDate||null, broadcastOpenClaw||false,
      notes||null, grade ? JSON.stringify(grade) : null,
      gps?.lat||null, gps?.lng||null,
      user?.name||null, user?.company||null, user?.phone||null,
      user?.region||null, user?.commodity||null,
      intelligenceResult ? true : false,
      intelligenceResult?.sent||0,
      intelligenceResult?.chainStores||0
    ]);
    return result.rows[0]?.id;
  } catch (e) {
    console.warn('[LOAF-DATA] saveSubmission failed:', e.message);
    return null;
  }
}

// ── WATER USE ESTIMATE (gallons per case by commodity) ────────────────────────
const WATER_GAL_PER_CASE = {
  'hass avocado': 74,   // avocados are water intensive
  'strawberry':   12,
  'blueberry':    18,
  'raspberry':    14,
  'blackberry':   14,
  'roma tomato':  8,
  'vine-ripe tomato': 8,
  'spinach':      10,
  'lettuce':      9,
  'radicchio':    9,
  'cilantro':     6,
  'asparagus':    20,
  'jalapeño':     7,
  'cucumber':     8,
  'zucchini':     7,
  'green onion':  6,
  'garlic':       15,
  'default':      10
};

function estimateWaterUse(commodity, quantity, unit) {
  const lower = (commodity || '').toLowerCase();
  let galPerCase = WATER_GAL_PER_CASE.default;
  for (const [key, val] of Object.entries(WATER_GAL_PER_CASE)) {
    if (lower.includes(key)) { galPerCase = val; break; }
  }
  let cases = parseFloat(quantity) || 0;
  if ((unit || '').toLowerCase().includes('pallet')) cases *= 48;
  if ((unit || '').toLowerCase().includes('lb'))     cases /= 25;
  if ((unit || '').toLowerCase().includes('kg'))     cases /= 11;
  return cases * galPerCase;
}

// ── CARBON MILES SAVED (altruistic = waste prevented = no disposal miles) ─────
function estimateCarbonMilesSaved(action, quantity, unit, gps) {
  if (action !== 'ALTRUISTIC') return 0;
  // Assume product would travel avg 250 miles to disposal vs 50 miles to local grower
  let cases = parseFloat(quantity) || 0;
  if ((unit || '').toLowerCase().includes('pallet')) cases *= 48;
  const lbs = cases * 25;
  // 0.000356 metric tons CO2 per ton-mile for refrigerated truck
  const milesSaved = 200; // net miles avoided
  return Math.round(lbs * milesSaved / 2000 * 0.000356 * 1000) / 1000; // metric tons CO2
}

// ── WASTE PREVENTED (lbs) ─────────────────────────────────────────────────────
function estimateWastePrevented(action, quantity, unit) {
  if (action !== 'ALTRUISTIC') return 0;
  let cases = parseFloat(quantity) || 0;
  if ((unit || '').toLowerCase().includes('pallet')) cases *= 48;
  if ((unit || '').toLowerCase().includes('lb'))     return parseFloat(quantity) || 0;
  if ((unit || '').toLowerCase().includes('kg'))     return (parseFloat(quantity) || 0) * 2.205;
  return cases * 24; // avg 24 lbs per case
}

// ── UPDATE DAILY ANALYTICS ────────────────────────────────────────────────────
async function updateDailyAnalytics(db, action, data, intelligenceResult) {
  await ensureDataTables(db);
  const { commodity, quantity, unit, gps, user } = data;
  const region = user?.region || (gps ? 'GPS Submitted' : 'Unknown');
  const date = new Date().toISOString().slice(0,10);
  const waterGal = estimateWaterUse(commodity, quantity, unit);
  const wasteLbs = estimateWastePrevented(action, quantity, unit);
  const carbonMt = estimateCarbonMilesSaved(action, quantity, unit, gps);

  try {
    await db.query(`
      INSERT INTO loaf_analytics_daily
        (report_date, commodity, region, action_type, total_submissions, total_quantity, total_unit,
         waste_prevented_lbs, water_use_gallons, carbon_miles_saved, buyers_notified)
      VALUES ($1,$2,$3,$4,1,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (report_date, commodity, region, action_type)
      DO UPDATE SET
        total_submissions  = loaf_analytics_daily.total_submissions + 1,
        total_quantity     = loaf_analytics_daily.total_quantity + EXCLUDED.total_quantity,
        waste_prevented_lbs= loaf_analytics_daily.waste_prevented_lbs + EXCLUDED.waste_prevented_lbs,
        water_use_gallons  = loaf_analytics_daily.water_use_gallons + EXCLUDED.water_use_gallons,
        carbon_miles_saved = loaf_analytics_daily.carbon_miles_saved + EXCLUDED.carbon_miles_saved,
        buyers_notified    = loaf_analytics_daily.buyers_notified + EXCLUDED.buyers_notified
    `, [
      date, commodity, region, action,
      parseFloat(quantity)||0, unit,
      wasteLbs, waterGal, carbonMt,
      (intelligenceResult?.sent||0) + (intelligenceResult?.chainStores||0)
    ]);
  } catch (e) {
    console.warn('[LOAF-DATA] updateDailyAnalytics failed:', e.message);
  }
}

// ── USDA REPORT (JSON — AMS compatible format) ────────────────────────────────
async function generateUSDAReport(db, startDate, endDate) {
  await ensureDataTables(db);
  try {
    const result = await db.query(`
      SELECT
        commodity,
        region,
        action_type,
        SUM(total_submissions)     AS submissions,
        SUM(total_quantity)        AS total_quantity,
        MAX(total_unit)            AS unit,
        SUM(waste_prevented_lbs)   AS waste_lbs,
        SUM(water_use_gallons)     AS water_gallons,
        SUM(buyers_notified)       AS buyers_contacted
      FROM loaf_analytics_daily
      WHERE report_date BETWEEN $1 AND $2
      GROUP BY commodity, region, action_type
      ORDER BY commodity, action_type
    `, [startDate, endDate]);

    return {
      report_type:    'USDA_AMS_COMMODITY_FLOW',
      platform:       'AuditDNA Agriculture — MexaUSA Food Group, Inc.',
      corridor:       'US-Mexico Produce Intelligence',
      period_start:   startDate,
      period_end:     endDate,
      generated_at:   new Date().toISOString(),
      data_source:    'LOAF Field Submissions — Anonymized Aggregate',
      disclaimer:     'Individual grower data is anonymized. This report contains aggregate corridor-level intelligence only.',
      commodities:    result.rows
    };
  } catch (e) {
    console.warn('[LOAF-DATA] generateUSDAReport failed:', e.message);
    return { error: e.message };
  }
}

// ── FDA TRACEABILITY REPORT ───────────────────────────────────────────────────
async function generateFDAReport(db, startDate, endDate) {
  await ensureDataTables(db);
  try {
    const result = await db.query(`
      SELECT
        commodity, lot_number, harvest_date, water_source, fertilizer,
        gps_lat, gps_lng, grower_region,
        ai_grade->>'usGrade'       AS us_grade,
        ai_grade->>'shelfLifeDays' AS shelf_life_days,
        submitted_at
      FROM loaf_submissions
      WHERE action = 'ORIGIN'
        AND submitted_at BETWEEN $1 AND $2
      ORDER BY submitted_at DESC
      LIMIT 1000
    `, [startDate, endDate]);

    return {
      report_type:   'FDA_FSMA204_TRACEABILITY',
      platform:      'AuditDNA Agriculture — MexaUSA Food Group, Inc.',
      corridor:      'US-Mexico Produce Traceability',
      period_start:  startDate,
      period_end:    endDate,
      generated_at:  new Date().toISOString(),
      record_count:  result.rows.length,
      data_source:   'LOAF ORIGIN Field Submissions',
      disclaimer:    'Data collected under FSMA 204 traceability requirements. GPS coordinates rounded to 3 decimal places for privacy.',
      records:       result.rows.map(r => ({
        ...r,
        gps_lat: r.gps_lat ? parseFloat(r.gps_lat).toFixed(3) : null,
        gps_lng: r.gps_lng ? parseFloat(r.gps_lng).toFixed(3) : null,
      }))
    };
  } catch (e) {
    console.warn('[LOAF-DATA] generateFDAReport failed:', e.message);
    return { error: e.message };
  }
}

// ── SUSTAINABILITY / ESG REPORT ───────────────────────────────────────────────
async function generateSustainabilityReport(db, startDate, endDate) {
  await ensureDataTables(db);
  try {
    const result = await db.query(`
      SELECT
        SUM(waste_prevented_lbs)                                          AS total_waste_prevented_lbs,
        SUM(water_use_gallons)                                            AS total_water_use_gallons,
        SUM(carbon_miles_saved)                                           AS total_carbon_mt_saved,
        SUM(total_submissions)                                            AS total_submissions,
        SUM(CASE WHEN action_type='ALTRUISTIC' THEN total_submissions END) AS altruistic_transactions,
        SUM(CASE WHEN action_type='LAUNCH' THEN total_submissions END)    AS launch_transactions,
        SUM(CASE WHEN action_type='ORIGIN' THEN total_submissions END)    AS origin_records,
        SUM(CASE WHEN action_type='FACTOR' THEN total_submissions END)    AS factor_submissions,
        SUM(buyers_notified)                                              AS total_buyers_contacted,
        COUNT(DISTINCT commodity)                                          AS commodities_tracked,
        COUNT(DISTINCT region)                                             AS regions_covered
      FROM loaf_analytics_daily
      WHERE report_date BETWEEN $1 AND $2
    `, [startDate, endDate]);

    const stats = result.rows[0] || {};
    const wasteLbs  = parseFloat(stats.total_waste_prevented_lbs) || 0;
    const waterGal  = parseFloat(stats.total_water_use_gallons) || 0;
    const carbonMt  = parseFloat(stats.total_carbon_mt_saved) || 0;

    return {
      report_type:    'ESG_SUSTAINABILITY_IMPACT',
      platform:       'AuditDNA Agriculture — MexaUSA Food Group, Inc.',
      corridor:       'US-Mexico Produce Corridor',
      period_start:   startDate,
      period_end:     endDate,
      generated_at:   new Date().toISOString(),
      data_source:    'LOAF Field Submissions — Anonymized Aggregate',
      headline_metrics: {
        food_waste_prevented_lbs:    Math.round(wasteLbs),
        food_waste_prevented_tons:   Math.round(wasteLbs / 2000 * 10) / 10,
        water_tracked_gallons:       Math.round(waterGal),
        water_tracked_acre_feet:     Math.round(waterGal / 325851 * 100) / 100,
        carbon_emissions_avoided_mt: carbonMt,
        supply_chain_connections:    parseInt(stats.total_buyers_contacted) || 0,
        total_field_submissions:     parseInt(stats.total_submissions) || 0,
        commodities_tracked:         parseInt(stats.commodities_tracked) || 0,
        regions_covered:             parseInt(stats.regions_covered) || 0,
      },
      transaction_breakdown: {
        altruistic_surplus_redistributed: parseInt(stats.altruistic_transactions) || 0,
        products_launched_to_market:      parseInt(stats.launch_transactions) || 0,
        traceability_records_created:     parseInt(stats.origin_records) || 0,
        invoices_submitted_for_factoring: parseInt(stats.factor_submissions) || 0,
      },
      methodology: {
        waste_calculation:   'Altruistic transactions only. Assumes product would otherwise be disposed. 24 lbs/case average.',
        water_calculation:   'Commodity-specific water intensity factors applied to volume. Source: Pacific Institute US crop water data.',
        carbon_calculation:  'Refrigerated truck transport emissions avoided by surplus redistribution. FHWA emission factors.',
        data_privacy:        'Individual grower data never included. All metrics are anonymized corridor-level aggregates.',
      }
    };
  } catch (e) {
    console.warn('[LOAF-DATA] generateSustainabilityReport failed:', e.message);
    return { error: e.message };
  }
}

// ── CORRIDOR INTELLIGENCE SUMMARY (for institutional buyers) ─────────────────
async function generateCorridorIntelligence(db, startDate, endDate) {
  await ensureDataTables(db);
  try {
    const byComm = await db.query(`
      SELECT
        commodity,
        SUM(total_quantity)     AS volume,
        MAX(total_unit)         AS unit,
        SUM(total_submissions)  AS submissions,
        SUM(waste_prevented_lbs) AS waste_lbs,
        STRING_AGG(DISTINCT region, ', ') AS regions
      FROM loaf_analytics_daily
      WHERE report_date BETWEEN $1 AND $2
      GROUP BY commodity
      ORDER BY SUM(total_quantity) DESC
    `, [startDate, endDate]);

    return {
      report_type:   'CORRIDOR_INTELLIGENCE_SUMMARY',
      platform:      'AuditDNA Agriculture — MexaUSA Food Group, Inc.',
      period_start:  startDate,
      period_end:    endDate,
      generated_at:  new Date().toISOString(),
      pricing:       'Contact saul@mexausafg.com for institutional data license. US +1-831-251-3116',
      note:          'Aggregate data only. No individual grower identification included.',
      top_commodities: byComm.rows
    };
  } catch (e) {
    console.warn('[LOAF-DATA] generateCorridorIntelligence failed:', e.message);
    return { error: e.message };
  }
}

module.exports = {
  ensureDataTables,
  saveSubmission,
  updateDailyAnalytics,
  generateUSDAReport,
  generateFDAReport,
  generateSustainabilityReport,
  generateCorridorIntelligence,
};
