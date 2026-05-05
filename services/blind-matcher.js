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
  // Gmail API path (port 443, bypasses Railway SMTP egress block)
  let gmailApiSend = null;
  try { gmailApiSend = require('../routes/gmail').gmailApiSend; } catch (e) {}
  if (!gmailApiSend) {
    console.error('[blind-matcher] gmailApiSend unavailable, falling back to SMTP (likely will timeout)');
    if (!SMTP_PASS) return null;
    return nodemailer.createTransport({
      host: SMTP_HOST, port: SMTP_PORT, secure: false,
      auth: { user: SMTP_USER, pass: SMTP_PASS }
    });
  }
  return {
    sendMail: async (msg) => {
      const result = await gmailApiSend({
        from: msg.from || ('"Mexausa Food Group" <' + SMTP_USER + '>'),
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text || ''
      });
      return { messageId: (result && result.id) || ('gmail-api-' + Date.now()), accepted: [msg.to], rejected: [] };
    }
  };
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
  <div style="max-width:720px;margin:0 auto;background:#fff;border:1px solid #D4DBD3">

    <div style="background:#0F7B41;color:#fff;padding:32px 28px">
      <div style="font-size:11px;letter-spacing:2.5px;opacity:.9;font-weight:700">MEXAUSA FOOD GROUP, INC.</div>
      <div style="font-size:30px;font-weight:800;margin-top:10px;line-height:1.1">The LOAF Agricultural<br>Intelligence Platform</div>
      <div style="font-size:13px;opacity:.85;margin-top:12px;letter-spacing:1px">Vetted Sourcing &middot; Embedded Finance &middot; Full Traceability &middot; AI-Driven Matching</div>
      <div style="font-size:13px;opacity:.85;margin-top:6px;letter-spacing:1px">loaf.mexausafg.com &middot; Salinas, CA &middot; Mexico &middot; Peru</div>
    </div>

    <div style="padding:28px 28px 0">
      <div style="font-size:13px;color:#7A5C1C;letter-spacing:1.5px;font-weight:700">A LETTER FROM SAUL GARCIA, OWNER</div>
      <p style="margin:14px 0 0;font-size:15px;line-height:1.65">
        Mexausa Food Group, Inc. operates LOAF &mdash; an end-to-end agricultural commerce platform for the US, Mexico, and Peru fresh produce corridor.
        We do not just match buyers and growers. We finance the deal, verify food safety, track every lot from field to dock, and protect both sides through a blind-broker workflow where contact information is never exchanged unless both parties agree to introductions.
      </p>
    </div>

    <div style="padding:28px">
      <div style="font-size:13px;letter-spacing:1.5px;color:#0F7B41;font-weight:700">FOUR WAYS TO USE LOAF</div>

      <table cellpadding="14" cellspacing="0" style="width:100%;border-collapse:separate;border-spacing:0 12px;margin-top:14px">

        <tr><td style="background:#F4F6F4;border-left:5px solid #0F7B41;padding:18px 20px">
          <div style="font-size:15px;font-weight:800;color:#0F7B41">1. AS A BUYER &mdash; POST WHAT YOU NEED</div>
          <div style="font-size:13px;margin-top:8px;line-height:1.6">
            Tell us the commodity, volume, target FOB price, delivery region, and the date you need it.
            LOAF blasts every verified grower in our network producing that crop &mdash; without exposing your name, company, or contact info.
            All replies route through Mexausa Food Group. We handle vetting, food safety, and factoring before introductions.
          </div>
        </td></tr>

        <tr><td style="background:#F4F6F4;border-left:5px solid #C9A55C;padding:18px 20px">
          <div style="font-size:15px;font-weight:800;color:#7A5C1C">2. AS A GROWER &mdash; POST YOUR INVENTORY</div>
          <div style="font-size:13px;margin-top:8px;line-height:1.6">
            Upload available loads with commodity, origin, pack style, FOB price, and shipping window.
            LOAF notifies every verified buyer interested in that category &mdash; your contact info stays private.
            Buyers reply to Mexausa Food Group, we vet PACA standing, financials, and history, then make the introduction.
          </div>
        </td></tr>

        <tr><td style="background:#F4F6F4;border-left:5px solid #0F7B41;padding:18px 20px">
          <div style="font-size:15px;font-weight:800;color:#0F7B41">3. CALENDAR YOUR 30/60/90-DAY DEMAND</div>
          <div style="font-size:13px;margin-top:8px;line-height:1.6">
            Submit your buying calendar once and let LOAF source against it automatically.
            Strawberries peaking now &middot; blueberry Peru window May-Aug &middot; avocado contracts year-round &middot; asparagus pre-Easter &middot; mango through summer &middot; table grape Peru May-Dec.
            We forecast against USDA + SIAP price data and stage supply before you need it.
          </div>
        </td></tr>

        <tr><td style="background:#F4F6F4;border-left:5px solid #C9A55C;padding:18px 20px">
          <div style="font-size:15px;font-weight:800;color:#7A5C1C">4. EMBEDDED FINANCE FOR BOTH SIDES</div>
          <div style="font-size:13px;margin-top:8px;line-height:1.6">
            <b>Buyers:</b> Net-30, Net-45, Net-60 PO financing on approved deals. Pay your terms while your supplier gets paid up front.<br>
            <b>Growers:</b> Up to 95% advance on accounts receivable through factoring. 24-hour funding once invoice is verified. No personal guarantees on qualifying invoices.<br>
            <b>Both:</b> Escrow-first workflow on first-time trades. Contracts, paper, and freight handled by Mexausa Food Group.
          </div>
        </td></tr>

      </table>
    </div>

    <div style="padding:0 28px 24px">
      <div style="font-size:13px;letter-spacing:1.5px;color:#0F7B41;font-weight:700">EMBEDDED PO FINANCE &amp; FACTORING</div>
      <table cellpadding="12" cellspacing="0" style="width:100%;border-collapse:separate;border-spacing:0 6px;margin-top:10px;font-size:13px">
        <tr><td style="background:#F4F6F4;padding:12px 14px;border-left:4px solid #C9A55C"><b>PO Finance for Buyers</b> &mdash; we pay the grower at FOB, you pay us on Net-30/45/60. Approval in 48 hours. Lines from $50K to $5M.</td></tr>
        <tr><td style="background:#F4F6F4;padding:12px 14px;border-left:4px solid #C9A55C"><b>Factoring for Growers</b> &mdash; advance up to 95% on invoices to qualifying buyers. 1.5%-3.5% fee. 24-hour wire. Spot or recourse-free programs.</td></tr>
        <tr><td style="background:#F4F6F4;padding:12px 14px;border-left:4px solid #C9A55C"><b>Escrow on First Deals</b> &mdash; buyer wires to escrow, grower ships, freight clears, escrow releases. Removes counterparty risk on new relationships.</td></tr>
        <tr><td style="background:#F4F6F4;padding:12px 14px;border-left:4px solid #C9A55C"><b>Trade Credit Insurance</b> &mdash; available on syndicated deals. Protects against buyer non-payment and dispute risk.</td></tr>
      </table>
    </div>

    <div style="padding:0 28px 24px">
      <div style="font-size:13px;letter-spacing:1.5px;color:#0F7B41;font-weight:700">FULL TRACEABILITY &mdash; FROM FIELD TO DOCK</div>
      <table cellpadding="12" cellspacing="0" style="width:100%;border-collapse:separate;border-spacing:0 6px;margin-top:10px;font-size:13px">
        <tr><td style="background:#F4F6F4;padding:12px 14px;border-left:4px solid #0F7B41"><b>FSMA 204 Compliance</b> &mdash; every lot tracked through Critical Tracking Events. KDE capture at harvest, pack, ship, receive. 24-hour recall capability.</td></tr>
        <tr><td style="background:#F4F6F4;padding:12px 14px;border-left:4px solid #0F7B41"><b>TraceSafe Lot Tracking</b> &mdash; QR-coded pallets, real-time chain of custody, blockchain-anchored events for tamper-proof audit trail.</td></tr>
        <tr><td style="background:#F4F6F4;padding:12px 14px;border-left:4px solid #0F7B41"><b>Food Safety Audit Pre-Verification</b> &mdash; GlobalGAP, PrimusGFS, SQF, BRCGS, USDA Organic, FSMA, SENASICA, APHIS, FDA Foreign Supplier Verification. We verify certificates BEFORE the introduction.</td></tr>
        <tr><td style="background:#F4F6F4;padding:12px 14px;border-left:4px solid #0F7B41"><b>Cold Chain Monitoring</b> &mdash; live temperature telemetry on every reefer load. Alerts on excursions. Documented for QA and claims.</td></tr>
        <tr><td style="background:#F4F6F4;padding:12px 14px;border-left:4px solid #0F7B41"><b>Recall Manager</b> &mdash; one-click pull of every affected lot, every receiving party, every shipping document. Built for FDA, USDA, CBP requests.</td></tr>
      </table>
    </div>

    <div style="padding:0 28px 24px">
      <div style="font-size:13px;letter-spacing:1.5px;color:#0F7B41;font-weight:700">81 NINER MINERS &mdash; AI AGENTS WORKING FOR YOU</div>
      <p style="margin:10px 0 12px;font-size:13px;line-height:1.6">
        LOAF runs an autonomous swarm of specialized AI agents that operate 24/7 on every account. They watch markets, match deals, score risk, draft documents, and surface opportunities to your inbox before competitors see them.
      </p>
      <table cellpadding="12" cellspacing="0" style="width:100%;border-collapse:separate;border-spacing:0 6px;font-size:13px">
        <tr><td style="background:#F4F6F4;padding:12px 14px;border-left:4px solid #C9A55C"><b>ENRIQUE</b> &mdash; Grower onboarding wizard. Bilingual, walks new growers through KYC, food safety verification, and PACA validation in 14 steps.</td></tr>
        <tr><td style="background:#F4F6F4;padding:12px 14px;border-left:4px solid #C9A55C"><b>ELIOT</b> &mdash; Buyer onboarding wizard. Verifies financial history, PACA, and credit standing. 8-step intake.</td></tr>
        <tr><td style="background:#F4F6F4;padding:12px 14px;border-left:4px solid #C9A55C"><b>DIEGO</b> &mdash; Compliance &amp; food safety auditor. Cross-references certificates against expiry, scope, and authority databases.</td></tr>
        <tr><td style="background:#F4F6F4;padding:12px 14px;border-left:4px solid #C9A55C"><b>MARGIE</b> &mdash; Memory and document librarian. Surfaces relevant past trades, contracts, and disputes for context.</td></tr>
        <tr><td style="background:#F4F6F4;padding:12px 14px;border-left:4px solid #C9A55C"><b>NADINE</b> &mdash; Outbound campaign agent. Drafts and sends categorized buyer letters daily. Tracks open and reply rates.</td></tr>
        <tr><td style="background:#F4F6F4;padding:12px 14px;border-left:4px solid #C9A55C"><b>PRISCILLA</b> &mdash; Inbox sorter. Routes incoming buyer/grower replies to the right deal thread automatically.</td></tr>
        <tr><td style="background:#F4F6F4;padding:12px 14px;border-left:4px solid #C9A55C"><b>MARKET INTEL</b> &mdash; USDA Terminal Markets + SIAP + FAO + Mexican export FOB. Daily price intelligence on 92+ commodities.</td></tr>
        <tr><td style="background:#F4F6F4;padding:12px 14px;border-left:4px solid #C9A55C"><b>BROKER MATCH ENGINE</b> &mdash; Stage-gated PROPOSAL &rarr; LOI &rarr; NDA &rarr; TERMS &rarr; ACCEPTED &rarr; PARTY DISCLOSURE &rarr; PO ISSUED &rarr; FACTORED &rarr; DELIVERED &rarr; PAID. Full audit trail.</td></tr>
        <tr><td style="background:#F4F6F4;padding:12px 14px;border-left:4px solid #C9A55C"><b>RISK SCORING</b> &mdash; Real-time creditworthiness, dispute history, and concentration risk on every counterparty.</td></tr>
        <tr><td style="background:#F4F6F4;padding:12px 14px;border-left:4px solid #C9A55C"><b>WEATHER &amp; HARVEST AGENT</b> &mdash; Forecasts supply disruptions from weather events 7-21 days before they hit the spot market.</td></tr>
        <tr><td style="background:#F4F6F4;padding:12px 14px;border-left:4px solid #C9A55C"><b>+ 70 MORE</b> &mdash; logistics routing, tariff calc, inspection ordering, recall, traceability, dispute drafting, and account intelligence.</td></tr>
      </table>
    </div>

    <div style="padding:0 28px 24px">
      <div style="font-size:13px;letter-spacing:1.5px;color:#0F7B41;font-weight:700">ACTIVE PROGRAMS RIGHT NOW</div>
      <table cellpadding="10" cellspacing="0" style="width:100%;border-collapse:separate;border-spacing:0 6px;margin-top:10px;font-size:13px">
        <tr><td style="background:#F4F6F4;padding:12px 14px"><b style="color:#0F7B41">HASS AVOCADO &mdash; YEAR-ROUND</b><br>Michoacan + Jalisco + Peru rotation. APHIS-certified. 48ct, 60ct, 70ct. FOB Laredo, Otay, Pharr.</td></tr>
        <tr><td style="background:#F4F6F4;padding:12px 14px"><b style="color:#7A5C1C">STRAWBERRY &mdash; PEAK NOW</b><br>Salinas, Watsonville, Santa Maria, Oxnard. 8x1lb clamshell. Daily ship windows.</td></tr>
        <tr><td style="background:#F4F6F4;padding:12px 14px"><b style="color:#0F7B41">BLUEBERRY &mdash; PERU WINDOW MAY-AUG</b><br>12x6oz, 12x18oz, organic available. Air + ocean freight options.</td></tr>
        <tr><td style="background:#F4F6F4;padding:12px 14px"><b style="color:#0F7B41">ASPARAGUS &mdash; PERU + CABORCA</b><br>11lb, 28lb. Jumbo + standard cuts. Air freight slots open.</td></tr>
        <tr><td style="background:#F4F6F4;padding:12px 14px"><b style="color:#7A5C1C">FULL CATALOG &mdash; 26+ COMMODITIES</b><br>Tomato (Roma + Grape), Bell Pepper, Cucumber, Lime Persian, Mango, Pineapple, Papaya, Table Grape, Watermelon, Cantaloupe, Iceberg, Romaine, Spinach, Broccoli, Cauliflower, Onion, Garlic, Jalapeno, Serrano, Blackberry, Raspberry.</td></tr>
      </table>
    </div>

    <div style="padding:0 28px 24px">
      <div style="background:#0F1419;color:#fff;padding:22px 24px">
        <div style="font-size:12px;letter-spacing:2px;color:#C9A55C;font-weight:700">WHY BLIND MATCHING PROTECTS YOU</div>
        <p style="margin:10px 0 0;font-size:13px;line-height:1.65">
          Buyers do not see grower contact info. Growers do not see buyer contact info. Replies route through Mexausa Food Group.
          We verify food safety, PACA standing, financials, and shipping references before any introduction.
          Once both parties agree to terms, we facilitate contracts, escrow, factoring, and freight.
          We earn commission only when deals close. You keep your relationships and pricing private until you choose to share them.
        </p>
      </div>
    </div>

    <div style="padding:0 28px 32px;text-align:center">
      <a href="https://loaf.mexausafg.com" style="display:inline-block;padding:16px 36px;background:#C9A55C;color:#0F1419;text-decoration:none;font-weight:800;letter-spacing:2px;font-size:13px">REGISTER ON LOAF.MEXAUSAFG.COM</a>
      <div style="margin-top:14px;font-size:13px;color:#0F1419;line-height:1.6">
        Or reply to this email with your category interest, target price, delivery region, and timing.<br>
        We will route to a vetted source within 24 hours.
      </div>
    </div>

    <div style="padding:24px 28px;border-top:1px solid #D4DBD3;font-size:13px;color:#0F1419">
      <p style="margin:0 0 8px"><b>Saul Garcia, Owner</b></p>
      <p style="margin:0 0 4px"><b>Mexausa Food Group, Inc.</b> &middot; Salinas, CA</p>
      <p style="margin:0 0 4px"><a href="mailto:sgarcia1911@gmail.com" style="color:#0F7B41">sgarcia1911@gmail.com</a> &middot; +1 831-251-3116 &middot; +52 646-340-2686 (MX)</p>
      <p style="margin:8px 0 0"><a href="https://loaf.mexausafg.com" style="color:#0F7B41">loaf.mexausafg.com</a> &middot; <a href="https://mexausafg.com" style="color:#0F7B41">mexausafg.com</a></p>
    </div>

    <div style="padding:14px 28px;background:#0F1419;color:#94a3b0;font-size:11px;text-align:center">
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
