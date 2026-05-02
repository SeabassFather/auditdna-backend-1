// =============================================================================
// File: C:\AuditDNA\backend\swarm\gatekeepers\11-margie-archive.js
// STAGE 11 - MARGIE: files activity record, stores in archive, ready for reports
// (extends existing margie-audit-keeper.js — does the WRITE; the existing
//  audit-keeper handles compliance/retention)
// =============================================================================

let pool;
function getPool() {
  if (pool) return pool;
  try { pool = require('../../db'); }
  catch (e1) {
    try { pool = require('../../config/db'); }
    catch (e2) {
      const { Pool } = require('pg');
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway') ? { rejectUnauthorized: false } : false
      });
    }
  }
  return pool;
}

function reportPeriod(d) {
  // 'YYYY-MM-DD' for daily roll-up
  return d.toISOString().slice(0, 10);
}

async function run(ctx) {
  const rec = ctx.archive_record;
  if (!rec) {
    // courier didn't run (early failure) - still file a minimal record
    const minimal = {
      run_id: ctx.run_id,
      request_type: ctx.request.request_type,
      summary: '[INCOMPLETE_RUN] ' + (ctx.error_msg || 'unknown failure'),
      intel: {},
      full_record: { status: 'failed', error: ctx.error_msg || null }
    };
    ctx.archive_record = minimal;
  }

  const r = ctx.archive_record;
  const period = reportPeriod(new Date());

  try {
    const p = getPool();
    if (p && p.query) {
      await p.query(
        `INSERT INTO margie_archive
          (run_id, request_type, summary, intel, full_record, filed_by, report_period)
         VALUES ($1,$2,$3,$4,$5,'margie',$6)`,
        [r.run_id, r.request_type, r.summary,
         JSON.stringify(r.intel || {}),
         JSON.stringify(r.full_record || {}),
         period]
      );
    }
  } catch (e) {
    // Margie's file failed - log but don't throw (we don't want pipeline to fail at archival)
    return { filed: false, error: e.message, period };
  }

  return {
    filed: true,
    period,
    summary_chars: (r.summary || '').length
  };
}

module.exports = {
  number: 11,
  name: 'archive',
  agent: 'margie',
  run
};
