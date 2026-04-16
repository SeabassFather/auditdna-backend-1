const { Pool } = require('pg');

let pool;

function getPool() {
  if (pool) return pool;

  // 🚨 RAILWAY AUTO PROVIDES DATABASE_URL
  if (process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
  } else {
    // LOCAL DEV ONLY
    pool = new Pool({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'password',
      database: 'auditdna'
    });
  }

  return pool;
}

module.exports = { getPool };