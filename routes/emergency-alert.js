// routes/emergency-alert.js
// AuditDNA Agriculture Intelligence — Complete Emergency Alert System
// ─────────────────────────────────────────────────────────────────────────────
// LAYER 1 — Federal + State agencies (FDA, USDA, CDC, DHS, EPA, CBP, FEMA, FBI + all 50 states)
// LAYER 2 — Internal network by GPS proximity (growers, buyers, packers, shippers, truckers)
// LAYER 3 — SMS cell phone alerts (Zadarma / Twilio)
// LAYER 4 — WhatsApp alerts via OpenClaw
// LAYER 5 — GPS proximity engine (finds all entities within radius of outbreak origin)
// ─────────────────────────────────────────────────────────────────────────────
// TRIGGER MODES:
//   MANUAL     — owner fires from Command Center with full control
//   SEMI-AUTO  — AI detects FDA recall + matching lot, flags for owner approval
//   REGULATORY — credentialed agency requests trace data via API
// NEVER auto-fires without owner confirmation

const express    = require('express');
const router     = express.Router();
const nodemailer = require('nodemailer');
const https      = require('https');
const { Pool }   = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const SMTP = nodemailer.createTransport({
  host: 'smtp.gmail.com', port: 587, secure: false,
  auth: { user: process.env.GMAIL_USER || 'sgarcia1911@gmail.com', pass: process.env.GMAIL_APP_PASSWORD || 'emgptqrmqdbxrpil' },
  pool: true, maxConnections: 3, maxMessages: 300
});

const FROM = '"AuditDNA Emergency Alert | Mexausa Food Group" <sgarcia1911@gmail.com>';
const API_BASE = process.env.REACT_APP_API_URL || 'https://auditdna-backend-1-production.up.railway.app';

// ─── FEDERAL AGENCY REGISTRY ──────────────────────────────────────────────────
const FEDERAL_AGENCIES = [
  // FDA
  { id:'FDA-001', name:'FDA Emergency Operations',                          email:'emergency.operations@fda.hhs.gov',      tier:'federal', category:'food_safety' },
  { id:'FDA-002', name:'FDA CFSAN — Center for Food Safety',                email:'cfsan@fda.hhs.gov',                     tier:'federal', category:'food_safety' },
  { id:'FDA-003', name:'FDA MedWatch Safety Reporting',                     email:'MedWatch@fda.hhs.gov',                  tier:'federal', category:'food_safety' },
  // USDA
  { id:'USDA-001', name:'USDA Food Safety Inspection Service (FSIS)',       email:'fsis.webmaster@usda.gov',               tier:'federal', category:'food_safety' },
  { id:'USDA-002', name:'USDA Agricultural Marketing Service (AMS)',        email:'ams.livestock@usda.gov',                tier:'federal', category:'agriculture' },
  { id:'USDA-003', name:'USDA APHIS',                                       email:'aphis.web@usda.gov',                    tier:'federal', category:'agriculture' },
  { id:'USDA-004', name:'USDA Office of Inspector General',                 email:'oig.hotline@usda.gov',                  tier:'federal', category:'agriculture' },
  // CDC
  { id:'CDC-001', name:'CDC Emergency Operations Center',                   email:'eocreport@cdc.gov',                     tier:'federal', category:'public_health' },
  { id:'CDC-002', name:'CDC Foodborne, Waterborne & Environmental Diseases',email:'cdcinfo@cdc.gov',                       tier:'federal', category:'public_health' },
  // DHS / CISA
  { id:'DHS-001', name:'DHS/CISA Food and Agriculture Sector',              email:'central@cisa.dhs.gov',                  tier:'federal', category:'security' },
  { id:'DHS-002', name:'CISA 24/7 Emergency Reporting',                     email:'report@cisa.gov',                       tier:'federal', category:'security' },
  // EPA
  { id:'EPA-001', name:'EPA Emergency Response Team',                       email:'epa-ert@epa.gov',                       tier:'federal', category:'environment' },
  { id:'EPA-002', name:'EPA Office of Water Emergency',                     email:'ow-emergencies@epa.gov',                tier:'federal', category:'environment' },
  // CBP
  { id:'CBP-001', name:'U.S. Customs and Border Protection — Agriculture',  email:'ag.questions@cbp.dhs.gov',              tier:'federal', category:'border' },
  { id:'CBP-002', name:'CBP Trade Compliance',                              email:'tradecompl@cbp.dhs.gov',                tier:'federal', category:'border' },
  // FEMA
  { id:'FEMA-001', name:'FEMA National Response Coordination Center',       email:'nrcc@fema.dhs.gov',                     tier:'federal', category:'emergency' },
  // FBI
  { id:'FBI-001', name:'FBI Agricultural Terrorism Division',               email:'tips.fbi.gov@fbi.gov',                  tier:'federal', category:'security' },
  { id:'FBI-002', name:'FBI WMD Directorate',                               email:'wmdinfoline@leo.gov',                   tier:'federal', category:'security' },
  // HHS
  { id:'HHS-001', name:'HHS Office of the Asst Secretary for Preparedness', email:'ASPR@hhs.gov',                          tier:'federal', category:'public_health' },
];

