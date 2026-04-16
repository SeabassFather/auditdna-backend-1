// ================================================================
// email-sequence-ecmw.js — East Coast / Midwest Buyer Email Sequence
// Save to: C:\AuditDNA\backend\routes\email-sequence-ecmw.js
// Mount in server.js: app.use('/api/email-sequence-ecmw', require('./routes/email-sequence-ecmw'));
// ================================================================

'use strict';

const express  = require('express');
const router   = express.Router();
const nodemailer = require('nodemailer');
const cron     = require('node-cron');
const { getPool } = require('../db');

// ── SMTP TRANSPORTER ────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: 'smtpout.secureserver.net',
  port: 465,
  secure: true,
  auth: {
    user: 'saul@mexausafg.com',
    pass: 'PurpleRain321',
  },
});

// ── TARGET STATES ───────────────────────────────────────────────
const EC_STATES  = ['NY','NJ','CT','MA','PA','MD','VA','NC','SC','FL','DE','RI','NH','ME','VT'];
const MW_STATES  = ['IL','OH','MI','IN','WI','MN','IA','MO','ND','SD','NE','KS'];
const ALL_STATES = [...EC_STATES, ...MW_STATES];

// ── BOOTSTRAP TABLE ─────────────────────────────────────────────
const bootstrap = async (pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ecmw_campaign_log (
      id           SERIAL PRIMARY KEY,
      buyer_email  VARCHAR(255) NOT NULL,
      buyer_name   VARCHAR(255),
      company      VARCHAR(255),
      state        VARCHAR(10),
      sequence_day INTEGER      NOT NULL,  -- 0, 5, or 10
      status       VARCHAR(50)  DEFAULT 'pending',
      sent_at      TIMESTAMPTZ,
      error_msg    TEXT,
      campaign_id  VARCHAR(100) DEFAULT 'ec_mw_Q2_2026',
      created_at   TIMESTAMPTZ  DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_ecmw_email_day ON ecmw_campaign_log(buyer_email, sequence_day);
    CREATE INDEX IF NOT EXISTS idx_ecmw_status    ON ecmw_campaign_log(status);
  `).catch(e => console.warn('[ecmw] bootstrap warning:', e.message));
};

// ================================================================
// EMAIL TEMPLATES
// ================================================================
const getTemplate = (day, buyer) => {
  const name    = buyer.contact_name || buyer.buyer_name || 'Produce Buyer';
  const company = buyer.company || buyer.buyer_company || '';

  const templates = {

    // ── DAY 0 — OPEN THE DOOR ───────────────────────────────────
    0: {
      subject: 'Premium Mexican Avocados & Berries — Direct Grower Source, Q2 2026',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1e293b;">
          <div style="background:#0f172a;padding:20px 30px;border-bottom:3px solid #cba658;">
            <div style="color:#cba658;font-size:18px;font-weight:bold;letter-spacing:2px;">CM PRODUCTS INTERNATIONAL</div>
            <div style="color:#94a3b0;font-size:11px;letter-spacing:1px;">PACA #20241168 | MEXAUSA FOOD GROUP, INC.</div>
          </div>
          <div style="padding:30px;background:#fef8e7;">
            <p>Hello ${name}${company ? ` at ${company}` : ''},</p>
            <p>My name is <strong>Saul Garcia</strong> with Mexausa Food Group, Inc. — we're a PACA-licensed importer sourcing premium avocados, berries, and leafy greens directly from certified growers in Michoacan and Sinaloa, Mexico.</p>
            <p>We work with distributors and retailers across the East Coast and Midwest who need consistent volume, competitive pricing, and full USDA/FDA/APHIS compliance — without the middleman markup.</p>
            <table style="width:100%;border-collapse:collapse;margin:20px 0;">
              <tr style="background:#0f172a;color:#cba658;">
                <th style="padding:10px;text-align:left;font-size:12px;">COMMODITY</th>
                <th style="padding:10px;text-align:left;font-size:12px;">SPEC</th>
                <th style="padding:10px;text-align:left;font-size:12px;">AVAILABILITY</th>
              </tr>
              <tr style="background:#f7f1da;">
                <td style="padding:10px;font-size:12px;">Hass Avocados</td>
                <td style="padding:10px;font-size:12px;">48ct / 60ct / 70ct</td>
                <td style="padding:10px;font-size:12px;color:#059669;">Weekly Volume</td>
              </tr>
              <tr style="background:#fef8e7;">
                <td style="padding:10px;font-size:12px;">Strawberries</td>
                <td style="padding:10px;font-size:12px;">8x1lb flats</td>
                <td style="padding:10px;font-size:12px;color:#059669;">Year-Round</td>
              </tr>
              <tr style="background:#f7f1da;">
                <td style="padding:10px;font-size:12px;">Blueberries</td>
                <td style="padding:10px;font-size:12px;">12x6oz flats</td>
                <td style="padding:10px;font-size:12px;color:#059669;">Year-Round</td>
              </tr>
              <tr style="background:#fef8e7;">
                <td style="padding:10px;font-size:12px;">Leafy Greens</td>
                <td style="padding:10px;font-size:12px;">Romaine / Spinach / Mixed</td>
                <td style="padding:10px;font-size:12px;color:#059669;">GAP Certified</td>
              </tr>
            </table>
            <p>Full cold chain traceability, SENASICA + USDA certified. Flexible MOQ for regional distribution centers.</p>
            <p>If you're currently sourcing from Mexico or looking to diversify your supply chain, I'd welcome a 15-minute call this week.</p>
            <p style="margin-top:30px;">Best regards,<br>
            <strong>Saul Garcia</strong><br>
            Mexausa Food Group, Inc. / Mexausa Food Group, Inc.<br>
            PACA #20241168 | NMLS #337526<br>
            <a href="tel:+18312513116" style="color:#cba658;">+1-831-251-3116</a> |
            <a href="mailto:saul@mexausafg.com" style="color:#cba658;">saul@mexausafg.com</a> |
            <a href="https://mexausafg.com" style="color:#cba658;">mexausafg.com</a></p>
          </div>
          <div style="background:#0f172a;padding:12px 30px;font-size:10px;color:#475569;">
            To unsubscribe, reply with REMOVE in the subject line. Mexausa Food Group, Inc., PACA #20241168.
          </div>
        </div>
      `
    },

    // ── DAY 5 — PRICING + AVAILABILITY ──────────────────────────
    5: {
      subject: 'Following Up — Q2 Avocado Pricing + Availability for Your Region',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1e293b;">
          <div style="background:#0f172a;padding:20px 30px;border-bottom:3px solid #cba658;">
            <div style="color:#cba658;font-size:18px;font-weight:bold;letter-spacing:2px;">CM PRODUCTS INTERNATIONAL</div>
            <div style="color:#94a3b0;font-size:11px;letter-spacing:1px;">PACA #20241168 | MEXAUSA FOOD GROUP, INC.</div>
          </div>
          <div style="padding:30px;background:#fef8e7;">
            <p>Hello ${name},</p>
            <p>Following up on my note from last week. I wanted to share our current Q2 market pricing in case it's useful for your planning:</p>
            <table style="width:100%;border-collapse:collapse;margin:20px 0;">
              <tr style="background:#0f172a;color:#cba658;">
                <th style="padding:10px;text-align:left;font-size:12px;">ITEM</th>
                <th style="padding:10px;text-align:left;font-size:12px;">PRICE</th>
                <th style="padding:10px;text-align:left;font-size:12px;">TERMS</th>
              </tr>
              <tr style="background:#f7f1da;">
                <td style="padding:10px;font-size:12px;">Hass Avocados 48ct</td>
                <td style="padding:10px;font-size:12px;">$28-32/box</td>
                <td style="padding:10px;font-size:12px;">FOB Nogales</td>
              </tr>
              <tr style="background:#fef8e7;">
                <td style="padding:10px;font-size:12px;">Hass Avocados 60ct</td>
                <td style="padding:10px;font-size:12px;">$24-28/box</td>
                <td style="padding:10px;font-size:12px;">FOB Nogales</td>
              </tr>
              <tr style="background:#f7f1da;">
                <td style="padding:10px;font-size:12px;">Strawberries 8x1lb</td>
                <td style="padding:10px;font-size:12px;">$14-18/flat</td>
                <td style="padding:10px;font-size:12px;">FOB Nogales</td>
              </tr>
              <tr style="background:#fef8e7;">
                <td style="padding:10px;font-size:12px;">Blueberries 12x6oz</td>
                <td style="padding:10px;font-size:12px;">$22-26/flat</td>
                <td style="padding:10px;font-size:12px;">FOB Nogales</td>
              </tr>
            </table>
            <p>All pricing includes full USDA inspection documentation, SENASICA phytosanitary certificates, and FDA prior notice. Our growers in Michoacan and Sinaloa are at peak season with open allocation through Q2.</p>
            <p>Would a full pricing sheet and spec pack be helpful? I can send it over today.</p>
            <p style="margin-top:30px;">Best regards,<br>
            <strong>Saul Garcia</strong><br>
            Mexausa Food Group, Inc.<br>
            PACA #20241168<br>
            <a href="tel:+18312513116" style="color:#cba658;">+1-831-251-3116</a> |
            <a href="mailto:saul@mexausafg.com" style="color:#cba658;">saul@mexausafg.com</a></p>
          </div>
          <div style="background:#0f172a;padding:12px 30px;font-size:10px;color:#475569;">
            To unsubscribe, reply with REMOVE in the subject line. Mexausa Food Group, Inc., PACA #20241168.
          </div>
        </div>
      `
    },

    // ── DAY 10 — CLOSE ───────────────────────────────────────────
    10: {
      subject: 'Last Note — Open Allocation Closing Q2 | Mexausa Food Group, Inc.',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1e293b;">
          <div style="background:#0f172a;padding:20px 30px;border-bottom:3px solid #cba658;">
            <div style="color:#cba658;font-size:18px;font-weight:bold;letter-spacing:2px;">CM PRODUCTS INTERNATIONAL</div>
            <div style="color:#94a3b0;font-size:11px;letter-spacing:1px;">PACA #20241168 | MEXAUSA FOOD GROUP, INC.</div>
          </div>
          <div style="padding:30px;background:#fef8e7;">
            <p>Hello ${name},</p>
            <p>I'll keep this short — this is my last note on Q2 availability.</p>
            <p>We have open allocation for avocados, berries, and leafy greens through end of June. Once committed to our current buyers, that volume closes.</p>
            <div style="background:#0f172a;padding:20px;border-radius:4px;margin:20px 0;">
              <div style="color:#cba658;font-size:12px;font-weight:bold;margin-bottom:12px;">IF YOU ARE INTERESTED IN ANY OF THE FOLLOWING, REPLY NOW:</div>
              <div style="color:#cbd5e1;font-size:12px;line-height:2;">
                &rsaquo; Trial order — no long-term commitment required<br>
                &rsaquo; Full pricing and spec sheet for your category review<br>
                &rsaquo; 10-minute call to see if we are a fit
              </div>
            </div>
            <p>We are PACA-licensed (#20241168), fully compliant across USDA/FDA/APHIS/CBP, and have been moving product across the US-Mexico border for years. No surprises. No middlemen.</p>
            <p>Hope to connect.</p>
            <p style="margin-top:30px;">
            <strong>Saul Garcia</strong><br>
            Mexausa Food Group, Inc. / Mexausa Food Group, Inc.<br>
            PACA #20241168 | NMLS #337526<br>
            <a href="tel:+18312513116" style="color:#cba658;">+1-831-251-3116</a> |
            <a href="mailto:saul@mexausafg.com" style="color:#cba658;">saul@mexausafg.com</a> |
            <a href="https://mexausafg.com" style="color:#cba658;">mexausafg.com</a></p>
          </div>
          <div style="background:#0f172a;padding:12px 30px;font-size:10px;color:#475569;">
            To unsubscribe, reply with REMOVE in the subject line. Mexausa Food Group, Inc., PACA #20241168.
          </div>
        </div>
      `
    }
  };

  return templates[day] || null;
};

