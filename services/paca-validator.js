/**
 * C:\AuditDNA\backend\services\paca-validator.js
 *
 * PACA license validator service.
 *  - Nightly cron downloads USDA PACA CSV, ingests into paca_licenses_cache
 *  - validatePaca(licenseNumber) returns {valid, status, expiry_date, name, address, last_synced}
 *  - Used at buyer registration + nightly re-validation of all active buyers
 *
 * Mount in server.js:
 *   const pacaValidator = require('./services/paca-validator');
 *   pacaValidator.startNightlyCron();
 *   app.use('/api/paca', pacaValidator.router);
 */

const express = require('express');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const https = require('https');
const cron = require('node-cron');
const { parse } = require('csv-parse');

// ----------------------------------------------------------------------------
// PostgreSQL pool
// ----------------------------------------------------------------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway')
    ? { rejectUnauthorized: false }
    : false,
});

// ----------------------------------------------------------------------------
// USDA PACA CSV source
// ----------------------------------------------------------------------------
// USDA AMS publishes the PACA license database. Public endpoint:
const USDA_PACA_CSV_URL = process.env.USDA_PACA_CSV_URL
  || 'https://www.ams.usda.gov/sites/default/files/media/PACAActiveLicensees.csv';

const TMP_DIR = process.env.PACA_TMP_DIR || (process.platform === 'win32' ? 'C:\\AuditDNA\\backend\\tmp' : '/tmp');
const TMP_FILE = path.join(TMP_DIR, 'paca-licensees.csv');

// ----------------------------------------------------------------------------
// Download helper
// ----------------------------------------------------------------------------
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(path.dirname(dest))) fs.mkdirSync(path.dirname(dest), { recursive: true });
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadFile(response.headers.location, dest).then(resolve, reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`HTTP ${response.statusCode} from ${url}`));
      }
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', reject);
    }).on('error', reject);
  });
}

// ----------------------------------------------------------------------------
// Ingest CSV to paca_licenses_cache
// ----------------------------------------------------------------------------
async function ingestCsv(csvPath) {
  const client = await pool.connect();
  let rows = 0;
  let skipped = 0;
  try {
    await client.query('BEGIN');

    // Stream parse the CSV
    const parser = fs.createReadStream(csvPath).pipe(parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }));

    for await (const rec of parser) {
      // USDA columns vary — handle the typical headers defensively.
      // Common headers seen: License No, Licensee Name, Address, City, State, ZIP, Issue Date, Expiry Date, Status
      const lic = rec['License No'] || rec['LicenseNo'] || rec['License Number'] || rec['license_no'];
      if (!lic) { skipped++; continue; }

      const name   = rec['Licensee Name'] || rec['LicenseeName'] || rec['Name'] || '';
      const addr   = rec['Address'] || rec['Street Address'] || '';
      const city   = rec['City'] || '';
      const state  = rec['State'] || '';
      const zip    = rec['ZIP'] || rec['Zip Code'] || '';
      const issue  = parseDate(rec['Issue Date'] || rec['IssueDate'] || rec['Issued']);
      const expiry = parseDate(rec['Expiry Date'] || rec['ExpiryDate'] || rec['Expires'] || rec['Expiration Date']);
      const status = (rec['Status'] || 'active').toLowerCase();

      await client.query(
        `INSERT INTO paca_licenses_cache
            (license_number, licensee_name, address, city, state, zip, issue_date, expiry_date, status, last_synced_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, NOW())
         ON CONFLICT (license_number) DO UPDATE SET
            licensee_name  = EXCLUDED.licensee_name,
            address        = EXCLUDED.address,
            city           = EXCLUDED.city,
            state          = EXCLUDED.state,
            zip            = EXCLUDED.zip,
            issue_date     = EXCLUDED.issue_date,
            expiry_date    = EXCLUDED.expiry_date,
            status         = EXCLUDED.status,
            last_synced_at = NOW()`,
        [lic.trim(), name, addr, city, state, zip, issue, expiry, status]
      );
      rows++;
    }

    await client.query('COMMIT');
    console.log(`[PACA] Ingest complete: ${rows} rows, ${skipped} skipped`);
    return { rows, skipped };
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('[PACA] Ingest failed:', e.message);
    throw e;
  } finally {
    client.release();
  }
}

function parseDate(s) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

