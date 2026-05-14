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
    const profile = r.rows[0];
    // Notify admin
    ntfyPing('WE LINK New Registration', profile.blind_id + ' — ' + (f.display_name||'Unknown') + ' — ' + f.profile_type + ' — ' + (f.region||''));
    sendAdminEmail(
      'WE LINK — New ' + f.profile_type.replace('_',' ').toUpperCase() + ' Registered: ' + (f.display_name||profile.blind_id),
      '<h2>New WE LINK Registration</h2><p><b>ID:</b> ' + profile.blind_id + '</p><p><b>Type:</b> ' + f.profile_type + '</p><p><b>Name:</b> ' + (f.display_name||'—') + '</p><p><b>Region:</b> ' + (f.region||'—') + '</p><p><b>Hectares:</b> ' + (f.hectares||'—') + '</p><p><b>Contact:</b> ' + (f.contact_name||'—') + ' | ' + (f.contact_phone||'—') + ' | ' + (f.contact_email||'—') + '</p><p><a href="https://mexausafg.com">View in AuditDNA</a></p>',
      pool
    ).catch(()=>{});
    fireWeLinkEvent(pool, 'WE_LINK_PROFILE_CREATED', { blind_id: profile.blind_id, type: f.profile_type, region: f.region });
    res.json({ ok: true, profile, blind_id });
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
    const proposedMatch = r.rows[0];
    ntfyPing('WE LINK Partnership Proposed', 'Deal #' + proposedMatch.id + ' — Land ' + land_profile_id + ' + Grower ' + grower_profile_id, 'high');
    sendAdminEmail(
      'WE LINK — New Partnership Proposed: Deal #' + proposedMatch.id,
      '<h2>New WE LINK Partnership Proposal</h2><p><b>Deal #:</b> ' + proposedMatch.id + '</p><p><b>Type:</b> ' + (partnership_type||'co-op') + '</p><p><b>Split:</b> ' + (split_percent||50) + '%</p><p><b>Notes:</b> ' + (notes||'—') + '</p><p><a href="https://mexausafg.com">Manage in AuditDNA → WE LINK</a></p>',
      pool
    ).catch(()=>{});
    fireWeLinkEvent(pool, 'WE_LINK_PARTNERSHIP_PROPOSED', { match_id: proposedMatch.id, land_profile_id, grower_profile_id });
    res.json({ ok: true, match: proposedMatch });
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
    const advancedDeal = r.rows[0];
    ntfyPing('WE LINK Deal Advanced', 'Deal #' + req.params.match_id + ' → ' + next.replace('_',' ').toUpperCase(), next === 'active' ? 'high' : 'default');
    if (next === 'active' || next === 'disclosed') {
      sendAdminEmail(
        'WE LINK Deal #' + req.params.match_id + ' Advanced to ' + next.toUpperCase(),
        '<h2>WE LINK Deal Update</h2><p><b>Deal:</b> #' + req.params.match_id + '</p><p><b>New Stage:</b> ' + next.toUpperCase() + '</p>' + (bankDisclosed ? '<p><b>BANK PARTNER NOW DISCLOSED</b></p>' : '') + '<p><a href="https://mexausafg.com">View in AuditDNA</a></p>',
        pool
      ).catch(()=>{});
    }
    fireWeLinkEvent(pool, 'WE_LINK_DEAL_ADVANCED', { match_id: req.params.match_id, stage: next, bank_disclosed: bankDisclosed });
    res.json({ ok: true, match: advancedDeal, stage: next, bank_disclosed: bankDisclosed });
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


