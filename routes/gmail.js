// ============================================================
// AuditDNA Gmail Integration Route - DUAL PERSISTENCE
// Backend: C:\AuditDNA\backend\routes\gmail.js
// Tokens: AES-256 encrypted file + PostgreSQL backup
// Sends: nodemailer SMTP from saul@mexausafg.com (NO Gmail alias issues)
// Contacts/Read: Gmail OAuth API
// ============================================================
const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// ============================================================
// SMTP CONFIG ΓÇö sends from saul@mexausafg.com directly
// Set these in C:\AuditDNA\backend\.env
// ============================================================
const SMTP_HOST     = process.env.SMTP_HOST     || 'smtp.mexausafg.com';
const SMTP_PORT     = parseInt(process.env.SMTP_PORT || '587');
const SMTP_SECURE   = process.env.SMTP_SECURE === 'true'; // false for port 587 STARTTLS, true for 465 SSL
const SMTP_USER     = process.env.SMTP_USER     || 'Saul@mexausafg.com';
const SMTP_PASS     = process.env.SMTP_PASS     || '';
const FROM_NAME     = process.env.FROM_NAME     || process.env.SMTP_FROM_NAME || 'Saul Garcia | Mexausa Food Group, Inc.';
const FROM_ADDRESS  = process.env.FROM_ADDRESS  || process.env.SMTP_FROM     || 'Saul@mexausafg.com';
const FROM_HEADER   = `${FROM_NAME} <${FROM_ADDRESS}>`;

// Build nodemailer transporter ΓÇö reused for all sends
function createTransport() {
  return nodemailer.createTransport({
    host:   SMTP_HOST,
    port:   SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false, // handles self-signed certs on some hosts
    },
  });
}

// Verify SMTP on startup
(async () => {
  if (!SMTP_PASS) {
    console.warn('[SMTP] WARNING: SMTP_PASS not set in .env ΓÇö email sending will fail');
    return;
  }
  try {
    const t = createTransport();
    await t.verify();
    console.log(`[SMTP] Connected ΓÇö sending as ${FROM_HEADER}`);
  } catch (err) {
    console.error(`[SMTP] Connection failed: ${err.message}`);
    console.error(`[SMTP] Check SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS in .env`);
  }
})();

// ============================================================
// OAUTH2 ΓÇö used ONLY for contacts, labels, reading messages
// ============================================================
const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID || '694423905775-v24ckb7b7gr5qj8kh78m0svmisi3a4i9.apps.googleusercontent.com';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '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';
const REDIRECT_URI  = process.env.GMAIL_REDIRECT_URI || 'https://auditdna-backend-1-production.up.railway.app/api/gmail/callback';

const ENCRYPTION_KEY = process.env.VAULT_KEY || process.env.SESSION_SECRET || 'auditdna_gmail_vault_2026';
const TOKEN_FILE     = path.join(__dirname, '..', '.gmail-tokens.enc');
const PROFILE_FILE   = path.join(__dirname, '..', '.gmail-profile.enc');

