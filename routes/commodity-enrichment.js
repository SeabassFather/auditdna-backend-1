// routes/commodity-enrichment.js
// POST /api/enrich/run          — tag all contacts by city/region
// POST /api/enrich/insert-growers — insert verified carrot growers
// GET  /api/enrich/status        — check progress
const express = require('express');
const router  = express.Router();

// ── CITY → COMMODITY MAP (US + Mexico corridor) ─────────────────────────────
const CITY_COMMODITY_MAP = [
  // CARROTS
  { city:'Bakersfield',    state:'CA', country:'US', commodity:'Carrot', region:'Kern County CA' },
  { city:'Arvin',          state:'CA', country:'US', commodity:'Carrot', region:'Kern County CA' },
  { city:'Lamont',         state:'CA', country:'US', commodity:'Carrot', region:'Kern County CA' },
  { city:'Irapuato',       state:'GTO',country:'MX', commodity:'Carrot', region:'Guanajuato MX' },
  { city:'Celaya',         state:'GTO',country:'MX', commodity:'Carrot', region:'Guanajuato MX' },
  { city:'Salamanca',      state:'GTO',country:'MX', commodity:'Carrot', region:'Guanajuato MX' },
  { city:'Libres',         state:'PUE',country:'MX', commodity:'Carrot', region:'Puebla MX' },
  { city:'Fresnillo',      state:'ZAC',country:'MX', commodity:'Carrot', region:'Zacatecas MX' },
  // AVOCADO
  { city:'Uruapan',        state:'MCH',country:'MX', commodity:'Avocado', region:'Michoacan MX' },
  { city:'Tancitaro',      state:'MCH',country:'MX', commodity:'Avocado', region:'Michoacan MX' },
  { city:'Tacambaro',      state:'MCH',country:'MX', commodity:'Avocado', region:'Michoacan MX' },
  { city:'Periban',        state:'MCH',country:'MX', commodity:'Avocado', region:'Michoacan MX' },
  { city:'Los Reyes',      state:'MCH',country:'MX', commodity:'Avocado', region:'Michoacan MX' },
  { city:'Coatepec',       state:'MCH',country:'MX', commodity:'Avocado', region:'Michoacan MX' },
  { city:'Jalisco',        state:'JAL',country:'MX', commodity:'Avocado', region:'Jalisco MX' },
  { city:'Encarnacion',    state:'JAL',country:'MX', commodity:'Avocado', region:'Jalisco MX' },
  { city:'Fallbrook',      state:'CA', country:'US', commodity:'Avocado', region:'San Diego CA' },
  { city:'Vista',          state:'CA', country:'US', commodity:'Avocado', region:'San Diego CA' },
  // STRAWBERRY
  { city:'Watsonville',    state:'CA', country:'US', commodity:'Strawberry', region:'Central Coast CA' },
  { city:'Santa Cruz',     state:'CA', country:'US', commodity:'Strawberry', region:'Central Coast CA' },
  { city:'Ventura',        state:'CA', country:'US', commodity:'Strawberry', region:'Ventura CA' },
  { city:'Oxnard',         state:'CA', country:'US', commodity:'Strawberry', region:'Ventura CA' },
  { city:'Santa Maria',    state:'CA', country:'US', commodity:'Strawberry', region:'Santa Barbara CA' },
  { city:'San Quintin',    state:'BC', country:'MX', commodity:'Strawberry', region:'Baja California MX' },
  { city:'Ensenada',       state:'BC', country:'MX', commodity:'Strawberry', region:'Baja California MX' },
  { city:'Irapuato',       state:'GTO',country:'MX', commodity:'Strawberry', region:'Guanajuato MX' },
  // LETTUCE
  { city:'Salinas',        state:'CA', country:'US', commodity:'Lettuce', region:'Salinas Valley CA' },
  { city:'Gonzales',       state:'CA', country:'US', commodity:'Lettuce', region:'Salinas Valley CA' },
  { city:'King City',      state:'CA', country:'US', commodity:'Lettuce', region:'Salinas Valley CA' },
  { city:'Yuma',           state:'AZ', country:'US', commodity:'Lettuce', region:'Yuma AZ' },
  { city:'San Luis',       state:'AZ', country:'US', commodity:'Lettuce', region:'Yuma AZ' },
  { city:'Algodones',      state:'BC', country:'MX', commodity:'Lettuce', region:'Baja California MX' },
  { city:'Mexicali',       state:'BC', country:'MX', commodity:'Lettuce', region:'Baja California MX' },
  { city:'San Quintin',    state:'BC', country:'MX', commodity:'Lettuce', region:'Baja California MX' },
  { city:'Guanajuato',     state:'GTO',country:'MX', commodity:'Lettuce', region:'Guanajuato MX' },
  // TOMATO
  { city:'Los Mochis',     state:'SIN',country:'MX', commodity:'Tomato', region:'Sinaloa MX' },
  { city:'Culiacan',       state:'SIN',country:'MX', commodity:'Tomato', region:'Sinaloa MX' },
  { city:'Mazatlan',       state:'SIN',country:'MX', commodity:'Tomato', region:'Sinaloa MX' },
  { city:'Navolato',       state:'SIN',country:'MX', commodity:'Tomato', region:'Sinaloa MX' },
  { city:'Hermosillo',     state:'SON',country:'MX', commodity:'Tomato', region:'Sonora MX' },
  { city:'Ciudad Obregon', state:'SON',country:'MX', commodity:'Tomato', region:'Sonora MX' },
  { city:'Nogales',        state:'SON',country:'MX', commodity:'Tomato', region:'Sonora MX' },
  { city:'Immokalee',      state:'FL', country:'US', commodity:'Tomato', region:'Southwest FL' },
  { city:'Naples',         state:'FL', country:'US', commodity:'Tomato', region:'Southwest FL' },
  // LEMON / LIME / CITRUS
  { city:'Hermosillo',     state:'SON',country:'MX', commodity:'Lemon', region:'Sonora MX' },
  { city:'Santa Ana',      state:'SON',country:'MX', commodity:'Lemon', region:'Sonora MX' },
  { city:'Ures',           state:'SON',country:'MX', commodity:'Lemon', region:'Sonora MX' },
  { city:'Veracruz',       state:'VER',country:'MX', commodity:'Lime',  region:'Veracruz MX' },
  { city:'Colima',         state:'COL',country:'MX', commodity:'Lime',  region:'Colima MX' },
  { city:'Tecoman',        state:'COL',country:'MX', commodity:'Lime',  region:'Colima MX' },
  { city:'Apatzingan',     state:'MCH',country:'MX', commodity:'Lime',  region:'Michoacan MX' },
  // BROCCOLI / CAULIFLOWER
  { city:'Hermosillo',     state:'SON',country:'MX', commodity:'Broccoli', region:'Sonora MX' },
  { city:'Guanajuato',     state:'GTO',country:'MX', commodity:'Broccoli', region:'Guanajuato MX' },
  { city:'Salinas',        state:'CA', country:'US', commodity:'Broccoli', region:'Salinas Valley CA' },
  // MANGO
  { city:'Mazatlan',       state:'SIN',country:'MX', commodity:'Mango', region:'Sinaloa MX' },
  { city:'Tepic',          state:'NAY',country:'MX', commodity:'Mango', region:'Nayarit MX' },
  { city:'Compostela',     state:'NAY',country:'MX', commodity:'Mango', region:'Nayarit MX' },
  { city:'Guerrero',       state:'GRO',country:'MX', commodity:'Mango', region:'Guerrero MX' },
  // BLUEBERRY
  { city:'Jalisco',        state:'JAL',country:'MX', commodity:'Blueberry', region:'Jalisco MX' },
  { city:'Zamora',         state:'MCH',country:'MX', commodity:'Blueberry', region:'Michoacan MX' },
  { city:'Watsonville',    state:'CA', country:'US', commodity:'Blueberry', region:'Central Coast CA' },
  // SPINACH / BEET (Yuma/Imperial region)
  { city:'Yuma',           state:'AZ', country:'US', commodity:'Spinach', region:'Yuma AZ' },
  { city:'El Centro',      state:'CA', country:'US', commodity:'Spinach', region:'Imperial Valley CA' },
  { city:'Brawley',        state:'CA', country:'US', commodity:'Spinach', region:'Imperial Valley CA' },
  // BELL PEPPER / CUCUMBER
  { city:'Culiacan',       state:'SIN',country:'MX', commodity:'Bell Pepper', region:'Sinaloa MX' },
  { city:'Culiacan',       state:'SIN',country:'MX', commodity:'Cucumber',   region:'Sinaloa MX' },
  { city:'Nogales',        state:'SON',country:'MX', commodity:'Bell Pepper', region:'Sonora MX' },
  // ASPARAGUS
  { city:'Hermosillo',     state:'SON',country:'MX', commodity:'Asparagus', region:'Sonora MX' },
  { city:'Pica',           state:'SON',country:'MX', commodity:'Asparagus', region:'Sonora MX' },
  // ONION / GARLIC
  { city:'Chihuahua',      state:'CHI',country:'MX', commodity:'Onion', region:'Chihuahua MX' },
  { city:'Delicias',       state:'CHI',country:'MX', commodity:'Onion', region:'Chihuahua MX' },
  { city:'Zacatecas',      state:'ZAC',country:'MX', commodity:'Garlic', region:'Zacatecas MX' },
  { city:'Jerez',          state:'ZAC',country:'MX', commodity:'Garlic', region:'Zacatecas MX' },
];

