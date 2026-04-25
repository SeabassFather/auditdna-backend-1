// C:\AuditDNA\backend\services\factor-matchmaker-service.js
// Sprint C Phase 3 - Factor Matchmaker brain wired to Claude Opus 4.7
// HARDENED: harvest window from yields, server-side bucket math, PII stripping

const Anthropic = require('@anthropic-ai/sdk');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
const prompts = require('../prompts/factor-matchmaker-prompts');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL_SCORE = process.env.MATCHMAKER_MODEL || 'claude-opus-4-7';
const MODEL_DRAFT = process.env.OUTREACH_MODEL || 'claude-haiku-4-5-20251001';

const NDA_DOCX_PATH = path.join(__dirname, '..', 'docs', 'AuditDNA_Mutual_NDA_and_NonCircumvention.docx');
const COMMISSION_DOCX_PATH = path.join(__dirname, '..', 'docs', 'AuditDNA_Referral_Commission_Agreement.docx');

function getMailer() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: true,
    auth: {
      user: process.env.SMTP_USER || 'sgarcia1911@gmail.com',
      pass: process.env.SMTP_PASS
    }
  });
}

async function ntfyPush(title, message, priority = 'default') {
  const channel = process.env.NTFY_CHANNEL || 'auditdna-agro-saul2026';
  try {
    const f = await fetch('https://ntfy.sh/' + channel, {
      method: 'POST',
      headers: { 'Title': title, 'Priority': priority, 'Tags': 'factor,auditdna' },
      body: message
    });
    return f.ok;
  } catch (e) { console.warn('[NTFY]', e.message); return false; }
}

// Round invoice to nearest $25K bucket, return as range string
function bucketInvoice(amount) {
  const a = parseFloat(amount);
  if (!a || isNaN(a)) return 'undisclosed';
  const lower = Math.floor(a / 25000) * 25000;
  const upper = lower + 25000;
  return '$' + (lower / 1000) + 'K-$' + (upper / 1000) + 'K';
}

// Strip specific region down to country only (anonymity defense in depth)
function bucketRegion(region, country) {
  if (!region && !country) return 'undisclosed';
  if (country && country.toLowerCase().includes('mexico')) return 'Mexico';
  if (country && country.toLowerCase().includes('united states')) return 'United States';
  if (country) return country;
  // Last resort: extract country from region string
  if (region && region.toLowerCase().includes('mexico')) return 'Mexico';
  if (region && region.toLowerCase().includes('usa')) return 'United States';
  return 'undisclosed';
}

// Build harvest window string from yield prediction or fallback to "TBD"
async function getHarvestWindow(pool, deal) {
  if (deal.source_type !== 'predict' || !deal.grower_id) return null;
  try {
    const q = await pool.query(
      "SELECT harvest_window_start, harvest_window_end, year, product " +
      "FROM grower_intel_yields " +
      "WHERE grower_id=$1 AND product=$2 " +
      "ORDER BY id DESC LIMIT 1",
      [deal.grower_id, deal.commodity]
    );
    if (q.rows.length === 0) return null;
    const row = q.rows[0];
    if (row.harvest_window_start && row.harvest_window_end) {
      const start = new Date(row.harvest_window_start);
      const end = new Date(row.harvest_window_end);
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return months[start.getMonth()] + ' ' + start.getDate() + ' - ' + months[end.getMonth()] + ' ' + end.getDate() + ', ' + start.getFullYear();
    }
    // prediction_data column removed - branch dead code retained for clarity
    return null;
  } catch (e) { console.warn('[HARVEST_WINDOW]', e.message); return null; }
}

