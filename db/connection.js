// ===========================================================================
// AUDITDNA - DATABASE CONNECTION
// Mexausa Food Group, Inc. | AuditDNA Platform
// ===========================================================================
// PostgreSQL Connection Pool - 23,379 CRM Contacts
// ===========================================================================

const { Pool } = require('pg');

// Create connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'auditdna',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'auditdna2026',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on('connect', () => {
  console.log('[DB] ✅ Connected to PostgreSQL - auditdna database');
});

pool.on('error', (err) => {
  console.error('[DB] ❌ Unexpected error:', err);
});

// Query helper with logging
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('[DB] Query executed', { duration: `${duration}ms`, rows: result.rowCount });
    }
    return result;
  } catch (error) {
    console.error('[DB] Query error:', error.message);
    throw error;
  }
}

// Get single client for transactions
async function getClient() {
  const client = await pool.connect();
  return client;
}

// Health check
async function healthCheck() {
  try {
    const result = await pool.query('SELECT NOW()');
    return { connected: true, timestamp: result.rows[0].now };
  } catch (error) {
    return { connected: false, error: error.message };
  }
}

// Query one record helper
async function queryOne(sql, params) {
  const result = await query(sql, params);
  return result.rows[0] || null;
}

module.exports = {
  pool,
  query,
  getClient,
  healthCheck,
  queryOne
};