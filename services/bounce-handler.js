// File: C:\AuditDNA\backend\services\bounce-handler.js
// BOUNCE HANDLER — polls Gmail for bounces, scrubs bad emails from DB, archives bounce
'use strict';
const { google } = require('googleapis');

async function getBounceHandler(app) {
  const pool = app.get('pool');
  const oauthClient = app.get('gmailOAuth') || null;
  return { pool, oauthClient };
}

function extractBouncedEmail(snippet, body) {
  const text = (snippet + ' ' + body).toLowerCase();
  const patterns = [
    /the following address(?:es)? failed[^<]*<([^>]+@[^>]+)>/gi,
    /delivery to the following recipient[^<]*failed[^<]*<([^>]+@[^>]+)>/gi,
    /recipient address rejected[^:]*:\s*([^\s]+@[^\s]+)/gi,
    /unknown user[^:]*:\s*([^\s]+@[^\s]+)/gi,
    /no such user[^:]*:\s*([^\s]+@[^\s]+)/gi,
    /user unknown[^:]*:\s*([^\s]+@[^\s]+)/gi,
    /does not exist[^:]*:\s*([^\s]+@[^\s]+)/gi,
    /mailbox not found[^:]*:\s*([^\s]+@[^\s]+)/gi,
    /invalid recipient[^:]*:\s*([^\s]+@[^\s]+)/gi,
    /550[^:]*:\s*([^\s]+@[^\s]+)/gi,
    /551[^:]*:\s*([^\s]+@[^\s]+)/gi,
    /553[^:]*:\s*([^\s]+@[^\s]+)/gi,
    /Final-Recipient:[^:]*;\s*([^\s]+@[^\s]+)/gi,
    /Original-Recipient:[^:]*;\s*([^\s]+@[^\s]+)/gi,
  ];
  for (const p of patterns) {
    p.lastIndex = 0;
    const m = p.exec(text);
    if (m && m[1]) return m[1].trim().replace(/[<>]/g, '').toLowerCase();
  }
  return null;
}

async function scrubEmail(pool, email) {
  if (!email || !email.includes('@')) return 0;
  email = email.toLowerCase().trim();
  let removed = 0;
  try {
    const r1 = await pool.query("UPDATE growers SET email = NULL, notes = COALESCE(notes,'') || ' [BOUNCE-REMOVED]' WHERE LOWER(email) = $1", [email]);
    const r2 = await pool.query("UPDATE buyers SET email = NULL WHERE LOWER(email) = $1", [email]);
    const r3 = await pool.query("UPDATE shipper_contacts SET email = NULL WHERE LOWER(email) = $1", [email]);
    removed = (r1.rowCount||0) + (r2.rowCount||0) + (r3.rowCount||0);
    console.log(`[BOUNCE] Scrubbed ${email} — removed from ${removed} records`);
  } catch(e) {
    console.error('[BOUNCE] Scrub error:', e.message);
  }
  return removed;
}

async function processBounces(app) {
  try {
    const pool = app.get('pool');
    const gmailRoute = app.get('gmailRoute');
    if (!gmailRoute) return;

    const { oauth2Client, ensureFreshTokens } = gmailRoute;
    if (!oauth2Client) return;

    await ensureFreshTokens();
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Search for bounce emails in inbox
    const search = await gmail.users.messages.list({
      userId: 'me',
      q: 'subject:(Delivery Status Notification OR Mail Delivery Subsystem OR Undeliverable OR bounce OR MAILER-DAEMON) is:unread newer_than:1d',
      maxResults: 50,
    });

    const messages = search.data.messages || [];
    if (messages.length === 0) return;

    console.log(`[BOUNCE] Found ${messages.length} potential bounce emails`);
    let totalScrubbed = 0;

    for (const msg of messages) {
      try {
        const full = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
        const snippet = full.data.snippet || '';
        const body = Buffer.from(
          (full.data.payload?.parts?.[0]?.body?.data || full.data.payload?.body?.data || ''),
          'base64'
        ).toString('utf8');

        const bounced = extractBouncedEmail(snippet, body);

        if (bounced) {
          const removed = await scrubEmail(pool, bounced);
          totalScrubbed += removed;
        }

        // Archive + mark read — remove from inbox regardless
        await gmail.users.messages.modify({
          userId: 'me',
          id: msg.id,
          requestBody: {
            removeLabelIds: ['INBOX', 'UNREAD'],
            addLabelIds: [],
          },
        });
      } catch(e) {
        console.error('[BOUNCE] Message process error:', e.message);
      }
    }

    if (totalScrubbed > 0) {
      console.log(`[BOUNCE] Total scrubbed this run: ${totalScrubbed} records`);
    }
  } catch(e) {
    console.error('[BOUNCE] Process error:', e.message);
  }
}

function startBounceHandler(app) {
  console.log('[BOUNCE] Handler started — scanning every 5 min');
  // Run immediately then every 5 minutes
  setTimeout(() => processBounces(app).catch(() => {}), 30000);
  setInterval(() => processBounces(app).catch(() => {}), 5 * 60 * 1000);
}

module.exports = { startBounceHandler, scrubEmail, extractBouncedEmail };