// ================================================================================
// AUDITDNA COMPLIANCE CENTER - BACKEND ROUTES
// File: C:\AuditDNA\backend\routes\compliance-center.js
// Sprint D Run 1 | 2026-04-26 | Mexausa Food Group, Inc.
// ================================================================================
// 14 endpoints + health check. Backed by 6 tables created in compliance_center.sql.
//
// MOUNT IN server.js:
//   app.use('/api/compliance-center', require('./routes/compliance-center'));
//
// REQUIRED PACKAGES (already in package.json from prior modules):
//   express, multer, jsonwebtoken, pg
//
// DB ACCESS:
//   Uses pool (set in server.js). Never instantiates a new Pool.
//
// FILE STORAGE:
//   /uploads/compliance/   - cert + document files
//   /uploads/field/        - mobile mini-office uploads (with GPS metadata)
//   Auto-created on boot.
// ================================================================================

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const jwt     = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

// ================================================================================
// CONSTANTS - VALIDATION WHITELISTS
// ================================================================================

const ALLOWED_CERT_TYPES = [
  'FSMA_204', 'FSMA_PCQI', 'USDA_GAP', 'GLOBALGAP', 'PRIMUSGFS', 'SQF', 'BRC',
  'SENASICA', 'COI', 'ORGANIC', 'FAIR_TRADE', 'KOSHER', 'HALAL', 'NON_GMO'
];

const ALLOWED_DOC_TYPES = [
  'WATER_TEST', 'SOIL_TEST', 'FOOD_SAFETY_PLAN', 'COI', 'FSMA_204_PLAN',
  'GAP_AUDIT', 'RECALL_PLAN', 'TRAINING_LOG', 'PESTICIDE_LOG', 'OTHER'
];

const ALLOWED_FIELD_DOC_TYPES = [
  'TRACE_REPORT', 'INVOICE', 'PO', 'BOL', 'WATER_TEST', 'SOIL_TEST',
  'CERT_PHOTO', 'FIELD_PHOTO', 'TEMPERATURE_LOG', 'MANIFEST', 'CHECK_PHOTO', 'OTHER'
];

const ALLOWED_ROUTES = [
  'COMPLIANCE', 'FACTORING', 'PO_FINANCE', 'CRM', 'DEAL_FLOOR', 'TRACEABILITY', 'ACCOUNTING'
];

const ALLOWED_UPLOADER_ROLES = [
  'GROWER', 'PACKER', 'SHIPPER', 'SALESMAN', 'BUYER', 'COMPLIANCE_OFFICER', 'ADMIN'
];

const ALLOWED_CTE_TYPES = [
  'HARVEST', 'COOLING', 'INITIAL_PACKING', 'FIRST_RECEIVER',
  'SHIPPING', 'RECEIVING', 'TRANSFORMATION'
];

const ALLOWED_CAPTURE_METHODS = [
  'CAMERA', 'GALLERY', 'UPLOAD', 'WHATSAPP', 'EMAIL_FORWARD', 'SCAN'
];

const MAX_FILE_SIZE_MB = 50;
const MAX_FIELD_UPLOAD_MB = 25;

// ================================================================================
// FILE STORAGE SETUP - ensure dirs exist
// ================================================================================
const UPLOADS_ROOT       = path.join(__dirname, '..', 'uploads');
const COMPLIANCE_DIR     = path.join(UPLOADS_ROOT, 'compliance');
const FIELD_UPLOADS_DIR  = path.join(UPLOADS_ROOT, 'field');

[UPLOADS_ROOT, COMPLIANCE_DIR, FIELD_UPLOADS_DIR].forEach(d => {
  try { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }
  catch (e) { console.warn('[ComplianceCenter] Could not create', d, e.message); }
});

const complianceStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, COMPLIANCE_DIR),
  filename: (req, file, cb) => {
    const safe = (file.originalname || 'upload').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
    cb(null, `${Date.now()}-${safe}`);
  }
});

const fieldStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, FIELD_UPLOADS_DIR),
  filename: (req, file, cb) => {
    const safe = (file.originalname || 'field').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
    cb(null, `${Date.now()}-${safe}`);
  }
});

const uploadCompliance = multer({
  storage: complianceStorage,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 }
});

const uploadField = multer({
  storage: fieldStorage,
  limits: { fileSize: MAX_FIELD_UPLOAD_MB * 1024 * 1024 }
});

// ================================================================================
// DB ACCESS - pool only, never localhost Pool
// ================================================================================
function getDb() {
  if (pool && typeof pool.query === 'function') return pool;
  console.error('[ComplianceCenter] pool not initialized. Check server.js bootstrap.');
  return null;
}

