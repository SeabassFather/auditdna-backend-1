'use strict';

const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (!pool) {
    // Prefer DB_* (Railway convention), fall back to PG* (standard pg lib),
    // then to hardcoded localhost defaults for zero-config dev.
    const host     = process.env.DB_HOST     || process.env.PGHOST     || 'localhost';
    const port     = parseInt(process.env.DB_PORT || process.env.PGPORT || '5432', 10);
    const database = process.env.DB_NAME     || process.env.PGDATABASE || 'auditdna';
    const user     = process.env.DB_USER     || process.env.PGUSER     || 'postgres';
    const password = process.env.DB_PASSWORD || process.env.PGPASSWORD || 'postgres';

    // SSL required by Railway / most managed Postgres; disabled locally.
    const isRemote = host !== 'localhost' && host !== '127.0.0.1';
    const ssl = isRemote ? { rejectUnauthorized: false } : false;

    pool = new Pool({
      host,
      port,
      database,
      user,
      password,
      ssl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });

    pool.on('error', err => {
      console.error('[DB] Unexpected pool error:', err.message);
    });

    global.db = pool;
    console.log(`DB pool initialized → ${user}@${host}:${port}/${database} (ssl:${!!ssl})`);
  }

  return pool;
}

module.exports = getPool;
module.exports.getPool = getPool;