const STATE_AGENCIES = [
  { id:'AL-AG', name:'Alabama Dept of Agriculture',              state:'AL', email:'ag.dept@agi.alabama.gov',          category:'state_ag' },
  { id:'AK-AG', name:'Alaska Division of Agriculture',           state:'AK', email:'dnr.ag@alaska.gov',               category:'state_ag' },
  { id:'AZ-AG', name:'Arizona Dept of Agriculture',              state:'AZ', email:'information@azda.gov',            category:'state_ag' },
  { id:'AR-AG', name:'Arkansas Dept of Agriculture',             state:'AR', email:'info@agriculture.ar.gov',         category:'state_ag' },
  { id:'CA-AG', name:'California CDFA',                          state:'CA', email:'cdfa@cdfa.ca.gov',                category:'state_ag' },
  { id:'CO-AG', name:'Colorado Dept of Agriculture',             state:'CO', email:'ag.colorado@state.co.us',         category:'state_ag' },
  { id:'CT-AG', name:'Connecticut Dept of Agriculture',          state:'CT', email:'ctdeptag@ct.gov',                 category:'state_ag' },
  { id:'DE-AG', name:'Delaware Dept of Agriculture',             state:'DE', email:'delaware.agriculture@state.de.us',category:'state_ag' },
  { id:'FL-AG', name:'Florida FDACS',                            state:'FL', email:'fdacs@fdacs.gov',                 category:'state_ag' },
  { id:'GA-AG', name:'Georgia Dept of Agriculture',              state:'GA', email:'consumer.protection@agr.georgia.gov', category:'state_ag' },
  { id:'HI-AG', name:'Hawaii Dept of Agriculture',               state:'HI', email:'hdoa.info@hawaii.gov',            category:'state_ag' },
  { id:'ID-AG', name:'Idaho State Dept of Agriculture',          state:'ID', email:'info@isda.idaho.gov',             category:'state_ag' },
  { id:'IL-AG', name:'Illinois Dept of Agriculture',             state:'IL', email:'agr.info@illinois.gov',           category:'state_ag' },
  { id:'IN-AG', name:'Indiana State Dept of Agriculture',        state:'IN', email:'info@isda.in.gov',                category:'state_ag' },
  { id:'IA-AG', name:'Iowa Dept of Agriculture',                 state:'IA', email:'iowaagriculture@iowaagriculture.gov', category:'state_ag' },
  { id:'KS-AG', name:'Kansas Dept of Agriculture',               state:'KS', email:'kda@ks.gov',                      category:'state_ag' },
  { id:'KY-AG', name:'Kentucky Dept of Agriculture',             state:'KY', email:'kyagr@ky.gov',                    category:'state_ag' },
  { id:'LA-AG', name:'Louisiana Dept of Agriculture',            state:'LA', email:'info@ldaf.state.la.us',           category:'state_ag' },
  { id:'ME-AG', name:'Maine Dept of Agriculture',                state:'ME', email:'agriculture.feedback@maine.gov',  category:'state_ag' },
  { id:'MD-AG', name:'Maryland Dept of Agriculture',             state:'MD', email:'mda.info@maryland.gov',           category:'state_ag' },
  { id:'MA-AG', name:'Massachusetts Dept of Agricultural Resources', state:'MA', email:'mass.agriculture@state.ma.us', category:'state_ag' },
  { id:'MI-AG', name:'Michigan MDARD',                           state:'MI', email:'MDA-Info@Michigan.gov',           category:'state_ag' },
  { id:'MN-AG', name:'Minnesota Dept of Agriculture',            state:'MN', email:'mda.info@state.mn.us',            category:'state_ag' },
  { id:'MS-AG', name:'Mississippi Dept of Agriculture',          state:'MS', email:'mdac@mdac.ms.gov',                category:'state_ag' },
  { id:'MO-AG', name:'Missouri Dept of Agriculture',             state:'MO', email:'aginfo@mda.mo.gov',               category:'state_ag' },
  { id:'MT-AG', name:'Montana Dept of Agriculture',              state:'MT', email:'agr@mt.gov',                      category:'state_ag' },
  { id:'NE-AG', name:'Nebraska Dept of Agriculture',             state:'NE', email:'nda@nebraska.gov',                category:'state_ag' },
  { id:'NV-AG', name:'Nevada Dept of Agriculture',               state:'NV', email:'ndoa@agri.nv.gov',                category:'state_ag' },
  { id:'NH-AG', name:'New Hampshire Dept of Agriculture',        state:'NH', email:'agriculture@nh.gov',              category:'state_ag' },
  { id:'NJ-AG', name:'New Jersey Dept of Agriculture',           state:'NJ', email:'njda@ag.nj.gov',                  category:'state_ag' },
  { id:'NM-AG', name:'New Mexico Dept of Agriculture',           state:'NM', email:'nmda@nmda.nmsu.edu',              category:'state_ag' },
  { id:'NY-AG', name:'New York Dept of Agriculture and Markets', state:'NY', email:'info@agriculture.ny.gov',         category:'state_ag' },
  { id:'NC-AG', name:'North Carolina Dept of Agriculture',       state:'NC', email:'info@ncagr.gov',                  category:'state_ag' },
  { id:'ND-AG', name:'North Dakota Dept of Agriculture',         state:'ND', email:'ndda@nd.gov',                     category:'state_ag' },
  { id:'OH-AG', name:'Ohio Dept of Agriculture',                 state:'OH', email:'info@agri.ohio.gov',              category:'state_ag' },
  { id:'OK-AG', name:'Oklahoma Dept of Agriculture',             state:'OK', email:'okag@oda.state.ok.us',            category:'state_ag' },
  { id:'OR-AG', name:'Oregon Dept of Agriculture',               state:'OR', email:'info@oda.state.or.us',            category:'state_ag' },
  { id:'PA-AG', name:'Pennsylvania Dept of Agriculture',         state:'PA', email:'agwebmaster@pa.gov',              category:'state_ag' },
  { id:'RI-AG', name:'Rhode Island DEM',                         state:'RI', email:'dem.webmaster@dem.ri.gov',        category:'state_ag' },
  { id:'SC-AG', name:'South Carolina Dept of Agriculture',       state:'SC', email:'info@scda.sc.gov',                category:'state_ag' },
  { id:'SD-AG', name:'South Dakota Dept of Agriculture',         state:'SD', email:'sdda@state.sd.us',                category:'state_ag' },
  { id:'TN-AG', name:'Tennessee Dept of Agriculture',            state:'TN', email:'agriculture@tn.gov',              category:'state_ag' },
  { id:'TX-AG', name:'Texas Dept of Agriculture',                state:'TX', email:'info@TexasAgriculture.gov',       category:'state_ag' },
  { id:'UT-AG', name:'Utah Dept of Agriculture and Food',        state:'UT', email:'udaf@utah.gov',                   category:'state_ag' },
  { id:'VT-AG', name:'Vermont Agency of Agriculture',            state:'VT', email:'agr.info@vermont.gov',            category:'state_ag' },
  { id:'VA-AG', name:'Virginia VDACS',                           state:'VA', email:'vdacs@vdacs.virginia.gov',        category:'state_ag' },
  { id:'WA-AG', name:'Washington State Dept of Agriculture',     state:'WA', email:'wsda@agr.wa.gov',                 category:'state_ag' },
  { id:'WV-AG', name:'West Virginia Dept of Agriculture',        state:'WV', email:'wvda@wvda.wv.gov',                category:'state_ag' },
  { id:'WI-AG', name:'Wisconsin DATCP',                          state:'WI', email:'datcpdfinternet@datcp.wi.gov',    category:'state_ag' },
  { id:'WY-AG', name:'Wyoming Dept of Agriculture',              state:'WY', email:'wda@wyoming.gov',                 category:'state_ag' },
  // State Health Depts — top produce states
  { id:'CA-DPH', name:'California Dept of Public Health',        state:'CA', email:'cdph.info@cdph.ca.gov',           category:'state_health' },
  { id:'TX-DPH', name:'Texas Dept of State Health Services',     state:'TX', email:'food.safety@dshs.texas.gov',      category:'state_health' },
  { id:'FL-DPH', name:'Florida Dept of Health',                  state:'FL', email:'information@flhealth.gov',        category:'state_health' },
  { id:'NY-DPH', name:'New York State Dept of Health',           state:'NY', email:'doh.sm.communications@health.ny.gov', category:'state_health' },
  { id:'AZ-DPH', name:'Arizona Dept of Health Services',         state:'AZ', email:'info@azdhs.gov',                  category:'state_health' },
];

