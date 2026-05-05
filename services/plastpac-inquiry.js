// =============================================================================
// PLASTPAC INQUIRY SERVICE
// File: C:\AuditDNA\backend\services\plastpac-inquiry.js
//
// Handles inquiry submissions from loaf.mexausafg.com EcoCrate product card.
// Writes to plastpac_inquiries table, fires 4-channel notifier, sends emails
// to Hector + Saul + the inquirer (auto-confirmation with letterhead).
// =============================================================================

'use strict';

const { pool } = require('../db');
const nodemailer = require('nodemailer');

let runPipeline = null;
try { ({ runPipeline } = require('../swarm/gatekeepers/orchestrator')); }
catch (e) { console.error('[plastpac] gatekeeper orchestrator unavailable:', e.message); }

let notifier = null;
try { notifier = require('./swarm-notifier.js'); } catch (e) { /* notifier optional */ }

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || 'sgarcia1911@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_NAME = 'Mexausa Food Group';
const FROM_ADDR = SMTP_USER;

function buildMailer() {
  if (!SMTP_PASS) return null;
  try {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false,
      auth: { user: SMTP_USER, pass: SMTP_PASS }
    });
  } catch (err) {
    console.error('[plastpac] buildMailer threw:', err.message);
    return null;
  }
}

// ----------------------------------------------------------------------------
// Persist inquiry to DB
// ----------------------------------------------------------------------------
async function saveInquiry(data) {
  const {
    company, contact_name, contact_role, email, phone,
    current_packaging, box_dimensions, board_style,
    print_requirements, weight_limit, pallet_pattern,
    shipping_address, ordering_contact, notes,
    ip_address, user_agent,
    utm_source, utm_medium, utm_campaign,
    source, product_slug
  } = data;

  const q = `
    INSERT INTO plastpac_inquiries (
      product_slug, source,
      company, contact_name, contact_role, email, phone,
      current_packaging, box_dimensions, board_style,
      print_requirements, weight_limit, pallet_pattern,
      shipping_address, ordering_contact, notes,
      ip_address, user_agent,
      utm_source, utm_medium, utm_campaign,
      status, assigned_to
    ) VALUES (
      $1, $2,
      $3, $4, $5, $6, $7,
      $8, $9, $10,
      $11, $12, $13,
      $14, $15, $16,
      $17, $18,
      $19, $20, $21,
      'new', 'hector'
    )
    RETURNING id, created_at
  `;
  const params = [
    product_slug || 'plastpac-ecocrate',
    source || 'loaf',
    company || null, contact_name || null, contact_role || null,
    email || null, phone || null,
    current_packaging || null, box_dimensions || null, board_style || null,
    print_requirements || null, weight_limit || null, pallet_pattern || null,
    shipping_address || null, ordering_contact || null, notes || null,
    ip_address || null, user_agent || null,
    utm_source || null, utm_medium || null, utm_campaign || null
  ];

  const r = await pool.query(q, params);
  return r.rows[0];
}

// ----------------------------------------------------------------------------
// Email templates
// ----------------------------------------------------------------------------
function emailToSalesRep(inquiry) {
  const subject = `[EcoCrate Lead] ${inquiry.company || inquiry.contact_name || 'New inquiry'}`;
  const lines = [
    'New EcoCrate inquiry from loaf.mexausafg.com',
    '',
    `Inquiry ID:        #${inquiry.id}`,
    `Submitted:         ${inquiry.created_at}`,
    '',
    '--- CONTACT ---',
    `Company:           ${inquiry.company || ''}`,
    `Contact name:      ${inquiry.contact_name || ''}`,
    `Role:              ${inquiry.contact_role || ''}`,
    `Email:             ${inquiry.email || ''}`,
    `Phone:             ${inquiry.phone || ''}`,
    '',
    '--- CURRENT PACKAGING ---',
    `Type:              ${inquiry.current_packaging || ''}`,
    `Box dimensions:    ${inquiry.box_dimensions || ''}`,
    `Board style:       ${inquiry.board_style || ''}`,
    `Print req:         ${inquiry.print_requirements || ''}`,
    `Weight limit:      ${inquiry.weight_limit || ''}`,
    `Pallet pattern:    ${inquiry.pallet_pattern || ''}`,
    '',
    '--- SAMPLE / ORDERING ---',
    `Shipping address:  ${inquiry.shipping_address || ''}`,
    `Ordering contact:  ${inquiry.ordering_contact || ''}`,
    '',
    '--- NOTES ---',
    inquiry.notes || '(none)',
    '',
    '--- ACTION ---',
    'Open in CRM:       https://mexausafg.com/crm/inquiries/' + inquiry.id,
    'Reply now:         mailto:' + (inquiry.email || ''),
    '',
    'Distributed by DEVAN, INC.  -  Mexausa Food Group platform'
  ];
  return { subject, text: lines.join('\n') };
}

