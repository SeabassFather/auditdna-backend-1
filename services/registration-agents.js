// ============================================================================
// REGISTRATION AGENTS — Mexausa Food Group
// 3 SI agents that monitor, verify, and notify on every new registration
//
// SI-REG-1: Gate Keeper    — validates data completeness & quality
// SI-REG-2: Notifier       — fires ntfy smartwatch + email to Saul + admins
// SI-REG-3: CRM Classifier — auto-tags contact, assigns tier, pings Brain
// ============================================================================

const bcrypt   = require('bcrypt');
const pool     = require('../db');
const nodemailer = require('nodemailer');

const SMTP = { host:'smtp.gmail.com', port:587, secure:false,
  auth:{ user:'sgarcia1911@gmail.com', pass:process.env.GMAIL_APP_PASSWORD||'emgptqrmqdbxrpil' } };

const NTFY_TOPIC = process.env.NTFY_TOPIC || 'mexausa-saul';

const ADMINS = [
  'sgarcia1911@gmail.com',
  'palt@mfginc.com',
  'denisse@mfginc.com',
];

const ROLE_MAP = {
  grower:'grower', producer:'grower',
  buyer:'buyer', importer:'buyer', retailer:'buyer',
  wholesaler:'sales', distributor:'sales',
  broker:'sales', agent:'sales',
  shipper:'sales', packer:'sales',
  other:'sales'
};

// ── UTILITY ──────────────────────────────────────────────────────────────────
async function sendMail(to, subject, html, text) {
  const t = nodemailer.createTransport(SMTP);
  return t.sendMail({ from:'"Mexausa Platform" <sgarcia1911@gmail.com>', to, subject, html, text }).catch(()=>{});
}

async function pushNtfy(title, message, priority='high', tags=[]) {
  try {
    await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Title': title,
        'Priority': priority,
        'Tags': tags.join(',')
      },
      body: JSON.stringify({ topic:NTFY_TOPIC, message, title, priority, tags })
    });
  } catch(_) {}
}

// ── SI-REG-1: GATE KEEPER ─────────────────────────────────────────────────────
// Validates registration data quality and completeness
// Returns { valid, score, issues, tier }
async function gateKeeper(data) {
  const issues = [];
  let score = 100;

  // Required fields
  if (!data.companyLegal)  { issues.push('Missing company name');  score -= 30; }
  if (!data.contactEmail)  { issues.push('Missing email');          score -= 30; }
  if (!data.entityType)    { issues.push('Missing entity type');    score -= 15; }
  if (!data.contactName)   { issues.push('Missing contact name');   score -= 10; }
  if (!data.contactPhone)  { issues.push('Missing phone');          score -= 5;  }

  // Email format
  if (data.contactEmail && !/^[^@]+@[^@]+\.[^@]+$/.test(data.contactEmail)) {
    issues.push('Invalid email format'); score -= 25;
  }

  // Check for duplicate email in auth_users
  if (data.contactEmail) {
    const dup = await pool.query(
      'SELECT id FROM auth_users WHERE username ILIKE $1',
      [data.contactEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,20) + '%']
    ).catch(()=>({rows:[]}));
    if (dup.rows.length > 3) {
      issues.push('Possible duplicate registration');
      score -= 10;
    }
  }

  // Assign tier based on entity type and completeness
  let tier = 'standard';
  if (score >= 90 && data.ein) tier = 'verified';
  if (data.entityType === 'grower' && data.gapCert) tier = 'certified_grower';
  if (data.entityType === 'buyer' && data.ein) tier = 'verified_buyer';

  return {
    valid: score >= 60,
    score,
    issues,
    tier,
    entityType: data.entityType,
    role: ROLE_MAP[data.entityType] || 'sales'
  };
}