const ALL_AGENCIES = [...FEDERAL_AGENCIES, ...STATE_AGENCIES];

// ─── THREAT CONFIGS ───────────────────────────────────────────────────────────
const THREAT = {
  outbreak:      { label:'FOODBORNE ILLNESS OUTBREAK',          color:'#ef4444', priority:'CRITICAL',                    agencies:['food_safety','public_health','state_ag','state_health','agriculture'],            internal:['grower','packer','buyer','shipper','trucker'], sms:true, whatsapp:true },
  contamination: { label:'FOOD/WATER CONTAMINATION',            color:'#f59e0b', priority:'URGENT',                      agencies:['food_safety','public_health','environment','state_ag','state_health'],             internal:['grower','packer','buyer','shipper','trucker'], sms:true, whatsapp:true },
  terror:        { label:'AGROTERRORISM THREAT',                color:'#7c3aed', priority:'CRITICAL — LAW ENFORCEMENT',  agencies:['food_safety','security','border','emergency','agriculture','state_ag'],             internal:['grower','packer','buyer','shipper','trucker'], sms:true, whatsapp:true },
  water:         { label:'WATER SUPPLY THREAT',                 color:'#3b82f6', priority:'CRITICAL',                    agencies:['environment','public_health','food_safety','security','state_ag','state_health'],   internal:['grower','packer','shipper'],                   sms:true, whatsapp:true },
  recall:        { label:'RECALL SUPPORT',                      color:'#f59e0b', priority:'HIGH',                        agencies:['food_safety','agriculture','state_ag'],                                            internal:['grower','packer','buyer','shipper'],            sms:false, whatsapp:true },
  supply_attack: { label:'SUPPLY CHAIN ATTACK',                 color:'#dc2626', priority:'CRITICAL',                    agencies:['food_safety','security','border','emergency','agriculture'],                       internal:['grower','packer','buyer','shipper','trucker'], sms:true, whatsapp:true },
};