// ── CLICK TRACKING ───────────────────────────────────────────────────────────
router.post('/click', async (req, res) => {
  const pool = req.app.get('db') || global.db;
  const { source, ts, ua } = req.body || {};
  try {
    if (pool) {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS we_link_clicks (id SERIAL PRIMARY KEY, source VARCHAR(50), clicked_at TIMESTAMPTZ DEFAULT NOW(), user_agent TEXT)`,
      ).catch(()=>{});
      await pool.query(
        'INSERT INTO we_link_clicks (source, clicked_at, user_agent) VALUES ($1, $2, $3)',
        [source||'unknown', ts||new Date().toISOString(), ua||'']
      ).catch(()=>{});
    }
    res.json({ ok: true });
  } catch(e) { res.json({ ok: true }); }
});

// ── CLICK STATS ──────────────────────────────────────────────────────────────
router.get('/clicks', async (req, res) => {
  const pool = req.app.get('db') || global.db;
  if (!pool) return res.status(500).json({ error: 'No DB pool' });
  try {
    const r = await pool.query('SELECT source, clicked_at, user_agent FROM we_link_clicks ORDER BY clicked_at DESC LIMIT 100');
    const total = await pool.query('SELECT COUNT(*) FROM we_link_clicks');
    res.json({ ok: true, total: parseInt(total.rows[0].count), clicks: r.rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
});


// ── DISTANCE CALC (Haversine) ────────────────────────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = (lat2-lat1)*Math.PI/180;
  const dLng = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ── DISTANCE-AWARE MATCH ─────────────────────────────────────────────────────
router.post('/match/distance', async (req, res) => {
  const pool = req.app.get('db') || global.db;
  if (!pool) return res.status(500).json({ error: 'No DB pool' });
  const { profile_id, max_miles = 50 } = req.body;
  try {
    const src = await pool.query('SELECT * FROM we_link_profiles WHERE id = $1', [profile_id]);
    if (!src.rows.length) return res.status(404).json({ error: 'Profile not found' });
    const p = src.rows[0];
    const matchType = p.profile_type === 'land_owner' ? 'grower' : p.profile_type === 'grower' ? 'land_owner' : 'grower';
    const candidates = await pool.query(
      "SELECT * FROM we_link_profiles WHERE profile_type = $1 AND status = 'active' AND id != $2 AND lat IS NOT NULL AND lng IS NOT NULL",
      [matchType, profile_id]
    );
    const scored = candidates.rows
      .map(c => {
        const miles = (p.lat && p.lng && c.lat && c.lng)
          ? haversine(parseFloat(p.lat), parseFloat(p.lng), parseFloat(c.lat), parseFloat(c.lng))
          : 9999;
        let score = 50;
        if (miles <= 25)  score += 30;
        else if (miles <= 50)  score += 20;
        else if (miles <= 100) score += 10;
        else if (miles > max_miles) score -= 30;
        if (p.state && c.state && p.state.toLowerCase() === c.state.toLowerCase()) score += 15;
        const overlap = (p.commodities||[]).filter(x => (c.commodities||[]).includes(x)).length;
        score += overlap * 5;
        return { ...c, match_score: Math.min(Math.max(score,0),100), distance_miles: Math.round(miles), contact_name:undefined, contact_phone:undefined, contact_email:undefined };
      })
      .filter(c => c.distance_miles <= max_miles || max_miles >= 9999)
      .sort((a,b) => b.match_score - a.match_score)
      .slice(0, 10);
    res.json({ ok:true, source_id: profile_id, max_miles, matches: scored });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── WE LINK → LOAF AUTO-CONNECT ─────────────────────────────────────────────
// When deal goes Active, auto-register grower in LOAF grower network
router.post('/activate/:match_id', async (req, res) => {
  const pool = req.app.get('db') || global.db;
  if (!pool) return res.status(500).json({ error: 'No DB pool' });
  try {
    const match = await pool.query('SELECT * FROM we_link_matches WHERE id = $1', [req.params.match_id]);
    if (!match.rows.length) return res.status(404).json({ error: 'Not found' });
    const deal = match.rows[0];
    const grower = await pool.query('SELECT * FROM we_link_profiles WHERE id = $1', [deal.grower_profile_id]);
    const land   = await pool.query('SELECT * FROM we_link_profiles WHERE id = $1', [deal.land_profile_id]);
    if (!grower.rows.length) return res.status(404).json({ error: 'Grower not found' });
    const g = grower.rows[0];
    const l = land.rows[0] || {};
    // Update deal to active
    await pool.query("UPDATE we_link_matches SET status='active', disclosed_at=NOW(), bank_disclosed=true WHERE id=$1", [req.params.match_id]);
    // Fire Brain event
    try {
      await pool.query(
        "INSERT INTO brain_events (event_type, payload, created_at) VALUES ($1,$2,NOW())",
        ['WE_LINK_ACTIVATED', JSON.stringify({ match_id: deal.id, grower_blind_id: g.blind_id, land_blind_id: l.blind_id, hectares: l.hectares, commodities: g.commodities })]
      ).catch(()=>{});
    } catch(e){}
    res.json({ ok:true, activated:true, match_id: deal.id, grower_blind_id: g.blind_id, message:'Deal activated. Grower connected to LOAF pipeline.' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── CORPORATE LEASE TRACK ───────────────────────────────────────────────────
router.post('/corporate-lease', async (req, res) => {
  const pool = req.app.get('db') || global.db;
  if (!pool) return res.status(500).json({ error: 'No DB pool' });
  const crypto = require('crypto');
  try {
    const f = req.body;
    const blind_id = 'WL-CORP-' + crypto.randomInt(1000,9999);
    const r = await pool.query(
      `INSERT INTO we_link_profiles (profile_type,blind_id,display_name,region,state,municipality,lat,lng,hectares,commodities,seeking,description,contact_name,contact_phone,contact_email,infrastructure)
       VALUES ('land_owner',$1,$2,$3,$4,$5,$6,$7,$8,$9,'corporate_lessee',$10,$11,$12,$13,$14) RETURNING *`,
      [blind_id, f.company_name||f.display_name, f.region, f.state, f.municipality, f.lat, f.lng,
       f.hectares, f.commodities||[], f.description, f.contact_name, f.contact_phone, f.contact_email,
       JSON.stringify({ cpi_escalator:true, annual_rent_per_ha: f.annual_rent_per_ha, lease_term_years: f.lease_term_years||3 })]
    );
    res.json({ ok:true, profile: r.rows[0], blind_id, type:'corporate_lease' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── STATS DASHBOARD ─────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  const pool = req.app.get('db') || global.db;
  if (!pool) return res.status(500).json({ error: 'No DB pool' });
  try {
    const [profiles, matches, clicks, suppliers] = await Promise.all([
      pool.query("SELECT profile_type, COUNT(*) as count FROM we_link_profiles WHERE status='active' GROUP BY profile_type"),
      pool.query("SELECT status, COUNT(*) as count FROM we_link_matches GROUP BY status"),
      pool.query("SELECT COUNT(*) as total FROM we_link_clicks").catch(()=>({rows:[{total:0}]})),
      pool.query("SELECT COUNT(*) as total FROM we_link_suppliers").catch(()=>({rows:[{total:0}]})),
    ]);
    res.json({
      ok: true,
      profiles: profiles.rows,
      deals: matches.rows,
      clicks: parseInt(clicks.rows[0]?.total||0),
      suppliers: parseInt(suppliers.rows[0]?.total||0),
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── NOTIFICATION HELPERS ─────────────────────────────────────────────────────
async function ntfyPing(title, message, priority = 'default') {
  const topic = process.env.NTFY_TOPIC || 'auditdna-agro-saul2026';
  try {
    const https = require('https');
    const body = JSON.stringify({ topic, title, message, priority });
    const opts = { hostname:'ntfy.sh', port:443, path:'/'+topic, method:'POST',
      headers:{'Content-Type':'application/json','Title':title,'Priority':priority} };
    const req = https.request(opts);
    req.write(message);
    req.end();
  } catch(e) {}
}

async function sendAdminEmail(subject, html, pool) {
  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com', port: 587, secure: false,
      auth: { user: process.env.SMTP_USER || process.env.GMAIL_USER || 'sgarcia1911@gmail.com',
              pass: process.env.SMTP_PASS || process.env.GMAIL_PASS }
    });
    await transporter.sendMail({
      from: '"WE LINK | Mexausa Food Group" <sgarcia1911@gmail.com>',
      to: 'sgarcia1911@gmail.com',
      subject, html
    });
  } catch(e) { console.error('[WE-LINK notify]', e.message); }
}

async function fireWeLinkEvent(pool, eventType, payload) {
  try {
    await pool.query(
      "INSERT INTO brain_events (event_type, payload, created_at) VALUES ($1,$2,NOW())",
      [eventType, JSON.stringify(payload)]
    ).catch(()=>{});
  } catch(e) {}
}
module.exports = router;