function emailAutoReply(inquiry) {
  const subject = 'Thank you for your EcoCrate inquiry - Plastpac / DEVAN, INC.';
  const html = `
<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#0F1419">
  <div style="background:#0F7B41;color:#fff;padding:24px 28px;border-radius:6px 6px 0 0">
    <div style="font-size:13px;opacity:.85">EcoCrate by Plastpac &middot; Distributed by DEVAN, INC.</div>
    <div style="font-size:24px;font-weight:700;margin-top:6px">Thank you, ${inquiry.contact_name || 'there'}</div>
  </div>
  <div style="background:#F4F6F4;padding:24px 28px;border:1px solid #D4DBD3;border-top:none">
    <p>We received your EcoCrate inquiry on behalf of <b>${inquiry.company || 'your company'}</b> and will follow up shortly with sample sizing and a packaging recommendation.</p>
    <p style="margin-top:16px"><b>Why EcoCrate?</b><br>
    Smart, reusable packaging for agriculture, food, retail, and transport. Durable and heavy-duty. 100% recyclable. Made in the USA. Waterproof. Custom sizes and printing. Reduces waste and prevents soggy or broken boxes.</p>
    <p style="margin-top:16px">If you have a current box spec sheet (dimensions, board style, print, weight, pallet pattern), reply with it attached and we will match a sample to your existing carton.</p>
  </div>
  <div style="border-left:4px solid #C9A55C;padding:14px 18px;background:#fff;border:1px solid #D4DBD3;border-top:none;border-radius:0 0 6px 6px">
    <div style="font-weight:700;color:#0F7B41">Hector Mariscal</div>
    <div style="font-size:13px">Account Executive of Sales and Distribution</div>
    <div style="font-size:13px">West Coast and Mexico</div>
    <div style="font-size:13px;margin-top:6px"><b>DEVAN, INC.</b> &middot; 831-998-0374 &middot; h11mariscal@gmail.com</div>
  </div>
</div>`;
  const text = [
    `Thank you, ${inquiry.contact_name || 'there'}.`,
    '',
    `We received your EcoCrate inquiry on behalf of ${inquiry.company || 'your company'} and will follow up shortly with sample sizing and a packaging recommendation.`,
    '',
    'Why EcoCrate? Smart, reusable packaging for agriculture, food, retail, and transport. Durable and heavy-duty. 100% recyclable. Made in the USA. Waterproof. Custom sizes and printing. Reduces waste and prevents soggy or broken boxes.',
    '',
    'If you have a current box spec sheet (dimensions, board style, print, weight, pallet pattern), reply with it attached and we will match a sample to your existing carton.',
    '',
    'Hector Mariscal',
    'Account Executive of Sales and Distribution; West Coast and Mexico',
    'DEVAN, INC.  -  831-998-0374  -  h11mariscal@gmail.com'
  ].join('\n');
  return { subject, html, text };
}

// ----------------------------------------------------------------------------
// Send notifications: Hector + Saul + auto-reply to inquirer
// ----------------------------------------------------------------------------
async function fireEmails(inquiry, notifyEmails) {
  const m = buildMailer();
  if (!m) {
    console.error('[plastpac] no mailer configured - skipping emails');
    return { hector: false, saul: false, auto: false };
  }

  const result = { hector: false, saul: false, auto: false };

  // 1) Sales rep + Saul
  const repMsg = emailToSalesRep(inquiry);
  for (const to of (notifyEmails || ['h11mariscal@gmail.com', 'sgarcia1911@gmail.com'])) {
    try {
      await m.sendMail({
        from: `"${FROM_NAME}" <${FROM_ADDR}>`,
        to,
        subject: repMsg.subject,
        text: repMsg.text
      });
      if (to === 'h11mariscal@gmail.com') result.hector = true;
      if (to === 'sgarcia1911@gmail.com') result.saul = true;
    } catch (err) {
      console.error(`[plastpac] failed to send to ${to}:`, err.message);
    }
  }

  // 2) Auto-confirmation to inquirer
  if (inquiry.email) {
    try {
      const auto = emailAutoReply(inquiry);
      await m.sendMail({
        from: `"DEVAN, INC. on behalf of ${FROM_NAME}" <${FROM_ADDR}>`,
        to: inquiry.email,
        replyTo: 'h11mariscal@gmail.com',
        subject: auto.subject,
        html: auto.html,
        text: auto.text
      });
      result.auto = true;
    } catch (err) {
      console.error(`[plastpac] auto-reply to ${inquiry.email} failed:`, err.message);
    }
  }

  // 3) Mark notified
  try {
    await pool.query('UPDATE plastpac_inquiries SET notified_at = NOW() WHERE id = $1', [inquiry.id]);
  } catch (err) {
    console.error('[plastpac] update notified_at failed:', err.message);
  }

  return result;
}