const pgPool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'auditdna',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'auditdna2026',
});

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/contacts.other.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  // NOTE: gmail.send scope removed ΓÇö we send via SMTP, not Gmail API
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
  try { fs.writeFileSync(TOKEN_FILE, encrypt(tokens), 'utf8'); } catch (err) { console.error('File token save failed:', err.message); }
}
function loadTokensFromFile() {
  try { if (fs.existsSync(TOKEN_FILE)) return decrypt(fs.readFileSync(TOKEN_FILE, 'utf8')); } catch (err) { try { fs.unlinkSync(TOKEN_FILE); } catch (e) {} }
  return null;
}
function saveProfileToFile(profile) {
  try { fs.writeFileSync(PROFILE_FILE, encrypt(profile), 'utf8'); } catch (err) {}
}
function loadProfileFromFile() {
  try { if (fs.existsSync(PROFILE_FILE)) return decrypt(fs.readFileSync(PROFILE_FILE, 'utf8')); } catch (err) { try { fs.unlinkSync(PROFILE_FILE); } catch (e) {} }
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
    console.log('[Gmail] PostgreSQL table ready');
  } catch (err) {
    console.error('[Gmail] PG table init failed:', err.message);
  }
}
async function saveTokensToPg(tokens, profile) {
  try {
    const tokensEnc  = encrypt(tokens);
    const profileEnc = profile ? encrypt(profile) : null;
    const email      = profile?.email || null;
    await pgPool.query(`
      INSERT INTO gmail_auth (account_key, tokens_enc, profile_enc, email, send_as, updated_at)
      VALUES ('primary', $1, $2, $3, $4, NOW())
      ON CONFLICT (account_key)
      DO UPDATE SET tokens_enc=$1, profile_enc=$2, email=$3, send_as=$4, updated_at=NOW()
    `, [tokensEnc, profileEnc, email, FROM_ADDRESS]);
  } catch (err) { console.error('PG token save failed:', err.message); }
}
async function loadTokensFromPg() {
  try {
    const result = await pgPool.query(`SELECT tokens_enc, profile_enc, email FROM gmail_auth WHERE account_key='primary' LIMIT 1`);
    if (result.rows.length > 0) {
      const row = result.rows[0];
      return { tokens: decrypt(row.tokens_enc), profile: row.profile_enc ? decrypt(row.profile_enc) : null };
    }
  } catch (err) { console.error('PG token load failed:', err.message); }
  return null;
}
async function deleteFromPg() {
  try { await pgPool.query(`DELETE FROM gmail_auth WHERE account_key='primary'`); } catch (err) {}
}
async function saveAuth(tokens, profile) {
  saveTokensToFile(tokens);
  if (profile) saveProfileToFile(profile);
  await saveTokensToPg(tokens, profile);
}
async function loadAuth() {
  let tokens  = loadTokensFromFile();
  let profile = loadProfileFromFile();
  if (tokens) {
    saveTokensToPg(tokens, profile).catch(() => {});
    return { tokens, profile };
  }
  const pgData = await loadTokensFromPg();
  if (pgData) {
    saveTokensToFile(pgData.tokens);
    if (pgData.profile) saveProfileToFile(pgData.profile);
    return pgData;
  }
  return null;
}
async function deleteAuth() {
  deleteFiles();
  await deleteFromPg();
}

// ============================================================
// STARTUP: init PG + load OAuth tokens for contacts
// ============================================================
let storedTokens = null;
let userProfile  = null;

(async () => {
  await initPgTable();
  const auth = await loadAuth();
  if (auth) {
    storedTokens = auth.tokens;
    userProfile  = auth.profile;
    oauth2Client.setCredentials(storedTokens);
    console.log(`[Gmail] OAuth connected for contacts: ${userProfile?.email || 'unknown'}`);
    console.log(`[Gmail] All emails send FROM: ${FROM_HEADER}`);
  }
})();

oauth2Client.on('tokens', async (tokens) => {
  storedTokens = tokens.refresh_token
    ? { ...storedTokens, ...tokens }
    : { ...storedTokens, access_token: tokens.access_token, expiry_date: tokens.expiry_date };
  await saveAuth(storedTokens, userProfile);
  console.log('[Gmail] OAuth tokens auto-refreshed');
});

// ============================================================
// PROACTIVE TOKEN REFRESH
// ============================================================
async function ensureFreshTokens() {
  if (!storedTokens) return false;
  if (!storedTokens.refresh_token) return false;
  const now       = Date.now();
  const expiryDate = storedTokens.expiry_date || 0;
  if (expiryDate && (expiryDate - now) > 5 * 60 * 1000) return true;
  try {
    oauth2Client.setCredentials({ refresh_token: storedTokens.refresh_token });
    const { credentials } = await oauth2Client.refreshAccessToken();
    storedTokens = { ...storedTokens, access_token: credentials.access_token, expiry_date: credentials.expiry_date, token_type: credentials.token_type };
    if (credentials.refresh_token) storedTokens.refresh_token = credentials.refresh_token;
    oauth2Client.setCredentials(storedTokens);
    await saveAuth(storedTokens, userProfile);
    return true;
  } catch (err) {
    console.error('[Gmail] Token refresh failed:', err.message);
    if (err.message.includes('invalid_grant') || err.message.includes('Token has been revoked')) {
      storedTokens = null; userProfile = null;
      await deleteAuth();
    }
    return false;
  }
}
setInterval(async () => { if (storedTokens) await ensureFreshTokens(); }, 45 * 60 * 1000);