// ── SI-REG-2: NOTIFIER ────────────────────────────────────────────────────────
// Fires smartwatch push + email to Saul + all admins
async function notifier(data, validation, credentials) {
  const company = data.companyLegal || 'Unknown';
  const type    = (data.entityType || 'unknown').toUpperCase();
  const contact = data.contactName || data.contactEmail;
  const score   = validation.score;
  const tier    = validation.tier;

  // ── SMARTWATCH / PHONE — ntfy push ────────────────────────────────────────
  const ntfyPriority = score >= 90 ? 'high' : score >= 70 ? 'default' : 'low';
  const ntfyTags = [
    'bust_in_silhouette',
    type === 'GROWER' ? 'seedling' :
    type === 'BUYER'  ? 'shopping_cart' :
    type === 'BROKER' ? 'briefcase' : 'office_building'
  ];

  await pushNtfy(
    `NEW ${type} REGISTERED`,
    `${company} | ${contact} | Score: ${score}/100 | Tier: ${tier}\nCredentials sent to ${data.contactEmail}`,
    ntfyPriority,
    ntfyTags
  );

  // ── EMAIL TO SAUL + ADMINS ────────────────────────────────────────────────
  const issuesList = validation.issues.length
    ? '<ul>' + validation.issues.map(i => `<li style="color:#ef4444">${i}</li>`).join('') + '</ul>'
    : '<div style="color:#22c55e">All checks passed</div>';

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:620px">
      <div style="background:#0F1419;padding:18px 20px;display:flex;align-items:center;justify-content:space-between">
        <div style="color:#C9A55C;font-size:16px;font-weight:700">MEXAUSA — NEW REGISTRATION</div>
        <div style="background:${score>=90?'#0F7B41':score>=70?'#f59e0b':'#ef4444'};color:white;padding:4px 12px;border-radius:4px;font-size:11px;font-weight:700">Score: ${score}/100</div>
      </div>
      <div style="padding:20px;background:white;border:1px solid #e2e8f0">
        <table style="width:100%;font-size:13px;border-collapse:collapse">
          <tr style="background:#f8fafc"><td style="padding:8px;font-weight:700;color:#334155">Company</td><td style="padding:8px;color:#0F1419;font-weight:700">${company}</td></tr>
          <tr><td style="padding:8px;color:#64748b">Entity Type</td><td style="padding:8px;color:#C9A55C;font-weight:700;text-transform:uppercase">${type}</td></tr>
          <tr style="background:#f8fafc"><td style="padding:8px;color:#64748b">Contact</td><td style="padding:8px">${contact}</td></tr>
          <tr><td style="padding:8px;color:#64748b">Email</td><td style="padding:8px"><a href="mailto:${data.contactEmail}" style="color:#0F7B41">${data.contactEmail}</a></td></tr>
          <tr style="background:#f8fafc"><td style="padding:8px;color:#64748b">Phone</td><td style="padding:8px">${data.contactPhone||'N/A'}</td></tr>
          <tr><td style="padding:8px;color:#64748b">State</td><td style="padding:8px">${data.state||'N/A'}</td></tr>
          <tr style="background:#f8fafc"><td style="padding:8px;color:#64748b">EIN</td><td style="padding:8px">${data.ein||'Not provided'}</td></tr>
          <tr><td style="padding:8px;color:#64748b">Role Assigned</td><td style="padding:8px;font-weight:700">${validation.role}</td></tr>
          <tr style="background:#f8fafc"><td style="padding:8px;color:#64748b">Tier</td><td style="padding:8px;font-weight:700;color:#C9A55C">${tier}</td></tr>
        </table>
        <div style="margin:16px 0">
          <div style="font-size:11px;font-weight:700;color:#334155;margin-bottom:6px">SI-REG-1 GATE KEEPER RESULTS:</div>
          ${issuesList}
        </div>
        ${credentials ? `
        <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:6px;padding:14px;margin:16px 0">
          <div style="font-size:11px;font-weight:700;color:#166534;margin-bottom:8px">CREDENTIALS AUTO-GENERATED & SENT</div>
          <div style="font-family:monospace;font-size:12px;color:#334155">
            Password: ${credentials.password}<br/>
            Access Code: ${credentials.accessCode}<br/>
            PIN: ${credentials.pin}
          </div>
        </div>` : ''}
        <div style="margin-top:16px;text-align:center">
          <a href="https://mexausafg.com" style="background:#0F7B41;color:white;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:700;font-size:13px">View in AuditDNA</a>
        </div>
      </div>
      <div style="padding:10px 20px;background:#f8fafc;font-size:10px;color:#94a3b8">
        Mexausa Food Group, Inc. &middot; EIN 88-1698129 &middot; mexausafg.com &middot; SI-REG-2 Notifier Agent
      </div>
    </div>`;

  await sendMail(
    ADMINS.join(','),
    `[NEW ${type}] ${company} — Score ${score}/100 — ${tier}`,
    html
  );
}

// ── SI-REG-3: CRM CLASSIFIER ──────────────────────────────────────────────────
// Auto-tags contact in CRM, assigns tier, fires Brain event
async function crmClassifier(data, validation) {
  try {
    // Update or insert in contacts with full classification
    await pool.query(`
      INSERT INTO contacts (company_name, email, phone, state, country,
        crmtype, source, notes, is_active)
      VALUES ($1,$2,$3,$4,'US',$5,'Platform Self-Registration',$6,true)
      ON CONFLICT (email) DO UPDATE SET
        company_name=EXCLUDED.company_name,
        crmtype=EXCLUDED.crmtype,
        notes=EXCLUDED.notes,
        updated_at=NOW()`,
      [
        data.companyLegal,
        data.contactEmail,
        data.contactPhone||'',
        data.state||'',
        validation.role,
        `Tier: ${validation.tier}. Score: ${validation.score}. Type: ${data.entityType}. EIN: ${data.ein||'N/A'}. Registered via mexausafg.com.`
      ]
    ).catch(()=>{});

    // Fire Brain event
    await pool.query(`
      INSERT INTO brain_events (event_type, payload, source, created_at)
      VALUES ('NEW_REGISTRATION', $1, 'SI-REG-3', NOW())`,
      [JSON.stringify({
        company: data.companyLegal,
        email: data.contactEmail,
        entityType: data.entityType,
        role: validation.role,
        tier: validation.tier,
        score: validation.score
      })]
    ).catch(()=>{});

    // Tag commodity interest
    if (data.interests && data.interests.length) {
      for (const interest of data.interests.slice(0,5)) {
        await pool.query(`
          INSERT INTO contact_commodity_tags (email, commodity, contact_type, country)
          VALUES ($1,$2,$3,'US') ON CONFLICT DO NOTHING`,
          [data.contactEmail, interest.toLowerCase(), validation.role]
        ).catch(()=>{});
      }
    }
  } catch(_) {}
}

// ── MAIN EXPORT — run all 3 agents in sequence ────────────────────────────────
async function runRegistrationAgents(data, credentials) {
  console.log('[SI-REG] Running 3 registration agents for:', data.companyLegal, data.contactEmail);

  // Agent 1: Gate Keeper
  const validation = await gateKeeper(data);
  console.log(`[SI-REG-1] Score: ${validation.score}/100 | Valid: ${validation.valid} | Issues: ${validation.issues.length}`);

  // Agent 2: Notifier (smartwatch + email)
  await notifier(data, validation, credentials);
  console.log('[SI-REG-2] Notifications sent — ntfy + email to admins');

  // Agent 3: CRM Classifier
  await crmClassifier(data, validation);
  console.log('[SI-REG-3] CRM classified + Brain event fired');

  return validation;
}

module.exports = { runRegistrationAgents, gateKeeper, notifier, crmClassifier };
