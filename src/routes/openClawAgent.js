// ============================================================================
// MEXAUSA FOOD GROUP - OPENCLAW AGENT + COHESIVE TREE BUS
// ============================================================================
// One nervous system: Brain (events) -> Roots (broadcast) -> Niner Miners (SI agents)
// -> OpenClaw (autonomous bot) -> Modules (consumers).
// Everything writes to the same audit log. Everything reads from the same DB.
// Gateway polls openclaw_actions for approved tasks.
// ============================================================================

const express = require('express');
const pool = require('../../db');
const router = express.Router();

// ---------------------------------------------------------------------------
// SCHEMA - ensure tables exist (idempotent, runs once at boot)
// ---------------------------------------------------------------------------
async function ensureSchema() {
  if (!pool || typeof pool.query !== "function") { console.warn("[openclaw] pool not ready, skipping schema init"); return; }
  // openclaw_actions: every action OpenClaw should/did take
  await pool.query(`
    CREATE TABLE IF NOT EXISTS openclaw_actions (
      id SERIAL PRIMARY KEY,
      action_type TEXT NOT NULL,
      payload JSONB DEFAULT '{}'::jsonb,
      status TEXT NOT NULL DEFAULT 'pending',
      source TEXT NOT NULL DEFAULT 'dashboard',
      source_event_id INT,
      brain_event_id INT,
      lane TEXT,
      deal_id INT,
      grower_id INT,
      partner_id INT,
      requested_by TEXT,
      approved_by TEXT,
      approved_at TIMESTAMPTZ,
      executed_at TIMESTAMPTZ,
      result JSONB,
      error_message TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_openclaw_status ON openclaw_actions(status);
    CREATE INDEX IF NOT EXISTS idx_openclaw_created ON openclaw_actions(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_openclaw_action_type ON openclaw_actions(action_type);
  `);

  // openclaw_heartbeats: gateway online/offline tracking
  await pool.query(`
    CREATE TABLE IF NOT EXISTS openclaw_heartbeats (
      id SERIAL PRIMARY KEY,
      gateway_id TEXT NOT NULL DEFAULT 'wsl2-primary',
      status TEXT NOT NULL DEFAULT 'online',
      last_action_id INT,
      whatsapp_connected BOOLEAN DEFAULT false,
      pending_count INT DEFAULT 0,
      heartbeat_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_heartbeat_at ON openclaw_heartbeats(heartbeat_at DESC);
  `);

  // tree_bus_subscriptions: which modules listen to which event types
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tree_bus_subscriptions (
      id SERIAL PRIMARY KEY,
      subscriber TEXT NOT NULL,
      event_type TEXT NOT NULL,
      handler TEXT,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(subscriber, event_type)
    );
  `);

  // niner_miners_registry: SI agents in the network
  await pool.query(`
    CREATE TABLE IF NOT EXISTS niner_miners_registry (
      id SERIAL PRIMARY KEY,
      agent_name TEXT NOT NULL UNIQUE,
      agent_role TEXT NOT NULL,
      capabilities JSONB DEFAULT '[]'::jsonb,
      status TEXT DEFAULT 'active',
      last_active TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Seed default subscriptions if empty
  const { rows: subCheck } = await pool.query('SELECT COUNT(*) as c FROM tree_bus_subscriptions');
  if (parseInt(subCheck[0].c) === 0) {
    const defaultSubs = [
      ['openclaw', 'PRODUCTION_DECLARED', 'queue_grower_outreach'],
      ['openclaw', 'GROWER_REGISTERED', 'queue_welcome_whatsapp'],
      ['openclaw', 'LOI_SENT', 'queue_partner_followup'],
      ['openclaw', 'LOI_ACCEPTED', 'queue_nda_dispatch'],
      ['openclaw', 'INVENTORY_LOADED', 'queue_buyer_alert_blast'],
      ['openclaw', 'FACTORING_REQUESTED', 'queue_lender_match'],
      ['openclaw', 'HARVEST_UPDATE', 'queue_buyer_segment_alert'],
      ['niner_miners', 'PRODUCTION_DECLARED', 'analyze_yield_risk'],
      ['niner_miners', 'GROWER_REGISTERED', 'compute_grs_score'],
      ['niner_miners', 'LOI_ACCEPTED', 'verify_compliance'],
      ['niner_miners', 'INVENTORY_LOADED', 'match_buyer_segments'],
      ['marketing_engine', 'INVENTORY_LOADED', 'suggest_blast_template'],
      ['marketing_engine', 'LOI_ACCEPTED', 'suggest_welcome_email'],
      ['marketing_engine', 'GROWER_REGISTERED', 'suggest_onboarding_drip'],
      ['command_sphere', '*', 'broadcast_to_dashboard'],
    ];
    for (const [sub, evt, handler] of defaultSubs) {
      await pool.query(
        'INSERT INTO tree_bus_subscriptions (subscriber, event_type, handler) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [sub, evt, handler]
      );
    }
  }

  // Seed niner miners registry if empty
  const { rows: nmCheck } = await pool.query('SELECT COUNT(*) as c FROM niner_miners_registry');
  if (parseInt(nmCheck[0].c) === 0) {
    const miners = [
      ['Yield Analyzer', 'production_intelligence', '["yield_forecast","weather_impact","price_projection"]'],
      ['GRS Scorer', 'grower_reliability', '["compliance_score","payment_history","kyc_check"]'],
      ['Buyer Matcher', 'demand_matching', '["commodity_match","geo_match","volume_match"]'],
      ['Compliance Watchdog', 'regulatory', '["fsma_check","paca_check","cert_expiry"]'],
      ['Price Sentinel', 'market_intelligence', '["usda_price_drop","margin_alert","trend_analysis"]'],
      ['LOI Tracker', 'deal_lifecycle', '["stalled_detection","reprice_suggestion","followup_timing"]'],
      ['Harvest Coordinator', 'logistics', '["window_optimization","cold_chain_alert","capacity_planning"]'],
      ['Factor Risk', 'finance', '["dps_compute","ads_compute","recourse_analysis"]'],
      ['Recovery Sentinel', 'financial_recovery', '["delinquency_detection","escrow_check","aging_alert"]'],
    ];
    for (const [name, role, caps] of miners) {
      await pool.query(
        'INSERT INTO niner_miners_registry (agent_name, agent_role, capabilities) VALUES ($1, $2, $3::jsonb) ON CONFLICT DO NOTHING',
        [name, role, caps]
      );
    }
  }
}

// ---------------------------------------------------------------------------
// THE COHESIVE TREE BUS - one event router for ALL subsystems
// ---------------------------------------------------------------------------
// When ANY brain event fires, this routes to:
//   - openclaw (queues actions per subscription)
//   - niner_miners (logs SI analysis tasks)
//   - marketing_engine (suggests templates)
//   - command_sphere (broadcasts to dashboard via WebSocket if available)
// All routing is recorded in tree_bus_subscriptions and openclaw_actions
// ---------------------------------------------------------------------------
async function routeTreeEvent(pool, brainEvent) {
  const evt = brainEvent.event_type || brainEvent.type;
  if (!evt) return;

  // Find all subscribers (specific or wildcard)
  const { rows: subs } = await pool.query(
    `SELECT subscriber, handler FROM tree_bus_subscriptions
     WHERE active = true AND (event_type = $1 OR event_type = '*')`,
    [evt]
  );

  for (const sub of subs) {
    try {
      if (sub.subscriber === 'openclaw') {
        // Queue an action for OpenClaw to consider (status = pending until operator approves)
        await pool.query(
          `INSERT INTO openclaw_actions
           (action_type, payload, status, source, source_event_id, brain_event_id, lane, deal_id, grower_id, requested_by)
           VALUES ($1, $2, 'pending', 'brain_event', $3, $3, $4, $5, $6, 'tree_bus_router')`,
          [
            sub.handler || evt.toLowerCase(),
            JSON.stringify({ trigger: evt, brain_payload: brainEvent.payload || {} }),
            brainEvent.id || null,
            brainEvent.lane || null,
            brainEvent.deal_id || null,
            brainEvent.grower_id || (brainEvent.payload && brainEvent.payload.grower_id) || null
          ]
        );
      }
      // niner_miners + marketing_engine + command_sphere are tracked the same way
      // but with a specialized action_type prefix so each subsystem can poll its own slice
      else {
        await pool.query(
          `INSERT INTO openclaw_actions
           (action_type, payload, status, source, source_event_id, brain_event_id, lane, deal_id, requested_by)
           VALUES ($1, $2, 'pending', $3, $4, $4, $5, $6, 'tree_bus_router')`,
          [
            `${sub.subscriber}.${sub.handler || evt.toLowerCase()}`,
            JSON.stringify({ trigger: evt, brain_payload: brainEvent.payload || {} }),
            sub.subscriber,
            brainEvent.id || null,
            brainEvent.lane || null,
            brainEvent.deal_id || null
          ]
        );
      }
    } catch (e) {
      console.error('[tree_bus] route error for', sub.subscriber, e.message);
    }
  }
}

// ---------------------------------------------------------------------------
// HOOK INTO global.brainEmit (chains with P13/P14/P15 like before)
// Schedule offset 4500ms so this runs AFTER brain logger (P15 at 4000ms)
// ---------------------------------------------------------------------------
function hookTreeBus(pool) {
  setTimeout(() => {
    if (typeof global.brainEmit === 'function') {
      const original = global.brainEmit;
      global.brainEmit = function (evt) {
        try { original(evt); } catch (e) { console.error('[brainEmit chain]', e.message); }
        setImmediate(() => {
          routeTreeEvent(pool, evt).catch(e =>
            console.error('[tree_bus] dispatch failed:', e.message)
          );
        });
      };
      console.log('[tree_bus] hooked global.brainEmit -> OpenClaw + Niner Miners + Marketing + CommandSphere');
    } else {
      console.log('[tree_bus] global.brainEmit not present yet, skipping hook');
    }
  }, 4500);
}

// ---------------------------------------------------------------------------
// ROUTES - /api/openclaw/*
// ---------------------------------------------------------------------------
module.exports = function (pool) {
  ensureSchema().then(() => {
    console.log('[openclaw] schema ready');
    hookTreeBus(pool);
  }).catch(e => console.error('[openclaw] schema init failed:', e.message));

  // GET /api/openclaw/status - gateway health + queue depth
  router.get('/status', async (req, res) => {
    try {
      const { rows: hb } = await pool.query(
        `SELECT * FROM openclaw_heartbeats ORDER BY heartbeat_at DESC LIMIT 1`
      );
      const { rows: pending } = await pool.query(
        `SELECT COUNT(*) as c FROM openclaw_actions WHERE status = 'pending'`
      );
      const { rows: approved } = await pool.query(
        `SELECT COUNT(*) as c FROM openclaw_actions WHERE status = 'approved'`
      );
      const { rows: today } = await pool.query(
        `SELECT COUNT(*) as c FROM openclaw_actions WHERE created_at > NOW() - INTERVAL '24 hours'`
      );
      const last = hb[0];
      const online = last && (Date.now() - new Date(last.heartbeat_at).getTime() < 120000);
      res.json({
        ok: true,
        gateway_online: online,
        last_heartbeat: last ? last.heartbeat_at : null,
        whatsapp_connected: last ? last.whatsapp_connected : false,
        pending_count: parseInt(pending[0].c),
        approved_count: parseInt(approved[0].c),
        actions_24h: parseInt(today[0].c)
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /api/openclaw/actions - recent actions
  router.get('/actions', async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const status = req.query.status;
    try {
      let q = 'SELECT * FROM openclaw_actions';
      const params = [];
      if (status) { params.push(status); q += ` WHERE status = $${params.length}`; }
      q += ' ORDER BY created_at DESC LIMIT ' + limit;
      const { rows } = await pool.query(q, params);
      res.json({ ok: true, actions: rows });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /api/openclaw/actions/pending
  router.get('/actions/pending', async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT * FROM openclaw_actions WHERE status = 'pending' ORDER BY created_at ASC LIMIT 100`
      );
      res.json({ ok: true, pending: rows });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /api/openclaw/actions/queue - what gateway polls (approved + not yet executed)
  router.get('/actions/queue', async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    try {
      const { rows } = await pool.query(
        `SELECT * FROM openclaw_actions
         WHERE status = 'approved' AND executed_at IS NULL
         ORDER BY approved_at ASC LIMIT $1`,
        [limit]
      );
      res.json({ ok: true, queue: rows });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /api/openclaw/dispatch - operator manually queues a task
  router.post('/dispatch', async (req, res) => {
    const { action_type, payload, lane, deal_id, grower_id, requested_by } = req.body;
    if (!action_type) return res.status(400).json({ ok: false, error: 'action_type required' });
    try {
      const { rows } = await pool.query(
        `INSERT INTO openclaw_actions
         (action_type, payload, status, source, lane, deal_id, grower_id, requested_by)
         VALUES ($1, $2, 'pending', 'dashboard', $3, $4, $5, $6)
         RETURNING *`,
        [action_type, JSON.stringify(payload || {}), lane || null, deal_id || null, grower_id || null, requested_by || 'operator']
      );
      res.json({ ok: true, action: rows[0] });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /api/openclaw/actions/:id/approve
  router.post('/actions/:id/approve', async (req, res) => {
    const { id } = req.params;
    const approved_by = (req.body && req.body.approved_by) || 'operator';
    try {
      const { rows } = await pool.query(
        `UPDATE openclaw_actions
         SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
         WHERE id = $2 AND status = 'pending'
         RETURNING *`,
        [approved_by, id]
      );
      if (!rows.length) return res.status(404).json({ ok: false, error: 'action not found or not pending' });
      res.json({ ok: true, action: rows[0] });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /api/openclaw/actions/:id/skip
  router.post('/actions/:id/skip', async (req, res) => {
    const { id } = req.params;
    try {
      const { rows } = await pool.query(
        `UPDATE openclaw_actions
         SET status = 'skipped', updated_at = NOW()
         WHERE id = $1 AND status = 'pending'
         RETURNING *`,
        [id]
      );
      if (!rows.length) return res.status(404).json({ ok: false, error: 'action not found or not pending' });
      res.json({ ok: true, action: rows[0] });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /api/openclaw/actions/:id/executed - gateway reports completion
  router.post('/actions/:id/executed', async (req, res) => {
    const { id } = req.params;
    const { result, error_message } = req.body || {};
    const status = error_message ? 'failed' : 'executed';
    try {
      const { rows } = await pool.query(
        `UPDATE openclaw_actions
         SET status = $1, result = $2::jsonb, error_message = $3, executed_at = NOW(), updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [status, JSON.stringify(result || {}), error_message || null, id]
      );
      res.json({ ok: true, action: rows[0] });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /api/openclaw/heartbeat - gateway pings every 30s
  router.post('/heartbeat', async (req, res) => {
    const { gateway_id, whatsapp_connected, last_action_id } = req.body || {};
    try {
      const { rows: pending } = await pool.query(
        `SELECT COUNT(*) as c FROM openclaw_actions WHERE status = 'approved' AND executed_at IS NULL`
      );
      await pool.query(
        `INSERT INTO openclaw_heartbeats
         (gateway_id, status, last_action_id, whatsapp_connected, pending_count)
         VALUES ($1, 'online', $2, $3, $4)`,
        [gateway_id || 'wsl2-primary', last_action_id || null, !!whatsapp_connected, parseInt(pending[0].c)]
      );
      res.json({ ok: true, queue_depth: parseInt(pending[0].c) });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /api/openclaw/niner-miners - registry of all SI agents
  router.get('/niner-miners', async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT * FROM niner_miners_registry ORDER BY agent_name ASC`
      );
      res.json({ ok: true, miners: rows });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /api/openclaw/tree-bus - subscriptions map (the cohesive nervous system)
  router.get('/tree-bus', async (req, res) => {
    try {
      const { rows: subs } = await pool.query(
        `SELECT subscriber, event_type, handler, active
         FROM tree_bus_subscriptions
         ORDER BY subscriber, event_type`
      );
      const { rows: stats } = await pool.query(
        `SELECT source, COUNT(*) as count
         FROM openclaw_actions
         WHERE created_at > NOW() - INTERVAL '24 hours'
         GROUP BY source`
      );
      res.json({ ok: true, subscriptions: subs, last24h_by_source: stats });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /api/openclaw/test-event - inject a test brain event to see the bus light up
  router.post('/test-event', async (req, res) => {
    const { event_type, payload } = req.body || {};
    if (!event_type) return res.status(400).json({ ok: false, error: 'event_type required' });
    try {
      // Manually call tree bus router (does not require global.brainEmit)
      await routeTreeEvent(pool, {
        event_type,
        payload: payload || {},
        deal_id: req.body.deal_id || null,
        grower_id: req.body.grower_id || null,
        lane: req.body.lane || null
      });
      res.json({ ok: true, message: `Test event '${event_type}' routed to all subscribers` });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  return router;
};
