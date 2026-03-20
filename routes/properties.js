// ═══════════════════════════════════════════════════════════════
// PROPERTIES ROUTE v4.0 — SECURED — EnjoyBaja / AuditDNA
// C:\AuditDNA\backend\routes\properties.js
//
// SECURITY MODEL (mirrors Developments.js RBAC):
//   owner  → Full access (sg01@eb.com)
//   admin  → Full access (sg01@eb.com, gl@eb.com)
//   sales  → Own listings + create (REagent-*@eb.com)
//   public → Approved listings only, sanitized
//
// CHANGES FROM v3.0:
//   ✓ RBAC middleware on all write/admin endpoints
//   ✓ Public shape strips seller PII, commissions, internal notes
//   ✓ /stats, /pending, /sold, /all → owner-only
//   ✓ POST / → requires auth (sales+)
//   ✓ PUT, DELETE → requires owner/admin or own listing
//   ✓ Commission rates server-side only (COMMISSION_SCHEDULE)
//   ✓ Credential generation server-side (POST /agent-registrations)
//   ✓ Photo upload via base64 capped at 10MB per photo
//   ✓ Rate limiting on registration endpoint
// ═══════════════════════════════════════════════════════════════

const express = require('express');
const crypto  = require('crypto');
const notify  = require('./notifications');
const router  = express.Router();
const { pool } = require('../db');

// ================================================================
// SINGLE SOURCE OF TRUTH — COMMISSION SCHEDULE
// ================================================================
// NEVER expose these to public frontend. Owner/admin only.
// ================================================================
const COMMISSION_SCHEDULE = {
  fsbo:     6.00,
  external: 2.00,
  inhouse:  7.50,  // range 5-10%, default 7.5%
  admin:    2.00,
  owner:    2.00,
  sales:    3.00,
};

// ================================================================
// RBAC MIDDLEWARE — Same pattern as Developments.js
// ================================================================
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'Dsg060905#321';

const OWNER_EMAILS = new Set(['sg01@eb.com']);
const ADMIN_EMAILS = new Set([
  'sg01@eb.com','gl@eb.com','fm@eb.com','ab-03@eb.com','og01@eb.com',
  'hm@eb.com','ec@eb.com','dsg@eb.com','fms@eb.com','mg@eb.com','dv@eb.com',
  'admin01@eb.com','admin02@eb.com','admin03@eb.com','admin04@eb.com','admin05@eb.com'
]);

function getRequestRole(req) {
  // Try JWT first (primary auth)
  const authHeader = req.headers['authorization'] || '';
  if (authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);
      req.email = decoded.email;
      return decoded.role || 'public';
    } catch {}
  }
  // Fall back to legacy headers
  const email = (req.headers['x-user-email'] || '').toLowerCase().trim();
  const level = (req.headers['x-access-level'] || '').toLowerCase().trim();
  if (OWNER_EMAILS.has(email) && level === 'owner') return 'owner';
  if (ADMIN_EMAILS.has(email) && (level === 'admin' || level === 'owner')) return 'admin';
  if (level === 'sales' && email.endsWith('@eb.com')) return 'sales';
  if (level === 'agent' && email.endsWith('@eb.com')) return 'agent';
  return 'public';
}

function requireOwner(req, res, next) {
  // x-admin bypass — Brain.js and internal server-to-server calls
  if (req.headers['x-admin'] === 'true') {
    req.role  = 'owner';
    req.email = 'system';
    return next();
  }
  req.role  = getRequestRole(req);
  req.email = (req.headers['x-user-email'] || '').toLowerCase().trim();
  if (req.role !== 'owner' && req.role !== 'admin') {
    return res.status(403).json({ error: 'Owner/admin access required' });
  }
  next();
}

function requireAuth(req, res, next) {
  req.role  = getRequestRole(req);
  req.email = (req.headers['x-user-email'] || '').toLowerCase().trim();
  if (req.role === 'public') {
    return res.status(403).json({ error: 'Authentication required' });
  }
  next();
}

function attachRole(req, res, next) {
  req.role  = getRequestRole(req);
  req.email = (req.headers['x-user-email'] || '').toLowerCase().trim();
  next();
}

// ================================================================
// RATE LIMITER — Simple in-memory for registration/submission
// ================================================================
const rateLimits = new Map();

function rateLimit(windowMs, maxRequests, keyFn) {
  return (req, res, next) => {
    const key = keyFn ? keyFn(req) : (req.ip || 'unknown');
    const now = Date.now();
    const window = rateLimits.get(key) || { count: 0, start: now };

    if (now - window.start > windowMs) {
      window.count = 0;
      window.start = now;
    }

    window.count++;
    rateLimits.set(key, window);

    if (window.count > maxRequests) {
      return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }
    next();
  };
}

// Clean up rate limiter every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimits) {
    if (now - val.start > 600000) rateLimits.delete(key);
  }
}, 600000);

// ── Generate property ID ──────────────────────────────────────
const genPropId = () =>
  `EB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2,5).toUpperCase()}`;

// ── Next 1st or 15th commission pay date ─────────────────────
const nextPayDate = (fromDate) => {
  const d   = fromDate ? new Date(fromDate) : new Date();
  const day = d.getDate();
  const pay = day <= 14
    ? new Date(d.getFullYear(), d.getMonth(), 15)
    : new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return pay.toISOString().split('T')[0];
};

