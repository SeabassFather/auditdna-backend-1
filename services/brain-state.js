// ============================================================================
// AuditDNA Brain State Service
// File: C:\AuditDNA\backend\services\brain-state.js
// Purpose: every frontend module calls GET /api/brain/state/:moduleId
//          server looks up module in brain_module_registry, runs the registered
//          state_handler, returns aggregated real Postgres data + empty-state config.
//
// Add to server.js:  app.use('/api/brain', require('./services/brain-state'));
// ============================================================================

const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

// --- Handler registry ---
// Each handler returns: { ok: true, data: {...} } or { ok: false, reason: '...' }
const handlers = {};

// 1) Mission Control - aggregates everything
handlers.missionControl = async () => {
  const pool = getPool();
  const [rfqs, disputes, alerts, growers, events] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS open_rfqs FROM rfqs WHERE status IN ('open','negotiating')`),
    pool.query(`SELECT COUNT(*) AS open_disputes, COALESCE(SUM(gmv_amount),0) AS gmv FROM rfq_disputes_v2 WHERE status='open'`),
    pool.query(`SELECT COUNT(*) AS active_alerts, COALESCE(SUM(fire_count),0) AS total_fires FROM price_alerts WHERE active=true`),
    pool.query(`SELECT COUNT(*) AS active_growers FROM growers WHERE status='active'`),
    pool.query(`SELECT event_type, COUNT(*) AS n FROM rfq_brain_events WHERE created_at > NOW() - INTERVAL '24 hours' GROUP BY event_type ORDER BY n DESC LIMIT 10`)
  ]);
  return {
    ok: true,
    data: {
      headline: {
        open_rfqs:       parseInt(rfqs.rows[0].open_rfqs, 10),
        open_disputes:   parseInt(disputes.rows[0].open_disputes, 10),
        disputes_gmv:    parseFloat(disputes.rows[0].gmv),
        active_alerts:   parseInt(alerts.rows[0].active_alerts, 10),
        alert_fires_24h: parseInt(alerts.rows[0].total_fires, 10),
        active_growers:  parseInt(growers.rows[0].active_growers, 10)
      },
      events_24h: events.rows
    }
  };
};

// 2) Saul Intel CRM - contact counts by bucket
handlers.saulIntelCRM = async () => {
  const pool = getPool();
  // Use crm_contacts if present, else growers + a buyers approximation
  let contactsQ;
  try {
    contactsQ = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE role = 'buyer') AS buyers,
        COUNT(*) FILTER (WHERE role = 'grower') AS growers,
        COUNT(*) FILTER (WHERE role = 'shipper') AS shippers,
        COUNT(*) FILTER (WHERE country = 'MX') AS mx,
        COUNT(*) FILTER (WHERE country = 'US') AS us
      FROM crm_contacts
    `);
  } catch (_e) {
    contactsQ = { rows: [{ total: 0, buyers: 0, growers: 0, shippers: 0, mx: 0, us: 0 }] };
  }
  const growersQ = await pool.query(`SELECT COUNT(*) AS n FROM growers`);
  const r = contactsQ.rows[0];
  return {
    ok: true,
    data: {
      total_contacts: parseInt(r.total, 10),
      by_role: {
        buyers:   parseInt(r.buyers, 10),
        growers:  parseInt(r.growers, 10) + parseInt(growersQ.rows[0].n, 10),
        shippers: parseInt(r.shippers, 10)
      },
      by_country: { mx: parseInt(r.mx, 10), us: parseInt(r.us, 10) }
    }
  };
};

// 3) Mexausa Omega Intelligence - commodity price snapshot
handlers.omegaIntel = async () => {
  const pool = getPool();
  let prices;
  try {
    prices = await pool.query(`
      SELECT commodity_category, commodity_subcategory,
             AVG(ask_price)::NUMERIC(10,2) AS avg_ask,
             COUNT(*) AS n_open
      FROM production_declarations_v2
      WHERE status='open'
      GROUP BY commodity_category, commodity_subcategory
      ORDER BY n_open DESC LIMIT 20
    `);
  } catch (_e) {
    prices = { rows: [] };
  }
  const recentRfqsQ = await pool.query(`
    SELECT commodity_category, COUNT(*) AS n_rfqs
    FROM rfqs WHERE created_at > NOW() - INTERVAL '7 days'
    GROUP BY commodity_category ORDER BY n_rfqs DESC LIMIT 10
  `);
  return {
    ok: true,
    data: { commodity_supply: prices.rows, rfq_demand_7d: recentRfqsQ.rows }
  };
};

