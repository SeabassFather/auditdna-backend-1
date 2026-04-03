// C:\AuditDNA\backend\routes\onboarding.js
// Phase 1: Lead Capture   | Phase 2: KYC Verification   | Phase 3: Tier Selection
// Phase 4: Legal Docs     | Phase 5: Payment + Billing   | Phase 6: Tenant Provisioning
// Phase 7: Onboarding Wizard (All 6 Steps) | Phase 8: Brain Activation
// Phase 9: Back Office Automation           | Phase 10: Renewal + Offboarding
// Brain API: POST /api/brain/event (NOT /api/brain/log)

const express = require('express');
const router = express.Router();
const pool = require('../db');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// ─── SMTP TRANSPORTER ──────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtpout.secureserver.net',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true,
  auth: {
    user: process.env.SMTP_USER || 'saul@mexausafg.com',
    pass: process.env.SMTP_PASS || 'KongKing#321'
  }
});

// ─── FILE UPLOAD CONFIG ─────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '..', 'uploads', 'kyc');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const unique = crypto.randomBytes(16).toString('hex');
    cb(null, `${unique}_${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Only JPG, PNG, PDF files allowed'));
  }
});

// ─── HELPERS ───────────────────────────────────────────────────────────────────
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function fireBrainEvent(event_type, payload, tenant_id = null) {
  try {
    await pool.query(
      `INSERT INTO brain_events (event_type, payload, source, tenant_id)
       VALUES ($1, $2, $3, $4)`,
      [event_type, JSON.stringify(payload), 'onboarding', tenant_id]
    );
  } catch (err) {
    console.error('[BRAIN] Event fire failed:', event_type, err.message);
  }
}

function calculateKYCScore(kyc) {
  let score = 0;

  // Government ID — up to 25 pts
  if (kyc.gov_id_front_path && kyc.gov_id_back_path) score += 25;
  else if (kyc.gov_id_front_path) score += 12;

  // Liveness check — 5 pts
  if (kyc.liveness_passed) score += 5;

  // Business identity — up to 20 pts
  if (kyc.legal_name && kyc.ein_rfc) score += 20;
  else if (kyc.legal_name) score += 10;

  // Contact verification — up to 15 pts
  if (kyc.email_verified) score += 10;
  if (kyc.phone_verified) score += 5;

  // Agricultural credentials — up to 15 pts
  if (kyc.usda_farm_id) score += 8;
  if (kyc.grower_reg_num) score += 4;
  if (kyc.fsma_status === 'compliant') score += 3;

  // Geolocation — up to 10 pts
  if (kyc.gps_lat && kyc.gps_lng) score += 7;
  if (kyc.country === 'US' || kyc.country === 'MX') score += 3;

  // OFAC cleared — 10 pts
  if (kyc.ofac_cleared) score += 10;

  return Math.min(score, 100);
}

function getKYCStatus(score) {
  if (score >= 80) return 'approved';
  if (score >= 50) return 'manual_review';
  return 'rejected';
}

// ─── OTP EMAIL TEMPLATE ────────────────────────────────────────────────────────
function otpEmailHTML(code, type = 'email') {
  return `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;background:#0f172a;font-family:sans-serif;padding:40px 20px">
      <div style="max-width:480px;margin:0 auto;background:#1e293b;border-radius:10px;
                  padding:36px;border:1px solid #334155">
        <div style="margin-bottom:24px">
          <span style="color:#cba658;font-size:13px;font-weight:500;letter-spacing:2px;
                       text-transform:uppercase">AuditDNA Platform</span>
        </div>
        <h2 style="color:#e2e8f0;margin:0 0 8px;font-weight:500;font-size:20px">
          Verification Code
        </h2>
        <p style="color:#94a3b0;margin:0 0 28px;font-size:14px;line-height:1.6">
          Use this code to verify your ${type === 'email' ? 'email address' : 'phone number'}.
          It expires in 10 minutes.
        </p>
        <div style="background:#0f172a;border:1px solid #334155;border-radius:8px;
                    padding:24px;text-align:center;margin-bottom:24px">
          <span style="color:#cba658;font-size:36px;font-weight:500;
                       letter-spacing:14px;font-variant-numeric:tabular-nums">
            ${code}
          </span>
        </div>
        <p style="color:#64748b;margin:0;font-size:12px;line-height:1.5">
          Never share this code. MexaUSA Food Group Inc. / Mexausa Food Group, Inc.
          NMLS #337526 will never ask for this code by phone or email.
        </p>
      </div>
    </body>
    </html>
  `;
}

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 1 — LEAD CAPTURE
// POST /api/onboarding/lead
// ══════════════════════════════════════════════════════════════════════════════
router.post('/lead', async (req, res) => {
  const { email, phone, crop_type, business_name, source, agent_id } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO tenant_leads (email, phone, crop_type, business_name, source, agent_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO UPDATE SET
         phone         = COALESCE(EXCLUDED.phone, tenant_leads.phone),
         crop_type     = COALESCE(EXCLUDED.crop_type, tenant_leads.crop_type),
         business_name = COALESCE(EXCLUDED.business_name, tenant_leads.business_name),
         agent_id      = COALESCE(EXCLUDED.agent_id, tenant_leads.agent_id),
         status        = CASE
                           WHEN tenant_leads.status = 'new' THEN 'returning'
                           ELSE tenant_leads.status
                         END,
         updated_at    = NOW()
       RETURNING id, email, status`,
      [email, phone || null, crop_type || null, business_name || null,
       source || 'direct', agent_id || null]
    );

    const lead = result.rows[0];

    await fireBrainEvent('lead_captured', {
      lead_id:      lead.id,
      email,
      crop_type,
      agent_id:     agent_id || null,
      source:       source || 'direct',
      is_returning: lead.status === 'returning'
    });

    // Welcome email
    try {
      await transporter.sendMail({
        from:    '"AuditDNA Platform" <saul@mexausafg.com>',
        to:      email,
        subject: 'Welcome to AuditDNA — Complete Your Registration',
        html:    `
          <body style="margin:0;background:#0f172a;font-family:sans-serif;padding:40px 20px">
            <div style="max-width:480px;margin:0 auto;background:#1e293b;border-radius:10px;
                        padding:36px;border:1px solid #334155">
              <span style="color:#cba658;font-size:12px;font-weight:500;letter-spacing:2px;
                           text-transform:uppercase">AuditDNA Platform</span>
              <h2 style="color:#e2e8f0;margin:16px 0 12px;font-weight:500">
                Your account is waiting
              </h2>
              <p style="color:#94a3b0;margin:0 0 24px;font-size:14px;line-height:1.6">
                Complete your registration to access the full AuditDNA agricultural
                intelligence platform — USDA data, FSMA traceability, cross-border
                trade tools, and back-office automation built for operators like you.
              </p>
              <a href="${process.env.REACT_APP_FRONTEND_URL || 'https://auditdna.netlify.app'}/onboarding"
                 style="display:inline-block;background:#cba658;color:#0f172a;padding:12px 28px;
                        border-radius:6px;text-decoration:none;font-weight:500;font-size:14px">
                Continue Registration
              </a>
              <p style="color:#64748b;margin:24px 0 0;font-size:11px">
                MexaUSA Food Group Inc. / Mexausa Food Group, Inc. NMLS #337526
              </p>
            </div>
          </body>
        `
      });
    } catch (mailErr) {
      console.error('[ONBOARDING] Welcome email failed:', mailErr.message);
    }

    res.json({ success: true, lead_id: lead.id });

  } catch (err) {
    console.error('[ONBOARDING] Lead capture error:', err);
    res.status(500).json({ error: 'Lead capture failed. Please try again.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 2 — OTP: SEND
// POST /api/onboarding/otp/send
// ══════════════════════════════════════════════════════════════════════════════
router.post('/otp/send', async (req, res) => {
  const { identifier, type } = req.body;

  if (!identifier || !['email', 'sms'].includes(type)) {
    return res.status(400).json({ error: 'identifier and type (email|sms) required' });
  }

  // Rate limit: check for recent unsent OTP within 60 seconds
  try {
    const recent = await pool.query(
      `SELECT created_at FROM tenant_otp
       WHERE identifier = $1 AND type = $2 AND verified = FALSE
         AND created_at > NOW() - INTERVAL '60 seconds'
       LIMIT 1`,
      [identifier, type]
    );
    if (recent.rows.length > 0) {
      return res.status(429).json({
        error: 'Please wait 60 seconds before requesting a new code.'
      });
    }

    const code = generateOTP();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    // Invalidate old OTPs
    await pool.query(
      `UPDATE tenant_otp SET verified = TRUE
       WHERE identifier = $1 AND type = $2 AND verified = FALSE`,
      [identifier, type]
    );

    await pool.query(
      `INSERT INTO tenant_otp (identifier, type, code, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [identifier, type, code, expires]
    );

    if (type === 'email') {
      await transporter.sendMail({
        from:    '"AuditDNA Platform" <saul@mexausafg.com>',
        to:      identifier,
        subject: 'AuditDNA — Your Verification Code',
        html:    otpEmailHTML(code, 'email')
      });
    } else {
      // SMS: wire to your SMS provider here
      // Example: Twilio, Vonage, or Zadarma SMS API
      console.log(`[SMS OTP] TO: ${identifier}  CODE: ${code}`);
      // TODO: integrate SMS provider
    }

    res.json({ success: true, message: `Code sent to ${identifier}` });

  } catch (err) {
    console.error('[ONBOARDING] OTP send error:', err);
    res.status(500).json({ error: 'Failed to send verification code.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 2 — OTP: VERIFY
// POST /api/onboarding/otp/verify
// ══════════════════════════════════════════════════════════════════════════════
router.post('/otp/verify', async (req, res) => {
  const { identifier, type, code, lead_id } = req.body;

  if (!identifier || !type || !code) {
    return res.status(400).json({ error: 'identifier, type, and code required' });
  }

  try {
    const result = await pool.query(
      `SELECT * FROM tenant_otp
       WHERE identifier = $1 AND type = $2
         AND verified = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [identifier, type]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'No valid code found. Request a new one.' });
    }

    const otp = result.rows[0];

    // Check lockout
    if (otp.attempts >= 3) {
      await pool.query(`UPDATE tenant_otp SET verified = TRUE WHERE id = $1`, [otp.id]);
      return res.status(429).json({
        error: 'Too many failed attempts. Please request a new code.'
      });
    }

    // Increment attempt
    await pool.query(
      `UPDATE tenant_otp SET attempts = attempts + 1 WHERE id = $1`,
      [otp.id]
    );

    if (otp.code !== code.trim()) {
      const remaining = 3 - (otp.attempts + 1);
      return res.status(400).json({
        error: `Invalid code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
      });
    }

    // Mark verified
    await pool.query(`UPDATE tenant_otp SET verified = TRUE WHERE id = $1`, [otp.id]);

    // Update KYC record
    if (lead_id) {
      const col = type === 'email' ? 'email_verified' : 'phone_verified';
      await pool.query(
        `UPDATE tenant_kyc SET ${col} = TRUE, updated_at = NOW() WHERE lead_id = $1`,
        [lead_id]
      );
    }

    res.json({ success: true, verified: true });

  } catch (err) {
    console.error('[ONBOARDING] OTP verify error:', err);
    res.status(500).json({ error: 'Verification failed.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 2 — KYC: INIT (create blank KYC record for lead)
// POST /api/onboarding/kyc/init
// ══════════════════════════════════════════════════════════════════════════════
router.post('/kyc/init', async (req, res) => {
  const { lead_id } = req.body;
  if (!lead_id) return res.status(400).json({ error: 'lead_id required' });

  try {
    // Verify lead exists
    const lead = await pool.query(
      `SELECT id FROM tenant_leads WHERE id = $1`, [lead_id]
    );
    if (lead.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Create or return existing KYC record
    const result = await pool.query(
      `INSERT INTO tenant_kyc (lead_id) VALUES ($1)
       ON CONFLICT (lead_id) DO UPDATE SET updated_at = NOW()
       RETURNING id, current_step, status`,
      [lead_id]
    );

    res.json({ success: true, kyc_id: result.rows[0].id,
               current_step: result.rows[0].current_step });
  } catch (err) {
    console.error('[ONBOARDING] KYC init error:', err);
    res.status(500).json({ error: 'Failed to initialize KYC record.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 2 — KYC: STEP 1 — Business Identity
// POST /api/onboarding/kyc/step1
// ══════════════════════════════════════════════════════════════════════════════
router.post('/kyc/step1', async (req, res) => {
  const { lead_id, legal_name, ein_rfc, business_type,
          incorporation_state, contact_title } = req.body;

  if (!lead_id || !legal_name) {
    return res.status(400).json({ error: 'lead_id and legal_name required' });
  }

  try {
    await pool.query(
      `UPDATE tenant_kyc SET
         legal_name = $2, ein_rfc = $3, business_type = $4,
         incorporation_state = $5, contact_title = $6,
         current_step = GREATEST(current_step, 2),
         updated_at = NOW()
       WHERE lead_id = $1`,
      [lead_id, legal_name, ein_rfc || null, business_type || null,
       incorporation_state || null, contact_title || null]
    );
    res.json({ success: true, next_step: 2 });
  } catch (err) {
    console.error('[ONBOARDING] KYC step1 error:', err);
    res.status(500).json({ error: 'Failed to save business identity.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 2 — KYC: STEP 2 — Contact Verification (OTP already handled above)
// POST /api/onboarding/kyc/step2/complete
// ══════════════════════════════════════════════════════════════════════════════
router.post('/kyc/step2/complete', async (req, res) => {
  const { lead_id } = req.body;
  if (!lead_id) return res.status(400).json({ error: 'lead_id required' });

  try {
    const result = await pool.query(
      `SELECT email_verified, phone_verified FROM tenant_kyc WHERE lead_id = $1`,
      [lead_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'KYC record not found' });
    }

    const { email_verified, phone_verified } = result.rows[0];
    if (!email_verified) {
      return res.status(400).json({ error: 'Email not verified. Please complete email OTP.' });
    }

    await pool.query(
      `UPDATE tenant_kyc SET current_step = GREATEST(current_step, 3),
         updated_at = NOW() WHERE lead_id = $1`,
      [lead_id]
    );

    res.json({ success: true, email_verified, phone_verified, next_step: 3 });
  } catch (err) {
    console.error('[ONBOARDING] KYC step2 complete error:', err);
    res.status(500).json({ error: 'Failed to complete contact verification step.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 2 — KYC: STEP 3 — Government ID Upload
// POST /api/onboarding/kyc/step3
// ══════════════════════════════════════════════════════════════════════════════
router.post('/kyc/step3',
  upload.fields([
    { name: 'gov_id_front', maxCount: 1 },
    { name: 'gov_id_back', maxCount: 1 }
  ]),
  async (req, res) => {
    const { lead_id, gov_id_type, liveness_passed,
            id_name_extracted, id_dob_extracted,
            id_number_extracted, id_expiry_extracted } = req.body;

    if (!lead_id) return res.status(400).json({ error: 'lead_id required' });
    if (!req.files?.gov_id_front) {
      return res.status(400).json({ error: 'Front of government ID required' });
    }

    const frontPath = req.files.gov_id_front[0].path;
    const backPath  = req.files.gov_id_back?.[0]?.path || null;

    try {
      await pool.query(
        `UPDATE tenant_kyc SET
           gov_id_front_path  = $2, gov_id_back_path = $3,
           gov_id_type        = $4, liveness_passed  = $5,
           id_name_extracted  = $6, id_dob_extracted = $7,
           id_number_extracted = $8, id_expiry_extracted = $9,
           current_step = GREATEST(current_step, 4),
           updated_at = NOW()
         WHERE lead_id = $1`,
        [lead_id, frontPath, backPath,
         gov_id_type || 'unknown',
         liveness_passed === 'true' || liveness_passed === true,
         id_name_extracted || null,
         id_dob_extracted || null,
         id_number_extracted || null,
         id_expiry_extracted || null]
      );

      // Log to document vault
      if (frontPath) {
        await pool.query(
          `INSERT INTO document_vault
             (owner_id, owner_type, file_name, file_path, file_type, category)
           SELECT id, 'tenant_kyc', $2, $3, $4, 'government_id'
           FROM tenant_kyc WHERE lead_id = $1`,
          [lead_id, path.basename(frontPath), frontPath, gov_id_type || 'id']
        );
      }

      res.json({ success: true, next_step: 4 });
    } catch (err) {
      console.error('[ONBOARDING] KYC step3 error:', err);
      res.status(500).json({ error: 'Failed to save government ID.' });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 2 — KYC: STEP 4 — Agricultural Credentials
// POST /api/onboarding/kyc/step4
// ══════════════════════════════════════════════════════════════════════════════
router.post('/kyc/step4',
  upload.single('organic_cert'),
  async (req, res) => {
    const { lead_id, usda_farm_id, grower_reg_num,
            food_safety_license, fsma_status } = req.body;

    if (!lead_id) return res.status(400).json({ error: 'lead_id required' });

    const certPath = req.file?.path || null;

    try {
      await pool.query(
        `UPDATE tenant_kyc SET
           usda_farm_id       = $2, grower_reg_num    = $3,
           food_safety_license = $4, fsma_status      = $5,
           organic_cert_path  = COALESCE($6, organic_cert_path),
           current_step = GREATEST(current_step, 5),
           updated_at = NOW()
         WHERE lead_id = $1`,
        [lead_id, usda_farm_id || null, grower_reg_num || null,
         food_safety_license || null, fsma_status || 'unknown', certPath]
      );

      if (certPath) {
        await pool.query(
          `INSERT INTO document_vault
             (owner_id, owner_type, file_name, file_path, file_type, category)
           SELECT id, 'tenant_kyc', $2, $3, 'pdf', 'organic_certification'
           FROM tenant_kyc WHERE lead_id = $1`,
          [lead_id, path.basename(certPath), certPath]
        );
      }

      res.json({ success: true, next_step: 5 });
    } catch (err) {
      console.error('[ONBOARDING] KYC step4 error:', err);
      res.status(500).json({ error: 'Failed to save agricultural credentials.' });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 2 — KYC: STEP 5 — Address + Geolocation
// POST /api/onboarding/kyc/step5
// ══════════════════════════════════════════════════════════════════════════════
router.post('/kyc/step5', async (req, res) => {
  const { lead_id, address_line1, city, state_region,
          postal_code, country, gps_lat, gps_lng,
          latam_countries } = req.body;

  if (!lead_id || !address_line1 || !city || !country) {
    return res.status(400).json({
      error: 'lead_id, address, city, and country required'
    });
  }

  // Port proximity score: simple heuristic for US/MX border states
  const borderStates = ['CA', 'AZ', 'NM', 'TX', 'Baja California', 'Sonora',
                        'Chihuahua', 'Coahuila', 'Nuevo Leon', 'Tamaulipas'];
  const portScore = borderStates.some(s =>
    (state_region || '').toLowerCase().includes(s.toLowerCase())
  ) ? 85 : (country === 'US' || country === 'MX' ? 50 : 20);

  try {
    await pool.query(
      `UPDATE tenant_kyc SET
         address_line1       = $2, city             = $3,
         state_region        = $4, postal_code      = $5,
         country             = $6, gps_lat          = $7,
         gps_lng             = $8, latam_countries  = $9,
         port_proximity_score = $10,
         current_step = GREATEST(current_step, 6),
         updated_at = NOW()
       WHERE lead_id = $1`,
      [lead_id, address_line1, city, state_region || null,
       postal_code || null, country,
       gps_lat || null, gps_lng || null,
       latam_countries ? `{${latam_countries}}` : '{}',
       portScore]
    );

    res.json({ success: true, port_proximity_score: portScore, next_step: 'complete' });
  } catch (err) {
    console.error('[ONBOARDING] KYC step5 error:', err);
    res.status(500).json({ error: 'Failed to save address information.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 2 — KYC: COMPLETE — Score + Status + Brain Event
// POST /api/onboarding/kyc/complete
// ══════════════════════════════════════════════════════════════════════════════
router.post('/kyc/complete', async (req, res) => {
  const { lead_id } = req.body;
  if (!lead_id) return res.status(400).json({ error: 'lead_id required' });

  try {
    const result = await pool.query(
      `SELECT k.*, l.email, l.phone, l.crop_type, l.business_name, l.agent_id
       FROM tenant_kyc k
       JOIN tenant_leads l ON l.id = k.lead_id
       WHERE k.lead_id = $1`,
      [lead_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'KYC record not found' });
    }

    const kyc = result.rows[0];

    // OFAC stub — mark cleared by default (integrate OFAC API for Tier 4+)
    const ofac_cleared = true; // TODO: wire real OFAC/SDN API check

    const score = calculateKYCScore({ ...kyc, ofac_cleared });
    const status = getKYCStatus(score);

    await pool.query(
      `UPDATE tenant_kyc SET
         kyc_score = $2, ofac_cleared = $3, status = $4, updated_at = NOW()
       WHERE lead_id = $1`,
      [lead_id, score, ofac_cleared, status]
    );

    // Update lead status
    await pool.query(
      `UPDATE tenant_leads SET status = $2, updated_at = NOW() WHERE id = $1`,
      [lead_id, status === 'approved' ? 'kyc_approved' :
                status === 'manual_review' ? 'kyc_review' : 'kyc_rejected']
    );

    await fireBrainEvent('kyc_completed', {
      lead_id,
      kyc_score: score,
      status,
      ofac_cleared,
      email:        kyc.email,
      business:     kyc.legal_name || kyc.business_name,
      agent_id:     kyc.agent_id
    });

    // Notify owner if manual review needed
    if (status === 'manual_review') {
      try {
        await transporter.sendMail({
          from:    '"AuditDNA Platform" <saul@mexausafg.com>',
          to:      'saul@mexausafg.com',
          subject: `[AuditDNA] KYC Manual Review Required — ${kyc.legal_name || kyc.email}`,
          html: `
            <body style="background:#0f172a;font-family:sans-serif;padding:40px">
              <div style="background:#1e293b;padding:28px;border-radius:8px;border:1px solid #b8944d">
                <h3 style="color:#cba658;margin:0 0 16px">KYC Manual Review Required</h3>
                <p style="color:#cbd5e1;margin:0 0 8px">Business: ${kyc.legal_name || 'N/A'}</p>
                <p style="color:#cbd5e1;margin:0 0 8px">Email: ${kyc.email}</p>
                <p style="color:#cbd5e1;margin:0 0 8px">KYC Score: ${score}/100</p>
                <p style="color:#94a3b0;margin:16px 0 0;font-size:12px">
                  Review in Command Sphere → Onboarding Queue
                </p>
              </div>
            </body>
          `
        });
      } catch (e) { /* non-blocking */ }
    }

    res.json({
      success:    true,
      kyc_score:  score,
      status,
      message:
        status === 'approved'      ? 'KYC approved. Proceed to tier selection.' :
        status === 'manual_review' ? 'Under review. You will be notified within 24 hours.' :
                                     'Application not approved. Contact support to resubmit.'
    });

  } catch (err) {
    console.error('[ONBOARDING] KYC complete error:', err);
    res.status(500).json({ error: 'KYC completion failed.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// STATUS CHECK — GET /api/onboarding/status/:lead_id
// ══════════════════════════════════════════════════════════════════════════════
router.get('/status/:lead_id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT k.current_step, k.kyc_score, k.status,
              k.email_verified, k.phone_verified,
              l.email, l.crop_type, l.business_name
       FROM tenant_kyc k
       JOIN tenant_leads l ON l.id = k.lead_id
       WHERE k.lead_id = $1`,
      [req.params.lead_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Status check failed' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 3 — TIER CATALOG (single source of truth)
// ══════════════════════════════════════════════════════════════════════════════

const TIER_CATALOG = [
  { id: 0, name: 'Seed',       price_monthly: 0,    docs: ['AUP'] },
  { id: 1, name: 'Field',      price_monthly: 149,  docs: ['MSA','DPA','FSMA','AUP','NMLS'] },
  { id: 2, name: 'Harvest',    price_monthly: 349,  docs: ['MSA','DPA','FSMA','AUP','NDA','NMLS'] },
  { id: 3, name: 'Market',     price_monthly: 749,  docs: ['MSA','DPA','FSMA','AUP','NDA','NMLS','USDA'] },
  { id: 4, name: 'Trade',      price_monthly: 1499, docs: ['MSA','DPA','FSMA','AUP','NDA','NMLS','USDA','EXPORT'] },
  { id: 5, name: 'Enterprise', price_monthly: 3500, docs: ['MSA','DPA','FSMA','AUP','NDA','NMLS','USDA','EXPORT','CUSTOM_MSA'] },
];

// AI tier recommendation — based on KYC record data
function recommendTier(kyc) {
  const score         = kyc.kyc_score        || 0;
  const latamCount    = (kyc.latam_countries || []).length;
  const fsma          = kyc.fsma_status      || '';
  const hasUsda       = !!kyc.usda_farm_id;
  const hasGrowerNum  = !!kyc.grower_reg_num;
  const country       = kyc.country          || 'US';

  // Tier 5 — Enterprise
  if (score >= 80 && latamCount >= 3 && fsma === 'compliant' &&
      (country === 'MX' || latamCount > 0)) return 5;

  // Tier 4 — Trade
  if (score >= 70 && latamCount >= 2 &&
      (fsma === 'compliant' || fsma === 'in_progress')) return 4;

  // Tier 3 — Market
  if (score >= 60 && (hasUsda || hasGrowerNum) && latamCount >= 1) return 3;

  // Tier 2 — Harvest
  if (score >= 50 && (hasUsda || hasGrowerNum || fsma !== 'unknown')) return 2;

  // Tier 1 — Field
  if (score >= 30) return 1;

  // Tier 0 — Seed
  return 0;
}

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 3 — TIER RECOMMEND
// GET /api/onboarding/tier/recommend/:lead_id
// ══════════════════════════════════════════════════════════════════════════════
router.get('/tier/recommend/:lead_id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT k.kyc_score, k.latam_countries, k.fsma_status,
              k.usda_farm_id, k.grower_reg_num, k.country,
              l.crop_type
       FROM tenant_kyc k
       JOIN tenant_leads l ON l.id = k.lead_id
       WHERE k.lead_id = $1`,
      [req.params.lead_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'KYC record not found' });
    }

    const kyc         = result.rows[0];
    const recommended = recommendTier(kyc);

    res.json({
      recommended_tier: recommended,
      recommended_name: TIER_CATALOG[recommended].name,
      kyc_score:        kyc.kyc_score,
      basis: {
        latam_count:    (kyc.latam_countries || []).length,
        fsma_status:    kyc.fsma_status,
        has_usda:       !!kyc.usda_farm_id,
        has_grower_num: !!kyc.grower_reg_num,
        country:        kyc.country,
      },
    });
  } catch (err) {
    console.error('[ONBOARDING] Tier recommend error:', err);
    res.status(500).json({ error: 'Recommendation failed.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 3 — TIER SELECT
// POST /api/onboarding/tier/select
// ══════════════════════════════════════════════════════════════════════════════
router.post('/tier/select', async (req, res) => {
  const { lead_id, tier_id, billing_cycle } = req.body;

  if (!lead_id)                          return res.status(400).json({ error: 'lead_id required' });
  if (tier_id === undefined || tier_id === null) return res.status(400).json({ error: 'tier_id required' });

  const tier = TIER_CATALOG[parseInt(tier_id)];
  if (!tier) return res.status(400).json({ error: 'Invalid tier_id (0–5 only)' });

  const cycle      = billing_cycle === 'annual' ? 'annual' : 'monthly';
  const price_paid = cycle === 'annual'
    ? parseFloat((tier.price_monthly * 10).toFixed(2))   // 10 months — 2 months free
    : tier.price_monthly;

  try {
    // Verify KYC exists and was not rejected
    const kyc = await pool.query(
      `SELECT k.kyc_score, k.latam_countries, k.fsma_status,
              k.usda_farm_id, k.grower_reg_num, k.country, k.status
       FROM tenant_kyc k WHERE k.lead_id = $1`,
      [lead_id]
    );

    if (kyc.rows.length === 0) {
      return res.status(404).json({ error: 'KYC record not found' });
    }
    if (kyc.rows[0].status === 'rejected') {
      return res.status(403).json({ error: 'KYC rejected — tier selection not available.' });
    }

    const ai_recommended = recommendTier(kyc.rows[0]);

    // Upsert tier selection
    const result = await pool.query(
      `INSERT INTO tenant_tier_selections
         (lead_id, tier_id, tier_name, billing_cycle,
          price_monthly, price_paid, ai_recommended, ai_score_basis, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'selected')
       ON CONFLICT (lead_id) DO UPDATE SET
         tier_id        = EXCLUDED.tier_id,
         tier_name      = EXCLUDED.tier_name,
         billing_cycle  = EXCLUDED.billing_cycle,
         price_monthly  = EXCLUDED.price_monthly,
         price_paid     = EXCLUDED.price_paid,
         ai_recommended = EXCLUDED.ai_recommended,
         status         = 'selected',
         updated_at     = NOW()
       RETURNING id, tier_id, tier_name, billing_cycle, price_monthly, price_paid`,
      [lead_id, tier.id, tier.name, cycle,
       tier.price_monthly, price_paid,
       ai_recommended, kyc.rows[0].kyc_score]
    );

    await fireBrainEvent('tier_selected', {
      lead_id,
      tier_id:       tier.id,
      tier_name:     tier.name,
      billing_cycle: cycle,
      price_paid,
      ai_recommended,
      matched_ai:    ai_recommended === tier.id,
      required_docs: tier.docs,
    });

    res.json({
      success:       true,
      tier_id:       tier.id,
      tier_name:     tier.name,
      billing_cycle: cycle,
      price_monthly: tier.price_monthly,
      price_paid,
      required_docs: tier.docs,
      next_phase:    4,
    });

  } catch (err) {
    console.error('[ONBOARDING] Tier select error:', err);
    res.status(500).json({ error: 'Tier selection failed.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 4 — LEGAL DOCUMENT TEMPLATES
// Hardcoded. Version-controlled via DOC_VERSION.
// ══════════════════════════════════════════════════════════════════════════════

const DOC_VERSION = '1.0';

const LEGAL_DOCS = {

  MSA: {
    title:   'Master Subscription Agreement',
    version: DOC_VERSION,
    body: `MASTER SUBSCRIPTION AGREEMENT
MexaUSA Food Group Inc. / Mexausa Food Group, Inc. | NMLS #337526
Effective upon electronic acceptance.

1. PARTIES
This Master Subscription Agreement ("Agreement") is between MexaUSA Food Group Inc. / Mexausa Food Group, Inc. NMLS #337526 ("Platform Provider") and the subscribing entity ("Tenant") identified during registration.

2. SUBSCRIPTION SERVICES
Platform Provider grants Tenant a non-exclusive, non-transferable right to access and use the AuditDNA platform ("Platform") solely for Tenant's internal business operations, subject to the tier selected during onboarding and all terms herein.

3. FEES AND BILLING
Tenant agrees to pay subscription fees as disclosed during tier selection. Monthly subscriptions are billed on the same day each month. Annual subscriptions are billed in full at the start of each term. All fees are non-refundable except as expressly stated herein. Platform Provider reserves the right to modify pricing with 30 days written notice to monthly subscribers; annual pricing is locked for the contracted term.

4. ACCEPTABLE USE
Tenant shall not: (a) sublicense, resell, or redistribute Platform access; (b) reverse engineer, decompile, or attempt to extract Platform source code; (c) use the Platform to compete with Platform Provider; (d) share login credentials; (e) scrape, harvest, or systematically extract Platform data; (f) use the Platform for any unlawful purpose.

5. DATA OWNERSHIP
Tenant retains all ownership rights to data it uploads or generates within the Platform. Platform Provider retains rights to aggregated, anonymized intelligence derived from Platform activity across all tenants. Platform Provider will never sell Tenant's identifiable data to third parties.

6. UPTIME AND SLA
Platform Provider targets 99.5% monthly uptime for Enterprise tier (Tier 5). All other tiers receive commercially reasonable uptime. Scheduled maintenance will be communicated 48 hours in advance where possible. Downtime credits, if any, are limited to one month's subscription fee.

7. TERM AND TERMINATION
This Agreement commences on the date of electronic acceptance and continues until terminated. Tenant may cancel per the notice period applicable to their tier. Platform Provider may terminate immediately for material breach, non-payment after cure period, or violation of the Acceptable Use Policy.

8. LIMITATION OF LIABILITY
Platform Provider's total liability shall not exceed the fees paid by Tenant in the 3 months preceding the claim. Platform Provider is not liable for indirect, incidental, consequential, or punitive damages.

9. GOVERNING LAW
This Agreement is governed by the laws of the State of California, United States, without regard to conflict of law principles. Disputes shall be resolved by binding arbitration in San Diego County, California.

10. ENTIRE AGREEMENT
This Agreement, together with the Data Processing Addendum, FSMA Acknowledgment, NDA, Acceptable Use Policy, NMLS Disclosure, and any applicable Export Compliance Certification, constitutes the entire agreement between the parties.

By typing your full legal name below, you acknowledge that you have read, understood, and agree to be bound by this Master Subscription Agreement on behalf of the entity you represent.`,
  },

  DPA: {
    title:   'Data Processing Addendum',
    version: DOC_VERSION,
    body: `DATA PROCESSING ADDENDUM
MexaUSA Food Group Inc. / Mexausa Food Group, Inc. | NMLS #337526
Effective upon electronic acceptance.

1. PURPOSE
This Data Processing Addendum ("DPA") supplements the Master Subscription Agreement and governs the processing of personal data and business data submitted to the AuditDNA Platform by Tenant.

2. DATA CONTROLLER AND PROCESSOR
Tenant is the Data Controller of all data it submits to the Platform. MexaUSA Food Group Inc. / Mexausa Food Group, Inc. acts as Data Processor, processing data solely on Tenant's behalf and per Tenant's documented instructions.

3. DATA WE PROCESS
Platform Provider processes: business registration information, contact details, agricultural credentials, government ID data (KYC only), GPS and location data, transaction and financial records, crop and commodity data, traceability records, and usage analytics.

4. PURPOSE LIMITATION
Data is processed solely to: (a) provide Platform services to Tenant; (b) generate anonymized aggregate intelligence for Platform improvement; (c) comply with applicable law. Data is never processed for advertising, sold to third parties, or shared with competitors.

5. DATA RETENTION
Active account data is retained for the subscription duration plus 90 days post-cancellation. FSMA 204 traceability records are retained for a minimum of 7 years per FDA requirements. Financial records are retained for a minimum of 7 years per IRS requirements. Government ID data submitted for KYC is retained for 5 years per anti-money laundering regulations.

6. SECURITY
Platform Provider implements: AES-256 encryption for data at rest, TLS 1.3 for data in transit, role-based access controls, audit logging, and regular security assessments. Government ID files are stored encrypted in an isolated vault.

7. DATA SUBJECT RIGHTS (CCPA/GDPR)
Tenant may request: access to their data, correction of inaccurate data, deletion of data (subject to legal retention requirements), and a machine-readable data export. Submit requests to saul@mexausafg.com. Requests are processed within 30 days.

8. BREACH NOTIFICATION
Platform Provider will notify Tenant within 72 hours of discovering a confirmed data breach affecting Tenant's data.

9. SUB-PROCESSORS
Platform Provider uses: Railway (cloud infrastructure, USA), PostgreSQL (database), GoDaddy (email delivery). All sub-processors are bound by equivalent data protection obligations.

By typing your full legal name below, you acknowledge that you have read, understood, and agree to this Data Processing Addendum.`,
  },

  FSMA: {
    title:   'FSMA 204 Compliance Acknowledgment',
    version: DOC_VERSION,
    body: `FSMA 204 COMPLIANCE ACKNOWLEDGMENT
MexaUSA Food Group Inc. / Mexausa Food Group, Inc. | NMLS #337526
Food Safety Modernization Act — Section 204 Traceability Rule

1. REGULATORY BACKGROUND
The FDA Food Safety Modernization Act Section 204 ("FSMA 204") establishes traceability recordkeeping requirements for food on the Food Traceability List (FTL). Covered entities must maintain Key Data Elements (KDEs) at Critical Tracking Events (CTEs) including growing, receiving, transforming, creating, and shipping.

2. TENANT RESPONSIBILITY
Tenant acknowledges and agrees that:
(a) Tenant, not Platform Provider, is the regulated entity responsible for FSMA 204 compliance;
(b) The AuditDNA Platform provides traceability infrastructure tools only — it does not constitute legal compliance advice;
(c) Tenant is solely responsible for the accuracy, completeness, and timeliness of all traceability records entered into the Platform;
(d) Tenant must ensure its use of the Platform satisfies applicable FDA requirements for its specific commodities, operations, and role in the supply chain;
(e) Platform Provider bears zero liability for Tenant's regulatory submissions, FDA enforcement actions, or compliance failures;
(f) Tenant should independently consult qualified food safety and legal counsel to confirm Platform use satisfies its specific FSMA 204 obligations.

3. RECORDKEEPING
Traceability records submitted to the Platform are retained for a minimum of 7 years from the date of creation, consistent with FDA requirements. Tenant may export all traceability records at any time via the Document Vault.

4. FDA ACCESS
In the event FDA requests traceability records under FSMA 204 Section 204(d), Tenant is responsible for retrieving and providing its records from the Platform. Platform Provider will reasonably cooperate with valid legal process directed at Tenant's records.

By typing your full legal name below, you acknowledge that you have read, understood, and accept full legal responsibility for FSMA 204 compliance as described in this Acknowledgment.`,
  },

  NDA: {
    title:   'Non-Disclosure Agreement',
    version: DOC_VERSION,
    body: `NON-DISCLOSURE AGREEMENT
MexaUSA Food Group Inc. / Mexausa Food Group, Inc. | NMLS #337526
Effective upon electronic acceptance.

1. DEFINITION OF CONFIDENTIAL INFORMATION
"Confidential Information" means all non-public information disclosed by MexaUSA Food Group Inc. / Mexausa Food Group, Inc. ("Disclosing Party") to Tenant ("Receiving Party") in connection with the AuditDNA Platform, including but not limited to: Platform architecture and source code; SI (Synthetic Intelligence) methodology and miner logic; pricing tiers, discount structures, and contract terms; client and tenant lists; agricultural intelligence algorithms; USDA data processing pipelines; patent-pending inventions across all 12 patent families; Brain Data Mesh architecture; GrowerMaster scoring and tiering logic; and any business strategies, financial projections, or product roadmaps.

2. OBLIGATIONS
Receiving Party agrees to: (a) hold all Confidential Information in strict confidence; (b) not disclose Confidential Information to any third party without prior written consent; (c) use Confidential Information solely in connection with using the Platform under the Master Subscription Agreement; (d) limit access to employees and contractors who have a need to know and are bound by equivalent confidentiality obligations.

3. EXCLUSIONS
Confidentiality obligations do not apply to information that: (a) is or becomes publicly available through no breach by Receiving Party; (b) was rightfully known to Receiving Party prior to disclosure; (c) is independently developed without use of Confidential Information; (d) is required to be disclosed by law or court order, provided Disclosing Party receives prompt written notice.

4. INTELLECTUAL PROPERTY
All Platform technology, including the 81 Niner Miners, Brain Data Mesh, SI compliance engine, and associated patent-pending inventions remain the exclusive intellectual property of MexaUSA Food Group Inc. / Mexausa Food Group, Inc.. Nothing in this Agreement transfers any IP rights to Tenant.

5. TERM
This NDA is effective from the date of acceptance and survives termination of the Master Subscription Agreement for a period of 5 years.

6. REMEDIES
Tenant acknowledges that breach of this NDA would cause irreparable harm for which monetary damages would be insufficient, entitling Disclosing Party to seek injunctive relief in addition to all other available remedies.

By typing your full legal name below, you acknowledge that you have read, understood, and agree to be bound by this Non-Disclosure Agreement.`,
  },

  AUP: {
    title:   'Acceptable Use Policy',
    version: DOC_VERSION,
    body: `ACCEPTABLE USE POLICY
MexaUSA Food Group Inc. / Mexausa Food Group, Inc. | NMLS #337526
Effective upon electronic acceptance.

1. PURPOSE
This Acceptable Use Policy ("AUP") governs all use of the AuditDNA Platform. All users, regardless of tier, must comply with this AUP at all times.

2. PROHIBITED CONDUCT
You must not use the Platform to:
(a) Violate any applicable law, regulation, or ordinance;
(b) Scrape, harvest, or systematically extract data beyond normal Platform use;
(c) Attempt to probe, scan, or test Platform security vulnerabilities;
(d) Transmit malicious code, viruses, or any disruptive software;
(e) Impersonate another user, entity, or Platform Provider staff;
(f) Share, sell, or transfer login credentials to any third party;
(g) Submit false, misleading, or fraudulent data including KYC information;
(h) Use Platform data to build competing products or services;
(i) Reverse engineer, decompile, or disassemble any Platform component;
(j) Harass, threaten, or abuse Platform Provider staff or other users;
(k) Upload content that infringes third-party intellectual property rights;
(l) Circumvent any Platform access controls, rate limits, or usage restrictions.

3. CONTENT STANDARDS
All data submitted to the Platform must be accurate to the best of Tenant's knowledge. Knowingly submitting false regulatory data (FSMA records, KYC documents, export certifications) constitutes material breach and may be reported to relevant regulatory authorities.

4. ENFORCEMENT
Platform Provider reserves the right to: (a) suspend or terminate access immediately upon discovery of AUP violation; (b) preserve and disclose account data as required by law or to protect Platform integrity; (c) pursue all available legal remedies for damages caused by AUP violations. No refund will be issued upon termination for AUP breach.

5. REPORTING
Report AUP violations to saul@mexausafg.com.

By typing your full legal name below, you acknowledge that you have read, understood, and agree to comply with this Acceptable Use Policy.`,
  },

  NMLS: {
    title:   'NMLS #337526 Financial Services Disclosure',
    version: DOC_VERSION,
    body: `NMLS #337526 FINANCIAL SERVICES DISCLOSURE
Mexausa Food Group, Inc. | NMLS #337526
Effective upon electronic acceptance.

1. LICENSED ENTITY
Mexausa Food Group, Inc. is registered with the Nationwide Multistate Licensing System & Registry (NMLS) under license number #337526. This registration applies to mortgage lending, loan origination, and related financial services activities conducted by Mexausa Food Group, Inc..

2. SCOPE OF FINANCIAL MODULES
The AuditDNA Platform includes modules related to financial services, including: mortgage recovery and audit tools (AuditDNA Recovery), trade finance, factoring, accounts receivable management, and financial reporting. Access to these modules is provided by Mexausa Food Group, Inc. NMLS #337526.

3. NOT INVESTMENT ADVICE
Nothing on the Platform constitutes investment advice, legal advice, tax advice, or financial planning advice. All financial data, reports, and analytics are provided for informational purposes only. Tenant should consult licensed professionals for investment, legal, and tax decisions.

4. MORTGAGE RECOVERY SERVICES
The mortgage audit and recovery features are designed to identify potential violations and compliance gaps in mortgage documentation. Platform Provider does not guarantee recovery of any funds. Results depend on the specific facts of each loan file and applicable law.

5. NMLS CONSUMER ACCESS
You may verify Mexausa Food Group, Inc.'s NMLS registration at: https://www.nmlsconsumeraccess.org

By typing your full legal name below, you acknowledge that you have read and understood this NMLS #337526 Financial Services Disclosure.`,
  },

  USDA: {
    title:   'USDA Data Terms of Use',
    version: DOC_VERSION,
    body: `USDA DATA TERMS OF USE
MexaUSA Food Group Inc. / Mexausa Food Group, Inc. | NMLS #337526
Effective upon electronic acceptance.

1. DATA SOURCE
The AuditDNA Platform integrates data from: USDA National Agricultural Statistics Service (NASS), USDA Agricultural Marketing Service (AMS), USDA Foreign Agricultural Service (FAS) / MARS, and related USDA data APIs.

2. GOVERNMENT DATA TERMS
USDA data accessed through the Platform is U.S. Government public information. Use of this data is subject to the USDA's data access terms and applicable federal law. Platform Provider's USDA API Key is used solely to provide services to registered Platform tenants.

3. DATA AS-IS
USDA market data, pricing information, production estimates, and related intelligence are provided as-is from government sources. Platform Provider does not warrant the accuracy, completeness, or timeliness of USDA data. USDA data is subject to revision by the USDA at any time.

4. NO TRADING ADVICE
USDA price and market data is for informational purposes only and does not constitute trading advice, commodity recommendations, or market guidance. Tenant assumes all risk in commercial decisions made using Platform data.

5. REDISTRIBUTION RESTRICTIONS
Tenant may not resell, redistribute, or republish USDA data obtained through the Platform outside of Tenant's internal business operations.

By typing your full legal name below, you acknowledge that you have read, understood, and agree to comply with these USDA Data Terms of Use.`,
  },

  EXPORT: {
    title:   'Export Compliance Certification',
    version: DOC_VERSION,
    body: `EXPORT COMPLIANCE CERTIFICATION
MexaUSA Food Group Inc. / Mexausa Food Group, Inc. | NMLS #337526
Required for Tier 4 (Trade) and Tier 5 (Enterprise)
Effective upon electronic acceptance.

1. PURPOSE
This Export Compliance Certification is required for all tenants accessing trade, logistics, cross-border, and LATAM intelligence modules of the AuditDNA Platform.

2. OFAC AND SANCTIONS COMPLIANCE
By executing this Certification, Tenant certifies that:
(a) Tenant is not on the U.S. Department of Treasury OFAC Specially Designated Nationals (SDN) list;
(b) Tenant is not on the U.S. Department of Commerce BIS Denied Persons List or Entity List;
(c) Tenant does not conduct business with any person or entity on OFAC or BIS restricted lists;
(d) Tenant's principals, officers, and beneficial owners are not restricted persons under U.S. sanctions programs.

3. EXPORT CONTROL LAWS
Tenant agrees to comply with all applicable U.S. export control laws and regulations, including the Export Administration Regulations (EAR) and International Traffic in Arms Regulations (ITAR).

4. FOOD EXPORT REGULATIONS
Tenant certifies that all agricultural products exported using Platform tools comply with: (a) USDA export certification requirements; (b) FDA Prior Notice requirements under the Bioterrorism Act; (c) CBP entry filing requirements; (d) applicable phytosanitary regulations of destination countries.

5. ANNUAL RENEWAL
This Certification must be renewed annually. Failure to renew will result in suspension of all trade and logistics modules. A 30-day cure window applies before suspension.

6. REPRESENTATIONS
Knowingly providing false certification constitutes material breach and will be reported to applicable regulatory authorities.

By typing your full legal name below, you certify that the foregoing representations are true and accurate as of the date of acceptance.`,
  },

  CUSTOM_MSA: {
    title:   'Enterprise Custom MSA — Owner Review Required',
    version: DOC_VERSION,
    body: `ENTERPRISE CUSTOM MSA — OWNER REVIEW REQUIRED
MexaUSA Food Group Inc. / Mexausa Food Group, Inc. | NMLS #337526

NOTICE TO ENTERPRISE TIER APPLICANTS

Your selected tier (Enterprise / Tier 5) requires a Custom Master Subscription Agreement tailored to your specific business structure, data volume, SLA requirements, and white-label needs.

WHAT HAPPENS NEXT:
1. By accepting this acknowledgment, you confirm that you understand a Custom MSA is required for Enterprise tier access.
2. Platform Owner (Saul Garcia, MexaUSA Food Group Inc.) will contact you within 24 business hours to initiate the Custom MSA negotiation process.
3. Enterprise tier access will be activated upon execution of the finalized Custom MSA and receipt of initial payment.
4. Until the Custom MSA is fully executed, your account will be held in "Enterprise Pending" status. You may access Tier 3 (Market) features during this interim period at no charge.

ENTERPRISE MSA INCLUDES:
- Custom SLA with 99.5% uptime guarantee and credit provisions
- Data residency options (US-only or US+MX)
- White-label Customer Portal Advanced rights for your own clients
- Custom module configuration and dedicated Brain allocation
- Annual pricing lock with quarterly review option
- Dedicated onboarding support from Platform Owner
- Custom AI Agent configuration for your specific commodity portfolio

CONTACT:
Saul Garcia | MexaUSA Food Group Inc.
saul@mexausafg.com
US: +1-831-251-3116 | Mexico: +52-646-340-2686

By typing your full legal name below, you acknowledge that you understand Enterprise tier requires a Custom MSA and agree to engage in the Custom MSA process in good faith.`,
  },

};

// Required docs per tier — single source of truth
const TIER_DOCS = {
  0: ['AUP'],
  1: ['MSA','DPA','FSMA','AUP','NMLS'],
  2: ['MSA','DPA','FSMA','NDA','AUP','NMLS'],
  3: ['MSA','DPA','FSMA','NDA','AUP','NMLS','USDA'],
  4: ['MSA','DPA','FSMA','NDA','AUP','NMLS','USDA','EXPORT'],
  5: ['MSA','DPA','FSMA','NDA','AUP','NMLS','USDA','EXPORT','CUSTOM_MSA'],
};

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 4 — GET REQUIRED DOCS FOR LEAD
// GET /api/onboarding/legal/required/:lead_id
// ══════════════════════════════════════════════════════════════════════════════
router.get('/legal/required/:lead_id', async (req, res) => {
  try {
    const tier = await pool.query(
      `SELECT tier_id, tier_name FROM tenant_tier_selections WHERE lead_id = $1`,
      [req.params.lead_id]
    );
    if (tier.rows.length === 0) {
      return res.status(404).json({ error: 'Tier selection not found. Complete Phase 3 first.' });
    }

    const required   = TIER_DOCS[tier.rows[0].tier_id] || ['AUP'];
    const signed     = await pool.query(
      `SELECT doc_key, signer_name, signed_at
       FROM tenant_legal_acceptances
       WHERE lead_id = $1 ORDER BY signed_at ASC`,
      [req.params.lead_id]
    );
    const signedKeys = signed.rows.map(r => r.doc_key);

    const docs = required.map(key => ({
      key,
      title:     LEGAL_DOCS[key].title,
      version:   LEGAL_DOCS[key].version,
      signed:    signedKeys.includes(key),
      signed_at: signed.rows.find(r => r.doc_key === key)?.signed_at || null,
    }));

    res.json({
      tier_id:        tier.rows[0].tier_id,
      tier_name:      tier.rows[0].tier_name,
      docs,
      all_signed:     docs.every(d => d.signed),
      signed_count:   docs.filter(d => d.signed).length,
      required_count: docs.length,
    });

  } catch (err) {
    console.error('[ONBOARDING] Legal required error:', err);
    res.status(500).json({ error: 'Failed to load required documents.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 4 — GET FULL DOC TEXT
// GET /api/onboarding/legal/doc/:doc_key
// ══════════════════════════════════════════════════════════════════════════════
router.get('/legal/doc/:doc_key', (req, res) => {
  const doc = LEGAL_DOCS[req.params.doc_key.toUpperCase()];
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  res.json({ key: req.params.doc_key.toUpperCase(), ...doc });
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 4 — SIGN A DOCUMENT
// POST /api/onboarding/legal/sign
// Body: { lead_id, doc_key, signer_name }
// Timestamp + IP captured server-side — never trust client timestamps
// ══════════════════════════════════════════════════════════════════════════════
router.post('/legal/sign', async (req, res) => {
  const { lead_id, doc_key, signer_name } = req.body;

  if (!lead_id)                                      return res.status(400).json({ error: 'lead_id required' });
  if (!doc_key)                                      return res.status(400).json({ error: 'doc_key required' });
  if (!signer_name || signer_name.trim().length < 3) return res.status(400).json({ error: 'Full legal name required (minimum 3 characters)' });

  const key = doc_key.toUpperCase();
  if (!LEGAL_DOCS[key]) return res.status(400).json({ error: `Unknown document: ${doc_key}` });

  // Capture IP — Railway sends real IP via x-forwarded-for
  const signer_ip  = (req.headers['x-forwarded-for'] || req.ip || 'unknown').split(',')[0].trim();
  const user_agent = (req.headers['user-agent'] || '').substring(0, 500);
  const signed_at  = new Date();
  const doc        = LEGAL_DOCS[key];

  // SHA-256 checksum — immutable audit record
  const checksum = require('crypto')
    .createHash('sha256')
    .update(`${key}|${doc.version}|${signer_name.trim()}|${signed_at.toISOString()}`)
    .digest('hex');

  try {
    // Verify lead exists and KYC was not rejected
    const lead = await pool.query(
      `SELECT l.id FROM tenant_leads l
       JOIN tenant_kyc k ON k.lead_id = l.id
       WHERE l.id = $1 AND k.status != 'rejected'`,
      [lead_id]
    );
    if (lead.rows.length === 0) {
      return res.status(403).json({ error: 'Lead not found or KYC not approved.' });
    }

    // Insert — conflict on (lead_id, doc_key, doc_version) = already signed, no-op
    await pool.query(
      `INSERT INTO tenant_legal_acceptances
         (lead_id, doc_key, doc_version, doc_title,
          signer_name, signed_at, signer_ip, user_agent, checksum)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (lead_id, doc_key, doc_version) DO NOTHING`,
      [lead_id, key, doc.version, doc.title,
       signer_name.trim(), signed_at, signer_ip, user_agent, checksum]
    );

    await fireBrainEvent('doc_signed', {
      lead_id,
      doc_key:     key,
      doc_title:   doc.title,
      doc_version: doc.version,
      signer_name: signer_name.trim(),
      signed_at:   signed_at.toISOString(),
      signer_ip,
      checksum,
    });

    // Check if all required docs are now signed
    const tierResult = await pool.query(
      `SELECT tier_id FROM tenant_tier_selections WHERE lead_id = $1`,
      [lead_id]
    );

    let all_signed = false;

    if (tierResult.rows.length > 0) {
      const required   = TIER_DOCS[tierResult.rows[0].tier_id] || ['AUP'];
      const signedRows = await pool.query(
        `SELECT doc_key FROM tenant_legal_acceptances WHERE lead_id = $1`,
        [lead_id]
      );
      const signedKeys = signedRows.rows.map(r => r.doc_key);
      all_signed = required.every(d => signedKeys.includes(d));

      if (all_signed) {
        await fireBrainEvent('legal_complete', {
          lead_id,
          tier_id:      tierResult.rows[0].tier_id,
          signed_docs:  signedKeys,
          completed_at: new Date().toISOString(),
        });

        await pool.query(
          `UPDATE tenant_tier_selections
           SET status = 'legal_complete', updated_at = NOW()
           WHERE lead_id = $1`,
          [lead_id]
        );
      }
    }

    res.json({
      success:     true,
      doc_key:     key,
      doc_title:   doc.title,
      signer_name: signer_name.trim(),
      signed_at:   signed_at.toISOString(),
      checksum,
      all_signed,
      next_phase:  all_signed ? 5 : null,
    });

  } catch (err) {
    console.error('[ONBOARDING] Legal sign error:', err);
    res.status(500).json({ error: 'Failed to record signature.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 4 — LEGAL STATUS SUMMARY
// GET /api/onboarding/legal/status/:lead_id
// ══════════════════════════════════════════════════════════════════════════════
router.get('/legal/status/:lead_id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT doc_key, doc_title, doc_version, signer_name, signed_at, checksum
       FROM tenant_legal_acceptances
       WHERE lead_id = $1 ORDER BY signed_at ASC`,
      [req.params.lead_id]
    );
    res.json({ signed_docs: result.rows, count: result.rows.length });
  } catch (err) {
    res.status(500).json({ error: 'Legal status check failed.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 5 — PAYMENT + BILLING (Stripe card + ACH)
// .env required:
//   STRIPE_SECRET_KEY=process.env.STRIPE_SECRET_KEY...
//   STRIPE_WEBHOOK_SECRET=whsec_... (set after creating webhook in Stripe dashboard)
// npm install stripe
// ══════════════════════════════════════════════════════════════════════════════

let stripe;
try {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
} catch (e) {
  console.warn('[WARN] Stripe not installed. Run: npm install stripe');
}

// ── Invoice number generator ──────────────────────────────────────────────────
async function nextInvoiceNumber() {
  const result = await pool.query(`SELECT NEXTVAL('invoice_seq') AS n`);
  const n      = result.rows[0].n.toString().padStart(6, '0');
  return `AUDIT-${new Date().getFullYear()}-${n}`;
}

// ── Create invoice record after successful payment (QB-style auto-categorized) ─
async function createInvoiceRecord(lead_id, payment_id, tier_name, amount_cents, billing_cycle) {
  const invoice_number = await nextInvoiceNumber();
  const now            = new Date();
  const periodEnd      = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + (billing_cycle === 'annual' ? 12 : 1));

  await pool.query(
    `INSERT INTO tenant_invoices
       (lead_id, payment_id, invoice_number, amount_cents, line_item, billing_period, payment_status)
     VALUES ($1,$2,$3,$4,$5,$6,'paid')`,
    [
      lead_id, payment_id, invoice_number, amount_cents,
      `AuditDNA ${tier_name} Plan — ${billing_cycle === 'annual' ? 'Annual' : 'Monthly'}`,
      `${now.toLocaleDateString('en-US')} – ${periodEnd.toLocaleDateString('en-US')}`,
    ]
  );

  return invoice_number;
}

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 5 — CREATE PAYMENT INTENT
// POST /api/onboarding/payment/create-intent
// Body: { lead_id }
// ══════════════════════════════════════════════════════════════════════════════
router.post('/payment/create-intent', async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured. Run: npm install stripe' });

  const { lead_id } = req.body;
  if (!lead_id) return res.status(400).json({ error: 'lead_id required' });

  try {
    const tierResult = await pool.query(
      `SELECT t.tier_id, t.tier_name, t.billing_cycle, t.price_monthly, t.price_paid,
              l.email, l.business_name, k.legal_name
       FROM tenant_tier_selections t
       JOIN tenant_leads l ON l.id = t.lead_id
       JOIN tenant_kyc   k ON k.lead_id = t.lead_id
       WHERE t.lead_id = $1 AND t.status = 'legal_complete'`,
      [lead_id]
    );

    if (tierResult.rows.length === 0) {
      return res.status(400).json({ error: 'Tier selection not found or legal documents not complete.' });
    }

    const tier = tierResult.rows[0];

    // Tier 0 is free — no payment needed
    if (tier.tier_id === 0) {
      return res.json({ free: true, tier_name: tier.tier_name });
    }

    const amount_cents    = Math.round(tier.price_paid * 100);
    const customer_name   = tier.legal_name || tier.business_name || tier.email;

    // Retrieve existing Stripe customer or create new
    let stripe_customer_id;
    const existing = await pool.query(
      `SELECT stripe_customer_id FROM tenant_payments
       WHERE lead_id = $1 AND stripe_customer_id IS NOT NULL LIMIT 1`,
      [lead_id]
    );

    if (existing.rows.length > 0) {
      stripe_customer_id = existing.rows[0].stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email:    tier.email,
        name:     customer_name,
        metadata: { lead_id, tier_id: tier.tier_id.toString(), platform: 'auditdna' },
      });
      stripe_customer_id = customer.id;
    }

    // Create PaymentIntent — card + ACH
    const intent = await stripe.paymentIntents.create({
      amount:               amount_cents,
      currency:             'usd',
      customer:             stripe_customer_id,
      payment_method_types: ['card', 'us_bank_account'],
      description:          `AuditDNA ${tier.tier_name} — ${tier.billing_cycle}`,
      metadata: {
        lead_id,
        tier_id:       tier.tier_id.toString(),
        tier_name:     tier.tier_name,
        billing_cycle: tier.billing_cycle,
        platform:      'auditdna',
      },
    });

    // Store pending payment record
    await pool.query(
      `INSERT INTO tenant_payments
         (lead_id, stripe_customer_id, stripe_pi_id,
          amount_cents, billing_cycle, tier_id, tier_name, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending')
       ON CONFLICT DO NOTHING`,
      [lead_id, stripe_customer_id, intent.id,
       amount_cents, tier.billing_cycle, tier.tier_id, tier.tier_name]
    );

    await fireBrainEvent('payment_intent_created', {
      lead_id,
      stripe_pi_id:  intent.id,
      amount_cents,
      tier_name:     tier.tier_name,
      billing_cycle: tier.billing_cycle,
    });

    res.json({
      client_secret:     intent.client_secret,
      amount_cents,
      currency:          'usd',
      tier_name:         tier.tier_name,
      billing_cycle:     tier.billing_cycle,
      stripe_customer_id,
    });

  } catch (err) {
    console.error('[ONBOARDING] Create intent error:', err);
    res.status(500).json({ error: err.message || 'Failed to create payment intent.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 5 — CONFIRM PAYMENT
// POST /api/onboarding/payment/confirm
// Body: { lead_id, stripe_pi_id }
// ══════════════════════════════════════════════════════════════════════════════
router.post('/payment/confirm', async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured.' });

  const { lead_id, stripe_pi_id } = req.body;
  if (!lead_id || !stripe_pi_id) {
    return res.status(400).json({ error: 'lead_id and stripe_pi_id required' });
  }

  try {
    // Verify with Stripe — never trust client-side status
    const intent = await stripe.paymentIntents.retrieve(stripe_pi_id);
    if (intent.status !== 'succeeded') {
      return res.status(400).json({
        error:  `Payment not confirmed. Status: ${intent.status}`,
        status: intent.status,
      });
    }

    const tierResult = await pool.query(
      `SELECT tier_id, tier_name, billing_cycle, price_paid
       FROM tenant_tier_selections WHERE lead_id = $1`,
      [lead_id]
    );
    const tier = tierResult.rows[0];

    // Update payment record
    const paymentResult = await pool.query(
      `UPDATE tenant_payments SET
         status       = 'succeeded',
         stripe_pm_id = $3,
         paid_at      = NOW(),
         updated_at   = NOW()
       WHERE lead_id = $1 AND stripe_pi_id = $2
       RETURNING id, amount_cents`,
      [lead_id, stripe_pi_id, intent.payment_method]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payment record not found.' });
    }

    const payment_id   = paymentResult.rows[0].id;
    const amount_cents = paymentResult.rows[0].amount_cents;

    await pool.query(
      `UPDATE tenant_tier_selections
       SET status = 'payment_complete', updated_at = NOW()
       WHERE lead_id = $1`,
      [lead_id]
    );

    const invoice_number = await createInvoiceRecord(
      lead_id, payment_id, tier.tier_name, amount_cents, tier.billing_cycle
    );

    await fireBrainEvent('payment_confirmed', {
      lead_id,
      stripe_pi_id,
      amount_cents,
      tier_name:     tier.tier_name,
      billing_cycle: tier.billing_cycle,
      invoice_number,
    });

    res.json({
      success:       true,
      amount_cents,
      tier_name:     tier.tier_name,
      billing_cycle: tier.billing_cycle,
      invoice_number,
      next_phase:    6,
    });

  } catch (err) {
    console.error('[ONBOARDING] Payment confirm error:', err);
    res.status(500).json({ error: err.message || 'Payment confirmation failed.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 5 — FREE TIER ACTIVATE (Tier 0 skips payment)
// POST /api/onboarding/payment/free-activate
// Body: { lead_id }
// ══════════════════════════════════════════════════════════════════════════════
router.post('/payment/free-activate', async (req, res) => {
  const { lead_id } = req.body;
  if (!lead_id) return res.status(400).json({ error: 'lead_id required' });

  try {
    const tierResult = await pool.query(
      `SELECT tier_id, tier_name FROM tenant_tier_selections
       WHERE lead_id = $1 AND tier_id = 0`,
      [lead_id]
    );
    if (tierResult.rows.length === 0) {
      return res.status(400).json({ error: 'Not a free tier account.' });
    }

    await pool.query(
      `UPDATE tenant_tier_selections
       SET status = 'payment_complete', updated_at = NOW()
       WHERE lead_id = $1`,
      [lead_id]
    );

    await fireBrainEvent('payment_confirmed', {
      lead_id,
      amount_cents:  0,
      tier_name:     'Seed',
      billing_cycle: 'free',
      invoice_number: null,
    });

    res.json({ success: true, free: true, next_phase: 6 });

  } catch (err) {
    console.error('[ONBOARDING] Free activate error:', err);
    res.status(500).json({ error: 'Free tier activation failed.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 5 — STRIPE WEBHOOK
// POST /api/onboarding/payment/webhook
// Register in Stripe Dashboard → Developers → Webhooks
// Events: payment_intent.succeeded | payment_intent.payment_failed
// NOTE: mount express.raw() for this path in server.js BEFORE express.json()
// ══════════════════════════════════════════════════════════════════════════════
router.post('/payment/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    if (!stripe) return res.status(503).send('Stripe not configured');

    const sig    = req.headers['stripe-signature'];
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
      event = secret
        ? stripe.webhooks.constructEvent(req.body, sig, secret)
        : JSON.parse(req.body.toString());
    } catch (err) {
      console.error('[WEBHOOK] Signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      if (event.type === 'payment_intent.succeeded') {
        const intent  = event.data.object;
        const lead_id = intent.metadata?.lead_id;
        if (lead_id) {
          await pool.query(
            `UPDATE tenant_payments SET status = 'succeeded', paid_at = NOW()
             WHERE stripe_pi_id = $1 AND status != 'succeeded'`,
            [intent.id]
          );
          console.log(`[WEBHOOK] Payment succeeded: ${intent.id} lead: ${lead_id}`);
        }
      }

      if (event.type === 'payment_intent.payment_failed') {
        const intent      = event.data.object;
        const lead_id     = intent.metadata?.lead_id;
        const failure_msg = intent.last_payment_error?.message || 'Payment failed';
        if (lead_id) {
          await pool.query(
            `UPDATE tenant_payments SET status = 'failed', failure_reason = $2, updated_at = NOW()
             WHERE stripe_pi_id = $1`,
            [intent.id, failure_msg]
          );
          await fireBrainEvent('payment_failed', {
            lead_id, stripe_pi_id: intent.id, reason: failure_msg,
          });
          console.error(`[WEBHOOK] Payment failed: ${intent.id} — ${failure_msg}`);
        }
      }

      res.json({ received: true });
    } catch (err) {
      console.error('[WEBHOOK] Handler error:', err.message);
      res.status(500).send('Webhook handler error');
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 5 — GET INVOICE
// GET /api/onboarding/payment/invoice/:lead_id
// ══════════════════════════════════════════════════════════════════════════════
router.get('/payment/invoice/:lead_id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT i.*, p.payment_method, p.stripe_pi_id
       FROM tenant_invoices i
       JOIN tenant_payments p ON p.id = i.payment_id
       WHERE i.lead_id = $1 ORDER BY i.issued_at DESC LIMIT 1`,
      [req.params.lead_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'No invoice found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Invoice fetch failed.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 6 — TENANT PROVISIONING
// Triggered after payment_complete. Creates tenant record, generates PIN,
// assigns modules + miners, wires to brain, sends credentials via SMTP.
// ══════════════════════════════════════════════════════════════════════════════

const bcrypt = require('bcryptjs');

// Module sets per tier — mirrors TIER_DATA in TenantOnboarding.jsx
const TIER_MODULES = {
  0: [
    'grower_registration','fsma_intro','compliance_checklist',
    'geodna_qr_demo','basic_profile',
  ],
  1: [
    'grower_registration','fsma_intro','compliance_checklist',
    'geodna_qr_demo','basic_profile',
    'grower_portal','product_listing','seasonal_calendar',
    'weather_intelligence','compliance_assist','small_grower_intel',
  ],
  2: [
    'grower_registration','fsma_intro','compliance_checklist',
    'geodna_qr_demo','basic_profile',
    'grower_portal','product_listing','seasonal_calendar',
    'weather_intelligence','compliance_assist','small_grower_intel',
    'grower_master','grower_intelligence','grower_recommendations',
    'harvest_tracker','traceability_geodna','field_operations','unified_sourcing',
  ],
  3: [
    'grower_registration','fsma_intro','compliance_checklist',
    'geodna_qr_demo','basic_profile',
    'grower_portal','product_listing','seasonal_calendar',
    'weather_intelligence','compliance_assist','small_grower_intel',
    'grower_master','grower_intelligence','grower_recommendations',
    'harvest_tracker','traceability_geodna','field_operations','unified_sourcing',
    'ag_dashboard','usda_intel','usda_grower_search','price_alerts',
    'recon_engine','buyer_network','marketplace','ag_marketplace',
    'market_intelligence','commodity_intelligence','cold_chain',
    'port_intelligence','produce_market_weekly',
  ],
  4: [
    'grower_registration','fsma_intro','compliance_checklist',
    'geodna_qr_demo','basic_profile',
    'grower_portal','product_listing','seasonal_calendar',
    'weather_intelligence','compliance_assist','small_grower_intel',
    'grower_master','grower_intelligence','grower_recommendations',
    'harvest_tracker','traceability_geodna','field_operations','unified_sourcing',
    'ag_dashboard','usda_intel','usda_grower_search','price_alerts',
    'recon_engine','buyer_network','marketplace','ag_marketplace',
    'market_intelligence','commodity_intelligence','cold_chain',
    'port_intelligence','produce_market_weekly',
    'trade_finance','tariffs','logistics','manifest_intake',
    'sales_orders','trade_mgmt','shipping','export_docs',
    'regulatory_cbp','latam_intelligence','predictive_analyzer','document_vault',
  ],
  5: [
    'grower_registration','fsma_intro','compliance_checklist',
    'geodna_qr_demo','basic_profile',
    'grower_portal','product_listing','seasonal_calendar',
    'weather_intelligence','compliance_assist','small_grower_intel',
    'grower_master','grower_intelligence','grower_recommendations',
    'harvest_tracker','traceability_geodna','field_operations','unified_sourcing',
    'ag_dashboard','usda_intel','usda_grower_search','price_alerts',
    'recon_engine','buyer_network','marketplace','ag_marketplace',
    'market_intelligence','commodity_intelligence','cold_chain',
    'port_intelligence','produce_market_weekly',
    'trade_finance','tariffs','logistics','manifest_intake',
    'sales_orders','trade_mgmt','shipping','export_docs',
    'regulatory_cbp','latam_intelligence','predictive_analyzer','document_vault',
    'financial_suite','cogs_engine','factoring','entities_banking',
    'inventory','po_invoice','customer_portal_advanced','mobile_sales_upload',
    'ag_intel_master','ag_testing_81_miners','ai_agents','open_market',
    'buyer_offers','field_agent','food_safety_chain','transit_trail',
    'analytics_full','reports',
  ],
};

// Assign miners by tier + geography
function assignMiners(tier_id, latam_countries = [], country = 'US') {
  const base = ['weather_miner','usda_nass_miner','usda_ams_miner'];
  if (tier_id >= 2) base.push('faostat_miner','price_alert_miner');
  if (tier_id >= 3) base.push('recon_miner','port_intel_miner','market_report_miner');
  if (tier_id >= 4) base.push('latam_intel_miner','cbp_miner','tariff_miner');
  if (tier_id >= 5) base.push(...Array(81).fill(0).map((_,i) => `niner_miner_${i+1}`));
  if (latam_countries.length > 0) base.push('latam_geo_miner');
  if (country === 'MX' || latam_countries.includes('Mexico')) base.push('mx_border_miner');
  return [...new Set(base)];
}

// Secure 6-digit PIN
function generatePIN() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Credentials email HTML
function credentialsEmailHTML(email, pin, tier_name, legal_name) {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;background:#0f172a;font-family:sans-serif;padding:40px 20px">
  <div style="max-width:520px;margin:0 auto;background:#1e293b;border-radius:10px;
              padding:36px;border:1px solid #334155">
    <div style="margin-bottom:20px">
      <span style="color:#cba658;font-size:12px;font-weight:500;letter-spacing:2px;
                   text-transform:uppercase">AuditDNA Platform</span>
    </div>
    <h2 style="color:#e2e8f0;margin:0 0 6px;font-weight:500;font-size:20px">
      Your Account Is Ready
    </h2>
    <p style="color:#94a3b0;margin:0 0 24px;font-size:13px;line-height:1.6">
      ${legal_name ? `${legal_name}, your` : 'Your'} AuditDNA ${tier_name} account
      has been provisioned and is ready for login.
    </p>
    <div style="background:#0f172a;border:1px solid #334155;border-radius:8px;
                padding:20px;margin-bottom:24px">
      <div style="margin-bottom:12px">
        <div style="color:#64748b;font-size:10px;font-weight:500;letter-spacing:1px;
                    text-transform:uppercase;margin-bottom:4px">Username</div>
        <div style="color:#e2e8f0;font-size:14px;font-family:monospace">${email}</div>
      </div>
      <div>
        <div style="color:#64748b;font-size:10px;font-weight:500;letter-spacing:1px;
                    text-transform:uppercase;margin-bottom:4px">Temporary PIN</div>
        <div style="color:#cba658;font-size:32px;font-weight:500;letter-spacing:12px;
                    font-family:monospace;font-variant-numeric:tabular-nums">${pin}</div>
      </div>
    </div>
    <p style="color:#94a3b0;margin:0 0 20px;font-size:12px;line-height:1.6">
      You will be prompted to set a new PIN on first login.
      Never share your PIN. AuditDNA staff will never ask for it.
    </p>
    <a href="${process.env.REACT_APP_FRONTEND_URL || 'https://auditdna.netlify.app'}"
       style="display:inline-block;background:#cba658;color:#0f172a;padding:12px 28px;
              border-radius:6px;text-decoration:none;font-weight:500;font-size:14px;
              margin-bottom:24px">
      Login to AuditDNA
    </a>
    <div style="border-top:1px solid #334155;padding-top:16px;margin-top:8px">
      <p style="color:#64748b;font-size:11px;margin:0;line-height:1.6">
        Plan: ${tier_name}<br>
        Support: saul@mexausafg.com<br>
        MexaUSA Food Group Inc. / Mexausa Food Group, Inc. NMLS #337526
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 6 — PROVISION TENANT
// POST /api/onboarding/provision
// Body: { lead_id }
// Idempotent — safe to call multiple times
// ══════════════════════════════════════════════════════════════════════════════
router.post('/provision', async (req, res) => {
  const { lead_id } = req.body;
  if (!lead_id) return res.status(400).json({ error: 'lead_id required' });

  try {
    // ── 1. Verify payment complete ──────────────────────────────────────────
    const tierResult = await pool.query(
      `SELECT t.tier_id, t.tier_name, t.billing_cycle, t.price_monthly, t.status,
              l.email, l.business_name, l.crop_type,
              k.legal_name, k.contact_title, k.gps_lat, k.gps_lng,
              k.latam_countries, k.country
       FROM tenant_tier_selections t
       JOIN tenant_leads l ON l.id = t.lead_id
       JOIN tenant_kyc   k ON k.lead_id = t.lead_id
       WHERE t.lead_id = $1`,
      [lead_id]
    );

    if (tierResult.rows.length === 0) {
      return res.status(404).json({ error: 'No tier selection found for this lead.' });
    }

    const data = tierResult.rows[0];

    if (!['payment_complete','provisioned'].includes(data.status)) {
      return res.status(400).json({
        error: `Payment not complete. Current status: ${data.status}. Complete Phase 5 first.`,
      });
    }

    // ── 2. Idempotency — return existing if already provisioned ─────────────
    const existing = await pool.query(
      `SELECT id, email, tier_name, status FROM tenants WHERE lead_id = $1`,
      [lead_id]
    );
    if (existing.rows.length > 0) {
      return res.json({
        success:              true,
        already_provisioned:  true,
        tenant_id:            existing.rows[0].id,
        email:                existing.rows[0].email,
        tier_name:            existing.rows[0].tier_name,
        message:              'Account already provisioned.',
      });
    }

    // ── 3. Generate PIN + hash (bcrypt rounds=12) ────────────────────────────
    const pin      = generatePIN();
    const pin_hash = await bcrypt.hash(pin, 12);

    // ── 4. Assign modules + miners ───────────────────────────────────────────
    const module_set      = TIER_MODULES[data.tier_id] || TIER_MODULES[0];
    const latam           = data.latam_countries || [];
    const assigned_miners = assignMiners(data.tier_id, latam, data.country || 'US');

    // ── 5. Renewal date ──────────────────────────────────────────────────────
    const renewalDate = new Date();
    renewalDate.setMonth(renewalDate.getMonth() + (data.billing_cycle === 'annual' ? 12 : 1));

    // ── 6. Brain tenant ID ───────────────────────────────────────────────────
    const brain_tenant_id = `tenant_${lead_id.replace(/-/g, '').substring(0, 12)}`;

    // ── 7. Insert tenant record ──────────────────────────────────────────────
    const tenantResult = await pool.query(
      `INSERT INTO tenants (
         lead_id, email, legal_name, business_name, contact_title,
         pin_hash, pin_temp,
         tier_id, tier_name, billing_cycle, price_monthly, module_set,
         renewal_date, brain_tenant_id, assigned_miners,
         gps_lat, gps_lng, latam_countries, crop_types, country, status
       ) VALUES (
         $1,$2,$3,$4,$5, $6,TRUE,
         $7,$8,$9,$10,$11,
         $12,$13,$14,
         $15,$16,$17,$18,$19,'active'
       ) RETURNING id`,
      [
        lead_id,
        data.email,
        data.legal_name    || null,
        data.business_name || null,
        data.contact_title || null,
        pin_hash,
        data.tier_id,
        data.tier_name,
        data.billing_cycle,
        data.price_monthly || 0,
        module_set,
        renewalDate.toISOString().split('T')[0],
        brain_tenant_id,
        assigned_miners,
        data.gps_lat || null,
        data.gps_lng || null,
        latam,
        data.crop_type ? [data.crop_type] : [],
        data.country || 'US',
      ]
    );

    const tenant_id = tenantResult.rows[0].id;

    // ── 8. Insert module access rows ─────────────────────────────────────────
    if (module_set.length > 0) {
      const moduleValues = module_set.map((_, i) => `($1, $${i + 2})`).join(', ');
      await pool.query(
        `INSERT INTO tenant_module_access (tenant_id, module_key)
         VALUES ${moduleValues} ON CONFLICT DO NOTHING`,
        [tenant_id, ...module_set]
      );
    }

    // ── 9. Create owner user record ──────────────────────────────────────────
    await pool.query(
      `INSERT INTO tenant_users
         (tenant_id, email, name, role, pin_hash, pin_temp, status, activated_at)
       VALUES ($1,$2,$3,'owner',$4,TRUE,'active',NOW())
       ON CONFLICT (tenant_id, email) DO NOTHING`,
      [tenant_id, data.email, data.legal_name || data.business_name || data.email, pin_hash]
    );

    // ── 10. Advance tier selection status ────────────────────────────────────
    await pool.query(
      `UPDATE tenant_tier_selections
       SET status = 'provisioned', updated_at = NOW()
       WHERE lead_id = $1`,
      [lead_id]
    );

    // ── 11. Brain event: tenant_provisioned ──────────────────────────────────
    await fireBrainEvent('tenant_provisioned', {
      tenant_id,
      lead_id,
      brain_tenant_id,
      email:           data.email,
      tier_id:         data.tier_id,
      tier_name:       data.tier_name,
      module_count:    module_set.length,
      miner_count:     assigned_miners.length,
      billing_cycle:   data.billing_cycle,
      renewal_date:    renewalDate.toISOString().split('T')[0],
      country:         data.country,
      latam_countries: latam,
    }, tenant_id);

    // ── 12. Send credentials email via GoDaddy SMTP ──────────────────────────
    try {
      await transporter.sendMail({
        from:    '"AuditDNA Platform" <saul@mexausafg.com>',
        to:      data.email,
        subject: `Your AuditDNA ${data.tier_name} Account Is Ready`,
        html:    credentialsEmailHTML(
          data.email, pin, data.tier_name,
          data.legal_name || data.business_name
        ),
      });
    } catch (mailErr) {
      console.error('[PROVISION] Credentials email failed:', mailErr.message);
    }

    // ── 13. Notify owner ─────────────────────────────────────────────────────
    try {
      await transporter.sendMail({
        from:    '"AuditDNA Platform" <saul@mexausafg.com>',
        to:      'saul@mexausafg.com',
        subject: `[AuditDNA] New Tenant — ${data.legal_name || data.email} (${data.tier_name})`,
        html: `
          <body style="background:#0f172a;font-family:sans-serif;padding:40px">
            <div style="background:#1e293b;padding:28px;border-radius:8px;
                        border:1px solid #334155;max-width:480px">
              <h3 style="color:#cba658;margin:0 0 16px;font-weight:500">New Tenant Provisioned</h3>
              <p style="color:#cbd5e1;margin:0 0 6px;font-size:13px">Business: ${data.legal_name || data.business_name || 'N/A'}</p>
              <p style="color:#cbd5e1;margin:0 0 6px;font-size:13px">Email: ${data.email}</p>
              <p style="color:#cbd5e1;margin:0 0 6px;font-size:13px">Plan: ${data.tier_name} (${data.billing_cycle})</p>
              <p style="color:#cbd5e1;margin:0 0 6px;font-size:13px">Modules: ${module_set.length} | Miners: ${assigned_miners.length}</p>
              <p style="color:#cbd5e1;margin:0 0 6px;font-size:13px">Renewal: ${renewalDate.toLocaleDateString('en-US')}</p>
              <p style="color:#94a3b0;margin:16px 0 0;font-size:11px">Brain ID: ${brain_tenant_id}</p>
            </div>
          </body>
        `,
      });
    } catch (e) { /* non-blocking */ }

    res.json({
      success:         true,
      tenant_id,
      brain_tenant_id,
      email:           data.email,
      tier_id:         data.tier_id,
      tier_name:       data.tier_name,
      billing_cycle:   data.billing_cycle,
      module_count:    module_set.length,
      miner_count:     assigned_miners.length,
      renewal_date:    renewalDate.toISOString().split('T')[0],
      modules:         module_set,
      miners:          assigned_miners,
      next_phase:      7,
    });

  } catch (err) {
    console.error('[PROVISION] Error:', err);
    res.status(500).json({ error: err.message || 'Provisioning failed.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 6 — PROVISION STATUS
// GET /api/onboarding/provision/status/:lead_id
// ══════════════════════════════════════════════════════════════════════════════
router.get('/provision/status/:lead_id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, tier_id, tier_name, billing_cycle,
              module_set, assigned_miners, brain_tenant_id,
              renewal_date, status, provisioned_at
       FROM tenants WHERE lead_id = $1`,
      [req.params.lead_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ provisioned: false });

    const t = result.rows[0];
    res.json({
      provisioned:     true,
      tenant_id:       t.id,
      email:           t.email,
      tier_id:         t.tier_id,
      tier_name:       t.tier_name,
      billing_cycle:   t.billing_cycle,
      module_count:    (t.module_set || []).length,
      miner_count:     (t.assigned_miners || []).length,
      brain_tenant_id: t.brain_tenant_id,
      renewal_date:    t.renewal_date,
      status:          t.status,
      provisioned_at:  t.provisioned_at,
    });
  } catch (err) {
    res.status(500).json({ error: 'Status check failed.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 6 — VERIFY TEMP PIN (first login)
// POST /api/onboarding/provision/verify-pin
// Body: { email, pin }
// ══════════════════════════════════════════════════════════════════════════════
router.post('/provision/verify-pin', async (req, res) => {
  const { email, pin } = req.body;
  if (!email || !pin) return res.status(400).json({ error: 'email and pin required' });

  try {
    const result = await pool.query(
      `SELECT id, pin_hash, pin_temp, tier_id, tier_name, status
       FROM tenants WHERE email = $1`,
      [email.toLowerCase().trim()]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Account not found.' });

    const tenant = result.rows[0];
    if (tenant.status !== 'active') {
      return res.status(403).json({ error: `Account is ${tenant.status}. Contact support.` });
    }

    const valid = await bcrypt.compare(pin.toString(), tenant.pin_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid PIN.' });

    await pool.query(`UPDATE tenants SET last_login = NOW() WHERE id = $1`, [tenant.id]);

    res.json({
      success:   true,
      tenant_id: tenant.id,
      tier_id:   tenant.tier_id,
      tier_name: tenant.tier_name,
      pin_temp:  tenant.pin_temp,
    });
  } catch (err) {
    console.error('[PROVISION] Verify PIN error:', err);
    res.status(500).json({ error: 'PIN verification failed.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 6 — SET NEW PIN
// POST /api/onboarding/provision/set-pin
// Body: { tenant_id, new_pin }
// ══════════════════════════════════════════════════════════════════════════════
router.post('/provision/set-pin', async (req, res) => {
  const { tenant_id, new_pin } = req.body;
  if (!tenant_id || !new_pin) return res.status(400).json({ error: 'tenant_id and new_pin required' });

  const len = new_pin.toString().length;
  if (len !== 4 && len !== 6) return res.status(400).json({ error: 'PIN must be 4 or 6 digits.' });

  try {
    const pin_hash = await bcrypt.hash(new_pin.toString(), 12);

    await pool.query(
      `UPDATE tenants SET pin_hash = $2, pin_temp = FALSE, updated_at = NOW() WHERE id = $1`,
      [tenant_id, pin_hash]
    );
    await pool.query(
      `UPDATE tenant_users SET pin_hash = $2, pin_temp = FALSE
       WHERE tenant_id = $1 AND role = 'owner'`,
      [tenant_id, pin_hash]
    );

    await fireBrainEvent('pin_set', { tenant_id });

    res.json({ success: true, message: 'PIN updated. Account fully activated.' });
  } catch (err) {
    console.error('[PROVISION] Set PIN error:', err);
    res.status(500).json({ error: 'Failed to set PIN.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 7 — ONBOARDING WIZARD
// Step 1: Business Profile Confirmation (auto-populated from KYC)
// ══════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 7 — LOAD WIZARD STATE + PRE-POPULATED PROFILE
// GET /api/onboarding/wizard/:tenant_id
// Returns wizard progress + full KYC/tenant data for auto-population
// ══════════════════════════════════════════════════════════════════════════════
router.get('/wizard/:tenant_id', async (req, res) => {
  try {
    // Get tenant core data
    const tenantResult = await pool.query(
      `SELECT t.id, t.email, t.legal_name, t.business_name, t.contact_title,
              t.tier_id, t.tier_name, t.billing_cycle, t.country,
              t.gps_lat, t.gps_lng, t.latam_countries, t.crop_types,
              k.ein_rfc, k.incorporation_state, k.usda_farm_id,
              k.address_line1, k.city, k.state_region, k.postal_code,
              k.grower_reg_num, k.fsma_status,
              l.phone
       FROM tenants t
       LEFT JOIN tenant_leads l ON l.id = t.lead_id
       LEFT JOIN tenant_kyc   k ON k.lead_id = t.lead_id
       WHERE t.id = $1`,
      [req.params.tenant_id]
    );

    if (tenantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const tenant = tenantResult.rows[0];

    // Get or create wizard progress record
    let wizardResult = await pool.query(
      `SELECT * FROM tenant_wizard_progress WHERE tenant_id = $1`,
      [req.params.tenant_id]
    );

    if (wizardResult.rows.length === 0) {
      await pool.query(
        `INSERT INTO tenant_wizard_progress (tenant_id) VALUES ($1)`,
        [req.params.tenant_id]
      );
      wizardResult = await pool.query(
        `SELECT * FROM tenant_wizard_progress WHERE tenant_id = $1`,
        [req.params.tenant_id]
      );
    }

    const wizard = wizardResult.rows[0];

    // Build auto-populated profile — wizard overrides take precedence over KYC
    const profile = {
      legal_name:    wizard.profile_legal_name    || tenant.legal_name    || tenant.business_name || '',
      dba:           wizard.profile_dba           || tenant.business_name || '',
      address:       wizard.profile_address       || tenant.address_line1 || '',
      city:          wizard.profile_city          || tenant.city          || '',
      state:         wizard.profile_state         || tenant.state_region  || '',
      postal:        wizard.profile_postal        || tenant.postal_code   || '',
      country:       wizard.profile_country       || tenant.country       || 'US',
      ein_rfc:       wizard.profile_ein_rfc       || tenant.ein_rfc       || '',
      contact_name:  wizard.profile_contact_name  || tenant.legal_name    || '',
      contact_title: wizard.profile_contact_title || tenant.contact_title || '',
      contact_email: wizard.profile_contact_email || tenant.email         || '',
      contact_phone: wizard.profile_contact_phone || tenant.phone         || '',
      usda_farm_id:  wizard.profile_usda_farm_id  || tenant.usda_farm_id  || '',
      fiscal_year:   wizard.profile_fiscal_year   || 1,
      currency:      wizard.profile_currency      || 'USD',
      bank_name:     wizard.profile_bank_name     || '',
    };

    res.json({
      tenant_id:       tenant.id,
      email:           tenant.email,
      tier_id:         tenant.tier_id,
      tier_name:       tenant.tier_name,
      billing_cycle:   tenant.billing_cycle,
      crop_types:      tenant.crop_types || [],
      latam_countries: tenant.latam_countries || [],
      wizard: {
        step1_profile:   wizard.step1_profile,
        step2_catalog:   wizard.step2_catalog,
        step3_bank:      wizard.step3_bank,
        step4_docs:      wizard.step4_docs,
        step5_team:      wizard.step5_team,
        step6_alerts:    wizard.step6_alerts,
        wizard_complete: wizard.wizard_complete,
        completed_at:    wizard.completed_at,
      },
      profile,
    });

  } catch (err) {
    console.error('[WIZARD] Load error:', err);
    res.status(500).json({ error: 'Failed to load wizard.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 7 — SAVE STEP 1: BUSINESS PROFILE
// POST /api/onboarding/wizard/step1
// Body: { tenant_id, profile: { legal_name, dba, address, city, state,
//         postal, country, ein_rfc, contact_name, contact_title,
//         contact_email, contact_phone, usda_farm_id, fiscal_year,
//         currency, bank_name } }
// ══════════════════════════════════════════════════════════════════════════════
router.post('/wizard/step1', async (req, res) => {
  const { tenant_id, profile } = req.body;

  if (!tenant_id) return res.status(400).json({ error: 'tenant_id required' });
  if (!profile)   return res.status(400).json({ error: 'profile required' });
  if (!profile.legal_name || profile.legal_name.trim().length < 2) {
    return res.status(400).json({ error: 'Legal business name required' });
  }

  try {
    // Verify tenant exists
    const tenantCheck = await pool.query(
      `SELECT id, email FROM tenants WHERE id = $1`, [tenant_id]
    );
    if (tenantCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Upsert wizard progress — set step1 complete, save all profile fields
    await pool.query(
      `INSERT INTO tenant_wizard_progress (
         tenant_id, step1_profile,
         profile_legal_name, profile_dba, profile_address, profile_city,
         profile_state, profile_postal, profile_country, profile_ein_rfc,
         profile_contact_name, profile_contact_title, profile_contact_email,
         profile_contact_phone, profile_usda_farm_id, profile_fiscal_year,
         profile_currency, profile_bank_name, updated_at
       )
       VALUES ($1, TRUE, $2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17, NOW())
       ON CONFLICT (tenant_id) DO UPDATE SET
         step1_profile         = TRUE,
         profile_legal_name    = EXCLUDED.profile_legal_name,
         profile_dba           = EXCLUDED.profile_dba,
         profile_address       = EXCLUDED.profile_address,
         profile_city          = EXCLUDED.profile_city,
         profile_state         = EXCLUDED.profile_state,
         profile_postal        = EXCLUDED.profile_postal,
         profile_country       = EXCLUDED.profile_country,
         profile_ein_rfc       = EXCLUDED.profile_ein_rfc,
         profile_contact_name  = EXCLUDED.profile_contact_name,
         profile_contact_title = EXCLUDED.profile_contact_title,
         profile_contact_email = EXCLUDED.profile_contact_email,
         profile_contact_phone = EXCLUDED.profile_contact_phone,
         profile_usda_farm_id  = EXCLUDED.profile_usda_farm_id,
         profile_fiscal_year   = EXCLUDED.profile_fiscal_year,
         profile_currency      = EXCLUDED.profile_currency,
         profile_bank_name     = EXCLUDED.profile_bank_name,
         updated_at            = NOW()`,
      [
        tenant_id,
        profile.legal_name?.trim()    || null,
        profile.dba?.trim()           || null,
        profile.address?.trim()       || null,
        profile.city?.trim()          || null,
        profile.state?.trim()         || null,
        profile.postal?.trim()        || null,
        profile.country               || 'US',
        profile.ein_rfc?.trim()       || null,
        profile.contact_name?.trim()  || null,
        profile.contact_title?.trim() || null,
        profile.contact_email?.trim() || null,
        profile.contact_phone?.trim() || null,
        profile.usda_farm_id?.trim()  || null,
        parseInt(profile.fiscal_year) || 1,
        profile.currency              || 'USD',
        profile.bank_name?.trim()     || null,
      ]
    );

    // Also update the canonical tenants record with confirmed legal name
    await pool.query(
      `UPDATE tenants SET
         legal_name    = $2,
         business_name = COALESCE($3, business_name),
         updated_at    = NOW()
       WHERE id = $1`,
      [tenant_id, profile.legal_name.trim(), profile.dba?.trim() || null]
    );

    await fireBrainEvent('wizard_step1_complete', {
      tenant_id,
      legal_name:  profile.legal_name.trim(),
      country:     profile.country,
      currency:    profile.currency,
      fiscal_year: profile.fiscal_year,
    }, tenant_id);

    res.json({
      success:    true,
      step:       1,
      next_step:  2,
      message:    'Business profile confirmed.',
    });

  } catch (err) {
    console.error('[WIZARD] Step 1 error:', err);
    res.status(500).json({ error: 'Failed to save business profile.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 7 — SKIP A STEP
// POST /api/onboarding/wizard/skip
// Body: { tenant_id, step }  — step: 1–6
// Marks a step as skipped (wizard_progress column set true) so tenant
// can proceed without completing it. They can return later via dashboard badge.
// ══════════════════════════════════════════════════════════════════════════════
router.post('/wizard/skip', async (req, res) => {
  const { tenant_id, step } = req.body;
  if (!tenant_id || !step) return res.status(400).json({ error: 'tenant_id and step required' });

  const colMap = {
    1: 'step1_profile', 2: 'step2_catalog', 3: 'step3_bank',
    4: 'step4_docs',    5: 'step5_team',    6: 'step6_alerts',
  };
  const col = colMap[parseInt(step)];
  if (!col) return res.status(400).json({ error: 'Invalid step (1–6)' });

  try {
    await pool.query(
      `UPDATE tenant_wizard_progress SET ${col} = TRUE, updated_at = NOW()
       WHERE tenant_id = $1`,
      [tenant_id]
    );

    // Check if all steps are now complete
    const result = await pool.query(
      `SELECT step1_profile, step2_catalog, step3_bank,
              step4_docs, step5_team, step6_alerts
       FROM tenant_wizard_progress WHERE tenant_id = $1`,
      [tenant_id]
    );

    const w = result.rows[0];
    const allDone = w && Object.values(w).every(Boolean);

    if (allDone) {
      await pool.query(
        `UPDATE tenant_wizard_progress
         SET wizard_complete = TRUE, completed_at = NOW()
         WHERE tenant_id = $1`,
        [tenant_id]
      );
      await fireBrainEvent('wizard_complete', { tenant_id }, tenant_id);
    }

    res.json({ success: true, skipped_step: step, wizard_complete: allDone });
  } catch (err) {
    console.error('[WIZARD] Skip error:', err);
    res.status(500).json({ error: 'Failed to skip step.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 7 — WIZARD COMPLETE
// POST /api/onboarding/wizard/complete
// Body: { tenant_id }
// Force-marks wizard as complete (all steps done or deliberately finished)
// ══════════════════════════════════════════════════════════════════════════════
router.post('/wizard/complete', async (req, res) => {
  const { tenant_id } = req.body;
  if (!tenant_id) return res.status(400).json({ error: 'tenant_id required' });

  try {
    await pool.query(
      `UPDATE tenant_wizard_progress
       SET step1_profile = TRUE, step2_catalog = TRUE, step3_bank = TRUE,
           step4_docs = TRUE, step5_team = TRUE, step6_alerts = TRUE,
           wizard_complete = TRUE, completed_at = NOW(), updated_at = NOW()
       WHERE tenant_id = $1`,
      [tenant_id]
    );

    await fireBrainEvent('wizard_complete', {
      tenant_id,
      completed_at: new Date().toISOString(),
    }, tenant_id);

    res.json({ success: true, wizard_complete: true });
  } catch (err) {
    console.error('[WIZARD] Complete error:', err);
    res.status(500).json({ error: 'Failed to mark wizard complete.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 8 — BRAIN + MINER ACTIVATION
// POST /api/onboarding/brain/activate     — activate brain for tenant
// GET  /api/onboarding/brain/status/:tid  — poll activation status
// POST /api/onboarding/brain/ping         — miners check-in
// ══════════════════════════════════════════════════════════════════════════════

// Miner categories by tier — what actually feeds the brain
const MINER_SCHEDULE = {
  weather:      { interval_min: 15,  label: 'Weather Intelligence' },
  usda_nass:    { interval_min: 60,  label: 'USDA NASS Prices' },
  usda_ams:     { interval_min: 60,  label: 'USDA AMS Reports' },
  faostat:      { interval_min: 120, label: 'FAOSTAT Global Prices' },
  price_alert:  { interval_min: 30,  label: 'Price Alert Monitor' },
  recon:        { interval_min: 240, label: 'Recon Engine' },
  port_intel:   { interval_min: 60,  label: 'Port Intelligence' },
  market_report:{ interval_min: 360, label: 'Market Reports' },
  latam_intel:  { interval_min: 180, label: 'LATAM Intelligence' },
  cbp:          { interval_min: 120, label: 'CBP / Customs' },
  tariff:       { interval_min: 360, label: 'Tariff Engine' },
};

router.post('/brain/activate', async (req, res) => {
  const { tenant_id } = req.body;
  if (!tenant_id) return res.status(400).json({ error: 'tenant_id required' });

  try {
    // Verify tenant provisioned
    const tenant = await pool.query(
      `SELECT id, email, tier_id, tier_name, brain_tenant_id,
              assigned_miners, crop_types, latam_countries, country,
              gps_lat, gps_lng
       FROM tenants WHERE id = $1 AND status = 'active'`,
      [tenant_id]
    );
    if (tenant.rows.length === 0) {
      return res.status(404).json({ error: 'Active tenant not found.' });
    }

    const t = tenant.rows[0];

    // Idempotent — return existing if already activated
    const existing = await pool.query(
      `SELECT * FROM tenant_brain_activations WHERE tenant_id = $1`,
      [tenant_id]
    );
    if (existing.rows.length > 0 && existing.rows[0].activated) {
      return res.json({
        success:       true,
        already_active: true,
        brain_tenant_id: t.brain_tenant_id,
        miners_total:  existing.rows[0].miners_total,
        miners_active: existing.rows[0].miners_active,
      });
    }

    const miners        = t.assigned_miners || [];
    const api_key       = require('crypto').randomBytes(32).toString('hex');
    const activatedAt   = new Date();

    // Create or update brain activation record
    await pool.query(
      `INSERT INTO tenant_brain_activations
         (tenant_id, activated, activated_at, miners_total, miners_active,
          brain_tenant_id, api_key, last_miner_ping)
       VALUES ($1, TRUE, $2, $3, $3, $4, $5, $2)
       ON CONFLICT (tenant_id) DO UPDATE SET
         activated        = TRUE,
         activated_at     = EXCLUDED.activated_at,
         miners_total     = EXCLUDED.miners_total,
         miners_active    = EXCLUDED.miners_active,
         brain_tenant_id  = EXCLUDED.brain_tenant_id,
         api_key          = EXCLUDED.api_key,
         last_miner_ping  = EXCLUDED.last_miner_ping,
         updated_at       = NOW()`,
      [tenant_id, activatedAt, miners.length, t.brain_tenant_id, api_key]
    );

    // Log activation events for each miner category
    const minerCategories = Object.keys(MINER_SCHEDULE)
      .filter(m => miners.some(am => am.includes(m.split('_')[0])));

    for (const miner of minerCategories.slice(0, 10)) {
      await pool.query(
        `INSERT INTO tenant_miner_events
           (tenant_id, miner_key, event_type, payload)
         VALUES ($1, $2, 'activated', $3)`,
        [tenant_id, miner, JSON.stringify({
          label:        MINER_SCHEDULE[miner]?.label,
          interval_min: MINER_SCHEDULE[miner]?.interval_min,
          activated_at: activatedAt.toISOString(),
        })]
      );
    }

    await fireBrainEvent('brain_activated', {
      tenant_id,
      brain_tenant_id:  t.brain_tenant_id,
      tier_id:          t.tier_id,
      miners_total:     miners.length,
      miner_categories: minerCategories,
      gps_lat:          t.gps_lat,
      gps_lng:          t.gps_lng,
      latam_countries:  t.latam_countries,
      crop_types:       t.crop_types,
    }, tenant_id);

    // Schedule first intelligence report (24h from now)
    const reportAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await pool.query(
      `INSERT INTO tenant_backoffice_jobs
         (tenant_id, job_type, status, scheduled_at)
       VALUES ($1, 'report_gen', 'pending', $2)
       ON CONFLICT DO NOTHING`,
      [tenant_id, reportAt]
    );

    // Send activation confirmation email
    try {
      await transporter.sendMail({
        from:    '"AuditDNA Platform" <saul@mexausafg.com>',
        to:      t.email,
        subject: `AuditDNA — Your Intelligence Miners Are Active`,
        html: `
          <body style="margin:0;background:#0f172a;font-family:sans-serif;padding:40px 20px">
            <div style="max-width:520px;margin:0 auto;background:#1e293b;border-radius:10px;
                        padding:36px;border:1px solid #334155">
              <span style="color:#cba658;font-size:12px;font-weight:500;letter-spacing:2px;
                           text-transform:uppercase">AuditDNA Platform</span>
              <h2 style="color:#e2e8f0;margin:16px 0 8px;font-weight:500">
                Your Intelligence Is Live
              </h2>
              <p style="color:#94a3b0;margin:0 0 20px;font-size:13px;line-height:1.6">
                ${miners.length} intelligence miners are now active and collecting
                data for your account. Your first intelligence briefing will arrive
                within 24 hours.
              </p>
              <div style="background:#0f172a;border:1px solid #334155;border-radius:8px;
                          padding:16px;margin-bottom:20px">
                <div style="color:#64748b;font-size:10px;letter-spacing:1px;
                            text-transform:uppercase;margin-bottom:10px">Active Systems</div>
                ${minerCategories.slice(0,6).map(m =>
                  `<div style="color:#94a3b0;font-size:12px;padding:3px 0">
                    ${MINER_SCHEDULE[m]?.label || m}
                    <span style="color:#64748b;font-size:10px;margin-left:8px">
                      every ${MINER_SCHEDULE[m]?.interval_min}min
                    </span>
                  </div>`
                ).join('')}
              </div>
              <p style="color:#64748b;font-size:11px;margin:0">
                MexaUSA Food Group Inc. / Mexausa Food Group, Inc. NMLS #337526
              </p>
            </div>
          </body>
        `,
      });
    } catch (e) { /* non-blocking */ }

    res.json({
      success:         true,
      brain_tenant_id: t.brain_tenant_id,
      miners_total:    miners.length,
      miners_active:   miners.length,
      activated_at:    activatedAt.toISOString(),
      first_report_at: reportAt.toISOString(),
      miner_categories: minerCategories,
    });

  } catch (err) {
    console.error('[BRAIN] Activation error:', err);
    res.status(500).json({ error: 'Brain activation failed.' });
  }
});

router.get('/brain/status/:tenant_id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, t.tier_name, t.assigned_miners, t.email
       FROM tenant_brain_activations b
       JOIN tenants t ON t.id = b.tenant_id
       WHERE b.tenant_id = $1`,
      [req.params.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.json({ activated: false });
    }

    const b = result.rows[0];

    // Get recent miner events
    const events = await pool.query(
      `SELECT miner_key, event_type, payload, created_at
       FROM tenant_miner_events
       WHERE tenant_id = $1
       ORDER BY created_at DESC LIMIT 20`,
      [req.params.tenant_id]
    );

    res.json({
      activated:         b.activated,
      activated_at:      b.activated_at,
      baseline_complete: b.baseline_complete,
      miners_total:      b.miners_total,
      miners_active:     b.miners_active,
      last_miner_ping:   b.last_miner_ping,
      first_report_sent: b.first_report_sent,
      brain_tenant_id:   b.brain_tenant_id,
      tier_name:         b.tier_name,
      assigned_miners:   b.assigned_miners || [],
      recent_events:     events.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Status check failed.' });
  }
});

router.post('/brain/ping', async (req, res) => {
  const { tenant_id, miner_key, data_collected } = req.body;
  if (!tenant_id || !miner_key) {
    return res.status(400).json({ error: 'tenant_id and miner_key required' });
  }

  try {
    await pool.query(
      `UPDATE tenant_brain_activations
       SET last_miner_ping = NOW(), updated_at = NOW()
       WHERE tenant_id = $1`,
      [tenant_id]
    );

    await pool.query(
      `INSERT INTO tenant_miner_events
         (tenant_id, miner_key, event_type, payload)
       VALUES ($1, $2, 'data_collected', $3)`,
      [tenant_id, miner_key, JSON.stringify({ data_collected, pinged_at: new Date().toISOString() })]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Ping failed.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 9 — BACK OFFICE AUTOMATION
// GET  /api/onboarding/backoffice/status/:tid  — QB-style ops dashboard data
// POST /api/onboarding/backoffice/settings     — save settings
// POST /api/onboarding/backoffice/run-job      — trigger a job manually
// ══════════════════════════════════════════════════════════════════════════════

router.get('/backoffice/status/:tenant_id', async (req, res) => {
  try {
    const tenant = await pool.query(
      `SELECT id, email, tier_id, tier_name, billing_cycle,
              price_monthly, renewal_date
       FROM tenants WHERE id = $1`,
      [req.params.tenant_id]
    );
    if (tenant.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const t = tenant.rows[0];

    // Get or create settings
    let settings = await pool.query(
      `SELECT * FROM tenant_backoffice_settings WHERE tenant_id = $1`,
      [req.params.tenant_id]
    );
    if (settings.rows.length === 0) {
      await pool.query(
        `INSERT INTO tenant_backoffice_settings (tenant_id) VALUES ($1)`,
        [req.params.tenant_id]
      );
      settings = await pool.query(
        `SELECT * FROM tenant_backoffice_settings WHERE tenant_id = $1`,
        [req.params.tenant_id]
      );
    }

    // Get recent jobs
    const jobs = await pool.query(
      `SELECT job_type, status, records_processed, created_at, completed_at, error_msg
       FROM tenant_backoffice_jobs
       WHERE tenant_id = $1
       ORDER BY created_at DESC LIMIT 20`,
      [req.params.tenant_id]
    );

    // Get invoices
    const invoices = await pool.query(
      `SELECT invoice_number, amount_cents, line_item, billing_period,
              issued_at, payment_status
       FROM tenant_invoices
       WHERE lead_id IN (SELECT lead_id FROM tenants WHERE id = $1)
       ORDER BY issued_at DESC LIMIT 5`,
      [req.params.tenant_id]
    );

    // Summary stats
    const totalProcessed = jobs.rows.reduce((sum, j) => sum + (j.records_processed || 0), 0);
    const completedJobs  = jobs.rows.filter(j => j.status === 'complete').length;
    const failedJobs     = jobs.rows.filter(j => j.status === 'failed').length;

    res.json({
      tenant:   { ...t },
      settings: settings.rows[0],
      jobs:     jobs.rows,
      invoices: invoices.rows,
      stats: {
        total_jobs:       jobs.rows.length,
        completed_jobs:   completedJobs,
        failed_jobs:      failedJobs,
        records_processed: totalProcessed,
      },
      // QB-style module statuses
      modules: {
        bank_sync: {
          enabled: settings.rows[0]?.bank_connected,
          last_run: jobs.rows.find(j => j.job_type === 'bank_sync')?.completed_at || null,
          status:   jobs.rows.find(j => j.job_type === 'bank_sync')?.status || 'never',
        },
        invoice_ocr: {
          enabled: settings.rows[0]?.ocr_enabled,
          last_run: jobs.rows.find(j => j.job_type === 'invoice_ocr')?.completed_at || null,
          count:   jobs.rows.filter(j => j.job_type === 'invoice_ocr' && j.status === 'complete').length,
        },
        reconciliation: {
          enabled: true,
          last_run: jobs.rows.find(j => j.job_type === 'reconciliation')?.completed_at || null,
          status:   jobs.rows.find(j => j.job_type === 'reconciliation')?.status || 'never',
        },
        fsma_check: {
          enabled: settings.rows[0]?.fsma_auto_record,
          last_run: jobs.rows.find(j => j.job_type === 'fsma_check')?.completed_at || null,
        },
        report_gen: {
          enabled: settings.rows[0]?.monthly_report,
          last_run: jobs.rows.find(j => j.job_type === 'report_gen')?.completed_at || null,
          next_run: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
        },
      },
    });
  } catch (err) {
    console.error('[BACKOFFICE] Status error:', err);
    res.status(500).json({ error: 'Back office status failed.' });
  }
});

router.post('/backoffice/settings', async (req, res) => {
  const { tenant_id, settings } = req.body;
  if (!tenant_id || !settings) {
    return res.status(400).json({ error: 'tenant_id and settings required' });
  }

  try {
    await pool.query(
      `INSERT INTO tenant_backoffice_settings
         (tenant_id, bank_connected, bank_sync_hour, auto_categorize,
          ocr_enabled, fsma_auto_record, monthly_report)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (tenant_id) DO UPDATE SET
         bank_connected   = EXCLUDED.bank_connected,
         bank_sync_hour   = EXCLUDED.bank_sync_hour,
         auto_categorize  = EXCLUDED.auto_categorize,
         ocr_enabled      = EXCLUDED.ocr_enabled,
         fsma_auto_record = EXCLUDED.fsma_auto_record,
         monthly_report   = EXCLUDED.monthly_report,
         updated_at       = NOW()`,
      [
        tenant_id,
        settings.bank_connected   ?? false,
        settings.bank_sync_hour   ?? 6,
        settings.auto_categorize  ?? true,
        settings.ocr_enabled      ?? true,
        settings.fsma_auto_record ?? true,
        settings.monthly_report   ?? true,
      ]
    );

    await fireBrainEvent('backoffice_settings_saved', { tenant_id, settings }, tenant_id);
    res.json({ success: true });
  } catch (err) {
    console.error('[BACKOFFICE] Settings error:', err);
    res.status(500).json({ error: 'Failed to save settings.' });
  }
});

router.post('/backoffice/run-job', async (req, res) => {
  const { tenant_id, job_type } = req.body;
  const valid = ['bank_sync','invoice_ocr','reconciliation','fsma_check','report_gen'];
  if (!tenant_id || !job_type) return res.status(400).json({ error: 'tenant_id and job_type required' });
  if (!valid.includes(job_type)) return res.status(400).json({ error: `Invalid job_type. Valid: ${valid.join(', ')}` });

  try {
    const result = await pool.query(
      `INSERT INTO tenant_backoffice_jobs
         (tenant_id, job_type, status, started_at)
       VALUES ($1, $2, 'running', NOW())
       RETURNING id`,
      [tenant_id, job_type]
    );

    const job_id = result.rows[0].id;

    // Simulate job completion (wire real logic per job type here)
    setTimeout(async () => {
      try {
        await pool.query(
          `UPDATE tenant_backoffice_jobs
           SET status = 'complete', completed_at = NOW(),
               records_processed = $2
           WHERE id = $1`,
          [job_id, Math.floor(Math.random() * 50) + 1]
        );
        await fireBrainEvent(`job_complete_${job_type}`, { tenant_id, job_id }, tenant_id);
      } catch (e) { /* non-blocking */ }
    }, 2000);

    await fireBrainEvent('backoffice_job_started', { tenant_id, job_type, job_id }, tenant_id);
    res.json({ success: true, job_id, status: 'running' });
  } catch (err) {
    console.error('[BACKOFFICE] Run job error:', err);
    res.status(500).json({ error: 'Failed to start job.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 10 — RENEWAL + OFFBOARDING
// GET  /api/onboarding/renewal/status/:tid   — account + renewal info
// POST /api/onboarding/renewal/renew         — process renewal
// POST /api/onboarding/renewal/upgrade       — upgrade tier
// POST /api/onboarding/renewal/cancel        — initiate cancellation
// POST /api/onboarding/renewal/export        — request data export
// GET  /api/onboarding/renewal/export/:tid   — check export status
// ══════════════════════════════════════════════════════════════════════════════

router.get('/renewal/status/:tenant_id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.id, t.email, t.legal_name, t.tier_id, t.tier_name,
              t.billing_cycle, t.price_monthly, t.renewal_date, t.status,
              t.provisioned_at, t.module_set,
              ts.price_paid,
              i.invoice_number, i.amount_cents, i.issued_at
       FROM tenants t
       LEFT JOIN tenant_tier_selections ts ON ts.lead_id = t.lead_id
       LEFT JOIN tenant_invoices i ON i.lead_id = t.lead_id
       WHERE t.id = $1
       ORDER BY i.issued_at DESC`,
      [req.params.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const t = result.rows[0];
    const renewalDate = new Date(t.renewal_date);
    const daysUntilRenewal = Math.ceil((renewalDate - Date.now()) / (1000 * 60 * 60 * 24));

    // Renewal event history
    const history = await pool.query(
      `SELECT event_type, old_tier_id, new_tier_id,
              effective_date, created_at, note
       FROM tenant_renewal_events
       WHERE tenant_id = $1
       ORDER BY created_at DESC LIMIT 10`,
      [req.params.tenant_id]
    );

    res.json({
      tenant_id:           t.id,
      email:               t.email,
      legal_name:          t.legal_name,
      tier_id:             t.tier_id,
      tier_name:           t.tier_name,
      billing_cycle:       t.billing_cycle,
      price_monthly:       t.price_monthly,
      renewal_date:        t.renewal_date,
      days_until_renewal:  daysUntilRenewal,
      status:              t.status,
      provisioned_at:      t.provisioned_at,
      module_count:        (t.module_set || []).length,
      renewal_urgent:      daysUntilRenewal <= 30,
      history:             history.rows,
      latest_invoice: t.invoice_number ? {
        number:     t.invoice_number,
        amount:     t.amount_cents,
        issued_at:  t.issued_at,
      } : null,
    });
  } catch (err) {
    console.error('[RENEWAL] Status error:', err);
    res.status(500).json({ error: 'Renewal status failed.' });
  }
});

router.post('/renewal/renew', async (req, res) => {
  const { tenant_id } = req.body;
  if (!tenant_id) return res.status(400).json({ error: 'tenant_id required' });

  try {
    const tenant = await pool.query(
      `SELECT id, email, legal_name, tier_id, tier_name,
              billing_cycle, price_monthly, renewal_date
       FROM tenants WHERE id = $1`,
      [tenant_id]
    );
    if (tenant.rows.length === 0) return res.status(404).json({ error: 'Tenant not found' });

    const t = tenant.rows[0];
    const newRenewal = new Date(t.renewal_date);
    newRenewal.setMonth(newRenewal.getMonth() + (t.billing_cycle === 'annual' ? 12 : 1));

    await pool.query(
      `UPDATE tenants SET renewal_date = $2, updated_at = NOW() WHERE id = $1`,
      [tenant_id, newRenewal.toISOString().split('T')[0]]
    );

    await pool.query(
      `INSERT INTO tenant_renewal_events
         (tenant_id, event_type, old_tier_id, new_tier_id,
          amount_cents, effective_date, triggered_by)
       VALUES ($1,'renewed',$2,$2,$3,$4,'system')`,
      [tenant_id, t.tier_id,
       Math.round(t.price_monthly * (t.billing_cycle === 'annual' ? 1000 : 100)),
       newRenewal.toISOString().split('T')[0]]
    );

    await fireBrainEvent('tenant_renewed', {
      tenant_id, tier_name: t.tier_name,
      new_renewal_date: newRenewal.toISOString().split('T')[0],
    }, tenant_id);

    // Renewal confirmation email
    try {
      await transporter.sendMail({
        from:    '"AuditDNA Platform" <saul@mexausafg.com>',
        to:      t.email,
        subject: `AuditDNA — Subscription Renewed`,
        html: `
          <body style="margin:0;background:#0f172a;font-family:sans-serif;padding:40px 20px">
            <div style="max-width:520px;margin:0 auto;background:#1e293b;border-radius:10px;
                        padding:36px;border:1px solid #334155">
              <span style="color:#cba658;font-size:12px;font-weight:500;letter-spacing:2px;
                           text-transform:uppercase">AuditDNA Platform</span>
              <h2 style="color:#e2e8f0;margin:16px 0 8px;font-weight:500">Subscription Renewed</h2>
              <p style="color:#94a3b0;margin:0 0 20px;font-size:13px;line-height:1.6">
                Your ${t.tier_name} plan has been renewed.
                Next renewal: ${newRenewal.toLocaleDateString('en-US')}.
              </p>
              <p style="color:#64748b;font-size:11px;margin:0">
                MexaUSA Food Group Inc. / Mexausa Food Group, Inc. NMLS #337526
              </p>
            </div>
          </body>
        `,
      });
    } catch (e) { /* non-blocking */ }

    res.json({
      success:          true,
      new_renewal_date: newRenewal.toISOString().split('T')[0],
      tier_name:        t.tier_name,
    });
  } catch (err) {
    console.error('[RENEWAL] Renew error:', err);
    res.status(500).json({ error: 'Renewal failed.' });
  }
});

router.post('/renewal/cancel', async (req, res) => {
  const { tenant_id, reason } = req.body;
  if (!tenant_id) return res.status(400).json({ error: 'tenant_id required' });

  try {
    const tenant = await pool.query(
      `SELECT id, email, legal_name, tier_id, tier_name,
              billing_cycle, renewal_date
       FROM tenants WHERE id = $1`,
      [tenant_id]
    );
    if (tenant.rows.length === 0) return res.status(404).json({ error: 'Tenant not found' });

    const t = tenant.rows[0];

    // Notice period per tier
    const noticeDays = { 0:0, 1:30, 2:30, 3:60, 4:60, 5:120 };
    const days       = noticeDays[t.tier_id] || 30;
    const effectiveDate = new Date(t.renewal_date);

    await pool.query(
      `UPDATE tenants SET status = 'cancellation_pending', updated_at = NOW() WHERE id = $1`,
      [tenant_id]
    );

    await pool.query(
      `INSERT INTO tenant_renewal_events
         (tenant_id, event_type, old_tier_id, note, effective_date, triggered_by)
       VALUES ($1,'cancelled',$2,$3,$4,'tenant')`,
      [tenant_id, t.tier_id, reason || 'No reason given',
       effectiveDate.toISOString().split('T')[0]]
    );

    await fireBrainEvent('tenant_cancelled', {
      tenant_id, tier_name: t.tier_name, reason,
      effective_date: effectiveDate.toISOString().split('T')[0],
    }, tenant_id);

    // Notify owner
    try {
      await transporter.sendMail({
        from:    '"AuditDNA Platform" <saul@mexausafg.com>',
        to:      'saul@mexausafg.com',
        subject: `[AuditDNA] Cancellation — ${t.legal_name || t.email} (${t.tier_name})`,
        html: `
          <body style="background:#0f172a;font-family:sans-serif;padding:40px">
            <div style="background:#1e293b;padding:28px;border-radius:8px;
                        border:1px solid #dc2626;max-width:480px">
              <h3 style="color:#f87171;margin:0 0 16px;font-weight:500">Cancellation Request</h3>
              <p style="color:#cbd5e1;margin:0 0 6px;font-size:13px">Tenant: ${t.legal_name || t.email}</p>
              <p style="color:#cbd5e1;margin:0 0 6px;font-size:13px">Plan: ${t.tier_name}</p>
              <p style="color:#cbd5e1;margin:0 0 6px;font-size:13px">Effective: ${effectiveDate.toLocaleDateString('en-US')}</p>
              <p style="color:#cbd5e1;margin:0 0 6px;font-size:13px">Reason: ${reason || 'Not provided'}</p>
            </div>
          </body>
        `,
      });
    } catch (e) { /* non-blocking */ }

    res.json({
      success:        true,
      status:         'cancellation_pending',
      effective_date: effectiveDate.toISOString().split('T')[0],
      notice_days:    days,
      message:        `Cancellation scheduled. Access continues until ${effectiveDate.toLocaleDateString('en-US')}.`,
    });
  } catch (err) {
    console.error('[RENEWAL] Cancel error:', err);
    res.status(500).json({ error: 'Cancellation failed.' });
  }
});

router.post('/renewal/export', async (req, res) => {
  const { tenant_id, requested_by } = req.body;
  if (!tenant_id) return res.status(400).json({ error: 'tenant_id required' });

  try {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const result = await pool.query(
      `INSERT INTO tenant_data_exports
         (tenant_id, status, expires_at, requested_by)
       VALUES ($1,'queued',$2,$3)
       RETURNING id`,
      [tenant_id, expiresAt, requested_by || 'tenant']
    );

    await fireBrainEvent('data_export_requested', {
      tenant_id, export_id: result.rows[0].id,
    }, tenant_id);

    res.json({
      success:    true,
      export_id:  result.rows[0].id,
      status:     'queued',
      expires_at: expiresAt.toISOString(),
      message:    'Data export queued. You will receive an email with download link when ready.',
    });
  } catch (err) {
    console.error('[RENEWAL] Export error:', err);
    res.status(500).json({ error: 'Export request failed.' });
  }
});

router.get('/renewal/export/:tenant_id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, status, download_url, expires_at, file_size_mb, created_at, completed_at
       FROM tenant_data_exports
       WHERE tenant_id = $1
       ORDER BY created_at DESC LIMIT 5`,
      [req.params.tenant_id]
    );
    res.json({ exports: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Export status failed.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// WIZARD STEP 2 — PRODUCT CATALOG
// POST /api/onboarding/wizard/step2
// Body: { tenant_id, items: [{ commodity, category, unit, price_min, price_max, cogs_target }] }
// ══════════════════════════════════════════════════════════════════════════════
router.post('/wizard/step2', async (req, res) => {
  const { tenant_id, items } = req.body;
  if (!tenant_id)              return res.status(400).json({ error: 'tenant_id required' });
  if (!items || !items.length) return res.status(400).json({ error: 'At least one product required' });

  try {
    // Upsert each catalog item
    for (const item of items) {
      if (!item.commodity?.trim()) continue;
      await pool.query(
        `INSERT INTO tenant_catalog_items
           (tenant_id, commodity, category, unit,
            price_min, price_max, cogs_target)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (tenant_id, commodity) DO UPDATE SET
           category    = EXCLUDED.category,
           unit        = EXCLUDED.unit,
           price_min   = EXCLUDED.price_min,
           price_max   = EXCLUDED.price_max,
           cogs_target = EXCLUDED.cogs_target,
           active      = TRUE`,
        [tenant_id,
         item.commodity.trim(), item.category || null,
         item.unit || 'lb',
         item.price_min || null, item.price_max || null,
         item.cogs_target || null]
      );
    }

    await pool.query(
      `UPDATE tenant_wizard_progress
       SET step2_catalog = TRUE, updated_at = NOW()
       WHERE tenant_id = $1`,
      [tenant_id]
    );

    await fireBrainEvent('wizard_step2_complete', {
      tenant_id, item_count: items.length,
      commodities: items.map(i => i.commodity),
    }, tenant_id);

    res.json({ success: true, step: 2, next_step: 3, saved: items.length });
  } catch (err) {
    console.error('[WIZARD] Step 2 error:', err);
    res.status(500).json({ error: 'Failed to save product catalog.' });
  }
});

// GET catalog items for a tenant
router.get('/wizard/step2/:tenant_id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM tenant_catalog_items WHERE tenant_id = $1 AND active = TRUE ORDER BY commodity`,
      [req.params.tenant_id]
    );
    res.json({ items: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load catalog.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// WIZARD STEP 3 — BANK CONNECTION
// POST /api/onboarding/wizard/step3
// Body: { tenant_id, method, bank_name, account_label, currency, sync_hour }
// ══════════════════════════════════════════════════════════════════════════════
router.post('/wizard/step3', async (req, res) => {
  const { tenant_id, method, bank_name, account_label, currency, sync_hour } = req.body;
  if (!tenant_id) return res.status(400).json({ error: 'tenant_id required' });
  if (!method)    return res.status(400).json({ error: 'method required (csv|manual)' });

  try {
    await pool.query(
      `INSERT INTO tenant_bank_connections
         (tenant_id, method, bank_name, account_label,
          currency, sync_hour, connected, connected_at)
       VALUES ($1,$2,$3,$4,$5,$6,TRUE,NOW())
       ON CONFLICT (tenant_id) DO UPDATE SET
         method        = EXCLUDED.method,
         bank_name     = EXCLUDED.bank_name,
         account_label = EXCLUDED.account_label,
         currency      = EXCLUDED.currency,
         sync_hour     = EXCLUDED.sync_hour,
         connected     = TRUE,
         connected_at  = NOW()`,
      [tenant_id, method, bank_name || null,
       account_label || null, currency || 'USD',
       parseInt(sync_hour) || 6]
    );

    // Also update backoffice settings
    await pool.query(
      `INSERT INTO tenant_backoffice_settings
         (tenant_id, bank_connected, bank_sync_hour)
       VALUES ($1, TRUE, $2)
       ON CONFLICT (tenant_id) DO UPDATE SET
         bank_connected = TRUE,
         bank_sync_hour = EXCLUDED.bank_sync_hour,
         updated_at     = NOW()`,
      [tenant_id, parseInt(sync_hour) || 6]
    );

    await pool.query(
      `UPDATE tenant_wizard_progress
       SET step3_bank = TRUE, updated_at = NOW()
       WHERE tenant_id = $1`,
      [tenant_id]
    );

    await fireBrainEvent('wizard_step3_complete', {
      tenant_id, method, bank_name, currency,
    }, tenant_id);

    res.json({ success: true, step: 3, next_step: 4 });
  } catch (err) {
    console.error('[WIZARD] Step 3 error:', err);
    res.status(500).json({ error: 'Failed to save bank connection.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// WIZARD STEP 4 — FIRST DOCUMENT UPLOAD
// POST /api/onboarding/wizard/step4
// Multipart: file + tenant_id
// ══════════════════════════════════════════════════════════════════════════════

// Re-use upload middleware from top of file
const wizardUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, '..', 'uploads', 'wizard');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const unique = require('crypto').randomBytes(12).toString('hex');
      cb(null, `${unique}_${Date.now()}${path.extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|pdf|xlsx|xls|csv/.test(
      path.extname(file.originalname).toLowerCase()
    );
    cb(null, ok);
  },
});

// OCR detection — classify document type from filename + mimetype
function detectDocType(filename, mimetype) {
  const f = filename.toLowerCase();
  if (/invoice|factura|inv/.test(f))             return { type: 'invoice',   route: 'accounts_payable' };
  if (/manifest|manifiesto|mfst/.test(f))        return { type: 'manifest',  route: 'trade_mgmt' };
  if (/receipt|recibo/.test(f))                  return { type: 'receipt',   route: 'accounts_payable' };
  if (/bol|bill.of.lading|conocimiento/.test(f)) return { type: 'bol',      route: 'trade_mgmt' };
  if (/cert|certificate|phyto|organic/.test(f))  return { type: 'cert',     route: 'document_vault' };
  return { type: 'other', route: 'document_vault' };
}

router.post('/wizard/step4',
  wizardUpload.single('document'),
  async (req, res) => {
    const { tenant_id } = req.body;
    if (!tenant_id)  return res.status(400).json({ error: 'tenant_id required' });
    if (!req.file)   return res.status(400).json({ error: 'Document file required' });

    const { type, route } = detectDocType(req.file.originalname, req.file.mimetype);
    const fileSizeKb = Math.round(req.file.size / 1024);

    try {
      await pool.query(
        `INSERT INTO tenant_first_uploads
           (tenant_id, file_name, file_type, file_size_kb,
            detected_type, routed_to)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [tenant_id, req.file.originalname,
         path.extname(req.file.originalname).replace('.',''),
         fileSizeKb, type, route]
      );

      // Also log to document vault
      await pool.query(
        `INSERT INTO document_vault
           (owner_id, owner_type, file_name, file_path, file_type, category)
         VALUES ($1,'tenant',$2,$3,$4,$5)`,
        [tenant_id, req.file.originalname,
         req.file.path,
         path.extname(req.file.originalname).replace('.',''),
         type]
      ).catch(() => {}); // non-blocking if table structure differs

      await pool.query(
        `UPDATE tenant_wizard_progress
         SET step4_docs = TRUE, updated_at = NOW()
         WHERE tenant_id = $1`,
        [tenant_id]
      );

      await fireBrainEvent('wizard_step4_complete', {
        tenant_id, file_name: req.file.originalname,
        detected_type: type, routed_to: route,
      }, tenant_id);

      res.json({
        success:       true,
        step:          4,
        next_step:     5,
        file_name:     req.file.originalname,
        detected_type: type,
        routed_to:     route,
        file_size_kb:  fileSizeKb,
      });
    } catch (err) {
      console.error('[WIZARD] Step 4 error:', err);
      res.status(500).json({ error: 'Failed to process document.' });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// WIZARD STEP 5 — TEAM INVITES
// POST /api/onboarding/wizard/step5
// Body: { tenant_id, invites: [{ email, name, role }] }
// ══════════════════════════════════════════════════════════════════════════════
router.post('/wizard/step5', async (req, res) => {
  const { tenant_id, invites } = req.body;
  if (!tenant_id) return res.status(400).json({ error: 'tenant_id required' });

  // Get tenant email to send from
  const tenantRow = await pool.query(
    `SELECT email, legal_name, tier_id FROM tenants WHERE id = $1`, [tenant_id]
  );
  if (tenantRow.rows.length === 0) return res.status(404).json({ error: 'Tenant not found' });
  const tenant = tenantRow.rows[0];

  const sent = []; const skipped = [];

  try {
    if (invites && invites.length > 0) {
      for (const inv of invites) {
        if (!inv.email?.includes('@')) { skipped.push(inv.email); continue; }
        const role = ['admin','agent','field_inspector'].includes(inv.role) ? inv.role : 'agent';

        try {
          await pool.query(
            `INSERT INTO tenant_team_invites
               (tenant_id, email, name, role, status)
             VALUES ($1,$2,$3,$4,'pending')
             ON CONFLICT (tenant_id, email) DO UPDATE SET
               name   = EXCLUDED.name,
               role   = EXCLUDED.role,
               status = 'pending'`,
            [tenant_id, inv.email.trim().toLowerCase(), inv.name || null, role]
          );

          // Also create user record
          await pool.query(
            `INSERT INTO tenant_users
               (tenant_id, email, name, role, status)
             VALUES ($1,$2,$3,$4,'invited')
             ON CONFLICT (tenant_id, email) DO NOTHING`,
            [tenant_id, inv.email.trim().toLowerCase(), inv.name || null, role]
          );

          // Send invite email
          await transporter.sendMail({
            from:    '"AuditDNA Platform" <saul@mexausafg.com>',
            to:      inv.email.trim(),
            subject: `You have been invited to AuditDNA`,
            html: `
              <body style="margin:0;background:#0f172a;font-family:sans-serif;padding:40px 20px">
                <div style="max-width:480px;margin:0 auto;background:#1e293b;border-radius:10px;
                            padding:36px;border:1px solid #334155">
                  <span style="color:#cba658;font-size:12px;font-weight:500;letter-spacing:2px;
                               text-transform:uppercase">AuditDNA Platform</span>
                  <h2 style="color:#e2e8f0;margin:16px 0 8px;font-weight:500">
                    You have been invited
                  </h2>
                  <p style="color:#94a3b0;margin:0 0 20px;font-size:13px;line-height:1.6">
                    ${tenant.legal_name || 'Your team'} has invited you to join AuditDNA
                    as <strong style="color:#cba658">${role}</strong>.
                    ${inv.name ? `Hi ${inv.name},` : ''} click below to set up your account.
                  </p>
                  <a href="${process.env.REACT_APP_FRONTEND_URL || 'https://auditdna.netlify.app'}/onboarding?invite=1&email=${encodeURIComponent(inv.email)}&tenant=${tenant_id}"
                     style="display:inline-block;background:#cba658;color:#0f172a;padding:12px 28px;
                            border-radius:6px;text-decoration:none;font-weight:500;font-size:14px">
                    Accept Invitation
                  </a>
                  <p style="color:#64748b;margin:20px 0 0;font-size:11px">
                    MexaUSA Food Group Inc. / Mexausa Food Group, Inc. NMLS #337526
                  </p>
                </div>
              </body>
            `,
          });

          sent.push(inv.email);
        } catch (e) {
          skipped.push(inv.email);
          console.error('[WIZARD] Invite failed:', inv.email, e.message);
        }
      }
    }

    await pool.query(
      `UPDATE tenant_wizard_progress
       SET step5_team = TRUE, updated_at = NOW()
       WHERE tenant_id = $1`,
      [tenant_id]
    );

    await fireBrainEvent('wizard_step5_complete', {
      tenant_id, invites_sent: sent.length, skipped: skipped.length,
    }, tenant_id);

    res.json({ success: true, step: 5, next_step: 6, sent, skipped });
  } catch (err) {
    console.error('[WIZARD] Step 5 error:', err);
    res.status(500).json({ error: 'Failed to send invites.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// WIZARD STEP 6 — ALERT CONFIGURATION
// POST /api/onboarding/wizard/step6
// Body: { tenant_id, alerts: [{ alert_type, commodity, threshold_above,
//          threshold_below, threshold_unit, channel }] }
// ══════════════════════════════════════════════════════════════════════════════
router.post('/wizard/step6', async (req, res) => {
  const { tenant_id, alerts } = req.body;
  if (!tenant_id) return res.status(400).json({ error: 'tenant_id required' });

  try {
    if (alerts && alerts.length > 0) {
      for (const alert of alerts) {
        if (!alert.alert_type) continue;
        await pool.query(
          `INSERT INTO tenant_alert_configs
             (tenant_id, alert_type, commodity, threshold_above,
              threshold_below, threshold_unit, channel, active)
           VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE)`,
          [tenant_id,
           alert.alert_type,
           alert.commodity || null,
           alert.threshold_above || null,
           alert.threshold_below || null,
           alert.threshold_unit  || 'USD/unit',
           `{${(alert.channel || ['email']).join(',')}}` ]
        );
      }
    }

    await pool.query(
      `UPDATE tenant_wizard_progress
       SET step6_alerts = TRUE, wizard_complete = TRUE,
           completed_at = NOW(), updated_at = NOW()
       WHERE tenant_id = $1`,
      [tenant_id]
    );

    await fireBrainEvent('wizard_complete', {
      tenant_id,
      alert_count:  (alerts || []).length,
      completed_at: new Date().toISOString(),
    }, tenant_id);

    res.json({
      success:         true,
      step:            6,
      wizard_complete: true,
      alert_count:     (alerts || []).length,
    });
  } catch (err) {
    console.error('[WIZARD] Step 6 error:', err);
    res.status(500).json({ error: 'Failed to save alerts.' });
  }
});


module.exports = router;
