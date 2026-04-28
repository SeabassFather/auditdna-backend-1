/**
 * C:\AuditDNA\backend\services\paca-validator.js (v2 - on-demand)
 *
 * Phase 1 Day 5 - rewrite of PACA validator.
 * USDA killed the bulk CSV in 2018. Only option now: per-license lookup via
 * apps.ams.usda.gov/pacasearch/. We hit that endpoint on-demand, cache 30 days.
 *
 * Strategy:
 *   - On RFQ wizard "Validate License" click → POST /api/paca/validate { license, name }
 *   - Backend checks paca_licenses_cache (TTL 30 days)
 *   - Cache miss → scrape ePACA search → store result → return
 *   - 5s timeout per scrape, fail-soft (return 'unverified' status)
 *
 * Routes:
 *   POST /api/paca/validate          { license OR name } → cached or live result
 *   GET  /api/paca/cache/stats       → cache size, hit ratio
 *   POST /api/paca/cache/invalidate  { license } → force re-scrape
 *   POST /api/paca/vet               admin manual vet override (kept from v1)
 */

const express = require('express');
const router = express.Router();
const getPool = require('../db');
const pool = getPool();

const CACHE_TTL_DAYS = 30;
const SCRAPE_TIMEOUT_MS = 5000;
const ePACA_SEARCH_URL = 'https://apps.ams.usda.gov/pacasearch/api/license/search';

// ----------------------------------------------------------------------------
// Cache lookup
// ----------------------------------------------------------------------------
async function lookupCache(license) {
  const r = await pool.query(`
    SELECT license_number, business_name, status, anniversary_date, principals,
           branches, last_synced_at,
           (NOW() - last_synced_at) < INTERVAL '${CACHE_TTL_DAYS} days' AS fresh
      FROM paca_licenses_cache
     WHERE license_number = $1
     LIMIT 1
  `, [license]);
  return r.rows[0] || null;
}

async function upsertCache(record) {
  await pool.query(`
    INSERT INTO paca_licenses_cache
      (license_number, business_name, status, anniversary_date, principals, branches, last_synced_at)
    VALUES ($1,$2,$3,$4,$5,$6, NOW())
    ON CONFLICT (license_number) DO UPDATE SET
      business_name = EXCLUDED.business_name,
      status = EXCLUDED.status,
      anniversary_date = EXCLUDED.anniversary_date,
      principals = EXCLUDED.principals,
      branches = EXCLUDED.branches,
      last_synced_at = NOW()
  `, [
    record.license_number,
    record.business_name || null,
    record.status || 'UNKNOWN',
    record.anniversary_date || null,
    JSON.stringify(record.principals || []),
    JSON.stringify(record.branches || []),
  ]);
}

// ----------------------------------------------------------------------------
// Live scrape - fetches ePACA search JSON endpoint
// ----------------------------------------------------------------------------
async function scrapeEPACA(license) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SCRAPE_TIMEOUT_MS);

  try {
    const res = await fetch(`${ePACA_SEARCH_URL}?licenseNumber=${encodeURIComponent(license)}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AuditDNA/1.0; +https://mexausafg.com)',
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    if (!data || !data.results || data.results.length === 0) {
      return { ok: false, error: 'not_found' };
    }
    const row = data.results[0];
    return {
      ok: true,
      record: {
        license_number: row.licenseNumber || license,
        business_name: row.businessName || row.tradeName || null,
        status: row.status || 'UNKNOWN',
        anniversary_date: row.anniversaryDate || null,
        principals: row.principals || [],
        branches: row.branches || [],
      },
    };
  } catch (e) {
    clearTimeout(timeout);
    return { ok: false, error: e.name === 'AbortError' ? 'timeout' : e.message };
  }
}

// ----------------------------------------------------------------------------
// Public validate function
// ----------------------------------------------------------------------------
async function validateLicense(license) {
  if (!license) return { valid: false, reason: 'no_license' };
  // Normalize
  const lic = String(license).trim().toUpperCase();
  // Format check
  if (!/^\d{4}-\d{4}$/.test(lic)) {
    return { valid: false, reason: 'invalid_format', license: lic };
  }
  // Cache hit
  const cached = await lookupCache(lic);
  if (cached && cached.fresh) {
    return {
      valid: cached.status === 'ACTIVE',
      source: 'cache',
      license: cached.license_number,
      business_name: cached.business_name,
      status: cached.status,
      anniversary_date: cached.anniversary_date,
      cached_at: cached.last_synced_at,
    };
  }
  // Live scrape
  const live = await scrapeEPACA(lic);
  if (!live.ok) {
    // Fail-soft: if we have stale cache, return that with warning
    if (cached) {
      return {
        valid: cached.status === 'ACTIVE',
        source: 'stale_cache',
        license: cached.license_number,
        business_name: cached.business_name,
        status: cached.status,
        warning: `Live lookup failed (${live.error}), using stale cache`,
      };
    }
    return { valid: false, reason: 'lookup_failed', error: live.error, license: lic };
  }
  await upsertCache(live.record);
  return {
    valid: live.record.status === 'ACTIVE',
    source: 'live',
    license: live.record.license_number,
    business_name: live.record.business_name,
    status: live.record.status,
    anniversary_date: live.record.anniversary_date,
  };
}

// ----------------------------------------------------------------------------
// Routes
// ----------------------------------------------------------------------------
router.post('/validate', async (req, res) => {
  try {
    const { license } = req.body || {};
    const result = await validateLicense(license);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/validate/:license', async (req, res) => {
  try {
    const result = await validateLicense(req.params.license);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/cache/stats', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active,
        COUNT(*) FILTER (WHERE status != 'ACTIVE') AS inactive,
        COUNT(*) FILTER (WHERE (NOW() - last_synced_at) < INTERVAL '${CACHE_TTL_DAYS} days') AS fresh,
        MAX(last_synced_at) AS last_synced
        FROM paca_licenses_cache
    `);
    res.json(r.rows[0] || {});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/cache/invalidate', async (req, res) => {
  try {
    const { license } = req.body || {};
    if (!license) return res.status(400).json({ error: 'missing license' });
    await pool.query(`DELETE FROM paca_licenses_cache WHERE license_number = $1`, [license]);
    res.json({ ok: true, license });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Manual admin vet (kept from v1)
router.post('/vet', async (req, res) => {
  try {
    const { entity_id, entity_type, license, override_status, notes, admin_id } = req.body || {};
    await pool.query(`
      INSERT INTO rfq_buyer_vetting (entity_id, entity_type, license_number, override_status, notes, admin_id, vetted_at)
      VALUES ($1,$2,$3,$4,$5,$6, NOW())
    `, [entity_id, entity_type, license, override_status, notes, admin_id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------------------------------
// Export - no more startNightlyCron (bulk CSV is dead)
// ----------------------------------------------------------------------------
module.exports = {
  router,
  validateLicense,
  startNightlyCron: () => {
    console.log('[PACA] v2 on-demand mode - no nightly cron (USDA bulk CSV deprecated)');
  },
};
