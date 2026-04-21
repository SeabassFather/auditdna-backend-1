// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// GROWER PIPELINE ROUTES v2.0 â€” MERGED
// Save to: C:\AuditDNA\backend\routes\grower-pipeline.js
// Auto-mounts at: /api/grower-pipeline (via server.js auto-loader)
// Pool:    req.app.locals.pool
// Auth:    bcrypt12 passwords + PINs, JWT tokens
// Upload:  multer -> C:\AuditDNA\uploads\growers\{grower_id}\
//
// Endpoints:
//   POST   /register              â€” register grower, auto-gen credentials
//   POST   /login                 â€” grower login, returns JWT
//   POST   /verify-pin            â€” verify PIN (auth required)
//   GET    /                      â€” list all grower profiles (paginated)
//   GET    /profile/:id           â€” full grower profile + docs + financials
//   PATCH  /profile/:id           â€” update profile (field whitelist)
//   POST   /:grower_id/documents  â€” upload document (multer)
//   GET    /:grower_id/documents  â€” list documents
//   PATCH  /documents/:doc_id/review â€” approve/reject doc (admin)
//   POST   /:grower_id/financials â€” create financial record
//   GET    /:grower_id/financials â€” list financials
//   GET    /:grower_id/financial-summary â€” aggregated financial summary
//   GET    /:grower_id/compliance â€” compliance checklist + missing docs
//   POST   /:grower_id/reset-password â€” admin reset credentials
//   GET    /stats/summary         â€” dashboard totals
//   POST   /:grower_id/harvests   â€” create harvest record
//   GET    /:grower_id/harvests   â€” list harvests
//   GET    /search/query          â€” search/filter growers (UnifiedSourcing)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MULTER â€” file upload to C:\AuditDNA\uploads\growers\{grower_id}\
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|csv/;
    const ext  = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(ext && mime ? null : new Error('File type not allowed'), ext && mime);
  },
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// HELPERS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function generatePassword(len = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pw = '';
  const bytes = crypto.randomBytes(len);
  for (let i = 0; i < len; i++) pw += chars[bytes[i] % chars.length];
  return pw;
}

function generatePIN() {
  return String(crypto.randomInt(1000, 9999));
}

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

