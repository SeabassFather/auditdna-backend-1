// ============================================================
// TRADE REGISTRY â€” Universal Entity CRUD
// Auto-mounts: /api/trade-registry (via server.js auto-loader)
// Handles: growers, packers, shippers, buyers, brokers,
//          importers, exporters â€” agriculture, beverages,
//          alcohol, seafood, poultry, dairy
// Save to: C:\AuditDNA\backend\routes\trade-registry.js
// ============================================================

const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const crypto  = require('crypto');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const SALT_ROUNDS = 12;

// Upload config
const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads', 'trade-entities');
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = path.join(UPLOAD_ROOT, String(req.params.entity_id || 'temp'));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => cb(null, `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`),
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

// Entity ID generator
const genEntityId = (type) => {
  const prefix = { grower: 'GRW', packer: 'PCK', shipper: 'SHP', buyer: 'BUY', broker: 'BRK', importer: 'IMP', exporter: 'EXP' }[type] || 'ENT';
  return `TR-${prefix}-${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
};
const genPassword = (len = 12) => { const ch = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'; let p = ''; const b = crypto.randomBytes(len); for (let i = 0; i < len; i++) p += ch[b[i] % ch.length]; return p; };
const genPIN = () => String(crypto.randomInt(1000, 9999));

// â”€â”€ 1. REGISTER ENTITY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// POST /api/trade-registry/register
router.post('/register', async (req, res) => {
  const pool = req.app.locals.pool;
  const {
    entity_type, trade_category,
    first_name, last_name, email, phone, company_name,
    city, state_region, country, address, gps_lat, gps_lng,
    commodities, quantities, packaging, certifications,
    license_number, tax_id, website,
    preferred_poes, shipping_methods, transport_partners, notes,
    generate_credentials
  } = req.body;

  if (!email || !first_name) return res.status(400).json({ error: 'first_name and email required' });
  const type = entity_type || 'grower';
  const category = trade_category || 'agriculture';

  try {
    const exists = await global.db.query('SELECT id FROM trade_registry WHERE email = $1', [email.toLowerCase()]);
    if (exists.rows.length > 0) return res.status(409).json({ error: 'Email already registered', entity_id: exists.rows[0].id });

    const entityId = genEntityId(type);
    let passwordHash = null, pinHash = null, plainPw = null, plainPin = null;

    if (generate_credentials !== false) {
      plainPw = genPassword();
      plainPin = genPIN();
      passwordHash = await bcrypt.hash(plainPw, SALT_ROUNDS);
      pinHash = await bcrypt.hash(plainPin, SALT_ROUNDS);
    }

    const result = await global.db.query(`
      INSERT INTO trade_registry (
        entity_id, entity_type, trade_category,
        first_name, last_name, email, phone, company_name,
        city, state_region, country, address, gps_lat, gps_lng,
        commodities, quantities, packaging, certifications,
        license_number, tax_id, website,
        preferred_poes, shipping_methods, transport_partners,
        password_hash, pin_hash, notes, source
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,'registration')
      RETURNING id, entity_id, entity_type, trade_category, first_name, last_name, email, company_name, compliance_status, risk_tier, created_at
    `, [
      entityId, type, category,
      first_name, last_name || '', email.toLowerCase(), phone || '', company_name || '',
      city || '', state_region || '', country || 'Mexico', address || null, gps_lat || null, gps_lng || null,
      commodities || '', quantities || '', packaging || '', certifications || '',
      license_number || null, tax_id || null, website || null,
      preferred_poes || null, shipping_methods || null, transport_partners || null,
      passwordHash, pinHash, notes || null
    ]);

    // Brain event
    try { global.db.query(`INSERT INTO brain_events (event_type, payload, created_at) VALUES ($1, $2, NOW())`, ['TRADE_ENTITY_REGISTERED', JSON.stringify({ entity_id: entityId, type, category, name: `${first_name} ${last_name}`, company: company_name, commodities })]).catch(() => {}); } catch {}

    const resp = { success: true, entity: result.rows[0] };
    if (plainPw) resp.credentials = { email: email.toLowerCase(), password: plainPw, pin: plainPin, note: 'SAVE NOW -- cannot be recovered.' };
    res.status(201).json(resp);
  } catch (e) {
    console.error('[TRADE REGISTER]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// â”€â”€ 2. LOGIN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/login', async (req, res) => {
  const pool = req.app.locals.pool;
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const r = await global.db.query('SELECT * FROM trade_registry WHERE email = $1 AND status = $2', [email.toLowerCase(), 'active']);
    if (r.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const entity = r.rows[0];
    if (!entity.password_hash) return res.status(403).json({ error: 'No credentials set' });
    const valid = await bcrypt.compare(password, entity.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    await global.db.query('UPDATE trade_registry SET last_login = NOW() WHERE id = $1', [entity.id]);
    const { password_hash, pin_hash, ...safe } = entity;
    res.json({ success: true, entity: safe });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// â”€â”€ 3. LIST ALL (paginated, filterable) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/', async (req, res) => {
  const pool = req.app.locals.pool;
  const { type, category, country, state, compliance, tier, search, limit: lim, page: pg } = req.query;
  const page = Math.max(1, parseInt(pg || '1'));
  const limit = Math.min(500, Math.max(1, parseInt(lim || '100')));
  const offset = (page - 1) * limit;

  let where = ["status != 'deleted'"];
  let values = [];
  let idx = 1;

  if (type) { where.push(`entity_type = $${idx++}`); values.push(type); }
  if (category) { where.push(`trade_category = $${idx++}`); values.push(category); }
  if (country) { where.push(`country ILIKE $${idx++}`); values.push(`%${country}%`); }
  if (state) { where.push(`state_region ILIKE $${idx++}`); values.push(`%${state}%`); }
  if (compliance) { where.push(`compliance_status = $${idx++}`); values.push(compliance); }
  if (tier) { where.push(`risk_tier = $${idx++}`); values.push(tier); }
  if (search) { where.push(`(first_name ILIKE $${idx} OR last_name ILIKE $${idx} OR company_name ILIKE $${idx} OR email ILIKE $${idx} OR commodities ILIKE $${idx})`); values.push(`%${search}%`); idx++; }

  const clause = 'WHERE ' + where.join(' AND ');

  try {
    const [data, count] = await Promise.all([
      global.db.query(`SELECT id, entity_id, entity_type, trade_category, first_name, last_name, email, phone, company_name, city, state_region, country, commodities, certifications, compliance_status, grs_score, risk_tier, id_verified, docs_complete, status, source, created_at FROM trade_registry ${clause} ORDER BY id DESC LIMIT $${idx} OFFSET $${idx + 1}`, [...values, limit, offset]),
      global.db.query(`SELECT COUNT(*) FROM trade_registry ${clause}`, values),
    ]);
    res.json({ data: data.rows, total: parseInt(count.rows[0].count), page, limit });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// â”€â”€ 4. SINGLE ENTITY + docs + financials â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/:id', async (req, res) => {
  const pool = req.app.locals.pool;
  const id = parseInt(req.params.id);
  try {
    const r = await global.db.query('SELECT * FROM trade_registry WHERE id = $1', [id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Entity not found' });
    const { password_hash, pin_hash, ...entity } = r.rows[0];
    const [docs, fins] = await Promise.all([
      global.db.query('SELECT * FROM trade_documents WHERE entity_id = $1 ORDER BY created_at DESC', [id]),
      global.db.query('SELECT * FROM trade_financials WHERE entity_id = $1 ORDER BY created_at DESC LIMIT 50', [id]),
    ]);
    res.json({ entity, documents: docs.rows, financials: fins.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// â”€â”€ 5. UPDATE ENTITY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.patch('/:id', async (req, res) => {
  const pool = req.app.locals.pool;
  const id = parseInt(req.params.id);
  const allowed = ['first_name','last_name','phone','company_name','city','state_region','country','address','commodities','quantities','packaging','certifications','license_number','tax_id','website','notes','entity_type','trade_category','compliance_status','grs_score','risk_tier','id_verified','docs_complete','status'];
  const updates = [], values = [];
  let idx = 1;
  for (const k of allowed) { if (req.body[k] !== undefined) { updates.push(`${k} = $${idx++}`); values.push(req.body[k]); } }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
  values.push(id);
  try {
    const r = await global.db.query(`UPDATE trade_registry SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, values);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const { password_hash, pin_hash, ...entity } = r.rows[0];
    res.json({ success: true, entity });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// â”€â”€ 6. DOCUMENT UPLOAD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/:entity_id/documents', upload.single('file'), async (req, res) => {
  const pool = req.app.locals.pool;
  const eid = parseInt(req.params.entity_id);
  const { doc_type, notes } = req.body;
  if (!req.file) return res.status(400).json({ error: 'No file' });
  try {
    const r = await global.db.query(`INSERT INTO trade_documents (entity_id, doc_type, file_name, file_path, file_size, mime_type, notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [eid, doc_type || 'general', req.file.originalname, req.file.path, req.file.size, req.file.mimetype, notes || null]);
    res.status(201).json({ success: true, document: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:entity_id/documents', async (req, res) => {
  const pool = req.app.locals.pool;
  try {
    const r = await global.db.query('SELECT * FROM trade_documents WHERE entity_id = $1 ORDER BY created_at DESC', [parseInt(req.params.entity_id)]);
    res.json({ documents: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// â”€â”€ 7. FINANCIALS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/:entity_id/financials', async (req, res) => {
  const pool = req.app.locals.pool;
  const eid = parseInt(req.params.entity_id);
  const { type, reference_number, amount, currency, status, counterpart_id, commodity, quantity, unit_price, terms, due_date, notes } = req.body;
  if (!type) return res.status(400).json({ error: 'type required' });
  try {
    const r = await global.db.query(`INSERT INTO trade_financials (entity_id, counterpart_id, type, reference_number, amount, currency, status, commodity, quantity, unit_price, terms, due_date, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`, [eid, counterpart_id || null, type, reference_number || null, amount || 0, currency || 'USD', status || 'draft', commodity || null, quantity || null, unit_price || null, terms || null, due_date || null, notes || null]);
    res.status(201).json({ success: true, financial: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:entity_id/financials', async (req, res) => {
  const pool = req.app.locals.pool;
  try {
    const r = await global.db.query('SELECT * FROM trade_financials WHERE entity_id = $1 ORDER BY created_at DESC', [parseInt(req.params.entity_id)]);
    res.json({ financials: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:entity_id/financial-summary', async (req, res) => {
  const pool = req.app.locals.pool;
  try {
    const r = await global.db.query(`SELECT COUNT(*)::int AS total, COALESCE(SUM(CASE WHEN type='purchase_order' THEN amount ELSE 0 END),0) AS total_po, COALESCE(SUM(CASE WHEN type='invoice' THEN amount ELSE 0 END),0) AS total_invoiced, COALESCE(SUM(CASE WHEN type='payment' THEN amount ELSE 0 END),0) AS total_paid, COALESCE(SUM(CASE WHEN status='overdue' THEN amount ELSE 0 END),0) AS total_overdue FROM trade_financials WHERE entity_id = $1`, [parseInt(req.params.entity_id)]);
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// â”€â”€ 8. SEARCH (UnifiedSourcing) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/search/query', async (req, res) => {
  const pool = req.app.locals.pool;
  const { type, category, commodity, country, state, tier, min_grs, q, limit: lim } = req.query;
  let sql = "SELECT * FROM trade_registry WHERE status != 'deleted'";
  const params = [];
  let pi = 1;
  if (type) { sql += ` AND entity_type = $${pi++}`; params.push(type); }
  if (category) { sql += ` AND trade_category = $${pi++}`; params.push(category); }
  if (commodity) { sql += ` AND commodities ILIKE $${pi++}`; params.push(`%${commodity}%`); }
  if (country) { sql += ` AND country ILIKE $${pi++}`; params.push(`%${country}%`); }
  if (state) { sql += ` AND state_region ILIKE $${pi++}`; params.push(`%${state}%`); }
  if (tier) { sql += ` AND risk_tier = $${pi++}`; params.push(tier); }
  if (min_grs) { sql += ` AND grs_score >= $${pi++}`; params.push(parseFloat(min_grs)); }
  if (q) { sql += ` AND (first_name ILIKE $${pi} OR last_name ILIKE $${pi} OR company_name ILIKE $${pi} OR city ILIKE $${pi} OR commodities ILIKE $${pi})`; params.push(`%${q}%`); pi++; }
  sql += ` ORDER BY grs_score DESC LIMIT $${pi}`;
  params.push(Math.min(parseInt(lim) || 200, 500));
  try {
    const r = await global.db.query(sql, params);
    res.json({ data: r.rows, total: r.rows.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// â”€â”€ 9. STATS DASHBOARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/stats/summary', async (req, res) => {
  const pool = req.app.locals.pool;
  try {
    const [total, byType, byCategory, byCountry, byTier, pendingDocs] = await Promise.all([
      global.db.query('SELECT COUNT(*)::int FROM trade_registry'),
      global.db.query("SELECT entity_type, COUNT(*)::int FROM trade_registry WHERE status != 'deleted' GROUP BY entity_type ORDER BY count DESC"),
      global.db.query("SELECT trade_category, COUNT(*)::int FROM trade_registry WHERE status != 'deleted' GROUP BY trade_category ORDER BY count DESC"),
      global.db.query("SELECT country, COUNT(*)::int FROM trade_registry WHERE status != 'deleted' GROUP BY country ORDER BY count DESC LIMIT 15"),
      global.db.query("SELECT risk_tier, COUNT(*)::int FROM trade_registry WHERE status != 'deleted' GROUP BY risk_tier"),
      global.db.query("SELECT COUNT(*)::int FROM trade_documents WHERE status = 'uploaded'"),
    ]);
    res.json({
      total: total.rows[0].count,
      by_type: byType.rows.reduce((o, r) => ({ ...o, [r.entity_type]: r.count }), {}),
      by_category: byCategory.rows.reduce((o, r) => ({ ...o, [r.trade_category]: r.count }), {}),
      by_country: byCountry.rows,
      by_tier: byTier.rows.reduce((o, r) => ({ ...o, [r.risk_tier]: r.count }), {}),
      pending_docs: pendingDocs.rows[0].count,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// â”€â”€ 10. RESET CREDENTIALS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/:entity_id/reset-password', async (req, res) => {
  const pool = req.app.locals.pool;
  const id = parseInt(req.params.entity_id);
  try {
    const g = await global.db.query('SELECT id, email FROM trade_registry WHERE id = $1', [id]);
    if (g.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const pw = genPassword(), pin = genPIN();
    await global.db.query('UPDATE trade_registry SET password_hash = $1, pin_hash = $2 WHERE id = $3', [await bcrypt.hash(pw, SALT_ROUNDS), await bcrypt.hash(pin, SALT_ROUNDS), id]);
    res.json({ success: true, credentials: { email: g.rows[0].email, password: pw, pin, note: 'SAVE NOW' } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

