// =============================================================================
// MiniAPI/agents/index.js
// Save to: C:\AuditDNA\MiniAPI\agents\index.js
// =============================================================================
// KIKI, ATLAS, RANGER — AuditDNA MiniAPI Autonomous Agents
// ES Module (MiniAPI uses import/export)
// =============================================================================
// KIKI   : Commodity Scout — watches produce prices, flags anomalies
// ATLAS  : Buyer/Grower Matcher — scans for open needs vs available supply
// RANGER : Compliance Ranger — monitors cert expiry, FSMA 204, SENASICA flags
// =============================================================================

import express from 'express';
import pg from 'pg';

const { Pool } = pg;

// ---------------------------------------------------------------------------
// DB (lazy — MiniAPI may or may not have its own pool)
// ---------------------------------------------------------------------------
let _pool = null;
function getPool() {
  if (_pool) return _pool;
  if (process.env.DATABASE_URL) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('railway') ? { rejectUnauthorized: false } : false,
      max: 5,
    });
  }
  return _pool;
}

// ---------------------------------------------------------------------------
// Agent state store
// ---------------------------------------------------------------------------
const AGENTS = {
  KIKI: {
    id: 'KIKI', name: 'Commodity Scout', version: '1.0',
    status: 'ACTIVE', lastRun: null, runsTotal: 0, alertsRaised: 0,
    intervalMs: 5 * 60 * 1000,   // 5 min
    description: 'Monitors USDA price feeds for spike/drop anomalies across tracked commodities',
  },
  ATLAS: {
    id: 'ATLAS', name: 'Buyer-Grower Matcher', version: '1.0',
    status: 'ACTIVE', lastRun: null, runsTotal: 0, matchesMade: 0,
    intervalMs: 10 * 60 * 1000,  // 10 min
    description: 'Scans open buyer needs vs grower available inventory and queues introduction emails',
  },
  RANGER: {
    id: 'RANGER', name: 'Compliance Ranger', version: '1.0',
    status: 'ACTIVE', lastRun: null, runsTotal: 0, flagsRaised: 0,
    intervalMs: 30 * 60 * 1000,  // 30 min
    description: 'Monitors cert expiry dates, FSMA 204 traceability status, and SENASICA flags',
  },
};

// ---------------------------------------------------------------------------
// KIKI tick — commodity price anomaly detection
// ---------------------------------------------------------------------------
async function tickKIKI() {
  const pool = getPool();
  AGENTS.KIKI.runsTotal++;
  AGENTS.KIKI.lastRun = new Date().toISOString();
  if (!pool) { AGENTS.KIKI.status = 'DEGRADED'; return; }
  try {
    // Pull recent USDA price snapshots where movement > 15%
    const r = await pool.query(`
      SELECT commodity, market, price, price_date, unit
      FROM usda_prices
      WHERE price_date >= CURRENT_DATE - INTERVAL '3 days'
        AND abs_price_change_pct IS NOT NULL
        AND abs(abs_price_change_pct) >= 15
      ORDER BY abs(abs_price_change_pct) DESC
      LIMIT 20
    `).catch(() => ({ rows: [] }));
    if (r.rows.length > 0) {
      AGENTS.KIKI.alertsRaised += r.rows.length;
      AGENTS.KIKI.lastAlert = {
        ts: new Date().toISOString(),
        commodity: r.rows[0].commodity,
        pctChange: r.rows[0].abs_price_change_pct,
        count: r.rows.length,
      };
    }
    AGENTS.KIKI.status = 'ACTIVE';
  } catch (e) {
    AGENTS.KIKI.status = 'ERROR';
    AGENTS.KIKI.lastError = e.message;
  }
}

