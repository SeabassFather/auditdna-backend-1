// ============================================================================
// db.js
// Save to: C:\AuditDNA\backend\db.js
// ----------------------------------------------------------------------------
// Standalone Postgres pool module. Imported via require('./db') from server.js
// and require('../db') from any route file.
// ----------------------------------------------------------------------------
// FIX 2026-05-01: keepAlive: true added to defeat Windows TCP idle reset
// that was poisoning local PM2 pool (cron ticks timing out every minute).
// Postgres itself is healthy (max_connections=100, only ~7 in use). The
// kernel was silently dropping idle sockets from inside node.
// ============================================================================

const { Pool } = require('pg');

const isProd = process.env.NODE_ENV === 'production';

// Connection config: prefer DATABASE_URL (Railway), else explicit env vars,
// else local dev fallback.
let connectionConfig;
if (process.env.DATABASE_URL) {
  connectionConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: isProd ? { rejectUnauthorized: false } : false
  };
} else {
  connectionConfig = {
    host: process.env.PGHOST || 'hopper.proxy.rlwy.net',
    port: parseInt(process.env.PGPORT || '55424', 10),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'PMJobEqMsVuiwvFwHlHFUrGXarncSAQj',
    database: process.env.PGDATABASE || 'railway',
    ssl: isProd ? { rejectUnauthorized: false } : false
  };
}

const pool = new Pool({
  ...connectionConfig,
  // ---- Pool sizing ----
  max: parseInt(process.env.PG_POOL_MAX || '20', 10),
  min: parseInt(process.env.PG_POOL_MIN || '2', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // ---- 2026-05-01 FIX ----
  // keepAlive prevents Windows TCP from silently dropping idle sockets.
  // keepAliveInitialDelayMillis: how long socket can be idle before first probe.
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  // ---- Statement-level safety ----
  statement_timeout: 30000,
  query_timeout: 30000,
  // ---- Application name for pg_stat_activity visibility ----
  application_name: process.env.APP_NAME || 'auditdna-backend'
});

// ----------------------------------------------------------------------------
// Pool event listeners - logged but never fatal.
// ----------------------------------------------------------------------------
pool.on('connect', (client) => {
  // Single shared session settings for every new physical connection.
  client.query("SET idle_in_transaction_session_timeout = '60s'").catch(() => {});
  client.query("SET timezone = 'America/Los_Angeles'").catch(() => {});
});

pool.on('error', (err) => {
  console.error('[db] pool error:', err.code, err.message);
  // Do NOT process.exit(). Let pool recover.
});

pool.on('remove', () => {
  // Useful when diagnosing pool churn.
  if (process.env.PG_VERBOSE === '1') console.log('[db] client removed from pool');
});

// ----------------------------------------------------------------------------
// Health check helper - call from server.js startup or /health route.
// ----------------------------------------------------------------------------
async function ping() {
  const r = await pool.query('SELECT NOW() AS now, current_database() AS db, version() AS pg');
  return r.rows[0];
}

// ----------------------------------------------------------------------------
// Convenience query wrapper with logging.
// ----------------------------------------------------------------------------
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const ms = Date.now() - start;
    if (ms > 1000) console.warn(`[db] SLOW (${ms}ms):`, text.slice(0, 100));
    return res;
  } catch (e) {
    console.error('[db] query error:', e.code, e.message, '\n  SQL:', text.slice(0, 200));
    throw e;
  }
}

// Make available globally for legacy routes that still expect global.db.
// New code should require('./db') directly.
if (!global.db) global.db = pool;

// 2026-05-01: Callable function export. Three caller patterns must all work:
//   (A) const getPool = require('../db'); const pool = getPool();
//   (B) const { getPool } = require('../db'); const pool = getPool();
//   (C) const pool = require('../db'); pool.query(...)
function moduleExport() { return pool; }
['query','connect','end','on','off','removeListener'].forEach(k => {
  if (typeof pool[k] === 'function') moduleExport[k] = pool[k].bind(pool);
});
['totalCount','idleCount','waitingCount'].forEach(k => {
  Object.defineProperty(moduleExport, k, { get: () => pool[k], enumerable: true });
});
moduleExport.pool    = pool;
moduleExport.getPool = function getPool() { return pool; };
moduleExport.ping    = ping;
if (!global.pool) global.pool = pool;
module.exports = moduleExport;