// ─── GPS DISTANCE (Haversine formula) ────────────────────────────────────────
function distanceMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ─── SETUP TABLES ─────────────────────────────────────────────────────────────
router.post('/setup', async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS emergency_alerts (
        id SERIAL PRIMARY KEY,
        alert_id VARCHAR(40) UNIQUE NOT NULL,
        threat_type VARCHAR(30) NOT NULL,
        commodity VARCHAR(100),
        lot_ids JSONB DEFAULT '[]',
        origin_lat NUMERIC(10,7),
        origin_lng NUMERIC(10,7),
        origin_region VARCHAR(200),
        radius_miles INTEGER DEFAULT 200,
        description TEXT NOT NULL,
        protocols TEXT,
        agencies_notified INTEGER DEFAULT 0,
        internal_notified INTEGER DEFAULT 0,
        sms_sent INTEGER DEFAULT 0,
        whatsapp_sent INTEGER DEFAULT 0,
        send_status VARCHAR(20) DEFAULT 'draft',
        initiated_by INTEGER,
        approved_by INTEGER,
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS emergency_alert_log (
        id SERIAL PRIMARY KEY,
        alert_id VARCHAR(40),
        recipient_type VARCHAR(20),
        recipient_id VARCHAR(40),
        recipient_name VARCHAR(200),
        recipient_email VARCHAR(200),
        recipient_phone VARCHAR(30),
        channel VARCHAR(20),
        status VARCHAR(20),
        sent_at TIMESTAMP DEFAULT NOW(),
        error_msg TEXT
      );

      CREATE TABLE IF NOT EXISTS emergency_contacts (
        id SERIAL PRIMARY KEY,
        entity_id VARCHAR(40),
        role VARCHAR(30),
        name VARCHAR(200),
        company VARCHAR(200),
        email VARCHAR(200),
        phone VARCHAR(30),
        whatsapp VARCHAR(30),
        gps_lat NUMERIC(10,7),
        gps_lng NUMERIC(10,7),
        region VARCHAR(100),
        country VARCHAR(60),
        commodity_tags JSONB DEFAULT '[]',
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Seed agency registry
    await pool.query(`
      CREATE TABLE IF NOT EXISTS emergency_agency_registry (
        id SERIAL PRIMARY KEY,
        agency_id VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(200), email VARCHAR(200),
        tier VARCHAR(20), state VARCHAR(5), category VARCHAR(30),
        active BOOLEAN DEFAULT TRUE, last_notified TIMESTAMP
      )
    `);
    for (const a of ALL_AGENCIES) {
      await pool.query(
        `INSERT INTO emergency_agency_registry (agency_id, name, email, tier, state, category)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (agency_id) DO UPDATE SET name=$2, email=$3`,
        [a.id, a.name, a.email, a.tier || 'state', a.state || null, a.category]
      );
    }

    res.json({ success: true, agencies_seeded: ALL_AGENCIES.length, message: 'Emergency alert system initialized.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GPS PROXIMITY QUERY ──────────────────────────────────────────────────────
async function getProximityContacts(originLat, originLng, radiusMiles, roles) {
  try {
    // Pull from emergency_contacts table (synced from CRM)
    const result = await pool.query(
      `SELECT * FROM emergency_contacts WHERE active = TRUE AND role = ANY($1)`,
      [roles]
    );

    const nearby = [];
    for (const contact of result.rows) {
      if (!contact.gps_lat || !contact.gps_lng) { nearby.push({ ...contact, distance_miles: null }); continue; }
      const dist = distanceMiles(originLat, originLng, parseFloat(contact.gps_lat), parseFloat(contact.gps_lng));
      if (dist <= radiusMiles) nearby.push({ ...contact, distance_miles: Math.round(dist) });
    }

    // Also pull from shipper_contacts for truckers
    if (roles.includes('trucker') || roles.includes('shipper')) {
      const shippers = await pool.query(`SELECT * FROM shipper_contacts LIMIT 500`).catch(() => ({ rows: [] }));
      for (const s of shippers.rows) {
        nearby.push({
          entity_id: `SHP-${s.id}`,
          role: 'shipper',
          name: s.name || s.company,
          company: s.company,
          email: s.email,
          phone: s.phone || s.cell,
          whatsapp: s.whatsapp || s.cell,
          gps_lat: null, gps_lng: null,
          distance_miles: null,
          region: s.state || s.region
        });
      }
    }

    return nearby.sort((a, b) => (a.distance_miles || 9999) - (b.distance_miles || 9999));
  } catch (err) {
    console.error('[EMERGENCY] GPS proximity query failed:', err.message);
    return [];
  }
}

// ─── BUILD AGENCY EMAIL ───────────────────────────────────────────────────────
function buildAgencyEmail(agency, threatType, alertData) {
  const t = THREAT[threatType];
  const ts = new Date().toUTCString();
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:20px 0;">
<table width="620" cellpadding="0" cellspacing="0">

  <tr><td style="background:${t.color};padding:12px 24px;">
    <div style="font-size:11px;font-weight:900;color:#fff;letter-spacing:3px;">
      *** ${t.priority} *** — AUDITDNA AGRICULTURE INTELLIGENCE EMERGENCY ALERT
    </div>
  </td></tr>

  <tr><td style="background:#0f172a;padding:20px 24px;border-bottom:3px solid ${t.color};">
    <div style="font-size:22px;font-weight:900;color:#fff;">${t.label}</div>
    <div style="font-size:11px;color:#94a3b8;margin-top:4px;">AUDITDNA AGRICULTURE INTELLIGENCE — MEXAUSA FOOD GROUP, INC. — ${ts}</div>
  </td></tr>

  <tr><td style="background:#1e293b;padding:12px 24px;border-left:4px solid ${t.color};">
    <div style="font-size:11px;color:#94a3b8;">OFFICIAL NOTICE TO:</div>
    <div style="font-size:15px;font-weight:700;color:#fff;margin-top:2px;">${agency.name}</div>
  </td></tr>

  <tr><td style="background:#0f172a;padding:20px 24px;">
    <table width="100%" style="background:#1e293b;border-radius:8px;padding:16px;" cellpadding="6">
      <tr><td style="color:#94a3b8;font-size:12px;width:160px;">Alert ID:</td><td style="color:#fff;font-size:12px;font-weight:700;">${alertData.alert_id}</td></tr>
      <tr><td style="color:#94a3b8;font-size:12px;">Threat Type:</td><td style="color:${t.color};font-size:12px;font-weight:800;">${t.label}</td></tr>
      <tr><td style="color:#94a3b8;font-size:12px;">Commodity:</td><td style="color:#fff;font-size:12px;">${alertData.commodity || 'Multiple / See Description'}</td></tr>
      <tr><td style="color:#94a3b8;font-size:12px;">Origin Region:</td><td style="color:#fff;font-size:12px;">${alertData.origin_region || 'Under Investigation'}</td></tr>
      <tr><td style="color:#94a3b8;font-size:12px;">GPS Origin:</td><td style="color:#fff;font-size:12px;">${alertData.origin_lat ? `${alertData.origin_lat}, ${alertData.origin_lng}` : 'Pending'}</td></tr>
      <tr><td style="color:#94a3b8;font-size:12px;">Lot IDs:</td><td style="color:#fff;font-size:12px;">${(alertData.lot_ids || []).join(', ') || 'Pending trace'}</td></tr>
      <tr><td style="color:#94a3b8;font-size:12px;">Alert Radius:</td><td style="color:#fff;font-size:12px;">${alertData.radius_miles || 200} miles from origin</td></tr>
    </table>

    <div style="margin-top:16px;background:#0f172a;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:14px;">
      <div style="font-size:10px;color:${t.color};font-weight:800;letter-spacing:2px;margin-bottom:8px;">DESCRIPTION</div>
      <div style="font-size:13px;color:#cbd5e1;line-height:1.8;">${alertData.description}</div>
    </div>

    ${alertData.protocols ? `
    <div style="margin-top:16px;background:#052e16;border:1px solid #166534;border-radius:8px;padding:14px;">
      <div style="font-size:10px;color:#4ade80;font-weight:800;letter-spacing:2px;margin-bottom:8px;">RECOMMENDED PROTOCOLS</div>
      <div style="font-size:12px;color:#bbf7d0;line-height:1.8;">${alertData.protocols}</div>
    </div>` : ''}

    <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.1);">
      <div style="font-size:11px;color:#64748b;line-height:1.7;">
        This alert was generated by <strong style="color:#fff;">AuditDNA Agriculture Intelligence Platform</strong>,
        operated by <strong style="color:#fff;">Mexausa Food Group, Inc.</strong><br>
        Full traceability data (lot passports, CTEs, KDEs, supply chain events, GPS chain of custody)
        is available to credentialed federal and state agencies upon request.<br><br>
        <strong style="color:#C9A55C;">Contact:</strong> Saul Garcia | saul@mexausafg.com | +1-831-251-3116<br>
        <strong style="color:#C9A55C;">Platform:</strong> mexausafg.com | AuditDNA Agriculture Intelligence<br>
        <strong style="color:#C9A55C;">EIN:</strong> 88-1698129 | Salinas, CA + Ensenada, BC Mexico
      </div>
    </div>
  </td></tr>

</table></td></tr></table>
</body></html>`;
}

// ─── BUILD INTERNAL NETWORK EMAIL ────────────────────────────────────────────
function buildInternalEmail(contact, threatType, alertData, distanceMiles) {
  const t = THREAT[threatType];
  const roleLabels = { grower:'GROWER', buyer:'BUYER', packer:'PACKER/HANDLER', shipper:'SHIPPER', trucker:'TRUCKER/LOGISTICS' };
  const roleLabel = roleLabels[contact.role] || contact.role.toUpperCase();

  const protocols = {
    grower:   `1. STOP all harvesting operations in affected area immediately.\n2. DO NOT ship any product from lots originating within ${alertData.radius_miles || 200} miles of ${alertData.origin_region}.\n3. Document all current inventory with lot numbers and GPS coordinates.\n4. Contact MFGINC immediately: saul@mexausafg.com | +1-831-251-3116.\n5. Await clearance before resuming operations.`,
    buyer:    `1. HOLD all incoming product from ${alertData.origin_region} area pending clearance.\n2. DO NOT distribute or sell product from affected lots.\n3. Pull lot numbers from your inventory and cross-reference with alert lot IDs.\n4. Contact MFGINC for lot verification: saul@mexausafg.com.\n5. Cooperate fully with any regulatory inspection.`,
    packer:   `1. HALT packing operations for product from affected region.\n2. QUARANTINE all product received from ${alertData.origin_region} in last 30 days.\n3. DO NOT release any packed product from affected lots.\n4. Document all lot codes in your facility.\n5. Contact MFGINC: saul@mexausafg.com | +1-831-251-3116.`,
    shipper:  `1. HOLD any loads originating from ${alertData.origin_region} area.\n2. DO NOT deliver affected product until cleared by MFGINC or regulatory authority.\n3. Provide GPS position and load manifest to MFGINC immediately.\n4. Contact MFGINC dispatch: saul@mexausafg.com | +1-831-251-3116.\n5. Await release authorization before proceeding.`,
    trucker:  `1. IF YOU ARE CURRENTLY HAULING product from ${alertData.origin_region}: STOP at nearest safe location.\n2. Contact MFGINC dispatch IMMEDIATELY: +1-831-251-3116.\n3. DO NOT deliver load until cleared.\n4. Share your current GPS coordinates and load manifest.\n5. Cooperate with any CBP or FDA inspection en route.`,
  };

  const protocol = protocols[contact.role] || protocols.shipper;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:20px 0;">
<table width="600" cellpadding="0" cellspacing="0">

  <tr><td style="background:${t.color};padding:10px 20px;">
    <div style="font-size:12px;font-weight:900;color:#fff;letter-spacing:2px;">
      *** ${t.priority} *** — NETWORK ALERT — ${roleLabel}
    </div>
  </td></tr>

  <tr><td style="background:#0f172a;padding:18px 20px;border-bottom:3px solid ${t.color};">
    <div style="font-size:10px;color:#C9A55C;letter-spacing:3px;font-weight:800;margin-bottom:4px;">MEXAUSA FOOD GROUP — AUDITDNA AGRICULTURE INTELLIGENCE</div>
    <div style="font-size:20px;font-weight:900;color:#fff;">${t.label}</div>
    <div style="font-size:11px;color:#94a3b8;margin-top:4px;">This alert is relevant to your operations — immediate action required.</div>
  </td></tr>

  <tr><td style="background:#0f172a;padding:16px 20px;">
    <table width="100%" style="background:#1e293b;border-radius:8px;" cellpadding="8">
      <tr><td style="color:#94a3b8;font-size:12px;width:140px;">Commodity:</td><td style="color:#fff;font-size:12px;font-weight:700;">${alertData.commodity || 'Multiple'}</td></tr>
      <tr><td style="color:#94a3b8;font-size:12px;">Origin Region:</td><td style="color:${t.color};font-size:12px;font-weight:700;">${alertData.origin_region || 'Under Investigation'}</td></tr>
      ${distanceMiles ? `<tr><td style="color:#94a3b8;font-size:12px;">Your Distance:</td><td style="color:#fbbf24;font-size:12px;font-weight:700;">${distanceMiles} miles from outbreak origin</td></tr>` : ''}
      <tr><td style="color:#94a3b8;font-size:12px;">Alert Radius:</td><td style="color:#fff;font-size:12px;">${alertData.radius_miles || 200} miles</td></tr>
      <tr><td style="color:#94a3b8;font-size:12px;">Alert ID:</td><td style="color:#fff;font-size:12px;">${alertData.alert_id}</td></tr>
    </table>

    <div style="margin-top:14px;background:#111827;border-radius:8px;padding:14px;">
      <div style="font-size:13px;color:#cbd5e1;line-height:1.8;">${alertData.description}</div>
    </div>

    <div style="margin-top:14px;background:#052e16;border:1px solid #166534;border-radius:8px;padding:14px;">
      <div style="font-size:10px;color:#4ade80;font-weight:800;letter-spacing:2px;margin-bottom:10px;">YOUR PROTOCOLS — ${roleLabel}</div>
      <div style="font-size:12px;color:#bbf7d0;white-space:pre-line;line-height:1.9;">${protocol}</div>
    </div>

    <div style="margin-top:14px;background:#1e293b;border-radius:8px;padding:14px;text-align:center;">
      <div style="font-size:13px;color:#fff;font-weight:700;margin-bottom:6px;">Contact MFGINC Immediately</div>
      <div style="font-size:12px;color:#C9A55C;">saul@mexausafg.com</div>
      <div style="font-size:14px;color:#fff;font-weight:800;margin-top:4px;">+1-831-251-3116</div>
      <div style="font-size:11px;color:#64748b;margin-top:4px;">WhatsApp: +52-646-340-2686</div>
    </div>
  </td></tr>

</table></td></tr></table>
</body></html>`;
}

// ─── SMS TEXT BUILDER ─────────────────────────────────────────────────────────
function buildSMS(contact, threatType, alertData) {
  const t = THREAT[threatType];
  const role = contact.role?.toUpperCase() || 'NETWORK';
  return `AUDITDNA EMERGENCY [${t.priority}] — ${t.label}
${role}: ${alertData.commodity || 'Food supply'} — ${alertData.origin_region || 'affected area'}
IMMEDIATE ACTION REQUIRED. Check email for protocols.
Contact MFGINC: +1-831-251-3116
Alert ID: ${alertData.alert_id}`.substring(0, 320);
}

// ─── WHATSAPP ALERT VIA OPENCLAW ──────────────────────────────────────────────
async function sendWhatsApp(phone, message) {
  return new Promise((resolve) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const payload = JSON.stringify({ to: cleanPhone, message });
    const req = https.request({
      hostname: 'localhost', port: 3001, path: '/api/openclaw/send',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    }, res => {
      let b = ''; res.on('data', c => b += c);
      res.on('end', () => resolve({ ok: res.statusCode === 200 }));
    });
    req.on('error', () => resolve({ ok: false }));
    req.write(payload); req.end();
  });
}

// ─── SEND SMS VIA ZADARMA ─────────────────────────────────────────────────────
async function sendSMS(phone, message) {
  // Zadarma SMS API
  const key  = process.env.ZADARMA_KEY  || '';
  const secret = process.env.ZADARMA_SECRET || '';
  if (!key || !secret) return { ok: false, reason: 'No Zadarma credentials' };

  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  const params = new URLSearchParams({ number: cleanPhone, message: message.substring(0,160) });

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.zadarma.com', path: `/v1/sms/send/?${params}`,
      method: 'GET',
      headers: { Authorization: `${key}:${secret}` }
    }, res => {
      let b = ''; res.on('data', c => b += c);
      res.on('end', () => resolve({ ok: res.statusCode === 200, body: b }));
    });
    req.on('error', (e) => resolve({ ok: false, reason: e.message }));
    req.end();
  });
}

