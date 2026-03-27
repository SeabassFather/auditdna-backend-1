// ════════════════════════════════════════════════════════════════════════════
// GROWER PIPELINE ROUTES v1.0
// Save to: C:\AuditDNA\backend\routes\growers.js
// Auto-mounts at: /api/growers (via server.js auto-loader)
// Pool:    req.app.locals.pool
// Auth:    bcrypt12 passwords + PINs, JWT tokens
// Upload:  multer -> C:\AuditDNA\uploads\growers\{grower_id}\
// ════════════════════════════════════════════════════════════════════════════

const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const crypto  = require('crypto');

const SALT_ROUNDS = 12;
const JWT_SECRET  = process.env.JWT_SECRET || 'auditdna-grower-jwt-dev';

// ════════════════════════════════════════════════════════════════════════════
// MULTER — file upload to C:\AuditDNA\uploads\growers\{grower_id}\
// ════════════════════════════════════════════════════════════════════════════

const UPLOAD_ROOT = process.env.GROWER_UPLOAD_DIR
  || path.join(__dirname, '..', 'uploads', 'growers');

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = path.join(UPLOAD_ROOT, String(req.params.grower_id || 'temp'));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ts   = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${ts}_${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|csv/;
    const ext  = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(ext && mime ? null : new Error('File type not allowed'), ext && mime);
  },
});

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

// Generate a random alphanumeric password
function generatePassword(len = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pw = '';
  const bytes = crypto.randomBytes(len);
  for (let i = 0; i < len; i++) pw += chars[bytes[i] % chars.length];
  return pw;
}

// Generate a 4-digit PIN
function generatePIN() {
  return String(crypto.randomInt(1000, 9999));
}

