/**
 * CM PRODUCTS INTERNATIONAL — FIELD AGENT PIPELINE v2.0
 * GeoDNA | Food Safety Chain | Transit Trail | Export Documents | Regulatory
 * Save to: C:\AuditDNA\backend\routes\field-agent.js
 */

const express  = require('express');
const router   = express.Router();
const { Pool } = require('pg');
const crypto   = require('crypto');
const nodemailer = require('nodemailer');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || 'auditdna',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'auditdna2026'
});

const USDA_KEY = process.env.USDA_API_KEY || '4F158DB1-85C2-3243-BFFA-58B53FB40D23';
const OWNER_EMAIL = process.env.SMTP_USER || 'saul@mexausafg.com';

// ── SMTP ────────────────────────────────────────────────────────────────────
const mailer = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtpout.secureserver.net',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: { user: OWNER_EMAIL, pass: process.env.SMTP_PASS || '' }
});

const notify = async (to, subject, html) => {
  if (!process.env.SMTP_PASS) return;
  try {
    await mailer.sendMail({
      from: '"CM Products Intelligence" <saul@mexausafg.com>',
      to, subject, html
    });
  } catch (e) { console.warn('[FIELD-AGENT] Email:', e.message); }
};

// ── HELPERS ─────────────────────────────────────────────────────────────────
const STATE_CODES = {
  'Baja California':'BC','Baja California Sur':'BS','Jalisco':'JA','Sinaloa':'SN',
  'Sonora':'SO','Michoacán':'MI','Guanajuato':'GU','Veracruz':'VE','Nayarit':'NA',
  'Colima':'CO','Chihuahua':'CH','Oaxaca':'OA','Yucatán':'YU','Guerrero':'GR',
  'California':'CA','Arizona':'AZ','Texas':'TX','Florida':'FL'
};

const COMMODITY_CODES = {
  'Avocado':'AVO','Strawberry':'STR','Blueberry':'BLU','Raspberry':'RAS',
  'Blackberry':'BLK','Tomato':'TOM','Bell Pepper':'PEP','Jalapeño':'JAL',
  'Cucumber':'CUC','Zucchini':'ZUC','Lime':'LIM','Lemon':'LEM','Orange':'ORA',
  'Mango':'MGO','Papaya':'PAP','Cilantro':'CIL','Parsley':'PRS','Basil':'BSL',
  'Romaine':'ROM','Iceberg':'ICE','Spinach':'SPN','Kale':'KAL','Carrot':'CAR',
  'Onion':'ONI','Garlic':'GAR','Asparagus':'ASP','Broccoli':'BRC','Grape':'GRP',
  'Watermelon':'WML','Cantaloupe':'CNT','Corn':'CRN','Pineapple':'PIN'
};

const HTS_CODES = {
  'Avocado':      { hts:'0804.40.0000', duty:'$0.053/kg', desc:'Avocados, fresh or dried' },
  'Strawberry':   { hts:'0810.10.0000', duty:'0%',         desc:'Strawberries, fresh' },
  'Blueberry':    { hts:'0810.40.0040', duty:'0%',         desc:'Blueberries, fresh' },
  'Raspberry':    { hts:'0810.20.1000', duty:'0%',         desc:'Raspberries, fresh' },
  'Blackberry':   { hts:'0810.20.9000', duty:'0%',         desc:'Blackberries, fresh' },
  'Tomato':       { hts:'0702.00.2000', duty:'3.9%',       desc:'Tomatoes, fresh Nov 15-Jul 14' },
  'Bell Pepper':  { hts:'0709.60.0090', duty:'5%',         desc:'Peppers, fresh or chilled' },
  'Jalapeño':     { hts:'0709.60.0090', duty:'5%',         desc:'Peppers, fresh or chilled' },
  'Cucumber':     { hts:'0707.00.2000', duty:'5.4%',       desc:'Cucumbers, fresh' },
  'Lime':         { hts:'0805.50.3000', duty:'1.8¢/kg',    desc:'Limes, fresh' },
  'Lemon':        { hts:'0805.50.2000', duty:'2.4¢/kg',    desc:'Lemons, fresh' },
  'Orange':       { hts:'0805.10.0040', duty:'1.9¢/kg',    desc:'Oranges, fresh' },
  'Mango':        { hts:'0804.50.4040', duty:'0%',         desc:'Mangoes, fresh' },
  'Cilantro':     { hts:'0709.99.9010', duty:'5.9%',       desc:'Coriander/Cilantro, fresh' },
  'Parsley':      { hts:'0709.99.9010', duty:'5.9%',       desc:'Parsley, fresh' },
  'Basil':        { hts:'1211.90.8070', duty:'0%',         desc:'Basil, fresh' },
  'Romaine':      { hts:'0705.11.4000', duty:'0%',         desc:'Lettuce, fresh' },
  'Iceberg':      { hts:'0705.11.2000', duty:'0%',         desc:'Iceberg lettuce, fresh' },
  'Spinach':      { hts:'0709.70.0040', duty:'20%',        desc:'Spinach, fresh' },
  'Broccoli':     { hts:'0704.10.2000', duty:'0%',         desc:'Broccoli, fresh' },
  'Asparagus':    { hts:'0709.20.1020', duty:'21.3%',      desc:'Asparagus, fresh Nov 1-Apr 30' },
  'Garlic':       { hts:'0703.20.0010', duty:'0.43¢/kg',   desc:'Garlic, fresh' },
  'Onion':        { hts:'0703.10.3000', duty:'3.9¢/kg',    desc:'Onions, fresh' },
  'Grape':        { hts:'0806.10.2000', duty:'$1.13/m3',   desc:'Grapes, fresh' },
  'Watermelon':   { hts:'0807.11.3000', duty:'17%',        desc:'Watermelons, fresh' },
  'Cantaloupe':   { hts:'0807.19.7000', duty:'28.4%',      desc:'Melons, fresh' },
  'Carrot':       { hts:'0706.10.4060', duty:'14.9%',      desc:'Carrots, fresh' },
  'Pineapple':    { hts:'0804.30.4000', duty:'1.1¢/kg',    desc:'Pineapples, fresh' },
};

const genLotNumber = (product, region, date) => {
  const d = date ? new Date(date) : new Date();
  const dateStr = d.toISOString().slice(0,10).replace(/-/g,'');
  const stateCode = STATE_CODES[region] || 'MX';
  const prodWords = product?.split(' ') || ['PRD'];
  const commCode = COMMODITY_CODES[prodWords[0]] || prodWords[0].slice(0,3).toUpperCase();
  const varCode  = prodWords[1] ? prodWords[1].slice(0,3).toUpperCase() : commCode.slice(0,3);
  const suffix   = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `CM-${stateCode}-${commCode}-${varCode}-${dateStr}-${suffix}`;
};

const genGeoDNAHash = (data) => {
  const str = JSON.stringify({
    lat:       data.gps?.lat,
    lng:       data.gps?.lng,
    ts:        data.timestamp || new Date().toISOString(),
    grower:    data.farmerName || data.farmName,
    product:   data.product,
    variety:   data.variety,
    usdaPrice: data.usdaPrice?.price,
    photoHash: data.photo ? crypto.createHash('md5').update(data.photo.slice(0,200)).digest('hex') : null,
  });
  return 'GD-' + crypto.createHash('sha256').update(str).digest('hex').slice(0,32).toUpperCase();
};

const genPONumber  = () => `PO-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;
const genINVNumber = () => `INV-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;