// ================================================================================
// JWT MIDDLEWARE - optional. Decodes token if present, attaches to req.user.
// Routes that REQUIRE auth call requireAuth() guard inside the handler.
// ================================================================================
function attachUser(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) { req.user = null; return next(); }
  try {
    const secret = process.env.JWT_SECRET || 'mfg_dev_secret_2026';
    req.user = jwt.verify(token, secret);
  } catch {
    req.user = null;
  }
  next();
}

function requireAuth(req, res) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error_en: 'Authentication required',
      error_es: 'Autenticacion requerida'
    });
    return false;
  }
  return true;
}

router.use(attachUser);

// ================================================================================
// BRAIN EMITTER - fire-and-forget event log to brain_events if table exists.
// ================================================================================
async function emitBrain(eventType, payload) {
  const db = getDb();
  if (!db) return;
  try {
    await db.query(
      `INSERT INTO brain_events (event_type, payload, source, created_at)
       VALUES ($1, $2, 'compliance-center', NOW())`,
      [eventType, JSON.stringify(payload || {})]
    );
  } catch {
    // brain_events table may not exist yet. No-op. The 404 fix is in TIER 2 backlog.
  }
}

// ================================================================================
// HELPERS
// ================================================================================
function generateTLC(growerId) {
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seq = Math.floor(1000 + Math.random() * 9000);
  return `GFI-${ymd}-${growerId || '0'}-${seq}`;
}

function bilingual(en, es) {
  return { message_en: en, message_es: es };
}

function bad(res, code, en, es, extra = {}) {
  return res.status(code).json({ success: false, error_en: en, error_es: es, ...extra });
}

function ok(res, data = {}, en = 'Success', es = 'Exito') {
  return res.json({ success: true, ...bilingual(en, es), ...data });
}