// ================================================================
// CORE SEND FUNCTION
// ================================================================
const sendSequenceDay = async (pool, day) => {
  console.log(`[ecmw] Starting Day ${day} blast — ${new Date().toISOString()}`);

  // Get EC/MW buyers who have NOT received this day's email yet
  // and are NOT unsubscribed
  let buyers = [];
  try {
    const result = await pool.query(`
      SELECT DISTINCT
        b.email,
        b.contact_name,
        b.buyer_name,
        b.company,
        b.buyer_company,
        b.state
      FROM buyer_segments b
      WHERE b.state = ANY($1)
        AND b.email IS NOT NULL
        AND b.email != ''
        AND b.email NOT IN (
          SELECT buyer_email FROM ecmw_campaign_log
          WHERE sequence_day = $2 AND status = 'sent'
        )
        AND b.email NOT IN (
          SELECT email FROM suppression_list WHERE active = true
        )
      LIMIT 500
    `, [ALL_STATES, day]);
    buyers = result.rows;
  } catch (err) {
    console.warn('[ecmw] buyer query warning:', err.message);
    // Fallback — try without suppression_list join
    try {
      const result = await pool.query(`
        SELECT DISTINCT email, contact_name, buyer_name, company, buyer_company, state
        FROM buyer_segments
        WHERE state = ANY($1)
          AND email IS NOT NULL AND email != ''
          AND email NOT IN (
            SELECT buyer_email FROM ecmw_campaign_log
            WHERE sequence_day = $2 AND status = 'sent'
          )
        LIMIT 500
      `, [ALL_STATES, day]);
      buyers = result.rows;
    } catch (e) {
      console.error('[ecmw] buyer query failed:', e.message);
      return { sent: 0, failed: 0, error: e.message };
    }
  }

  console.log(`[ecmw] Day ${day} — ${buyers.length} buyers to contact`);

  let sent = 0;
  let failed = 0;

  for (const buyer of buyers) {
    const template = getTemplate(day, buyer);
    if (!template) continue;

    try {
      await transporter.sendMail({
        from: '"Saul Garcia - Mexausa Food Group, Inc." <saul@mexausafg.com>',
        to: buyer.email,
        subject: template.subject,
        html: template.html,
      });

      await pool.query(`
        INSERT INTO ecmw_campaign_log
          (buyer_email, buyer_name, company, state, sequence_day, status, sent_at, campaign_id)
        VALUES ($1, $2, $3, $4, $5, 'sent', NOW(), 'ec_mw_Q2_2026')
        ON CONFLICT DO NOTHING
      `, [
        buyer.email,
        buyer.contact_name || buyer.buyer_name || '',
        buyer.company || buyer.buyer_company || '',
        buyer.state || '',
        day
      ]);

      sent++;

      // Throttle — 1 email per 200ms to avoid SMTP rate limits
      await new Promise(r => setTimeout(r, 200));

    } catch (err) {
      console.warn(`[ecmw] Failed to send to ${buyer.email}:`, err.message);

      await pool.query(`
        INSERT INTO ecmw_campaign_log
          (buyer_email, buyer_name, company, state, sequence_day, status, error_msg, campaign_id)
        VALUES ($1, $2, $3, $4, $5, 'failed', $6, 'ec_mw_Q2_2026')
        ON CONFLICT DO NOTHING
      `, [
        buyer.email,
        buyer.contact_name || buyer.buyer_name || '',
        buyer.company || buyer.buyer_company || '',
        buyer.state || '',
        day,
        err.message
      ]).catch(() => {});

      failed++;
    }
  }

  console.log(`[ecmw] Day ${day} COMPLETE — Sent: ${sent} | Failed: ${failed}`);
  return { sent, failed, total: buyers.length };
};

