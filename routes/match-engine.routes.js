// File: C:\AuditDNA\backend\routes\match-engine.routes.js
// Match engine API: grower upload, buyer need post, daily blast trigger,
// commission lookup, and notification log retrieval.

'use strict';

const express = require('express');
const router  = express.Router();
const { pool } = require('../db');
const matcher = require('../services/blind-matcher');

router.use(express.json({ limit: '256kb' }));

// ─── COMMODITY CATALOG ───────────────────────────────────────────────────
router.get('/commodities', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT slug, name_en, name_es, origin_pref, year_round, peak_months, active
         FROM commodity_categories WHERE active = TRUE ORDER BY name_en`
    );
    res.json({ ok: true, count: r.rows.length, commodities: r.rows });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── COMMISSION TABLE ────────────────────────────────────────────────────
router.get('/commissions', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT cs.commodity_slug, cc.name_en, cs.buy_side_pct, cs.sell_side_pct,
              cs.total_pct, cs.min_dollar_per_load, cs.market_basis, cs.notes,
              cs.effective_from
         FROM commission_schedule cs
         JOIN commodity_categories cc ON cc.slug = cs.commodity_slug
        ORDER BY cc.name_en`
    );
    res.json({ ok: true, count: r.rows.length, commissions: r.rows });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/commissions/:slug', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT cs.*, cc.name_en, cc.name_es
         FROM commission_schedule cs
         JOIN commodity_categories cc ON cc.slug = cs.commodity_slug
        WHERE cs.commodity_slug = $1`, [req.params.slug]
    );
    if (!r.rows[0]) return res.status(404).json({ ok: false, error: 'commodity not found' });
    res.json({ ok: true, commission: r.rows[0] });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── GROWER UPLOAD INVENTORY ─────────────────────────────────────────────
router.post('/grower/inventory', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.grower_email || !b.commodity_slug) {
      return res.status(400).json({ ok: false, error: 'grower_email and commodity_slug required' });
    }
    const r = await pool.query(
      `INSERT INTO grower_inventory
        (grower_email, grower_name, commodity_slug, origin_country, origin_state,
         pack_style, available_loads, fob_price, available_from, available_thru,
         certifications, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id, created_at`,
      [b.grower_email, b.grower_name || null, b.commodity_slug,
       b.origin_country || 'MX', b.origin_state || null, b.pack_style || null,
       b.available_loads || 1, b.fob_price || null,
       b.available_from || null, b.available_thru || null,
       b.certifications || [], b.notes || null]
    );
    const inventoryId = r.rows[0].id;

    // Fire-and-forget blind buyer blast
    setImmediate(() => {
      matcher.notifyBuyersOfNewInventory(inventoryId)
        .then(x => console.log('[match-engine] inv-to-buyers id=' + inventoryId + ' sent=' + x.sent + ' failed=' + x.failed))
        .catch(e => console.error('[match-engine] inv blast fail:', e.message));
    });

    res.json({ ok: true, inventory_id: inventoryId, created_at: r.rows[0].created_at });
  } catch (e) {
    console.error('[match-engine] inventory POST error:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ─── BUYER POST NEED ─────────────────────────────────────────────────────
router.post('/buyer/need', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.buyer_email || !b.commodity_slug) {
      return res.status(400).json({ ok: false, error: 'buyer_email and commodity_slug required' });
    }
    const r = await pool.query(
      `INSERT INTO buyer_needs
        (buyer_email, buyer_name, commodity_slug, needed_loads, target_price,
         needed_by, delivery_state, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, created_at`,
      [b.buyer_email, b.buyer_name || null, b.commodity_slug,
       b.needed_loads || 1, b.target_price || null,
       b.needed_by || null, b.delivery_state || null, b.notes || null]
    );
    const needId = r.rows[0].id;

    setImmediate(() => {
      matcher.notifyGrowersOfNewNeed(needId)
        .then(x => console.log('[match-engine] need-to-growers id=' + needId + ' sent=' + x.sent + ' failed=' + x.failed))
        .catch(e => console.error('[match-engine] need blast fail:', e.message));
    });

    res.json({ ok: true, need_id: needId, created_at: r.rows[0].created_at });
  } catch (e) {
    console.error('[match-engine] need POST error:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ─── DAILY BLAST TRIGGER (manual + cron) ────────────────────────────────
router.post('/blast/daily', async (req, res) => {
  try {
    const result = await matcher.dailyBuyerBlast();
    res.json(result);
  } catch (e) {
    console.error('[match-engine] daily blast error:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ─── NOTIFICATION LOG ────────────────────────────────────────────────────
router.get('/notifications', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    const type  = req.query.type || null;
    const where = []; const args = [];
    if (type) { args.push(type); where.push('match_type = $' + args.length); }
    const sql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    args.push(limit);
    const r = await pool.query(
      `SELECT id, match_type, commodity_slug, recipient_email, recipient_role,
              source_id, email_subject, blind_match_id, sent_at
         FROM match_notifications ${sql}
        ORDER BY sent_at DESC LIMIT $${args.length}`, args
    );
    res.json({ ok: true, count: r.rows.length, notifications: r.rows });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/blast/log', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT * FROM daily_blast_log ORDER BY blast_date DESC, started_at DESC LIMIT 50`
    );
    res.json({ ok: true, count: r.rows.length, blasts: r.rows });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── BUYER INTEREST MGMT ─────────────────────────────────────────────────
router.post('/buyer/interest', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.buyer_email || !Array.isArray(b.commodity_slugs)) {
      return res.status(400).json({ ok: false, error: 'buyer_email and commodity_slugs[] required' });
    }
    let added = 0;
    for (const slug of b.commodity_slugs) {
      await pool.query(
        `INSERT INTO buyer_commodity_interest (buyer_email, commodity_slug, buyer_category, priority)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (buyer_email, commodity_slug) DO UPDATE SET active = TRUE`,
        [b.buyer_email, slug, b.buyer_category || null, b.priority || 1]
      );
      added++;
    }
    res.json({ ok: true, added });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/buyer/:email/interests', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT b.commodity_slug, c.name_en, b.priority, b.last_contacted, b.active
         FROM buyer_commodity_interest b
         JOIN commodity_categories c ON c.slug = b.commodity_slug
        WHERE b.buyer_email = $1 ORDER BY b.priority DESC, c.name_en`,
      [req.params.email]
    );
    res.json({ ok: true, interests: r.rows });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});


// ─── DEBUG: Synchronous blast test - returns full error stack if it fails ──
router.get('/debug/inv-blast/:id', async (req, res) => {
  try {
    console.log('[debug] inv-blast start id=' + req.params.id);
    const result = await matcher.notifyBuyersOfNewInventory(parseInt(req.params.id, 10));
    console.log('[debug] inv-blast end', result);
    res.json({ ok: true, result });
  } catch (e) {
    console.error('[debug] inv-blast THREW:', e.message, e.stack);
    res.status(500).json({ ok: false, error: e.message, stack: e.stack });
  }
});

router.get('/debug/env', async (req, res) => {
  res.json({
    ok: true,
    smtp_user: process.env.SMTP_USER || '<unset>',
    smtp_pass_len: (process.env.SMTP_PASS || '').length,
    smtp_host: process.env.SMTP_HOST || '<unset>',
    smtp_port: process.env.SMTP_PORT || '<unset>',
    db_url_starts: (process.env.DATABASE_URL || '').slice(0, 30),
    brevo_key_len: (process.env.BREVO_API_KEY || '').length,
    brevo_key_starts: (process.env.BREVO_API_KEY || '').slice(0, 12)
  });
});

router.get('/debug/buyers/:slug', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT DISTINCT b.buyer_email, b.buyer_category
         FROM buyer_commodity_interest b
         JOIN crm_contacts c ON LOWER(c.email) = LOWER(b.buyer_email)
        WHERE b.commodity_slug = $1
          AND b.active = TRUE
          AND c.is_active = TRUE
          AND c.opt_out = FALSE
          AND (b.last_contacted IS NULL OR b.last_contacted < NOW() - INTERVAL '24 hours')
        LIMIT 5`, [req.params.slug]
    );
    res.json({ ok: true, count: r.rows.length, sample: r.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});


