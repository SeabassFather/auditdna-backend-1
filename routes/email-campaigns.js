// ============================================================================
// AuditDNA — EMAIL CAMPAIGN ENGINE v2.0
// File: C:\AuditDNA\backend\routes\email-campaigns.js
//
// Routes:
//   POST /api/email/send-blast        — send immediate blast
//   POST /api/email/schedule-blast    — schedule future blast
//   POST /api/email/auto-pilot/run    — run auto-pilot cycle manually
//   GET  /api/email/campaigns         — list campaigns
//   GET  /api/email/scheduled         — list scheduled blasts
//   GET  /api/email/stats             — campaign stats
//   POST /api/email/unsubscribe       — unsubscribe handler
// ============================================================================
'use strict';

const express  = require('express');
const router   = express.Router();
const nodemailer = require('nodemailer');
const { getPool } = require('../db');

// ── SMTP TRANSPORTER ─────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'sgarcia1911@gmail.com',
    pass: 'izvbtgxxogchstym',
  },
  tls: { rejectUnauthorized: false }
});

const FROM = '"Saul Garcia - Mexausa Food Group" <sgarcia1911@gmail.com>';

// ── HTML EMAIL TEMPLATE ───────────────────────────────────────────────────────
function buildHTML(subject, body, recipientEmail, lang) {
  const unsubUrl = `${process.env.REACT_APP_API_URL || 'https://mexausafg.com'}/api/email/unsubscribe?email=${encodeURIComponent(recipientEmail)}&t=${Date.now()}`;
  return `<!DOCTYPE html>
<html lang="${lang || 'en'}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${subject}</title>
<style>
  body { margin:0; padding:0; background:#f4f4f4; font-family:'Segoe UI',Arial,sans-serif; }
  .wrap { max-width:640px; margin:0 auto; background:#fff; }
  .header { background:linear-gradient(135deg,#0f172a,#1e293b); padding:28px 32px; text-align:center; }
  .header h1 { color:#cba658; font-size:22px; margin:0 0 4px; letter-spacing:2px; }
  .header p { color:#94a3b8; font-size:11px; margin:0; letter-spacing:1px; }
  .body { padding:32px; color:#1e293b; font-size:14px; line-height:1.7; }
  .body h2 { color:#0f172a; font-size:18px; margin:0 0 16px; }
  .cta { text-align:center; margin:28px 0; }
  .cta a { background:#cba658; color:#0f172a; padding:12px 28px; border-radius:6px; text-decoration:none; font-weight:700; font-size:13px; letter-spacing:1px; }
  .footer { background:#0f172a; padding:20px 32px; text-align:center; }
  .footer p { color:#475569; font-size:10px; margin:4px 0; }
  .footer a { color:#cba658; text-decoration:none; }
  .divider { height:1px; background:#e2e8f0; margin:20px 0; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>MEXAUSA FOOD GROUP, INC.</h1>
    <p>CM Products International | PACA #20241168</p>
  </div>
  <div class="body">
    <h2>${subject}</h2>
    <div class="divider"></div>
    ${body.replace(/\n/g, '<br>')}
    <div class="cta"><a href="https://mexausafg.com">VIEW PLATFORM</a></div>
  </div>
  <div class="footer">
    <p>Mexausa Food Group, Inc. | Saul Garcia | +1 (831) 251-3116</p>
    <p>saul@mexausafg.com | mexausafg.com | PACA #20241168</p>
    <p><a href="${unsubUrl}">Unsubscribe</a> | <a href="https://mexausafg.com/legal">Privacy Policy</a></p>
    <p style="color:#334155;margin-top:8px">You received this because you are a registered buyer/grower/shipper in our network.</p>
  </div>
</div>
</body></html>`;
}

// ── SEND SINGLE EMAIL ─────────────────────────────────────────────────────────
async function sendEmail(to, subject, body, lang) {
  return transporter.sendMail({ replyTo: 'saul@mexausafg.com',
    from: FROM,
    to,
    subject,
    html: buildHTML(subject, body, to, lang),
    text: body,
  });
}

// ── LOG SEND TO DB ─────────────────────────────────────────────────────────────
async function logSend(req, campaignId, recipientEmail, status, error) {
  try {
    const pool = getPool(req);
    await pool.query(
      `INSERT INTO campaign_sends (campaign_id, recipient_email, status, sent_at, error_msg)
       VALUES ($1, $2, $3, NOW(), $4)
       ON CONFLICT DO NOTHING`,
      [campaignId || 'manual', recipientEmail, status, error || null]
    );
  } catch {}
}