// ============================================================
// GET /api/gmail/status
// ============================================================
router.get('/status', async (req, res) => {
  if (storedTokens) await ensureFreshTokens();
  const expiryDate  = storedTokens?.expiry_date ? new Date(storedTokens.expiry_date) : null;
  const minutesLeft = expiryDate ? Math.round((expiryDate - Date.now()) / 60000) : null;
  res.json({
    connected:       !!storedTokens,
    email:           userProfile?.email || null,
    name:            userProfile?.name  || null,
    picture:         userProfile?.picture || null,
    sendingFrom:     FROM_HEADER,                   // always saul@mexausafg.com
    smtpReady:       !!SMTP_PASS,
    persistent:      true,
    storage:         'file + postgresql',
    hasRefreshToken: !!storedTokens?.refresh_token,
    tokenExpiresAt:  expiryDate?.toISOString() || null,
    tokenMinutesLeft: minutesLeft,
    autoRefresh:     true,
  });
});

// ============================================================
// POST /api/gmail/refresh
// ============================================================
router.post('/refresh', async (req, res) => {
  if (!storedTokens?.refresh_token) return res.status(401).json({ error: 'No refresh token' });
  const ok = await ensureFreshTokens();
  ok
    ? res.json({ success: true, expiresAt: new Date(storedTokens.expiry_date).toISOString() })
    : res.status(401).json({ error: 'Refresh failed ΓÇö re-authenticate at /api/gmail/auth' });
});

// ============================================================
// GET /api/gmail/auth  (contacts OAuth only)
// ============================================================
router.get('/auth', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES, prompt: 'consent' });
  res.redirect(authUrl);
});

// ============================================================
// GET /api/gmail/callback
// ============================================================
router.get('/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error) return res.send(`<html><body style="background:#0f172a;color:#ef4444;font-family:sans-serif;padding:40px"><h1>Auth Failed</h1><p>${error}</p></body></html>`);
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    storedTokens = tokens;
    const oauth2     = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data }   = await oauth2.userinfo.get();
    userProfile      = data;
    await saveAuth(tokens, data);
    console.log(`[Gmail] OAuth connected: ${data.email}`);

    // AUTO-SYNC ALL CONTACTS IMMEDIATELY ΓÇö no extra steps needed
    res.send(`
      <html><body style="background:#0f172a;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
        <div style="text-align:center;max-width:500px;">
          <h1 style="color:#cba658;margin-bottom:8px;">Gmail Connected!</h1>
          <p style="color:#94a3b0;">Syncing all contacts from <strong style="color:#fff;">${data.email}</strong>...</p>
          <div id="status" style="color:#86efac;font-size:18px;margin:20px 0;">Loading contacts...</div>
          <div id="count" style="color:#cba658;font-size:36px;font-weight:bold;">0</div>
          <p id="msg" style="color:#94a3b0;font-size:13px;"></p>
          <script>
            fetch('/api/gmail/contacts?force=true')
              .then(r=>r.json())
              .then(d=>{
                document.getElementById('status').textContent = 'Contacts Synced!';
                document.getElementById('count').textContent = (d.total||0).toLocaleString() + ' contacts';
                document.getElementById('msg').textContent = 'You can close this window.';
                if(window.opener){ window.opener.postMessage({type:'GMAIL_CONNECTED',email:'${data.email}',total:d.total},'*'); }
                setTimeout(()=>{ try{window.close();}catch(e){} }, 3000);
              })
              .catch(e=>{
                document.getElementById('status').textContent = 'Sync failed ΓÇö try again';
                document.getElementById('msg').textContent = e.message;
              });
          </script>
        </div>
      </body></html>
    `);
  } catch (err) {
    res.status(500).send(`<html><body style="background:#0f172a;color:#ef4444;font-family:sans-serif;padding:40px"><h1>Token Exchange Failed</h1><p>${err.message}</p></body></html>`);
  }
});