// ================================================================================
// ROUTE 0: HEALTH CHECK
// ================================================================================
router.get('/health', async (req, res) => {
  const db = getDb();
  if (!db) return bad(res, 500, 'Database not initialized', 'Base de datos no inicializada');
  try {
    const counts = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM compliance_certs)        AS certs,
        (SELECT COUNT(*) FROM compliance_documents)    AS documents,
        (SELECT COUNT(*) FROM paca_registry_seed)      AS paca,
        (SELECT COUNT(*) FROM production_declarations) AS declarations,
        (SELECT COUNT(*) FROM compliance_alerts)       AS alerts,
        (SELECT COUNT(*) FROM field_uploads)           AS field_uploads
    `);
    return ok(res, { module: 'ComplianceCenter', version: '1.0.0', counts: counts.rows[0] }, 'Compliance Center online', 'Centro de Cumplimiento en linea');
  } catch (e) {
    return bad(res, 500, e.message, 'Error de base de datos');
  }
});

// ================================================================================
// ROUTE 1: POST /certs - Create cert
// ================================================================================
router.post('/certs', async (req, res) => {
  const db = getDb();
  if (!db) return bad(res, 500, 'DB not initialized', 'Base de datos no inicializada');

  const {
    grower_id, entity_id, entity_type = 'grower',
    cert_type, cert_number, issuing_body,
    issued_date, expiry_date, fsma_tier = 1,
    scope_description, notes, metadata = {}
  } = req.body || {};

  if (!cert_type) return bad(res, 400, 'cert_type required', 'Tipo de certificacion requerido');
  if (!ALLOWED_CERT_TYPES.includes(cert_type)) {
    return bad(res, 400, `cert_type must be one of: ${ALLOWED_CERT_TYPES.join(', ')}`, 'Tipo de certificacion invalido', { allowed: ALLOWED_CERT_TYPES });
  }
  if (!grower_id && !entity_id) return bad(res, 400, 'grower_id or entity_id required', 'grower_id o entity_id requerido');

  try {
    const result = await db.query(
      `INSERT INTO compliance_certs
        (grower_id, entity_id, entity_type, cert_type, cert_number, issuing_body,
         issued_date, expiry_date, fsma_tier, scope_description, notes, metadata, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'active')
       RETURNING *`,
      [grower_id, entity_id, entity_type, cert_type, cert_number, issuing_body,
       issued_date || null, expiry_date || null, fsma_tier, scope_description, notes,
       JSON.stringify(metadata)]
    );
    const cert = result.rows[0];
    emitBrain('COMPLIANCE_CERT_CREATED', { cert_id: cert.cert_id, grower_id, cert_type, expiry_date });
    return ok(res, { cert }, 'Certification created', 'Certificacion creada');
  } catch (e) {
    return bad(res, 500, e.message, 'Error al crear certificacion');
  }
});

// ================================================================================
// ROUTE 2: GET /certs/:growerId - List certs for a grower (or entity)
// ================================================================================
router.get('/certs/:growerId', async (req, res) => {
  const db = getDb();
  if (!db) return bad(res, 500, 'DB not initialized', 'Base de datos no inicializada');

  const growerId = parseInt(req.params.growerId, 10);
  if (!growerId) return bad(res, 400, 'Invalid grower_id', 'grower_id invalido');

  const { status, cert_type, expiring_within_days } = req.query;
  const params = [growerId];
  let where = `grower_id = $1`;
  if (status)    { params.push(status);    where += ` AND status = $${params.length}`; }
  if (cert_type) { params.push(cert_type); where += ` AND cert_type = $${params.length}`; }
  if (expiring_within_days) {
    const d = parseInt(expiring_within_days, 10);
    if (d > 0) where += ` AND expiry_date IS NOT NULL AND expiry_date <= CURRENT_DATE + INTERVAL '${d} days'`;
  }

  try {
    const result = await db.query(
      `SELECT * FROM compliance_certs WHERE ${where} ORDER BY expiry_date ASC NULLS LAST, created_at DESC`,
      params
    );
    return ok(res, { count: result.rows.length, certs: result.rows });
  } catch (e) {
    return bad(res, 500, e.message, 'Error al obtener certificaciones');
  }
});

// ================================================================================
// ROUTE 3: PUT /certs/:certId - Update cert (renewal, status change)
// ================================================================================
router.put('/certs/:certId', async (req, res) => {
  const db = getDb();
  if (!db) return bad(res, 500, 'DB not initialized', 'Base de datos no inicializada');

  const certId = parseInt(req.params.certId, 10);
  if (!certId) return bad(res, 400, 'Invalid cert_id', 'cert_id invalido');

  const allowed = [
    'cert_number', 'issuing_body', 'issued_date', 'expiry_date', 'status',
    'fsma_tier', 'scope_description', 'verified_by', 'verified_at',
    'renewal_status', 'renewal_due_date', 'notes', 'metadata'
  ];
  const updates = [];
  const params = [];
  for (const k of allowed) {
    if (req.body && req.body[k] !== undefined) {
      params.push(k === 'metadata' ? JSON.stringify(req.body[k]) : req.body[k]);
      updates.push(`${k} = $${params.length}`);
    }
  }
  if (updates.length === 0) return bad(res, 400, 'No updatable fields provided', 'No hay campos para actualizar');
  params.push(certId);

  try {
    const result = await db.query(
      `UPDATE compliance_certs SET ${updates.join(', ')} WHERE cert_id = $${params.length} RETURNING *`,
      params
    );
    if (result.rows.length === 0) return bad(res, 404, 'Cert not found', 'Certificacion no encontrada');
    const cert = result.rows[0];
    emitBrain('COMPLIANCE_CERT_UPDATED', { cert_id: certId, fields: Object.keys(req.body || {}) });
    return ok(res, { cert }, 'Certification updated', 'Certificacion actualizada');
  } catch (e) {
    return bad(res, 500, e.message, 'Error al actualizar certificacion');
  }
});

// ================================================================================
// ROUTE 4: POST /documents - Upload compliance doc (water test, soil test, etc.)
// ================================================================================
router.post('/documents', uploadCompliance.single('file'), async (req, res) => {
  const db = getDb();
  if (!db) return bad(res, 500, 'DB not initialized', 'Base de datos no inicializada');
  if (!req.file) return bad(res, 400, 'File required', 'Archivo requerido');

  const {
    grower_id, entity_id, entity_type = 'grower',
    doc_type, doc_category, doc_title, description,
    test_date, test_lab, test_result, test_values = '{}',
    related_cert_id, uploaded_by, uploaded_role
  } = req.body || {};

  if (!doc_type || !ALLOWED_DOC_TYPES.includes(doc_type)) {
    return bad(res, 400, `doc_type must be one of: ${ALLOWED_DOC_TYPES.join(', ')}`, 'Tipo de documento invalido', { allowed: ALLOWED_DOC_TYPES });
  }

  try {
    const result = await db.query(
      `INSERT INTO compliance_documents
        (grower_id, entity_id, entity_type, doc_type, doc_category, doc_title, description,
         file_path, file_url, file_size_kb, mime_type, original_filename,
         test_date, test_lab, test_result, test_values,
         related_cert_id, uploaded_by, uploaded_role, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'pending')
       RETURNING *`,
      [
        grower_id || null, entity_id || null, entity_type,
        doc_type, doc_category || null, doc_title || req.file.originalname, description || null,
        req.file.path, `/uploads/compliance/${req.file.filename}`,
        Math.round(req.file.size / 1024), req.file.mimetype, req.file.originalname,
        test_date || null, test_lab || null, test_result || null,
        typeof test_values === 'string' ? test_values : JSON.stringify(test_values),
        related_cert_id ? parseInt(related_cert_id, 10) : null,
        uploaded_by || (req.user && req.user.email) || null,
        uploaded_role || null
      ]
    );
    const doc = result.rows[0];
    emitBrain('COMPLIANCE_DOC_UPLOADED', { document_id: doc.document_id, grower_id, doc_type });
    return ok(res, { document: doc }, 'Document uploaded', 'Documento subido');
  } catch (e) {
    return bad(res, 500, e.message, 'Error al subir documento');
  }
});

// ================================================================================
// ROUTE 5: GET /documents/:growerId - List docs
// ================================================================================
router.get('/documents/:growerId', async (req, res) => {
  const db = getDb();
  if (!db) return bad(res, 500, 'DB not initialized', 'Base de datos no inicializada');

  const growerId = parseInt(req.params.growerId, 10);
  if (!growerId) return bad(res, 400, 'Invalid grower_id', 'grower_id invalido');

  const { doc_type, status } = req.query;
  const params = [growerId];
  let where = `grower_id = $1`;
  if (doc_type) { params.push(doc_type); where += ` AND doc_type = $${params.length}`; }
  if (status)   { params.push(status);   where += ` AND status = $${params.length}`; }

  try {
    const result = await db.query(
      `SELECT * FROM compliance_documents WHERE ${where} ORDER BY created_at DESC LIMIT 200`,
      params
    );
    return ok(res, { count: result.rows.length, documents: result.rows });
  } catch (e) {
    return bad(res, 500, e.message, 'Error al obtener documentos');
  }
});

// ================================================================================
// ROUTE 6: GET /paca/search?q=... - Counterparty PACA lookup
// ================================================================================
router.get('/paca/search', async (req, res) => {
  const db = getDb();
  if (!db) return bad(res, 500, 'DB not initialized', 'Base de datos no inicializada');

  const q = (req.query.q || '').trim();
  const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);

  if (!q || q.length < 2) {
    return bad(res, 400, 'Query must be at least 2 characters', 'La busqueda requiere al menos 2 caracteres');
  }

  try {
    // 1. Try exact PACA number match first
    if (/^\d{6,12}$/.test(q)) {
      const exact = await db.query(
        `SELECT * FROM paca_registry_seed WHERE paca_number = $1 LIMIT 1`,
        [q]
      );
      if (exact.rows.length > 0) {
        emitBrain('COMPLIANCE_PACA_LOOKUP', { query: q, hit: 'exact', match_count: 1 });
        return ok(res, { match_type: 'exact', count: 1, results: exact.rows }, 'Exact match found', 'Coincidencia exacta');
      }
    }

    // 2. Full-text search via tsvector (handles word stemming)
    const ftsTerms = q.split(/\s+/).filter(Boolean).map(t => t.replace(/[^a-zA-Z0-9]/g, '')).filter(Boolean);
    let results = [];
    if (ftsTerms.length > 0) {
      const tsQuery = ftsTerms.join(' & ');
      const fts = await db.query(
        `SELECT *, ts_rank(search_vector, to_tsquery('english', $1)) AS rank
         FROM paca_registry_seed
         WHERE search_vector @@ to_tsquery('english', $1)
         ORDER BY rank DESC
         LIMIT $2`,
        [tsQuery, limit]
      );
      results = fts.rows;
    }

    // 3. If FTS returned nothing, fall back to trigram fuzzy match (typo-tolerant)
    if (results.length === 0) {
      const fuzzy = await db.query(
        `SELECT *, GREATEST(
           similarity(company_legal_name, $1),
           similarity(COALESCE(trade_name, ''), $1)
         ) AS sim
         FROM paca_registry_seed
         WHERE company_legal_name % $1 OR COALESCE(trade_name, '') % $1
         ORDER BY sim DESC
         LIMIT $2`,
        [q, limit]
      );
      results = fuzzy.rows;
    }

    emitBrain('COMPLIANCE_PACA_LOOKUP', { query: q, hit: results.length > 0 ? 'fuzzy' : 'miss', match_count: results.length });
    return ok(res, {
      match_type: results.length > 0 ? 'fuzzy' : 'none',
      count: results.length,
      results
    }, results.length > 0 ? 'Matches found' : 'No matches found', results.length > 0 ? 'Coincidencias encontradas' : 'Sin coincidencias');
  } catch (e) {
    return bad(res, 500, e.message, 'Error en busqueda PACA');
  }
});

// ================================================================================
// ROUTE 7: GET /paca/:pacaNumber - Detail
// ================================================================================
router.get('/paca/:pacaNumber', async (req, res) => {
  const db = getDb();
  if (!db) return bad(res, 500, 'DB not initialized', 'Base de datos no inicializada');

  try {
    const result = await db.query(
      `SELECT * FROM paca_registry_seed WHERE paca_number = $1`,
      [req.params.pacaNumber]
    );
    if (result.rows.length === 0) return bad(res, 404, 'PACA number not found in registry', 'Numero PACA no encontrado en el registro');
    return ok(res, { record: result.rows[0] });
  } catch (e) {
    return bad(res, 500, e.message, 'Error al obtener detalle PACA');
  }
});

// ================================================================================
// ROUTE 8: POST /declarations - Create FSMA 204 CTE record
// ================================================================================
router.post('/declarations', async (req, res) => {
  const db = getDb();
  if (!db) return bad(res, 500, 'DB not initialized', 'Base de datos no inicializada');

  const {
    grower_id, cte_type, traceability_lot_code,
    ftl_food, product_description, variety, commodity,
    quantity_value, quantity_unit, pack_style,
    location_code, location_description,
    field_id, block_id, event_date, event_time, harvest_method,
    packer_entity_id, shipper_entity_id, receiver_entity_id, buyer_entity_id,
    input_lots = [], pesticide_records = [], temperature_log = [],
    related_water_test_id, related_soil_test_id, related_cert_ids = [],
    submitted_by, submitted_role, notes, metadata = {}
  } = req.body || {};

  if (!cte_type || !ALLOWED_CTE_TYPES.includes(cte_type)) {
    return bad(res, 400, `cte_type must be one of: ${ALLOWED_CTE_TYPES.join(', ')}`, 'Tipo de evento CTE invalido', { allowed: ALLOWED_CTE_TYPES });
  }
  if (!event_date) return bad(res, 400, 'event_date required', 'Fecha del evento requerida');

  const tlc = traceability_lot_code || generateTLC(grower_id);

  try {
    const result = await db.query(
      `INSERT INTO production_declarations
        (grower_id, cte_type, traceability_lot_code, ftl_food, product_description, variety, commodity,
         quantity_value, quantity_unit, pack_style, location_code, location_description,
         field_id, block_id, event_date, event_time, harvest_method,
         packer_entity_id, shipper_entity_id, receiver_entity_id, buyer_entity_id,
         input_lots, pesticide_records, temperature_log,
         related_water_test_id, related_soil_test_id, related_cert_ids,
         submitted_by, submitted_role, notes, metadata, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,'submitted')
       RETURNING *`,
      [
        grower_id || null, cte_type, tlc, ftl_food, product_description, variety, commodity,
        quantity_value || null, quantity_unit || null, pack_style || null,
        location_code || null, location_description || null,
        field_id || null, block_id || null, event_date, event_time || null, harvest_method || null,
        packer_entity_id || null, shipper_entity_id || null, receiver_entity_id || null, buyer_entity_id || null,
        JSON.stringify(input_lots), JSON.stringify(pesticide_records), JSON.stringify(temperature_log),
        related_water_test_id || null, related_soil_test_id || null,
        Array.isArray(related_cert_ids) && related_cert_ids.length ? related_cert_ids : null,
        submitted_by || (req.user && req.user.email) || null, submitted_role || null,
        notes || null, JSON.stringify(metadata)
      ]
    );
    const decl = result.rows[0];
    emitBrain('COMPLIANCE_DECLARATION_CREATED', {
      declaration_id: decl.declaration_id,
      grower_id, cte_type, traceability_lot_code: tlc, commodity
    });
    return ok(res, { declaration: decl }, 'Declaration created', 'Declaracion creada');
  } catch (e) {
    return bad(res, 500, e.message, 'Error al crear declaracion');
  }
});

// ================================================================================
// ROUTE 9: GET /declarations/:growerId - List declarations
// ================================================================================
router.get('/declarations/:growerId', async (req, res) => {
  const db = getDb();
  if (!db) return bad(res, 500, 'DB not initialized', 'Base de datos no inicializada');

  const growerId = parseInt(req.params.growerId, 10);
  if (!growerId) return bad(res, 400, 'Invalid grower_id', 'grower_id invalido');

  const { cte_type, commodity, from_date, to_date, lot_code } = req.query;
  const params = [growerId];
  let where = `grower_id = $1`;
  if (cte_type)  { params.push(cte_type);  where += ` AND cte_type = $${params.length}`; }
  if (commodity) { params.push(commodity); where += ` AND commodity = $${params.length}`; }
  if (from_date) { params.push(from_date); where += ` AND event_date >= $${params.length}`; }
  if (to_date)   { params.push(to_date);   where += ` AND event_date <= $${params.length}`; }
  if (lot_code)  { params.push(lot_code);  where += ` AND traceability_lot_code = $${params.length}`; }

  try {
    const result = await db.query(
      `SELECT * FROM production_declarations WHERE ${where} ORDER BY event_date DESC, created_at DESC LIMIT 200`,
      params
    );
    return ok(res, { count: result.rows.length, declarations: result.rows });
  } catch (e) {
    return bad(res, 500, e.message, 'Error al obtener declaraciones');
  }
});

// ================================================================================
// ROUTE 10: GET /dashboard/:growerId - KPI hero data
// ================================================================================
router.get('/dashboard/:growerId', async (req, res) => {
  const db = getDb();
  if (!db) return bad(res, 500, 'DB not initialized', 'Base de datos no inicializada');

  const growerId = parseInt(req.params.growerId, 10);
  if (!growerId) return bad(res, 400, 'Invalid grower_id', 'grower_id invalido');

  try {
    const status = await db.query(
      `SELECT * FROM active_compliance_status WHERE grower_id = $1`,
      [growerId]
    );

    const expiring = await db.query(
      `SELECT * FROM expiring_certs_30d WHERE grower_id = $1 LIMIT 25`,
      [growerId]
    );

    const docCount = await db.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE verified = TRUE)::int AS verified,
              COUNT(*) FILTER (WHERE status = 'pending')::int AS pending
       FROM compliance_documents WHERE grower_id = $1`,
      [growerId]
    );

    const declCount = await db.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE event_date >= CURRENT_DATE - INTERVAL '30 days')::int AS last_30d,
              COUNT(DISTINCT traceability_lot_code)::int AS distinct_lots
       FROM production_declarations WHERE grower_id = $1`,
      [growerId]
    );

    const openAlerts = await db.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical,
              COUNT(*) FILTER (WHERE severity = 'warning')::int AS warning,
              COUNT(*) FILTER (WHERE severity = 'info')::int AS info
       FROM compliance_alerts WHERE grower_id = $1 AND status = 'open'`,
      [growerId]
    );

    return ok(res, {
      grower_id: growerId,
      cert_status:   status.rows[0] || { active_certs: 0, expiring_30d: 0, expired_certs: 0, distinct_cert_types: 0, highest_fsma_tier: null },
      expiring_certs: expiring.rows,
      documents:     docCount.rows[0],
      declarations:  declCount.rows[0],
      alerts:        openAlerts.rows[0]
    });
  } catch (e) {
    return bad(res, 500, e.message, 'Error al obtener dashboard');
  }
});

