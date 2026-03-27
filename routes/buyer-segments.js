// ============================================================
// BUYER SEGMENTS — Commodity + State segmentation
// Auto-mounts: /api/buyer-segments
// Save to: C:\AuditDNA\backend\routes\buyer-segments.js
// ============================================================
const express = require('express');
const router = express.Router();

// GET /api/buyer-segments/by-commodity
// Returns buyers grouped by commodity with state breakdown
router.get('/by-commodity', async (req, res) => {
  const pool = req.app.locals.pool;
  const { commodity } = req.query; // optional: filter to specific commodity
  try {
    let where = "entity_type = 'buyer' AND commodities != ''";
    const params = [];
    if (commodity) { where += ` AND commodities ILIKE $1`; params.push(`%${commodity}%`); }

    const result = await pool.query(
      `SELECT id, entity_id, first_name, last_name, email, phone, company_name, city, state_region, country, commodities FROM trade_registry WHERE ${where} ORDER BY state_region ASC, company_name ASC`,
      params
    );

    // Group by commodity
    const commodityMap = {};
    result.rows.forEach(b => {
      const comms = (b.commodities || '').split(',').map(c => c.trim()).filter(Boolean);
      comms.forEach(comm => {
        if (!commodityMap[comm]) commodityMap[comm] = { buyers: [], states: {} };
        commodityMap[comm].buyers.push(b);
        const st = b.state_region || 'Unknown';
        if (!commodityMap[comm].states[st]) commodityMap[comm].states[st] = [];
        commodityMap[comm].states[st].push(b);
      });
    });

    // Sort commodities and states alphabetically
    const segments = Object.keys(commodityMap).sort().map(comm => ({
      commodity: comm,
      total: commodityMap[comm].buyers.length,
      states: Object.keys(commodityMap[comm].states).sort().map(st => ({
        state: st,
        count: commodityMap[comm].states[st].length,
        buyers: commodityMap[comm].states[st].sort((a, b) => (a.company_name || '').localeCompare(b.company_name || ''))
      }))
    }));

    res.json({ segments, total_buyers: result.rows.length, total_commodities: segments.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/buyer-segments/by-state
// Returns all buyers grouped by state with commodity tags
router.get('/by-state', async (req, res) => {
  const pool = req.app.locals.pool;
  const { state, commodity } = req.query;
  try {
    let where = "entity_type = 'buyer' AND commodities != ''";
    const params = [];
    let pi = 1;
    if (state) { where += ` AND state_region ILIKE $${pi++}`; params.push(`%${state}%`); }
    if (commodity) { where += ` AND commodities ILIKE $${pi++}`; params.push(`%${commodity}%`); }

    const result = await pool.query(
      `SELECT id, entity_id, first_name, last_name, email, phone, company_name, city, state_region, country, commodities FROM trade_registry WHERE ${where} ORDER BY state_region ASC, company_name ASC`,
      params
    );

    const stateMap = {};
    result.rows.forEach(b => {
      const st = b.state_region || 'Unknown';
      if (!stateMap[st]) stateMap[st] = [];
      stateMap[st].push(b);
    });

    const states = Object.keys(stateMap).sort().map(st => ({
      state: st,
      count: stateMap[st].length,
      buyers: stateMap[st]
    }));

    res.json({ states, total: result.rows.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/buyer-segments/targets
// Quick pull: avocado, strawberry, berry buyers + target accounts
router.get('/targets', async (req, res) => {
  const pool = req.app.locals.pool;
  try {
    const [avo, straw, berry, targets] = await Promise.all([
      pool.query("SELECT id, first_name, last_name, email, phone, company_name, city, state_region, commodities FROM trade_registry WHERE entity_type='buyer' AND commodities ILIKE '%avocado%' ORDER BY state_region, company_name"),
      pool.query("SELECT id, first_name, last_name, email, phone, company_name, city, state_region, commodities FROM trade_registry WHERE entity_type='buyer' AND commodities ILIKE '%strawberry%' ORDER BY state_region, company_name"),
      pool.query("SELECT id, first_name, last_name, email, phone, company_name, city, state_region, commodities FROM trade_registry WHERE entity_type='buyer' AND commodities ILIKE '%berry%' ORDER BY state_region, company_name"),
      pool.query("SELECT id, first_name, last_name, email, phone, company_name, city, state_region, commodities FROM trade_registry WHERE entity_type='buyer' AND (company_name ILIKE '%c&s%' OR company_name ILIKE '%spartan%' OR company_name ILIKE '%freshko%') ORDER BY company_name"),
    ]);
    // Group each by state
    const groupByState = (rows) => {
      const m = {};
      rows.forEach(b => { const s = b.state_region || 'Unknown'; if (!m[s]) m[s] = []; m[s].push(b); });
      return Object.keys(m).sort().map(s => ({ state: s, count: m[s].length, buyers: m[s] }));
    };
    res.json({
      avocado: { total: avo.rows.length, states: groupByState(avo.rows) },
      strawberry: { total: straw.rows.length, states: groupByState(straw.rows) },
      all_berry: { total: berry.rows.length, states: groupByState(berry.rows) },
      target_accounts: targets.rows,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/buyer-segments/commodity-list
// Returns all unique commodities with buyer counts
router.get('/commodity-list', async (req, res) => {
  const pool = req.app.locals.pool;
  try {
    const result = await pool.query("SELECT TRIM(UNNEST(string_to_array(commodities, ','))) AS commodity, COUNT(DISTINCT id) AS buyers FROM trade_registry WHERE entity_type='buyer' AND commodities != '' GROUP BY commodity ORDER BY buyers DESC");
    res.json({ commodities: result.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;