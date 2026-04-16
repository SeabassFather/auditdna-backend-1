const { Pool } = require('pg');
require('dotenv').config();

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,

      // 🔥 REQUIRED FOR RAILWAY
      ssl: {
        rejectUnauthorized: false
      }
    });
  }

  return pool;
}

module.exports = { getPool };