const { Pool } = require('pg');
require('dotenv').config();

let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,

      ssl: {
        rejectUnauthorized: false
      }
    });

    pool.on('connect', () => {
      console.log('✅ PostgreSQL connected');
    });

    pool.on('error', (err) => {
      console.error('❌ PostgreSQL error:', err);
    });
  }

  return pool;
}

module.exports = {
  getPool
};