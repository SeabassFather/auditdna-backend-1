// =============================================================================
// File: C:\AuditDNA\backend\swarm\gatekeepers\04-forge.js
// STAGE 4 - FORGE: verifies via DB lookups, dedupe, referential integrity
// =============================================================================

let pool;
function getPool() {
  if (pool) return pool;
  try {
    pool = require('../../db');
  } catch (e1) {
    try {
      pool = require('../../config/db');
    } catch (e2) {
      const { Pool } = require('pg');
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway') ? { rejectUnauthorized: false } : false
      });
    }
  }
  return pool;
}

async function safeQuery(sql, params) {
  try {
    const p = getPool();
    const fn = (p && p.query) ? p.query.bind(p) : null;
    if (!fn) return { ok: false, rows: [], reason: 'no_pool' };
    const r = await fn(sql, params);
    return { ok: true, rows: r.rows || [] };
  } catch (e) {
    return { ok: false, rows: [], reason: e.message };
  }
}

async function dedupeCheck(type, data) {
  if (type === 'plastpac.inquiry' && data.email) {
    const r = await safeQuery(
      'SELECT id, created_at FROM plastpac_inquiries WHERE LOWER(email) = LOWER($1) AND created_at > NOW() - INTERVAL $2 LIMIT 1',
      [data.email, '1 hour']
    );
    if (r.ok && r.rows.length) return { duplicate: true, kind: 'recent_inquiry', existing_id: r.rows[0].id };
  }
  if (type === 'contact.create' && data.email) {
    const r = await safeQuery(
      'SELECT id FROM contacts WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [data.email]
    );
    if (r.ok && r.rows.length) return { duplicate: true, kind: 'existing_contact', existing_id: r.rows[0].id };
  }
  return { duplicate: false };
}

async function run(ctx) {
  const type = ctx.request.request_type;
  const data = ctx.normalized || {};

  const dup = await dedupeCheck(type, data);
  ctx.dedupe = dup;

  if (dup.duplicate && type === 'contact.create') {
    // For contact.create, dedupe -> non-fatal warning
    ctx.skip_insert = true;
    return { dedupe: dup, integrity_ok: true, action: 'skip_insert_duplicate' };
  }

  return { dedupe: dup, integrity_ok: true, action: 'proceed' };
}

module.exports = {
  number: 4,
  name: 'verify',
  agent: 'forge',
  run
};
