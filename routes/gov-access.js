// ── GOV ACCESS PORTAL — Federal & State Agency Read-Only Access ──────────────
// Route: /api/gov-access
// Security: Invite-only, IP logged, 3-strike lockout, 4-hour sessions
// Alerts: Every login attempt fires email + ntfy push to owner
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const JWT_SECRET  = process.env.JWT_SECRET || 'auditdna-gov-jwt';
const OWNER_EMAIL = 'sgarcia1911@gmail.com';
const NTFY_TOPIC  = process.env.NTFY_TOPIC || 'auditdna-gov-alerts';
const SMTP_PASS   = process.env.GMAIL_APP_PASSWORD || 'emgptqrmqdbxrpil';

const getPool = (req) => req.app.locals.pool || global.db;

// ── MAILER ───────────────────────────────────────────────────────────────────
const mailer = nodemailer.createTransport({
  host: 'smtp.gmail.com', port: 587, secure: false,
  auth: { user: OWNER_EMAIL, pass: SMTP_PASS },
});

// ── NTFY PUSH ────────────────────────────────────────────────────────────────
async function ntfyPush(title, body, priority = 'high') {
  try {
    await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method: 'POST',
      headers: { 'Title': title, 'Priority': priority, 'Tags': 'shield,us,rotating_light', 'Content-Type': 'text/plain' },
      body,
    });
  } catch(e) { console.warn('[GOV-ALERT] ntfy failed:', e.message); }
}

// ── SECURITY ALERT — fires on every login attempt ───────────────────────────
async function fireSecurityAlert({ agency, user_id, ip, status, reason = '' }) {
  const now   = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
  const emoji = status === 'SUCCESS' ? '✅' : '🚨';
  const subj  = `${emoji} GOV PORTAL ${status} — ${agency} | ${user_id}`;
  const body  = `
AuditDNA Government Portal Alert
─────────────────────────────────
Status:   ${status}
Agency:   ${agency}
User ID:  ${user_id}
IP:       ${ip}
Time:     ${now} PST
${reason ? 'Reason:   ' + reason : ''}

${status === 'SUCCESS'
  ? 'A government/agency user has authenticated. Session valid for 4 hours.'
  : 'UNAUTHORIZED ACCESS ATTEMPT. Review immediately.'}

─────────────────────────────────
Mexausa Food Group, Inc.
AuditDNA Agriculture Intelligence
saul@mexausafg.com
  `.trim();

  // Email → Gmail → Apple Watch / Android Watch
  try {
    await mailer.sendMail({ from: `"AuditDNA Security" <${OWNER_EMAIL}>`, to: OWNER_EMAIL, subject: subj, text: body });
  } catch(e) { console.warn('[GOV-ALERT] email failed:', e.message); }

  // ntfy push → phone + watch
  const ntfyBody = `${status} | ${agency} | ${user_id} | IP: ${ip} | ${now}`;
  await ntfyPush(subj, ntfyBody, status === 'SUCCESS' ? 'default' : 'urgent');
}

// ── DB SETUP ─────────────────────────────────────────────────────────────────
async function ensureTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gov_accounts (
      id SERIAL PRIMARY KEY,
      agency VARCHAR(100) NOT NULL,
      user_id VARCHAR(80) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      access_code VARCHAR(80) NOT NULL,
      tier VARCHAR(40) DEFAULT 'read_only',
      allowed_modules TEXT[] DEFAULT ARRAY['traceability','grower_compliance','lot_search','fda_records'],
      failed_attempts INT DEFAULT 0,
      locked_until TIMESTAMPTZ,
      last_login TIMESTAMPTZ,
      last_ip VARCHAR(60),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      is_active BOOLEAN DEFAULT true
    );
    CREATE TABLE IF NOT EXISTS gov_sessions (
      id SERIAL PRIMARY KEY,
      gov_account_id INT REFERENCES gov_accounts(id),
      token_hash VARCHAR(255),
      ip VARCHAR(60),
      user_agent TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ,
      revoked BOOLEAN DEFAULT false
    );
    CREATE TABLE IF NOT EXISTS gov_access_log (
      id SERIAL PRIMARY KEY,
      gov_account_id INT,
      agency VARCHAR(100),
      user_id VARCHAR(80),
      action VARCHAR(80),
      endpoint VARCHAR(200),
      ip VARCHAR(60),
      user_agent TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('[OK] gov_accounts / gov_sessions / gov_access_log tables ready');
}