// ----------------------------------------------------------------------------
// Public: handle a fresh inquiry from the LOAF page
// ----------------------------------------------------------------------------
async function handleInquiry(data) {
  // 1. Persist
  const saved = await saveInquiry(data);
  const fullInquiry = { ...data, id: saved.id, created_at: saved.created_at };

  // Fire 11-stage gatekeeper pipeline (fire-and-forget; does not block HTTP response)
  if (runPipeline) {
    setImmediate(() => {
      runPipeline({
        request_type: 'plastpac.inquiry',
        source: 'loaf',
        payload: { ...fullInquiry, _meta: { fired_from: 'plastpac-inquiry.handleInquiry', fired_at: new Date().toISOString() } }
      }).then(r => {
        console.log('[plastpac] gatekeeper run inquiry=' + saved.id + ' ok=' + (r && r.ok) + ' run_id=' + (r && r.run_id));
      }).catch(e => {
        console.error('[plastpac] gatekeeper failed inquiry=' + saved.id + ' err=' + e.message);
      });
    });
  }

  // 2. Route by source: EcoCrate-related = Hector + Saul. LOAF advertising/ops = Saul only.
  const src  = String(data.source || '').toLowerCase();
  const slug = String(data.product_slug || '').toLowerCase();
  const isEcoCrateLead =
    slug.includes('ecocrate') || slug.includes('plastpac') ||
    src.includes('ecocrate')  || src.includes('plastpac')  ||
    src === 'loaf-quick-contact' || src === 'loaf';

  let notifyEmails = isEcoCrateLead
    ? ['h11mariscal@gmail.com', 'sgarcia1911@gmail.com']
    : ['sgarcia1911@gmail.com'];

  // Per-product override only applies to EcoCrate-style leads
  if (isEcoCrateLead) {
    try {
      const r = await pool.query(
        "SELECT notify_emails FROM platform_products WHERE slug = $1",
        [data.product_slug || 'plastpac-ecocrate']
      );
      if (r.rows[0] && Array.isArray(r.rows[0].notify_emails) && r.rows[0].notify_emails.length) {
        notifyEmails = r.rows[0].notify_emails;
      }
    } catch (err) {
      console.error('[plastpac] product lookup failed:', err.message);
    }
  }

  console.log('[plastpac] route source=' + src + ' slug=' + slug + ' isEcoCrate=' + isEcoCrateLead + ' notify=' + JSON.stringify(notifyEmails));

  // 3. Fire emails
  const emailResult = await fireEmails(fullInquiry, notifyEmails);

  // 4. Brain notification (4-channel notifier)
  if (notifier && notifier.high) {
    try {
      await notifier.high(
        'PLASTPAC',
        `New EcoCrate inquiry from ${data.company || data.contact_name || 'unknown'}`,
        {
          inquiry_id: saved.id,
          company: data.company,
          contact: data.contact_name,
          email: data.email,
          phone: data.phone,
          email_result: emailResult
        },
        'plastpac.inquiry.new'
      );
    } catch (err) {
      console.error('[plastpac] notifier.high failed:', err.message);
    }
  }

  return {
    ok: true,
    inquiry_id: saved.id,
    created_at: saved.created_at,
    emails: emailResult
  };
}

// ----------------------------------------------------------------------------
// Stats / list helpers (for CRM tabs)
// ----------------------------------------------------------------------------
async function listInquiries({ status, assigned_to, limit = 50, offset = 0 } = {}) {
  let q = 'SELECT * FROM plastpac_inquiries WHERE 1=1';
  const p = [];
  if (status) { p.push(status); q += ` AND status = $${p.length}`; }
  if (assigned_to) { p.push(assigned_to); q += ` AND assigned_to = $${p.length}`; }
  q += ' ORDER BY created_at DESC';
  p.push(limit); q += ` LIMIT $${p.length}`;
  p.push(offset); q += ` OFFSET $${p.length}`;
  const r = await pool.query(q, p);
  return r.rows;
}

async function getStats() {
  const r = await pool.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'new')::int AS new_count,
      COUNT(*) FILTER (WHERE status = 'contacted')::int AS contacted,
      COUNT(*) FILTER (WHERE status = 'qualified')::int AS qualified,
      COUNT(*) FILTER (WHERE status = 'closed')::int AS closed,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::int AS last_24h,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS last_7d
    FROM plastpac_inquiries
  `);
  return r.rows[0];
}

async function updateStatus(id, status, note) {
  const r = await pool.query(
    'UPDATE plastpac_inquiries SET status = $1, notes = COALESCE(notes,\'\') || $2, updated_at = NOW() WHERE id = $3 RETURNING *',
    [status, note ? `\n[${new Date().toISOString()}] ${note}` : '', id]
  );
  return r.rows[0];
}

module.exports = {
  handleInquiry,
  listInquiries,
  getStats,
  updateStatus,
  saveInquiry,
  fireEmails
};
