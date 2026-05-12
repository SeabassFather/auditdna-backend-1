const express = require('express');
const { runRegistrationAgents } = require('../services/registration-agents');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

const SMTP = { host:'smtp.gmail.com', port:587, secure:false,
  auth:{ user:'sgarcia1911@gmail.com', pass:process.env.GMAIL_APP_PASSWORD||'emgptqrmqdbxrpil' } };

// Role mapping from entityType
const ROLE_MAP = {
  grower:'grower', producer:'grower',
  buyer:'buyer', importer:'buyer', retailer:'buyer',
  wholesaler:'sales', distributor:'sales',
  broker:'sales', agent:'sales',
  shipper:'sales', packer:'sales', handler:'sales',
  other:'sales'
};

// Generate random access code and PIN
function genCode(prefix) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = prefix || '';
  for(let i=0;i<6;i++) c += chars[Math.floor(Math.random()*chars.length)];
  return c;
}
function genPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}
function genPassword(name) {
  const word = (name||'User').replace(/[^a-zA-Z]/g,'').slice(0,8) || 'Mexausa';
  const num = Math.floor(100 + Math.random()*900);
  const sym = ['#','@','!','$'][Math.floor(Math.random()*4)];
  return word.charAt(0).toUpperCase() + word.slice(1) + num + sym;
}