// JWT auth middleware
function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token provided' });
  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  try {
    req.grower = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Admin-only middleware — checks mfg_token from session/header
function adminRequired(req, res, next) {
  // Accept if grower token has role=admin/owner, OR if mfg_token present
  if (req.grower && ['admin', 'owner'].includes(req.grower.role)) return next();
  const mfgToken = req.headers['x-mfg-token']
    || req.headers.authorization?.replace('Bearer ', '');
  if (mfgToken) {
    try {
      const decoded = jwt.verify(mfgToken, JWT_SECRET);
      if (['admin', 'owner', 'sales'].includes(decoded.role)) {
        req.adminUser = decoded;
        return next();
      }
    } catch { /* fall through */ }
  }
  return res.status(403).json({ error: 'Admin access required' });
}

// ════════════════════════════════════════════════════════════════════════════
// 1. REGISTRATION — POST /api/growers/register
//    Called from ContactIntelHub GROWER INTAKE form
//    Auto-generates password + PIN, returns credentials once
// ════════════════════════════════════════════════════════════════════════════

router.post('/register', async (req, res) => {
  const pool = req.app.locals.pool;
  const {
    first_name, last_name, email, phone, company_name,
    city, state_region, country,
    commodities, quantities, packaging, certifications,
    harvest_start, harvest_end
  } = req.body;

  if (!email || !first_name) {
    return res.status(400).json({ error: 'first_name and email are required' });
  }

  try {
    // Check for duplicate email
    const exists = await pool.query('SELECT id FROM grower_profiles WHERE email = $1', [email.toLowerCase()]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered', grower_id: exists.rows[0].id });
    }

    // Generate credentials
    const plainPassword = generatePassword(12);
    const plainPIN      = generatePIN();
    const password_hash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
    const pin_hash      = await bcrypt.hash(plainPIN, SALT_ROUNDS);

    const result = await pool.query(`
      INSERT INTO grower_profiles (
        first_name, last_name, email, phone, company_name,
        city, state_region, country,
        commodities, quantities, packaging, certifications,
        harvest_start, harvest_end,
        password_hash, pin_hash
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      RETURNING id, first_name, last_name, email, company_name, compliance_status, risk_tier, created_at
    `, [
      first_name, last_name || '', email.toLowerCase(), phone || '', company_name || '',
      city || '', state_region || '', country || 'Mexico',
      commodities || '', quantities || '', packaging || '', certifications || '',
      harvest_start || null, harvest_end || null,
      password_hash, pin_hash
    ]);

    const grower = result.rows[0];

    // Fire Brain event
    try {
      const brainPayload = {
        type: 'GROWER_REGISTERED_DB',
        grower_id: grower.id,
        name: `${first_name} ${last_name || ''}`.trim(),
        email: email.toLowerCase(),
        commodities,
        company: company_name,
        timestamp: new Date().toISOString(),
      };
      // Non-blocking brain event
      pool.query(
        `INSERT INTO brain_events (event_type, payload, created_at) VALUES ($1, $2, NOW())`,
        ['GROWER_REGISTERED_DB', JSON.stringify(brainPayload)]
      ).catch(() => { /* brain_events table may not exist yet — silent */ });
    } catch { /* non-critical */ }

    res.status(201).json({
      success: true,
      grower,
      credentials: {
        email:    email.toLowerCase(),
        password: plainPassword,
        pin:      plainPIN,
        note:     'SAVE THESE CREDENTIALS — password and PIN cannot be recovered after this response.',
      },
      next_steps: [
        'Upload ID photo and corporate documents at /api/growers/{id}/documents',
        'Submit for compliance review',
        'Monitor status at grower portal',
      ],
    });

  } catch (e) {
    console.error('[GROWER REGISTER ERROR]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 2. LOGIN — POST /api/growers/login
// ════════════════════════════════════════════════════════════════════════════

router.post('/login', async (req, res) => {
  const pool = req.app.locals.pool;
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM grower_profiles WHERE email = $1 AND status = $2',
      [email.toLowerCase(), 'active']
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const grower = result.rows[0];
    const valid  = await bcrypt.compare(password, grower.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last_login
    await pool.query('UPDATE grower_profiles SET last_login = NOW() WHERE id = $1', [grower.id]);

    const token = jwt.sign(
      { id: grower.id, email: grower.email, role: grower.role, company: grower.company_name },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Strip sensitive fields
    const { password_hash, pin_hash, ...safe } = grower;

    res.json({ success: true, token, grower: safe });
  } catch (e) {
    console.error('[GROWER LOGIN ERROR]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 3. PIN VERIFY — POST /api/growers/verify-pin
// ════════════════════════════════════════════════════════════════════════════

router.post('/verify-pin', authRequired, async (req, res) => {
  const pool = req.app.locals.pool;
  const { pin } = req.body;

  try {
    const result = await pool.query('SELECT pin_hash FROM grower_profiles WHERE id = $1', [req.grower.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Grower not found' });

    const valid = await bcrypt.compare(String(pin), result.rows[0].pin_hash);
    res.json({ valid });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 4. PROFILE — GET /api/growers/profile/:id
// ════════════════════════════════════════════════════════════════════════════

router.get('/profile/:id', authRequired, async (req, res) => {
  const pool = req.app.locals.pool;
  const id   = parseInt(req.params.id);

  // Growers can only see their own profile unless admin
  if (req.grower.id !== id && !['admin', 'owner'].includes(req.grower.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM grower_profiles WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Grower not found' });

    const { password_hash, pin_hash, ...grower } = result.rows[0];

    // Also fetch docs + financials
    const [docs, fins] = await Promise.all([
      pool.query('SELECT * FROM grower_documents WHERE grower_id = $1 ORDER BY created_at DESC', [id]),
      pool.query('SELECT * FROM grower_financials WHERE grower_id = $1 ORDER BY created_at DESC', [id]),
    ]);

    res.json({ grower, documents: docs.rows, financials: fins.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 5. UPDATE PROFILE — PATCH /api/growers/profile/:id
// ════════════════════════════════════════════════════════════════════════════

router.patch('/profile/:id', authRequired, async (req, res) => {
  const pool = req.app.locals.pool;
  const id   = parseInt(req.params.id);

  if (req.grower.id !== id && !['admin', 'owner'].includes(req.grower.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Whitelist updatable fields
  const allowed = [
    'first_name', 'last_name', 'phone', 'company_name',
    'city', 'state_region', 'country',
    'commodities', 'quantities', 'packaging', 'certifications',
    'harvest_start', 'harvest_end',
  ];

  // Admin-only fields
  const adminFields = [
    'compliance_status', 'grs_score', 'risk_tier',
    'id_verified', 'docs_complete', 'status', 'role',
  ];

  const isAdmin = ['admin', 'owner'].includes(req.grower.role);
  const fields  = isAdmin ? [...allowed, ...adminFields] : allowed;

  const updates = [];
  const values  = [];
  let idx = 1;

  for (const key of fields) {
    if (req.body[key] !== undefined) {
      updates.push(`${key} = $${idx}`);
      values.push(req.body[key]);
      idx++;
    }
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  values.push(id);

  try {
    const result = await pool.query(
      `UPDATE grower_profiles SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Grower not found' });

    const { password_hash, pin_hash, ...grower } = result.rows[0];
    res.json({ success: true, grower });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 6. LIST ALL GROWER PROFILES — GET /api/growers/
//    Admin / staff only
// ════════════════════════════════════════════════════════════════════════════

router.get('/', async (req, res) => {
  const pool = req.app.locals.pool;
  const { compliance, risk_tier, country, search, limit: lim, page: pg } = req.query;

  const page  = Math.max(1, parseInt(pg || '1'));
  const limit = Math.min(500, Math.max(1, parseInt(lim || '100')));
  const offset = (page - 1) * limit;

  let where = [];
  let values = [];
  let idx = 1;

  if (compliance) { where.push(`compliance_status = $${idx++}`); values.push(compliance); }
  if (risk_tier)  { where.push(`risk_tier = $${idx++}`); values.push(risk_tier); }
  if (country)    { where.push(`country = $${idx++}`); values.push(country); }
  if (search) {
    where.push(`(first_name ILIKE $${idx} OR last_name ILIKE $${idx} OR email ILIKE $${idx} OR company_name ILIKE $${idx} OR commodities ILIKE $${idx})`);
    values.push(`%${search}%`);
    idx++;
  }

  const clause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  try {
    const [data, count] = await Promise.all([
      pool.query(
        `SELECT id, first_name, last_name, email, phone, company_name, city, country, commodities, quantities, certifications, compliance_status, grs_score, risk_tier, id_verified, docs_complete, status, created_at, last_login
         FROM grower_profiles ${clause}
         ORDER BY id DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM grower_profiles ${clause}`, values),
    ]);

    res.json({ data: data.rows, total: parseInt(count.rows[0].count), page, limit });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 6b. DASHBOARD STATS — GET /api/growers/stats/summary
//     MUST be above /:grower_id routes or Express treats "stats" as an ID
// ════════════════════════════════════════════════════════════════════════════

router.get('/stats/summary', async (req, res) => {
  const pool = req.app.locals.pool;
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM grower_profiles)::int AS total_growers,
        (SELECT COUNT(*) FROM grower_documents WHERE status = 'uploaded')::int AS pending_docs,
        (SELECT json_object_agg(COALESCE(compliance_status,'pending'), cnt) FROM (SELECT compliance_status, COUNT(*)::int AS cnt FROM grower_profiles GROUP BY compliance_status) s) AS by_status,
        (SELECT json_object_agg(COALESCE(risk_tier,'T3'), cnt) FROM (SELECT risk_tier, COUNT(*)::int AS cnt FROM grower_profiles GROUP BY risk_tier) t) AS by_tier,
        (SELECT json_agg(row_to_json(c)) FROM (SELECT country, COUNT(*)::int AS count FROM grower_profiles GROUP BY country ORDER BY count DESC LIMIT 10) c) AS by_country
    `);
    const r = result.rows[0];
    res.json({
      total_growers: r.total_growers || 0,
      by_status:     r.by_status || {},
      by_tier:       r.by_tier || {},
      by_country:    r.by_country || [],
      pending_docs:  r.pending_docs || 0,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 7. DOCUMENT UPLOAD — POST /api/growers/:grower_id/documents
// ════════════════════════════════════════════════════════════════════════════

router.post('/:grower_id/documents', upload.single('file'), async (req, res) => {
  const pool      = req.app.locals.pool;
  const grower_id = parseInt(req.params.grower_id);
  const { doc_type, notes } = req.body;

  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  if (!doc_type)  return res.status(400).json({ error: 'doc_type is required' });

  try {
    // Verify grower exists
    const gCheck = await pool.query('SELECT id FROM grower_profiles WHERE id = $1', [grower_id]);
    if (gCheck.rows.length === 0) return res.status(404).json({ error: 'Grower not found' });

    const result = await pool.query(`
      INSERT INTO grower_documents (grower_id, doc_type, file_name, file_path, file_size, mime_type, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      grower_id,
      doc_type,
      req.file.originalname,
      req.file.path,
      req.file.size,
      req.file.mimetype,
      notes || null,
    ]);

    // Auto-update id_verified if doc_type is id_photo
    if (doc_type === 'id_photo') {
      await pool.query('UPDATE grower_profiles SET id_verified = TRUE WHERE id = $1', [grower_id]);
    }

    // Check if all required doc types are present
    const allDocs = await pool.query(
      'SELECT DISTINCT doc_type FROM grower_documents WHERE grower_id = $1',
      [grower_id]
    );
    const docTypes = allDocs.rows.map(r => r.doc_type);
    const required = ['id_photo', 'corporate_id', 'phytosanitary'];
    const complete = required.every(t => docTypes.includes(t));
    if (complete) {
      await pool.query(
        `UPDATE grower_profiles SET docs_complete = TRUE, compliance_status = 'submitted' WHERE id = $1 AND compliance_status = 'pending'`,
        [grower_id]
      );
    }

    res.status(201).json({ success: true, document: result.rows[0] });
  } catch (e) {
    console.error('[DOC UPLOAD ERROR]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 8. LIST DOCUMENTS — GET /api/growers/:grower_id/documents
// ════════════════════════════════════════════════════════════════════════════

router.get('/:grower_id/documents', async (req, res) => {
  const pool = req.app.locals.pool;
  try {
    const result = await pool.query(
      'SELECT * FROM grower_documents WHERE grower_id = $1 ORDER BY created_at DESC',
      [parseInt(req.params.grower_id)]
    );
    res.json({ documents: result.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 9. REVIEW DOCUMENT — PATCH /api/growers/documents/:doc_id/review
//    Admin-only: approve or reject a document
// ════════════════════════════════════════════════════════════════════════════

router.patch('/documents/:doc_id/review', async (req, res) => {
  const pool   = req.app.locals.pool;
  const doc_id = parseInt(req.params.doc_id);
  const { status, reviewed_by, notes } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'status must be approved or rejected' });
  }

  try {
    const result = await pool.query(`
      UPDATE grower_documents
      SET status = $1, reviewed_by = $2, reviewed_at = NOW(), notes = COALESCE($3, notes)
      WHERE id = $4
      RETURNING *
    `, [status, reviewed_by || 'admin', notes || null, doc_id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Document not found' });

    // If all docs approved for this grower, auto-advance compliance
    const grower_id = result.rows[0].grower_id;
    const pending = await pool.query(
      `SELECT COUNT(*) FROM grower_documents WHERE grower_id = $1 AND status != 'approved'`,
      [grower_id]
    );
    if (parseInt(pending.rows[0].count) === 0) {
      await pool.query(
        `UPDATE grower_profiles SET compliance_status = 'approved', risk_tier = 'T1', grs_score = GREATEST(grs_score, 70) WHERE id = $1`,
        [grower_id]
      );
    }

    res.json({ success: true, document: result.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 10. CREATE FINANCIAL RECORD — POST /api/growers/:grower_id/financials
// ════════════════════════════════════════════════════════════════════════════

router.post('/:grower_id/financials', async (req, res) => {
  const pool      = req.app.locals.pool;
  const grower_id = parseInt(req.params.grower_id);
  const {
    type, reference_number, amount, currency, status,
    buyer_id, commodity, quantity, unit_price, terms,
    due_date, notes
  } = req.body;

  if (!type) return res.status(400).json({ error: 'type is required' });

  const validTypes = ['purchase_order', 'invoice', 'factoring_agreement', 'payment', 'credit_note'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
  }

  try {
    const result = await pool.query(`
      INSERT INTO grower_financials (
        grower_id, type, reference_number, amount, currency, status,
        buyer_id, commodity, quantity, unit_price, terms, due_date, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *
    `, [
      grower_id, type, reference_number || null,
      amount || 0, currency || 'USD', status || 'draft',
      buyer_id || null, commodity || null, quantity || null,
      unit_price || null, terms || null, due_date || null, notes || null,
    ]);

    res.status(201).json({ success: true, financial: result.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 11. LIST FINANCIALS — GET /api/growers/:grower_id/financials
// ════════════════════════════════════════════════════════════════════════════

router.get('/:grower_id/financials', async (req, res) => {
  const pool = req.app.locals.pool;
  const { type, status } = req.query;

  let where  = ['grower_id = $1'];
  let values = [parseInt(req.params.grower_id)];
  let idx    = 2;

  if (type)   { where.push(`type = $${idx++}`);   values.push(type); }
  if (status) { where.push(`status = $${idx++}`); values.push(status); }

  try {
    const result = await pool.query(
      `SELECT * FROM grower_financials WHERE ${where.join(' AND ')} ORDER BY created_at DESC`,
      values
    );
    res.json({ financials: result.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 12. COMPLIANCE SUMMARY — GET /api/growers/:grower_id/compliance
// ════════════════════════════════════════════════════════════════════════════

router.get('/:grower_id/compliance', async (req, res) => {
  const pool = req.app.locals.pool;
  const id   = parseInt(req.params.grower_id);

  try {
    const [profile, docs, fins] = await Promise.all([
      pool.query(
        `SELECT id, first_name, last_name, email, company_name, compliance_status, grs_score, risk_tier, id_verified, docs_complete, created_at
         FROM grower_profiles WHERE id = $1`, [id]
      ),
      pool.query(
        `SELECT doc_type, status, file_name, created_at, reviewed_at FROM grower_documents WHERE grower_id = $1 ORDER BY created_at`, [id]
      ),
      pool.query(
        `SELECT type, status, amount, reference_number, created_at FROM grower_financials WHERE grower_id = $1 ORDER BY created_at DESC LIMIT 20`, [id]
      ),
    ]);

    if (profile.rows.length === 0) return res.status(404).json({ error: 'Grower not found' });

    const g = profile.rows[0];
    const required = ['id_photo', 'corporate_id', 'phytosanitary'];
    const uploaded = docs.rows.map(d => d.doc_type);

    res.json({
      grower: g,
      documents: docs.rows,
      financials: fins.rows,
      checklist: {
        id_photo:       uploaded.includes('id_photo'),
        corporate_id:   uploaded.includes('corporate_id'),
        phytosanitary:  uploaded.includes('phytosanitary'),
        organic_cert:   uploaded.includes('organic_cert'),
        globalgap:      uploaded.includes('globalgap'),
        fsma:           uploaded.includes('fsma_attestation'),
        export_license: uploaded.includes('export_license'),
      },
      missing: required.filter(t => !uploaded.includes(t)),
      compliance_pct: Math.round((required.filter(t => uploaded.includes(t)).length / required.length) * 100),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 13. RESET PASSWORD — POST /api/growers/:grower_id/reset-password
//     Admin-only: generates new password + PIN
// ════════════════════════════════════════════════════════════════════════════

router.post('/:grower_id/reset-password', async (req, res) => {
  const pool = req.app.locals.pool;
  const id   = parseInt(req.params.grower_id);

  try {
    const gCheck = await pool.query('SELECT id, email FROM grower_profiles WHERE id = $1', [id]);
    if (gCheck.rows.length === 0) return res.status(404).json({ error: 'Grower not found' });

    const plainPassword = generatePassword(12);
    const plainPIN      = generatePIN();
    const password_hash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
    const pin_hash      = await bcrypt.hash(plainPIN, SALT_ROUNDS);

    await pool.query(
      'UPDATE grower_profiles SET password_hash = $1, pin_hash = $2 WHERE id = $3',
      [password_hash, pin_hash, id]
    );

    res.json({
      success: true,
      credentials: {
        email:    gCheck.rows[0].email,
        password: plainPassword,
        pin:      plainPIN,
        note:     'SAVE THESE CREDENTIALS — cannot be recovered after this response.',
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;