// 4) Live Auctions - active auctions + WS room status
handlers.liveAuctions = async () => {
  const pool = getPool();
  const auctionsQ = await pool.query(`
    SELECT r.id AS rfq_id, r.code, r.commodity_category, r.quantity, r.unit, r.status,
           r.created_at, r.locks_at,
           (SELECT COUNT(*) FROM rfq_offers WHERE rfq_id = r.id) AS offer_count
    FROM rfqs r
    WHERE r.status IN ('open','negotiating')
    ORDER BY r.created_at DESC LIMIT 20
  `);
  return { ok: true, data: { active_auctions: auctionsQ.rows } };
};

// 5) Production Declarations - open inventory + match counts
handlers.declarations = async () => {
  const pool = getPool();
  const declQ = await pool.query(`
    SELECT pd.id, pd.commodity_category, pd.estimated_volume, pd.volume_unit,
           pd.ask_price, pd.ask_price_currency, pd.origin_country, pd.origin_state,
           pd.matched_rfqs, pd.created_at, g.company_name, g.grs_score
    FROM production_declarations_v2 pd
    JOIN growers g ON g.id = pd.grower_id
    WHERE pd.status='open' AND (pd.expires_at IS NULL OR pd.expires_at > NOW())
    ORDER BY pd.created_at DESC LIMIT 50
  `);
  return { ok: true, data: { open_declarations: declQ.rows, count: declQ.rows.length } };
};

// 6) Disputes - open queue + forum split
handlers.disputes = async () => {
  const pool = getPool();
  const dispQ = await pool.query(`
    SELECT id, rfq_id, raised_by_role, against_role, category, gmv_amount, currency,
           forum, status, created_at
    FROM rfq_disputes_v2 ORDER BY created_at DESC LIMIT 30
  `);
  const summary = await pool.query(`
    SELECT forum, status, COUNT(*) AS n, COALESCE(SUM(gmv_amount),0) AS gmv
    FROM rfq_disputes_v2 GROUP BY forum, status
  `);
  return { ok: true, data: { recent: dispQ.rows, summary: summary.rows } };
};

// 7) Grower Hub - active growers + tier breakdown
handlers.growerHub = async () => {
  const pool = getPool();
  const summaryQ = await pool.query(`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'active') AS active,
      COUNT(*) FILTER (WHERE status = 'pending') AS pending,
      COUNT(*) FILTER (WHERE country = 'MX') AS mx,
      COUNT(*) FILTER (WHERE country = 'US') AS us,
      AVG(grs_score) FILTER (WHERE grs_score IS NOT NULL)::NUMERIC(10,2) AS avg_grs
    FROM growers
  `);
  const recentQ = await pool.query(`
    SELECT id, company_name, country, state_province, grs_score, status, primary_product, created_at
    FROM growers ORDER BY created_at DESC LIMIT 15
  `);
  return { ok: true, data: { summary: summaryQ.rows[0], recent: recentQ.rows } };
};

// 8) Owner Command Center
handlers.ownerCommand = async () => {
  const pool = getPool();
  const [rfqStats, dispStats, growStats, alertStats, eventStats] = await Promise.all([
    pool.query(`SELECT status, COUNT(*) AS n FROM rfqs GROUP BY status`),
    pool.query(`SELECT forum, status, COUNT(*) AS n, COALESCE(SUM(gmv_amount),0) AS gmv FROM rfq_disputes_v2 GROUP BY forum, status`),
    pool.query(`SELECT status, COUNT(*) AS n FROM growers GROUP BY status`),
    pool.query(`SELECT COUNT(*) FILTER (WHERE active) AS active, COALESCE(SUM(fire_count),0) AS fires FROM price_alerts`),
    pool.query(`SELECT event_type, COUNT(*) AS n FROM rfq_brain_events WHERE created_at > NOW() - INTERVAL '24 hours' GROUP BY event_type`)
  ]);
  return {
    ok: true,
    data: {
      rfqs_by_status:     rfqStats.rows,
      disputes:           dispStats.rows,
      growers_by_status:  growStats.rows,
      alerts:             alertStats.rows[0],
      events_24h:         eventStats.rows
    }
  };
};

// --- Reusable mini-handlers for already-real modules ---
handlers.growerDatabaseStub = async () => {
  const pool = getPool();
  const q = await pool.query(`SELECT id, company_name, country, primary_product, grs_score, status FROM growers ORDER BY created_at DESC LIMIT 50`);
  return { ok: true, data: { growers: q.rows } };
};

handlers.growerActivationQueue = async () => {
  const pool = getPool();
  const q = await pool.query(`SELECT id, company_name, country, primary_product, grs_score, created_at FROM growers WHERE status='pending' ORDER BY created_at DESC LIMIT 30`);
  return { ok: true, data: { pending_activation: q.rows } };
};