async function scoreDeals({ pool, deal_id }) {
  if (!pool) throw new Error('pool required');
  if (!deal_id) throw new Error('deal_id required');

  const dealQ = await pool.query('SELECT * FROM financing_deals WHERE id=$1', [deal_id]);
  if (dealQ.rows.length === 0) throw new Error('deal not found');
  const deal = dealQ.rows[0];

  const partnersQ = await pool.query(
    "SELECT fp.id, fp.partner_id, fp.name, fp.contact_name, fp.email, " +
    "fp.advance_rate, fp.fee_rate, fp.min_invoice, fp.max_invoice, " +
    "fp.industries, fp.region, fp.paca_licensed, fp.waterfall_order, " +
    "COALESCE(fpa.exempt, false) AS exempt, " +
    "COALESCE(fpa.nda_status, 'NOT_SENT') AS nda_status, " +
    "COALESCE(fpa.commission_status, 'NOT_SENT') AS commission_status " +
    "FROM factoring_partners fp " +
    "LEFT JOIN factor_partner_agreements fpa ON fp.partner_id = fpa.partner_id " +
    "WHERE fp.active = true " +
    "ORDER BY fp.waterfall_order"
  );

  const userPayload = {
    deal: {
      id: deal.id,
      commodity: deal.commodity,
      volume_lbs: deal.volume_lbs,
      invoice_amount: deal.invoice_amount,
      invoice_bucket: bucketInvoice(deal.invoice_amount),
      status: deal.status,
      stage: deal.stage,
      source_type: deal.source_type
    },
    partners: partnersQ.rows.map(p => ({
      partner_id: p.partner_id,
      name: p.name,
      waterfall_order: p.waterfall_order,
      advance_rate: p.advance_rate,
      fee_rate: p.fee_rate,
      min_invoice: p.min_invoice,
      max_invoice: p.max_invoice,
      industries: p.industries,
      region: p.region,
      paca_licensed: p.paca_licensed,
      agreement_status: {
        exempt: p.exempt,
        nda_status: p.nda_status,
        commission_status: p.commission_status
      }
    }))
  };

  const response = await anthropic.messages.create({
    model: MODEL_SCORE,
    max_tokens: 4000,
    system: prompts.matchmakerSystem,
    messages: [{ role: 'user', content: 'Score this deal against the partner pool. Return ONLY JSON:\n\n' + JSON.stringify(userPayload, null, 2) }]
  });

  let raw = '';
  for (const block of response.content) { if (block.type === 'text') raw += block.text; }
  raw = raw.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

  let scoring;
  try { scoring = JSON.parse(raw); }
  catch (e) { throw new Error('Claude returned invalid JSON: ' + raw.substring(0, 300)); }

  return { scoring, deal_id, model: MODEL_SCORE };
}

async function draftPartnerOutreach({ pool, deal_id, partner_id, outreach_type }) {
  const dealQ = await pool.query('SELECT * FROM financing_deals WHERE id=$1', [deal_id]);
  if (dealQ.rows.length === 0) throw new Error('deal not found');
  const deal = dealQ.rows[0];

  const partnerQ = await pool.query(
    "SELECT fp.*, fpa.exempt, fpa.nda_status, fpa.commission_status, " +
    "fpa.commission_rate_year1, fpa.commission_rate_trail, fpa.first_look_hours " +
    "FROM factoring_partners fp " +
    "LEFT JOIN factor_partner_agreements fpa ON fp.partner_id = fpa.partner_id " +
    "WHERE fp.partner_id = $1",
    [partner_id]
  );
  if (partnerQ.rows.length === 0) throw new Error('partner not found');
  const partner = partnerQ.rows[0];

  if (!outreach_type) {
    if (partner.exempt) outreach_type = 'FULL_PACKAGE';
    else if (partner.nda_status === 'SIGNED' && partner.commission_status === 'SIGNED') outreach_type = 'FULL_PACKAGE';
    else if (partner.nda_status === 'NOT_SENT' && partner.commission_status === 'NOT_SENT') outreach_type = 'DOCUMENTS_FIRST';
    else outreach_type = 'TEASER_ONLY';
  }

  // Fetch harvest window (works for predict-source deals)
  const harvest_window = await getHarvestWindow(pool, deal);

  let grower = null;
  if (outreach_type === 'FULL_PACKAGE') {
    const growerQ = await pool.query(
      "SELECT id, " +
      "COALESCE(NULLIF(legal_name,''), NULLIF(trade_name,''), NULLIF(company_name,''), contact_name) AS name, " +
      "contact_name, email, phone, country, " +
      "COALESCE(state_province, state_region, region) AS region " +
      "FROM growers WHERE id=$1",
      [deal.grower_id]
    );
    if (growerQ.rows.length > 0) grower = growerQ.rows[0];
  }

  // Defense in depth: anonymized region for non-exempt
  let anonymizedRegion = null;
  if (outreach_type !== 'FULL_PACKAGE' && deal.grower_id) {
    const gQ = await pool.query("SELECT country, state_province, state_region, region FROM growers WHERE id=$1", [deal.grower_id]);
    if (gQ.rows.length > 0) {
      anonymizedRegion = bucketRegion(gQ.rows[0].state_province || gQ.rows[0].region, gQ.rows[0].country);
    }
  }

  const userPayload = {
    deal: {
      id: deal.id,
      commodity: deal.commodity,
      volume_lbs: deal.volume_lbs,
      invoice_amount: deal.invoice_amount,
      invoice_bucket: bucketInvoice(deal.invoice_amount),
      stage: deal.stage,
      source_type: deal.source_type,
      harvest_window: harvest_window || 'TBD - awaiting grower confirmation',
      anonymized_region: anonymizedRegion
    },
    partner: {
      partner_id: partner.partner_id,
      name: partner.name,
      contact_name: partner.contact_name,
      email: partner.email,
      first_look_hours: partner.first_look_hours || 72,
      commission_rate_year1: partner.commission_rate_year1 || 15,
      commission_rate_trail: partner.commission_rate_trail || 5
    },
    grower: grower,
    outreach_type
  };

  const response = await anthropic.messages.create({
    model: MODEL_DRAFT,
    max_tokens: 3000,
    system: prompts.partnerOutreachSystem,
    messages: [{ role: 'user', content: 'Draft the outreach email per the rules. Return ONLY JSON:\n\n' + JSON.stringify(userPayload, null, 2) }]
  });

  let raw = '';
  for (const block of response.content) { if (block.type === 'text') raw += block.text; }
  raw = raw.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

  const draft = JSON.parse(raw);
  draft.outreach_type = outreach_type;
  draft.partner_id = partner_id;
  draft.deal_id = deal_id;
  draft.harvest_window_used = harvest_window || 'TBD';
  draft.invoice_bucket_used = bucketInvoice(deal.invoice_amount);
  return draft;
}