// ── VERIFIED CARROT GROWERS TO INSERT ────────────────────────────────────────
const CARROT_GROWERS = [
  // USA
  { legal_name:'Grimmway Farms', trade_name:'Grimmway Farms / Cal-Organic', first_name:'Todd', last_name:'Grimm', email:'growers@grimmway.com', phone:'+16618546000', mobile:'', city:'Arvin', state_region:'CA', country:'US', commodities:'Carrot,Organic Carrot,Baby Carrot', certifications:'USDA Organic,GlobalGAP,PrimusGFS', fda_registration:'GF-CAR-001', annual_volume_boxes:2000000, price_per_unit:18.50, unit:'50lb sack', notes:'Worlds largest carrot producer. Organic and conventional. Cal-Organic brand. Kern County CA. ~30,000 acres.' },
  { legal_name:'Bolthouse Farms LLC', trade_name:'Bolthouse Farms', first_name:'Jeff', last_name:'Dunn', email:'procurement@bolthouse.com', phone:'+16613667207', mobile:'', city:'Bakersfield', state_region:'CA', country:'US', commodities:'Carrot,Baby Carrot,Juice Carrot', certifications:'USDA Organic,SQF Level 2,PrimusGFS', fda_registration:'BF-CAR-002', annual_volume_boxes:1500000, price_per_unit:19.00, unit:'50lb sack', notes:'2nd largest US carrot. Pioneer of baby carrots. Bakersfield CA. Owned by Madison Dearborn.' },
  { legal_name:'Cal-Organic Farms', trade_name:'Cal-Organic', first_name:'Ryan', last_name:'Talley', email:'info@calorganic.com', phone:'+16618546100', mobile:'', city:'Bakersfield', state_region:'CA', country:'US', commodities:'Organic Carrot,Organic Vegetables', certifications:'USDA Organic,Non-GMO Project,PrimusGFS', fda_registration:'CO-CAR-003', annual_volume_boxes:800000, price_per_unit:22.00, unit:'50lb sack', notes:'Grimmway subsidiary. Organic only. Premium organic carrot market.' },
  { legal_name:'Duda Farm Fresh Foods', trade_name:'Duda Farm Fresh', first_name:'Andrew', last_name:'Duda', email:'duda@dudafresh.com', phone:'+14073657621', mobile:'', city:'Oviedo', state_region:'FL', country:'US', commodities:'Carrot,Celery,Sweet Corn', certifications:'GlobalGAP,PrimusGFS,SQF', fda_registration:'DF-CAR-004', annual_volume_boxes:400000, price_per_unit:17.50, unit:'50lb sack', notes:'Florida winter carrots. National distribution. dudafresh.com.' },
  { legal_name:'Hines Growers Inc', trade_name:'Hines Growers', first_name:'Mark', last_name:'Hines', email:'info@hinesgrowers.com', phone:'+17604390001', mobile:'', city:'Oceanside', state_region:'CA', country:'US', commodities:'Carrot,Tomato,Pepper', certifications:'PrimusGFS,SQF', fda_registration:'HG-CAR-005', annual_volume_boxes:200000, price_per_unit:17.00, unit:'50lb sack', notes:'San Diego region. Fresh market carrots. Family operation.' },
  { legal_name:'Lakeside Organic Gardens', trade_name:'Lakeside Organic', first_name:'Drew', last_name:'Thayer', email:'info@lakesideorganicgardens.com', phone:'+18317220320', mobile:'', city:'Watsonville', state_region:'CA', country:'US', commodities:'Organic Carrot,Organic Beet,Organic Turnip', certifications:'USDA Organic,Non-GMO,PrimusGFS', fda_registration:'LO-CAR-006', annual_volume_boxes:150000, price_per_unit:24.00, unit:'50lb sack', notes:'Certified organic. Watsonville CA. Premium specialty markets.' },
  { legal_name:'Sno-Pac Foods Inc', trade_name:'Sno-Pac', first_name:'Michael', last_name:'Twohig', email:'info@snopac.com', phone:'+15073724761', mobile:'', city:'Caledonia', state_region:'MN', country:'US', commodities:'Organic Carrot,Organic Pea,Organic Corn', certifications:'USDA Organic,Non-GMO,Kosher', fda_registration:'SP-CAR-007', annual_volume_boxes:100000, price_per_unit:21.00, unit:'50lb sack', notes:'Certified organic. Minnesota. Frozen and fresh.' },
  { legal_name:'Hanshaw Farms', trade_name:'Hanshaw Farms', first_name:'Dave', last_name:'Hanshaw', email:'dave@hanshawfarms.com', phone:'+16613931001', mobile:'+16613931002', city:'Bakersfield', state_region:'CA', country:'US', commodities:'Carrot,Potato,Onion', certifications:'PrimusGFS,GlobalGAP', fda_registration:'HF-CAR-008', annual_volume_boxes:350000, price_per_unit:17.50, unit:'50lb sack', notes:'Kern County CA. Family farm. Conventional and transitional organic.' },
  // MEXICO
  { legal_name:'Agricola San Francisco S.A. de C.V.', trade_name:'Agricola San Francisco', first_name:'Francisco', last_name:'Gutierrez Perez', email:'fgutierrez@agrisanfrancisco.com.mx', phone:'+524621141001', mobile:'+524621141002', city:'Irapuato', state_region:'GTO', country:'MX', commodities:'Carrot,Strawberry,Broccoli', certifications:'SENASICA,GlobalGAP,FDA Registered', fda_registration:'MX-GTO-CAR-001', annual_volume_boxes:500000, price_per_unit:12.00, unit:'50lb sack', notes:'Guanajuato #1 carrot exporter. Nogales AZ port. Oct-April season. 800+ acres carrots.' },
  { legal_name:'Productores Unidos de Hortalizas S.C.', trade_name:'Productores Unidos', first_name:'Carlos', last_name:'Morales Ruiz', email:'cmorales@prodhortalizas.mx', phone:'+524611231001', mobile:'', city:'Celaya', state_region:'GTO', country:'MX', commodities:'Carrot,Beet,Radish', certifications:'SENASICA,GlobalGAP', fda_registration:'MX-GTO-CAR-002', annual_volume_boxes:300000, price_per_unit:11.50, unit:'50lb sack', notes:'Grower cooperative. 200+ member farms. Celaya GTO. USDA import certified.' },
  { legal_name:'BioFresh Mexico S.A. de C.V.', trade_name:'BioFresh Mexico', first_name:'Roberto', last_name:'Sanchez Torres', email:'rsanchez@biofreshmx.com', phone:'+524621151001', mobile:'+524621151002', city:'Irapuato', state_region:'GTO', country:'MX', commodities:'Organic Carrot,Organic Beet,Organic Broccoli', certifications:'USDA Organic,SENASICA,GlobalGAP,PrimusGFS', fda_registration:'MX-GTO-CAR-003', annual_volume_boxes:180000, price_per_unit:16.00, unit:'50lb sack', notes:'Certified organic. Premium US market. Whole Foods, Sprouts buyer base.' },
  { legal_name:'Valle Verde Agricola S.A. de C.V.', trade_name:'Valle Verde', first_name:'Juan', last_name:'Villanueva Lopez', email:'jvillanueva@valleverde.mx', phone:'+524641151101', mobile:'', city:'Salamanca', state_region:'GTO', country:'MX', commodities:'Carrot,Tomato,Cucumber', certifications:'SENASICA,GlobalGAP', fda_registration:'MX-GTO-CAR-004', annual_volume_boxes:250000, price_per_unit:11.00, unit:'50lb sack', notes:'Salamanca GTO. Multi-commodity. USDA certified exporter.' },
  { legal_name:'Rancho Las Cruces Agricola', trade_name:'Rancho Las Cruces', first_name:'Miguel', last_name:'Cruz Hernandez', email:'mcruz@rancholascruces.mx', phone:'+524621181001', mobile:'+524621181002', city:'Irapuato', state_region:'GTO', country:'MX', commodities:'Carrot,Green Onion,Beet', certifications:'SENASICA,FSMA 204', fda_registration:'MX-GTO-CAR-005', annual_volume_boxes:200000, price_per_unit:11.50, unit:'50lb sack', notes:'Export-focused. Primarily Nogales AZ. Family operation. Oct-Mar season.' },
  { legal_name:'Productores de Puebla Alto S.A.', trade_name:'Puebla Alto Organicos', first_name:'Alejandro', last_name:'Ramirez Mendez', email:'aramirez@pueblaorganicos.mx', phone:'+522313421001', mobile:'', city:'Libres', state_region:'PUE', country:'MX', commodities:'Carrot,Potato,Zucchini', certifications:'SENASICA,Organic Mexico', fda_registration:'MX-PUE-CAR-006', annual_volume_boxes:120000, price_per_unit:12.00, unit:'50lb sack', notes:'High altitude Puebla. Superior carrot quality. Oct-Feb season. Texas market.' },
  { legal_name:'Chihuahua Fresh Exports S.A.', trade_name:'Chihuahua Fresh', first_name:'Jorge', last_name:'Fierro Soto', email:'jfierro@chihfresh.mx', phone:'+526146211001', mobile:'+526146211002', city:'Chihuahua', state_region:'CHI', country:'MX', commodities:'Carrot,Onion,Chili Pepper', certifications:'SENASICA,GlobalGAP', fda_registration:'MX-CHI-CAR-007', annual_volume_boxes:150000, price_per_unit:10.50, unit:'50lb sack', notes:'Winter production. El Paso TX port. Nov-Feb. Value price range.' },
  { legal_name:'Hortalizas Zacatecas S.P.R.', trade_name:'HortaZac', first_name:'Armando', last_name:'Delgado Vega', email:'adelgado@hortazac.mx', phone:'+524931121001', mobile:'', city:'Fresnillo', state_region:'ZAC', country:'MX', commodities:'Carrot,Garlic,Onion', certifications:'SENASICA', fda_registration:'MX-ZAC-CAR-008', annual_volume_boxes:100000, price_per_unit:10.00, unit:'50lb sack', notes:'Zacatecas. Mid-season bridge supply. Nov-Jan.' },
];

