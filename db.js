// ═══════════════════════════════════════════════════════════════
// PostgreSQL Connection Pool
// Centralized DB connection for AuditDNA backend
// ═══════════════════════════════════════════════════════════════

const { Pool } = require('pg');
require('dotenv').config();

// ═══════════════════════════════════════════════════════════════
// Pool Configuration
// ═══════════════════════════════════════════════════════════════

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'auditdna',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,

  max: 20,                      // max connections
  idleTimeoutMillis: 30000,     // close idle clients after 30s
  connectionTimeoutMillis: 5000 // fail fast if DB unreachable
});

// ═══════════════════════════════════════════════════════════════
// Pool Events
// ═══════════════════════════════════════════════════════════════

pool.on('connect', () => {
  console.log('✅ PostgreSQL pool ready');
  console.log(`   DB: ${process.env.DB_NAME || 'auditdna'}`);
  console.log(`   Host: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}`);
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool error');
  console.error(err);
  
  // Don't hard exit in development - just log the error
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// ═══════════════════════════════════════════════════════════════
// Export Pool
// ═══════════════════════════════════════════════════════════════

module.exports = pool;