// ── INIT SCHEDULED BLASTS TABLE IF NEEDED ────────────────────────────────────
async function ensureScheduledTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS scheduled_blasts (
      id           SERIAL PRIMARY KEY,
      blast_id     VARCHAR(50) UNIQUE NOT NULL,
      subject      TEXT NOT NULL,
      body         TEXT NOT NULL,
      segment      VARCHAR(100),
      recipients   JSONB,
      send_at      TIMESTAMP NOT NULL,
      recurrence   VARCHAR(20) DEFAULT 'once',
      status       VARCHAR(20) DEFAULT 'pending',
      sent_count   INTEGER DEFAULT 0,
      created_at   TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});
}

// ── POST /api/email/send-blast ────────────────────────────────────────────────
router.post('/send-blast', async (req, res) => {
  const { subject, body, recipients, segment, lang, campaignId } = req.body;
  if (!subject || !body || !recipients?.length) {
    return res.status(400).json({ error: 'subject, body, and recipients required' });
  }

  let sent = 0, failed = 0, errors = [];

  for (const r of recipients) {
    const email = typeof r === 'string' ? r : r.email;
    if (!email) continue;
    try {
      await sendEmail(email, subject, body, lang || 'en');
      await logSend(req, campaignId, email, 'sent', null);
      sent++;
    } catch (e) {
      await logSend(req, campaignId, email, 'failed', e.message);
      errors.push({ email, error: e.message });
      failed++;
    }
    // Throttle: 1 email per 200ms to avoid SMTP rate limits
    await new Promise(r => setTimeout(r, 200));
  }

  // Update campaign stats
  if (campaignId) {
    try {
      const pool = getPool(req);
      await pool.query(
        'UPDATE agrimaxx_campaigns SET total_sent = total_sent + $1 WHERE campaign_id = $2',
        [sent, campaignId]
      );
    } catch {}
  }

  console.log(`[EMAIL] Blast complete: ${sent} sent, ${failed} failed`);
  res.json({ success: true, sent, failed, errors: errors.slice(0, 10) });
});

