// ================================================================================
// AUDITDNA TRACEABILITY API ROUTES — FSMA 204 COMPLIANT
// Save to: C:\AuditDNA\backend\routes\traceability.js
// Registers: /api/traceability/* + /api/lab/* + /api/border/*
// ================================================================================
'use strict';

function registerTraceabilityRoutes(app, db) {

  // ── TRACEABILITY LOT CHAIN ────────────────────────────────────────────────────

  // POST /api/traceability/events — create a CTE event (any stage)
  app.post('/api/traceability/events', async (req, res) => {
    try {
      const {
        lotNumber, tlc, cte, stage, commodity, variety, growingMethod,
        growerName, growerId, location, gps, quantity, unit,
        referenceDoc, referenceDocType, eventDate, handledBy,
        temperature, packagingType, transportMode, notes, source,
      } = req.body;

      if (!lotNumber && !tlc) return res.status(400).json({ error: 'lotNumber or tlc required' });

      const id = `TRC-${Date.now().toString(36).toUpperCase().slice(-8)}`;
      const eventAt = eventDate || new Date().toISOString();

      try {
        await db.query(`
          INSERT INTO traceability_events (
            id, lot_number, tlc, cte, stage, commodity, variety, growing_method,
            grower_name, grower_id, location, gps, quantity, unit,
            reference_doc, reference_doc_type, event_date, handled_by,
            temperature, packaging_type, transport_mode, notes, source, created_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,NOW())
          ON CONFLICT (id) DO NOTHING`,
          [id, lotNumber||tlc, tlc||lotNumber, cte||stage, stage||cte,
           commodity, variety, growingMethod, growerName, growerId,
           location, gps, quantity, unit, referenceDoc, referenceDocType,
           eventAt, handledBy, temperature, packagingType, transportMode, notes, source||'platform']
        );
      } catch (dbErr) { console.warn('traceability_events insert:', dbErr.message); }

      res.json({ success: true, id, lot: lotNumber||tlc, cte: cte||stage, eventAt });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // GET /api/traceability/events — query events
  app.get('/api/traceability/events', async (req, res) => {
    try {
      const { lot, stage, cte, limit = 100 } = req.query;
      let q = 'SELECT * FROM traceability_events';
      const params = []; const conds = [];
      if (lot)   { conds.push(`lot_number = $${params.length+1}`); params.push(lot); }
      if (stage) { conds.push(`stage = $${params.length+1}`); params.push(stage); }
      if (cte)   { conds.push(`cte = $${params.length+1}`); params.push(cte); }
      if (conds.length) q += ' WHERE ' + conds.join(' AND ');
      q += ` ORDER BY event_date DESC LIMIT $${params.length+1}`;
      params.push(+limit);
      const result = await db.query(q, params);
      res.json({ events: result.rows, total: result.rowCount });
    } catch (err) { res.status(500).json({ error: err.message, events: [] }); }
  });

  // GET /api/traceability/chain/:lot — full chain of custody for one lot (FDA format)
  app.get('/api/traceability/chain/:lot', async (req, res) => {
    try {
      const { lot } = req.params;
      const [events, lifecycle, labs, border] = await Promise.allSettled([
        db.query('SELECT * FROM traceability_events WHERE lot_number=$1 ORDER BY event_date ASC', [lot]),
        db.query('SELECT * FROM lifecycle_loads WHERE lot_number=$1 ORDER BY submitted_at ASC', [lot]),
        db.query('SELECT * FROM lab_reports WHERE lot_number=$1 ORDER BY test_date DESC', [lot]),
        db.query('SELECT * FROM border_compliance_reports WHERE lot_number=$1 ORDER BY generated_at DESC LIMIT 1', [lot]),
      ]);

      const chain = {
        lot,
        generatedAt: new Date().toISOString(),
        ctEvents:    events.status==='fulfilled'    ? events.value.rows    : [],
        lifecycle:   lifecycle.status==='fulfilled'  ? lifecycle.value.rows : [],
        labReports:  labs.status==='fulfilled'       ? labs.value.rows     : [],
        border:      border.status==='fulfilled'     ? border.value.rows[0] : null,
        fsma204Ready: false,
      };

      // FSMA 204 readiness check
      const stages = new Set([...chain.ctEvents.map(e=>e.stage), ...chain.lifecycle.map(l=>l.stage)]);
      const requiredCTEs = ['field','packinghouse','transit','buyer'];
      chain.fsma204Ready = requiredCTEs.every(c => stages.has(c));
      chain.missingCTEs  = requiredCTEs.filter(c => !stages.has(c));
      chain.labStatus = {
        hasWater:      chain.labReports.some(l=>l.test_type==='water'),
        hasSoil:       chain.labReports.some(l=>l.test_type==='soil'),
        hasPesticide:  chain.labReports.some(l=>l.test_type==='residue'||l.test_type==='pesticide'),
        hasMicrob:     chain.labReports.some(l=>l.test_type==='microbiological'),
        hasNutrition:  chain.labReports.some(l=>l.test_type==='nutrition'),
        allPassed:     chain.labReports.length > 0 && chain.labReports.every(l=>l.result==='Pass'||l.result==='pass'),
      };

      res.json(chain);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // GET /api/traceability/export/:lot — FDA 24-hour sortable spreadsheet (CSV)
  app.get('/api/traceability/export/:lot', async (req, res) => {
    try {
      const { lot } = req.params;
      const events = await db.query(
        'SELECT * FROM traceability_events WHERE lot_number=$1 ORDER BY event_date ASC', [lot]
      );
      const lifecycle = await db.query(
        'SELECT * FROM lifecycle_loads WHERE lot_number=$1 ORDER BY submitted_at ASC', [lot]
      );
      const labs = await db.query(
        'SELECT * FROM lab_reports WHERE lot_number=$1 ORDER BY test_date DESC', [lot]
      );

      // Build FDA-format CSV
      const rows = [
        ['TLC (Lot Number)','CTE','Stage','Commodity','Variety','Grower','Location','GPS','Quantity','Unit','Reference Doc','Doc Type','Event Date','Handled By','Temperature','Notes'],
      ];

      for (const e of events.rows) {
        rows.push([e.lot_number, e.cte||'', e.stage||'', e.commodity||'', e.variety||'',
          e.grower_name||'', e.location||'', e.gps||'', e.quantity||'', e.unit||'',
          e.reference_doc||'', e.reference_doc_type||'', e.event_date||'',
          e.handled_by||'', e.temperature||'', e.notes||'']);
      }

      for (const l of lifecycle.rows) {
        const payload = typeof l.payload === 'string' ? JSON.parse(l.payload||'{}') : (l.payload||{});
        rows.push([l.lot_number, 'LIFECYCLE', l.stage||'', payload.commodity||l.commodity||'', '',
          l.grower||'', l.region||'', '', payload.harvestWeightKg||'', 'kg',
          '', 'LOAF Platform', l.submitted_at||'', '', '', '']);
      }

      for (const lab of labs.rows) {
        rows.push([lab.lot_number||lot, 'LAB_TEST', lab.test_type||'', lab.commodity||'', '',
          lab.grower||'', '', '', '', '', lab.lab_name||'', 'Lab Report',
          lab.test_date||'', lab.lab_name||'', '', `Result: ${lab.result||'?'} Score: ${lab.score||'?'}`]);
      }

      const csv = rows.map(r => r.map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="FSMA204_${lot}_${Date.now()}.csv"`);
      res.send(csv);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // GET /api/traceability/feed — recent events feed (all lots)
  app.get('/api/traceability/feed', async (req, res) => {
    try {
      const { limit = 50 } = req.query;
      const r = await db.query(
        'SELECT * FROM traceability_events ORDER BY event_date DESC LIMIT $1', [+limit]
      );
      res.json({ events: r.rows, total: r.rowCount });
    } catch (err) { res.status(500).json({ error: err.message, events: [] }); }
  });

  // ── LAB REPORTS ───────────────────────────────────────────────────────────────

  // POST /api/lab/reports
  app.post('/api/lab/reports', async (req, res) => {
    try {
      const {
        id, lotNumber, testType, grower, commodity, country, region,
        testDate, labName, labCertNumber, result, score,
        status, notes, parameters, reportUrl,
      } = req.body;

      const reportId = id || `RPT-${Date.now().toString(36).toUpperCase().slice(-6)}`;

      try {
        await db.query(`
          INSERT INTO lab_reports (
            id, lot_number, test_type, grower, commodity, country, region,
            test_date, lab_name, lab_cert_number, result, score,
            status, notes, parameters, report_url, created_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW())
          ON CONFLICT (id) DO UPDATE SET result=$11, score=$12, status=$13, notes=$14`,
          [reportId, lotNumber, testType||'general', grower, commodity, country, region,
           testDate, labName, labCertNumber, result, score,
           status||'Complete', notes, JSON.stringify(parameters||{}), reportUrl]
        );
      } catch (dbErr) { console.warn('lab_reports insert:', dbErr.message); }

      // Fire traceability event for the lab test
      if (lotNumber) {
        try {
          await db.query(`
            INSERT INTO traceability_events (id, lot_number, tlc, cte, stage, commodity, grower_name, event_date, notes, source)
            VALUES ($1,$2,$2,'LAB_TEST','lab',$3,$4,NOW(),$5,'lab_system')`,
            [`TRC-LAB-${reportId}`, lotNumber, commodity, grower, `Lab test: ${testType} — ${result}`]
          );
        } catch (_) {}
      }

      res.json({ success: true, id: reportId, lot: lotNumber, testType, result });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // GET /api/lab/reports
  app.get('/api/lab/reports', async (req, res) => {
    try {
      const { lot, grower, type, limit = 50 } = req.query;
      let q = 'SELECT * FROM lab_reports';
      const params = []; const conds = [];
      if (lot)    { conds.push(`lot_number = $${params.length+1}`); params.push(lot); }
      if (grower) { conds.push(`grower ILIKE $${params.length+1}`); params.push('%'+grower+'%'); }
      if (type)   { conds.push(`test_type = $${params.length+1}`); params.push(type); }
      if (conds.length) q += ' WHERE ' + conds.join(' AND ');
      q += ` ORDER BY created_at DESC LIMIT $${params.length+1}`;
      params.push(+limit);
      const r = await db.query(q, params);
      res.json({ reports: r.rows, total: r.rowCount });
    } catch (err) { res.status(500).json({ error: err.message, reports: [] }); }
  });

  // GET /api/lab/reports/lot/:lot — all lab reports for one lot
  app.get('/api/lab/reports/lot/:lot', async (req, res) => {
    try {
      const r = await db.query(
        'SELECT * FROM lab_reports WHERE lot_number=$1 ORDER BY test_date DESC', [req.params.lot]
      );
      const summary = {
        lot: req.params.lot, reports: r.rows, total: r.rowCount,
        passed:  r.rows.filter(x=>x.result==='Pass').length,
        failed:  r.rows.filter(x=>x.result==='Fail').length,
        pending: r.rows.filter(x=>x.result==='Pending').length,
        types:   [...new Set(r.rows.map(x=>x.test_type))],
        allPassed: r.rows.length>0 && r.rows.every(x=>x.result==='Pass'),
      };
      res.json(summary);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── BORDER COMPLIANCE REPORTS ─────────────────────────────────────────────────

  app.post('/api/border/compliance-reports', async (req, res) => {
    try {
      const report = req.body;
      const id = report.reportId || `BCR-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      try {
        await db.query(`
          INSERT INTO border_compliance_reports (id, lot_number, commodity, country, grower,
            cbp_score, fda_score, usda_score, overall_score, pre_clearance_ready,
            port_of_entry, generated_at, payload)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),$12)
          ON CONFLICT (id) DO UPDATE SET overall_score=$9, payload=$12`,
          [id, report.lotNumber, report.commodity, report.country, report.grower,
           report.scores?.cbp||0, report.scores?.fda||0, report.scores?.usda||0,
           report.scores?.overall||0, (report.scores?.overall||0)>=85,
           report.port, JSON.stringify(report)]
        );
      } catch (dbErr) { console.warn('border_compliance insert:', dbErr.message); }
      res.json({ success: true, id, lot: report.lotNumber });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.get('/api/border/compliance-reports', async (req, res) => {
    try {
      const { lot, limit=20 } = req.query;
      let q = 'SELECT * FROM border_compliance_reports';
      const params = [];
      if (lot) { q += ' WHERE lot_number=$1'; params.push(lot); }
      q += ` ORDER BY generated_at DESC LIMIT $${params.length+1}`;
      params.push(+limit);
      const r = await db.query(q, params);
      res.json({ reports: r.rows, total: r.rowCount });
    } catch (err) { res.status(500).json({ error: err.message, reports: [] }); }
  });

  console.log('[Traceability] Routes registered: /api/traceability/* /api/lab/* /api/border/*');
}

// ── DB MIGRATIONS ─────────────────────────────────────────────────────────────
async function createTraceabilityTables(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS traceability_events (
      id                VARCHAR(40) PRIMARY KEY,
      lot_number        VARCHAR(100) NOT NULL,
      tlc               VARCHAR(100),
      cte               VARCHAR(50),
      stage             VARCHAR(30),
      commodity         VARCHAR(100),
      variety           VARCHAR(100),
      growing_method    VARCHAR(50),
      grower_name       VARCHAR(200),
      grower_id         VARCHAR(50),
      location          TEXT,
      gps               VARCHAR(100),
      quantity          NUMERIC,
      unit              VARCHAR(20),
      reference_doc     VARCHAR(200),
      reference_doc_type VARCHAR(50),
      event_date        TIMESTAMPTZ DEFAULT NOW(),
      handled_by        VARCHAR(200),
      temperature       NUMERIC,
      packaging_type    VARCHAR(100),
      transport_mode    VARCHAR(50),
      notes             TEXT,
      source            VARCHAR(50) DEFAULT 'platform',
      created_at        TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_trc_lot   ON traceability_events(lot_number);
    CREATE INDEX IF NOT EXISTS idx_trc_stage ON traceability_events(stage);
    CREATE INDEX IF NOT EXISTS idx_trc_date  ON traceability_events(event_date DESC);

    CREATE TABLE IF NOT EXISTS lab_reports (
      id               VARCHAR(40) PRIMARY KEY,
      lot_number       VARCHAR(100),
      test_type        VARCHAR(50),
      grower           VARCHAR(200),
      commodity        VARCHAR(100),
      country          VARCHAR(5),
      region           VARCHAR(100),
      test_date        DATE,
      lab_name         VARCHAR(200),
      lab_cert_number  VARCHAR(100),
      result           VARCHAR(20),
      score            INTEGER,
      status           VARCHAR(30) DEFAULT 'Complete',
      notes            TEXT,
      parameters       JSONB,
      report_url       TEXT,
      created_at       TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_lab_lot  ON lab_reports(lot_number);
    CREATE INDEX IF NOT EXISTS idx_lab_type ON lab_reports(test_type);
    CREATE INDEX IF NOT EXISTS idx_lab_date ON lab_reports(created_at DESC);

    CREATE TABLE IF NOT EXISTS border_compliance_reports (
      id                    VARCHAR(40) PRIMARY KEY,
      lot_number            VARCHAR(100),
      commodity             VARCHAR(100),
      country               VARCHAR(5),
      grower                VARCHAR(200),
      cbp_score             INTEGER DEFAULT 0,
      fda_score             INTEGER DEFAULT 0,
      usda_score            INTEGER DEFAULT 0,
      overall_score         INTEGER DEFAULT 0,
      pre_clearance_ready   BOOLEAN DEFAULT FALSE,
      port_of_entry         VARCHAR(100),
      generated_at          TIMESTAMPTZ DEFAULT NOW(),
      payload               JSONB
    );
    CREATE INDEX IF NOT EXISTS idx_bcr_lot ON border_compliance_reports(lot_number);
  `);
  console.log('[Traceability] Tables ready: traceability_events, lab_reports, border_compliance_reports');
}

module.exports = { registerTraceabilityRoutes, createTraceabilityTables };
