// ============================================================================
// AuditDNA - Brain Events + Production Declaration Routes
// Sprint C P15 / 4.25.2026
// Fixes:
//   - /api/brain/events 404 (Omega dashboard)
//   - ProductionDeclaration backend POST wiring (HARVEST grower workflow)
// ============================================================================

const express = require('express');
const router = express.Router();

const heavyJson = express.json({ limit: '2mb' });

// ---- Schema ---------------------------------------------------------------
async function ensureSchema() {
  if (!global.db) return;
  try {
    await global.db.query(`
      CREATE TABLE IF NOT EXISTS brain_event_log (
        id SERIAL PRIMARY KEY,
        event_type VARCHAR(80) NOT NULL,
        payload JSONB,
        actor VARCHAR(100),
        deal_id INTEGER,
        lane VARCHAR(50),
        emitted_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await global.db.query(`CREATE INDEX IF NOT EXISTS idx_brain_log_type ON brain_event_log(event_type, emitted_at DESC);`);
    await global.db.query(`CREATE INDEX IF NOT EXISTS idx_brain_log_recent ON brain_event_log(emitted_at DESC);`);

    await global.db.query(`
      CREATE TABLE IF NOT EXISTS production_declarations (
        id SERIAL PRIMARY KEY,
        grower_id INTEGER,
        grower_name VARCHAR(200),
        commodity VARCHAR(100) NOT NULL,
        variety VARCHAR(100),
        season VARCHAR(20),
        year INTEGER,
        acres_planted NUMERIC(10,2),
        acres_harvested NUMERIC(10,2),
        expected_yield_per_acre NUMERIC(10,2),
        unit VARCHAR(20) DEFAULT 'cases',
        expected_total NUMERIC(12,2),
        harvest_window_start DATE,
        harvest_window_end DATE,
        target_buyer VARCHAR(200),
        target_price NUMERIC(10,2),
        organic BOOLEAN DEFAULT false,
        certifications TEXT,
        notes TEXT,
        status VARCHAR(40) DEFAULT 'declared',
        submitted_by VARCHAR(100),
        submitted_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await global.db.query(`CREATE INDEX IF NOT EXISTS idx_prod_decl_grower ON production_declarations(grower_id);`);
    await global.db.query(`CREATE INDEX IF NOT EXISTS idx_prod_decl_year ON production_declarations(year, commodity);`);

    console.log('[brainEvents] schema OK');
  } catch (e) {
    console.error('[brainEvents] schema error:', e.message);
  }
}
setTimeout(ensureSchema, 1500);

// ============================================================================
// Hook brainEmit to LOG every event (separate from audit trail)
// ============================================================================
function installBrainLogHook() {
  const original = global.brainEmit;
  global.brainEmit = function(eventType, payload) {
    try { if (typeof original === 'function') original(eventType, payload); } catch (e) {}
    setImmediate(async () => {
      try {
        if (!global.db || !eventType) return;
        const p = payload || {};
        await global.db.query(
          `INSERT INTO brain_event_log (event_type, payload, actor, deal_id, lane)
           VALUES ($1, $2, $3, $4, $5)`,
          [eventType, JSON.stringify(p), p.actor || p.created_by || p.uploaded_by || 'system', p.deal_id || null, p.lane || null]
        );
      } catch (e) {
        console.error('[brainEvents] log error:', e.message);
      }
    });
  };
  console.log('[brainEvents] installed brainEmit logger hook');
}
setTimeout(installBrainLogHook, 4000);

// ============================================================================
// /api/brain/events - the 404 fix
// ============================================================================
router.get('/api/brain/events', async (req, res) => {
  const { limit, event_type, since, deal_id } = req.query;
  const conditions = []; const params = []; let pidx = 1;
  if (event_type) { conditions.push(`event_type = $${pidx++}`); params.push(event_type); }
  if (deal_id) { conditions.push(`deal_id = $${pidx++}`); params.push(parseInt(deal_id, 10)); }
  if (since) { conditions.push(`emitted_at > $${pidx++}`); params.push(since); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const lim = Math.min(parseInt(limit || '50', 10), 500);
  try {
    const r = await global.db.query(
      `SELECT id, event_type, payload, actor, deal_id, lane, emitted_at
       FROM brain_event_log ${where}
       ORDER BY emitted_at DESC LIMIT ${lim}`,
      params
    );
    res.json({ events: r.rows, count: r.rows.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// /api/brain/events/stats - live counts for Omega dashboard
router.get('/api/brain/events/stats', async (req, res) => {
  try {
    const total = await global.db.query(
      `SELECT COUNT(*)::int as c FROM brain_event_log WHERE emitted_at > NOW() - INTERVAL '24 hours'`
    );
    const byType = await global.db.query(`
      SELECT event_type, COUNT(*)::int as count
      FROM brain_event_log
      WHERE emitted_at > NOW() - INTERVAL '24 hours'
      GROUP BY event_type
      ORDER BY count DESC LIMIT 20
    `);
    const byHour = await global.db.query(`
      SELECT date_trunc('hour', emitted_at) as hour, COUNT(*)::int as count
      FROM brain_event_log
      WHERE emitted_at > NOW() - INTERVAL '24 hours'
      GROUP BY hour ORDER BY hour
    `);
    res.json({
      last_24h: total.rows[0]?.c || 0,
      by_type: byType.rows,
      by_hour: byHour.rows
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// /api/brain/events - manual emit endpoint (for frontend test/admin use)
router.post('/api/brain/events', heavyJson, async (req, res) => {
  const { event_type, payload } = req.body || {};
  if (!event_type) return res.status(400).json({ error: 'event_type required' });
  try {
    if (typeof global.brainEmit === 'function') {
      global.brainEmit(event_type, payload || {});
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================================
// /api/grower/production-declarations - HARVEST workflow POST wiring
// ============================================================================

// LIST
router.get('/api/grower/production-declarations', async (req, res) => {
  const { grower_id, year, commodity, status, limit } = req.query;
  const conditions = []; const params = []; let pidx = 1;
  if (grower_id) { conditions.push(`grower_id = $${pidx++}`); params.push(parseInt(grower_id, 10)); }
  if (year) { conditions.push(`year = $${pidx++}`); params.push(parseInt(year, 10)); }
  if (commodity) { conditions.push(`commodity ILIKE $${pidx++}`); params.push(`%${commodity}%`); }
  if (status) { conditions.push(`status = $${pidx++}`); params.push(status); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const lim = Math.min(parseInt(limit || '200', 10), 1000);
  try {
    const r = await global.db.query(
      `SELECT * FROM production_declarations ${where}
       ORDER BY submitted_at DESC LIMIT ${lim}`,
      params
    );
    res.json({ declarations: r.rows, count: r.rows.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// CREATE
router.post('/api/grower/production-declarations', heavyJson, async (req, res) => {
  const b = req.body || {};
  if (!b.commodity) return res.status(400).json({ error: 'commodity required' });
  try {
    const expectedTotal = (b.acres_planted && b.expected_yield_per_acre)
      ? Number(b.acres_planted) * Number(b.expected_yield_per_acre)
      : (b.expected_total || null);

    const r = await global.db.query(
      `INSERT INTO production_declarations
         (grower_id, grower_name, commodity, variety, season, year,
          acres_planted, acres_harvested, expected_yield_per_acre, unit, expected_total,
          harvest_window_start, harvest_window_end, target_buyer, target_price,
          organic, certifications, notes, status, submitted_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING id`,
      [
        b.grower_id || null, b.grower_name || null,
        b.commodity, b.variety || null, b.season || null,
        b.year || new Date().getFullYear(),
        b.acres_planted || null, b.acres_harvested || null, b.expected_yield_per_acre || null,
        b.unit || 'cases', expectedTotal,
        b.harvest_window_start || null, b.harvest_window_end || null,
        b.target_buyer || null, b.target_price || null,
        b.organic === true || b.organic === 'true',
        b.certifications || null, b.notes || null,
        b.status || 'declared',
        b.submitted_by || 'grower'
      ]
    );
    const id = r.rows[0].id;

    if (typeof global.brainEmit === 'function') {
      global.brainEmit('PRODUCTION_DECLARED', {
        declaration_id: id,
        grower_id: b.grower_id,
        grower_name: b.grower_name,
        commodity: b.commodity,
        year: b.year,
        expected_total: expectedTotal,
        harvest_window_start: b.harvest_window_start,
        actor: b.submitted_by || 'grower'
      });
    }

    res.json({ ok: true, declaration_id: id });
  } catch (e) {
    console.error('[brainEvents] decl create error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// UPDATE
router.put('/api/grower/production-declarations/:id', heavyJson, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const b = req.body || {};
  const sets = []; const params = []; let pidx = 1;
  const fields = ['grower_name','commodity','variety','season','year',
    'acres_planted','acres_harvested','expected_yield_per_acre','unit','expected_total',
    'harvest_window_start','harvest_window_end','target_buyer','target_price',
    'organic','certifications','notes','status'];
  fields.forEach(f => { if (b[f] !== undefined) { sets.push(`${f} = $${pidx++}`); params.push(b[f]); } });
  if (sets.length === 0) return res.json({ ok: true, no_changes: true });
  sets.push(`updated_at = NOW()`); params.push(id);
  try {
    await global.db.query(
      `UPDATE production_declarations SET ${sets.join(', ')} WHERE id = $${pidx}`,
      params
    );
    if (typeof global.brainEmit === 'function') {
      global.brainEmit('PRODUCTION_UPDATED', { declaration_id: id, updated_fields: Object.keys(b) });
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE
router.delete('/api/grower/production-declarations/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    await global.db.query(`DELETE FROM production_declarations WHERE id = $1`, [id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// SUMMARY by commodity/year (for dashboard)
router.get('/api/grower/production-declarations/summary', async (req, res) => {
  const { year } = req.query;
  const yr = year ? parseInt(year, 10) : new Date().getFullYear();
  try {
    const r = await global.db.query(
      `SELECT
         commodity,
         COUNT(*)::int as declarations,
         SUM(acres_planted)::numeric as total_acres,
         SUM(expected_total)::numeric as total_expected,
         AVG(expected_yield_per_acre)::numeric as avg_yield
       FROM production_declarations
       WHERE year = $1
       GROUP BY commodity
       ORDER BY total_expected DESC NULLS LAST`,
      [yr]
    );
    res.json({ year: yr, by_commodity: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