// ============================================================
// SMTP SEND HELPER ΓÇö builds and sends via nodemailer
// Supports: to, cc, bcc, subject, html body, attachments
// ============================================================
// ============================================================
// GMAIL API SEND (OAuth) — bypasses SMTP, works on Railway
// Uses the same oauth2Client + storedTokens already used for /messages
// ============================================================
async function gmailApiSend({ to, cc, bcc, subject, html, text, attachments = [] }) {
  const tokenOk = await ensureFreshTokens();
  if (!tokenOk || !storedTokens) {
    throw new Error('Gmail OAuth not authenticated — visit /api/gmail/auth');
  }
  oauth2Client.setCredentials(storedTokens);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const boundary = '__BOUND_' + Date.now();
  const headers = [
    `From: ${FROM_HEADER}`,
    `To: ${Array.isArray(to) ? to.join(', ') : to}`,
    cc ? `Cc: ${cc}` : null,
    bcc ? `Bcc: ${bcc}` : null,
    `Subject: =?UTF-8?B?${Buffer.from(subject || '').toString('base64')}?=`,
    'MIME-Version: 1.0',
    attachments.length
      ? `Content-Type: multipart/mixed; boundary="${boundary}"`
      : 'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit'
  ].filter(Boolean).join('\r\n');

  let body;
  if (attachments.length) {
    const parts = [];
    parts.push(`--${boundary}`);
    parts.push('Content-Type: text/html; charset=UTF-8');
    parts.push('Content-Transfer-Encoding: 7bit');
    parts.push('');
    parts.push(html || text || '');
    for (const a of attachments) {
      const fname = a.name || a.filename || 'attachment';
      const mime = a.mimeType || a.contentType || 'application/octet-stream';
      const data = a.content || a.data || a.b64 || '';
      parts.push(`--${boundary}`);
      parts.push(`Content-Type: ${mime}; name="${fname}"`);
      parts.push('Content-Transfer-Encoding: base64');
      parts.push(`Content-Disposition: attachment; filename="${fname}"`);
      parts.push('');
      parts.push(data);
    }
    parts.push(`--${boundary}--`);
    body = parts.join('\r\n');
  } else {
    body = html || text || '';
  }

  const raw = Buffer.from(headers + '\r\n\r\n' + body)
    .toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const result = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw }
  });

  return { messageId: result.data.id, threadId: result.data.threadId };
}

async function smtpSend({ to, cc, bcc, subject, html, text, attachments = [] }) {
  const transport = createTransport();

  // Build attachments array for nodemailer
  const mailAttachments = attachments.map(a => ({
    filename:    a.name || a.filename,
    content:     Buffer.from(a.content || a.data || a.b64 || '', 'base64'),
    contentType: a.mimeType || a.contentType || 'application/octet-stream',
  }));

  const info = await transport.sendMail({
    from:        FROM_HEADER,   // always saul@mexausafg.com
    to,
    cc:          cc  || undefined,
    bcc:         bcc || undefined,
    subject,
    html:        html || text || '',
    text:        text || undefined,
    attachments: mailAttachments,
  });

  return info;
}

