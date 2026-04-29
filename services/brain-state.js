// ============================================================================
// AuditDNA Brain State Service v2
// File: C:\AuditDNA\backend\services\brain-state.js
// v2 fix: rfqs table doesn't exist - parent is rfq_needs.
// Schema-correct queries against rfq_needs, rfq_offers, price_alerts,
// production_declarations_v2, rfq_disputes_v2, growers, rfq_brain_events.
// ============================================================================

const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

const handlers = {};

// ---- 1) Mission Control -----------------------------------------------------
handlers.missionControl = async () => {
  const pool = getPool();
  const [needs, disputes, alerts, growers, events] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status IN ('open','auction','negotiating')) AS open_needs,
        COUNT(*) FILTER (WHERE status='auction') AS in_auction,
        COALESCE(SUM(estimated_gmv) FILTER (WHERE status IN ('open','auction')),0) AS pipeline_gmv
      FROM rfq_needs
    `),
    pool.query(`SELECT COUNT(*) AS open_disputes, COALESCE(SUM(gmv_amount),0) AS gmv FROM rfq_disputes_v2 WHERE status='open'`),
    pool.query(`SELECT COUNT(*) AS active_alerts, COALESCE(SUM(fire_count),0) AS total_fires FROM price_alerts WHERE active=true`),
    pool.query(`SELECT COUNT(*) FILTER (WHERE status IN ('active','approved')) AS active_growers FROM growers`),
    pool.query(`SELECT event_type, COUNT(*) AS n FROM rfq_brain_events WHERE created_at > NOW() - INTERVAL '24 hours' GROUP BY event_type ORDER BY n DESC LIMIT 10`)
  ]);
  return {
    ok: true,
    data: {
      headline: {
        open_needs:      parseInt(needs.rows[0].open_needs, 10),
        in_auction:      parseInt(needs.rows[0].in_auction, 10),
        pipeline_gmv:    parseFloat(needs.rows[0].pipeline_gmv),
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

// ---- 2) Saul Intel CRM ------------------------------------------------------
handlers.saulIntelCRM = async () => {
  const pool = getPool();
  let contactsQ;
  try {
    contactsQ = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE role='buyer') AS buyers,
        COUNT(*) FILTER (WHERE role='grower') AS growers,
        COUNT(*) FILTER (WHERE role='shipper') AS shippers,
        COUNT(*) FILTER (WHERE country='MX') AS mx,
        COUNT(*) FILTER (WHERE country='US') AS us
      FROM crm_contacts
    `);
  } catch (_e) {
    contactsQ = { rows: [{ total: 0, buyers: 0, growers: 0, shippers: 0, mx: 0, us: 0 }] };
  }
  const growersQ = await pool.query(`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE country ILIKE 'MX%' OR country ILIKE 'Mex%') AS mx,
      COUNT(*) FILTER (WHERE country ILIKE 'US%' OR country ILIKE 'United%') AS us
    FROM growers
  `);
  const r = contactsQ.rows[0];
  const g = growersQ.rows[0];
  return {
    ok: true,
    data: {
      total_contacts: parseInt(r.total, 10) + parseInt(g.total, 10),
      by_role: {
        buyers:   parseInt(r.buyers, 10),
        growers:  parseInt(r.growers, 10) + parseInt(g.total, 10),
        shippers: parseInt(r.shippers, 10)
      },
      by_country: {
        mx: parseInt(r.mx, 10) + parseInt(g.mx, 10),
        us: parseInt(r.us, 10) + parseInt(g.us, 10)
      }
    }
  };
};

