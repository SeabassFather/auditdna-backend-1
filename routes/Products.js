const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'process.env.DB_HOST',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'auditdna',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'auditdna2026'
});

console.log('[PRODUCTS] Route loaded - 501 products, 23 categories, 12 countries');

// --- PRODUCT CATALOG ---
router.get('/catalog', async (req, res) => {
  try {
    const { category, search, organic, status, origin, limit } = req.query;
    let q = 'SELECT * FROM product_catalog WHERE 1=1';
    const params = [];
    if (category) { params.push(category); q += ` AND category = $${params.length}`; }
    if (organic === 'true') q += ' AND organic_available = true';
    if (status) { params.push(status); q += ` AND status = $${params.length}`; }
    if (origin) { params.push(origin); q += ` AND origin_country = $${params.length}`; }
    if (search) { params.push(`%${search}%`); q += ` AND (product_name ILIKE $${params.length} OR product_name_es ILIKE $${params.length} OR varieties ILIKE $${params.length} OR sku ILIKE $${params.length})`; }
    q += ' ORDER BY category, product_name';
    if (limit) q += ` LIMIT ${parseInt(limit)}`;
    const r = await global.db.query(q, params);
    res.json({ success: true, count: r.rows.length, data: r.rows });
  } catch (e) {
    console.error('[PRODUCTS] catalog:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/catalog/:sku', async (req, res) => {
  try {
    const r = await global.db.query('SELECT * FROM product_catalog WHERE sku = $1', [req.params.sku]);
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Product not found' });
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/categories', async (req, res) => {
  try {
    const r = await global.db.query('SELECT category, COUNT(*) as count FROM product_catalog GROUP BY category ORDER BY count DESC');
    res.json({ success: true, data: r.rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/origins', async (req, res) => {
  try {
    const r = await global.db.query('SELECT origin_country, COUNT(*) as count FROM product_catalog GROUP BY origin_country ORDER BY count DESC');
    res.json({ success: true, data: r.rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// --- INVENTORY ---
router.get('/inventory', async (req, res) => {
  try {
    const { sku, warehouse, status } = req.query;
    let q = 'SELECT i.*, pc.product_name, pc.product_name_es, pc.category FROM inventory i LEFT JOIN product_catalog pc ON i.sku = pc.sku WHERE 1=1';
    const params = [];
    if (sku) { params.push(sku); q += ` AND i.sku = $${params.length}`; }
    if (warehouse) { params.push(warehouse); q += ` AND i.warehouse = $${params.length}`; }
    if (status) { params.push(status); q += ` AND i.status = $${params.length}`; }
    q += ' ORDER BY i.received_date DESC';
    const r = await global.db.query(q, params);
    res.json({ success: true, count: r.rows.length, data: r.rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/inventory/summary', async (req, res) => {
  try {
    const r = await global.db.query(`
      SELECT i.sku, pc.product_name, pc.category,
        SUM(i.cases_available) as total_available,
        SUM(i.cases_sold) as total_sold,
        SUM(i.cases_damaged) as total_damaged,
        AVG(i.cost_per_case) as avg_cost,
        COUNT(DISTINCT i.warehouse) as warehouses
      FROM inventory i LEFT JOIN product_catalog pc ON i.sku = pc.sku
      GROUP BY i.sku, pc.product_name, pc.category
      ORDER BY total_available DESC
    `);
    res.json({ success: true, data: r.rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// --- MANIFESTS ---
router.get('/manifests', async (req, res) => {
  try {
    const { status, type, limit } = req.query;
    let q = `SELECT m.*, g.legal_name as grower_name, b.legal_name as buyer_name
      FROM manifests m LEFT JOIN growers g ON m.grower_id = g.id LEFT JOIN buyers b ON m.buyer_id = b.id WHERE 1=1`;
    const params = [];
    if (status) { params.push(status); q += ` AND m.status = $${params.length}`; }
    if (type) { params.push(type); q += ` AND m.manifest_type = $${params.length}`; }
    q += ` ORDER BY m.created_at DESC LIMIT ${parseInt(limit) || 100}`;
    const r = await global.db.query(q, params);
    res.json({ success: true, count: r.rows.length, data: r.rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/manifests/:id/items', async (req, res) => {
  try {
    const r = await global.db.query('SELECT * FROM manifest_items WHERE manifest_id = $1 ORDER BY id', [req.params.id]);
    res.json({ success: true, data: r.rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// --- ORDERS ---
router.get('/orders', async (req, res) => {
  try {
    const { status, buyer_id, limit } = req.query;
    let q = `SELECT o.*, b.legal_name as buyer_name, b.trade_name as buyer_trade
      FROM orders o LEFT JOIN buyers b ON o.buyer_id = b.id WHERE 1=1`;
    const params = [];
    if (status) { params.push(status); q += ` AND o.status = $${params.length}`; }
    if (buyer_id) { params.push(buyer_id); q += ` AND o.buyer_id = $${params.length}`; }
    q += ` ORDER BY o.created_at DESC LIMIT ${parseInt(limit) || 100}`;
    const r = await global.db.query(q, params);
    res.json({ success: true, count: r.rows.length, data: r.rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// --- COGS ---
router.get('/cogs', async (req, res) => {
  try {
    const { sku, date_from, date_to } = req.query;
    let q = 'SELECT * FROM cogs_entries WHERE 1=1';
    const params = [];
    if (sku) { params.push(sku); q += ` AND sku = $${params.length}`; }
    if (date_from) { params.push(date_from); q += ` AND created_at >= $${params.length}`; }
    if (date_to) { params.push(date_to); q += ` AND created_at <= $${params.length}`; }
    q += ' ORDER BY created_at DESC LIMIT 500';
    const r = await global.db.query(q, params);
    res.json({ success: true, count: r.rows.length, data: r.rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/cogs/summary', async (req, res) => {
  try {
    const r = await global.db.query(`
      SELECT sku, product_name,
        SUM(cases) as total_cases,
        AVG(total_cogs / NULLIF(cases, 0)) as avg_cogs_per_case,
        AVG(margin_pct) as avg_margin,
        SUM(gross_profit) as total_profit,
        SUM(total_cogs) as total_cost,
        SUM(sale_price) as total_revenue
      FROM cogs_entries
      GROUP BY sku, product_name
      ORDER BY total_profit DESC
    `);
    res.json({ success: true, data: r.rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// --- PRICE ALERTS ---
router.get('/price-alerts', async (req, res) => {
  try {
    const r = await global.db.query('SELECT * FROM price_alerts WHERE active = true ORDER BY created_at DESC');
    res.json({ success: true, data: r.rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/price-alerts', async (req, res) => {
  try {
    const { sku, product_name, alert_type, condition_operator, threshold_price, market_city, notify_email } = req.body;
    const r = await global.db.query(
      'INSERT INTO price_alerts (sku, product_name, alert_type, condition_operator, threshold_price, market_city, notify_email) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [sku, product_name, alert_type, condition_operator, threshold_price, market_city, notify_email]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// --- FIELD INSPECTIONS ---
router.get('/inspections', async (req, res) => {
  try {
    const r = await global.db.query(`
      SELECT fi.*, g.legal_name as grower_name FROM field_inspections fi
      LEFT JOIN growers g ON fi.grower_id = g.id ORDER BY fi.inspection_date DESC LIMIT 100
    `);
    res.json({ success: true, data: r.rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// --- COLD CHAIN ---
router.get('/cold-chain', async (req, res) => {
  try {
    const { manifest_id } = req.query;
    let q = 'SELECT * FROM cold_chain_records';
    const params = [];
    if (manifest_id) { params.push(manifest_id); q += ' WHERE manifest_id = $1'; }
    q += ' ORDER BY recorded_at DESC LIMIT 500';
    const r = await global.db.query(q, params);
    res.json({ success: true, data: r.rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// --- SHIPMENTS ---
router.get('/shipments', async (req, res) => {
  try {
    const { status } = req.query;
    let q = 'SELECT * FROM shipments WHERE 1=1';
    const params = [];
    if (status) { params.push(status); q += ` AND status = $${params.length}`; }
    q += ' ORDER BY created_at DESC LIMIT 100';
    const r = await global.db.query(q, params);
    res.json({ success: true, data: r.rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// --- BRAIN TASKS ---
router.get('/brain/tasks', async (req, res) => {
  try {
    const { status, team, limit } = req.query;
    let q = 'SELECT * FROM brain_tasks WHERE 1=1';
    const params = [];
    if (status) { params.push(status); q += ` AND status = $${params.length}`; }
    if (team) { params.push(team); q += ` AND assigned_team = $${params.length}`; }
    q += ` ORDER BY created_at DESC LIMIT ${parseInt(limit) || 50}`;
    const r = await global.db.query(q, params);
    res.json({ success: true, data: r.rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/brain/tasks', async (req, res) => {
  try {
    const { task_type, assigned_team, assigned_miner, priority, payload } = req.body;
    const r = await global.db.query(
      'INSERT INTO brain_tasks (workflow_id, task_type, assigned_team, assigned_miner, priority, payload) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [Date.now().toString(36), task_type, assigned_team, assigned_miner, priority || 'medium', JSON.stringify(payload)]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// --- ANALYTICS ---
router.get('/analytics/snapshots', async (req, res) => {
  try {
    const { category, days } = req.query;
    let q = 'SELECT * FROM analytics_snapshots WHERE snapshot_date >= CURRENT_DATE - $1::integer';
    const params = [parseInt(days) || 30];
    if (category) { params.push(category); q += ` AND category = $${params.length}`; }
    q += ' ORDER BY snapshot_date DESC, metric_name';
    const r = await global.db.query(q, params);
    res.json({ success: true, data: r.rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// --- DOCUMENTS ---
router.get('/documents', async (req, res) => {
  try {
    const { type, entity, entity_id } = req.query;
    let q = 'SELECT * FROM documents WHERE status = $1';
    const params = ['active'];
    if (type) { params.push(type); q += ` AND document_type = $${params.length}`; }
    if (entity) { params.push(entity); q += ` AND related_entity = $${params.length}`; }
    if (entity_id) { params.push(entity_id); q += ` AND related_id = $${params.length}`; }
    q += ' ORDER BY created_at DESC LIMIT 100';
    const r = await global.db.query(q, params);
    res.json({ success: true, data: r.rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// --- HEALTH ---
router.get('/health', async (req, res) => {
  try {
    const tables = await global.db.query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'");
    const products = await global.db.query('SELECT COUNT(*) FROM product_catalog');
    const growers = await global.db.query('SELECT COUNT(*) FROM growers');
    const buyers = await global.db.query('SELECT COUNT(*) FROM buyers');
    const categories = await global.db.query('SELECT COUNT(DISTINCT category) FROM product_catalog');
    const origins = await global.db.query('SELECT COUNT(DISTINCT origin_country) FROM product_catalog');
    res.json({
      success: true,
      tables: parseInt(tables.rows[0].count),
      products: parseInt(products.rows[0].count),
      categories: parseInt(categories.rows[0].count),
      origins: parseInt(origins.rows[0].count),
      growers: parseInt(growers.rows[0].count),
      buyers: parseInt(buyers.rows[0].count),
      timestamp: new Date().toISOString()
    });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;