router.post('/register-request', async (req, res) => {
  const { entityType, companyLegal, ein, state, city,
    contactName, contactEmail, contactPhone,
    gapCert, globalGap, sqf, brc, fsmaTeir,
    waterTests, soilTests, traceability, notes } = req.body;

  if (!companyLegal || !contactEmail) {
    return res.status(400).json({ error: 'Company name and email required' });
  }

  const role = ROLE_MAP[entityType] || 'sales';
  const displayName = contactName || companyLegal;

  // Generate credentials
  const password  = genPassword(contactName || companyLegal);
  const accessCode = genCode(companyLegal.replace(/[^A-Z]/gi,'').slice(0,3).toUpperCase());
  const pin = genPin();
  const username = contactEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,20) +
                   Math.floor(10+Math.random()*90);
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    // Save to auth_users
    const existing = await pool.query('SELECT id FROM auth_users WHERE username=$1', [username]);
    if (existing.rows.length) {
      // Append number to make unique
      const u2 = username + Math.floor(10+Math.random()*90);
      await pool.query(`
        INSERT INTO auth_users (username,password_hash,access_code,pin,display_name,role,is_active,tier)
        VALUES ($1,$2,$3,$4,$5,$6,true,$7)`,
        [u2, passwordHash, accessCode, pin, displayName, role, entityType||'sales']
      );
    } else {
      await pool.query(`
        INSERT INTO auth_users (username,password_hash,access_code,pin,display_name,role,is_active,tier)
        VALUES ($1,$2,$3,$4,$5,$6,true,$7)`,
        [username, passwordHash, accessCode, pin, displayName, role, entityType||'sales']
      );
    }

    // Also save to contacts/CRM
    await pool.query(`
      INSERT INTO contacts (company_name, email, phone, state, country, crmtype, source, notes)
      VALUES ($1,$2,$3,$4,'US',$5,'Platform Registration',$6)
      ON CONFLICT DO NOTHING`,
      [companyLegal, contactEmail, contactPhone||'', state||'', entityType||'other',
       `Registered via mexausafg.com. Entity: ${entityType}. EIN: ${ein||'N/A'}.`]
    ).catch(()=>{});

    // Email credentials to the registrant
    const t = nodemailer.createTransport(SMTP);
    await t.sendMail({
      from: '"Mexausa Food Group" <sgarcia1911@gmail.com>',
      to: contactEmail,
      subject: 'Welcome to AuditDNA — Your Login Credentials',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#0F1419;padding:24px;text-align:center">
            <div style="color:#C9A55C;font-size:22px;font-weight:700;letter-spacing:2px">MEXAUSA FOOD GROUP</div>
            <div style="color:white;font-size:13px;margin-top:4px">AuditDNA Platform — Welcome</div>
          </div>
          <div style="padding:24px;background:white">
            <p style="font-size:14px;color:#334155">Hello <strong>${displayName}</strong>,</p>
            <p style="font-size:13px;color:#475569">Your account has been created on the AuditDNA platform. Here are your login credentials:</p>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:20px 0">
              <table style="width:100%;font-size:13px">
                <tr><td style="color:#64748b;padding:6px 0">Platform URL:</td><td><a href="https://mexausafg.com" style="color:#0F7B41;font-weight:700">mexausafg.com</a></td></tr>
                <tr><td style="color:#64748b;padding:6px 0">Password:</td><td style="font-weight:700;color:#0F1419;font-family:monospace">${password}</td></tr>
                <tr><td style="color:#64748b;padding:6px 0">Access Code:</td><td style="font-weight:700;color:#0F1419;font-family:monospace">${accessCode}</td></tr>
                <tr><td style="color:#64748b;padding:6px 0">PIN:</td><td style="font-weight:700;color:#0F1419;font-family:monospace">${pin}</td></tr>
                <tr><td style="color:#64748b;padding:6px 0">Account Type:</td><td style="font-weight:700;color:#C9A55C;text-transform:uppercase">${entityType || 'Platform Member'}</td></tr>
              </table>
            </div>
            <p style="font-size:12px;color:#64748b">Keep these credentials safe. Do not share them. You can change your password after logging in.</p>
            <div style="margin:24px 0;text-align:center">
              <a href="https://mexausafg.com" style="background:#0F7B41;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px">Login to AuditDNA</a>
            </div>
          </div>
          <div style="background:#f1f5f9;padding:14px 24px;font-size:11px;color:#94a3b8;text-align:center">
            Mexausa Food Group, Inc. &middot; EIN 88-1698129 &middot; mexausafg.com &middot; +1 831-251-3116<br/>
            ${contactEmail} &middot; ${companyLegal}
          </div>
        </div>
      `
    });

    // Alert Saul
    await t.sendMail({
      from: '"Mexausa Platform" <sgarcia1911@gmail.com>',
      to: 'sgarcia1911@gmail.com',
      subject: `[NEW REGISTRATION] ${companyLegal} — ${entityType?.toUpperCase()}`,
      text: `NEW PLATFORM REGISTRATION

Company: ${companyLegal}
Entity Type: ${entityType}
Contact: ${contactName}
Email: ${contactEmail}
Phone: ${contactPhone||'N/A'}
State: ${state||'N/A'}
EIN: ${ein||'N/A'}

Credentials sent to: ${contactEmail}
Role assigned: ${role}

View at mexausafg.com`
    });

    // Auto-enroll in Ping Spot consent pool based on entity type
    setImmediate(async () => {
      try {
        const consensTypes = {
          grower:['product_available','call_for_tender','price_alert','market_intel','compliance_update'],
          buyer:['product_available','call_for_tender','price_alert','market_intel','financing_available'],
          wholesaler:['product_available','call_for_tender','price_alert','market_intel','financing_available'],
          broker:['product_available','call_for_tender','price_alert','market_intel','deal_opportunity'],
          shipper:['freight_opportunity','product_available','compliance_update'],
          retailer:['product_available','call_for_tender','price_alert'],
          packer:['product_available','call_for_tender','compliance_update'],
          distributor:['product_available','call_for_tender','price_alert','market_intel'],
          other:['product_available','market_intel'],
        };
        const cTypes = consensTypes[entityType||'other'] || ['product_available','market_intel'];
        await pool.query(`
          INSERT INTO ping_consents (email,company_name,entity_type,contact_name,phone,state,consent_types,source)
          VALUES ($1,$2,$3,$4,$5,$6,$7,'registration')
          ON CONFLICT (email) DO UPDATE SET entity_type=EXCLUDED.entity_type, consent_types=EXCLUDED.consent_types`,
          [contactEmail, companyLegal, entityType||'other', contactName||'',
           contactPhone||'', state||'', cTypes]
        ).catch(()=>{});
      } catch(_) {}
    });
    // Fire all 3 SI registration agents async
    setImmediate(() => {
      runRegistrationAgents(req.body, { password, accessCode, pin }).catch(()=>{});
    });
    res.json({ ok: true, message: 'Registration complete. Credentials sent to ' + contactEmail });
  } catch(e) {
    console.error('[register-request]', e.message);
    // Fire notifier even on partial failure
    setImmediate(() => {
      runRegistrationAgents(req.body, null).catch(()=>{});
    });
    // Still return success to user — don't expose errors
    res.json({ ok: true, message: 'Registration received. You will be contacted shortly.' });
  }
});

module.exports = router;