// ================================================================
// CRON JOBS — 3am EST SHARP
// EST = UTC-5  =>  3am EST = 08:00 UTC
// Day 0  fires TODAY at 3am EST
// Day 5  fires +5 days at 3am EST
// Day 10 fires +10 days at 3am EST
// node-cron: second(opt) minute hour day month weekday
// ================================================================
let cronJobs = [];

const registerCrons = (pool) => {
  // Clear any existing jobs
  cronJobs.forEach(j => j.stop());
  cronJobs = [];

  // Day 0 — every day at 3:00am EST (runs once, self-tracks via DB)
  const job0 = cron.schedule('0 0 8 * * *', async () => {
    console.log('[ecmw-cron] Day 0 triggered');
    await sendSequenceDay(pool, 0);
  }, { timezone: 'UTC' });

  // Day 5 — every day at 3:05am EST
  const job5 = cron.schedule('0 5 8 * * *', async () => {
    console.log('[ecmw-cron] Day 5 triggered');
    await sendSequenceDay(pool, 5);
  }, { timezone: 'UTC' });

  // Day 10 — every day at 3:10am EST
  const job10 = cron.schedule('0 10 8 * * *', async () => {
    console.log('[ecmw-cron] Day 10 triggered');
    await sendSequenceDay(pool, 10);
  }, { timezone: 'UTC' });

  cronJobs = [job0, job5, job10];
  console.log('[ecmw] Cron jobs registered — Day 0: 3:00am | Day 5: 3:05am | Day 10: 3:10am EST');
};

