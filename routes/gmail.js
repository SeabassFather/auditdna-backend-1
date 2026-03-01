// ============================================================
// AuditDNA Gmail Integration Route - DUAL PERSISTENCE
// Backend: C:\AuditDNA\backend\routes\gmail.js
// Tokens: AES-256 encrypted file + PostgreSQL backup
// ============================================================
const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// OAuth2 Configuration
const CLIENT_ID = '694423905775-v24ckb7b7gr5qj8kh78m0svmisi3a4i9.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:5050/api/gmail/callback';

// Default sender alias
const DEFAULT_FROM = 'Saul Garcia <saul@mexausafg.com>';

// Encryption config
const ENCRYPTION_KEY = process.env.VAULT_KEY || process.env.SESSION_SECRET || 'auditdna_gmail_vault_2026';
const TOKEN_FILE = path.join(__dirname, '..', '.gmail-tokens.enc');
const PROFILE_FILE = path.join(__dirname, '..', '.gmail-profile.enc');

// PostgreSQL pool
const pgPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'auditdna',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'auditdna2026'
});

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Scopes
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/contacts.other.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

// ============================================================
// ENCRYPTION HELPERS
// ============================================================
function getEncryptionKey() {
  return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
}

function encrypt(data) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', getEncryptionKey(), iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedData) {
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encrypted = parts.join(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', getEncryptionKey(), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}

// ============================================================
// FILE PERSISTENCE
// ============================================================
function saveTokensToFile(tokens) {
  try {
    fs.writeFileSync(TOKEN_FILE, encrypt(tokens), 'utf8');
  } catch (err) {
    console.error('❌ File token save failed:', err.message);
  }
}

function loadTokensFromFile() {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      return decrypt(fs.readFileSync(TOKEN_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('❌ File token load failed:', err.message);
    try { fs.unlinkSync(TOKEN_FILE); } catch (e) {}
  }
  return null;
}

function saveProfileToFile(profile) {
  try {
    fs.writeFileSync(PROFILE_FILE, encrypt(profile), 'utf8');
  } catch (err) {
    console.error('❌ File profile save failed:', err.message);
  }
}

function loadProfileFromFile() {
  try {
    if (fs.existsSync(PROFILE_FILE)) {
      return decrypt(fs.readFileSync(PROFILE_FILE, 'utf8'));
    }
  } catch (err) {
    try { fs.unlinkSync(PROFILE_FILE); } catch (e) {}
  }
  return null;
}

function deleteFiles() {
  try { fs.unlinkSync(TOKEN_FILE); } catch (e) {}
  try { fs.unlinkSync(PROFILE_FILE); } catch (e) {}
}

// ============================================================
// POSTGRESQL PERSISTENCE
// ============================================================
async function initPgTable() {
  try {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS gmail_auth (
        id SERIAL PRIMARY KEY,
        account_key VARCHAR(255) UNIQUE NOT NULL DEFAULT 'primary',
        tokens_enc TEXT NOT NULL,
        profile_enc TEXT,
        email VARCHAR(255),
        send_as VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ [Gmail] PostgreSQL table initialized');
  } catch (err) {
    console.error('❌ [Gmail] PG table init failed:', err.message);
  }
}

async function saveTokensToPg(tokens, profile) {
  try {
    const tokensEnc = encrypt(tokens);
    const profileEnc = profile ? encrypt(profile) : null;
    const email = profile?.email || null;

    await pgPool.query(`
      INSERT INTO gmail_auth (account_key, tokens_enc, profile_enc, email, send_as, updated_at)
      VALUES ('primary', $1, $2, $3, $4, NOW())
      ON CONFLICT (account_key)
      DO UPDATE SET tokens_enc = $1, profile_enc = $2, email = $3, send_as = $4, updated_at = NOW()
    `, [tokensEnc, profileEnc, email, DEFAULT_FROM]);

    console.log('🐘 Gmail tokens saved to PostgreSQL');
  } catch (err) {
    console.error('❌ PG token save failed:', err.message);
  }
}

async function loadTokensFromPg() {
  try {
    const result = await pgPool.query(
      `SELECT tokens_enc, profile_enc, email FROM gmail_auth WHERE account_key = 'primary' LIMIT 1`
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      const tokens = decrypt(row.tokens_enc);
      const profile = row.profile_enc ? decrypt(row.profile_enc) : null;
      console.log(`🐘 Gmail tokens loaded from PostgreSQL (${row.email})`);
      return { tokens, profile };
    }
  } catch (err) {
    console.error('❌ PG token load failed:', err.message);
  }
  return null;
}

async function deleteFromPg() {
  try {
    await pgPool.query(`DELETE FROM gmail_auth WHERE account_key = 'primary'`);
    console.log('🐘 Gmail auth deleted from PostgreSQL');
  } catch (err) {
    console.error('❌ PG delete failed:', err.message);
  }
}

// ============================================================
// DUAL SAVE & LOAD
// ============================================================
async function saveAuth(tokens, profile) {
  // Save to file (instant)
  saveTokensToFile(tokens);
  if (profile) saveProfileToFile(profile);
  console.log('🔐 Gmail auth saved to file (encrypted)');

  // Save to PostgreSQL (backup)
  await saveTokensToPg(tokens, profile);
}

async function loadAuth() {
  // Try file first (fastest)
  let tokens = loadTokensFromFile();
  let profile = loadProfileFromFile();

  if (tokens) {
    console.log('🔐 Gmail tokens loaded from file');
    // Sync to PG if not there
    saveTokensToPg(tokens, profile).catch(() => {});
    return { tokens, profile };
  }

  // Fall back to PostgreSQL
  console.log('📂 No file tokens, checking PostgreSQL...');
  const pgData = await loadTokensFromPg();
  if (pgData) {
    // Restore file from PG
    saveTokensToFile(pgData.tokens);
    if (pgData.profile) saveProfileToFile(pgData.profile);
    console.log('🔄 Restored file tokens from PostgreSQL backup');
    return pgData;
  }

  return null;
}

async function deleteAuth() {
  deleteFiles();
  await deleteFromPg();
  console.log('🗑️ Gmail auth deleted from all storage');
}

// ============================================================
// STARTUP: Init table + load tokens
// ============================================================
let storedTokens = null;
let userProfile = null;

(async () => {
  await initPgTable();

  const auth = await loadAuth();
  if (auth) {
    storedTokens = auth.tokens;
    userProfile = auth.profile;
    oauth2Client.setCredentials(storedTokens);
    console.log(`✅ Gmail auto-connected: ${userProfile?.email || 'unknown'}`);
    console.log(`📧 Sending as: ${DEFAULT_FROM}`);
  }
})();

// Auto-refresh tokens
oauth2Client.on('tokens', async (tokens) => {
  if (tokens.refresh_token) {
    storedTokens = { ...storedTokens, ...tokens };
  } else {
    storedTokens = { ...storedTokens, access_token: tokens.access_token, expiry_date: tokens.expiry_date };
  }
  await saveAuth(storedTokens, userProfile);
  console.log('🔄 Gmail tokens auto-refreshed & saved (file + PG)');
});

// ============================================================
// GET /api/gmail/status
// ============================================================
router.get('/status', (req, res) => {
  res.json({
    connected: !!storedTokens,
    email: userProfile?.email || null,
    name: userProfile?.name || null,
    picture: userProfile?.picture || null,
    defaultFrom: DEFAULT_FROM,
    persistent: true,
    storage: 'file + postgresql',
    scopes: storedTokens ? SCOPES : []
  });
});

// ============================================================
// GET /api/gmail/auth
// ============================================================
router.get('/auth', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
  res.redirect(authUrl);
});

// ============================================================
// GET /api/gmail/callback
// ============================================================
router.get('/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.send(`
      <html><body style="background:#0f172a;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;">
        <div style="text-align:center;">
          <h1 style="color:#ef4444;">❌ Authorization Failed</h1>
          <p>${error}</p>
        </div>
      </body></html>
    `);
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    storedTokens = tokens;

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();
    userProfile = data;

    // Dual save: file + PostgreSQL
    await saveAuth(tokens, data);

    console.log(`✅ Gmail connected: ${data.email}`);
    console.log(`📧 Sending as: ${DEFAULT_FROM}`);
    console.log(`🔐 Auth persisted: file + PostgreSQL`);

    res.send(`
      <html><body style="background:#0f172a;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;">
        <div style="text-align:center;">
          <h1 style="color:#cba658;">✅ Gmail Connected!</h1>
          <p>Signed in as: <strong>${data.email}</strong></p>
          <p style="color:#94a3b0;">Sending as: <strong>${DEFAULT_FROM}</strong></p>
          <p style="color:#86efac;">🔐 Auth saved — file + PostgreSQL</p>
          <p style="color:#94a3b0;">You can close this window and return to AuditDNA.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GMAIL_CONNECTED', email: '${data.email}' }, '*');
              setTimeout(() => window.close(), 2000);
            }
          </script>
        </div>
      </body></html>
    `);
  } catch (err) {
    console.error('Gmail OAuth Error:', err.message);
    res.status(500).send(`
      <html><body style="background:#0f172a;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;">
        <div style="text-align:center;">
          <h1 style="color:#ef4444;">❌ Token Exchange Failed</h1>
          <p>${err.message}</p>
        </div>
      </body></html>
    `);
  }
});

// ============================================================
// POST /api/gmail/send
// ============================================================
router.post('/send', async (req, res) => {
  if (!storedTokens) {
    return res.status(401).json({ error: 'Gmail not connected. Visit /api/gmail/auth first.' });
  }

  try {
    oauth2Client.setCredentials(storedTokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const { to, subject, body, cc, bcc, from } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, body' });
    }

    const sender = from || DEFAULT_FROM;

    const headers = [
      `From: ${sender}`,
      `To: ${to}`,
      cc ? `Cc: ${cc}` : '',
      bcc ? `Bcc: ${bcc}` : '',
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      body
    ].filter(Boolean).join('\r\n');

    const encodedMessage = Buffer.from(headers)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage }
    });

    console.log(`📧 Email sent from ${sender} to ${to} (ID: ${result.data.id})`);
    res.json({ success: true, messageId: result.data.id, from: sender });
  } catch (err) {
    console.error('Gmail Send Error:', err.message);
    if (err.message.includes('invalid_grant') || err.message.includes('Token has been expired')) {
      storedTokens = null;
      userProfile = null;
      await deleteAuth();
      return res.status(401).json({ error: 'Token expired. Re-authenticate at /api/gmail/auth' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/gmail/send-bulk
// ============================================================
router.post('/send-bulk', async (req, res) => {
  if (!storedTokens) {
    return res.status(401).json({ error: 'Gmail not connected.' });
  }

  try {
    oauth2Client.setCredentials(storedTokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const { recipients, subject, body, from, delayMs = 1000 } = req.body;

    if (!recipients || !Array.isArray(recipients) || !subject || !body) {
      return res.status(400).json({ error: 'Missing: recipients (array), subject, body' });
    }

    const sender = from || DEFAULT_FROM;
    const results = [];

    for (const recipient of recipients) {
      try {
        const email = typeof recipient === 'string' ? recipient : recipient.email;
        const personalizedBody = body
          .replace(/\{\{name\}\}/g, recipient.name || '')
          .replace(/\{\{company\}\}/g, recipient.company || '')
          .replace(/\{\{email\}\}/g, email);

        const headers = [
          `From: ${sender}`,
          `To: ${email}`,
          `Subject: ${subject}`,
          'MIME-Version: 1.0',
          'Content-Type: text/html; charset=utf-8',
          '',
          personalizedBody
        ].join('\r\n');

        const encodedMessage = Buffer.from(headers)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        const result = await gmail.users.messages.send({
          userId: 'me',
          requestBody: { raw: encodedMessage }
        });

        results.push({ email, success: true, messageId: result.data.id });
        console.log(`📧 Bulk: Sent from ${sender} to ${email}`);

        if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
      } catch (err) {
        results.push({ email: recipient.email || recipient, success: false, error: err.message });
        console.error(`❌ Bulk: Failed ${recipient.email || recipient}: ${err.message}`);
      }
    }

    res.json({
      success: true,
      from: sender,
      total: recipients.length,
      sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/gmail/messages
// ============================================================
router.get('/messages', async (req, res) => {
  if (!storedTokens) {
    return res.status(401).json({ error: 'Gmail not connected.' });
  }

  try {
    oauth2Client.setCredentials(storedTokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const { maxResults = 20, q = '', labelIds } = req.query;
    const params = { userId: 'me', maxResults: parseInt(maxResults) };
    if (q) params.q = q;
    if (labelIds) params.labelIds = labelIds.split(',');

    const list = await gmail.users.messages.list(params);

    if (!list.data.messages || list.data.messages.length === 0) {
      return res.json({ messages: [], total: 0 });
    }

    const messages = await Promise.all(
      list.data.messages.map(async (msg) => {
        const full = await gmail.users.messages.get({
          userId: 'me', id: msg.id, format: 'metadata',
          metadataHeaders: ['From', 'To', 'Subject', 'Date']
        });
        const headers = {};
        full.data.payload.headers.forEach(h => { headers[h.name.toLowerCase()] = h.value; });
        return {
          id: msg.id, threadId: msg.threadId, from: headers.from || '',
          to: headers.to || '', subject: headers.subject || '(no subject)',
          date: headers.date || '', snippet: full.data.snippet, labelIds: full.data.labelIds
        };
      })
    );

    res.json({ messages, total: list.data.resultSizeEstimate });
  } catch (err) {
    console.error('Gmail List Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/gmail/contacts — FULL SYNC (ALL PAGES)
// ============================================================
let cachedContacts = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 min

router.get('/contacts', async (req, res) => {
  if (!storedTokens) {
    return res.status(401).json({ error: 'Gmail not connected.' });
  }

  try {
    oauth2Client.setCredentials(storedTokens);
    const people = google.people({ version: 'v1', auth: oauth2Client });

    // Return cache unless force refresh
    const forceRefresh = req.query.force === 'true' || req.query.refresh === 'true';
    if (!forceRefresh && cachedContacts && (Date.now() - cacheTimestamp < CACHE_TTL)) {
      console.log(`[Gmail] Returning ${cachedContacts.length} cached contacts`);
      return res.json({ contacts: cachedContacts, total: cachedContacts.length, cached: true });
    }

    const allContacts = [];
    let nextPageToken = null;
    let page = 0;

    // ── LOOP 1: Saved contacts (connections) ──
    console.log('[Gmail] Fetching ALL connections...');
    do {
      page++;
      const response = await people.people.connections.list({
        resourceName: 'people/me',
        pageSize: 1000,
        pageToken: nextPageToken || undefined,
        personFields: 'names,emailAddresses,phoneNumbers,organizations,photos',
        sortOrder: 'LAST_NAME_ASCENDING',
      });

      const connections = response.data.connections || [];
      console.log(`  Page ${page}: ${connections.length} connections`);

      for (const person of connections) {
        const emails = person.emailAddresses || [];
        if (emails.length === 0) continue;

        allContacts.push({
          resourceName: person.resourceName,
          name: person.names?.[0]?.displayName || '',
          email: emails[0]?.value || '',
          allEmails: emails.map(e => e.value),
          phone: person.phoneNumbers?.[0]?.value || '',
          company: person.organizations?.[0]?.name || '',
          title: person.organizations?.[0]?.title || '',
          photo: person.photos?.[0]?.url || '',
          source: 'contacts',
        });
      }

      nextPageToken = response.data.nextPageToken || null;
    } while (nextPageToken);

    console.log(`[Gmail] Saved contacts: ${allContacts.length}`);

    // ── LOOP 2: Other contacts (people you've emailed) ──
    let otherCount = 0;
    try {
      nextPageToken = null;
      page = 0;
      console.log('[Gmail] Fetching otherContacts...');

      do {
        page++;
        const response = await people.otherContacts.list({
          pageSize: 1000,
          pageToken: nextPageToken || undefined,
          readMask: 'names,emailAddresses,phoneNumbers',
        });

        const others = response.data.otherContacts || [];
        console.log(`  Other page ${page}: ${others.length}`);

        for (const person of others) {
          const emails = person.emailAddresses || [];
          if (emails.length === 0) continue;

          const email = emails[0]?.value?.toLowerCase();
          if (allContacts.find(c => c.email.toLowerCase() === email)) continue;

          allContacts.push({
            resourceName: person.resourceName || '',
            name: person.names?.[0]?.displayName || email.split('@')[0] || '',
            email: emails[0]?.value || '',
            phone: person.phoneNumbers?.[0]?.value || '',
            company: person.organizations?.[0]?.name || '',
            title: '',
            photo: '',
            source: 'other',
          });
          otherCount++;
        }

        nextPageToken = response.data.nextPageToken || null;
      } while (nextPageToken);

      console.log(`[Gmail] Other contacts added: ${otherCount}`);
    } catch (otherErr) {
      console.warn('[Gmail] otherContacts not available:', otherErr.message);
    }

    // Sort and cache
    allContacts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    cachedContacts = allContacts;
    cacheTimestamp = Date.now();

    console.log(`\n========================================`);
    console.log(`  GMAIL CONTACTS SYNCED: ${allContacts.length}`);
    console.log(`  Saved: ${allContacts.filter(c => c.source === 'contacts').length}`);
    console.log(`  Other: ${otherCount}`);
    console.log(`========================================\n`);

    res.json({
      contacts: allContacts,
      total: allContacts.length,
      cached: false,
      breakdown: {
        saved: allContacts.filter(c => c.source === 'contacts').length,
        other: otherCount,
      }
    });
  } catch (err) {
    console.error('Contacts Error:', err.message);
    if (err.message.includes('invalid_grant') || err.message.includes('Token has been expired')) {
      storedTokens = null;
      userProfile = null;
      await deleteAuth();
      return res.status(401).json({ error: 'Token expired. Re-authenticate at /api/gmail/auth' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Force cache clear
router.post('/contacts/refresh', (req, res) => {
  cachedContacts = null;
  cacheTimestamp = 0;
  res.json({ message: 'Contact cache cleared.' });
});

// ============================================================
// GET /api/gmail/labels
// ============================================================
router.get('/labels', async (req, res) => {
  if (!storedTokens) {
    return res.status(401).json({ error: 'Gmail not connected.' });
  }

  try {
    oauth2Client.setCredentials(storedTokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const response = await gmail.users.labels.list({ userId: 'me' });
    res.json({ labels: response.data.labels });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/gmail/disconnect
// ============================================================
router.post('/disconnect', async (req, res) => {
  storedTokens = null;
  userProfile = null;
  await deleteAuth();
  console.log('🔌 Gmail disconnected — all storage cleared');
  res.json({ success: true, message: 'Gmail disconnected' });
});

module.exports = router;