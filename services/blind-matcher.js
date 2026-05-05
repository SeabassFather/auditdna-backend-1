// File: C:\AuditDNA\backend\services\blind-matcher.js
// BLIND MATCH ENGINE
// - Grower uploads inventory -> matches notify buyers in commodity (NO grower contact info)
// - Buyer posts need -> matches notify growers in commodity (NO buyer contact info)
// - All replies route through Mexausa Food Group (sgarcia1911@gmail.com) - we are the broker
// - Daily blast goes to all USA + MX buyer categories with active program flyer

'use strict';

const { pool } = require('../db');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || 'sgarcia1911@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_NAME = 'Mexausa Food Group';
const FROM_ADDR = SMTP_USER;
const REPLY_TO  = SMTP_USER;
const PLATFORM  = 'https://loaf.mexausafg.com';

function buildMailer() {
  if (!SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST, port: SMTP_PORT, secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
}

function blindId() {
  return 'MFG-' + crypto.randomBytes(6).toString('hex').toUpperCase();
}

// ─── BUYER NOTIFICATION (when grower uploads inventory) ──────────────────
async function notifyBuyersOfNewInventory(inventoryId) {
  const inv = await pool.query(
    `SELECT i.*, c.name_en AS commodity_name, c.name_es AS commodity_name_es
       FROM grower_inventory i
       JOIN commodity_categories c ON c.slug = i.commodity_slug
      WHERE i.id = $1`, [inventoryId]
  );
  if (!inv.rows[0]) return { ok: false, error: 'inventory not found' };
  const item = inv.rows[0];

  const buyers = await pool.query(
    `SELECT DISTINCT b.buyer_email, b.buyer_category
       FROM buyer_commodity_interest b
       JOIN crm_contacts c ON LOWER(c.email) = LOWER(b.buyer_email)
      WHERE b.commodity_slug = $1
        AND b.active = TRUE
        AND c.is_active = TRUE
        AND c.opt_out = FALSE
        AND (b.last_contacted IS NULL OR b.last_contacted < NOW() - INTERVAL '24 hours')
      LIMIT 500`, [item.commodity_slug]
  );

  const m = buildMailer();
  if (!m) return { ok: false, error: 'mailer not configured' };

  let sent = 0, failed = 0;
  for (const row of buyers.rows) {
    const blind = blindId();
    const subj  = `[Mexausa Food Group] New Supply Available: ${item.commodity_name} from ${item.origin_country}`;
    const html  = buildBuyerInventoryEmail(item, blind);
    try {
      await m.sendMail({
        from: `"${FROM_NAME}" <${FROM_ADDR}>`,
        to: row.buyer_email,
        replyTo: REPLY_TO,
        subject: subj,
        html
      });
      await pool.query(
        `INSERT INTO match_notifications (match_type, commodity_slug, recipient_email, recipient_role, source_id, email_subject, blind_match_id)
         VALUES ('grower_to_buyers', $1, $2, 'buyer', $3, $4, $5)`,
        [item.commodity_slug, row.buyer_email, inventoryId, subj, blind]
      );
      await pool.query(
        `UPDATE buyer_commodity_interest SET last_contacted = NOW()
          WHERE buyer_email = $1 AND commodity_slug = $2`,
        [row.buyer_email, item.commodity_slug]
      );
      sent++;
    } catch (e) {
      console.error('[blind-matcher] buyer notify fail:', row.buyer_email, e.message);
      failed++;
    }
  }
  return { ok: true, commodity: item.commodity_slug, sent, failed, recipients: buyers.rows.length };
}

// ─── GROWER NOTIFICATION (when buyer posts need) ─────────────────────────
async function notifyGrowersOfNewNeed(needId) {
  const nd = await pool.query(
    `SELECT n.*, c.name_en AS commodity_name
       FROM buyer_needs n
       JOIN commodity_categories c ON c.slug = n.commodity_slug
      WHERE n.id = $1`, [needId]
  );
  if (!nd.rows[0]) return { ok: false, error: 'need not found' };
  const need = nd.rows[0];

  const growers = await pool.query(
    `SELECT DISTINCT grower_email, grower_name
       FROM grower_inventory
      WHERE commodity_slug = $1
        AND status = 'active'
        AND grower_email IS NOT NULL
      LIMIT 500`, [need.commodity_slug]
  );

  const m = buildMailer();
  if (!m) return { ok: false, error: 'mailer not configured' };

  let sent = 0, failed = 0;
  for (const row of growers.rows) {
    const blind = blindId();
    const subj  = `[Mexausa Food Group] Buyer Need: ${need.needed_loads} loads ${need.commodity_name}`;
    const html  = buildGrowerNeedEmail(need, blind);
    try {
      await m.sendMail({
        from: `"${FROM_NAME}" <${FROM_ADDR}>`,
        to: row.grower_email,
        replyTo: REPLY_TO,
        subject: subj,
        html
      });
      await pool.query(
        `INSERT INTO match_notifications (match_type, commodity_slug, recipient_email, recipient_role, source_id, email_subject, blind_match_id)
         VALUES ('buyer_to_growers', $1, $2, 'grower', $3, $4, $5)`,
        [need.commodity_slug, row.grower_email, needId, subj, blind]
      );
      sent++;
    } catch (e) {
      console.error('[blind-matcher] grower notify fail:', row.grower_email, e.message);
      failed++;
    }
  }
  return { ok: true, commodity: need.commodity_slug, sent, failed, recipients: growers.rows.length };
}

// ─── EMAIL TEMPLATES (BLIND - never expose counterparty contact) ────────
function buildBuyerInventoryEmail(item, blindRef) {
  const fobLine = item.fob_price ? `<tr><td>FOB Price (indicative)</td><td><b>$${Number(item.fob_price).toFixed(2)}</b></td></tr>` : '';
  const certLine = (item.certifications && item.certifications.length)
    ? `<tr><td>Certifications</td><td>${item.certifications.join(', ')}</td></tr>` : '';
  return `
<!doctype html>
<html><body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#F4F6F4;color:#0F1419">
  <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #D4DBD3">
    <div style="background:#0F7B41;color:#fff;padding:18px 24px">
      <div style="font-size:11px;letter-spacing:2px;opacity:.85">MEXAUSA FOOD GROUP &middot; AGRICULTURE INTELLIGENCE</div>
      <div style="font-size:22px;font-weight:700;margin-top:6px">New Supply Available</div>
    </div>
    <div style="padding:24px">
      <p style="margin:0 0 14px">A vetted source in our grower network has new inventory matching your category interests.</p>
      <table cellpadding="6" cellspacing="0" style="width:100%;font-size:14px;border-collapse:collapse">
        <tr style="background:#F4F6F4"><td style="width:38%"><b>Commodity</b></td><td>${item.commodity_name}</td></tr>
        <tr><td><b>Origin</b></td><td>${item.origin_state || ''} ${item.origin_country}</td></tr>
        <tr style="background:#F4F6F4"><td><b>Pack Style</b></td><td>${item.pack_style || 'Standard'}</td></tr>
        <tr><td><b>Available Loads</b></td><td>${item.available_loads || 'Multiple'}</td></tr>
        <tr style="background:#F4F6F4"><td><b>Available</b></td><td>${item.available_from || 'Now'} thru ${item.available_thru || 'Open'}</td></tr>
        ${fobLine}
        ${certLine}
      </table>
      <div style="margin-top:20px;padding:14px;border-left:4px solid #C9A55C;background:#FFF8E7">
        <div style="font-size:11px;letter-spacing:1.5px;color:#7A5C1C;font-weight:700">HOW TO RESPOND</div>
        <p style="margin:6px 0 0;font-size:14px">
          Reply to this email or contact <b>sgarcia1911@gmail.com</b> referencing <b>${blindRef}</b>.
          Mexausa Food Group brokers the trade, handles factoring, and protects both parties through escrow-first workflow.
        </p>
      </div>
      <div style="margin-top:20px;text-align:center">
        <a href="${PLATFORM}" style="display:inline-block;padding:12px 28px;background:#0F7B41;color:#fff;text-decoration:none;font-weight:700;letter-spacing:1.5px">VIEW ON LOAF</a>
      </div>
    </div>
    <div style="padding:14px 24px;background:#0F1419;color:#94a3b0;font-size:11px;text-align:center">
      Mexausa Food Group, Inc. &middot; Salinas CA &middot; +1 831-251-3116<br>
      Reference: ${blindRef} &middot; <a href="mailto:${REPLY_TO}?subject=UNSUBSCRIBE" style="color:#C9A55C">unsubscribe</a>
    </div>
  </div>
</body></html>`;
}

function buildGrowerNeedEmail(need, blindRef) {
  const priceLine = need.target_price ? `<tr><td><b>Target Price</b></td><td>$${Number(need.target_price).toFixed(2)} FOB</td></tr>` : '';
  const dateLine  = need.needed_by ? `<tr style="background:#F4F6F4"><td><b>Needed By</b></td><td>${need.needed_by}</td></tr>` : '';
  return `
<!doctype html>
<html><body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#F4F6F4;color:#0F1419">
  <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #D4DBD3">
    <div style="background:#0F7B41;color:#fff;padding:18px 24px">
      <div style="font-size:11px;letter-spacing:2px;opacity:.85">MEXAUSA FOOD GROUP &middot; GROWER OPPORTUNITY</div>
      <div style="font-size:22px;font-weight:700;margin-top:6px">Buyer Need Posted</div>
    </div>
    <div style="padding:24px">
      <p style="margin:0 0 14px">A qualified buyer in our network is sourcing the commodity you produce.</p>
      <table cellpadding="6" cellspacing="0" style="width:100%;font-size:14px;border-collapse:collapse">
        <tr style="background:#F4F6F4"><td style="width:38%"><b>Commodity</b></td><td>${need.commodity_name}</td></tr>
        <tr><td><b>Loads Needed</b></td><td>${need.needed_loads}</td></tr>
        <tr style="background:#F4F6F4"><td><b>Delivery Region</b></td><td>${need.delivery_state || 'USA'}</td></tr>
        ${priceLine}
        ${dateLine}
      </table>
      <div style="margin-top:20px;padding:14px;border-left:4px solid #C9A55C;background:#FFF8E7">
        <div style="font-size:11px;letter-spacing:1.5px;color:#7A5C1C;font-weight:700">HOW TO RESPOND</div>
        <p style="margin:6px 0 0;font-size:14px">
          Reply to this email or contact <b>sgarcia1911@gmail.com</b> referencing <b>${blindRef}</b> with your FOB price, available volume, and shipping window.
          Mexausa Food Group brokers the trade and offers PO finance + factoring to qualifying growers.
        </p>
      </div>
      <div style="margin-top:20px;text-align:center">
        <a href="${PLATFORM}" style="display:inline-block;padding:12px 28px;background:#0F7B41;color:#fff;text-decoration:none;font-weight:700;letter-spacing:1.5px">UPDATE INVENTORY ON LOAF</a>
      </div>
    </div>
    <div style="padding:14px 24px;background:#0F1419;color:#94a3b0;font-size:11px;text-align:center">
      Mexausa Food Group, Inc. &middot; Salinas CA &middot; +1 831-251-3116<br>
      Reference: ${blindRef}
    </div>
  </div>
</body></html>`;
}

// ─── DAILY MARKETING BLAST (LOAF + program flyer) ───────────────────────
async function dailyBuyerBlast() {
  const today = new Date().toISOString().slice(0, 10);
  const start = new Date();
  await pool.query(
    `INSERT INTO daily_blast_log (blast_date, blast_type, commodity_focus, status, started_at)
     VALUES ($1, 'usa_buyer_program_flyer', $2, 'running', NOW())
     ON CONFLICT DO NOTHING`,
    [today, ['avocado-hass','strawberry','blueberry','asparagus','grape-table','mango']]
  );

  const buyers = await pool.query(
    `SELECT DISTINCT email, category
       FROM crm_contacts
      WHERE is_active = TRUE AND opt_out = FALSE
      LIMIT 5000`
  );

  const m = buildMailer();
  if (!m) {
    await pool.query(
      `UPDATE daily_blast_log SET status='failed', notes='no mailer', finished_at=NOW()
        WHERE blast_date=$1 AND blast_type='usa_buyer_program_flyer'`, [today]
    );
    return { ok: false, error: 'mailer not configured' };
  }

  let sent = 0, failed = 0;
  for (const b of buyers.rows) {
    try {
      const html = buildDailyBlastHtml(b.category);
      await m.sendMail({
        from: `"${FROM_NAME}" <${FROM_ADDR}>`,
        to: b.email,
        replyTo: REPLY_TO,
        subject: 'Year-Round Avocado + Strawberry NOW + Peru/Mexico Sourcing | Mexausa Food Group',
        html
      });
      sent++;
      if (sent % 50 === 0) await new Promise(r => setTimeout(r, 1500));
    } catch (e) {
      failed++;
    }
  }

  await pool.query(
    `UPDATE daily_blast_log
        SET status='complete', recipients_count=$2, sent_count=$3, failed_count=$4, finished_at=NOW()
      WHERE blast_date=$1 AND blast_type='usa_buyer_program_flyer'`,
    [today, buyers.rows.length, sent, failed]
  );

  console.log(`[daily-blast] ${today} sent=${sent} failed=${failed} total=${buyers.rows.length} elapsed=${Date.now()-start.getTime()}ms`);
  return { ok: true, recipients: buyers.rows.length, sent, failed };
}

function buildDailyBlastHtml(buyerCategory) {
  return `
<!doctype html>
<html><body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#F4F6F4;color:#0F1419">
  <div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #D4DBD3">
    <div style="background:#0F7B41;color:#fff;padding:24px">
      <div style="font-size:11px;letter-spacing:2.5px;opacity:.9">MEXAUSA FOOD GROUP &middot; AGRICULTURE INTELLIGENCE</div>
      <div style="font-size:28px;font-weight:800;margin-top:8px;line-height:1.15">Year-Round Avocado<br>+ Strawberry NOW<br>+ Peru &amp; Mexico Sourcing</div>
    </div>

    <div style="padding:24px 24px 0">
      <div style="font-size:13px;color:#7A5C1C;letter-spacing:1.5px;font-weight:700">PROGRAMS LIVE FOR BUYERS LIKE YOU</div>
      <p style="margin:10px 0 0;font-size:15px;line-height:1.55">
        Mexausa Food Group runs a vetted grower-buyer matching network across the US-Mexico-Peru fresh produce corridor. Below is what is moving right now and where we can place loads to qualified buyers.
      </p>
    </div>

    <div style="padding:24px">
      <table cellpadding="14" cellspacing="0" style="width:100%;border-collapse:separate;border-spacing:0 10px">
        <tr><td style="background:#F4F6F4;border-left:4px solid #0F7B41;padding:14px 16px">
          <div style="font-size:16px;font-weight:800;color:#0F7B41">HASS AVOCADO &middot; YEAR-ROUND</div>
          <div style="font-size:13px;margin-top:4px">Michoacan + Jalisco + Peru rotation. APHIS-certified packing. 48ct, 60ct, 70ct standard. FOB Laredo, Otay, Pharr.</div>
        </td></tr>
        <tr><td style="background:#F4F6F4;border-left:4px solid #C9A55C;padding:14px 16px">
          <div style="font-size:16px;font-weight:800;color:#7A5C1C">STRAWBERRY &middot; PEAK NOW</div>
          <div style="font-size:13px;margin-top:4px">Salinas, Watsonville, Santa Maria, Oxnard. 8x1lb clamshell. Daily ship windows. Driscoll-grade options.</div>
        </td></tr>
        <tr><td style="background:#F4F6F4;border-left:4px solid #0F7B41;padding:14px 16px">
          <div style="font-size:16px;font-weight:800;color:#0F7B41">BLUEBERRY &middot; PERU WINDOW MAY-AUG</div>
          <div style="font-size:13px;margin-top:4px">12x6oz, 12x18oz, organic available. Air + ocean freight options. Premium and conventional.</div>
        </td></tr>
        <tr><td style="background:#F4F6F4;border-left:4px solid #0F7B41;padding:14px 16px">
          <div style="font-size:16px;font-weight:800;color:#0F7B41">ASPARAGUS &middot; PERU + CABORCA</div>
          <div style="font-size:13px;margin-top:4px">11lb green, 28lb green, jumbo + standard cuts. Air freight slots open.</div>
        </td></tr>
        <tr><td style="background:#F4F6F4;border-left:4px solid #C9A55C;padding:14px 16px">
          <div style="font-size:16px;font-weight:800;color:#7A5C1C">FULL CATALOG</div>
          <div style="font-size:13px;margin-top:4px">Tomato (Roma + Grape), Bell Pepper, Cucumber, Lime Persian, Mango, Pineapple, Papaya, Table Grape, Watermelon, Cantaloupe, Iceberg, Romaine, Spinach, Broccoli, Cauliflower, Onion, Garlic, Jalapeno, Serrano.</div>
        </td></tr>
      </table>

      <div style="margin-top:20px;padding:18px;background:#0F1419;color:#fff;text-align:center">
        <div style="font-size:11px;letter-spacing:2px;color:#C9A55C">HOW WE WORK</div>
        <p style="margin:10px 0 0;font-size:13px;line-height:1.55">
          Mexausa Food Group is the broker. We handle introductions, factoring, PO finance, food safety verification, and escrow.
          Grower contact info stays private. Buyer contact info stays private. We benefit from the trade we facilitate.
        </p>
      </div>

      <div style="margin-top:20px;text-align:center">
        <a href="${PLATFORM}" style="display:inline-block;padding:14px 32px;background:#C9A55C;color:#0F1419;text-decoration:none;font-weight:800;letter-spacing:2px;font-size:13px">VISIT LOAF.MEXAUSAFG.COM</a>
      </div>

      <p style="margin-top:24px;font-size:13px;line-height:1.55">
        Reply to this email with your category interest, target price, and delivery region. We will route to a vetted source within 24 hours.
      </p>
      <p style="margin-top:14px;font-size:13px">
        Saul Garcia<br>
        <b>Mexausa Food Group, Inc.</b><br>
        <a href="mailto:sgarcia1911@gmail.com" style="color:#0F7B41">sgarcia1911@gmail.com</a> &middot; +1 831-251-3116
      </p>
    </div>

    <div style="padding:14px 24px;background:#0F1419;color:#94a3b0;font-size:11px;text-align:center">
      Mexausa Food Group, Inc. &middot; Salinas, CA &middot; ${PLATFORM}<br>
      Category: ${buyerCategory || 'GENERAL'} &middot; <a href="mailto:${REPLY_TO}?subject=UNSUBSCRIBE" style="color:#C9A55C">unsubscribe</a>
    </div>
  </div>
</body></html>`;
}

module.exports = {
  notifyBuyersOfNewInventory,
  notifyGrowersOfNewNeed,
  dailyBuyerBlast,
  blindId
};