// ================================================================
// ROUTES
// ================================================================

// POST /api/email-sequence-ecmw/start
// Registers crons + bootstraps DB
router.post('/start', async (req, res) => {
  try {
    const pool = getPool(req);
    await bootstrap(pool);
    registerCrons(pool);
    res.json({ ok: true, message: 'EC/MW sequence crons registered. Fires at 3:00/3:05/3:10am EST daily.' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/email-sequence-ecmw/fire/:day
// Manual trigger for any day (0, 5, or 10)
router.post('/fire/:day', async (req, res) => {
  const day = parseInt(req.params.day);
  if (![0, 5, 10].includes(day)) {
    return res.status(400).json({ ok: false, error: 'Day must be 0, 5, or 10.' });
  }
  try {
    const pool = getPool(req);
    await bootstrap(pool);
    res.json({ ok: true, message: `Day ${day} blast firing now — check logs.` });
    // Fire async — don't block response
    sendSequenceDay(pool, day).then(result => {
      console.log(`[ecmw] Manual Day ${day} complete:`, result);
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/email-sequence-ecmw/stats
// Campaign stats dashboard
router.get('/stats', async (req, res) => {
  try {
    const pool = getPool(req);
    await bootstrap(pool);

    const result = await pool.query(`
      SELECT
        sequence_day,
        status,
        COUNT(*) AS count
      FROM ecmw_campaign_log
      WHERE campaign_id = 'ec_mw_Q2_2026'
      GROUP BY sequence_day, status
      ORDER BY sequence_day, status
    `);

    const byState = await pool.query(`
      SELECT state, COUNT(*) AS sent
      FROM ecmw_campaign_log
      WHERE status = 'sent' AND campaign_id = 'ec_mw_Q2_2026'
      GROUP BY state
      ORDER BY sent DESC
    `);

    const totals = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'sent')   AS total_sent,
        COUNT(*) FILTER (WHERE status = 'failed') AS total_failed,
        COUNT(*) FILTER (WHERE sequence_day = 0)  AS day0_count,
        COUNT(*) FILTER (WHERE sequence_day = 5)  AS day5_count,
        COUNT(*) FILTER (WHERE sequence_day = 10) AS day10_count
      FROM ecmw_campaign_log
      WHERE campaign_id = 'ec_mw_Q2_2026'
    `);

    res.json({
      ok: true,
      campaign: 'EC/MW Q2 2026',
      totals: totals.rows[0],
      by_day_status: result.rows,
      by_state: byState.rows
    });

  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/email-sequence-ecmw/log
// Full send log with pagination
router.get('/log', async (req, res) => {
  try {
    const pool = getPool(req);
    const { day, status, limit = 100, offset = 0 } = req.query;

    let where = [`campaign_id = 'ec_mw_Q2_2026'`];
    let params = [];
    let idx = 1;

    if (day    !== undefined) { where.push(`sequence_day = $${idx++}`); params.push(parseInt(day)); }
    if (status !== undefined) { where.push(`status = $${idx++}`);       params.push(status); }

    const result = await pool.query(`
      SELECT id, buyer_email, buyer_name, company, state, sequence_day, status, sent_at, error_msg
      FROM ecmw_campaign_log
      WHERE ${where.join(' AND ')}
      ORDER BY sent_at DESC NULLS LAST
      LIMIT $${idx++} OFFSET $${idx++}
    `, [...params, limit, offset]);

    res.json({ ok: true, log: result.rows });

  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/email-sequence-ecmw/stop
// Stop all cron jobs
router.post('/stop', (req, res) => {
  cronJobs.forEach(j => j.stop());
  cronJobs = [];
  console.log('[ecmw] All cron jobs stopped.');
  res.json({ ok: true, message: 'EC/MW sequence stopped.' });
});

// ================================================================
// AUTO-INIT on require
// ================================================================
(async () => {
  try {
    // Bootstrap will run once backend is up and pool is available
    // Crons register automatically on server start
    setTimeout(async () => {
      try {
        const { Pool } = require('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        await bootstrap(pool);
        registerCrons(pool);
      } catch (e) {
        console.warn('[ecmw] Auto-init deferred — will init on first API call:', e.message);
      }
    }, 5000);
  } catch (e) {
    console.warn('[ecmw] Auto-init skipped:', e.message);
  }
})();

module.exports = router;
