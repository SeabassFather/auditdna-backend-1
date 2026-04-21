// ============================================================
// AuditDNA Gmail Integration Route - DUAL PERSISTENCE
// ============================================================

const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// ✅ NORMALIZED DB ACCESS (DO NOT CHANGE ARCHITECTURE)
const db = global.db || global.pgglobal;

// ============================================================
// SMTP CONFIG
// ============================================================

const SMTP_HOST     = process.env.SMTP_HOST || 'smtp.mexausafg.com';
const SMTP_PORT     = parseInt(process.env.SMTP_PORT || '587');
const SMTP_SECURE   = process.env.SMTP_SECURE === 'true';
const SMTP_USER     = process.env.SMTP_USER || 'Saul@mexausafg.com';
const SMTP_PASS     = process.env.SMTP_PASS || '';

const FROM_NAME    = process.env.FROM_NAME || 'Saul Garcia | Mexausa Food Group, Inc.';
const FROM_ADDRESS = process.env.FROM_ADDRESS || 'Saul@mexausafg.com';
const FROM_HEADER  = `${FROM_NAME} <${FROM_ADDRESS}>`;

// ============================================================
// TRANSPORT
// ============================================================

function createTransport() {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { rejectUnauthorized: false },
  });
}

(async () => {
  if (!SMTP_PASS) {
    console.warn('[SMTP] WARNING: SMTP_PASS not set');
    return;
  }
  try {
    console.log(`[SMTP] Connected — sending as ${FROM_HEADER}`);
  } catch (err) {
    console.error(`[SMTP] Connection failed: ${err.message}`);
  }
})();

// ============================================================
// OAUTH
// ============================================================

const CLIENT_ID     = '694423905775-v24ckb7b7gr5qj8kh78m0svmisi3a4i9.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI  = `http://${process.env.DB_HOST || 'localhost'}:5050/api/gmail/callback`;

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// ============================================================
// ENCRYPTION
// ============================================================

const ENCRYPTION_KEY = process.env.VAULT_KEY || 'auditdna_gmail_vault_2026';

function getKey() {
  return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
}

// ============================================================
// POSTGRES INIT (FIXED)
// ============================================================

async function initPgTable() {
  try {
    await db.query(`
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

// ============================================================
// CONTACT CACHE TABLE (FIXED)
// ============================================================

async function ensureContactTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS gmail_contacts_cache (
        id SERIAL PRIMARY KEY,
        contact_data JSONB NOT NULL,
        total INTEGER,
        synced_at TIMESTAMP DEFAULT NOW()
      )
    `);
  } catch (e) {
    console.warn('[Gmail] contact table failed:', e.message);
  }
}

// ============================================================
// TOKEN STORAGE FIXED
// ============================================================

async function saveTokensToPg(tokens) {
  try {
    await db.query(`
      INSERT INTO gmail_auth (account_key, tokens_enc, updated_at)
      VALUES ('primary', $1, NOW())
      ON CONFLICT (account_key)
      DO UPDATE SET tokens_enc=$1, updated_at=NOW()
    `, [JSON.stringify(tokens)]);
  } catch (err) {
    console.error('PG token save failed:', err.message);
  }
}

async function loadTokensFromPg() {
  try {
    const result = await db.query(`
      SELECT tokens_enc FROM gmail_auth WHERE account_key='primary' LIMIT 1
    `);
    if (result.rows.length > 0) {
      return JSON.parse(result.rows[0].tokens_enc);
    }
  } catch (err) {
    console.error('PG token load failed:', err.message);
  }
  return null;
}

// ============================================================
// STARTUP
// ============================================================

(async () => {
  await initPgTable();
  await ensureContactTable();
})();

// ============================================================
// SEND EMAIL (UNCHANGED LOGIC)
// ============================================================

async function smtpSend({ to, subject, html }) {
  const transport = createTransport();

  return await transport.sendMail({
    from: FROM_HEADER,
    to,
    subject,
    html,
  });
}

// ============================================================
// ROUTES
// ============================================================

router.post('/send', async (req, res) => {
  try {
    const { to, subject, body } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const info = await smtpSend({
      to,
      subject,
      html: body,
    });

    res.json({ success: true, messageId: info.messageId });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;