// ── POST /api/email/schedule-blast ───────────────────────────────────────────
router.post('/schedule-blast', async (req, res) => {
  const { subject, body, segment, recipients, sendAt, recurrence, lang } = req.body;
  if (!subject || !sendAt) return res.status(400).json({ error: 'subject and sendAt required' });

  try {
    const pool = getPool(req);
    await ensureScheduledTable(pool);
    const blastId = `BLAST-${Date.now()}`;
    await pool.query(
      `INSERT INTO scheduled_blasts (blast_id, subject, body, segment, recipients, send_at, recurrence)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [blastId, subject, body || '', segment || 'all', JSON.stringify(recipients || []), sendAt, recurrence || 'once']
    );
    res.json({ success: true, blastId, sendAt, message: `Scheduled for ${new Date(sendAt).toLocaleString()}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/email/scheduled ─────────────────────────────────────────────────
router.get('/scheduled', async (req, res) => {
  try {
    const pool = getPool(req);
    await ensureScheduledTable(pool);
    const r = await pool.query('SELECT * FROM scheduled_blasts ORDER BY send_at DESC LIMIT 50');
    res.json({ blasts: r.rows });
  } catch (e) {
    res.json({ blasts: [] });
  }
});

// ── GET /api/email/campaigns ─────────────────────────────────────────────────
router.get('/campaigns', async (req, res) => {
  try {
    const pool = getPool(req);
    const r = await pool.query('SELECT * FROM agrimaxx_campaigns WHERE active = true ORDER BY sequence_order');
    res.json({ campaigns: r.rows });
  } catch (e) {
    res.json({ campaigns: [] });
  }
});

// ── GET /api/email/stats ──────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const pool = getPool(req);
    const [totals, recent] = await Promise.all([
      pool.query('SELECT COUNT(*) as total, COUNT(CASE WHEN status=$1 THEN 1 END) as sent, COUNT(CASE WHEN status=$2 THEN 1 END) as failed FROM campaign_sends', ['sent', 'failed']),
      pool.query('SELECT * FROM campaign_sends ORDER BY sent_at DESC LIMIT 20'),
    ]);
    res.json({ totals: totals.rows[0], recent: recent.rows });
  } catch (e) {
    res.json({ totals: { total: 0, sent: 0, failed: 0 }, recent: [] });
  }
});

// ── POST /api/email/auto-pilot/run ───────────────────────────────────────────
// Runs the auto-pilot cycle: checks pending scheduled blasts and fires them
router.post('/auto-pilot/run', async (req, res) => {
  try {
    const pool = getPool(req);
    await ensureScheduledTable(pool);

    const now = new Date();
    const due = await pool.query(
      `SELECT * FROM scheduled_blasts WHERE status='pending' AND send_at <= $1 LIMIT 5`,
      [now.toISOString()]
    );

    if (!due.rows.length) {
      return res.json({ message: 'No blasts due', fired: 0 });
    }

    let fired = 0;
    for (const blast of due.rows) {
      // Mark as running
      await pool.query('UPDATE scheduled_blasts SET status=$1 WHERE blast_id=$2', ['running', blast.blast_id]);

      const recipients = blast.recipients || [];
      let sent = 0;

      for (const r of recipients) {
        const email = typeof r === 'string' ? r : r.email;
        if (!email) continue;
        try {
          await sendEmail(email, blast.subject, blast.body, 'en');
          sent++;
        } catch {}
        await new Promise(r => setTimeout(r, 200));
      }

      // Update status
      const nextStatus = blast.recurrence === 'once' ? 'sent' : 'pending';
      let nextSendAt = null;
      if (blast.recurrence === 'daily') nextSendAt = new Date(Date.now() + 86400000).toISOString();
      if (blast.recurrence === 'weekly') nextSendAt = new Date(Date.now() + 604800000).toISOString();

      await pool.query(
        'UPDATE scheduled_blasts SET status=$1, sent_count=sent_count+$2, send_at=COALESCE($3::timestamp, send_at) WHERE blast_id=$4',
        [nextStatus, sent, nextSendAt, blast.blast_id]
      );

      fired++;
      console.log(`[AUTO-PILOT] Fired blast ${blast.blast_id}: ${sent} emails sent`);
    }

    res.json({ success: true, fired, message: `Auto-pilot fired ${fired} blast(s)` });
  } catch (e) {
    console.error('[AUTO-PILOT] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/email/unsubscribe ────────────────────────────────────────────────
router.get('/unsubscribe', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).send('Invalid unsubscribe link');
  try {
    const pool = getPool(req);
    await pool.query(
      `INSERT INTO suppression_list (email, reason, created_at) VALUES ($1, 'unsubscribe', NOW()) ON CONFLICT DO NOTHING`,
      [email.toLowerCase()]
    ).catch(() => {});
    res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:48px;background:#0f172a;color:#e2e8f0"><h2 style="color:#cba658">Unsubscribed</h2><p>${email} has been removed from all Mexausa Food Group mailing lists.</p></body></html>`);
  } catch {
    res.send('Unsubscribed successfully.');
  }
});

// ── POST /api/email/send-learning-report ────────────────────────────────────
router.post('/send-learning-report', async (req, res) => {
  const { subject, body } = req.body;
  try {
    await sendEmail('saul@mexausafg.com', subject || 'AuditDNA AI Learning Report', body || 'No data', 'en');
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ── CRON INIT — runs auto-pilot every hour ────────────────────────────────────
function startAutoPilotCron(app) {
  const INTERVAL = 60 * 60 * 1000; // every 1 hour
  setInterval(async () => {
    try {
      const fakeReq = { headers: {} };
      const pool = getPool(fakeReq);
      await ensureScheduledTable(pool);
      const now = new Date();
      const due = await pool.query(
        `SELECT * FROM scheduled_blasts WHERE status='pending' AND send_at <= $1 LIMIT 10`,
        [now.toISOString()]
      );
      if (!due.rows.length) return;
      console.log(`[AUTO-PILOT CRON] ${due.rows.length} blast(s) due at ${now.toISOString()}`);
      for (const blast of due.rows) {
        const recipients = blast.recipients || [];
        let sent = 0;
        for (const r of recipients) {
          const email = typeof r === 'string' ? r : r.email;
          if (!email) continue;
          try { await sendEmail(email, blast.subject, blast.body, 'en'); sent++; } catch {}
          await new Promise(r => setTimeout(r, 200));
        }
        const nextStatus = blast.recurrence === 'once' ? 'sent' : 'pending';
        let nextSendAt = null;
        if (blast.recurrence === 'daily') nextSendAt = new Date(Date.now() + 86400000).toISOString();
        if (blast.recurrence === 'weekly') nextSendAt = new Date(Date.now() + 604800000).toISOString();
        await pool.query(
          'UPDATE scheduled_blasts SET status=$1, sent_count=sent_count+$2, send_at=COALESCE($3::timestamp,send_at) WHERE blast_id=$4',
          [nextStatus, sent, nextSendAt, blast.blast_id]
        );
        console.log(`[AUTO-PILOT CRON] Blast ${blast.blast_id}: ${sent} sent`);
      }
    } catch (e) {
      console.error('[AUTO-PILOT CRON ERROR]', e.message);
    }
  }, INTERVAL);
  console.log('[AUTO-PILOT CRON] Started — runs every 60 minutes');
}

module.exports = router;
module.exports.startAutoPilotCron = startAutoPilotCron;






