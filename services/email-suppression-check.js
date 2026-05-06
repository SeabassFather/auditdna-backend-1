/**
 * email-suppression-check.js
 *
 * Save to: C:\AuditDNA\backend\services\email-suppression-check.js
 *
 * Single source of truth for filtering out suppressed/dead email addresses
 * before any send. Used by gmail.js, autonomous-blast.routes.js, and any
 * future route that fans out emails.
 *
 * Pattern: pass an array of recipients (strings OR objects with .email),
 * get back only those NOT in email_suppression. Caches the suppression list
 * in memory for 60 seconds to avoid hammering the DB on every send.
 */

'use strict';

const { Pool } = require('pg');

// Use a local pool that follows the same env-var pattern as gmail.js.
// Falls back to localhost defaults for local dev.
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'auditdna',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'auditdna2026',
});

let cache = { set: null, loadedAt: 0 };
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

async function loadSuppressionSet() {
  const now = Date.now();
  if (cache.set && (now - cache.loadedAt) < CACHE_TTL_MS) return cache.set;

  try {
    const r = await pool.query('SELECT LOWER(email) AS email FROM email_suppression');
    const set = new Set(r.rows.map(row => row.email));
    cache = { set, loadedAt: now };
    return set;
  } catch (e) {
    console.error('[email-suppression-check] DB load failed:', e.message);
    // Return empty set on error so sends still go through (fail-open, not fail-closed)
    return new Set();
  }
}

/**
 * Returns true if a single email is suppressed.
 */
async function isSuppressed(email) {
  if (!email || typeof email !== 'string') return false;
  const set = await loadSuppressionSet();
  return set.has(email.toLowerCase().trim());
}

/**
 * Filters an array of recipients (strings OR objects with .email property),
 * returning only the ones NOT in the suppression list.
 *
 * Returns: { allowed: [...], skipped: [...], skippedCount: N }
 */
async function filterSuppressed(recipients) {
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return { allowed: [], skipped: [], skippedCount: 0 };
  }
  const set = await loadSuppressionSet();
  const allowed = [];
  const skipped = [];

  for (const r of recipients) {
    const email = (typeof r === 'string' ? r : (r && r.email))
      ? (typeof r === 'string' ? r : r.email).toLowerCase().trim()
      : null;
    if (!email) {
      // No email at all - keep in allowed and let downstream handle it
      allowed.push(r);
      continue;
    }
    if (set.has(email)) {
      skipped.push(r);
    } else {
      allowed.push(r);
    }
  }

  if (skipped.length > 0) {
    console.log(`[email-suppression-check] skipped ${skipped.length} suppressed addresses`);
  }

  return { allowed, skipped, skippedCount: skipped.length };
}

/**
 * Force-clear the cache (call after manual INSERTs to email_suppression
 * if you need the new entries to take effect immediately).
 */
function invalidateCache() {
  cache = { set: null, loadedAt: 0 };
}

module.exports = {
  isSuppressed,
  filterSuppressed,
  invalidateCache
};