async function executeOutreach({ pool, deal_id, partner_id, draft, dryRun = false }) {
  const partnerQ = await pool.query('SELECT * FROM factoring_partners WHERE partner_id=$1', [partner_id]);
  if (partnerQ.rows.length === 0) throw new Error('partner not found');
  const partner = partnerQ.rows[0];

  const attachments = [];
  if (draft.outreach_type === 'DOCUMENTS_FIRST') {
    if (fs.existsSync(NDA_DOCX_PATH)) {
      attachments.push({ filename: 'AuditDNA_Mutual_NDA_and_NonCircumvention.docx', path: NDA_DOCX_PATH });
    }
    if (fs.existsSync(COMMISSION_DOCX_PATH)) {
      attachments.push({ filename: 'AuditDNA_Referral_Commission_Agreement.docx', path: COMMISSION_DOCX_PATH });
    }
  }

  if (dryRun) {
    return { dryRun: true, would_send_to: partner.email, attachments: attachments.map(a => a.filename) };
  }

  const mailer = getMailer();
  const fromAddr = '"AuditDNA Factoring Desk" <' + (process.env.SMTP_USER || 'sgarcia1911@gmail.com') + '>';
  const sendResult = await mailer.sendMail({
    from: fromAddr,
    to: partner.email,
    bcc: 'sgarcia1911@gmail.com',
    replyTo: 'factoring@mexausafg.com',
    subject: draft.subject,
    text: draft.body_text,
    html: draft.body_html,
    attachments
  });

  const docType = draft.outreach_type === 'DOCUMENTS_FIRST' ? 'NDA_AND_COMMISSION' :
                  draft.outreach_type === 'TEASER_ONLY' ? 'TEASER' : 'FULL_LOI';
  const expires = new Date(Date.now() + (draft.expected_response_window_hours || 72) * 3600 * 1000);
  const insertResult = await pool.query(
    'INSERT INTO factor_deal_documents (deal_id, partner_id, doc_type, status, sent_at, expires_at, metadata) ' +
    "VALUES ($1, $2, $3, 'SENT', NOW(), $4, $5) RETURNING id",
    [deal_id, partner_id, docType, expires, JSON.stringify({
      subject: draft.subject,
      message_id: sendResult.messageId,
      outreach_type: draft.outreach_type,
      attachments: attachments.map(a => a.filename)
    })]
  );

  if (draft.outreach_type === 'DOCUMENTS_FIRST') {
    await pool.query(
      "UPDATE factor_partner_agreements SET nda_status='SENT', nda_sent_at=NOW(), commission_status='SENT', commission_sent_at=NOW(), updated_at=NOW() WHERE partner_id=$1",
      [partner_id]
    );
  }

  await ntfyPush('Factor Outreach Sent: ' + partner.name, 'Deal #' + deal_id + ' - ' + draft.outreach_type + ' - ' + partner.email, 'default');

  return {
    success: true,
    deal_id,
    partner_id,
    document_id: insertResult.rows[0].id,
    message_id: sendResult.messageId,
    outreach_type: draft.outreach_type,
    attachments_count: attachments.length
  };
}

module.exports = { scoreDeals, draftPartnerOutreach, executeOutreach, MODEL_SCORE, MODEL_DRAFT, bucketInvoice, bucketRegion };