// ============================================================
// POST /api/gmail/send  (single)
// ============================================================
router.post('/send', async (req, res) => {
  try {
    const { to, subject, body, html, cc, bcc, attachments } = req.body;

    if (!to || !subject || (!body && !html)) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, body/html' });
    }
    if (!SMTP_PASS) {
      return res.status(500).json({ error: 'SMTP_PASS not configured in .env ΓÇö see setup instructions' });
    }

    let info;
    try {
      info = await gmailApiSend({
        to, cc, bcc, subject,
        html:        html || body,
        text:        body,
        attachments: attachments || [],
      });
      console.log(`[GMAIL-API] Sent: ${FROM_ADDRESS} -> ${to} | MsgID: ${info.messageId}`);
    } catch (apiErr) {
      console.warn('[GMAIL-API] failed, falling back to SMTP:', apiErr.message);
      info = await smtpSend({
        to, cc, bcc, subject,
        html:        html || body,
        text:        body,
        attachments: attachments || [],
      });
      console.log(`[SMTP] Sent: ${FROM_ADDRESS} -> ${to} | MsgID: ${info.messageId}`);
    }
    res.json({ success: true, messageId: info.messageId, from: FROM_ADDRESS });

  } catch (err) {
    console.error('[SMTP] Send error:', err.message);
    res.status(500).json({ error: err.message, hint: 'Check SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS in .env' });
  }
});