// ── MIDDLEWARE — verify gov JWT ───────────────────────────────────────────────
async function govAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET + '_gov');
    const pool    = getPool(req);
    const { rows } = await pool.query(
      'SELECT * FROM gov_accounts WHERE id=$1 AND is_active=true', [payload.id]);
    if (!rows[0]) return res.status(401).json({ error: 'Account not found' });
    req.govUser = rows[0];
    // Log the access
    await pool.query(
      `INSERT INTO gov_access_log(gov_account_id,agency,user_id,action,endpoint,ip,user_agent)
       VALUES($1,$2,$3,'ACCESS',$4,$5,$6)`,
      [rows[0].id, rows[0].agency, rows[0].user_id, req.path,
       req.ip || req.headers['x-forwarded-for'] || 'unknown',
       req.headers['user-agent'] || '']
    );
    next();
  } catch(e) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

// ── POST /api/gov-access/login ────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const pool = getPool(req);
  const ip   = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const { user_id, password, access_code } = req.body || {};

  if (!user_id || !password || !access_code) {
    return res.status(400).json({ error: 'user_id, password, and access_code required' });
  }

  try {
    await ensureTables(pool);
    const { rows } = await pool.query(
      'SELECT * FROM gov_accounts WHERE user_id=$1', [user_id.trim()]);
    const acct = rows[0];

    // Account not found
    if (!acct) {
      await fireSecurityAlert({ agency:'UNKNOWN', user_id, ip, status:'FAILED', reason:'Account not found' });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Locked
    if (acct.locked_until && new Date(acct.locked_until) > new Date()) {
      await fireSecurityAlert({ agency:acct.agency, user_id, ip, status:'BLOCKED', reason:'Account locked — too many failed attempts' });
      return res.status(423).json({ error: 'Account temporarily locked. Contact saul@mexausafg.com' });
    }

    // Wrong password
    const pwOk   = await bcrypt.compare(password, acct.password_hash);
    const codeOk = access_code.trim() === acct.access_code;

    if (!pwOk || !codeOk) {
      const attempts = (acct.failed_attempts || 0) + 1;
      const lockUntil = attempts >= 3
        ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null;
      await pool.query(
        'UPDATE gov_accounts SET failed_attempts=$1, locked_until=$2 WHERE id=$3',
        [attempts, lockUntil, acct.id]);
      await fireSecurityAlert({
        agency:acct.agency, user_id, ip, status:'FAILED',
        reason: `Wrong credentials. Attempt ${attempts}/3${lockUntil?' — LOCKED 30min':''}`
      });
      return res.status(401).json({
        error: attempts >= 3
          ? 'Account locked for 30 minutes. Contact saul@mexausafg.com'
          : `Invalid credentials. ${3 - attempts} attempt(s) remaining.`
      });
    }

    // ── SUCCESS ──────────────────────────────────────────────────────────────
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000);
    const token = jwt.sign({ id: acct.id, agency: acct.agency, tier: acct.tier }, JWT_SECRET + '_gov', { expiresIn: '4h' });

    await pool.query(
      `UPDATE gov_accounts SET failed_attempts=0, locked_until=NULL, last_login=NOW(), last_ip=$1 WHERE id=$2`,
      [ip, acct.id]);
    await pool.query(
      `INSERT INTO gov_sessions(gov_account_id,token_hash,ip,user_agent,expires_at)
       VALUES($1,$2,$3,$4,$5)`,
      [acct.id, require('crypto').createHash('sha256').update(token).digest('hex'),
       ip, req.headers['user-agent']||'', expiresAt.toISOString()]);
    await pool.query(
      `INSERT INTO gov_access_log(gov_account_id,agency,user_id,action,endpoint,ip)
       VALUES($1,$2,$3,'LOGIN_SUCCESS','/api/gov-access/login',$4)`,
      [acct.id, acct.agency, user_id, ip]);

    // FIRE SECURITY ALERT
    await fireSecurityAlert({ agency:acct.agency, user_id, ip, status:'SUCCESS' });

    return res.json({
      token,
      expires_at: expiresAt.toISOString(),
      agency: acct.agency,
      tier: acct.tier,
      allowed_modules: acct.allowed_modules,
      message: 'Session valid for 4 hours. All access is logged and monitored.',
    });

  } catch(e) {
    console.error('[GOV-ACCESS] login error:', e.message);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/gov-access/traceability/:lot ────────────────────────────────────
router.get('/traceability/:lot', govAuth, async (req, res) => {
  const pool = getPool(req);
  try {
    const { rows } = await pool.query(
      `SELECT lot_number, commodity, grower_id, harvest_date, field_block,
              water_source, destination, status, created_at
       FROM traceability_events WHERE lot_number ILIKE $1 LIMIT 50`,
      [req.params.lot]);
    res.json({ lot: req.params.lot, records: rows, queried_by: req.govUser.agency });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/gov-access/grower-compliance/:id ─────────────────────────────────
router.get('/grower-compliance/:id', govAuth, async (req, res) => {
  const pool = getPool(req);
  try {
    const { rows } = await pool.query(
      `SELECT id, company_name, commodity_tags, grs_score, certification_status,
              fsma_ready, state, country, created_at
       FROM growers WHERE id=$1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Grower not found' });
    // Strip PII for regulator view
    const g = rows[0];
    delete g.email; delete g.phone; delete g.ssn;
    res.json({ grower: g, queried_by: req.govUser.agency });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/gov-access/create-account (owner only) ─────────────────────────
router.post('/create-account', async (req, res) => {
  const pool = getPool(req);
  const ownerKey = req.headers['x-owner-key'];
  if (ownerKey !== (process.env.OWNER_MASTER_KEY || 'MFG-SAUL-MASTER-2026')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { agency, user_id, password, access_code, tier, allowed_modules } = req.body || {};
  if (!agency || !user_id || !password || !access_code)
    return res.status(400).json({ error: 'agency, user_id, password, access_code required' });
  try {
    await ensureTables(pool);
    const hash = await bcrypt.hash(password, 14);
    const { rows } = await pool.query(
      `INSERT INTO gov_accounts(agency,user_id,password_hash,access_code,tier,allowed_modules)
       VALUES($1,$2,$3,$4,$5,$6) RETURNING id,agency,user_id,tier,created_at`,
      [agency, user_id, hash, access_code, tier||'read_only',
       allowed_modules||['traceability','grower_compliance','lot_search']]);
    // Alert owner
    await fireSecurityAlert({ agency, user_id, ip:'SYSTEM', status:'ACCOUNT_CREATED',
      reason:`New government account created. Tier: ${tier||'read_only'}` });
    return res.status(201).json({ account: rows[0], message: 'Government account created' });
  } catch(e) {
    if (e.code==='23505') return res.status(409).json({ error: 'user_id already exists' });
    return res.status(500).json({ error: e.message });
  }
});

// ── GET /api/gov-access/status ────────────────────────────────────────────────
router.get('/status', govAuth, async (req, res) => {
  res.json({
    authenticated: true,
    agency: req.govUser.agency,
    tier: req.govUser.tier,
    allowed_modules: req.govUser.allowed_modules,
    last_login: req.govUser.last_login,
    message: 'AuditDNA Agriculture Intelligence — Read-Only Government Access',
    notice: 'All queries are logged and reported to platform administration.',
  });
});

module.exports = router;