handlers.marketplace = async () => {
  const pool = getPool();
  const declQ = await pool.query(`
    SELECT pd.id, pd.commodity_category, pd.estimated_volume, pd.volume_unit,
           pd.ask_price, pd.origin_country, g.company_name, g.grs_score
    FROM production_declarations_v2 pd JOIN growers g ON g.id=pd.grower_id
    WHERE pd.status='open' ORDER BY pd.created_at DESC LIMIT 50
  `);
  const rfqQ = await pool.query(`SELECT id, code, commodity_category, quantity, unit, status, created_at FROM rfqs WHERE status='open' ORDER BY created_at DESC LIMIT 30`);
  return { ok: true, data: { listings: declQ.rows, rfqs: rfqQ.rows } };
};

handlers.dealIntelligence = async () => {
  const pool = getPool();
  const q = await pool.query(`SELECT id, code, commodity_category, status, gmv_estimate, created_at FROM rfqs ORDER BY created_at DESC LIMIT 30`);
  return { ok: true, data: { recent_deals: q.rows } };
};

handlers.dealFloor = async () => handlers.dealIntelligence();
handlers.financialServicesHub = async () => handlers.ownerCommand();
handlers.notifications = async () => {
  const pool = getPool();
  const q = await pool.query(`SELECT id, recipient_id, recipient_role, channel, event_type, delivered, created_at FROM rfq_notifications ORDER BY created_at DESC LIMIT 30`);
  return { ok: true, data: { recent_notifications: q.rows } };
};

handlers.inventoryAlerts = async () => handlers.declarations();
handlers.seasonalCalendarStub = async () => ({ ok: true, data: { seasons: [], note: 'Static reference data - to be replaced with live USDA seasonality feed' } });

// Generic stub handler - just echoes the registry empty state
handlers.stub = async (registryRow) => ({
  ok: true,
  data: {
    is_stub: true,
    message: registryRow.empty_state_msg || 'Module under development',
    cta: registryRow.empty_state_cta || null
  }
});

// --- ROUTES ----------------------------------------------------------------

// GET /api/brain/state/:moduleId - returns aggregated real data per module
router.get('/state/:moduleId', async (req, res) => {
  const { moduleId } = req.params;
  const userId = req.headers['x-user-id'] || null;
  const userRole = req.headers['x-user-role'] || null;
  const pool = getPool();
  try {
    const reg = await pool.query(`SELECT * FROM brain_module_registry WHERE module_id=$1`, [moduleId]);
    if (!reg.rows.length) {
      return res.status(404).json({ ok: false, error: 'module_not_registered', moduleId });
    }
    const row = reg.rows[0];
    const handler = handlers[row.state_handler];
    if (!handler) {
      return res.json({
        ok: true,
        data: { is_stub: true, message: `Handler '${row.state_handler}' not implemented yet`, registry: row }
      });
    }

    // Log the view (fire-and-forget, don't block response)
    pool.query(
      `INSERT INTO brain_module_views(module_id, user_id, user_role) VALUES ($1, $2, $3)`,
      [moduleId, userId, userRole]
    ).catch(() => {});

    const result = await handler(row);
    res.json({
      ok: true,
      module: { id: row.module_id, label: row.module_label, category: row.category, is_real: row.is_real, subscribes_to: row.subscribes_to, emits: row.emits },
      ...result
    });
  } catch (e) {
    console.error('[brain-state]', moduleId, e.message);
    res.status(500).json({ ok: false, error: e.message, moduleId });
  }
});

// GET /api/brain/sidebar - returns the full sidebar tree (categories + modules)
router.get('/sidebar', async (_req, res) => {
  const pool = getPool();
  try {
    const q = await pool.query(`SELECT category, modules, real_count, total_count FROM brain_sidebar_v ORDER BY category`);
    res.json({ ok: true, sidebar: q.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/brain/registry - full module registry (for admin / debugging)
router.get('/registry', async (_req, res) => {
  const pool = getPool();
  try {
    const q = await pool.query(`SELECT * FROM brain_module_registry ORDER BY category, ordering`);
    res.json({ ok: true, registry: q.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/brain/views/recent - recent module clicks (engagement signal)
router.get('/views/recent', async (_req, res) => {
  const pool = getPool();
  try {
    const q = await pool.query(`
      SELECT module_id, user_role, COUNT(*) AS views
      FROM brain_module_views
      WHERE viewed_at > NOW() - INTERVAL '1 hour'
      GROUP BY module_id, user_role ORDER BY views DESC LIMIT 50
    `);
    res.json({ ok: true, recent_views: q.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