// ----------------------------------------------------------------------------
// Run full nightly sync
// ----------------------------------------------------------------------------
async function runNightlySync() {
  const start = Date.now();
  try {
    console.log('[PACA] Nightly sync started:', new Date().toISOString());
    await downloadFile(USDA_PACA_CSV_URL, TMP_FILE);
    console.log('[PACA] CSV downloaded:', TMP_FILE);
    const { rows, skipped } = await ingestCsv(TMP_FILE);

    // Re-validate all active buyers whose PACA may have expired today
    const expired = await pool.query(`
      UPDATE rfq_buyer_vetting v
         SET vetting_status = 'manual_review',
             paca_status    = 'expired',
             reviewed_at    = NULL
        FROM paca_licenses_cache p
       WHERE v.paca_license = p.license_number
         AND p.expiry_date < CURRENT_DATE
         AND v.vetting_status = 'auto_approved'
       RETURNING v.id, v.buyer_id, v.paca_license
    `);
    console.log(`[PACA] Flagged ${expired.rowCount} buyers for manual review (license expired)`);

    const took = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[PACA] Nightly sync done in ${took}s — ${rows} licenses, ${expired.rowCount} buyers re-flagged`);
    return { ok: true, rows, skipped, flagged: expired.rowCount, seconds: took };
  } catch (e) {
    console.error('[PACA] Nightly sync FAILED:', e.message);
    return { ok: false, error: e.message };
  }
}

// ----------------------------------------------------------------------------
// Public validator API
// ----------------------------------------------------------------------------
async function validatePaca(licenseNumber) {
  if (!licenseNumber) return { valid: false, status: 'not_found', reason: 'no_license_provided' };
  const r = await pool.query(
    `SELECT license_number, licensee_name, status, expiry_date, address, city, state, zip, last_synced_at
       FROM paca_licenses_cache
      WHERE license_number = $1`,
    [licenseNumber.trim()]
  );
  if (r.rows.length === 0) {
    return { valid: false, status: 'not_found' };
  }
  const row = r.rows[0];
  const today = new Date().toISOString().slice(0, 10);
  const isExpired = row.expiry_date && row.expiry_date < today;
  return {
    valid: !isExpired && row.status === 'active',
    status: isExpired ? 'expired' : row.status,
    expiry_date: row.expiry_date,
    name: row.licensee_name,
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    last_synced: row.last_synced_at,
  };
}

// ----------------------------------------------------------------------------
// Buyer auto-approval workflow
// ----------------------------------------------------------------------------
async function vettingDecision({ buyer_id, paca_license, ein, rfc, dnb_duns, trade_refs }) {
  let pacaStatus = 'not_found';
  let autoApproved = false;
  let vettingStatus = 'manual_review';

  if (paca_license) {
    const r = await validatePaca(paca_license);
    pacaStatus = r.status;
    if (r.valid) {
      autoApproved = true;
      vettingStatus = 'auto_approved';
    } else if (r.status === 'expired') {
      vettingStatus = 'manual_review';
    }
  }

  // Insert/update vetting record
  const ins = await pool.query(
    `INSERT INTO rfq_buyer_vetting
        (buyer_id, paca_license, paca_status, vetting_status, auto_approved, ein, rfc, dnb_duns, trade_refs)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id, vetting_status, auto_approved, paca_status`,
    [buyer_id, paca_license, pacaStatus, vettingStatus, autoApproved, ein, rfc, dnb_duns, JSON.stringify(trade_refs || [])]
  );
  return ins.rows[0];
}

// ----------------------------------------------------------------------------
// Cron + admin router
// ----------------------------------------------------------------------------
function startNightlyCron() {
  // Daily at 03:00 UTC
  cron.schedule('0 3 * * *', () => { runNightlySync().catch(()=>{}); }, { timezone: 'UTC' });
  console.log('[PACA] Nightly cron scheduled: 03:00 UTC daily');
}

const router = express.Router();

router.get('/validate/:license', async (req, res) => {
  try {
    const r = await validatePaca(req.params.license);
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/sync/run-now', async (req, res) => {
  // Admin-only: trigger manual sync
  const result = await runNightlySync();
  res.json(result);
});

router.post('/vet', async (req, res) => {
  try {
    const r = await vettingDecision(req.body);
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/cache/stats', async (req, res) => {
  const r = await pool.query(`
    SELECT COUNT(*) AS total,
           COUNT(*) FILTER (WHERE status='active' AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)) AS active,
           COUNT(*) FILTER (WHERE expiry_date < CURRENT_DATE) AS expired,
           MAX(last_synced_at) AS last_sync
      FROM paca_licenses_cache
  `);
  res.json(r.rows[0]);
});

module.exports = {
  router,
  validatePaca,
  vettingDecision,
  runNightlySync,
  startNightlyCron,
};