// ============================================================
// POST /api/gmail/send-bulk
// ============================================================
router.post('/send-bulk', async (req, res) => {
  try {
    const { recipients, subject, body, html, cc, bcc, attachments = [], delayMs = 1200 } = req.body;

    if (!recipients || !Array.isArray(recipients) || !subject || (!body && !html)) {
      return res.status(400).json({ error: 'Missing: recipients (array), subject, body/html' });
    }

    const results = [];

    for (const recipient of recipients) {
      const email = typeof recipient === 'string' ? recipient : recipient.email;
      const name  = recipient.name || '';

      try {
        const personalizedHtml = (html || body || '')
          .replace(/\{\{name\}\}/g,    name)
          .replace(/\{\{company\}\}/g, recipient.company || '')
          .replace(/\{\{email\}\}/g,   email);

        const personalizedText = (body || '')
          .replace(/\{\{name\}\}/g,    name)
          .replace(/\{\{company\}\}/g, recipient.company || '')
          .replace(/\{\{email\}\}/g,   email);

        const sendArgs = {
          to:          name ? `${name} <${email}>` : email,
          cc, bcc, subject,
          html:        personalizedHtml,
          text:        personalizedText,
          attachments,
        };

        let info;
        try {
          info = await gmailApiSend(sendArgs);
          console.log(`[GMAIL-API] Bulk sent -> ${email} | MsgID: ${info.messageId}`);
        } catch (apiErr) {
          console.warn(`[GMAIL-API] Bulk failed for ${email}, falling back to SMTP: ${apiErr.message}`);
          if (!SMTP_PASS) throw new Error(`Gmail API failed and SMTP fallback unavailable: ${apiErr.message}`);
          info = await smtpSend(sendArgs);
          console.log(`[SMTP] Bulk sent (fallback) -> ${email} | MsgID: ${info.messageId}`);
        }

        results.push({ email, success: true, messageId: info.messageId });
        if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));

      } catch (err) {
        results.push({ email, success: false, error: err.message });
        console.error(`[BULK] failed -> ${email}: ${err.message}`);
      }
    }

    const sent   = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    console.log(`[BULK] complete: ${sent} sent, ${failed} failed, FROM: ${FROM_ADDRESS}`);

    res.json({ success: true, from: FROM_ADDRESS, total: recipients.length, sent, failed, results });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/gmail/messages  (OAuth read ΓÇö unchanged)
// ============================================================
router.get('/messages', async (req, res) => {
  const tokenOk = await ensureFreshTokens();
  if (!tokenOk || !storedTokens) return res.status(401).json({ error: 'Authentication required', authUrl: '/api/gmail/auth' });
  try {
    oauth2Client.setCredentials(storedTokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const { maxResults = 20, q = '', labelIds } = req.query;
    const params = { userId: 'me', maxResults: parseInt(maxResults) };
    if (q) params.q = q;
    if (labelIds) params.labelIds = labelIds.split(',');
    const list = await gmail.users.messages.list(params);
    if (!list.data.messages?.length) return res.json({ messages: [], total: 0 });
    const messages = await Promise.all(list.data.messages.map(async (msg) => {
      const full    = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'metadata', metadataHeaders: ['From', 'To', 'Subject', 'Date'] });
      const headers = {};
      full.data.payload.headers.forEach(h => { headers[h.name.toLowerCase()] = h.value; });
      return { id: msg.id, threadId: msg.threadId, from: headers.from || '', to: headers.to || '', subject: headers.subject || '(no subject)', date: headers.date || '', snippet: full.data.snippet, labelIds: full.data.labelIds };
    }));
    res.json({ messages, total: list.data.resultSizeEstimate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/gmail/contacts  (OAuth ΓÇö full sync, unchanged)
// ============================================================
let cachedContacts  = null;
let cacheTimestamp  = 0;
const CACHE_TTL     = 5 * 60 * 1000;

router.get('/contacts', async (req, res) => {
  const tokenOk = await ensureFreshTokens();
  if (!tokenOk || !storedTokens) {
    // Return cached contacts if available ΓÇö no auth dance needed
    if (cachedContacts && cachedContacts.length > 0) {
      return res.json({ contacts: cachedContacts, total: cachedContacts.length, cached: true, warning: 'Using cached contacts ΓÇö Gmail re-auth needed to refresh' });
    }
    // Load from PostgreSQL as fallback
    try {
      const pgResult = await pgPool.query(`SELECT contact_data FROM gmail_contacts_cache ORDER BY synced_at DESC LIMIT 1`);
      if (pgResult.rows.length > 0) {
        const contacts = pgResult.rows[0].contact_data;
        cachedContacts = contacts;
        cacheTimestamp = Date.now();
        return res.json({ contacts, total: contacts.length, cached: true, source: 'postgresql' });
      }
    } catch (e) {}
    return res.status(401).json({ error: 'Authentication required', authUrl: '/api/gmail/auth' });
  }
  try {
    oauth2Client.setCredentials(storedTokens);
    const people      = google.people({ version: 'v1', auth: oauth2Client });
    const forceRefresh = req.query.force === 'true' || req.query.refresh === 'true';
    if (!forceRefresh && cachedContacts && (Date.now() - cacheTimestamp < CACHE_TTL)) {
      return res.json({ contacts: cachedContacts, total: cachedContacts.length, cached: true });
    }
    const allContacts = [];
    let nextPageToken  = null;
    let page           = 0;
    console.log('[Gmail] Fetching ALL connections...');
    do {
      page++;
      const response    = await people.people.connections.list({ resourceName: 'people/me', pageSize: 1000, pageToken: nextPageToken || undefined, personFields: 'names,emailAddresses,phoneNumbers,organizations,photos', sortOrder: 'LAST_NAME_ASCENDING' });
      const connections = response.data.connections || [];
      console.log(`  Page ${page}: ${connections.length} connections`);
      for (const person of connections) {
        const emails = person.emailAddresses || [];
        if (!emails.length) continue;
        allContacts.push({ resourceName: person.resourceName, name: person.names?.[0]?.displayName || '', email: emails[0]?.value || '', allEmails: emails.map(e => e.value), phone: person.phoneNumbers?.[0]?.value || '', company: person.organizations?.[0]?.name || '', title: person.organizations?.[0]?.title || '', photo: person.photos?.[0]?.url || '', source: 'contacts' });
      }
      nextPageToken = response.data.nextPageToken || null;
    } while (nextPageToken);
    let otherCount = 0;
    try {
      nextPageToken = null; page = 0;
      do {
        page++;
        const response = await people.otherContacts.list({ pageSize: 1000, pageToken: nextPageToken || undefined, readMask: 'names,emailAddresses,phoneNumbers' });
        const others   = response.data.otherContacts || [];
        for (const person of others) {
          const emails = person.emailAddresses || [];
          if (!emails.length) continue;
          const email = emails[0]?.value?.toLowerCase();
          if (allContacts.find(c => c.email.toLowerCase() === email)) continue;
          allContacts.push({ resourceName: person.resourceName || '', name: person.names?.[0]?.displayName || email.split('@')[0] || '', email: emails[0]?.value || '', phone: '', company: '', title: '', photo: '', source: 'other' });
          otherCount++;
        }
        nextPageToken = response.data.nextPageToken || null;
      } while (nextPageToken);
    } catch (e) { console.warn('[Gmail] otherContacts unavailable:', e.message); }
    allContacts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    cachedContacts  = allContacts;
    cacheTimestamp  = Date.now();
    // Persist to PostgreSQL so contacts survive restarts without re-auth
    try {
      await pgPool.query(`CREATE TABLE IF NOT EXISTS gmail_contacts_cache (id SERIAL PRIMARY KEY, contact_data JSONB NOT NULL, total INTEGER, synced_at TIMESTAMP DEFAULT NOW())`);
      await pgPool.query(`DELETE FROM gmail_contacts_cache`);
      await pgPool.query(`INSERT INTO gmail_contacts_cache (contact_data, total) VALUES ($1, $2)`, [JSON.stringify(allContacts), allContacts.length]);
      console.log(`[Gmail] Contacts persisted to PostgreSQL: ${allContacts.length}`);
    } catch (e) { console.warn('[Gmail] Could not persist contacts to PG:', e.message); }
    console.log(`[Gmail] Contacts synced: ${allContacts.length} (saved: ${allContacts.filter(c=>c.source==='contacts').length}, other: ${otherCount})`);
    res.json({ contacts: allContacts, total: allContacts.length, cached: false, breakdown: { saved: allContacts.filter(c => c.source === 'contacts').length, other: otherCount } });
  } catch (err) {
    console.error('Contacts Error:', err.message);
    if (err.message.includes('invalid_grant') || err.message.includes('Token has been expired')) {
      storedTokens = null; userProfile = null; await deleteAuth();
      return res.status(401).json({ error: 'Token expired. Re-authenticate at /api/gmail/auth' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.post('/contacts/refresh', (req, res) => { cachedContacts = null; cacheTimestamp = 0; res.json({ message: 'Contact cache cleared.' }); });

// ============================================================
// GET /api/gmail/labels
// ============================================================
router.get('/labels', async (req, res) => {
  const tokenOk = await ensureFreshTokens();
  if (!tokenOk || !storedTokens) return res.status(401).json({ error: 'Authentication required', authUrl: '/api/gmail/auth' });
  try {
    oauth2Client.setCredentials(storedTokens);
    const gmail    = google.gmail({ version: 'v1', auth: oauth2Client });
    const response = await gmail.users.labels.list({ userId: 'me' });
    res.json({ labels: response.data.labels });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// POST /api/gmail/disconnect
// ============================================================
router.post('/disconnect', async (req, res) => {
  storedTokens = null; userProfile = null;
  await deleteAuth();
  res.json({ success: true, message: 'Gmail disconnected' });
});

// ============================================================
// POST /api/gmail/calendar-event
// ============================================================
router.post('/calendar-event', async (req, res) => {
  try {
    if (!oauth2Client.credentials?.access_token) return res.status(401).json({ success: false, error: 'Gmail not connected' });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const { summary, description, start, end, colorId, recurrence } = req.body;
    const result   = await calendar.events.insert({ calendarId: 'primary', resource: { summary, description, start, end, colorId: colorId || '5', ...(recurrence ? { recurrence } : {}), reminders: { useDefault: false, overrides: [{ method: 'email', minutes: 60 }, { method: 'popup', minutes: 30 }] } }, sendUpdates: 'all' });
    res.json({ success: true, eventId: result.data.id, link: result.data.htmlLink });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ============================================================
// POST /api/gmail/smtp-test ΓÇö verify SMTP creds on demand
// ============================================================
router.post('/smtp-test', async (req, res) => {
  try {
    const t = createTransport();
    await t.verify();
    res.json({ success: true, message: `SMTP verified ΓÇö sending as ${FROM_HEADER}`, host: SMTP_HOST, port: SMTP_PORT });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, hint: 'Check SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS in .env' });
  }
});

module.exports = router;
module.exports.gmailApiSend = gmailApiSend;
module.exports.oauth2Client = oauth2Client;
module.exports.ensureFreshTokens = ensureFreshTokens;
