// ============================================================
// AuditDNA — Zadarma CRM Sync Route
// Backend: C:\AuditDNA\backend\routes\zadarma-sync.js
// Purpose: After every email send, push campaign activity to
//          Zadarma Teamsale CRM per contact (upsert + note)
// Auth:    HMAC-SHA1 per Zadarma API spec
// ============================================================
const express  = require('express');
const router   = express.Router();
const crypto   = require('crypto');
const https    = require('https');
const { Pool } = require('pg');

const ZADARMA_KEY    = process.env.ZADARMA_API_KEY    || '';
const ZADARMA_SECRET = process.env.ZADARMA_API_SECRET || '';
const ZADARMA_BASE   = 'api.zadarma.com';

const pgPool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'auditdna',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'auditdna2026',
});

// ── Init campaign log table ───────────────────────────────────
(async () => {
  try {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS zadarma_campaign_log (
        id           SERIAL PRIMARY KEY,
        campaign_id  VARCHAR(64),
        subject      TEXT,
        recipient    VARCHAR(255),
        email        VARCHAR(255),
        zadarma_id   VARCHAR(128),
        status       VARCHAR(32) DEFAULT 'synced',
        sent_at      TIMESTAMP DEFAULT NOW(),
        synced_at    TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('[ZadarmаSync] PostgreSQL table ready');
  } catch (err) {
    console.error('[ZadarmaSync] Table init failed:', err.message);
  }
})();

// ── Zadarma HMAC-SHA1 Auth ────────────────────────────────────
// Spec: sign = base64(HMAC-SHA1(key, md5(params) + path + md5(params)))
function buildAuthHeader(path, params) {
  const paramStr  = Object.keys(params).sort()
    .map(k => `${k}=${params[k]}`).join('&');
  const md5Params = crypto.createHash('md5').update(paramStr).digest('hex');
  const signStr   = ZADARMA_KEY + path + md5Params + ZADARMA_KEY;
  const signature = crypto.createHmac('sha1', ZADARMA_SECRET)
    .update(signStr).digest('base64');
  return `${ZADARMA_KEY}:${signature}`;
}

// ── Generic Zadarma API request ───────────────────────────────
function zadarmаRequest(method, path, params = {}) {
  return new Promise((resolve, reject) => {
    if (!ZADARMA_KEY || !ZADARMA_SECRET) {
      return reject(new Error('ZADARMA_API_KEY / ZADARMA_API_SECRET not set in .env'));
    }
    const auth = buildAuthHeader(path, params);
    let url     = path;
    let body    = null;

    if (method === 'GET' && Object.keys(params).length) {
      url += '?' + Object.keys(params).map(k =>
        `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
    }
    if (method === 'POST') {
      body = JSON.stringify(params);
    }

    const options = {
      hostname: ZADARMA_BASE,
      path:     url,
      method,
      headers: {
        'Authorization': auth,
        'Accept':        'application/json',
        'Content-Type':  'application/json',
        ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
      },
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve({ raw: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ── Find or create contact in Zadarma CRM ────────────────────
async function upsertContact(recipient) {
  const { name, email, phone, company } = recipient;
  try {
    // Search by email first
    if (email) {
      const search = await zadarmаRequest('GET', '/v1/zcrm/contacts/', { email });
      if (search.status === 'success' && search.data?.contacts?.length) {
        return search.data.contacts[0].id;
      }
    }
    // Search by phone
    if (phone) {
      const search = await zadarmаRequest('GET', '/v1/zcrm/contacts/', { phone });
      if (search.status === 'success' && search.data?.contacts?.length) {
        return search.data.contacts[0].id;
      }
    }
    // Create new contact
    const nameParts = (name || '').trim().split(' ');
    const firstName = nameParts[0] || name || '';
    const lastName  = nameParts.slice(1).join(' ') || '';
    const createParams = {
      name:       firstName,
      last_name:  lastName,
      ...(email   ? { email }   : {}),
      ...(phone   ? { phone }   : {}),
      ...(company ? { company } : {}),
    };
    const created = await zadarmаRequest('POST', '/v1/zcrm/contacts/', createParams);
    if (created.status === 'success' && created.data?.id) {
      return created.data.id;
    }
    return null;
  } catch (err) {
    console.error(`[ZadarmaSync] upsertContact failed for ${email}:`, err.message);
    return null;
  }
}

// ── Add activity note to contact card ────────────────────────
async function addContactNote(contactId, note) {
  try {
    const result = await zadarmаRequest('POST', `/v1/zcrm/contacts/${contactId}/comments/`, {
      text: note,
    });
    return result.status === 'success';
  } catch (err) {
    console.error(`[ZadarmaSync] addNote failed for contact ${contactId}:`, err.message);
    return false;
  }
}

// ── Add task/follow-up to contact ────────────────────────────
async function addFollowUpTask(contactId, subject, dueDate) {
  try {
    const due = dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];
    const result = await zadarmаRequest('POST', `/v1/zcrm/tasks/`, {
      contact_id:  contactId,
      text:        `Follow up: ${subject}`,
      deadline:    due,
      type:        'email',
    });
    return result.status === 'success';
  } catch (err) {
    console.error(`[ZadarmaSync] addTask failed:`, err.message);
    return false;
  }
}

// ============================================================
// POST /api/zadarma-sync/campaign
// Called after every send from handleSend in ZadarmaCRM.jsx
// Body: { campaignId, subject, recipients, body, attachments, products, followUp }
// ============================================================
router.post('/campaign', async (req, res) => {
  const {
    campaignId,
    subject,
    recipients = [],   // [{ name, email, phone, company }]
    body       = '',
    attachments = [],
    products   = [],
    followUp   = null, // ISO date string for follow-up task
  } = req.body;

  if (!subject || !recipients.length) {
    return res.status(400).json({ error: 'Missing subject or recipients' });
  }

  const results  = [];
  const sentAt   = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
  const preview  = body.replace(/<[^>]*>/g, '').slice(0, 200).trim();
  const campId   = campaignId || 'CAMP-' + Date.now();

  // Build the note text logged to each contact's card
  const buildNote = (r) => {
    const lines = [
      `EMAIL CAMPAIGN SENT — ${sentAt} (PST)`,
      `Subject: ${subject}`,
      `From: Saul Garcia | Mexausa Food Group, Inc. <sales@mexausafg.com>`,
      preview ? `Preview: ${preview}...` : '',
      products.length  ? `Products: ${products.slice(0, 5).join(', ')}${products.length > 5 ? ` +${products.length - 5} more` : ''}` : '',
      attachments.length ? `Flyers: ${attachments.join(', ')}` : '',
      `Campaign ID: ${campId}`,
    ].filter(Boolean).join('\n');
    return lines;
  };

  // Process each recipient — non-blocking, fire and forget per contact
  const syncPromises = recipients.map(async (r) => {
    try {
      // 1. Upsert contact in Zadarma CRM
      const contactId = await upsertContact(r);
      const note      = buildNote(r);

      if (contactId) {
        // 2. Log campaign note to contact card
        await addContactNote(contactId, note);

        // 3. Optional follow-up task
        if (followUp) {
          await addFollowUpTask(contactId, subject, followUp);
        }
      }

      // 4. Save to local PostgreSQL log regardless
      await pgPool.query(`
        INSERT INTO zadarma_campaign_log
          (campaign_id, subject, recipient, email, zadarma_id, status)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [campId, subject, r.name || '', r.email || '', contactId || '', contactId ? 'synced' : 'no_crm_id']);

      results.push({ email: r.email, contactId, status: 'ok' });
    } catch (err) {
      console.error(`[ZadarmaSync] Failed for ${r.email}:`, err.message);
      results.push({ email: r.email, status: 'error', error: err.message });
    }
  });

  // Run all syncs in parallel (non-blocking for send speed)
  Promise.allSettled(syncPromises).then(() => {
    const synced = results.filter(r => r.status === 'ok').length;
    console.log(`[ZadarmaSync] Campaign "${subject}" — ${synced}/${recipients.length} contacts synced to Zadarma CRM`);
  });

  // Respond immediately — don't block the send
  res.json({
    success:    true,
    campaignId: campId,
    total:      recipients.length,
    message:    'Zadarma CRM sync initiated — contacts being logged in background',
  });
});

