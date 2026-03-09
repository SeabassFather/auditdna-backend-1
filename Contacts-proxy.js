// ============================================================
// AuditDNA Contacts Proxy — Express Router
// Backend: C:\AuditDNA\backend\Contacts-proxy.js
// Mounted at: /api/contacts-proxy (via server.js)
// NO standalone server — runs inside port 5050
// Eliminates EADDRINUSE crash on port 5051
// ============================================================
const express = require('express');
const router  = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'auditdna',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'auditdna2026',
});

// Verify DB on load
pool.connect((err, client, release) => {
  if (err) {
    console.error('[Contacts-proxy] PostgreSQL connection FAILED:', err.message);
  } else {
    release();
    console.log('[Contacts-proxy] PostgreSQL ready — mounted at /api/contacts-proxy');
  }
});

async function getContacts(table) {
  try {
    const r = await pool.query(`SELECT * FROM ${table} LIMIT 50000`);
    return r.rows;
  } catch (e) {
    console.warn(`[Contacts-proxy] Table "${table}" query failed: ${e.message}`);
    return [];
  }
}

async function listTables() {
  const r = await pool.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name
  `);
  return r.rows.map(r => r.table_name);
}

// GET /api/contacts-proxy/health
router.get('/health', (req, res) => {
  res.json({ status: 'ok', mount: '/api/contacts-proxy', port: process.env.PORT || 5050 });
});

// GET /api/contacts-proxy/growers
router.get('/growers', async (req, res) => {
  try {
    const data = await getContacts('growers');
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/contacts-proxy/buyers
router.get('/buyers', async (req, res) => {
  try {
    const data = await getContacts('buyers');
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/contacts-proxy/shippers
router.get('/shippers', async (req, res) => {
  try {
    const data = await getContacts('shipper_contacts');
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/contacts-proxy/tables
router.get('/tables', async (req, res) => {
  try {
    const tables = await listTables();
    res.json({ tables });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/contacts-proxy/all
router.get('/all', async (req, res) => {
  try {
    const [g, b, s] = await Promise.all([
      getContacts('growers'),
      getContacts('buyers'),
      getContacts('shipper_contacts'),
    ]);
    res.json({
      growers:  g,
      buyers:   b,
      shippers: s,
      total:    g.length + b.length + s.length,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;