// ---- 3) Mexausa Omega Intelligence ------------------------------------------
handlers.omegaIntel = async () => {
  const pool = getPool();
  const supply = await pool.query(`
    SELECT commodity_category, commodity_subcategory,
           AVG(ask_price)::NUMERIC(10,2) AS avg_ask,
           COUNT(*) AS n_open,
           COALESCE(SUM(estimated_volume),0)::NUMERIC(14,2) AS total_volume
    FROM production_declarations_v2
    WHERE status='open'
    GROUP BY commodity_category, commodity_subcategory
    ORDER BY n_open DESC LIMIT 20
  `);
  const demand = await pool.query(`
    SELECT commodity_category,
           COUNT(*) AS n_rfqs,
           COALESCE(SUM(quantity),0)::NUMERIC(14,2) AS total_quantity,
           AVG(target_price)::NUMERIC(10,2) AS avg_target
    FROM rfq_needs
    WHERE created_at > NOW() - INTERVAL '7 days'
    GROUP BY commodity_category
    ORDER BY n_rfqs DESC LIMIT 10
  `);
  return { ok: true, data: { commodity_supply: supply.rows, rfq_demand_7d: demand.rows } };
};

// ---- 4) Live Auctions -------------------------------------------------------
handlers.liveAuctions = async () => {
  const pool = getPool();
  const auctionsQ = await pool.query(`
    SELECT n.id AS rfq_id,
           n.rfq_code,
           n.commodity_category,
           n.commodity_subcategory,
           n.quantity, n.quantity_unit,
           n.target_price, n.target_price_currency,
           n.estimated_gmv,
           n.status,
           n.created_at,
           n.auction_starts_at,
           n.auction_ends_at,
           (SELECT COUNT(*) FROM rfq_offers WHERE rfq_id = n.id) AS offer_count
    FROM rfq_needs n
    WHERE n.status IN ('open','auction','negotiating')
    ORDER BY n.created_at DESC LIMIT 20
  `);
  return { ok: true, data: { active_auctions: auctionsQ.rows } };
};

// ---- 5) Production Declarations ---------------------------------------------
handlers.declarations = async () => {
  const pool = getPool();
  const declQ = await pool.query(`
    SELECT pd.id, pd.commodity_category, pd.commodity_subcategory,
           pd.estimated_volume, pd.volume_unit,
           pd.ask_price, pd.ask_price_currency,
           pd.origin_country, pd.origin_state,
           pd.matched_rfqs, pd.created_at,
           g.company_name, g.grs_score
    FROM production_declarations_v2 pd
    JOIN growers g ON g.id = pd.grower_id
    WHERE pd.status='open' AND (pd.expires_at IS NULL OR pd.expires_at > NOW())
    ORDER BY pd.created_at DESC LIMIT 50
  `);
  return { ok: true, data: { open_declarations: declQ.rows, count: declQ.rows.length } };
};

// ---- 6) Disputes ------------------------------------------------------------
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

// ---- 7) Grower Hub ----------------------------------------------------------
handlers.growerHub = async () => {
  const pool = getPool();
  const summaryQ = await pool.query(`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status IN ('active','approved')) AS active,
      COUNT(*) FILTER (WHERE status IN ('pending','registered')) AS pending,
      COUNT(*) FILTER (WHERE country ILIKE 'MX%' OR country ILIKE 'Mex%') AS mx,
      COUNT(*) FILTER (WHERE country ILIKE 'US%' OR country ILIKE 'United%') AS us,
      AVG(grs_score) FILTER (WHERE grs_score IS NOT NULL)::NUMERIC(10,2) AS avg_grs
    FROM growers
  `);
  const recentQ = await pool.query(`
    SELECT id, company_name, country, state_province, grs_score, status, primary_product, created_at
    FROM growers ORDER BY created_at DESC LIMIT 15
  `);
  return { ok: true, data: { summary: summaryQ.rows[0], recent: recentQ.rows } };
};