// ============================================================
// GET /api/zadarma-sync/log
// View campaign log from PostgreSQL
// ============================================================
router.get('/log', async (req, res) => {
  try {
    const { limit = 100, offset = 0, subject } = req.query;
    let query  = 'SELECT * FROM zadarma_campaign_log';
    const vals = [];
    if (subject) {
      query += ' WHERE subject ILIKE $1';
      vals.push(`%${subject}%`);
    }
    query += ` ORDER BY sent_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
    const result = await pgPool.query(query, vals);
    const count  = await pgPool.query('SELECT COUNT(*) FROM zadarma_campaign_log');
    res.json({
      total:   parseInt(count.rows[0].count),
      records: result.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/zadarma-sync/stats
// Campaign stats grouped by subject
// ============================================================
router.get('/stats', async (req, res) => {
  try {
    const result = await pgPool.query(`
      SELECT
        campaign_id,
        subject,
        COUNT(*)           AS total_recipients,
        SUM(CASE WHEN status='synced' THEN 1 ELSE 0 END) AS synced_to_crm,
        MIN(sent_at)       AS sent_at
      FROM zadarma_campaign_log
      GROUP BY campaign_id, subject
      ORDER BY sent_at DESC
      LIMIT 50
    `);
    res.json({ campaigns: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/zadarma-sync/contact/:email
// Look up a contact in Zadarma by email
// ============================================================
router.get('/contact/:email', async (req, res) => {
  try {
    const result = await zadarmаRequest('GET', '/v1/zcrm/contacts/', {
      email: req.params.email,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/zadarma-sync/balance
// Quick Zadarma account balance check
// ============================================================
router.get('/balance', async (req, res) => {
  try {
    const result = await zadarmаRequest('GET', '/v1/info/balance/', {});
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/zadarma-sync/webhook
// Zadarma calls this URL for call events — logs to PG
// Validate with ?zd_echo= for URL verification
// ============================================================
router.get('/webhook', (req, res) => {
  // Zadarma URL validation handshake
  if (req.query.zd_echo) return res.send(req.query.zd_echo);
  res.json({ status: 'ok' });
});

router.post('/webhook', async (req, res) => {
  const event = req.body;
  console.log('[ZadarmaSync] Webhook received:', JSON.stringify(event).slice(0, 200));
  try {
    // Log call events to PG for future call-email correlation
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS zadarma_call_log (
        id         SERIAL PRIMARY KEY,
        event      TEXT,
        caller_id  VARCHAR(64),
        called_did VARCHAR(64),
        call_id    VARCHAR(128),
        duration   INTEGER,
        status     VARCHAR(32),
        received_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pgPool.query(`
      INSERT INTO zadarma_call_log (event, caller_id, called_did, call_id, duration, status)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      event.event        || event.call_status || 'unknown',
      event.caller_id    || '',
      event.called_did   || event.pbx_number || '',
      event.call_id      || event.pbx_call_id || '',
      event.duration     || 0,
      event.disposition  || event.call_status || '',
    ]);
  } catch (err) {
    console.error('[ZadarmaSync] Webhook log failed:', err.message);
  }
  res.json({ status: 'ok' });
});

console.log('[ZadarmaSync] Route loaded — /campaign, /log, /stats, /contact, /balance, /webhook');
module.exports = router;