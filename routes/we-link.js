// we-link.js — WE LINK: Land Owner + Grower + Capital + Supplier Matchmaking
// Mexausa Food Group Inc — AuditDNA Agriculture Platform
// Save to: C:\AuditDNA\backend\routes\we-link.js
const express = require('express');
const router  = express.Router();

// ── SETUP TABLE ──────────────────────────────────────────────────────────────
router.post('/setup-tables', async (req, res) => {
  const pool = req.app.get('db') || global.db;
  if (!pool) return res.status(500).json({ error: 'No DB pool' });
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS we_link_profiles (
        id              SERIAL PRIMARY KEY,
        profile_type    VARCHAR(20) NOT NULL CHECK (profile_type IN ('land_owner','grower','supplier','buyer')),
        blind_id        VARCHAR(30) UNIQUE,
        display_name    VARCHAR(255),
        region          VARCHAR(100),
        state           VARCHAR(100),
        municipality    VARCHAR(100),
        lat             DECIMAL(10,7),
        lng             DECIMAL(10,7),
        hectares        DECIMAL(10,2),
        commodities     TEXT[],
        infrastructure  JSONB DEFAULT '{}',
        water_source    VARCHAR(100),
        certifications  TEXT[],
        equipment       TEXT[],
        labor_capacity  INTEGER,
        seeking         VARCHAR(50),
        description     TEXT,
        contact_name    VARCHAR(255),
        contact_phone   VARCHAR(50),
        contact_email   VARCHAR(255),
        status          VARCHAR(20) DEFAULT 'active',
        verified        BOOLEAN DEFAULT false,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS we_link_matches (
        id              SERIAL PRIMARY KEY,
        land_profile_id INTEGER REFERENCES we_link_profiles(id),
        grower_profile_id INTEGER REFERENCES we_link_profiles(id),
        match_score     DECIMAL(5,2),
        status          VARCHAR(30) DEFAULT 'proposed',
        proposed_at     TIMESTAMPTZ DEFAULT NOW(),
        loi_sent_at     TIMESTAMPTZ,
        nda_signed_at   TIMESTAMPTZ,
        term_sheet_at   TIMESTAMPTZ,
        disclosed_at    TIMESTAMPTZ,
        partnership_type VARCHAR(50),
        split_percent   DECIMAL(5,2),
        bank_id         VARCHAR(30),
        bank_disclosed  BOOLEAN DEFAULT false,
        commission_rate DECIMAL(5,2) DEFAULT 3.0,
        notes           TEXT
      );
      CREATE TABLE IF NOT EXISTS we_link_suppliers (
        id              SERIAL PRIMARY KEY,
        company_name    VARCHAR(255),
        category        VARCHAR(100),
        region          VARCHAR(100),
        discount_pct    DECIMAL(5,2),
        products        TEXT[],
        contact_name    VARCHAR(255),
        contact_phone   VARCHAR(50),
        contact_email   VARCHAR(255),
        website         VARCHAR(255),
        description     TEXT,
        status          VARCHAR(20) DEFAULT 'active',
        created_at      TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    res.json({ ok: true, message: 'WE LINK tables created' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── GET ALL PROFILES ─────────────────────────────────────────────────────────
router.get('/profiles', async (req, res) => {
  const pool = req.app.get('db') || global.db;
  if (!pool) return res.status(500).json({ error: 'No DB pool' });
  const { type, region, seeking } = req.query;
  try {
    let q = "SELECT * FROM we_link_profiles WHERE status = 'active'";
    const params = [];
    if (type)    { params.push(type);          q += ' AND profile_type = $' + params.length; }
    if (region)  { params.push('%'+region+'%');q += ' AND region ILIKE $' + params.length; }
    if (seeking) { params.push(seeking);       q += ' AND seeking = $' + params.length; }
    q += ' ORDER BY created_at DESC LIMIT 100';
    const r = await pool.query(q, params);
    res.json({ ok: true, count: r.rows.length, profiles: r.rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── POST PROFILE ─────────────────────────────────────────────────────────────
router.post('/profiles', async (req, res) => {
  const pool = req.app.get('db') || global.db;
  if (!pool) return res.status(500).json({ error: 'No DB pool' });
  const crypto = require('crypto');
  try {
    const f = req.body;
    const typeCode = f.profile_type === 'land_owner' ? 'LO' : f.profile_type === 'grower' ? 'GR' : f.profile_type === 'supplier' ? 'SP' : 'BY';
    const blind_id = 'WL-' + typeCode + '-' + crypto.randomInt(1000,9999);
    const r = await pool.query(
      `INSERT INTO we_link_profiles
       (profile_type,blind_id,display_name,region,state,municipality,lat,lng,hectares,
        commodities,infrastructure,water_source,certifications,equipment,labor_capacity,
        seeking,description,contact_name,contact_phone,contact_email)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING *`,
      [f.profile_type,blind_id,f.display_name,f.region,f.state,f.municipality,f.lat,f.lng,
       f.hectares,f.commodities||[],f.infrastructure||{},f.water_source,f.certifications||[],
       f.equipment||[],f.labor_capacity,f.seeking,f.description,f.contact_name,f.contact_phone,f.contact_email]
    );
    res.json({ ok: true, profile: r.rows[0], blind_id });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── AI MATCH ─────────────────────────────────────────────────────────────────
router.post('/match', async (req, res) => {
  const pool = req.app.get('db') || global.db;
  if (!pool) return res.status(500).json({ error: 'No DB pool' });
  const { profile_id, profile_type } = req.body;
  try {
    const src = await pool.query('SELECT * FROM we_link_profiles WHERE id = $1', [profile_id]);
    if (!src.rows.length) return res.status(404).json({ error: 'Profile not found' });
    const p = src.rows[0];
    const matchType = p.profile_type === 'land_owner' ? 'grower' : 'land_owner';
    const candidates = await pool.query(
      "SELECT * FROM we_link_profiles WHERE profile_type = $1 AND status = 'active' AND id != $2 ORDER BY created_at DESC LIMIT 20",
      [matchType, profile_id]
    );
    const scored = candidates.rows.map(c => {
      let score = 50;
      if (p.region && c.region && p.region.toLowerCase() === c.region.toLowerCase()) score += 20;
      if (p.state  && c.state  && p.state.toLowerCase()  === c.state.toLowerCase())  score += 10;
      if (p.hectares && c.hectares) {
        const diff = Math.abs(p.hectares - c.hectares) / Math.max(p.hectares, c.hectares);
        score += Math.round((1 - diff) * 15);
      }
      if (p.commodities && c.commodities) {
        const overlap = (p.commodities || []).filter(x => (c.commodities || []).includes(x)).length;
        score += overlap * 5;
      }
      return { ...c, match_score: Math.min(score, 100), contact_name: undefined, contact_phone: undefined, contact_email: undefined };
    }).sort((a,b) => b.match_score - a.match_score).slice(0,10);
    res.json({ ok: true, source: { ...p, contact_name: undefined, contact_phone: undefined, contact_email: undefined }, matches: scored });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── PROPOSE PARTNERSHIP ──────────────────────────────────────────────────────
router.post('/propose', async (req, res) => {
  const pool = req.app.get('db') || global.db;
  if (!pool) return res.status(500).json({ error: 'No DB pool' });
  const { land_profile_id, grower_profile_id, partnership_type, split_percent, notes } = req.body;
  try {
    const r = await pool.query(
      `INSERT INTO we_link_matches (land_profile_id,grower_profile_id,partnership_type,split_percent,notes,status)
       VALUES ($1,$2,$3,$4,$5,'proposed') RETURNING *`,
      [land_profile_id, grower_profile_id, partnership_type||'co-op', split_percent||50, notes]
    );
    res.json({ ok: true, match: r.rows[0] });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── ADVANCE DEAL STAGE ───────────────────────────────────────────────────────
router.post('/advance/:id', async (req, res) => {
  const pool = req.app.get('db') || global.db;
  if (!pool) return res.status(500).json({ error: 'No DB pool' });
  const stages = { proposed:'loi_sent', loi_sent:'nda_signed', nda_signed:'term_sheet', term_sheet:'disclosed', disclosed:'active' };
  try {
    const cur = await pool.query('SELECT * FROM we_link_matches WHERE id = $1', [req.params.id]);
    if (!cur.rows.length) return res.status(404).json({ error: 'Match not found' });
    const next = stages[cur.rows[0].status];
    if (!next) return res.status(400).json({ error: 'Already at final stage' });
    const col = next === 'loi_sent' ? 'loi_sent_at' : next === 'nda_signed' ? 'nda_signed_at' : next === 'term_sheet' ? 'term_sheet_at' : next === 'disclosed' ? 'disclosed_at' : null;
    const bankDisclosed = next === 'disclosed';
    let q = `UPDATE we_link_matches SET status = $1, bank_disclosed = $2`;
    const params = [next, bankDisclosed];
    if (col) { q += `, ${col} = NOW()`; }
    q += ' WHERE id = $3 RETURNING *';
    params.push(req.params.id);
    const r = await pool.query(q, params);
    res.json({ ok: true, match: r.rows[0], stage: next, bank_disclosed: bankDisclosed });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── SUPPLIERS ────────────────────────────────────────────────────────────────
router.get('/suppliers', async (req, res) => {
  const pool = req.app.get('db') || global.db;
  if (!pool) return res.status(500).json({ error: 'No DB pool' });
  try {
    const r = await pool.query("SELECT * FROM we_link_suppliers WHERE status = 'active' ORDER BY discount_pct DESC");
    res.json({ ok: true, suppliers: r.rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/suppliers', async (req, res) => {
  const pool = req.app.get('db') || global.db;
  if (!pool) return res.status(500).json({ error: 'No DB pool' });
  try {
    const f = req.body;
    const r = await pool.query(
      `INSERT INTO we_link_suppliers (company_name,category,region,discount_pct,products,contact_name,contact_phone,contact_email,website,description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [f.company_name,f.category,f.region,f.discount_pct||0,f.products||[],f.contact_name,f.contact_phone,f.contact_email,f.website,f.description]
    );
    res.json({ ok: true, supplier: r.rows[0] });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── MATCHES LIST ─────────────────────────────────────────────────────────────
router.get('/matches', async (req, res) => {
  const pool = req.app.get('db') || global.db;
  if (!pool) return res.status(500).json({ error: 'No DB pool' });
  try {
    const r = await pool.query(`
      SELECT m.*, lp.blind_id as land_blind_id, lp.region as land_region, lp.hectares,
             gp.blind_id as grower_blind_id, gp.region as grower_region, gp.commodities
      FROM we_link_matches m
      LEFT JOIN we_link_profiles lp ON lp.id = m.land_profile_id
      LEFT JOIN we_link_profiles gp ON gp.id = m.grower_profile_id
      ORDER BY m.proposed_at DESC LIMIT 50
    `);
    res.json({ ok: true, matches: r.rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