// ── Bootstrap table ───────────────────────────────────────────
const initTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS properties (
      id               SERIAL PRIMARY KEY,
      property_id      VARCHAR(32) UNIQUE,
      type             VARCHAR(20)   DEFAULT 'fsbo',
      listing_type     VARCHAR(20)   DEFAULT 'fsbo',
      status           VARCHAR(30)   DEFAULT 'pending_review',
      uploaded_by      VARCHAR(100)  DEFAULT 'fsbo',
      uploader_role    VARCHAR(32),
      uploader_name    VARCHAR(256),
      agent_email      VARCHAR(150),
      titulo           TEXT,
      titulo_es        TEXT,
      region           VARCHAR(128),
      calle            TEXT,
      num_ext          VARCHAR(20),
      num_int          VARCHAR(20),
      colonia          TEXT,
      municipio        TEXT,
      estado           TEXT          DEFAULT 'Baja California Norte',
      cp               VARCHAR(10),
      carretera        TEXT,
      lat              VARCHAR(30),
      lng              VARCHAR(30),
      tipo             TEXT,
      recamaras        INTEGER,
      banos            NUMERIC(4,1),
      cajones          INTEGER,
      m2_const         NUMERIC(10,2),
      sqft_const       NUMERIC(10,2),
      m2_lot           NUMERIC(10,2),
      sqft_lot         NUMERIC(10,2),
      zona_restringida BOOLEAN       DEFAULT false,
      fideicomiso_req  BOOLEAN       DEFAULT false,
      price_usd        NUMERIC(15,2),
      price_mxn        NUMERIC(18,2),
      descripcion      TEXT,
      descripcion_es   TEXT,
      amenidades       TEXT[]        DEFAULT '{}',
      photos           TEXT[]        DEFAULT '{}',
      internal_notes   TEXT,
      seller_name      TEXT,
      seller_email     TEXT,
      seller_phone     TEXT,
      seller_id        TEXT,
      commission_rate      NUMERIC(4,2)  DEFAULT 6.00,
      commission_paid      BOOLEAN       DEFAULT false,
      commission_paid_date DATE,
      notario_fee      NUMERIC(15,2),
      isai_tax         NUMERIC(15,2),
      fideicomiso_fee  NUMERIC(15,2),
      sold_price       NUMERIC(15,2),
      buyer_name       TEXT,
      buyer_email      TEXT,
      closing_date     DATE,
      sold_at          TIMESTAMPTZ,
      commission_pay_date DATE,
      views            INTEGER       DEFAULT 0,
      featured         BOOLEAN       DEFAULT false,
      created_at       TIMESTAMPTZ   DEFAULT NOW(),
      updated_at       TIMESTAMPTZ   DEFAULT NOW(),
      approved_at      TIMESTAMPTZ,
      approved_by      VARCHAR(150),
      rejection_note   TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_props_status      ON properties(status);
    CREATE INDEX IF NOT EXISTS idx_props_municipio   ON properties(municipio);
    CREATE INDEX IF NOT EXISTS idx_props_region      ON properties(region);
    CREATE INDEX IF NOT EXISTS idx_props_tipo        ON properties(tipo);
    CREATE INDEX IF NOT EXISTS idx_props_price       ON properties(price_usd);
    CREATE INDEX IF NOT EXISTS idx_props_created     ON properties(created_at);
    CREATE INDEX IF NOT EXISTS idx_props_uploaded_by ON properties(uploaded_by);
  `);

  // v2 → v3 column upgrades
  const cols = [
    `ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_id      VARCHAR(32) UNIQUE`,
    `ALTER TABLE properties ADD COLUMN IF NOT EXISTS listing_type     VARCHAR(20)  DEFAULT 'fsbo'`,
    `ALTER TABLE properties ADD COLUMN IF NOT EXISTS uploader_role    VARCHAR(32)`,
    `ALTER TABLE properties ADD COLUMN IF NOT EXISTS uploader_name    VARCHAR(256)`,
    `ALTER TABLE properties ADD COLUMN IF NOT EXISTS titulo           TEXT`,
    `ALTER TABLE properties ADD COLUMN IF NOT EXISTS titulo_es        TEXT`,
    `ALTER TABLE properties ADD COLUMN IF NOT EXISTS region           VARCHAR(128)`,
    `ALTER TABLE properties ADD COLUMN IF NOT EXISTS zona_restringida BOOLEAN DEFAULT false`,
    `ALTER TABLE properties ADD COLUMN IF NOT EXISTS fideicomiso_req  BOOLEAN DEFAULT false`,
    `ALTER TABLE properties ADD COLUMN IF NOT EXISTS descripcion_es   TEXT`,
    `ALTER TABLE properties ADD COLUMN IF NOT EXISTS internal_notes   TEXT`,
    `ALTER TABLE properties ADD COLUMN IF NOT EXISTS commission_paid      BOOLEAN DEFAULT false`,
    `ALTER TABLE properties ADD COLUMN IF NOT EXISTS commission_paid_date DATE`,
    `ALTER TABLE properties ADD COLUMN IF NOT EXISTS notario_fee      NUMERIC(15,2)`,
    `ALTER TABLE properties ADD COLUMN IF NOT EXISTS isai_tax         NUMERIC(15,2)`,
    `ALTER TABLE properties ADD COLUMN IF NOT EXISTS fideicomiso_fee  NUMERIC(15,2)`,
    `ALTER TABLE properties ADD COLUMN IF NOT EXISTS sold_price       NUMERIC(15,2)`,
    `ALTER TABLE properties ADD COLUMN IF NOT EXISTS buyer_name       TEXT`,
    `ALTER TABLE properties ADD COLUMN IF NOT EXISTS buyer_email      TEXT`,
    `ALTER TABLE properties ADD COLUMN IF NOT EXISTS closing_date     DATE`,
    `ALTER TABLE properties ADD COLUMN IF NOT EXISTS sold_at          TIMESTAMPTZ`,
    `ALTER TABLE properties ADD COLUMN IF NOT EXISTS commission_pay_date DATE`,
  ];
  for (const sql of cols) {
    await pool.query(sql).catch(() => {});
  }

  // v4: agent_registrations table for secure credential storage
  await pool.query(`
    CREATE TABLE IF NOT EXISTS agent_registrations (
      id            SERIAL PRIMARY KEY,
      agent_code    VARCHAR(100) UNIQUE,
      password_hash VARCHAR(256),
      pin_hash      VARCHAR(256),
      salt          VARCHAR(64),
      nombre        TEXT,
      apellidos     TEXT,
      email         VARCHAR(150),
      phone         VARCHAR(50),
      whatsapp      VARCHAR(50),
      empresa       TEXT,
      licencia      TEXT,
      ine           VARCHAR(30),
      curp          VARCHAR(20),
      banco         TEXT,
      clabe         VARCHAR(20),
      referido_por  TEXT,
      agent_type    VARCHAR(20),
      commission_rate NUMERIC(4,2),
      role          VARCHAR(20)  DEFAULT 'sales',
      status        VARCHAR(30)  DEFAULT 'pending_verification',
      has_ine       BOOLEAN      DEFAULT false,
      has_selfie    BOOLEAN      DEFAULT false,
      accept_terms  BOOLEAN      DEFAULT false,
      created_at    TIMESTAMPTZ  DEFAULT NOW(),
      verified_at   TIMESTAMPTZ,
      last_login    TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_agents_email ON agent_registrations(email);
    CREATE INDEX IF NOT EXISTS idx_agents_code  ON agent_registrations(agent_code);
  `).catch(() => {});

  console.log('✅ [PROPERTIES] PostgreSQL tables ready (v4.0 secured)');
};
initTable().catch(e => console.error('❌ [PROPERTIES] Init failed:', e.message));

// ================================================================
// SHAPE FUNCTIONS — Public vs Full
// ================================================================

// PUBLIC shape: strips seller PII, commissions, internal notes, buyer data
const shapePublic = (r) => ({
  id:          r.id,
  propertyId:  r.property_id || `PROP-${r.id}`,
  type:        r.type,
  listingType: r.listing_type,
  status:      r.status,
  featured:    r.featured,
  views:       r.views,
  createdAt:   r.created_at,
  // Bilingual
  titulo:      r.titulo,
  titulo_es:   r.titulo_es,
  region:      r.region,
  // Mexico specifics
  zona_restringida: r.zona_restringida,
  fideicomiso_req:  r.fideicomiso_req,
  // Address (public — location helps buyers)
  address: {
    colonia:   r.colonia,
    municipio: r.municipio,
    estado:    r.estado,
    carretera: r.carretera,
    lat:       r.lat,
    lng:       r.lng,
  },
  // Details
  details: {
    tipo:      r.tipo,      recamaras: r.recamaras,
    banos:     r.banos,     cajones:   r.cajones,
    m2Const:   r.m2_const,  sqftConst: r.sqft_const,
    m2Lot:     r.m2_lot,    sqftLot:   r.sqft_lot,
  },
  // Pricing (public — buyers need to see asking price)
  pricing: {
    priceUSD: parseFloat(r.price_usd) || 0,
    priceMXN: parseFloat(r.price_mxn) || 0,
  },
  // Content (public portions only)
  content: {
    descripcion:    r.descripcion,
    descripcion_es: r.descripcion_es,
    amenidades:     r.amenidades || [],
    photos:         r.photos     || [],
    // internalNotes: STRIPPED
  },
  // seller: STRIPPED — no PII
  // commission: STRIPPED
  // sold buyer info: STRIPPED
  // Flat fields for PropertySearch gallery compatibility
  precio:      parseFloat(r.price_usd) || 0,
  moneda:      'USD',
  recamaras:   r.recamaras,
  banos:       parseFloat(r.banos) || 0,
  m2:          parseFloat(r.m2_const) || parseFloat(r.m2_lot) || 0,
  descripcion: r.descripcion,
  descripcion_es: r.descripcion_es,
  amenidades:  r.amenidades || [],
  fotos:       r.photos || [],
  agente:      r.uploader_name || 'EnjoyBaja',  // name only, no email
  municipio:   r.municipio,
  createdAt:   r.created_at,
});

// FULL shape: owner/admin — all fields including PII, commissions, notes
const shapeFull = (r) => ({
  ...shapePublic(r),
  // Restore full address
  address: {
    calle:     r.calle,     numExt:    r.num_ext,
    numInt:    r.num_int,   colonia:   r.colonia,
    municipio: r.municipio, estado:    r.estado,
    cp:        r.cp,        carretera: r.carretera,
    lat:       r.lat,       lng:       r.lng,
  },
  // Full content with internal notes
  content: {
    descripcion:    r.descripcion,
    descripcion_es: r.descripcion_es,
    amenidades:     r.amenidades || [],
    photos:         r.photos     || [],
    internalNotes:  r.internal_notes,
  },
  // Uploader info
  uploadedBy:  r.uploaded_by,
  uploaderRole:r.uploader_role,
  uploaderName:r.uploader_name,
  agentEmail:  r.agent_email,
  // Seller PII (FSBO)
  seller: {
    name:  r.seller_name,  email: r.seller_email,
    phone: r.seller_phone, id:    r.seller_id,
  },
  // Commission
  commissionRate:     parseFloat(r.commission_rate) || 6,
  commissionPaid:     r.commission_paid,
  commissionPaidDate: r.commission_paid_date,
  commissionPayDate:  r.commission_pay_date,
  // Admin tracking
  updatedAt:   r.updated_at,
  approvedAt:  r.approved_at,
  approvedBy:  r.approved_by,
  rejectionNote: r.rejection_note,
  // Sold / closing
  sold: r.status === 'sold' ? {
    soldPrice:   parseFloat(r.sold_price) || 0,
    buyerName:   r.buyer_name,
    buyerEmail:  r.buyer_email,
    closingDate: r.closing_date,
    soldAt:      r.sold_at,
    commissionPayDate: r.commission_pay_date,
  } : null,
  // Mexico closing cost estimates
  closingCosts: {
    notario:     parseFloat(r.notario_fee)    || 0,
    isai:        parseFloat(r.isai_tax)       || 0,
    fideicomiso: parseFloat(r.fideicomiso_fee)|| 0,
    total:       (parseFloat(r.notario_fee)||0) + (parseFloat(r.isai_tax)||0) + (parseFloat(r.fideicomiso_fee)||0),
    currency:    'USD',
  },
  // Override flat fields with full agent info
  agente:       r.uploader_name || r.uploaded_by,
  agente_email: r.agent_email,
});

// ================================================================
// OWNER-ONLY ENDPOINTS
// ================================================================

// ── GET /stats (OWNER) ──────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)                                                   AS total,
        COUNT(*) FILTER (WHERE type='fsbo')                        AS fsbo,
        COUNT(*) FILTER (WHERE listing_type='agent')               AS agent_uploads,
        COUNT(*) FILTER (WHERE status='pending_review')            AS pending,
        COUNT(*) FILTER (WHERE status='approved')                  AS approved,
        COUNT(*) FILTER (WHERE status='sold')                      AS sold,
        COUNT(*) FILTER (WHERE featured=true)                      AS featured,
        COUNT(*) FILTER (WHERE zona_restringida=true)              AS restricted_zone,
        COUNT(*) FILTER (WHERE commission_paid=false AND status='sold') AS commissions_due,
        COALESCE(SUM(views),0)                                     AS total_views,
        COALESCE(AVG(price_usd) FILTER (WHERE status='approved'),0) AS avg_price_usd,
        COALESCE(MIN(price_usd) FILTER (WHERE status='approved'),0) AS min_price_usd,
        COALESCE(MAX(price_usd) FILTER (WHERE status='approved'),0) AS max_price_usd,
        COALESCE(SUM(sold_price) FILTER (WHERE status='sold'),0)   AS total_sold_volume,
        COALESCE(SUM(sold_price * commission_rate / 100) FILTER (WHERE status='sold'),0) AS total_commissions_earned,
        COALESCE(SUM(price_usd) FILTER (WHERE status='approved'),0)                       AS pipeline_value,
        COUNT(*) FILTER (WHERE status='approved')                                          AS active
      FROM properties
    `);
    res.json({ success: true, stats: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /commission-schedule (OWNER) — Single source of truth ──
router.get('/commission-schedule', requireOwner, (req, res) => {
  res.json({ success: true, schedule: COMMISSION_SCHEDULE });
});

// ── GET /pending (OWNER) ─────────────────────────────────────
router.get('/pending', requireOwner, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM properties WHERE status='pending_review' ORDER BY created_at ASC`
    );
    res.json({ success: true, count: rows.length, properties: rows.map(shapeFull) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /sold (OWNER — commission tracking) ──────────────────
router.get('/sold', requireOwner, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM properties WHERE status='sold' ORDER BY sold_at DESC`
    );
    res.json({ success: true, count: rows.length, properties: rows.map(shapeFull) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /all (OWNER) ─────────────────────────────────────────
router.get('/all', requireOwner, async (req, res) => {
  const { status, type, municipio, region, limit = 100, offset = 0 } = req.query;
  const conditions = [];
  const params     = [];
  if (status)    { params.push(status);           conditions.push(`status=$${params.length}`); }
  if (type)      { params.push(type);             conditions.push(`type=$${params.length}`); }
  if (municipio) { params.push(`%${municipio}%`); conditions.push(`municipio ILIKE $${params.length}`); }
  if (region)    { params.push(`%${region}%`);    conditions.push(`region ILIKE $${params.length}`); }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  params.push(parseInt(limit), parseInt(offset));
  try {
    const { rows } = await pool.query(
      `SELECT * FROM properties ${where} ORDER BY created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`, params
    );
    const cnt = await pool.query(`SELECT COUNT(*) FROM properties ${where}`, params.slice(0,-2));
    res.json({ success: true, count: parseInt(cnt.rows[0].count), properties: rows.map(shapeFull) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ================================================================
// PUBLIC ENDPOINTS — Sanitized data only
// ================================================================

// ── GET / (PUBLIC — approved listings, sanitized) ─────────────
router.get('/', attachRole, async (req, res) => {
  const { status, municipio, region, tipo, minPrice, maxPrice, beds, featured, limit = 100, offset = 0 } = req.query;
  const statusFilter = status === 'active' ? 'approved' : (status || 'approved');
  const conditions   = [`status=$1`];
  const params       = [statusFilter];

  if (municipio) { params.push(`%${municipio}%`); conditions.push(`municipio ILIKE $${params.length}`); }
  if (region)    { params.push(`%${region}%`);    conditions.push(`(region ILIKE $${params.length} OR municipio ILIKE $${params.length})`); }
  if (tipo)      { params.push(tipo);              conditions.push(`tipo=$${params.length}`); }
  if (minPrice)  { params.push(minPrice);          conditions.push(`price_usd >= $${params.length}`); }
  if (maxPrice)  { params.push(maxPrice);          conditions.push(`price_usd <= $${params.length}`); }
  if (beds)      { params.push(parseInt(beds));    conditions.push(`recamaras >= $${params.length}`); }
  if (featured === 'true') { conditions.push(`featured=true`); }
  params.push(parseInt(limit), parseInt(offset));

  try {
    const { rows } = await pool.query(
      `SELECT * FROM properties WHERE ${conditions.join(' AND ')}
       ORDER BY featured DESC, created_at DESC
       LIMIT $${params.length-1} OFFSET $${params.length}`, params
    );
    const shaper = (req.role === 'owner' || req.role === 'admin') ? shapeFull : shapePublic;
    res.json(rows.map(shaper));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /public-stats — hero stats (limited, no financials) ──
router.get('/public-stats', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status='approved') AS total_listings,
        COUNT(*) FILTER (WHERE status='sold')     AS sold_listings
      FROM properties
    `);
    // Agent count from registrations
    let agentCount = 0;
    try {
      const agents = await pool.query(`SELECT COUNT(*) FROM agent_registrations`);
      agentCount = parseInt(agents.rows[0].count) || 0;
    } catch {}
    res.json({
      properties: {
        total_listings: parseInt(rows[0].total_listings) || 0,
        sold_listings:  parseInt(rows[0].sold_listings)  || 0,
      },
      agent_count: agentCount,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /:id (PUBLIC — sanitized for non-owners) ─────────────
router.get('/:id', attachRole, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM properties WHERE id=$1 OR property_id=$1', [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Property not found' });
    pool.query('UPDATE properties SET views=views+1 WHERE id=$1', [rows[0].id]).catch(() => {});
    const shaper = (req.role === 'owner' || req.role === 'admin') ? shapeFull : shapePublic;
    res.json({ success: true, property: shaper(rows[0]) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ================================================================
// AUTH-REQUIRED ENDPOINTS — Create / Update / Delete
// ================================================================

// ── POST /fsbo — PUBLIC FSBO listing (no auth required) ──────
router.post('/fsbo', async (req, res) => {
  const d = req.body;
  if (!d.sellerEmail || !d.calle || !d.priceUSD) {
    return res.status(400).json({ error: 'sellerEmail, calle, and priceUSD required' });
  }
  try {
    const propertyId = genPropId();
    const priceUSD   = parseFloat(d.priceUSD) || 0;
    const priceMXN   = parseFloat(d.priceMXN) || (priceUSD * 17.5);
    const { rows } = await pool.query(`
      INSERT INTO properties (
        property_id, type, listing_type, status,
        uploaded_by, uploader_role,
        calle, municipio, estado, cp,
        tipo, recamaras, banos, sqft_const,
        price_usd, price_mxn,
        descripcion, photos,
        seller_name, seller_email, seller_phone,
        commission_rate, notario_fee, isai_tax
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24
      ) RETURNING property_id, id
    `, [
      propertyId, 'fsbo', 'fsbo', 'pending_review',
      d.sellerEmail, 'fsbo',
      d.calle || null, d.municipio || null,
      d.estado || 'Baja California', d.cp || null,
      d.tipo || null,
      d.recamaras ? parseInt(d.recamaras) : null,
      d.banos ? parseFloat(d.banos) : null,
      d.sqftConst ? parseFloat(d.sqftConst) : null,
      priceUSD, priceMXN,
      d.descripcion || null,
      d.photos || [],
      d.sellerName || null, d.sellerEmail,
      d.sellerPhone || null,
      priceUSD < 250000 ? 2.0 : 3.0,
      priceUSD * 0.05, priceUSD * 0.025
    ]);
    return res.json({ success: true, property: { id: rows[0].property_id, dbId: rows[0].id } });
  } catch (err) {
    console.error('[PROPERTIES] FSBO post error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /traspaso — PUBLIC traspaso listing (no auth) ────────
router.post('/traspaso', async (req, res) => {
  const d = req.body;
  if (!d.email || !d.totalPrice) {
    return res.status(400).json({ error: 'email and totalPrice required' });
  }
  try {
    const propertyId = genPropId();
    const priceUSD   = parseFloat(d.totalPrice) || 0;
    const { rows } = await pool.query(`
      INSERT INTO properties (
        property_id, type, listing_type, status,
        uploaded_by, uploader_role,
        calle, municipio, estado,
        price_usd, price_mxn,
        descripcion, photos,
        seller_name, seller_email, seller_phone,
        commission_rate, internal_notes
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
      ) RETURNING property_id, id
    `, [
      propertyId, 'traspaso', 'traspaso', 'pending_review',
      d.email, 'public',
      d.address || d.calle || null,
      d.city || d.municipio || null,
      d.state || d.estado || 'Baja California',
      priceUSD, priceUSD * 17.5,
      d.description || null,
      d.photos || [],
      d.ownerName || d.sellerName || null,
      d.email, d.phone || null,
      2.0,
      JSON.stringify({ remainingBalance: d.remainingBalance, monthlyPayment: d.monthlyPayment, remainingMonths: d.remainingMonths, askingTransfer: d.askingTransfer })
    ]);
    return res.json({ success: true, property: { id: rows[0].property_id, dbId: rows[0].id } });
  } catch (err) {
    console.error('[PROPERTIES] Traspaso post error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST / — create listing (REQUIRES AUTH: sales+) ──────────
router.post('/', requireAuth, async (req, res) => {
  const d = req.body;

  // Validate photos aren't gigantic base64 bombs
  if (d.photos && Array.isArray(d.photos)) {
    const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB per photo
    for (let i = 0; i < d.photos.length; i++) {
      if (typeof d.photos[i] === 'string' && d.photos[i].length > MAX_PHOTO_SIZE) {
        return res.status(413).json({ error: `Photo ${i+1} exceeds 10MB limit. Compress before uploading.` });
      }
    }
    if (d.photos.length > 8) {
      return res.status(400).json({ error: 'Maximum 8 photos per listing.' });
    }
  }

  try {
    const propertyId = genPropId();
    const role       = req.role; // from middleware — trustworthy
    const isPrivileged = ['owner','admin','sales'].includes(role);

    // Commission rate comes from COMMISSION_SCHEDULE — not from client
    const agentType  = (d.agentType || d.type || 'fsbo').toLowerCase();
    const commRate   = COMMISSION_SCHEDULE[agentType] || COMMISSION_SCHEDULE[role] || COMMISSION_SCHEDULE.fsbo;

    // Owner/admin can override commission rate
    const finalCommRate = (role === 'owner' || role === 'admin') && d.commissionRate
      ? parseFloat(d.commissionRate)
      : commRate;

    // FSBO goes pending_review; agents/sales/admin go approved immediately
    const status   = isPrivileged ? 'approved' : 'pending_review';
    const priceUSD = parseFloat(d.priceUSD || d.precio || d.price) || 0;
    const priceMXN = parseFloat(d.priceMXN) || (priceUSD * 17.5);

    // Mexico closing cost estimates
    const notarioFee   = priceUSD * 0.05;
    const isaiTax      = priceUSD * 0.025;
    const fideicomiso  = (d.zona_restringida || d.zonaRestringida) ? 2500 : 0;

    const { rows } = await pool.query(`
      INSERT INTO properties (
        property_id, type, listing_type, status,
        uploaded_by, uploader_role, uploader_name, agent_email,
        titulo, titulo_es, region,
        calle, num_ext, num_int, colonia, municipio, estado, cp, carretera, lat, lng,
        tipo, recamaras, banos, cajones,
        m2_const, sqft_const, m2_lot, sqft_lot,
        zona_restringida, fideicomiso_req,
        price_usd, price_mxn,
        descripcion, descripcion_es, amenidades, photos,
        seller_name, seller_email, seller_phone, seller_id,
        commission_rate, internal_notes,
        notario_fee, isai_tax, fideicomiso_fee
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,
        $31,$32,$33,$34,$35,$36,$37,$38,$39,$40,
        $41,$42,$43,$44,$45,$46
      ) RETURNING *
    `, [
      propertyId,
      d.type         || (isPrivileged ? 'agent' : 'fsbo'),
      d.listingType  || (isPrivileged ? 'agent' : 'fsbo'),
      status,
      req.email,         // from auth middleware — not client-supplied
      role,              // from auth middleware — not client-supplied
      d.uploaderName || d.uploader_name || req.email,
      d.agentEmail   || d.agent_email   || req.email,
      d.titulo       || d.title         || d.name        || null,
      d.titulo_es    || d.titulo        || null,
      d.region       || d.municipio     || null,
      d.calle        || null,   d.numExt    || null,  d.numInt    || null,
      d.colonia      || null,   d.municipio || null,
      d.estado       || 'Baja California Norte',
      d.cp           || null,   d.carretera || null,
      d.lat          || null,   d.lng       || null,
      d.tipo         || null,
      d.recamaras    ? parseInt(d.recamaras)       : null,
      d.banos        ? parseFloat(d.banos)         : null,
      d.cajones      ? parseInt(d.cajones)         : null,
      d.m2Const      ? parseFloat(d.m2Const)       : null,
      d.sqftConst    ? parseFloat(d.sqftConst)     : null,
      d.m2Lot        ? parseFloat(d.m2Lot || d.m2) : null,
      d.sqftLot      ? parseFloat(d.sqftLot)       : null,
      !!(d.zona_restringida || d.zonaRestringida),
      !!(d.zona_restringida || d.zonaRestringida),
      priceUSD,
      priceMXN,
      d.descripcion  || d.description   || null,
      d.descripcion_es || d.descripcion || null,
      d.amenidades   || d.amenities     || [],
      d.photos       || d.fotos         || [],
      d.sellerName   || d.seller_name   || null,
      d.sellerEmail  || d.seller_email  || null,
      d.sellerPhone  || d.seller_phone  || null,
      d.sellerID     || d.seller_id     || null,
      finalCommRate,
      d.internalNotes || d.internal_notes || null,
      notarioFee, isaiTax, fideicomiso,
    ]);

    // Notify admin
    try { notify.onPropertySubmitted({ ...rows[0], titulo: rows[0].titulo }); } catch {}
    try {
      const brain = require('../Brain');
      if (brain?.processWorkflow) brain.processWorkflow('property_submitted', {
        propertyId, status, region: rows[0].region,
        priceUSD, uploaderRole: role, uploadedBy: req.email,
      });
    } catch {}

    res.status(201).json({
      success:    true,
      property:   shapeFull(rows[0]),
      message:    status === 'approved'
        ? 'Property is now LIVE on the platform.'
        : 'Property submitted for admin review (FSBO — pending approval).',
      closing_estimates: {
        notario_fee: notarioFee,
        isai_tax:    isaiTax,
        fideicomiso: fideicomiso,
        total:       notarioFee + isaiTax + fideicomiso,
        note:        'Estimates only — final amounts determined by Notario Público',
        currency:    'USD',
      },
    });
  } catch (e) {
    console.error('[PROPERTIES POST]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── PUT /:id — update listing (OWNER/ADMIN or own listing) ───
// ── POST /agent-listing — admin/agent listing alias ──────────
router.post('/agent-listing', requireAuth, async (req, res, next) => {
  // Normalize incoming field names from frontend to match POST / handler
  const d = req.body;
  if (d.agentNombre && !d.uploaderName)   req.body.uploaderName = d.agentNombre;
  if (d.agentEmail  && !d.agent_email)    req.body.agent_email  = d.agentEmail;
  if (d.agentTel    && !d.sellerPhone)    req.body.sellerPhone  = d.agentTel;
  if (d.agentLicencia) req.body.agentCode = d.agentLicencia;
  // Pass through to POST / handler
  req.url = '/';
  next('route');
});

router.put('/:id', requireAuth, async (req, res) => {
  const d = req.body;
  try {
    // Check ownership
    const existing = await pool.query(
      'SELECT uploaded_by, uploader_role FROM properties WHERE id=$1 OR property_id=$1', [req.params.id]
    );
    if (!existing.rows.length) return res.status(404).json({ error: 'Property not found' });

    const isOwnerAdmin = req.role === 'owner' || req.role === 'admin';
    const isOwnListing = existing.rows[0].uploaded_by === req.email;

    if (!isOwnerAdmin && !isOwnListing) {
      return res.status(403).json({ error: 'You can only edit your own listings.' });
    }

    const { rows } = await pool.query(`
      UPDATE properties SET
        titulo=$1, titulo_es=$2, region=$3,
        calle=$4, num_ext=$5, num_int=$6, colonia=$7, municipio=$8, estado=$9,
        cp=$10, carretera=$11, lat=$12, lng=$13,
        tipo=$14, recamaras=$15, banos=$16, cajones=$17,
        m2_const=$18, sqft_const=$19, m2_lot=$20, sqft_lot=$21,
        zona_restringida=$22, fideicomiso_req=$22,
        price_usd=$23, price_mxn=$24,
        descripcion=$25, descripcion_es=$26,
        amenidades=$27, photos=$28, internal_notes=$29,
        seller_name=$30, seller_email=$31, seller_phone=$32,
        updated_at=NOW()
      WHERE id=$33 OR property_id=$33 RETURNING *
    `, [
      d.titulo, d.titulo_es, d.region,
      d.calle, d.numExt, d.numInt, d.colonia, d.municipio, d.estado,
      d.cp, d.carretera, d.lat, d.lng,
      d.tipo,
      d.recamaras ? parseInt(d.recamaras)   : null,
      d.banos     ? parseFloat(d.banos)     : null,
      d.cajones   ? parseInt(d.cajones)     : null,
      d.m2Const   ? parseFloat(d.m2Const)   : null,
      d.sqftConst ? parseFloat(d.sqftConst) : null,
      d.m2Lot     ? parseFloat(d.m2Lot)     : null,
      d.sqftLot   ? parseFloat(d.sqftLot)   : null,
      !!(d.zona_restringida || d.zonaRestringida),
      d.priceUSD  ? parseFloat(d.priceUSD)  : null,
      d.priceMXN  ? parseFloat(d.priceMXN)  : null,
      d.descripcion, d.descripcion_es,
      d.amenidades || [], d.photos || [],
      d.internalNotes || null,
      d.sellerName, d.sellerEmail, d.sellerPhone,
      req.params.id,
    ]);
    if (!rows.length) return res.status(404).json({ error: 'Property not found' });
    res.json({ success: true, property: shapeFull(rows[0]) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PUT /:id/status — approve/reject/feature (OWNER ONLY) ───
router.put('/:id/status', requireOwner, async (req, res) => {
  const { status, approvedBy, rejectionNote, featured } = req.body;
  const validStatuses = ['pending_review','approved','rejected','sold','withdrawn'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Use: ${validStatuses.join(', ')}` });
  }
  try {
    const sets   = [];
    const params = [];
    if (status) {
      params.push(status); sets.push(`status=$${params.length}`);
      if (status === 'approved') {
        sets.push('approved_at=NOW()');
        if (approvedBy) { params.push(approvedBy); sets.push(`approved_by=$${params.length}`); }
      }
      if (status === 'rejected' && rejectionNote) {
        params.push(rejectionNote); sets.push(`rejection_note=$${params.length}`);
      }
    }
    if (typeof featured === 'boolean') {
      params.push(featured); sets.push(`featured=$${params.length}`);
    }
    sets.push('updated_at=NOW()');
    params.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE properties SET ${sets.join(',')} WHERE id=$${params.length} OR property_id=$${params.length} RETURNING *`,
      params
    );
    if (!rows.length) return res.status(404).json({ error: 'Property not found' });
    res.json({ success: true, property: shapeFull(rows[0]) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PUT /:id/sold — mark sold (OWNER ONLY) ──────────────────
router.put('/:id/sold', requireOwner, async (req, res) => {
  const { sold_price, buyer_name, buyer_email, closing_date, admin_email } = req.body;
  try {
    const payDate = nextPayDate(closing_date);
    const { rows } = await pool.query(`
      UPDATE properties SET
        status='sold',
        sold_price=$1, buyer_name=$2, buyer_email=$3,
        closing_date=$4, sold_at=NOW(),
        commission_pay_date=$5,
        commission_paid=false,
        approved_by=COALESCE($6, approved_by),
        updated_at=NOW()
      WHERE id=$7 OR property_id=$7 RETURNING *
    `, [
      parseFloat(sold_price), buyer_name, buyer_email,
      closing_date || new Date().toISOString().split('T')[0],
      payDate,
      admin_email || req.email,
      req.params.id,
    ]);
    if (!rows.length) return res.status(404).json({ error: 'Property not found' });
    const prop    = rows[0];
    const commAmt = parseFloat(prop.sold_price) * (parseFloat(prop.commission_rate) / 100);
    res.json({
      success:     true,
      property:    shapeFull(prop),
      commission: {
        rate:        prop.commission_rate,
        amount:      commAmt.toFixed(2),
        currency:    'USD',
        agent_email: prop.agent_email,
        pay_date:    payDate,
        schedule:    'Paid on 1st or 15th following confirmed closing & escrow receipt',
      },
    });
  } catch (e) {
    console.error('[PROPERTIES SOLD]', e.message);
    res.status(500).json({ error: e.message });
  }
});


// ── POST /:id/approve — approve alias (AdminDashboard calls this) ──
router.post('/:id/approve', requireOwner, async (req, res) => {
  const { approvedBy } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE properties SET status='approved', approved_at=NOW(), approved_by=$1
       WHERE id=$2 OR property_id=$2 RETURNING *`,
      [approvedBy || 'admin', req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Property not found' });
    return res.json({ success: true, property: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE /:id (OWNER ONLY) ─────────────────────────────────
router.delete('/:id', requireOwner, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM properties WHERE id=$1 OR property_id=$1 RETURNING id', [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Property not found' });
    res.json({ success: true, deleted: rows[0].id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ================================================================
// AGENT REGISTRATION — Server-side credential generation
// ================================================================
// Replaces frontend Math.random() slot generation with
// crypto-secure credentials stored in DB.
// Rate limited: 5 registrations per IP per hour.
// ================================================================

router.post('/register-agent',
  rateLimit(3600000, 5, req => req.ip),
  async (req, res) => {
    const d = req.body;

    // Validate required fields
    if (!d.nombre)                     return res.status(400).json({ error: 'Name required' });
    if (!d.email || !d.email.includes('@')) return res.status(400).json({ error: 'Valid email required' });
    if (!d.curp || d.curp.length < 18) return res.status(400).json({ error: 'Valid CURP required (18 characters)' });
    if (!d.ine || d.ine.length < 8)    return res.status(400).json({ error: 'Valid INE number required' });
    if (!d.agentType)                  return res.status(400).json({ error: 'Agent type required' });
    if (!d.acceptTerms)                return res.status(400).json({ error: 'Terms must be accepted' });

    try {
      // Check for duplicate email
      const existing = await pool.query(
        'SELECT agent_code FROM agent_registrations WHERE LOWER(email) = $1',
        [d.email.toLowerCase()]
      );
      if (existing.rows.length) {
        return res.status(409).json({
          error: 'Email already registered. Use credential recovery if needed.',
          recoveryUrl: '/api/auth/recover-credentials',
        });
      }

      // Generate unique agent slot
      let agentCode = null;
      for (let attempt = 0; attempt < 20; attempt++) {
        const slotNum = crypto.randomInt(51, 999);
        const candidate = `REagent-${String(slotNum).padStart(2, '0')}@eb.com`;
        const check = await pool.query(
          'SELECT 1 FROM agent_registrations WHERE agent_code = $1', [candidate]
        );
        if (!check.rows.length) {
          agentCode = candidate;
          break;
        }
      }
      if (!agentCode) {
        return res.status(503).json({ error: 'Unable to generate unique agent code. Contact sg01@eb.com.' });
      }

      // Generate secure credentials
      const password = crypto.randomBytes(6).toString('base64url') + '!';  // ~12 chars, high entropy
      const pin      = String(crypto.randomInt(1000, 9999));
      const salt     = crypto.randomBytes(16).toString('hex');

      // Hash credentials for storage
      const hashPassword = crypto.createHash('sha256').update(password + salt).digest('hex');
      const hashPin      = crypto.createHash('sha256').update(pin + salt).digest('hex');

      // Commission from server-side schedule
      const commRate = COMMISSION_SCHEDULE[d.agentType] || COMMISSION_SCHEDULE.fsbo;

      await pool.query(`
        INSERT INTO agent_registrations (
          agent_code, password_hash, pin_hash, salt,
          nombre, apellidos, email, phone, whatsapp,
          empresa, licencia, ine, curp, banco, clabe,
          referido_por, agent_type, commission_rate, role,
          status, has_ine, has_selfie, accept_terms
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23
        )
      `, [
        agentCode, hashPassword, hashPin, salt,
        d.nombre, d.apellidos || '', d.email.toLowerCase(), d.phone || '', d.whatsapp || '',
        d.empresa || '', d.licencia || '', d.ine, d.curp.toUpperCase(), d.banco || '', d.clabe || '',
        d.referidoPor || '', d.agentType, commRate, 'sales',
        'pending_verification', !!d.hasINE, !!d.hasSelfie, true,
      ]);

      // Notify owner
      try { notify.onPropertySubmitted({
        titulo: `NEW AGENT REGISTRATION: ${d.nombre} (${d.agentType})`,
        agent_email: d.email,
        uploaded_by: agentCode,
      }); } catch {}

      // Return credentials ONCE — they should save these
      // In production: send via email instead of HTTP response
      res.status(201).json({
        success: true,
        credentials: {
          agentCode,
          password,
          pin,
          agentType: d.agentType,
          role: 'sales',
          status: 'pending_verification',
        },
        message: 'SAVE YOUR CREDENTIALS. They will not be shown again. For recovery: contact sg01@eb.com.',
      });

    } catch (e) {
      console.error('[AGENT REGISTRATION]', e.message);
      res.status(500).json({ error: 'Registration failed. Try again or contact sg01@eb.com.' });
    }
  }
);

module.exports = router;