// ── DB INIT ─────────────────────────────────────────────────────────────────
const initTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS field_submissions (
      id              SERIAL PRIMARY KEY,
      lot_number      VARCHAR(50) UNIQUE,
      geodna_hash     VARCHAR(100),
      product         VARCHAR(200),
      category        VARCHAR(100),
      variety         VARCHAR(100),
      grade           VARCHAR(50),
      quantity        NUMERIC,
      unit            VARCHAR(30),
      packaging_type  VARCHAR(100),
      packaging_units INTEGER,
      harvest_date    DATE,
      available_date  DATE,
      shelf_life_days INTEGER,
      asking_price    NUMERIC,
      currency        VARCHAR(10) DEFAULT 'USD',
      price_unit      VARCHAR(30) DEFAULT 'per lb',
      farm_name       VARCHAR(200),
      farmer_name     VARCHAR(200),
      farmer_phone    VARCHAR(50),
      fsma204         BOOLEAN DEFAULT false,
      gap_cert        BOOLEAN DEFAULT false,
      organic         BOOLEAN DEFAULT false,
      global_gap      BOOLEAN DEFAULT false,
      port_of_entry   VARCHAR(100),
      destination_type VARCHAR(30),
      logistics_cost  NUMERIC,
      notes           TEXT,
      photo_base64    TEXT,
      gps_lat         NUMERIC,
      gps_lng         NUMERIC,
      gps_accuracy    NUMERIC,
      vision_analysis JSONB,
      usda_price      JSONB,
      hts_code        VARCHAR(20),
      hts_desc        VARCHAR(200),
      hts_duty        VARCHAR(50),
      status          VARCHAR(30) DEFAULT 'pending',
      submitted_by    VARCHAR(100),
      submitted_at    TIMESTAMPTZ DEFAULT NOW(),
      listing_id      INTEGER,
      shed_id         INTEGER,
      wssf_score      NUMERIC,
      importer_of_record VARCHAR(200),
      customs_broker  VARCHAR(200),
      fda_prior_notice VARCHAR(100)
    );

    CREATE TABLE IF NOT EXISTS packaging_sheds (
      id                  SERIAL PRIMARY KEY,
      name                VARCHAR(200),
      fda_reg_number      VARCHAR(50),
      usda_est_number     VARCHAR(50),
      address             TEXT,
      city                VARCHAR(100),
      state               VARCHAR(100),
      country             VARCHAR(50) DEFAULT 'Mexico',
      gps_lat             NUMERIC,
      gps_lng             NUMERIC,
      cold_storage_mt     NUMERIC,
      haccp_on_file       BOOLEAN DEFAULT false,
      primus_cert         BOOLEAN DEFAULT false,
      global_gap_cert     BOOLEAN DEFAULT false,
      sqf_cert            BOOLEAN DEFAULT false,
      brc_cert            BOOLEAN DEFAULT false,
      senasica_auth       BOOLEAN DEFAULT false,
      cert_expiry         DATE,
      inspection_date     DATE,
      capacity_cases_day  INTEGER,
      contact_name        VARCHAR(200),
      contact_phone       VARCHAR(50),
      contact_email       VARCHAR(200),
      approved_commodities TEXT[],
      approved_ports       TEXT[],
      notes               TEXT,
      active              BOOLEAN DEFAULT true,
      created_at          TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS food_safety_records (
      id              SERIAL PRIMARY KEY,
      lot_number      VARCHAR(50),
      submission_id   INTEGER REFERENCES field_submissions(id),
      record_type     VARCHAR(30),
      test_date       DATE,
      lab_name        VARCHAR(200),
      lab_cert_number VARCHAR(100),
      results         JSONB,
      file_base64     TEXT,
      file_name       VARCHAR(200),
      status          VARCHAR(20) DEFAULT 'pending',
      expiry_date     DATE,
      pass_fail       VARCHAR(10),
      notes           TEXT,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS shipment_trail (
      id              SERIAL PRIMARY KEY,
      lot_number      VARCHAR(50),
      submission_id   INTEGER REFERENCES field_submissions(id),
      event_type      VARCHAR(50),
      event_label     VARCHAR(200),
      event_timestamp TIMESTAMPTZ,
      gps_lat         NUMERIC,
      gps_lng         NUMERIC,
      location_name   VARCHAR(200),
      handler_name    VARCHAR(200),
      handler_phone   VARCHAR(50),
      carrier_name    VARCHAR(200),
      carrier_dot     VARCHAR(50),
      driver_name     VARCHAR(200),
      driver_license  VARCHAR(50),
      truck_plate     VARCHAR(30),
      trailer_number  VARCHAR(50),
      container_number VARCHAR(50),
      seal_number     VARCHAR(50),
      temp_celsius    NUMERIC,
      temp_fahrenheit NUMERIC,
      temp_setpoint   NUMERIC,
      weight_kg       NUMERIC,
      weight_lbs      NUMERIC,
      cbp_entry_number VARCHAR(50),
      cbp_exam_type   VARCHAR(50),
      inspector_badge VARCHAR(50),
      fda_pn_number   VARCHAR(100),
      bond_number     VARCHAR(100),
      wait_time_min   INTEGER,
      notes           TEXT,
      photo_base64    TEXT,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS market_listings (
      id              SERIAL PRIMARY KEY,
      lot_number      VARCHAR(50),
      geodna_hash     VARCHAR(100),
      submission_id   INTEGER REFERENCES field_submissions(id),
      product         VARCHAR(200),
      category        VARCHAR(100),
      variety         VARCHAR(100),
      grade           VARCHAR(50),
      quantity        NUMERIC,
      unit            VARCHAR(30),
      packaging_type  VARCHAR(100),
      packaging_units INTEGER,
      available_date  DATE,
      shelf_life_days INTEGER,
      asking_price    NUMERIC,
      currency        VARCHAR(10) DEFAULT 'USD',
      price_unit      VARCHAR(30),
      farm_name       VARCHAR(200),
      port_of_entry   VARCHAR(100),
      logistics_cost  NUMERIC,
      gps_lat         NUMERIC,
      gps_lng         NUMERIC,
      fsma204         BOOLEAN DEFAULT false,
      organic         BOOLEAN DEFAULT false,
      photo_base64    TEXT,
      usda_ref_price  NUMERIC,
      usda_ref_date   DATE,
      hts_code        VARCHAR(20),
      wssf_score      NUMERIC,
      shed_id         INTEGER REFERENCES packaging_sheds(id),
      status          VARCHAR(30) DEFAULT 'active',
      views           INTEGER DEFAULT 0,
      published_at    TIMESTAMPTZ DEFAULT NOW(),
      expires_at      TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days'
    );

    CREATE TABLE IF NOT EXISTS buyer_offers (
      id              SERIAL PRIMARY KEY,
      listing_id      INTEGER REFERENCES market_listings(id),
      lot_number      VARCHAR(50),
      buyer_name      VARCHAR(200),
      buyer_company   VARCHAR(200),
      buyer_email     VARCHAR(200),
      buyer_phone     VARCHAR(50),
      offer_price     NUMERIC,
      currency        VARCHAR(10) DEFAULT 'USD',
      price_unit      VARCHAR(30),
      quantity        NUMERIC,
      unit            VARCHAR(30),
      packaging_type  VARCHAR(100),
      delivery_terms  VARCHAR(100),
      requested_date  DATE,
      message         TEXT,
      status          VARCHAR(30) DEFAULT 'pending',
      counter_price   NUMERIC,
      counter_notes   TEXT,
      responded_at    TIMESTAMPTZ,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS purchase_orders (
      id              SERIAL PRIMARY KEY,
      po_number       VARCHAR(50) UNIQUE,
      lot_number      VARCHAR(50),
      geodna_hash     VARCHAR(100),
      listing_id      INTEGER REFERENCES market_listings(id),
      offer_id        INTEGER REFERENCES buyer_offers(id),
      seller_entity_id INTEGER,
      buyer_entity_id INTEGER,
      product         VARCHAR(200),
      variety         VARCHAR(100),
      grade           VARCHAR(50),
      quantity        NUMERIC,
      unit            VARCHAR(30),
      packaging_type  VARCHAR(100),
      unit_price      NUMERIC,
      currency        VARCHAR(10) DEFAULT 'USD',
      logistics_cost  NUMERIC DEFAULT 0,
      subtotal        NUMERIC,
      total           NUMERIC,
      hts_code        VARCHAR(20),
      hts_duty        VARCHAR(50),
      port_of_entry   VARCHAR(100),
      delivery_terms  VARCHAR(100),
      payment_terms   VARCHAR(50) DEFAULT 'Net 30',
      ship_date       DATE,
      delivery_date   DATE,
      importer_of_record VARCHAR(200),
      customs_broker  VARCHAR(200),
      usmca_eligible  BOOLEAN DEFAULT true,
      notes           TEXT,
      status          VARCHAR(30) DEFAULT 'draft',
      factoring_eligible BOOLEAN DEFAULT true,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id                    SERIAL PRIMARY KEY,
      invoice_number        VARCHAR(50) UNIQUE,
      lot_number            VARCHAR(50),
      po_id                 INTEGER REFERENCES purchase_orders(id),
      seller_entity_id      INTEGER,
      buyer_entity_id       INTEGER,
      amount                NUMERIC,
      currency              VARCHAR(10) DEFAULT 'USD',
      payment_terms         VARCHAR(50),
      due_date              DATE,
      factoring_eligible    BOOLEAN DEFAULT true,
      factoring_partner_id  INTEGER,
      factoring_status      VARCHAR(30) DEFAULT 'not_submitted',
      factoring_submitted_at TIMESTAMPTZ,
      advance_rate          NUMERIC DEFAULT 80,
      advance_amount        NUMERIC,
      status                VARCHAR(30) DEFAULT 'draft',
      paid_at               TIMESTAMPTZ,
      created_at            TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS factoring_partners (
      id            SERIAL PRIMARY KEY,
      name          VARCHAR(200),
      contact_name  VARCHAR(200),
      email         VARCHAR(200),
      phone         VARCHAR(50),
      website       VARCHAR(200),
      advance_rate  NUMERIC DEFAULT 80,
      fee_rate      NUMERIC DEFAULT 3,
      min_invoice   NUMERIC DEFAULT 5000,
      max_invoice   NUMERIC,
      industries    TEXT[],
      notes         TEXT,
      active        BOOLEAN DEFAULT true,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS seller_entities (
      id              SERIAL PRIMARY KEY,
      entity_name     VARCHAR(200),
      entity_type     VARCHAR(50),
      rfc             VARCHAR(20),
      curp            VARCHAR(20),
      domicilio_fiscal TEXT,
      ciudad          VARCHAR(100),
      estado          VARCHAR(100),
      cp              VARCHAR(10),
      pais            VARCHAR(50) DEFAULT 'Mexico',
      clabe           VARCHAR(20),
      bank_mx         VARCHAR(100),
      account_usd     VARCHAR(30),
      routing_usd     VARCHAR(20),
      bank_usd        VARCHAR(100),
      contact_name    VARCHAR(200),
      contact_email   VARCHAR(200),
      contact_phone   VARCHAR(50),
      active          BOOLEAN DEFAULT true,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS buyer_entities (
      id              SERIAL PRIMARY KEY,
      company_name    VARCHAR(200),
      trade_name      VARCHAR(200),
      tax_id          VARCHAR(50),
      country         VARCHAR(50) DEFAULT 'USA',
      address         TEXT,
      city            VARCHAR(100),
      state           VARCHAR(50),
      zip             VARCHAR(20),
      contact_name    VARCHAR(200),
      contact_email   VARCHAR(200),
      contact_phone   VARCHAR(50),
      bank_name       VARCHAR(100),
      account_number  VARCHAR(30),
      routing_number  VARCHAR(20),
      credit_limit    NUMERIC,
      payment_terms   VARCHAR(50) DEFAULT 'Net 30',
      importer_of_record_number VARCHAR(50),
      fmc_bond_number VARCHAR(50),
      active          BOOLEAN DEFAULT true,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    );

    -- Seed factoring partners
    INSERT INTO factoring_partners (name, contact_name, email, phone, advance_rate, fee_rate, min_invoice, industries, notes)
    SELECT 'Riviera Finance','Operations','ops@rivierafinance.com','1-800-477-4831',85,2.5,5000,ARRAY['Agriculture','Produce'],'Specializes in fresh produce'
    WHERE NOT EXISTS (SELECT 1 FROM factoring_partners LIMIT 1);

    INSERT INTO factoring_partners (name, contact_name, email, phone, advance_rate, fee_rate, min_invoice, industries, notes)
    SELECT 'TCI Business Capital','Sales','info@tcibizcap.com','1-800-707-4845',80,3.0,10000,ARRAY['Agriculture','Food'],'Strong in LATAM cross-border'
    WHERE (SELECT COUNT(*) FROM factoring_partners) < 2;
  `);
  console.log('[FIELD-AGENT v2] All tables initialized');
};
initTables().catch(e => console.error('[FIELD-AGENT] Init error:', e.message));

// ═══════════════════════════════════════════════════════════════════════════
// FIELD SUBMISSION + GeoDNA
// ═══════════════════════════════════════════════════════════════════════════
router.post('/submit', async (req, res) => {
  try {
    const {
      product, category, variety, grade, quantity, unit,
      packagingType, packagingUnits, harvestDate, availableDate, shelfLife,
      askingPrice, currency, priceUnit, farmName, farmerName, farmerPhone,
      fsma204, gap, organic, globalGAP, portOfEntry, destinationType,
      logisticsCost, notes, photo, gps, visionAnalysis, usdaPrice,
      submittedBy, shedId, importerOfRecord, customsBroker
    } = req.body;

    const lotNumber  = genLotNumber(product, req.body.region || '', harvestDate);
    const geodnaHash = genGeoDNAHash({ gps, farmerName, farmName, product, variety, usdaPrice, photo, timestamp: new Date().toISOString() });
    const htsInfo    = HTS_CODES[product?.split(' ')[0]] || HTS_CODES[variety?.split(' ')[0]] || null;

    const r = await pool.query(`
      INSERT INTO field_submissions
        (lot_number, geodna_hash, product, category, variety, grade,
         quantity, unit, packaging_type, packaging_units, harvest_date,
         available_date, shelf_life_days, asking_price, currency, price_unit,
         farm_name, farmer_name, farmer_phone, fsma204, gap_cert, organic, global_gap,
         port_of_entry, destination_type, logistics_cost, notes, photo_base64,
         gps_lat, gps_lng, gps_accuracy, vision_analysis, usda_price,
         hts_code, hts_desc, hts_duty, submitted_by, shed_id,
         importer_of_record, customs_broker, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
              $17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,
              $31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41)
      RETURNING id
    `, [
      lotNumber, geodnaHash, product, category, variety, grade,
      quantity, unit, packagingType, packagingUnits||null,
      harvestDate||null, availableDate||null, shelfLife||null,
      askingPrice, currency||'USD', priceUnit||'per lb',
      farmName, farmerName, farmerPhone,
      !!fsma204, !!gap, !!organic, !!globalGAP,
      portOfEntry, destinationType, logisticsCost||null, notes,
      photo||null, gps?.lat||null, gps?.lng||null, gps?.accuracy||null,
      visionAnalysis ? JSON.stringify(visionAnalysis) : null,
      usdaPrice ? JSON.stringify(usdaPrice) : null,
      htsInfo?.hts||null, htsInfo?.desc||null, htsInfo?.duty||null,
      submittedBy||'field-agent', shedId||null,
      importerOfRecord||null, customsBroker||null, 'published'
    ]);

    const submissionId = r.rows[0].id;

    // Auto-publish listing
    const listing = await pool.query(`
      INSERT INTO market_listings
        (lot_number, geodna_hash, submission_id, product, category, variety, grade,
         quantity, unit, packaging_type, packaging_units, available_date,
         shelf_life_days, asking_price, currency, price_unit, farm_name,
         port_of_entry, logistics_cost, gps_lat, gps_lng, fsma204, organic,
         photo_base64, usda_ref_price, usda_ref_date, hts_code, shed_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
              $17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)
      RETURNING id
    `, [
      lotNumber, geodnaHash, submissionId, product, category, variety, grade,
      quantity, unit, packagingType, packagingUnits||null,
      availableDate||null, shelfLife||null,
      askingPrice, currency||'USD', priceUnit||'per lb', farmName,
      portOfEntry, logisticsCost||null,
      gps?.lat||null, gps?.lng||null,
      !!fsma204, !!organic, photo||null,
      usdaPrice?.price||null,
      usdaPrice?.date ? new Date(usdaPrice.date) : null,
      htsInfo?.hts||null, shedId||null
    ]);

    await pool.query('UPDATE field_submissions SET listing_id=$1 WHERE id=$2',
      [listing.rows[0].id, submissionId]);

    // Auto-create first trail event: HARVEST/FIELD
    await pool.query(`
      INSERT INTO shipment_trail
        (lot_number, submission_id, event_type, event_label, event_timestamp, gps_lat, gps_lng, location_name, handler_name)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `, [
      lotNumber, submissionId, 'harvest', 'Harvest / Field Capture',
      new Date(), gps?.lat||null, gps?.lng||null,
      farmName || 'Field Origin', farmerName || submittedBy
    ]);

    // Email notification
    const verifyUrl = `https://mexausafg.com/verify/${lotNumber}`;
    await notify(
      OWNER_EMAIL,
      `[CM FIELD AGENT] ${lotNumber} — ${product} ${quantity} ${unit} @ $${askingPrice}/${priceUnit}`,
      `<div style="font-family:Arial,sans-serif;max-width:600px;color:#333">
        <div style="background:#0f172a;padding:20px;text-align:center">
          <div style="color:#cba658;font-size:20px;font-weight:900;letter-spacing:3px">CM PRODUCTS INTERNATIONAL</div>
          <div style="color:#94a3b8;font-size:11px;margin-top:4px">Field Agent Submission</div>
        </div>
        <div style="padding:20px">
          <div style="background:#f8fafc;border-left:4px solid #cba658;padding:12px;margin-bottom:16px">
            <div style="font-size:13px;color:#64748b">LOT NUMBER</div>
            <div style="font-size:22px;font-weight:900;color:#0f172a">${lotNumber}</div>
            <div style="font-size:10px;color:#94a3b8;margin-top:2px">GeoDNA: ${geodnaHash}</div>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <tr><td style="padding:6px;color:#64748b;border-bottom:1px solid #f1f5f9">Product</td><td style="padding:6px;font-weight:600;border-bottom:1px solid #f1f5f9">${product} ${variety||''} · ${grade}</td></tr>
            <tr><td style="padding:6px;color:#64748b;border-bottom:1px solid #f1f5f9">Quantity</td><td style="padding:6px;border-bottom:1px solid #f1f5f9">${quantity} ${unit} · ${packagingType||'N/A'}</td></tr>
            <tr><td style="padding:6px;color:#64748b;border-bottom:1px solid #f1f5f9">Asking Price</td><td style="padding:6px;font-weight:600;color:#16a34a;border-bottom:1px solid #f1f5f9">$${askingPrice} ${priceUnit} (${currency})</td></tr>
            <tr><td style="padding:6px;color:#64748b;border-bottom:1px solid #f1f5f9">Farm</td><td style="padding:6px;border-bottom:1px solid #f1f5f9">${farmName} · ${farmerName||''}</td></tr>
            <tr><td style="padding:6px;color:#64748b;border-bottom:1px solid #f1f5f9">Port of Entry</td><td style="padding:6px;border-bottom:1px solid #f1f5f9">${portOfEntry}</td></tr>
            <tr><td style="padding:6px;color:#64748b;border-bottom:1px solid #f1f5f9">GPS Origin</td><td style="padding:6px;border-bottom:1px solid #f1f5f9">${gps ? `${gps.lat?.toFixed(5)}, ${gps.lng?.toFixed(5)}` : 'N/A'}</td></tr>
            <tr><td style="padding:6px;color:#64748b;border-bottom:1px solid #f1f5f9">HTS Code</td><td style="padding:6px;border-bottom:1px solid #f1f5f9">${htsInfo?.hts||'—'} · ${htsInfo?.duty||'—'}</td></tr>
            <tr><td style="padding:6px;color:#64748b;border-bottom:1px solid #f1f5f9">FSMA 204</td><td style="padding:6px;border-bottom:1px solid #f1f5f9">${fsma204?'✓ YES':'✗ NO'}</td></tr>
            <tr><td style="padding:6px;color:#64748b">USDA Ref Price</td><td style="padding:6px">${usdaPrice?.price ? `$${usdaPrice.price} (${usdaPrice.market||'USDA AMS'})` : 'N/A'}</td></tr>
          </table>
          <div style="margin-top:20px;text-align:center">
            <a href="${verifyUrl}" style="background:#cba658;color:#0f172a;padding:12px 24px;text-decoration:none;font-weight:700;font-size:13px;display:inline-block">VERIFY LOT: ${lotNumber}</a>
          </div>
          <div style="margin-top:16px;font-size:10px;color:#94a3b8;text-align:center">
            CM Products International | MexaUSA Food Group, Inc. | NMLS #337526 | saul@mexausafg.com
          </div>
        </div>
      </div>`
    );

    res.json({ success:true, submissionId, listingId:listing.rows[0].id, lotNumber, geodnaHash, htsInfo });
  } catch (e) {
    console.error('[FIELD-AGENT] submit:', e.message);
    res.status(500).json({ success:false, error:e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SUBMISSIONS + VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════
router.get('/submissions', async (req, res) => {
  try {
    const { limit, status } = req.query;
    let q = `SELECT id, lot_number, geodna_hash, product, category, grade,
      quantity, unit, asking_price, currency, farm_name, gps_lat, gps_lng,
      hts_code, hts_duty, wssf_score, status, submitted_at, listing_id, shed_id
      FROM field_submissions WHERE 1=1`;
    const params = [];
    if (status) { params.push(status); q += ` AND status = $${params.length}`; }
    q += ` ORDER BY submitted_at DESC LIMIT ${parseInt(limit)||50}`;
    const r = await pool.query(q, params);
    res.json({ success:true, count:r.rows.length, data:r.rows });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

// Public verification endpoint (no auth required)
router.get('/verify/:lotNumber', async (req, res) => {
  try {
    const { lotNumber } = req.params;
    const sub = await pool.query(`SELECT * FROM field_submissions WHERE lot_number = $1`, [lotNumber]);
    if (!sub.rows.length) return res.status(404).json({ success:false, error:'Lot not found' });
    const s = sub.rows[0];

    const [trail, foodSafety, shed, listing] = await Promise.all([
      pool.query('SELECT * FROM shipment_trail WHERE lot_number=$1 ORDER BY event_timestamp ASC', [lotNumber]),
      pool.query('SELECT record_type, test_date, lab_name, pass_fail, status, expiry_date FROM food_safety_records WHERE lot_number=$1 ORDER BY test_date', [lotNumber]),
      s.shed_id ? pool.query('SELECT * FROM packaging_sheds WHERE id=$1', [s.shed_id]) : Promise.resolve({ rows:[] }),
      pool.query('SELECT id, asking_price, price_unit, status FROM market_listings WHERE lot_number=$1', [lotNumber]),
    ]);

    res.json({
      success: true,
      lot: {
        lotNumber:   s.lot_number,
        geodnaHash:  s.geodna_hash,
        product:     s.product,
        variety:     s.variety,
        grade:       s.grade,
        quantity:    s.quantity,
        unit:        s.unit,
        category:    s.category,
        farmName:    s.farm_name,
        farmerName:  s.farmer_name,
        harvestDate: s.harvest_date,
        availableDate: s.available_date,
        shelfLife:   s.shelf_life_days,
        price:       s.asking_price,
        currency:    s.currency,
        priceUnit:   s.price_unit,
        portOfEntry: s.port_of_entry,
        gps:         { lat:s.gps_lat, lng:s.gps_lng },
        htsCode:     s.hts_code,
        htsDuty:     s.hts_duty,
        fsma204:     s.fsma204,
        organic:     s.organic,
        wssfScore:   s.wssf_score,
        submittedAt: s.submitted_at,
        status:      s.status,
      },
      trail:      trail.rows,
      foodSafety: foodSafety.rows,
      shed:       shed.rows[0] || null,
      listing:    listing.rows[0] || null,
    });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════
// MARKET LISTINGS
// ═══════════════════════════════════════════════════════════════════════════
router.get('/listings', async (req, res) => {
  try {
    const { category, product, status, limit } = req.query;
    let q = `SELECT l.*,
      (SELECT COUNT(*) FROM buyer_offers o WHERE o.listing_id = l.id) as offer_count
      FROM market_listings l WHERE 1=1`;
    const params = [];
    if (status) { params.push(status); q += ` AND l.status = $${params.length}`; }
    else q += ` AND l.status = 'active'`;
    if (category) { params.push(category); q += ` AND l.category = $${params.length}`; }
    if (product)  { params.push(`%${product}%`); q += ` AND l.product ILIKE $${params.length}`; }
    q += ` ORDER BY l.published_at DESC LIMIT ${parseInt(limit)||100}`;
    const r = await pool.query(q, params);
    const rows = r.rows.map(row => ({ ...row, photo_base64: row.photo_base64 ? '[photo]' : null }));
    res.json({ success:true, count:rows.length, data:rows });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

router.get('/listings/:id', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT l.*, (SELECT COUNT(*) FROM buyer_offers o WHERE o.listing_id = l.id) as offer_count
      FROM market_listings l WHERE l.id = $1
    `, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success:false, error:'Not found' });
    await pool.query('UPDATE market_listings SET views = views + 1 WHERE id = $1', [req.params.id]);
    res.json({ success:true, data:r.rows[0] });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════
// FOOD SAFETY CHAIN
// ═══════════════════════════════════════════════════════════════════════════
router.post('/food-safety', async (req, res) => {
  try {
    const {
      lotNumber, submissionId, recordType, testDate, labName, labCertNumber,
      results, file, fileName, expiryDate, passFail, notes
    } = req.body;

    const r = await pool.query(`
      INSERT INTO food_safety_records
        (lot_number, submission_id, record_type, test_date, lab_name, lab_cert_number,
         results, file_base64, file_name, expiry_date, pass_fail, status, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING id
    `, [
      lotNumber, submissionId||null, recordType, testDate||null,
      labName, labCertNumber||null,
      results ? JSON.stringify(results) : null,
      file||null, fileName||null,
      expiryDate||null, passFail||'pending', 'received', notes
    ]);

    // Recompute WSSF score
    if (submissionId) await computeWSSF(submissionId, lotNumber);

    await notify(
      OWNER_EMAIL,
      `[CM FOOD SAFETY] ${recordType?.toUpperCase()} record added — Lot ${lotNumber}`,
      `<p>New ${recordType} record added for lot <strong>${lotNumber}</strong>.</p>
       <p>Lab: ${labName} | Result: ${passFail} | Expiry: ${expiryDate||'N/A'}</p>`
    );

    res.json({ success:true, id:r.rows[0].id });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

router.get('/food-safety/:lotNumber', async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT * FROM food_safety_records WHERE lot_number=$1 ORDER BY test_date DESC',
      [req.params.lotNumber]
    );
    res.json({ success:true, data:r.rows });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

const computeWSSF = async (submissionId, lotNumber) => {
  try {
    const records = await pool.query(
      'SELECT record_type, pass_fail FROM food_safety_records WHERE lot_number=$1',
      [lotNumber]
    );
    const types = { water:null, soil:null, seed:null, fertilizer:null };
    records.rows.forEach(r => {
      const key = r.record_type?.toLowerCase();
      if (key && types.hasOwnProperty(key)) types[key] = r.pass_fail;
    });
    const scores = { pass:25, fail:0, pending:10 };
    const total = Object.values(types).reduce((sum, v) => sum + (scores[v?.toLowerCase()] ?? 10), 0);
    await pool.query('UPDATE field_submissions SET wssf_score=$1 WHERE id=$2', [total, submissionId]);
    await pool.query('UPDATE market_listings SET wssf_score=$1 WHERE submission_id=$2', [total, submissionId]);
    return total;
  } catch (e) { console.error('WSSF compute:', e.message); return 0; }
};

// ═══════════════════════════════════════════════════════════════════════════
// SHIPMENT TRAIL
// ═══════════════════════════════════════════════════════════════════════════
router.post('/trail/event', async (req, res) => {
  try {
    const {
      lotNumber, submissionId, eventType, eventLabel, eventTimestamp,
      gpsLat, gpsLng, locationName, handlerName, handlerPhone,
      carrierName, carrierDot, driverName, driverLicense,
      truckPlate, trailerNumber, containerNumber, sealNumber,
      tempCelsius, weightKg, cbpEntryNumber, cbpExamType,
      inspectorBadge, fdaPnNumber, bondNumber, waitTimeMin, notes, photo
    } = req.body;

    const tempF = tempCelsius ? (tempCelsius * 9/5 + 32).toFixed(1) : null;
    const weightLbs = weightKg ? (weightKg * 2.20462).toFixed(1) : null;

    const r = await pool.query(`
      INSERT INTO shipment_trail
        (lot_number, submission_id, event_type, event_label, event_timestamp,
         gps_lat, gps_lng, location_name, handler_name, handler_phone,
         carrier_name, carrier_dot, driver_name, driver_license,
         truck_plate, trailer_number, container_number, seal_number,
         temp_celsius, temp_fahrenheit, weight_kg, weight_lbs,
         cbp_entry_number, cbp_exam_type, inspector_badge, fda_pn_number,
         bond_number, wait_time_min, notes, photo_base64)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
              $18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30)
      RETURNING *
    `, [
      lotNumber, submissionId||null, eventType, eventLabel,
      eventTimestamp ? new Date(eventTimestamp) : new Date(),
      gpsLat||null, gpsLng||null, locationName,
      handlerName, handlerPhone||null,
      carrierName||null, carrierDot||null, driverName||null, driverLicense||null,
      truckPlate||null, trailerNumber||null, containerNumber||null, sealNumber||null,
      tempCelsius||null, tempF, weightKg||null, weightLbs,
      cbpEntryNumber||null, cbpExamType||null, inspectorBadge||null,
      fdaPnNumber||null, bondNumber||null,
      waitTimeMin||null, notes||null, photo||null
    ]);

    // Update FDA Prior Notice on submission if provided
    if (fdaPnNumber && submissionId) {
      await pool.query('UPDATE field_submissions SET fda_prior_notice=$1 WHERE id=$2', [fdaPnNumber, submissionId]);
    }
    if (cbpEntryNumber && submissionId) {
      await pool.query('UPDATE field_submissions SET customs_broker=$2 WHERE id=$2',
        [req.body.customsBroker||null, submissionId]);
    }

    res.json({ success:true, data:r.rows[0] });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

router.get('/trail/:lotNumber', async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT * FROM shipment_trail WHERE lot_number=$1 ORDER BY event_timestamp ASC',
      [req.params.lotNumber]
    );
    // Compute timing deltas
    const events = r.rows;
    for (let i = 1; i < events.length; i++) {
      const prev = new Date(events[i-1].event_timestamp);
      const curr = new Date(events[i].event_timestamp);
      events[i].delta_minutes = Math.round((curr - prev) / 60000);
      events[i].delta_hours   = (events[i].delta_minutes / 60).toFixed(1);
    }
    // Compute total transit time
    const totalMin = events.length > 1
      ? Math.round((new Date(events[events.length-1].event_timestamp) - new Date(events[0].event_timestamp)) / 60000)
      : 0;

    res.json({
      success: true,
      count: events.length,
      totalTransitHours: (totalMin/60).toFixed(1),
      data: events
    });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════
// PACKAGING SHEDS
// ═══════════════════════════════════════════════════════════════════════════
router.get('/sheds', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM packaging_sheds WHERE active=true ORDER BY name');
    res.json({ success:true, data:r.rows });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

router.post('/sheds', async (req, res) => {
  try {
    const {
      name, fdaRegNumber, usdaEstNumber, address, city, state, country,
      gpsLat, gpsLng, coldStorageMt, haccpOnFile, primusCert, globalGapCert,
      sqfCert, brcCert, senasicaAuth, certExpiry, inspectionDate,
      capacityCasesDay, contactName, contactPhone, contactEmail,
      approvedCommodities, approvedPorts, notes
    } = req.body;
    const r = await pool.query(`
      INSERT INTO packaging_sheds
        (name, fda_reg_number, usda_est_number, address, city, state, country,
         gps_lat, gps_lng, cold_storage_mt, haccp_on_file, primus_cert,
         global_gap_cert, sqf_cert, brc_cert, senasica_auth, cert_expiry,
         inspection_date, capacity_cases_day, contact_name, contact_phone,
         contact_email, approved_commodities, approved_ports, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
              $18,$19,$20,$21,$22,$23,$24,$25)
      RETURNING *
    `, [
      name, fdaRegNumber, usdaEstNumber||null, address, city, state,
      country||'Mexico', gpsLat||null, gpsLng||null, coldStorageMt||null,
      !!haccpOnFile, !!primusCert, !!globalGapCert, !!sqfCert,
      !!brcCert, !!senasicaAuth,
      certExpiry||null, inspectionDate||null, capacityCasesDay||null,
      contactName, contactPhone, contactEmail,
      approvedCommodities||[], approvedPorts||[], notes
    ]);
    res.json({ success:true, data:r.rows[0] });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════
// BUYER OFFERS
// ═══════════════════════════════════════════════════════════════════════════
router.post('/offer', async (req, res) => {
  try {
    const {
      listingId, lotNumber, buyerName, buyerCompany, buyerEmail, buyerPhone,
      offerPrice, currency, priceUnit, quantity, unit,
      packagingType, deliveryTerms, requestedDate, message
    } = req.body;

    const r = await pool.query(`
      INSERT INTO buyer_offers
        (listing_id, lot_number, buyer_name, buyer_company, buyer_email, buyer_phone,
         offer_price, currency, price_unit, quantity, unit,
         packaging_type, delivery_terms, requested_date, message)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING *
    `, [listingId, lotNumber||null, buyerName, buyerCompany, buyerEmail, buyerPhone,
        offerPrice, currency||'USD', priceUnit, quantity, unit,
        packagingType, deliveryTerms, requestedDate||null, message]);

    const listing = await pool.query('SELECT * FROM market_listings WHERE id=$1', [listingId]);
    const l = listing.rows[0] || {};

    await notify(
      OWNER_EMAIL,
      `[CM OFFER] ${buyerCompany||buyerName} → ${l.product} @ $${offerPrice}/${priceUnit} | Lot: ${lotNumber||l.lot_number}`,
      `<div style="font-family:Arial,sans-serif;max-width:600px">
        <h2 style="color:#cba658">Buyer Offer Received</h2>
        <p><strong>Lot:</strong> ${lotNumber||l.lot_number||'N/A'}</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr><td style="padding:6px;color:#666">Buyer</td><td style="padding:6px;font-weight:bold">${buyerName} — ${buyerCompany||''}</td></tr>
          <tr><td style="padding:6px;color:#666">Contact</td><td style="padding:6px">${buyerEmail} | ${buyerPhone}</td></tr>
          <tr><td style="padding:6px;color:#666">Product</td><td style="padding:6px">${l.product||'N/A'}</td></tr>
          <tr><td style="padding:6px;color:#666">Asking</td><td style="padding:6px">$${l.asking_price} ${l.price_unit}</td></tr>
          <tr><td style="padding:6px;color:#666">Offer</td><td style="padding:6px;color:#16a34a;font-weight:bold">$${offerPrice} ${priceUnit} (${currency})</td></tr>
          <tr><td style="padding:6px;color:#666">Quantity</td><td style="padding:6px">${quantity} ${unit}</td></tr>
          <tr><td style="padding:6px;color:#666">Delivery</td><td style="padding:6px">${deliveryTerms||'N/A'} · ${requestedDate||'Flexible'}</td></tr>
          ${message ? `<tr><td style="padding:6px;color:#666">Message</td><td style="padding:6px">${message}</td></tr>` : ''}
        </table>
      </div>`
    );
    res.json({ success:true, data:r.rows[0] });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

router.get('/offers', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT o.*, l.product, l.asking_price, l.price_unit, l.lot_number as listing_lot
      FROM buyer_offers o LEFT JOIN market_listings l ON o.listing_id = l.id
      ORDER BY o.created_at DESC LIMIT 200
    `);
    res.json({ success:true, count:r.rows.length, data:r.rows });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

router.get('/offers/:listingId', async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT * FROM buyer_offers WHERE listing_id=$1 ORDER BY created_at DESC',
      [req.params.listingId]
    );
    res.json({ success:true, count:r.rows.length, data:r.rows });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

router.post('/offer/:id/respond', async (req, res) => {
  try {
    const { action, counterPrice, counterNotes } = req.body;
    const validActions = ['accept','reject','counter'];
    if (!validActions.includes(action)) return res.status(400).json({ success:false, error:'Invalid action' });

    const r = await pool.query(`
      UPDATE buyer_offers SET status=$1, counter_price=$2, counter_notes=$3, responded_at=NOW()
      WHERE id=$4 RETURNING *
    `, [action==='counter'?'countered':action+'ed', counterPrice||null, counterNotes||null, req.params.id]);

    if (!r.rows.length) return res.status(404).json({ success:false, error:'Not found' });

    if (action === 'accept') {
      const offer   = r.rows[0];
      const listing = await pool.query('SELECT * FROM market_listings WHERE id=$1', [offer.listing_id]);
      const l = listing.rows[0] || {};
      const subtotal  = parseFloat(offer.offer_price) * parseFloat(offer.quantity);
      const logistics = parseFloat(l.logistics_cost||0);
      const total     = subtotal + logistics;
      const htsInfo   = HTS_CODES[l.product?.split(' ')[0]] || null;

      await pool.query(`
        INSERT INTO purchase_orders
          (po_number, lot_number, geodna_hash, listing_id, offer_id,
           product, variety, grade, quantity, unit, packaging_type,
           unit_price, currency, logistics_cost, subtotal, total,
           hts_code, hts_duty, port_of_entry, payment_terms,
           ship_date, delivery_date, factoring_eligible, usmca_eligible, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
                $17,$18,$19,$20,$21,$22,$23,$24,$25)
      `, [
        genPONumber(), l.lot_number, l.geodna_hash,
        offer.listing_id, offer.id,
        l.product, l.variety, l.grade,
        offer.quantity, offer.unit, offer.packaging_type,
        offer.offer_price, offer.currency, logistics, subtotal, total,
        htsInfo?.hts||null, htsInfo?.duty||null,
        l.port_of_entry, 'Net 30',
        offer.requested_date||null, null, true, true, 'issued'
      ]);
    }
    res.json({ success:true, data:r.rows[0] });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════
// PO + INVOICE
// ═══════════════════════════════════════════════════════════════════════════
router.get('/po', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM purchase_orders ORDER BY created_at DESC LIMIT 100');
    res.json({ success:true, count:r.rows.length, data:r.rows });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

router.post('/po/generate', async (req, res) => {
  try {
    const {
      listingId, offerId, sellerEntityId, buyerEntityId, lotNumber,
      product, variety, grade, quantity, unit, packagingType,
      unitPrice, currency, logisticsCost, portOfEntry, paymentTerms,
      shipDate, deliveryDate, importerOfRecord, customsBroker, notes
    } = req.body;
    const subtotal  = parseFloat(unitPrice) * parseFloat(quantity);
    const logistics = parseFloat(logisticsCost||0);
    const total     = subtotal + logistics;
    const htsInfo   = HTS_CODES[product?.split(' ')[0]] || null;
    const r = await pool.query(`
      INSERT INTO purchase_orders
        (po_number, lot_number, listing_id, offer_id, seller_entity_id, buyer_entity_id,
         product, variety, grade, quantity, unit, packaging_type,
         unit_price, currency, logistics_cost, subtotal, total,
         hts_code, hts_duty, port_of_entry, payment_terms,
         ship_date, delivery_date, importer_of_record, customs_broker, notes, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
              $18,$19,$20,$21,$22,$23,$24,$25,$26,$27)
      RETURNING *
    `, [
      genPONumber(), lotNumber||null, listingId||null, offerId||null,
      sellerEntityId||null, buyerEntityId||null,
      product, variety, grade, quantity, unit, packagingType,
      unitPrice, currency||'USD', logistics, subtotal, total,
      htsInfo?.hts||null, htsInfo?.duty||null,
      portOfEntry, paymentTerms||'Net 30',
      shipDate||null, deliveryDate||null,
      importerOfRecord||null, customsBroker||null, notes, 'issued'
    ]);
    res.json({ success:true, data:r.rows[0] });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

router.get('/invoice', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT i.*, p.po_number, p.product, p.lot_number as po_lot, p.hts_code
      FROM invoices i LEFT JOIN purchase_orders p ON i.po_id = p.id
      ORDER BY i.created_at DESC LIMIT 100
    `);
    res.json({ success:true, count:r.rows.length, data:r.rows });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

router.post('/invoice/generate', async (req, res) => {
  try {
    const { poId, paymentTerms, advanceRate } = req.body;
    const po = await pool.query('SELECT * FROM purchase_orders WHERE id=$1', [poId]);
    if (!po.rows.length) return res.status(404).json({ success:false, error:'PO not found' });
    const p = po.rows[0];
    const dueDate = new Date();
    const terms = parseInt((paymentTerms||p.payment_terms||'Net 30').replace(/\D/g,'')) || 30;
    dueDate.setDate(dueDate.getDate() + terms);
    const advance = parseFloat(advanceRate||80);
    const advAmt  = (p.total * advance) / 100;
    const r = await pool.query(`
      INSERT INTO invoices
        (invoice_number, lot_number, po_id, seller_entity_id, buyer_entity_id,
         amount, currency, payment_terms, due_date, advance_rate, advance_amount, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *
    `, [genINVNumber(), p.lot_number, poId,
        p.seller_entity_id, p.buyer_entity_id,
        p.total, p.currency, paymentTerms||p.payment_terms,
        dueDate, advance, advAmt, 'issued']);
    await pool.query('UPDATE purchase_orders SET status=$1 WHERE id=$2', ['invoiced', poId]);
    res.json({ success:true, data:r.rows[0] });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════
// FACTORING
// ═══════════════════════════════════════════════════════════════════════════
router.get('/factoring-partners', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM factoring_partners WHERE active=true ORDER BY name');
    res.json({ success:true, data:r.rows });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

router.post('/factoring-partners', async (req, res) => {
  try {
    const { name, contactName, email, phone, website, advanceRate, feeRate, minInvoice, maxInvoice, industries, notes } = req.body;
    const r = await pool.query(`
      INSERT INTO factoring_partners (name, contact_name, email, phone, website, advance_rate, fee_rate, min_invoice, max_invoice, industries, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
    `, [name, contactName, email, phone, website, advanceRate||80, feeRate||3, minInvoice||5000, maxInvoice||null, industries||[], notes]);
    res.json({ success:true, data:r.rows[0] });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

router.post('/factoring/submit', async (req, res) => {
  try {
    const { invoiceId, partnerId } = req.body;
    const [inv, partner] = await Promise.all([
      pool.query('SELECT i.*, p.po_number, p.product, p.lot_number FROM invoices i LEFT JOIN purchase_orders p ON i.po_id=p.id WHERE i.id=$1', [invoiceId]),
      pool.query('SELECT * FROM factoring_partners WHERE id=$1', [partnerId])
    ]);
    if (!inv.rows.length || !partner.rows.length) return res.status(404).json({ success:false, error:'Not found' });
    const i  = inv.rows[0];
    const fp = partner.rows[0];
    await pool.query(`UPDATE invoices SET factoring_partner_id=$1, factoring_status='submitted', factoring_submitted_at=NOW() WHERE id=$2`, [partnerId, invoiceId]);

    await notify(fp.email, `[CM Products International] Invoice Factoring Request — ${i.invoice_number} | Lot ${i.lot_number}`,
      `<div style="font-family:Arial,sans-serif;max-width:600px">
        <h2 style="color:#1a56db">Invoice Factoring Request</h2>
        <p>Dear ${fp.contact_name||fp.name},</p>
        <p>CM Products International / MexaUSA Food Group, Inc. submits the following invoice for factoring:</p>
        <table style="width:100%;border-collapse:collapse">
          <tr style="background:#f3f4f6"><td style="padding:8px;font-weight:bold">Invoice #</td><td style="padding:8px">${i.invoice_number}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Lot #</td><td style="padding:8px">${i.lot_number||'N/A'}</td></tr>
          <tr style="background:#f3f4f6"><td style="padding:8px;font-weight:bold">PO #</td><td style="padding:8px">${i.po_number||'N/A'}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Product</td><td style="padding:8px">${i.product||'Fresh Produce'}</td></tr>
          <tr style="background:#f3f4f6"><td style="padding:8px;font-weight:bold">Amount</td><td style="padding:8px;font-size:18px;color:#16a34a"><strong>$${parseFloat(i.amount).toLocaleString()} ${i.currency}</strong></td></tr>
          <tr><td style="padding:8px;font-weight:bold">Payment Terms</td><td style="padding:8px">${i.payment_terms}</td></tr>
          <tr style="background:#f3f4f6"><td style="padding:8px;font-weight:bold">Advance Rate</td><td style="padding:8px">${i.advance_rate}% = $${parseFloat(i.advance_amount||0).toLocaleString()}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Due Date</td><td style="padding:8px">${i.due_date ? new Date(i.due_date).toLocaleDateString() : 'N/A'}</td></tr>
        </table>
        <p style="margin-top:16px;color:#666">CM Products International | MexaUSA Food Group | NMLS #337526 | saul@mexausafg.com</p>
      </div>`
    );
    await notify(OWNER_EMAIL, `[FACTORING SUBMITTED] ${i.invoice_number} → ${fp.name}`,
      `<p>Invoice ${i.invoice_number} ($${parseFloat(i.amount).toLocaleString()}) submitted to ${fp.name}. Advance: ${i.advance_rate}% = $${parseFloat(i.advance_amount||0).toLocaleString()}</p>`
    );
    res.json({ success:true, message:`Submitted to ${fp.name}` });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════
// ENTITIES
// ═══════════════════════════════════════════════════════════════════════════
router.get('/seller-entities',  async (req, res) => { try { const r = await pool.query('SELECT * FROM seller_entities WHERE active=true ORDER BY entity_name'); res.json({ success:true, data:r.rows }); } catch(e) { res.status(500).json({ success:false, error:e.message }); } });
router.get('/buyer-entities',   async (req, res) => { try { const r = await pool.query('SELECT * FROM buyer_entities WHERE active=true ORDER BY company_name'); res.json({ success:true, data:r.rows }); } catch(e) { res.status(500).json({ success:false, error:e.message }); } });

router.post('/seller-entities', async (req, res) => {
  try {
    const { entityName, entityType, rfc, curp, domicilioFiscal, ciudad, estado, cp, pais, clabe, bankMx, accountUsd, routingUsd, bankUsd, contactName, contactEmail, contactPhone } = req.body;
    const r = await pool.query(`INSERT INTO seller_entities (entity_name,entity_type,rfc,curp,domicilio_fiscal,ciudad,estado,cp,pais,clabe,bank_mx,account_usd,routing_usd,bank_usd,contact_name,contact_email,contact_phone) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [entityName,entityType,rfc,curp,domicilioFiscal,ciudad,estado,cp,pais||'Mexico',clabe,bankMx,accountUsd,routingUsd,bankUsd,contactName,contactEmail,contactPhone]);
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, error:e.message }); }
});

router.post('/buyer-entities', async (req, res) => {
  try {
    const { companyName, tradeName, taxId, country, address, city, state, zip, contactName, contactEmail, contactPhone, bankName, accountNumber, routingNumber, creditLimit, paymentTerms, importerOfRecordNumber, fmcBondNumber } = req.body;
    const r = await pool.query(`INSERT INTO buyer_entities (company_name,trade_name,tax_id,country,address,city,state,zip,contact_name,contact_email,contact_phone,bank_name,account_number,routing_number,credit_limit,payment_terms,importer_of_record_number,fmc_bond_number) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
      [companyName,tradeName,taxId,country||'USA',address,city,state,zip,contactName,contactEmail,contactPhone,bankName,accountNumber,routingNumber,creditLimit||null,paymentTerms||'Net 30',importerOfRecordNumber||null,fmcBondNumber||null]);
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, error:e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════
// HTS LOOKUP + USDA PRICE PROXY
// ═══════════════════════════════════════════════════════════════════════════
router.get('/hts-lookup', async (req, res) => {
  try {
    const { product } = req.query;
    const key    = product?.split(' ')[0];
    const direct = HTS_CODES[key];
    if (direct) return res.json({ success:true, data:direct, product:key });
    // Try partial match
    const match = Object.entries(HTS_CODES).find(([k]) => k.toLowerCase().includes(key?.toLowerCase()));
    if (match) return res.json({ success:true, data:match[1], product:match[0] });
    res.json({ success:false, error:'No HTS code found', suggestion:'Use CBP CROSS system at hts.usitc.gov' });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

router.get('/usda-price', async (req, res) => {
  try {
    const { commodity } = req.query;
    const term = commodity?.split(' ')[0] || 'avocado';
    const url  = `https://api.ams.usda.gov/services/v1.2/reports?commodity=${encodeURIComponent(term)}&API_KEY=${USDA_KEY}&report_begin_date=${new Date(Date.now()-7*86400000).toISOString().split('T')[0]}&limit=5`;
    const r = await fetch(url);
    const data = await r.json();
    res.json({ success:true, data:data.results||[] });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════
// EMAIL DOCUMENT PACKAGE
// ═══════════════════════════════════════════════════════════════════════════
router.post('/email-docs', async (req, res) => {
  try {
    const { lotNumber, recipients, docTypes, senderNote } = req.body;
    const verifyUrl = `https://mexausafg.com/verify/${lotNumber}`;
    const sub = await pool.query('SELECT * FROM field_submissions WHERE lot_number=$1', [lotNumber]);
    if (!sub.rows.length) return res.status(404).json({ success:false, error:'Lot not found' });
    const s = sub.rows[0];

    const toList = Array.isArray(recipients) ? recipients.join(',') : recipients;

    await notify(toList,
      `[CM Products International] Produce Documentation Package — Lot ${lotNumber}`,
      `<div style="font-family:Arial,sans-serif;max-width:700px;color:#333">
        <div style="background:#0f172a;padding:24px;text-align:center">
          <div style="color:#cba658;font-size:22px;font-weight:900;letter-spacing:3px">CM PRODUCTS INTERNATIONAL</div>
          <div style="color:#94a3b8;font-size:12px;margin-top:4px">MexaUSA Food Group, Inc. | saul@mexausafg.com</div>
        </div>
        <div style="padding:24px">
          <h2 style="color:#0f172a;margin-bottom:4px">Produce Documentation Package</h2>
          <p style="color:#64748b;font-size:13px;margin-bottom:20px">The following documentation is provided for customs clearance, import compliance, and quality verification.</p>
          ${senderNote ? `<div style="background:#fef8e7;border-left:4px solid #cba658;padding:12px;margin-bottom:20px;font-size:13px">${senderNote}</div>` : ''}
          <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:16px;margin-bottom:20px">
            <div style="font-size:11px;color:#64748b;margin-bottom:4px">LOT IDENTIFICATION</div>
            <div style="font-size:24px;font-weight:900;color:#0f172a">${lotNumber}</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px">GeoDNA Hash: ${s.geodna_hash}</div>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
            <tr style="background:#f1f5f9"><td colspan="2" style="padding:8px;font-weight:700;font-size:11px;letter-spacing:1px">PRODUCT INFORMATION</td></tr>
            <tr><td style="padding:8px;color:#64748b;border-bottom:1px solid #f1f5f9">Product</td><td style="padding:8px;font-weight:600;border-bottom:1px solid #f1f5f9">${s.product} ${s.variety||''}</td></tr>
            <tr><td style="padding:8px;color:#64748b;border-bottom:1px solid #f1f5f9">Grade</td><td style="padding:8px;border-bottom:1px solid #f1f5f9">${s.grade}</td></tr>
            <tr><td style="padding:8px;color:#64748b;border-bottom:1px solid #f1f5f9">Quantity</td><td style="padding:8px;border-bottom:1px solid #f1f5f9">${s.quantity} ${s.unit} · ${s.packaging_type||'N/A'}</td></tr>
            <tr><td style="padding:8px;color:#64748b;border-bottom:1px solid #f1f5f9">Harvest Date</td><td style="padding:8px;border-bottom:1px solid #f1f5f9">${s.harvest_date||'N/A'}</td></tr>
            <tr><td style="padding:8px;color:#64748b;border-bottom:1px solid #f1f5f9">Shelf Life</td><td style="padding:8px;border-bottom:1px solid #f1f5f9">${s.shelf_life_days||'N/A'} days</td></tr>
            <tr style="background:#f1f5f9"><td colspan="2" style="padding:8px;font-weight:700;font-size:11px;letter-spacing:1px">ORIGIN & COMPLIANCE</td></tr>
            <tr><td style="padding:8px;color:#64748b;border-bottom:1px solid #f1f5f9">Farm / Ranch</td><td style="padding:8px;border-bottom:1px solid #f1f5f9">${s.farm_name}</td></tr>
            <tr><td style="padding:8px;color:#64748b;border-bottom:1px solid #f1f5f9">GPS Origin</td><td style="padding:8px;border-bottom:1px solid #f1f5f9">${s.gps_lat ? `${parseFloat(s.gps_lat).toFixed(5)}, ${parseFloat(s.gps_lng).toFixed(5)}` : 'N/A'}</td></tr>
            <tr><td style="padding:8px;color:#64748b;border-bottom:1px solid #f1f5f9">Port of Entry</td><td style="padding:8px;border-bottom:1px solid #f1f5f9">${s.port_of_entry}</td></tr>
            <tr><td style="padding:8px;color:#64748b;border-bottom:1px solid #f1f5f9">HTS Code</td><td style="padding:8px;border-bottom:1px solid #f1f5f9">${s.hts_code||'N/A'} · ${s.hts_duty||''}</td></tr>
            <tr><td style="padding:8px;color:#64748b;border-bottom:1px solid #f1f5f9">FSMA 204</td><td style="padding:8px;border-bottom:1px solid #f1f5f9">${s.fsma204?'✓ COMPLIANT':'✗ N/A'}</td></tr>
            <tr><td style="padding:8px;color:#64748b;border-bottom:1px solid #f1f5f9">Organic</td><td style="padding:8px;border-bottom:1px solid #f1f5f9">${s.organic?'✓ CERTIFIED':'Standard'}</td></tr>
            <tr><td style="padding:8px;color:#64748b;border-bottom:1px solid #f1f5f9">WSSF Score</td><td style="padding:8px;border-bottom:1px solid #f1f5f9">${s.wssf_score ? `${s.wssf_score}/100` : 'Pending lab results'}</td></tr>
            <tr><td style="padding:8px;color:#64748b">FDA Prior Notice</td><td style="padding:8px">${s.fda_prior_notice||'Required before shipment'}</td></tr>
          </table>
          <div style="text-align:center;margin:24px 0">
            <a href="${verifyUrl}" style="background:#cba658;color:#0f172a;padding:14px 32px;text-decoration:none;font-weight:900;font-size:14px;letter-spacing:2px;display:inline-block">VERIFY LOT ONLINE</a>
            <div style="font-size:11px;color:#94a3b8;margin-top:8px">${verifyUrl}</div>
          </div>
          <div style="border-top:1px solid #e2e8f0;padding-top:16px;font-size:11px;color:#94a3b8">
            <p>This document was generated by the CM Products Intelligence Platform.</p>
            <p>CM Products International | MexaUSA Food Group, Inc. | NMLS #337526</p>
            <p>Broker: Everwise Home Loans and Realty | Patent Pending</p>
          </div>
        </div>
      </div>`
    );
    res.json({ success:true, sentTo:toList });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

console.log('[FIELD-AGENT v2] Routes: submit, verify, listings, offers, po, invoice, factoring, food-safety, trail, sheds, entities, hts, usda, email-docs');
module.exports = router;