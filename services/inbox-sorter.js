// File: C:\AuditDNA\backend\services\inbox-sorter.js
// INBOX SORTER - polls Gmail every 5min, classifies replies, logs to email_activity_log,
// fires ntfy hot-lead alerts, bumps lead_temperature on hot matches.
'use strict';
const { google } = require('googleapis');

const NTFY_TOPIC = process.env.NTFY_TOPIC || 'mexausa-saul';
const HOT_COMMODITIES = ['avocado', 'tomato', 'strawberry', 'blueberry', 'citrus', 'grape'];

const INTENT_PATTERNS = [
  { intent: 'unsubscribe', rx: /\b(unsubscribe|remove me|stop emailing|opt[\s-]?out|no longer interested|do not contact)\b/i, weight: 100 },
  { intent: 'oof',         rx: /\b(out of office|on vacation|away from (the )?office|currently traveling|automatic reply|autoreply|will be back|out until)\b/i, weight: 95 },
  { intent: 'buy',         rx: /\b(send (a )?quote|please quote|need pricing|what(?:'s| is) your price|how much (is|for|does)|interested in (buying|purchasing)|ready to (buy|order)|place (an )?order|po (number|attached)|purchase order|need (a )?load|need pallets|how soon can|when can you ship|sign (the )?nda|sign agreement)\b/i, weight: 80 },
  { intent: 'quote',       rx: /\b(quote|pricing|price (sheet|list)|cotizacion|precios|fob|delivered price|landed cost|spec sheet|cuts|sizes available)\b/i, weight: 70 },
  { intent: 'sell',        rx: /\b(we (have|grow|pack)|available (now|this week)|in season|harvesting|currently (have|packing)|tenemos|cosecha|disponible|loads available|truckload available)\b/i, weight: 60 },
  { intent: 'inquiry',     rx: /\b(more info|tell me more|interested|interesado|please send|can you send|details|spec|certifications|paca|primus|globalg)\b/i, weight: 50 },
  { intent: 'reply',       rx: /\b(thanks|thank you|received|got it|noted|gracias)\b/i, weight: 10 },
];

function decodeBody(payload) {
  if (!payload) return '';
  if (payload.body && payload.body.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }
  if (payload.parts && payload.parts.length) {
    for (const p of payload.parts) {
      if (p.mimeType === 'text/plain' && p.body && p.body.data) {
        return Buffer.from(p.body.data, 'base64').toString('utf-8');
      }
    }
    for (const p of payload.parts) {
      const nested = decodeBody(p);
      if (nested) return nested;
    }
  }
  return '';
}

function classifyIntent(subject, body) {
  const text = (subject + ' ' + body).toLowerCase();
  let best = { intent: 'reply', score: 0 };
  for (const p of INTENT_PATTERNS) {
    if (p.rx.test(text)) {
      if (p.weight > best.score) best = { intent: p.intent, score: p.weight };
    }
  }
  return best.intent;
}

function detectCommodity(subject, body) {
  const text = (subject + ' ' + body).toLowerCase();
  const map = {
    avocado: ['avocado','aguacate','hass'],
    tomato: ['tomato','tomate','roma'],
    strawberry: ['strawberry','fresa','berry','berries'],
    blueberry: ['blueberry','arandano'],
    citrus: ['citrus','lime','lemon','orange','limon','naranja','toronja'],
    grape: ['grape','uva'],
    apple: ['apple','manzana'],
    onion: ['onion','cebolla'],
    pepper: ['pepper','jalapeno','chile','pimiento'],
    lettuce: ['lettuce','romaine','lechuga'],
    mango: ['mango'],
    cucumber: ['cucumber','pepino'],
    squash: ['squash','zucchini','calabaza'],
    lime: ['lime','limon'],
  };
  for (const [tag, kws] of Object.entries(map)) {
    if (kws.some(k => text.includes(k))) return tag;
  }
  return null;
}

async function alreadyProcessed(pool, gmailId) {
  const r = await pool.query(
    `SELECT 1 FROM email_activity_log WHERE gmail_message_id = $1 AND direction = 'inbound' LIMIT 1`,
    [gmailId]
  );
  return r.rowCount > 0;
}

async function lookupContact(pool, email) {
  if (!email) return null;
  const e = email.toLowerCase().trim();
  const g = await pool.query("SELECT id, COALESCE(contact_name, legal_name, company_name) AS name, 'grower' AS type FROM growers WHERE LOWER(email) = $1 LIMIT 1", [e]);
  if (g.rowCount) return g.rows[0];
  const b = await pool.query("SELECT id, legal_name AS name, 'buyer' AS type FROM buyers WHERE LOWER(email) = $1 LIMIT 1", [e]);
  if (b.rowCount) return b.rows[0];
  return null;
}

async function bumpTemperature(pool, contact, intent) {
  if (!contact) return;
  if (!['buy', 'quote'].includes(intent)) return;
  const table = contact.type === 'grower' ? 'growers' : 'buyers';
  try {
    await pool.query(`UPDATE ${table} SET lead_temperature = 'hot' WHERE id = $1`, [contact.id]);
  } catch (e) {
    // lead_temperature may not exist on all envs; non-fatal
  }
}

async function fireNtfy(payload) {
  try {
    await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method: 'POST',
      headers: {
        'Title': payload.title || 'AuditDNA Hot Lead',
        'Priority': '5',
        'Tags': 'fire,money_with_wings'
      },
      body: payload.body || ''
    });
  } catch (e) {
    console.error('[INBOX-SORTER] ntfy push failed:', e.message);
  }
}

async function processInbox(app) {
  try {
    const pool = app.get('pool');
    const gmailRoute = app.get('gmailRoute');
    if (!gmailRoute) { console.log('[INBOX-SORTER] gmailRoute not ready'); return; }

    const { oauth2Client, ensureFreshTokens } = gmailRoute;
    if (!oauth2Client) return;
    await ensureFreshTokens();
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Skip bounces (bounce-handler owns those); scan unread inbox last 1d
    const search = await gmail.users.messages.list({
      userId: 'me',
      q: '-subject:(Delivery Status Notification OR Mail Delivery Subsystem OR Undeliverable OR MAILER-DAEMON) in:inbox is:unread newer_than:1d',
      maxResults: 50,
    });

    const messages = search.data.messages || [];
    if (messages.length === 0) return;

    let processed = 0, hot = 0;
    for (const msg of messages) {
      try {
        if (await alreadyProcessed(pool, msg.id)) continue;

        const full = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
        const headers = full.data.payload && full.data.payload.headers || [];
        const getH = (n) => (headers.find(h => h.name.toLowerCase() === n.toLowerCase()) || {}).value || '';
        const fromRaw = getH('From');
        const subject = getH('Subject');
        const body = decodeBody(full.data.payload).slice(0, 4000);
        const snippet = (full.data.snippet || '').slice(0, 500);

        const emailMatch = fromRaw.match(/<([^>]+)>/) || fromRaw.match(/([^\s]+@[^\s]+)/);
        const fromEmail = emailMatch ? emailMatch[1].toLowerCase() : null;
        const fromName = fromRaw.replace(/<[^>]+>/, '').replace(/"/g, '').trim();

        const intent = classifyIntent(subject, body);
        const commodity = detectCommodity(subject, body);
        const contact = await lookupContact(pool, fromEmail);

        await pool.query(
          `INSERT INTO email_activity_log (direction, contact_email, contact_name, contact_type, commodity, subject, snippet, intent, agent_id, gmail_message_id)
           VALUES ('inbound', $1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [fromEmail, contact ? contact.name : fromName, contact ? contact.type : null, commodity, subject.slice(0, 500), snippet, intent, 'INBOX_SORTER', msg.id]
        );

        if (['buy', 'quote'].includes(intent)) {
          await bumpTemperature(pool, contact, intent);
          if (commodity && HOT_COMMODITIES.includes(commodity)) {
            hot++;
            await fireNtfy({
              title: `HOT LEAD: ${commodity.toUpperCase()} - ${intent.toUpperCase()}`,
              body: `From: ${fromName} <${fromEmail}>\nSubject: ${subject}\n\n${snippet}`
            });
          }
        }
        processed++;
      } catch (e) {
        console.error('[INBOX-SORTER] msg error:', msg.id, e.message);
      }
    }
    if (processed > 0) console.log(`[INBOX-SORTER] processed=${processed} hot_leads=${hot}`);
  } catch (e) {
    console.error('[INBOX-SORTER] run error:', e.message);
  }
}

function startInboxSorter(app) {
  console.log('[INBOX-SORTER] starting - polling every 5 min');
  setTimeout(() => processInbox(app), 30 * 1000);
  setInterval(() => processInbox(app), 5 * 60 * 1000);
}

module.exports = { startInboxSorter, processInbox };