function adminRequired(req, res, next) {
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 1. REGISTRATION â€” POST /register
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
    const exists = await global.db.query('SELECT id FROM grower_profiles WHERE email = $1', [email.toLowerCase()]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered', grower_id: exists.rows[0].id });
    }

    const plainPassword = generatePassword(12);
    const plainPIN      = generatePIN();
    const password_hash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
    const pin_hash      = await bcrypt.hash(plainPIN, SALT_ROUNDS);

    const result = await global.db.query(`
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

    // Brain event (non-blocking)
    try {
      global.db.query(
        `INSERT INTO brain_events (event_type, payload, created_at) VALUES ($1, $2, NOW())`,
        ['GROWER_REGISTERED_DB', JSON.stringify({
          type: 'GROWER_REGISTERED_DB', grower_id: grower.id,
          name: `${first_name} ${last_name || ''}`.trim(),
          email: email.toLowerCase(), commodities, company: company_name,
          timestamp: new Date().toISOString(),
        })]
      ).catch(() => {});
    } catch { /* non-critical */ }

    res.status(201).json({
      success: true,
      grower,
      credentials: {
        email:    email.toLowerCase(),
        password: plainPassword,
        pin:      plainPIN,
        note:     'SAVE THESE CREDENTIALS -- password and PIN cannot be recovered after this response.',
      },
      next_steps: [
        'Upload ID photo and corporate documents at /:id/documents',
        'Submit for compliance review',
        'Monitor status at grower portal',
      ],
    });
  } catch (e) {
    console.error('[GROWER REGISTER ERROR]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 2. LOGIN â€” POST /login
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.post('/login', async (req, res) => {
  const pool = req.app.locals.pool;
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const result = await global.db.query(
      'SELECT * FROM grower_profiles WHERE email = $1 AND status = $2',
      [email.toLowerCase(), 'active']
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const grower = result.rows[0];
    const valid  = await bcrypt.compare(password, grower.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    await global.db.query('UPDATE grower_profiles SET last_login = NOW() WHERE id = $1', [grower.id]);

    const token = jwt.sign(
      { id: grower.id, email: grower.email, role: grower.role, company: grower.company_name },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    const { password_hash, pin_hash, ...safe } = grower;
    res.json({ success: true, token, grower: safe });
  } catch (e) {
    console.error('[GROWER LOGIN ERROR]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 3. PIN VERIFY â€” POST /verify-pin
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.post('/verify-pin', authRequired, async (req, res) => {
  const pool = req.app.locals.pool;
  const { pin } = req.body;
  try {
    const result = await global.db.query('SELECT pin_hash FROM grower_profiles WHERE id = $1', [req.grower.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Grower not found' });
    const valid = await bcrypt.compare(String(pin), result.rows[0].pin_hash);
    res.json({ valid });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 4. PROFILE â€” GET /profile/:id
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.get('/profile/:id', authRequired, async (req, res) => {
  const pool = req.app.locals.pool;
  const id   = parseInt(req.params.id);

  if (req.grower.id !== id && !['admin', 'owner'].includes(req.grower.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const result = await global.db.query('SELECT * FROM grower_profiles WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Grower not found' });

    const { password_hash, pin_hash, ...grower } = result.rows[0];

    const [docs, fins, harvests] = await Promise.all([
      global.db.query('SELECT * FROM grower_documents WHERE grower_id = $1 ORDER BY created_at DESC', [id]),
      global.db.query('SELECT * FROM grower_financials WHERE grower_id = $1 ORDER BY created_at DESC', [id]),
      global.db.query('SELECT * FROM grower_harvests WHERE grower_id = $1 ORDER BY harvest_start DESC', [id]),
    ]);

    res.json({ grower, documents: docs.rows, financials: fins.rows, harvests: harvests.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 5. UPDATE PROFILE â€” PATCH /profile/:id
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.patch('/profile/:id', authRequired, async (req, res) => {
  const pool = req.app.locals.pool;
  const id   = parseInt(req.params.id);

  if (req.grower.id !== id && !['admin', 'owner'].includes(req.grower.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const allowed = [
    'first_name', 'last_name', 'phone', 'company_name',
    'city', 'state_region', 'country',
    'commodities', 'quantities', 'packaging', 'certifications',
    'harvest_start', 'harvest_end',
  ];
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

  if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
  values.push(id);

  try {
    const result = await global.db.query(
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 6. LIST ALL â€” GET /
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
      global.db.query(
        `SELECT id, first_name, last_name, email, phone, company_name, city, country, commodities, quantities, certifications, compliance_status, grs_score, risk_tier, id_verified, docs_complete, status, created_at, last_login
         FROM grower_profiles ${clause}
         ORDER BY id DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, limit, offset]
      ),
      global.db.query(`SELECT COUNT(*) FROM grower_profiles ${clause}`, values),
    ]);

    res.json({ data: data.rows, total: parseInt(count.rows[0].count), page, limit });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 7. DOCUMENT UPLOAD â€” POST /:grower_id/documents
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.post('/:grower_id/documents', upload.single('file'), async (req, res) => {
  const pool      = req.app.locals.pool;
  const grower_id = parseInt(req.params.grower_id);
  const { doc_type, notes } = req.body;

  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  if (!doc_type)  return res.status(400).json({ error: 'doc_type is required' });

  try {
    const gCheck = await global.db.query('SELECT id FROM grower_profiles WHERE id = $1', [grower_id]);
    if (gCheck.rows.length === 0) return res.status(404).json({ error: 'Grower not found' });

    const result = await global.db.query(`
      INSERT INTO grower_documents (grower_id, doc_type, file_name, file_path, file_size, mime_type, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [grower_id, doc_type, req.file.originalname, req.file.path, req.file.size, req.file.mimetype, notes || null]);

    if (doc_type === 'id_photo') {
      await global.db.query('UPDATE grower_profiles SET id_verified = TRUE WHERE id = $1', [grower_id]);
    }

    const allDocs = await global.db.query('SELECT DISTINCT doc_type FROM grower_documents WHERE grower_id = $1', [grower_id]);
    const docTypes = allDocs.rows.map(r => r.doc_type);
    const required = ['id_photo', 'corporate_id', 'phytosanitary'];
    const complete = required.every(t => docTypes.includes(t));
    if (complete) {
      await global.db.query(
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 8. LIST DOCUMENTS â€” GET /:grower_id/documents
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.get('/:grower_id/documents', async (req, res) => {
  const pool = req.app.locals.pool;
  try {
    const result = await global.db.query(
      'SELECT * FROM grower_documents WHERE grower_id = $1 ORDER BY created_at DESC',
      [parseInt(req.params.grower_id)]
    );
    res.json({ documents: result.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 9. REVIEW DOCUMENT â€” PATCH /documents/:doc_id/review (admin)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.patch('/documents/:doc_id/review', async (req, res) => {
  const pool   = req.app.locals.pool;
  const doc_id = parseInt(req.params.doc_id);
  const { status, reviewed_by, notes } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'status must be approved or rejected' });
  }

  try {
    const result = await global.db.query(`
      UPDATE grower_documents
      SET status = $1, reviewed_by = $2, reviewed_at = NOW(), notes = COALESCE($3, notes)
      WHERE id = $4
      RETURNING *
    `, [status, reviewed_by || 'admin', notes || null, doc_id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Document not found' });

    const grower_id = result.rows[0].grower_id;
    const pending = await global.db.query(
      `SELECT COUNT(*) FROM grower_documents WHERE grower_id = $1 AND status != 'approved'`,
      [grower_id]
    );
    if (parseInt(pending.rows[0].count) === 0) {
      await global.db.query(
        `UPDATE grower_profiles SET compliance_status = 'approved', risk_tier = 'T1', grs_score = GREATEST(grs_score, 70) WHERE id = $1`,
        [grower_id]
      );
    }

    res.json({ success: true, document: result.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 10. CREATE FINANCIAL â€” POST /:grower_id/financials
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
    const result = await global.db.query(`
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 11. LIST FINANCIALS â€” GET /:grower_id/financials
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.get('/:grower_id/financials', async (req, res) => {
  const pool = req.app.locals.pool;
  const { type, status } = req.query;

  let where  = ['grower_id = $1'];
  let values = [parseInt(req.params.grower_id)];
  let idx    = 2;

  if (type)   { where.push(`type = $${idx++}`);   values.push(type); }
  if (status) { where.push(`status = $${idx++}`); values.push(status); }

  try {
    const result = await global.db.query(
      `SELECT * FROM grower_financials WHERE ${where.join(' AND ')} ORDER BY created_at DESC`,
      values
    );
    res.json({ financials: result.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 12. FINANCIAL SUMMARY â€” GET /:grower_id/financial-summary   [MERGED]
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.get('/:grower_id/financial-summary', async (req, res) => {
  const pool = req.app.locals.pool;
  try {
    const result = await global.db.query(`
      SELECT
        COUNT(*)::int AS total_transactions,
        COALESCE(SUM(CASE WHEN type='purchase_order' THEN amount ELSE 0 END), 0) AS total_po,
        COALESCE(SUM(CASE WHEN type='invoice' THEN amount ELSE 0 END), 0) AS total_invoiced,
        COALESCE(SUM(CASE WHEN type='factoring_agreement' THEN amount ELSE 0 END), 0) AS total_factored,
        COALESCE(SUM(CASE WHEN type='payment' THEN amount ELSE 0 END), 0) AS total_paid,
        COALESCE(SUM(CASE WHEN status='overdue' THEN amount ELSE 0 END), 0) AS total_overdue,
        COALESCE(SUM(CASE WHEN status='draft' OR status='pending' THEN amount ELSE 0 END), 0) AS total_pending
      FROM grower_financials WHERE grower_id = $1
    `, [parseInt(req.params.grower_id)]);
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 13. COMPLIANCE â€” GET /:grower_id/compliance
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.get('/:grower_id/compliance', async (req, res) => {
  const pool = req.app.locals.pool;
  const id   = parseInt(req.params.grower_id);

  try {
    const [profile, docs, fins] = await Promise.all([
      global.db.query(
        `SELECT id, first_name, last_name, email, company_name, compliance_status, grs_score, risk_tier, id_verified, docs_complete, created_at
         FROM grower_profiles WHERE id = $1`, [id]
      ),
      global.db.query(
        `SELECT doc_type, status, file_name, created_at, reviewed_at FROM grower_documents WHERE grower_id = $1 ORDER BY created_at`, [id]
      ),
      global.db.query(
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 14. RESET PASSWORD â€” POST /:grower_id/reset-password (admin)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.post('/:grower_id/reset-password', async (req, res) => {
  const pool = req.app.locals.pool;
  const id   = parseInt(req.params.grower_id);

  try {
    const gCheck = await global.db.query('SELECT id, email FROM grower_profiles WHERE id = $1', [id]);
    if (gCheck.rows.length === 0) return res.status(404).json({ error: 'Grower not found' });

    const plainPassword = generatePassword(12);
    const plainPIN      = generatePIN();
    const password_hash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
    const pin_hash      = await bcrypt.hash(plainPIN, SALT_ROUNDS);

    await global.db.query(
      'UPDATE grower_profiles SET password_hash = $1, pin_hash = $2 WHERE id = $3',
      [password_hash, pin_hash, id]
    );

    res.json({
      success: true,
      credentials: {
        email:    gCheck.rows[0].email,
        password: plainPassword,
        pin:      plainPIN,
        note:     'SAVE THESE CREDENTIALS -- cannot be recovered after this response.',
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 15. STATS SUMMARY â€” GET /stats/summary
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.get('/stats/summary', async (req, res) => {
  const pool = req.app.locals.pool;
  try {
    const [total, byStatus, byTier, byCountry, recentDocs] = await Promise.all([
      global.db.query('SELECT COUNT(*) FROM grower_profiles'),
      global.db.query('SELECT compliance_status, COUNT(*)::int FROM grower_profiles GROUP BY compliance_status'),
      global.db.query('SELECT risk_tier, COUNT(*)::int FROM grower_profiles GROUP BY risk_tier'),
      global.db.query('SELECT country, COUNT(*)::int FROM grower_profiles GROUP BY country ORDER BY count DESC LIMIT 10'),
      global.db.query(`SELECT COUNT(*) FROM grower_documents WHERE status = 'uploaded'`),
    ]);

    res.json({
      total_growers:  parseInt(total.rows[0].count),
      by_status:      byStatus.rows.reduce((o, r) => ({ ...o, [r.compliance_status]: r.count }), {}),
      by_tier:        byTier.rows.reduce((o, r) => ({ ...o, [r.risk_tier]: r.count }), {}),
      by_country:     byCountry.rows,
      pending_docs:   parseInt(recentDocs.rows[0].count),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 16. HARVESTS â€” POST /:grower_id/harvests                     [MERGED]
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.post('/:grower_id/harvests', async (req, res) => {
  const pool = req.app.locals.pool;
  const grower_id = parseInt(req.params.grower_id);
  const {
    commodity, acreage_planted, expected_yield,
    harvest_start, harvest_end, loads_estimated,
    quality_grade, notes, season_year
  } = req.body;

  if (!commodity) return res.status(400).json({ error: 'commodity is required' });

  try {
    const gCheck = await global.db.query('SELECT id FROM grower_profiles WHERE id = $1', [grower_id]);
    if (gCheck.rows.length === 0) return res.status(404).json({ error: 'Grower not found' });

    const result = await global.db.query(`
      INSERT INTO grower_harvests (
        grower_id, commodity, acreage_planted, expected_yield,
        harvest_start, harvest_end, loads_estimated,
        quality_grade, notes, season_year
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
    `, [
      grower_id, commodity, acreage_planted || null, expected_yield || null,
      harvest_start || null, harvest_end || null, loads_estimated || null,
      quality_grade || null, notes || null, season_year || new Date().getFullYear()
    ]);

    res.status(201).json({ success: true, harvest: result.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /:grower_id/harvests
router.get('/:grower_id/harvests', async (req, res) => {
  const pool = req.app.locals.pool;
  try {
    const result = await global.db.query(
      'SELECT * FROM grower_harvests WHERE grower_id = $1 ORDER BY harvest_start DESC',
      [parseInt(req.params.grower_id)]
    );
    res.json({ harvests: result.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 17. SEARCH / FILTER â€” GET /search/query                     [MERGED]
//     For UnifiedSourcing Dashboard
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.get('/search/query', async (req, res) => {
  const pool = req.app.locals.pool;
  const { commodity, country, state, tier, min_grs, certified, q, limit: lim } = req.query;

  let sql = `SELECT id, first_name, last_name, email, phone, company_name,
    city, state_region, country, commodities, certifications,
    compliance_status, grs_score, risk_tier, id_verified, docs_complete,
    status, created_at
    FROM grower_profiles WHERE status != $1`;
  const params = ['suspended'];
  let pi = 2;

  if (commodity) { sql += ` AND commodities ILIKE $${pi}`; params.push(`%${commodity}%`); pi++; }
  if (country)   { sql += ` AND country ILIKE $${pi}`; params.push(`%${country}%`); pi++; }
  if (state)     { sql += ` AND state_region ILIKE $${pi}`; params.push(`%${state}%`); pi++; }
  if (tier)      { sql += ` AND risk_tier = $${pi}`; params.push(tier); pi++; }
  if (min_grs)   { sql += ` AND grs_score >= $${pi}`; params.push(parseFloat(min_grs)); pi++; }
  if (certified) { sql += ` AND certifications ILIKE $${pi}`; params.push(`%${certified}%`); pi++; }
  if (q)         { sql += ` AND (first_name ILIKE $${pi} OR last_name ILIKE $${pi} OR company_name ILIKE $${pi} OR city ILIKE $${pi})`; params.push(`%${q}%`); pi++; }

  sql += ` ORDER BY grs_score DESC LIMIT $${pi}`;
  params.push(Math.min(parseInt(lim) || 200, 500));

  try {
    const result = await global.db.query(sql, params);
    res.json({ data: result.rows, total: result.rows.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


module.exports = router;