// ================================================================================
// ROUTE 11: GET /alerts - Alert feed
// ================================================================================
router.get('/alerts', async (req, res) => {
  const db = getDb();
  if (!db) return bad(res, 500, 'DB not initialized', 'Base de datos no inicializada');

  const { grower_id, severity, status = 'open', limit = 50 } = req.query;
  const params = [];
  const conds = [];
  if (grower_id) { params.push(parseInt(grower_id, 10)); conds.push(`grower_id = $${params.length}`); }
  if (severity)  { params.push(severity);                conds.push(`severity = $${params.length}`); }
  if (status)    { params.push(status);                  conds.push(`status = $${params.length}`); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  params.push(Math.min(parseInt(limit, 10) || 50, 200));

  try {
    const result = await db.query(
      `SELECT * FROM compliance_alerts ${where}
       ORDER BY
         CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 WHEN 'info' THEN 3 ELSE 4 END,
         due_date ASC NULLS LAST,
         created_at DESC
       LIMIT $${params.length}`,
      params
    );
    return ok(res, { count: result.rows.length, alerts: result.rows });
  } catch (e) {
    return bad(res, 500, e.message, 'Error al obtener alertas');
  }
});

// ================================================================================
// ROUTE 12: PATCH /alerts/:alertId - Acknowledge or resolve
// ================================================================================
router.patch('/alerts/:alertId', async (req, res) => {
  const db = getDb();
  if (!db) return bad(res, 500, 'DB not initialized', 'Base de datos no inicializada');

  const alertId = parseInt(req.params.alertId, 10);
  if (!alertId) return bad(res, 400, 'Invalid alert_id', 'alert_id invalido');

  const { action, by, notes } = req.body || {};
  const actor = by || (req.user && req.user.email) || 'unknown';

  let sql, params;
  if (action === 'acknowledge') {
    sql = `UPDATE compliance_alerts
           SET status = 'acknowledged', acknowledged_at = NOW(), acknowledged_by = $2
           WHERE alert_id = $1 RETURNING *`;
    params = [alertId, actor];
  } else if (action === 'resolve') {
    sql = `UPDATE compliance_alerts
           SET status = 'resolved', resolved_at = NOW(), resolved_by = $2, resolution_notes = $3
           WHERE alert_id = $1 RETURNING *`;
    params = [alertId, actor, notes || null];
  } else if (action === 'dismiss') {
    sql = `UPDATE compliance_alerts
           SET status = 'dismissed', resolved_at = NOW(), resolved_by = $2, resolution_notes = $3
           WHERE alert_id = $1 RETURNING *`;
    params = [alertId, actor, notes || null];
  } else {
    return bad(res, 400, 'action must be: acknowledge | resolve | dismiss', 'Accion debe ser: acknowledge | resolve | dismiss');
  }

  try {
    const result = await db.query(sql, params);
    if (result.rows.length === 0) return bad(res, 404, 'Alert not found', 'Alerta no encontrada');
    emitBrain('COMPLIANCE_ALERT_RESOLVED', { alert_id: alertId, action, actor });
    return ok(res, { alert: result.rows[0] }, `Alert ${action}d`, `Alerta procesada`);
  } catch (e) {
    return bad(res, 500, e.message, 'Error al procesar alerta');
  }
});

// ================================================================================
// ROUTE 13: POST /field-upload - MOBILE MINI-OFFICE UPLOAD
// The bridge. Any user (grower/packer/shipper/salesman) snaps a photo,
// tags route_to, and the back-office picks it up.
// ================================================================================
router.post('/field-upload', uploadField.single('file'), async (req, res) => {
  const db = getDb();
  if (!db) return bad(res, 500, 'DB not initialized', 'Base de datos no inicializada');
  if (!req.file) return bad(res, 400, 'File required', 'Archivo requerido');

  const {
    uploader_id, uploader_email, uploader_role, uploader_name, uploader_company,
    doc_type, route_to, title, description,
    captured_via = 'UPLOAD', gps_lat, gps_lng, gps_accuracy_m, captured_at,
    device_info = '{}',
    related_entity_type, related_entity_id, related_lot_code,
    related_invoice_no, related_po_no, related_deal_id,
    amount_usd, amount_mxn, notes, metadata = '{}'
  } = req.body || {};

  // Validation
  if (!doc_type || !ALLOWED_FIELD_DOC_TYPES.includes(doc_type)) {
    return bad(res, 400, `doc_type must be one of: ${ALLOWED_FIELD_DOC_TYPES.join(', ')}`, 'Tipo de documento invalido', { allowed: ALLOWED_FIELD_DOC_TYPES });
  }
  if (!route_to || !ALLOWED_ROUTES.includes(route_to)) {
    return bad(res, 400, `route_to must be one of: ${ALLOWED_ROUTES.join(', ')}`, 'Destino de ruta invalido', { allowed: ALLOWED_ROUTES });
  }
  if (uploader_role && !ALLOWED_UPLOADER_ROLES.includes(uploader_role)) {
    return bad(res, 400, `uploader_role must be one of: ${ALLOWED_UPLOADER_ROLES.join(', ')}`, 'Rol de usuario invalido');
  }
  if (captured_via && !ALLOWED_CAPTURE_METHODS.includes(captured_via)) {
    return bad(res, 400, `captured_via must be one of: ${ALLOWED_CAPTURE_METHODS.join(', ')}`, 'Metodo de captura invalido');
  }

  const effectiveUploaderEmail = uploader_email || (req.user && req.user.email) || null;

  try {
    const result = await db.query(
      `INSERT INTO field_uploads
        (uploader_id, uploader_email, uploader_role, uploader_name, uploader_company,
         doc_type, route_to, title, description,
         file_path, file_url, file_size_kb, mime_type, original_filename,
         captured_via, gps_lat, gps_lng, gps_accuracy_m, captured_at, device_info,
         related_entity_type, related_entity_id, related_lot_code,
         related_invoice_no, related_po_no, related_deal_id,
         amount_usd, amount_mxn, notes, metadata, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,'pending')
       RETURNING *`,
      [
        uploader_id || null, effectiveUploaderEmail, uploader_role || null,
        uploader_name || null, uploader_company || null,
        doc_type, route_to, title || req.file.originalname, description || null,
        req.file.path, `/uploads/field/${req.file.filename}`,
        Math.round(req.file.size / 1024), req.file.mimetype, req.file.originalname,
        captured_via,
        gps_lat ? parseFloat(gps_lat) : null,
        gps_lng ? parseFloat(gps_lng) : null,
        gps_accuracy_m ? parseFloat(gps_accuracy_m) : null,
        captured_at || null,
        typeof device_info === 'string' ? device_info : JSON.stringify(device_info),
        related_entity_type || null, related_entity_id ? parseInt(related_entity_id, 10) : null,
        related_lot_code || null,
        related_invoice_no || null, related_po_no || null,
        related_deal_id ? parseInt(related_deal_id, 10) : null,
        amount_usd ? parseFloat(amount_usd) : null,
        amount_mxn ? parseFloat(amount_mxn) : null,
        notes || null,
        typeof metadata === 'string' ? metadata : JSON.stringify(metadata)
      ]
    );
    const upload = result.rows[0];

    emitBrain('COMPLIANCE_FIELD_UPLOAD', {
      upload_id: upload.upload_id,
      uploader_email: effectiveUploaderEmail,
      uploader_role,
      doc_type,
      route_to,
      has_gps: !!(gps_lat && gps_lng),
      amount_usd: amount_usd || null,
      related_invoice_no: related_invoice_no || null,
      related_lot_code: related_lot_code || null
    });

    // Cross-system signaling: emit a route-specific event so downstream modules can react
    const routeEvents = {
      COMPLIANCE:    'COMPLIANCE_INTAKE_NEW',
      FACTORING:     'FACTORING_INTAKE_NEW',
      PO_FINANCE:    'PO_FINANCE_INTAKE_NEW',
      CRM:           'CRM_INTAKE_NEW',
      DEAL_FLOOR:    'DEAL_FLOOR_INTAKE_NEW',
      TRACEABILITY:  'TRACEABILITY_INTAKE_NEW',
      ACCOUNTING:    'ACCOUNTING_INTAKE_NEW'
    };
    if (routeEvents[route_to]) {
      emitBrain(routeEvents[route_to], { upload_id: upload.upload_id, doc_type, uploader_email: effectiveUploaderEmail });
    }

    return ok(res, {
      upload,
      routed_to: route_to,
      message_en: `Upload received and routed to ${route_to}. Back-office will process within 24 hours.`,
      message_es: `Archivo recibido y enviado a ${route_to}. La oficina lo procesara en 24 horas.`
    });
  } catch (e) {
    return bad(res, 500, e.message, 'Error al subir archivo de campo');
  }
});

// ================================================================================
// ROUTE 14: GET /field-uploads/inbox - Back-office inbox
// ================================================================================
router.get('/field-uploads/inbox', async (req, res) => {
  const db = getDb();
  if (!db) return bad(res, 500, 'DB not initialized', 'Base de datos no inicializada');

  const { route_to, status = 'pending', uploader_role, limit = 50 } = req.query;
  const params = [];
  const conds = [];
  if (route_to)       { params.push(route_to);       conds.push(`route_to = $${params.length}`); }
  if (status)         { params.push(status);         conds.push(`status = $${params.length}`); }
  if (uploader_role)  { params.push(uploader_role);  conds.push(`uploader_role = $${params.length}`); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  params.push(Math.min(parseInt(limit, 10) || 50, 200));

  try {
    const summary = await db.query(`SELECT * FROM pending_field_uploads_by_route`);
    const items = await db.query(
      `SELECT * FROM field_uploads ${where} ORDER BY created_at DESC LIMIT $${params.length}`,
      params
    );
    return ok(res, {
      summary: summary.rows,
      count: items.rows.length,
      uploads: items.rows
    });
  } catch (e) {
    return bad(res, 500, e.message, 'Error al obtener bandeja');
  }
});

// ================================================================================
// MULTER ERROR HANDLER (file too large, etc.)
// ================================================================================
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      error_en: `Upload error: ${err.message}`,
      error_es: `Error al subir: ${err.message}`,
      code: err.code
    });
  }
  if (err) {
    console.error('[ComplianceCenter] Unhandled error:', err);
    return res.status(500).json({
      success: false,
      error_en: 'Internal server error',
      error_es: 'Error interno del servidor'
    });
  }
  next();
});

module.exports = router;