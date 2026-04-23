'use strict';
const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

const { classifyBatch, matchBuyersForInventory } = require('../services/contact-classifier');
const { buildBlastBatch } = require('../services/email-generator');

const db = global.db || global.pgglobal;

function createTransport(){
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || 'sgarcia1911@gmail.com',
      pass: process.env.SMTP_PASS || process.env.GMAIL_APP_PASS || '',
    },
    tls: { rejectUnauthorized: false },
  });
}

const FROM_HEADER = `${process.env.FROM_NAME || 'Saul Garcia | Mexausa Food Group, Inc.'} <${process.env.FROM_ADDRESS || 'Saul@mexausafg.com'}>`;

async function loadAndClassify(){
  if (!db) throw new Error('DB not available');
  let rows = [];
  try {
    const crm = await db.query(`
      SELECT id, first_name, last_name, email, phone, company, city, state, country,
             notes, category, created_at, last_contacted, open_count, reply_count
      FROM ag_contacts
      WHERE email IS NOT NULL AND email != ''
    `);
    rows = crm.rows.map(r => ({
      ...r,
      name: [r.first_name, r.last_name].filter(Boolean).join(' ').trim() || r.company || r.email,
      source: 'CRM',
    }));
  } catch (e) {
    console.warn('[inventory] crm_contacts query failed:', e.message);
  }
  try {
    const gmail = await db.query(`SELECT contact_data FROM gmail_contacts_cache ORDER BY synced_at DESC LIMIT 1`);
    if (gmail.rows[0]) {
      const cached = gmail.rows[0].contact_data;
      const arr = Array.isArray(cached) ? cached : (cached.contacts || []);
      for (const g of arr) { if (g.email) rows.push({ ...g, source: 'GMAIL' }); }
    }
  } catch (e) {
    console.warn('[inventory] gmail cache query failed:', e.message);
  }
  const seen = new Map();
  for (const r of rows) {
    const key = String(r.email).toLowerCase().trim();
    if (!seen.has(key) || r.source === 'CRM') seen.set(key, r);
  }
  const deduped = Array.from(seen.values());
  return classifyBatch(deduped);
}

router.get('/segments', async (req, res) => {
  try {
    const { stats, results } = await loadAndClassify();
    res.json({
      total: stats.total,
      counts: {
        hot: stats.by_heat.HOT,
        warm: stats.by_heat.WARM,
        cold: stats.by_heat.COLD,
        growers: stats.by_role.grower || 0,
        buyers: stats.by_role.buyer || 0,
        chain_stores: stats.by_role.chain_store || 0,
        distributors: stats.by_role.distributor || 0,
        packers: stats.by_role.packer || 0,
        shippers: stats.by_role.shipper || 0,
        wholesalers: stats.by_role.wholesaler || 0,
        importers: stats.by_role.importer || 0,
        retailers: stats.by_role.retailer || 0,
      },
      by_commodity: stats.by_commodity,
      by_country: stats.by_country,
      by_role: stats.by_role,
      contacts: results,
    });
  } catch (err) {
    console.error('[inventory/segments] error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/notify/dryrun', async (req, res) => {
  try {
    const item = req.body || {};
    if (!item.commodity_category) return res.status(400).json({ error: 'commodity_category required' });
    const { results } = await loadAndClassify();
    const { batch, total_matched, breakdown } = buildBlastBatch(item, results, { lang: req.body.lang || 'auto' });
    res.json({
      item,
      total_matched,
      total_emails: batch.length,
      breakdown,
      preview: batch.slice(0, 10).map(e => ({ to: e.to, lang: e.lang, subject: e.subject })),
      recipients: batch.map(e => e.to),
    });
  } catch (err) {
    console.error('[inventory/dryrun] error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/notify', async (req, res) => {
  try {
    const item = req.body || {};
    if (!item.commodity_category) return res.status(400).json({ error: 'commodity_category required' });
    if (!req.body.confirm || req.body.confirm !== 'YES_BLAST') {
      return res.status(400).json({ error: 'Safety check: pass confirm="YES_BLAST" to send. Use /dryrun first.' });
    }
    const { results } = await loadAndClassify();
    const { batch, total_matched, breakdown } = buildBlastBatch(item, results, { lang: req.body.lang || 'auto' });
    if (batch.length === 0) return res.json({ total_matched: 0, sent: 0, failed: 0, breakdown, note: 'No matched buyers' });

    let optOut = new Set();
    try {
      const oo = await db.query(`SELECT email FROM email_optout`);
      optOut = new Set(oo.rows.map(r => String(r.email).toLowerCase()));
    } catch(e){}

    const toSend = batch.filter(e => !optOut.has(String(e.to).toLowerCase()));

    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS inventory_notification_log (
          id SERIAL PRIMARY KEY,
          commodity_category VARCHAR(100),
          item_name VARCHAR(255),
          sent_to VARCHAR(255),
          lang VARCHAR(4),
          status VARCHAR(20),
          error_msg TEXT,
          sent_at TIMESTAMP DEFAULT NOW()
        )
      `);
    } catch(e){}

    const transport = createTransport();
    let sent = 0, failed = 0;
    const errors = [];

    for (const em of toSend) {
      try {
        await transport.sendMail({ from: FROM_HEADER, to: em.to, subject: em.subject, html: em.html });
        sent++;
        await db.query(
          `INSERT INTO inventory_notification_log (commodity_category, item_name, sent_to, lang, status) VALUES ($1,$2,$3,$4,'sent')`,
          [item.commodity_category, item.name || '', em.to, em.lang]
        ).catch(()=>{});
      } catch (e) {
        failed++;
        errors.push({ to: em.to, error: e.message });
        await db.query(
          `INSERT INTO inventory_notification_log (commodity_category, item_name, sent_to, lang, status, error_msg) VALUES ($1,$2,$3,$4,'failed',$5)`,
          [item.commodity_category, item.name || '', em.to, em.lang, e.message]
        ).catch(()=>{});
      }
    }

    res.json({ total_matched, total_after_optout: toSend.length, sent, failed, breakdown, errors: errors.slice(0, 10) });
  } catch (err) {
    console.error('[inventory/notify] error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