// ---- 8) Owner Command Center ------------------------------------------------
handlers.ownerCommand = async () => {
  const pool = getPool();
  const [needsStats, dispStats, growStats, alertStats, eventStats, declStats] = await Promise.all([
    pool.query(`SELECT status, COUNT(*) AS n, COALESCE(SUM(estimated_gmv),0)::NUMERIC(14,2) AS gmv FROM rfq_needs GROUP BY status`),
    pool.query(`SELECT forum, status, COUNT(*) AS n, COALESCE(SUM(gmv_amount),0) AS gmv FROM rfq_disputes_v2 GROUP BY forum, status`),
    pool.query(`SELECT status, COUNT(*) AS n FROM growers GROUP BY status`),
    pool.query(`SELECT COUNT(*) FILTER (WHERE active) AS active, COALESCE(SUM(fire_count),0) AS fires FROM price_alerts`),
    pool.query(`SELECT event_type, COUNT(*) AS n FROM rfq_brain_events WHERE created_at > NOW() - INTERVAL '24 hours' GROUP BY event_type`),
    pool.query(`SELECT COUNT(*) FILTER (WHERE status='open') AS open_inv, COALESCE(SUM(estimated_volume * ask_price) FILTER (WHERE status='open'),0)::NUMERIC(14,2) AS inventory_value FROM production_declarations_v2`)
  ]);
  return {
    ok: true,
    data: {
      rfqs_by_status:     needsStats.rows,
      disputes:           dispStats.rows,
      growers_by_status:  growStats.rows,
      alerts:             alertStats.rows[0],
      events_24h:         eventStats.rows,
      inventory:          declStats.rows[0]
    }
  };
};

// --- Reusable mini-handlers --------------------------------------------------
handlers.growerDatabaseStub = async () => {
  const pool = getPool();
  const q = await pool.query(`SELECT id, company_name, country, primary_product, grs_score, status FROM growers ORDER BY created_at DESC LIMIT 50`);
  return { ok: true, data: { growers: q.rows } };
};

handlers.growerActivationQueue = async () => {
  const pool = getPool();
  const q = await pool.query(`SELECT id, company_name, country, primary_product, grs_score, created_at FROM growers WHERE status IN ('pending','registered') ORDER BY created_at DESC LIMIT 30`);
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
  const rfqQ = await pool.query(`
    SELECT id, rfq_code, commodity_category, quantity, quantity_unit, status, created_at
    FROM rfq_needs WHERE status IN ('open','auction') ORDER BY created_at DESC LIMIT 30
  `);
  return { ok: true, data: { listings: declQ.rows, rfqs: rfqQ.rows } };
};

handlers.dealIntelligence = async () => {
  const pool = getPool();
  const q = await pool.query(`
    SELECT id, rfq_code, commodity_category, status, estimated_gmv, created_at
    FROM rfq_needs ORDER BY created_at DESC LIMIT 30
  `);
  return { ok: true, data: { recent_deals: q.rows } };
};

handlers.dealFloor = async () => handlers.dealIntelligence();
handlers.financialServicesHub = async () => handlers.ownerCommand();

handlers.notifications = async () => {
  const pool = getPool();
  const q = await pool.query(`
    SELECT id, recipient_id, recipient_role, channel, event_type, delivered, created_at
    FROM rfq_notifications ORDER BY created_at DESC LIMIT 30
  `);
  return { ok: true, data: { recent_notifications: q.rows } };
};

handlers.inventoryAlerts = async () => handlers.declarations();

handlers.seasonalCalendarStub = async () => ({
  ok: true,
  data: { seasons: [], note: 'Static reference data - to be replaced with live USDA seasonality feed' }
});

handlers.stub = async (registryRow) => ({
  ok: true,
  data: {
    is_stub: true,
    message: registryRow.empty_state_msg || 'Module under development',
    cta: registryRow.empty_state_cta || null
  }
});

// --- ROUTES ----------------------------------------------------------------

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
        module: { id: row.module_id, label: row.module_label, category: row.category, is_real: row.is_real, subscribes_to: row.subscribes_to, emits: row.emits },
        data: { is_stub: true, message: `Handler '${row.state_handler}' not implemented yet`, registry_label: row.module_label }
      });
    }

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
    console.error('[brain-state]', moduleId, e.message, e.stack && e.stack.split('\n').slice(0,3).join(' | '));
    res.status(500).json({ ok: false, error: e.message, moduleId });
  }
});

router.get('/sidebar', async (_req, res) => {
  const pool = getPool();
  try {
    const q = await pool.query(`SELECT category, modules, real_count, total_count FROM brain_sidebar_v ORDER BY category`);
    res.json({ ok: true, sidebar: q.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/registry', async (_req, res) => {
  const pool = getPool();
  try {
    const q = await pool.query(`SELECT * FROM brain_module_registry ORDER BY category, ordering`);
    res.json({ ok: true, registry: q.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

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