// ---------------------------------------------------------------------------
// ATLAS tick — buyer/grower matching
// ---------------------------------------------------------------------------
async function tickATLAS() {
  const pool = getPool();
  AGENTS.ATLAS.runsTotal++;
  AGENTS.ATLAS.lastRun = new Date().toISOString();
  if (!pool) { AGENTS.ATLAS.status = 'DEGRADED'; return; }
  try {
    // Open buyer wants with matching grower supply
    const r = await pool.query(`
      SELECT
        bw.id AS want_id, bw.commodity, bw.volume_lbs_needed, bw.price_target_cwt,
        bw.buyer_email,
        g.id AS grower_id, g.email AS grower_email, g.region
      FROM buyer_wants bw
      JOIN growers g ON lower(g.commodity) = lower(bw.commodity)
      WHERE bw.status = 'OPEN'
        AND g.status = 'ACTIVE'
        AND g.available_volume_lbs >= bw.volume_lbs_needed * 0.5
      LIMIT 30
    `).catch(() => ({ rows: [] }));
    AGENTS.ATLAS.matchesMade += r.rows.length;
    if (r.rows.length > 0) {
      AGENTS.ATLAS.lastMatch = {
        ts: new Date().toISOString(),
        count: r.rows.length,
        sample: `${r.rows[0].commodity} | buyer: ${r.rows[0].buyer_email}`,
      };
    }
    AGENTS.ATLAS.status = 'ACTIVE';
  } catch (e) {
    AGENTS.ATLAS.status = 'ERROR';
    AGENTS.ATLAS.lastError = e.message;
  }
}

// ---------------------------------------------------------------------------
// RANGER tick — compliance monitoring
// ---------------------------------------------------------------------------
async function tickRANGER() {
  const pool = getPool();
  AGENTS.RANGER.runsTotal++;
  AGENTS.RANGER.lastRun = new Date().toISOString();
  if (!pool) { AGENTS.RANGER.status = 'DEGRADED'; return; }
  try {
    // Certs expiring within 30 days
    const r = await pool.query(`
      SELECT entity_name, cert_type, expiry_date, contact_email,
             (expiry_date - CURRENT_DATE) AS days_remaining
      FROM grower_certifications
      WHERE expiry_date IS NOT NULL
        AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'
        AND expiry_date >= CURRENT_DATE
        AND notified = false
      ORDER BY expiry_date ASC
      LIMIT 50
    `).catch(() => ({ rows: [] }));
    AGENTS.RANGER.flagsRaised += r.rows.length;
    if (r.rows.length > 0) {
      AGENTS.RANGER.lastFlag = {
        ts: new Date().toISOString(),
        count: r.rows.length,
        soonest: r.rows[0]?.expiry_date,
        entity: r.rows[0]?.entity_name,
      };
    }
    AGENTS.RANGER.status = 'ACTIVE';
  } catch (e) {
    AGENTS.RANGER.status = 'ERROR';
    AGENTS.RANGER.lastError = e.message;
  }
}

// ---------------------------------------------------------------------------
// Start tick loops
// ---------------------------------------------------------------------------
function startAgents() {
  setTimeout(tickKIKI, 5000);
  setTimeout(tickATLAS, 8000);
  setTimeout(tickRANGER, 12000);
  setInterval(tickKIKI,  AGENTS.KIKI.intervalMs);
  setInterval(tickATLAS, AGENTS.ATLAS.intervalMs);
  setInterval(tickRANGER, AGENTS.RANGER.intervalMs);
  console.log('[MiniAPI/Agents] KIKI + ATLAS + RANGER initialized');
}

startAgents();

// ---------------------------------------------------------------------------
// KIKI Middleware — injects agent context header on all requests
// ---------------------------------------------------------------------------
function kikiMiddleware(req, res, next) {
  res.setHeader('X-MFG-Agent-Version', 'KIKI/1.0');
  res.setHeader('X-MFG-Agent-Status', AGENTS.KIKI.status);
  next();
}

// ---------------------------------------------------------------------------
// Status Router — GET /api/agents/status, GET /api/agents/:id
// ---------------------------------------------------------------------------
const statusRouter = express.Router();

statusRouter.get('/status', (req, res) => {
  res.json({
    ok: true,
    ts: new Date().toISOString(),
    platform: 'AuditDNA Agriculture — MiniAPI',
    agents: Object.values(AGENTS).map(a => ({
      id: a.id, name: a.name, version: a.version,
      status: a.status, lastRun: a.lastRun, runsTotal: a.runsTotal,
      description: a.description,
    })),
  });
});

statusRouter.get('/:id', (req, res) => {
  const agent = AGENTS[req.params.id.toUpperCase()];
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json({ ok: true, agent });
});

statusRouter.post('/:id/run', async (req, res) => {
  const id = req.params.id.toUpperCase();
  try {
    if (id === 'KIKI')   await tickKIKI();
    else if (id === 'ATLAS')  await tickATLAS();
    else if (id === 'RANGER') await tickRANGER();
    else return res.status(404).json({ error: 'Agent not found' });
    res.json({ ok: true, agent: AGENTS[id] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default { kikiMiddleware, statusRouter, AGENTS };
