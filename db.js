// ════════════════════════════════════════════════════════════════════════════
// AUDITDNA — STANDALONE DATABASE POOL
// Save to: C:\AuditDNA\backend\db.js
//
// WHY THIS EXISTS:
// server.js had: module.exports.pool = pool  (line 40)
// then later:    module.exports = app         (last line)
// The second line WIPED the pool export silently.
// Any route doing require('../server').pool got undefined → crash.
//
// FIX: Import pool from here instead of server.js.
// Usage in any route:
//   const { pool } = require('../db');        (from routes/ folder)
//   const { pool } = require('./db');         (from backend root)
// ════════════════════════════════════════════════════════════════════════════

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME     || 'auditdna',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD,
  max:      20,
  idleTimeoutMillis:       30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
  console.log('✅ PostgreSQL pool ready');
  console.log(`   DB: ${process.env.DB_NAME || 'auditdna'}`);
  console.log(`   Host: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}`);
});

pool.on('error', (err) => {
  console.error('[DB] Pool error:', err.message);
});

module.exports = { pool };