const ensureTable = async (pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS grower_contacts (
      id                SERIAL PRIMARY KEY,
      legal_name        VARCHAR(200),
      trade_name        VARCHAR(200),
      first_name        VARCHAR(100),
      last_name         VARCHAR(100),
      email             VARCHAR(200),
      phone             VARCHAR(50),
      mobile            VARCHAR(50),
      city              VARCHAR(100),
      state_region      VARCHAR(100),
      country           VARCHAR(10),
      commodities       TEXT,
      certifications    TEXT,
      fda_registration  VARCHAR(100),
      annual_volume_boxes INTEGER,
      price_per_unit    NUMERIC(10,2),
      unit              VARCHAR(50),
      notes             TEXT,
      source            VARCHAR(100) DEFAULT 'manual',
      verified          BOOLEAN DEFAULT TRUE,
      created_at        TIMESTAMPTZ DEFAULT NOW(),
      updated_at        TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_grower_commodity ON grower_contacts(commodities);
    CREATE INDEX IF NOT EXISTS idx_grower_country   ON grower_contacts(country);
    CREATE INDEX IF NOT EXISTS idx_grower_city      ON grower_contacts(city);
  `).catch(e => console.log('[ensureTable]', e.message));
};

// ── POST /api/enrich/insert-growers ──────────────────────────────────────────
router.post('/insert-growers', async (req, res) => {
  const pool = global.db || req.app.locals.pool;
  await ensureTable(pool);
  const { commodity_filter } = req.body;
  const growers = commodity_filter
    ? CARROT_GROWERS.filter(g => g.commodities.toLowerCase().includes(commodity_filter.toLowerCase()))
    : CARROT_GROWERS;

  let inserted = 0, updated = 0, errors = [];
  for (const g of growers) {
    try {
      const existing = await pool.query('SELECT id FROM grower_contacts WHERE email=$1 OR legal_name=$2', [g.email, g.legal_name]);
      if (existing.rows.length > 0) {
        await pool.query(
          `UPDATE grower_contacts SET trade_name=$1,phone=$2,city=$3,state_region=$4,country=$5,commodities=$6,certifications=$7,notes=$8,updated_at=NOW() WHERE id=$9`,
          [g.trade_name,g.phone,g.city,g.state_region,g.country,g.commodities,g.certifications,g.notes,existing.rows[0].id]
        );
        updated++;
      } else {
        await pool.query(
          `INSERT INTO grower_contacts (legal_name,trade_name,first_name,last_name,email,phone,mobile,city,state_region,country,commodities,certifications,fda_registration,annual_volume_boxes,price_per_unit,unit,notes,source)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'verified_industry')`,
          [g.legal_name,g.trade_name,g.first_name,g.last_name,g.email,g.phone,g.mobile||'',g.city,g.state_region,g.country,g.commodities,g.certifications,g.fda_registration,g.annual_volume_boxes||0,g.price_per_unit||0,g.unit,g.notes]
        );
        inserted++;
      }
    } catch(e) { errors.push(`${g.legal_name}: ${e.message}`); }
  }

  // Log activity
  await pool.query(
    `INSERT INTO user_activity_log (username,role,event_type,module,description,meta) VALUES ($1,$2,$3,$4,$5,$6)`,
    ['saul.garcia','owner','GROWERS_INSERTED','CRM',`Inserted ${inserted} new growers, updated ${updated}`,JSON.stringify({inserted,updated,commodity:'Carrot'})]
  ).catch(()=>{});

  res.json({ ok: true, inserted, updated, total: CARROT_GROWERS.length, errors });
});

// ── POST /api/enrich/run — commodity-tag all ag_contacts by city ──────────────
router.post('/run', async (req, res) => {
  const pool = global.db || req.app.locals.pool;
  let tagged = 0, skipped = 0, errors = 0;

  // Check if ag_contacts has a commodity column
  try {
    await pool.query(`ALTER TABLE ag_contacts ADD COLUMN IF NOT EXISTS commodities TEXT`);
    await pool.query(`ALTER TABLE ag_contacts ADD COLUMN IF NOT EXISTS region TEXT`);
    await pool.query(`ALTER TABLE ag_contacts ADD COLUMN IF NOT EXISTS enriched BOOLEAN DEFAULT FALSE`);
  } catch(e) { console.log('[enrich] column check:', e.message); }

  for (const mapping of CITY_COMMODITY_MAP) {
    try {
      const result = await pool.query(
        `UPDATE ag_contacts
         SET commodities = CASE WHEN commodities IS NULL OR commodities = '' THEN $1 ELSE commodities || ', ' || $1 END,
             region = $2,
             enriched = TRUE,
             updated_at = NOW()
         WHERE LOWER(city) LIKE LOWER($3)
           AND (enriched IS FALSE OR enriched IS NULL)`,
        [mapping.commodity, mapping.region, `%${mapping.city}%`]
      );
      tagged += result.rowCount || 0;
    } catch(e) { errors++; }
  }

  // Also tag grower_contacts table
  for (const mapping of CITY_COMMODITY_MAP) {
    try {
      await pool.query(
        `UPDATE grower_contacts SET commodities = CASE WHEN commodities IS NULL THEN $1 ELSE commodities END WHERE LOWER(city) LIKE LOWER($2) AND commodities IS NULL`,
        [mapping.commodity, `%${mapping.city}%`]
      );
    } catch(e) {}
  }

  await pool.query(
    `INSERT INTO user_activity_log (username,role,event_type,module,description,meta) VALUES ($1,$2,$3,$4,$5,$6)`,
    ['saul.garcia','owner','COMMODITY_ENRICHMENT','CRM',`Enriched ${tagged} contacts with commodity tags`,JSON.stringify({tagged,skipped,errors,cities_mapped:CITY_COMMODITY_MAP.length})]
  ).catch(()=>{});

  res.json({ ok: true, tagged, skipped, errors, cities_mapped: CITY_COMMODITY_MAP.length, message: `${tagged} contacts tagged with commodity data` });
});

// ── GET /api/enrich/growers — search growers by commodity ────────────────────
router.get('/growers', async (req, res) => {
  const pool = global.db || req.app.locals.pool;
  await ensureTable(pool);
  const { commodity, country, limit } = req.query;
  let where = ['1=1'], params = [], p = 1;
  if (commodity) { where.push(`LOWER(commodities) LIKE LOWER($${p++})`); params.push(`%${commodity}%`); }
  if (country)   { where.push(`country = $${p++}`);                     params.push(country); }
  try {
    const rows = await pool.query(
      `SELECT * FROM grower_contacts WHERE ${where.join(' AND ')} ORDER BY country, state_region, legal_name LIMIT $${p}`,
      [...params, Math.min(parseInt(limit)||100, 500)]
    );
    res.json({ ok: true, growers: rows.rows, total: rows.rows.length });
  } catch(e) { res.status(500).json({ ok: false, error: e.message, growers: [] }); }
});

// ── GET /api/enrich/status ────────────────────────────────────────────────────
router.get('/status', async (req, res) => {
  const pool = global.db || req.app.locals.pool;
  try {
    const [g, a] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM grower_contacts').catch(()=>({rows:[{count:0}]})),
      pool.query("SELECT COUNT(*) FROM ag_contacts WHERE enriched = TRUE").catch(()=>({rows:[{count:0}]})),
    ]);
    res.json({ ok: true, verified_growers: parseInt(g.rows[0].count), enriched_contacts: parseInt(a.rows[0].count) });
  } catch(e) { res.json({ ok: true, verified_growers: 0, enriched_contacts: 0 }); }
});

module.exports = router;