// ─── DEBUG: Single-email send with 30s hard timeout - returns actual error ──
router.get('/debug/test-send', async (req, res) => {
  const nodemailer = require('nodemailer');
  const SMTP_USER = process.env.SMTP_USER || 'sgarcia1911@gmail.com';
  const SMTP_PASS = process.env.SMTP_PASS || '';
  const start = Date.now();

  if (!SMTP_PASS) {
    return res.json({ ok: false, error: 'SMTP_PASS env var is empty', smtp_user: SMTP_USER, smtp_pass_len: 0 });
  }

  console.log('[debug-test-send] starting, smtp_user=' + SMTP_USER + ' pass_len=' + SMTP_PASS.length);

  try {
    const transport = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    });

    const verifyResult = await Promise.race([
      transport.verify(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('VERIFY_TIMEOUT_15S')), 15000))
    ]);
    console.log('[debug-test-send] verify ok=' + verifyResult);

    const sendResult = await Promise.race([
      transport.sendMail({
        from: '"Mexausa Food Group" <sgarcia1911@gmail.com>',
        to: 'sgarcia1911@gmail.com',
        subject: 'BLIND MATCHER SMTP TEST - ' + new Date().toISOString(),
        text: 'Single-shot SMTP test from /api/match/debug/test-send. If you see this in your inbox, the blind matcher SMTP path is working and the issue is throughput, not auth.'
      }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('SEND_TIMEOUT_15S')), 15000))
    ]);

    const elapsed = Date.now() - start;
    console.log('[debug-test-send] sent ms=' + elapsed + ' messageId=' + sendResult.messageId);
    res.json({ ok: true, elapsed_ms: elapsed, messageId: sendResult.messageId, accepted: sendResult.accepted, rejected: sendResult.rejected });
  } catch (e) {
    const elapsed = Date.now() - start;
    console.error('[debug-test-send] FAILED ms=' + elapsed + ' error=' + e.message);
    res.status(500).json({ ok: false, elapsed_ms: elapsed, error: e.message, code: e.code, command: e.command, stack: (e.stack || '').slice(0, 500) });
  }
});


router.get('/debug/brevo-fire', async (req, res) => {
  const start = Date.now();
  try {
    const KEY = process.env.BREVO_API_KEY || '';
    if (!KEY) return res.json({ ok: false, error: 'BREVO_API_KEY env var missing on Railway' });
    const fetch = global.fetch || require('node-fetch');
    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': KEY, 'accept': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'Mexausa Food Group', email: 'sgarcia1911@gmail.com' },
        to: [{ email: 'sgarcia1911@gmail.com' }],
        subject: 'BREVO DIRECT TEST - ' + new Date().toISOString(),
        htmlContent: '<h2>Brevo HTTP API path is working</h2><p>If you see this in your inbox, the blind matcher Brevo wire is live and the 31K blast can fire.</p>',
        textContent: 'Brevo HTTP API working. Blast can fire.'
      })
    });
    const elapsed = Date.now() - start;
    const text = await resp.text();
    res.json({ ok: resp.ok, status: resp.status, elapsed_ms: elapsed, body: text.slice(0, 400) });
  } catch (e) {
    res.status(500).json({ ok: false, elapsed_ms: Date.now() - start, error: e.message });
  }
});

module.exports = router;