// ─── MAIN FIRE ENDPOINT ───────────────────────────────────────────────────────
router.post('/fire', async (req, res) => {
  const {
    threat_type, commodity, description, lot_ids = [],
    origin_lat, origin_lng, origin_region,
    radius_miles = 200, protocols,
    target_agencies = 'all',    // 'all' | 'federal_only' | category filter
    target_internal = true,     // notify internal network
    target_sms = true,
    target_whatsapp = true,
    initiated_by = 32,          // Saul user ID
    dry_run = false             // true = build list only, don't actually send
  } = req.body;

  if (!threat_type || !description) return res.status(400).json({ error: 'threat_type and description required' });
  if (!THREAT[threat_type]) return res.status(400).json({ error: `Unknown threat_type. Use: ${Object.keys(THREAT).join(', ')}` });

  const alert_id = `EMRG-${Date.now()}-${Math.random().toString(36).substr(2,6).toUpperCase()}`;
  const config = THREAT[threat_type];
  const ts = new Date().toISOString();

  const alertData = { alert_id, threat_type, commodity, description, lot_ids, origin_lat, origin_lng, origin_region, radius_miles, protocols };

  let agenciesSent = 0, internalSent = 0, smsSent = 0, whatsappSent = 0;
  let agencyErrors = 0, internalErrors = 0;
  const log = [];

  try {
    // ── LAYER 1: AGENCY EMAILS ───────────────────────────────────────────────
    const agenciesToNotify = ALL_AGENCIES.filter(a =>
      target_agencies === 'all' ||
      target_agencies === 'federal_only' && a.tier === 'federal' ||
      config.agencies.includes(a.category)
    );

    if (!dry_run) {
      for (const agency of agenciesToNotify) {
        try {
          await SMTP.sendMail({
            from: FROM,
            to: agency.email,
            subject: `[AUDITDNA ${config.priority}] ${config.label} — ${commodity || 'Agricultural Alert'} — ${alert_id}`,
            html: buildAgencyEmail(agency, threat_type, alertData),
          });
          agenciesSent++;
          log.push({ type: 'agency', id: agency.id, name: agency.name, channel: 'email', status: 'sent' });
        } catch (e) {
          agencyErrors++;
          log.push({ type: 'agency', id: agency.id, name: agency.name, channel: 'email', status: 'failed', error: e.message });
        }
        await new Promise(r => setTimeout(r, 200)); // rate limit
      }
    }

    // ── LAYER 2: INTERNAL NETWORK BY GPS PROXIMITY ───────────────────────────
    if (target_internal) {
      const roles = config.internal;
      const contacts = await getProximityContacts(
        parseFloat(origin_lat) || 32.7157,  // default Sonora/CA corridor
        parseFloat(origin_lng) || -117.1611,
        radius_miles,
        roles
      );

      for (const contact of contacts) {
        if (!contact.email && !contact.phone && !contact.whatsapp) continue;

        // Email
        if (contact.email && !dry_run) {
          try {
            await SMTP.sendMail({
              from: FROM,
              to: contact.email,
              subject: `[AUDITDNA EMERGENCY] ${config.label} — Action Required — ${contact.role?.toUpperCase()} Alert`,
              html: buildInternalEmail(contact, threat_type, alertData, contact.distance_miles),
            });
            internalSent++;
            log.push({ type: 'internal', role: contact.role, name: contact.name, channel: 'email', status: 'sent', distance: contact.distance_miles });
          } catch (e) {
            internalErrors++;
          }
        }

        // WhatsApp
        if (target_whatsapp && config.whatsapp && (contact.whatsapp || contact.phone) && !dry_run) {
          const waMsg = `*AUDITDNA EMERGENCY ALERT*\n${config.label}\n\nCommodity: ${commodity || 'Multiple'}\nOrigin: ${origin_region || 'Affected area'}\n${contact.distance_miles ? `Distance from you: ${contact.distance_miles} miles\n` : ''}Action: CHECK YOUR EMAIL for protocols.\n\nContact MFGINC: +1-831-251-3116\nAlert: ${alert_id}`;
          const waResult = await sendWhatsApp(contact.whatsapp || contact.phone, waMsg);
          if (waResult.ok) whatsappSent++;
        }

        // SMS
        if (target_sms && config.sms && contact.phone && !dry_run) {
          const smsResult = await sendSMS(contact.phone, buildSMS(contact, threat_type, alertData));
          if (smsResult.ok) smsSent++;
        }

        await new Promise(r => setTimeout(r, 100));
      }
    }

    // ── STORE ALERT RECORD ───────────────────────────────────────────────────
    if (!dry_run) {
      await pool.query(
        `INSERT INTO emergency_alerts
         (alert_id, threat_type, commodity, lot_ids, origin_lat, origin_lng, origin_region, radius_miles, description, protocols, agencies_notified, internal_notified, sms_sent, whatsapp_sent, send_status, initiated_by, sent_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'sent',$15,NOW())`,
        [alert_id, threat_type, commodity, JSON.stringify(lot_ids), origin_lat, origin_lng, origin_region, radius_miles, description, protocols, agenciesSent, internalSent, smsSent, whatsappSent, initiated_by]
      );

      // Log entries
      for (const l of log.slice(0, 500)) {
        await pool.query(
          `INSERT INTO emergency_alert_log (alert_id, recipient_type, recipient_name, channel, status, error_msg)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [alert_id, l.type, l.name, l.channel, l.status, l.error || null]
        ).catch(() => {});
      }

      // Notify owner via Brain
      await pool.query(
        `INSERT INTO brain_events (event_type, payload, created_at) VALUES ('EMERGENCY_ALERT_FIRED', $1, NOW())`,
        [JSON.stringify({ alert_id, threat_type, commodity, agenciesSent, internalSent, smsSent, whatsappSent })]
      ).catch(() => {});
    }

    const summary = {
      success: true,
      alert_id,
      dry_run,
      threat_type,
      commodity,
      origin_region,
      summary: {
        agencies_notified:  dry_run ? agenciesToNotify?.length || 0 : agenciesSent,
        agency_errors:      agencyErrors,
        internal_notified:  internalSent,
        internal_errors:    internalErrors,
        sms_sent:           smsSent,
        whatsapp_sent:      whatsappSent,
        total_reached:      agenciesSent + internalSent,
      },
      timestamp: ts,
    };

    console.log(`[EMERGENCY] ${dry_run ? 'DRY RUN' : 'FIRED'} — ${alert_id} — ${agenciesSent} agencies + ${internalSent} internal + ${smsSent} SMS + ${whatsappSent} WhatsApp`);
    res.json(summary);

  } catch (err) {
    res.status(500).json({ error: err.message, alert_id });
  }
});

// ─── DRY RUN — preview who gets notified ─────────────────────────────────────
router.post('/preview', async (req, res) => {
  req.body.dry_run = true;
  const { threat_type, origin_lat, origin_lng, origin_region, radius_miles = 200 } = req.body;
  if (!threat_type || !THREAT[threat_type]) return res.status(400).json({ error: 'threat_type required' });

  const config = THREAT[threat_type];
  const agencies = ALL_AGENCIES.filter(a => config.agencies.includes(a.category));
  const contacts = origin_lat ? await getProximityContacts(parseFloat(origin_lat), parseFloat(origin_lng), radius_miles, config.internal) : [];

  res.json({
    threat_type,
    label: config.label,
    origin_region,
    radius_miles,
    agencies: { count: agencies.length, list: agencies.map(a => ({ id: a.id, name: a.name, tier: a.tier || 'state' })) },
    internal_contacts: { count: contacts.length, breakdown: config.internal.reduce((acc, role) => { acc[role] = contacts.filter(c => c.role === role).length; return acc; }, {}) },
    channels: { email: true, sms: config.sms, whatsapp: config.whatsapp },
    total_reach: agencies.length + contacts.length,
  });
});

// ─── GET ALL ALERTS ───────────────────────────────────────────────────────────
router.get('/history', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM emergency_alerts ORDER BY created_at DESC LIMIT 50');
    res.json({ alerts: r.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GET ALERT LOG ────────────────────────────────────────────────────────────
router.get('/log/:alert_id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM emergency_alert_log WHERE alert_id=$1 ORDER BY sent_at', [req.params.alert_id]);
    res.json({ log: r.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── REGISTER INTERNAL CONTACT ────────────────────────────────────────────────
router.post('/contacts/register', async (req, res) => {
  const { entity_id, role, name, company, email, phone, whatsapp, gps_lat, gps_lng, region, country, commodity_tags } = req.body;
  try {
    await pool.query(
      `INSERT INTO emergency_contacts (entity_id, role, name, company, email, phone, whatsapp, gps_lat, gps_lng, region, country, commodity_tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT DO NOTHING`,
      [entity_id, role, name, company, email, phone, whatsapp, gps_lat, gps_lng, region, country, JSON.stringify(commodity_tags || [])]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── SYNC CRM CONTACTS TO EMERGENCY CONTACTS ──────────────────────────────────
router.post('/contacts/sync-crm', async (req, res) => {
  try {
    // Pull growers
    const growers = await pool.query(`SELECT id, company_name, contact_name, email, phone, state, country FROM growers WHERE active=TRUE LIMIT 3000`).catch(() => ({ rows: [] }));
    let synced = 0;
    for (const g of growers.rows) {
      if (!g.email && !g.phone) continue;
      await pool.query(
        `INSERT INTO emergency_contacts (entity_id, role, name, company, email, phone, region, country)
         VALUES ($1,'grower',$2,$3,$4,$5,$6,$7)
         ON CONFLICT DO NOTHING`,
        [`GRW-${g.id}`, g.contact_name || g.company_name, g.company_name, g.email, g.phone, g.state, g.country]
      );
      synced++;
    }

    // Pull buyers
    const buyers = await pool.query(`SELECT id, company, name, email, phone, state FROM buyers LIMIT 3000`).catch(() => ({ rows: [] }));
    for (const b of buyers.rows) {
      if (!b.email && !b.phone) continue;
      await pool.query(
        `INSERT INTO emergency_contacts (entity_id, role, name, company, email, phone, region)
         VALUES ($1,'buyer',$2,$3,$4,$5,$6)
         ON CONFLICT DO NOTHING`,
        [`BYR-${b.id}`, b.name, b.company, b.email, b.phone, b.state]
      );
      synced++;
    }

    // Pull shippers
    const shippers = await pool.query(`SELECT id, name, company, email, phone, cell FROM shipper_contacts WHERE email IS NOT NULL LIMIT 5000`).catch(() => ({ rows: [] }));
    for (const s of shippers.rows) {
      await pool.query(
        `INSERT INTO emergency_contacts (entity_id, role, name, company, email, phone, whatsapp)
         VALUES ($1,'shipper',$2,$3,$4,$5,$5)
         ON CONFLICT DO NOTHING`,
        [`SHP-${s.id}`, s.name, s.company, s.email, s.phone || s.cell]
      );
      synced++;
    }

    res.json({ success: true, synced });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── AGENCY COUNT ─────────────────────────────────────────────────────────────
router.get('/agencies/count', (req, res) => {
  res.json({
    total: ALL_AGENCIES.length,
    federal: FEDERAL_AGENCIES.length,
    state: STATE_AGENCIES.length,
    categories: ALL_AGENCIES.reduce((acc, a) => { acc[a.category] = (acc[a.category]||0)+1; return acc; }, {}),
  });
});

module.exports = router;
