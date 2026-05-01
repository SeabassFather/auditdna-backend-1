// ============================================================================
// other-contacts.js
// Save to: C:\AuditDNA\backend\routes\other-contacts.js
// Mount in server.js: app.use('/api/other-contacts', require('./routes/other-contacts'));
// ----------------------------------------------------------------------------
// ITEM 15: Pull ~50K Other Contacts from Google People API.
// otherContacts = "auto-saved" addresses Saul has emailed/replied to but
// never explicitly saved. These are gold for cold-outreach to growers/buyers.
// ----------------------------------------------------------------------------
// Endpoints:
//   POST /api/other-contacts/sync          - run full pull, upsert into DB
//   GET  /api/other-contacts/count         - row count
//   GET  /api/other-contacts/list          - paginated list
//   GET  /api/other-contacts/search?q=     - email/name search
// ============================================================================

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { google } = require('googleapis');

// ----------------------------------------------------------------------------
// Schema bootstrap (idempotent, runs on first hit)
// ----------------------------------------------------------------------------
let schemaReady = false;
async function ensureSchema() {
  if (schemaReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS google_other_contacts (
      id              BIGSERIAL PRIMARY KEY,
      resource_name   VARCHAR(255) UNIQUE NOT NULL,
      email           VARCHAR(255),
      name            VARCHAR(255),
      first_name      VARCHAR(128),
      last_name       VARCHAR(128),
      phone           VARCHAR(64),
      organization    VARCHAR(255),
      title           VARCHAR(255),
      raw             JSONB,
      first_seen      TIMESTAMPTZ DEFAULT NOW(),
      last_synced     TIMESTAMPTZ DEFAULT NOW(),
      classified_role VARCHAR(64),
      classified_commodity VARCHAR(64),
      classified_country  VARCHAR(8),
      classified_state    VARCHAR(8),
      classified_score    NUMERIC(5,2)
    );
    CREATE INDEX IF NOT EXISTS idx_goc_email ON google_other_contacts(email);
    CREATE INDEX IF NOT EXISTS idx_goc_org   ON google_other_contacts(organization);
    CREATE INDEX IF NOT EXISTS idx_goc_role  ON google_other_contacts(classified_role);
  `);
  schemaReady = true;
}

// ----------------------------------------------------------------------------
// OAuth2 client - reuses the same creds as Gmail (same Google project)
// ----------------------------------------------------------------------------
function getOAuth2Client() {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'https://mexausafg.com/api/auth/google/callback'
  );
  oauth2.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    access_token: process.env.GOOGLE_ACCESS_TOKEN
  });
  return oauth2;
}

// ----------------------------------------------------------------------------
// POST /api/other-contacts/sync
// Pulls everything from people.googleapis.com/v1/otherContacts with
// 1000-per-page pagination. Upserts into google_other_contacts.
// ----------------------------------------------------------------------------
router.post('/sync', async (req, res) => {
  await ensureSchema();
  const auth = getOAuth2Client();
  const people = google.people({ version: 'v1', auth });

  let pageToken = undefined;
  let totalSeen = 0, totalUpserted = 0, totalSkipped = 0;
  const startedAt = Date.now();

  try {
    do {
      const r = await people.otherContacts.list({
        readMask: 'emailAddresses,names,phoneNumbers,organizations,metadata',
        pageSize: 1000,
        pageToken,
        sources: ['READ_SOURCE_TYPE_CONTACT', 'READ_SOURCE_TYPE_PROFILE']
      });
      const batch = r.data.otherContacts || [];
      pageToken = r.data.nextPageToken;
      totalSeen += batch.length;

      for (const c of batch) {
        const email = c.emailAddresses && c.emailAddresses[0] && c.emailAddresses[0].value;
        if (!email) { totalSkipped++; continue; }
        const nameObj = (c.names && c.names[0]) || {};
        const orgObj  = (c.organizations && c.organizations[0]) || {};
        const phone   = c.phoneNumbers && c.phoneNumbers[0] && c.phoneNumbers[0].value;

        await pool.query(`
          INSERT INTO google_other_contacts
            (resource_name, email, name, first_name, last_name, phone, organization, title, raw, last_synced)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, NOW())
          ON CONFLICT (resource_name) DO UPDATE SET
            email = EXCLUDED.email,
            name = EXCLUDED.name,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            phone = EXCLUDED.phone,
            organization = EXCLUDED.organization,
            title = EXCLUDED.title,
            raw = EXCLUDED.raw,
            last_synced = NOW()
        `, [
          c.resourceName,
          email,
          nameObj.displayName || null,
          nameObj.givenName || null,
          nameObj.familyName || null,
          phone || null,
          orgObj.name || null,
          orgObj.title || null,
          JSON.stringify(c)
        ]);
        totalUpserted++;
      }

      // Light backoff so we don't blow Google quota
      if (pageToken) await new Promise(r => setTimeout(r, 250));
    } while (pageToken);

    const elapsedMs = Date.now() - startedAt;
    res.json({
      ok: true,
      seen: totalSeen,
      upserted: totalUpserted,
      skipped_no_email: totalSkipped,
      elapsed_ms: elapsedMs,
      avg_ms_per_record: Math.round(elapsedMs / Math.max(1, totalUpserted))
    });
  } catch (e) {
    console.error('[other-contacts/sync]', e);
    res.status(500).json({
      ok: false,
      error: e.message,
      partial: { seen: totalSeen, upserted: totalUpserted, skipped: totalSkipped }
    });
  }
});

// ----------------------------------------------------------------------------
// GET /api/other-contacts/count
// ----------------------------------------------------------------------------
router.get('/count', async (req, res) => {
  await ensureSchema();
  const r = await pool.query(`
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE classified_role IS NOT NULL)::int AS classified,
      count(DISTINCT organization)::int AS unique_orgs,
      count(DISTINCT split_part(email, '@', 2))::int AS unique_domains,
      max(last_synced) AS last_sync
    FROM google_other_contacts
  `);
  res.json(r.rows[0]);
});

// ----------------------------------------------------------------------------
// GET /api/other-contacts/list?limit=100&offset=0&role=&commodity=
// ----------------------------------------------------------------------------
router.get('/list', async (req, res) => {
  await ensureSchema();
  const limit  = Math.min(parseInt(req.query.limit  || '100', 10), 1000);
  const offset = parseInt(req.query.offset || '0', 10);
  const role   = req.query.role || null;
  const comm   = req.query.commodity || null;

  const rows = await pool.query(`
    SELECT id, email, name, organization, title, phone,
           classified_role, classified_commodity, classified_country, classified_state,
           classified_score, last_synced
      FROM google_other_contacts
     WHERE ($1::text IS NULL OR classified_role = $1)
       AND ($2::text IS NULL OR classified_commodity = $2)
     ORDER BY last_synced DESC
     LIMIT $3 OFFSET $4
  `, [role, comm, limit, offset]);

  res.json({ rows: rows.rows, limit, offset });
});

// ----------------------------------------------------------------------------
// GET /api/other-contacts/search?q=avocado
// ----------------------------------------------------------------------------
router.get('/search', async (req, res) => {
  await ensureSchema();
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ rows: [] });
  const term = `%${q}%`;
  const r = await pool.query(`
    SELECT id, email, name, organization, title, phone,
           classified_role, classified_commodity, classified_country
      FROM google_other_contacts
     WHERE email ILIKE $1
        OR name ILIKE $1
        OR organization ILIKE $1
        OR title ILIKE $1
     ORDER BY last_synced DESC
     LIMIT 200
  `, [term]);
  res.json({ rows: r.rows, q });
});

// ----------------------------------------------------------------------------
// POST /api/other-contacts/classify
// Runs contact-classifier.js over unclassified rows in batches.
// Side-effect: writes classified_* columns.
// ----------------------------------------------------------------------------
router.post('/classify', async (req, res) => {
  await ensureSchema();
  const batch = parseInt(req.body && req.body.batch || '500', 10);
  let classifier;
  try {
    classifier = require('../services/contact-classifier');
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'contact-classifier not available' });
  }

  const rows = await pool.query(`
    SELECT id, email, name, organization, title
      FROM google_other_contacts
     WHERE classified_role IS NULL
     LIMIT $1
  `, [batch]);

  let updated = 0;
  for (const row of rows.rows) {
    const c = classifier.classify({
      email: row.email, name: row.name,
      organization: row.organization, title: row.title
    });
    await pool.query(`
      UPDATE google_other_contacts SET
        classified_role      = $1,
        classified_commodity = $2,
        classified_country   = $3,
        classified_state     = $4,
        classified_score     = $5
      WHERE id = $6
    `, [c.role, c.commodity, c.country, c.state, c.score, row.id]);
    updated++;
  }

  res.json({ ok: true, processed: rows.rows.length, updated });
});

module.exports = router;
