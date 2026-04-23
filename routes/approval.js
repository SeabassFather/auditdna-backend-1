// approval.js
// Save to: C:\AuditDNA\backend\routes\approval.js
// Handles registration approval queue â€” owner approves/denies pending users

const express      = require('express');
const router       = express.Router();
const nodemailer   = require('nodemailer');
const { getPool }  = require('../db');
const jwt          = require('jsonwebtoken');

const SMTP = nodemailer.createTransport({
  host: 'smtpout.secureserver.net',
  port: 465,
  secure: true,
  auth: { user: 'saul@mexausafg.com', pass: 'KongKing#321' },
});

const TIER_LABELS = {
  free:  'Free Observer',
  tier1: 'Tier 1 â€” Grower MX',
  tier2: 'Tier 2 â€” Grower USA',
  tier3: 'Tier 3 â€” Buyer',
  tier4: 'Tier 4 â€” Shipper/Broker',
  tier5: 'Tier 5 â€” Enterprise',
  owner: 'Owner',
};

// â”€â”€ Auth middleware â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ownerOnly(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!['owner', 'admin'].includes(decoded.role)) {
      return res.status(403).json({ error: 'Owner access required' });
    }
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// â”€â”€ GET /api/approval/pending â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Returns all users with status = 'pending' or approval_status = 'pending'
router.get('/pending', ownerOnly, async (req, res) => {
  const pool = getPool(req);
  try {
    // Try approval_registrations table first, fall back to auth_users pending
    let rows = [];
    try {
      const r = await global.db.query(`
        SELECT id, name, email, company, origin, phone, country, tier, paca_number,
               docs_completed, created_at, status
        FROM approval_registrations
        WHERE status = 'pending'
        ORDER BY created_at DESC
      `);
      rows = r.rows;
    } catch {
      // Table may not exist yet â€” use auth_users with pending status
      const r = await global.db.query(`
        SELECT id, username as name, username as email, '' as company,
               '' as origin, '' as phone, 'unknown' as country,
               tier, '' as paca_number, '[]' as docs_completed,
               created_at, 'pending' as status
        FROM auth_users
        WHERE is_active = false
        ORDER BY created_at DESC
        LIMIT 100
      `);
      rows = r.rows;
    }
    res.json({ total: rows.length, pending: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// â”€â”€ POST /api/approval/approve/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/approve/:id', ownerOnly, async (req, res) => {
  const pool = getPool(req);
  const { id } = req.params;
  const { tier = 'free', access_code, pin, note } = req.body;
  const approvedBy = req.user.email || 'owner';
  const ts = new Date();

  try {
    // Generate access code and PIN if not provided
    const finalCode = access_code || Math.random().toString(36).substring(2, 8).toUpperCase();
    const finalPin  = pin || Math.floor(1000 + Math.random() * 9000).toString();

    let userEmail = '';
    let userName  = '';

    // Update approval_registrations if table exists
    try {
      const r = await global.db.query(`
        UPDATE approval_registrations
        SET status = 'approved', tier = $1, approved_by = $2, approved_at = $3,
            access_code = $4, pin = $5, approval_note = $6
        WHERE id = $7
        RETURNING name, email, company, origin, tier
      `, [tier, approvedBy, ts, finalCode, finalPin, note || null, id]);

      if (r.rows.length > 0) {
        userEmail = r.rows[0].email;
        userName  = r.rows[0].name;
      }
    } catch {
      // Fall back to auth_users
      const r = await global.db.query(`
        UPDATE auth_users
        SET is_active = true, tier = $1, tier_approved_at = $2, tier_approved_by = $3
        WHERE id = $4
        RETURNING username, tier
      `, [tier, ts, approvedBy, id]);
      if (r.rows.length > 0) {
        userEmail = r.rows[0].username;
        userName  = r.rows[0].username;
      }
    }

    // Send approval email
    if (userEmail) {
      await SMTP.sendMail({
        from: '"AuditDNA â€” Mexausa Food Group" <saul@mexausafg.com>',
        to: userEmail,
        subject: 'Your AuditDNA Access Has Been Approved',
        text: `
Dear ${userName},

Your AuditDNA platform registration has been approved.

ACCESS DETAILS
==============
Tier:        ${TIER_LABELS[tier] || tier}
Access Code: ${finalCode}
PIN:         ${finalPin}

Platform URL: https://mexausafg.com

Please log in using the CLIENT LOGIN tab and enter your email, access code, and PIN.

${note ? 'Note from administrator: ' + note + '\n' : ''}
If you have any questions, contact us at:
saul@mexausafg.com | +1 (831) 251-3116 | WhatsApp: +52-646-340-2686

Mexausa Food Group, Inc. | Mexausa Food Group, Inc.
        `.trim(),
      }).catch(e => console.error('[approval] email error:', e.message));
    }

    // Notify owner too
    await SMTP.sendMail({
      from: '"AuditDNA Approvals" <saul@mexausafg.com>',
      to: 'saul@mexausafg.com',
      subject: `[AuditDNA] Approved: ${userName || userEmail} â€” ${TIER_LABELS[tier] || tier}`,
      text: `You approved ${userName} (${userEmail}) for ${TIER_LABELS[tier] || tier}.\nAccess Code: ${finalCode} | PIN: ${finalPin}`,
    }).catch(() => {});

    res.json({ success: true, tier, access_code: finalCode, pin: finalPin, approved_user: userEmail });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// â”€â”€ POST /api/approval/deny/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/deny/:id', ownerOnly, async (req, res) => {
  const pool = getPool(req);
  const { id } = req.params;
  const { reason = 'Application not approved at this time.' } = req.body;
  const deniedBy = req.user.email || 'owner';

  try {
    let userEmail = '';
    let userName  = '';

    try {
      const r = await global.db.query(`
        UPDATE approval_registrations
        SET status = 'denied', approved_by = $1, approved_at = $2, approval_note = $3
        WHERE id = $4
        RETURNING name, email
      `, [deniedBy, new Date(), reason, id]);
      if (r.rows.length > 0) {
        userEmail = r.rows[0].email;
        userName  = r.rows[0].name;
      }
    } catch {
      const r = await global.db.query(
        'SELECT username FROM auth_users WHERE id = $1', [id]
      );
      if (r.rows.length > 0) userEmail = r.rows[0].username;
    }

    if (userEmail) {
      await SMTP.sendMail({
        from: '"AuditDNA â€” Mexausa Food Group" <saul@mexausafg.com>',
        to: userEmail,
        subject: 'AuditDNA Registration Update',
        text: `
Dear ${userName || userEmail},

Thank you for your interest in the AuditDNA platform.

After review, your registration application was not approved at this time.

Reason: ${reason}

You are welcome to reapply or contact us directly to discuss your access needs:
saul@mexausafg.com | +1 (831) 251-3116 | WhatsApp: +52-646-340-2686

Mexausa Food Group, Inc. | Mexausa Food Group, Inc.
        `.trim(),
      }).catch(e => console.error('[approval] deny email error:', e.message));
    }

    res.json({ success: true, denied_user: userEmail });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// â”€â”€ POST /api/approval/update-tier â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Owner can change an existing user's tier at any time
router.post('/update-tier', ownerOnly, async (req, res) => {
  const pool = getPool(req);
  const { email, tier } = req.body;
  if (!email || !tier) return res.status(400).json({ error: 'email and tier required' });
  try {
    await global.db.query(
      'UPDATE auth_users SET tier = $1, tier_approved_at = $2, tier_approved_by = $3 WHERE LOWER(username) = LOWER($4)',
      [tier, new Date(), req.user.email, email]
    );

    // Notify user of tier change
    await SMTP.sendMail({
      from: '"AuditDNA â€” Mexausa Food Group" <saul@mexausafg.com>',
      to: email,
      subject: 'Your AuditDNA Access Tier Has Been Updated',
      text: `Your AuditDNA platform access tier has been updated to: ${TIER_LABELS[tier] || tier}.\n\nLog in at https://mexausafg.com to access your new modules.\n\nMexausa Food Group, Inc.`,
    }).catch(() => {});

    res.json({ success: true, email, tier });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// â”€â”€ POST /api/approval/init-table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Creates approval_registrations table if not exists
router.post('/init-table', ownerOnly, async (req, res) => {
  const pool = getPool(req);
  try {
    await global.db.query(`
      CREATE TABLE IF NOT EXISTS approval_registrations (
        id               SERIAL PRIMARY KEY,
        name             VARCHAR(200),
        email            VARCHAR(200) UNIQUE NOT NULL,
        company          VARCHAR(200),
        origin           VARCHAR(200),
        phone            VARCHAR(50),
        country          VARCHAR(10) DEFAULT 'mx',
        paca_number      VARCHAR(50),
        tier             VARCHAR(20) DEFAULT 'free',
        docs_completed   JSONB DEFAULT '[]',
        status           VARCHAR(20) DEFAULT 'pending',
        access_code      VARCHAR(20),
        pin              VARCHAR(10),
        approval_note    TEXT,
        approved_by      VARCHAR(100),
        approved_at      TIMESTAMP WITH TIME ZONE,
        created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_approval_status ON approval_registrations(status);
      CREATE INDEX IF NOT EXISTS idx_approval_email  ON approval_registrations(email);
    `);
    res.json({ success: true, message: 'approval_registrations table ready' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

