// GROWER COMPLIANCE GATE ? C:\AuditDNA\backend\routes\grower-compliance.js
const express = require('express');
const { pingRegistration } = require('../utils/notify_ping');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const jwt     = require('jsonwebtoken');
const { getPool } = require('../db');
const pool = require('../db');
const JWT_SECRET = process.env.JWT_SECRET || 'auditdna_super_jwt_secret';

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'grower-docs');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename:    (req, file, cb) => cb(null, 'grower_' + (req.grower?.id||'x') + '_' + Date.now() + '_' + file.originalname.replace(/[^a-zA-Z0-9._-]/g,'_'))
});
const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf','.jpg','.jpeg','.png','.webp'];
  if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
  else cb(new Error('PDF and images only'), false);
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 25*1024*1024 } });

const authRequired = (req, res, next) => {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ error: 'No token' });
  try { req.grower = jwt.verify(h.replace('Bearer ',''), JWT_SECRET); next(); }
  catch (e) { res.status(401).json({ error: 'Invalid token' }); }
};
const adminRequired = (req, res, next) => authRequired(req, res, () => {
  if (!['admin','owner'].includes(req.grower?.role)) return res.status(403).json({ error: 'Admin only' });
  next();
});

const REQUIRED_DOCS = [
  { doc_key:'business_license',   name_en:'Business License / Company Registration',  name_es:'Licencia Comercial / Registro de Empresa' },
  { doc_key:'fsma_food_safety',   name_en:'FSMA Food Safety Plan',                     name_es:'Plan de Seguridad Alimentaria FSMA' },
  { doc_key:'gap_gmp_cert',       name_en:'GAP / GMP Certificate',                     name_es:'Certificado GAP / BPM' },
  { doc_key:'phytosanitary_cert', name_en:'USDA / SENASICA Phytosanitary Certificate', name_es:'Certificado Fitosanitario USDA / SENASICA' },
  { doc_key:'insurance_cert',     name_en:'Liability Insurance Certificate',            name_es:'Certificado de Seguro de Responsabilidad' },
  { doc_key:'tax_id',             name_en:'W-9 / RFC Tax Identification',               name_es:'Identificacion Fiscal W-9 / RFC' },
  { doc_key:'grower_agreement',   name_en:'Signed Mexausa Food Group Grower Agreement',        name_es:'Acuerdo de Productor Mexausa Food Group Firmado' },
];

// GET /api/growers/compliance/:id
router.get('/compliance/:id', authRequired, async (req, res) => {
  const pool = getPool(req);
  const id   = parseInt(req.params.id);
  if (req.grower.id !== id && !['admin','owner'].includes(req.grower.role))
    return res.status(403).json({ error: 'Access denied' });
  try {
    const [gr, docs] = await Promise.all([
      pool.query('SELECT id,email,company_name,compliance_status,docs_complete,admin_bypass,bypass_expires_at,bypass_note FROM grower_profiles WHERE id=$1',[id]),
      pool.query('SELECT doc_type,file_name,verified,rejected,reject_reason,created_at FROM grower_documents WHERE grower_id=$1 ORDER BY created_at DESC',[id])
    ]);
    if (!gr.rows.length) return res.status(404).json({ error: 'Not found' });
    const g = gr.rows[0];
    const bypassActive = g.admin_bypass && (!g.bypass_expires_at || new Date(g.bypass_expires_at) > new Date());
    const checklist = REQUIRED_DOCS.map(rd => {
      const found = docs.rows.find(d => d.doc_type === rd.doc_key);
      return { doc_key:rd.doc_key, name_en:rd.name_en, name_es:rd.name_es,
               uploaded:!!found, verified:found?.verified||false, rejected:found?.rejected||false,
               reject_reason:found?.reject_reason||null, file_name:found?.file_name||null };
    });
    const allUploaded = checklist.every(d => d.uploaded);
    if (allUploaded !== g.docs_complete)
      await pool.query('UPDATE grower_profiles SET docs_complete=$1,compliance_status=$2 WHERE id=$3',[allUploaded, allUploaded?'complete':'pending', id]);
    res.json({ grower_id:id, company:g.company_name, access_granted:allUploaded||bypassActive,
               bypass_active:bypassActive, bypass_note:g.bypass_note, bypass_expires:g.bypass_expires_at,
               all_uploaded:allUploaded, missing_count:checklist.filter(d=>!d.uploaded).length, checklist });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/growers/documents/upload
router.post('/documents/upload', authRequired, upload.single('file'), async (req, res) => {
  const pool = getPool(req);
  const { doc_type, grower_id } = req.body;
  const targetId = parseInt(grower_id) || req.grower.id;
  if (!req.file) return res.status(400).json({ error: 'No file' });
  if (!doc_type)  return res.status(400).json({ error: 'doc_type required' });
  if (!REQUIRED_DOCS.find(d => d.doc_key === doc_type)) return res.status(400).json({ error: 'Invalid doc_type' });
  if (targetId !== req.grower.id && !['admin','owner'].includes(req.grower.role))
    return res.status(403).json({ error: 'Access denied' });
  try {
    const fileUrl  = '/uploads/grower-docs/' + req.file.filename;
    const existing = await pool.query('SELECT id FROM grower_documents WHERE grower_id=$1 AND doc_type=$2 LIMIT 1',[targetId,doc_type]);
    if (existing.rows.length) {
      await pool.query('UPDATE grower_documents SET file_url=$1,file_name=$2,file_size=$3,mime_type=$4,verified=false,rejected=false,reject_reason=NULL,created_at=NOW() WHERE grower_id=$5 AND doc_type=$6',
        [fileUrl,req.file.originalname,req.file.size,req.file.mimetype,targetId,doc_type]);
    } else {
      await pool.query('INSERT INTO grower_documents(grower_id,doc_type,file_url,file_name,file_size,mime_type,verified,rejected) VALUES($1,$2,$3,$4,$5,$6,false,false)',
        [targetId,doc_type,fileUrl,req.file.originalname,req.file.size,req.file.mimetype]);
    }
    const allDocs    = await pool.query('SELECT DISTINCT doc_type FROM grower_documents WHERE grower_id=$1 AND rejected=false',[targetId]);
    const allComplete = REQUIRED_DOCS.every(d => allDocs.rows.map(r=>r.doc_type).includes(d.doc_key));
    if (allComplete) await pool.query('UPDATE grower_profiles SET docs_complete=true,compliance_status=$1 WHERE id=$2',['complete',targetId]);
    res.json({ success:true, doc_type, file_name:req.file.originalname, file_url:fileUrl, all_complete:allComplete });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/growers/admin/bypass/:id
router.post('/admin/bypass/:id', adminRequired, async (req, res) => {
  const pool = getPool(req);
  const id   = parseInt(req.params.id);
  const { bypass, note, expires_days } = req.body;
  const expiresAt = expires_days ? new Date(Date.now() + parseInt(expires_days)*86400000) : null;
  try {
    await pool.query('UPDATE grower_profiles SET admin_bypass=$1,bypass_note=$2,bypass_expires_at=$3,bypass_granted_by=$4 WHERE id=$5',
      [!!bypass, note||null, expiresAt, req.grower.id, id]);
    res.json({ success:true, bypass:!!bypass, expires_at:expiresAt });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/growers/admin/pending-docs
router.get('/admin/pending-docs', adminRequired, async (req, res) => {
  const pool = getPool(req);
  try {
    const result = await pool.query('SELECT id,first_name,last_name,email,company_name,compliance_status,docs_complete,admin_bypass,bypass_expires_at FROM grower_profiles WHERE docs_complete=false ORDER BY created_at DESC LIMIT 100');
    const growers = await Promise.all(result.rows.map(async g => {
      const docs    = await pool.query('SELECT DISTINCT doc_type FROM grower_documents WHERE grower_id=$1',[g.id]);
      const uploaded = docs.rows.map(d=>d.doc_type);
      const missing  = REQUIRED_DOCS.filter(d=>!uploaded.includes(d.doc_key)).map(d=>d.doc_key);
      return { ...g, uploaded_docs:uploaded, missing_docs:missing };
    }));
    res.json({ total:growers.length, growers });
  } catch(e) { res.status(500).json({ error: e.message }); }
});



// ══ GROWER TRUST SCORE ENGINE ══════════════════════════════════════════════

// GET /grower-trust-score/:growerId
router.get('/grower-trust-score/:growerId', async (req, res) => {
  const db = req.app.get('db') || global.db;
  if (!db) return res.status(503).json({ error: 'DB unavailable' });
  const { growerId } = req.params;
  try {
    const [certs, ctes, water, soil, alerts] = await Promise.all([
      db.query(`SELECT * FROM compliance_certs WHERE grower_id=$1`, [growerId]).catch(()=>({rows:[]})),
      db.query(`SELECT COUNT(*) as n, MAX(event_date) as last_event FROM production_declarations WHERE grower_id=$1`, [growerId]).catch(()=>({rows:[{n:0}]})),
      db.query(`SELECT COUNT(*) as n, SUM(CASE WHEN ecoli>0 THEN 1 ELSE 0 END) as violations FROM intake_water_tests WHERE grower_id=$1`, [growerId]).catch(()=>({rows:[{n:0,violations:0}]})),
      db.query(`SELECT COUNT(*) as n FROM intake_soil_reports WHERE grower_id=$1`, [growerId]).catch(()=>({rows:[{n:0}]})),
      db.query(`SELECT COUNT(*) as n FROM compliance_alerts WHERE grower_id=$1 AND created_at > NOW() - INTERVAL '12 months'`, [growerId]).catch(()=>({rows:[{n:0}]})),
    ]);
    const activeCerts = certs.rows.filter(c => !c.expiry_date || new Date(c.expiry_date) > new Date());
    const expiredCerts = certs.rows.filter(c => c.expiry_date && new Date(c.expiry_date) <= new Date());
    const cteCount = parseInt(ctes.rows[0]?.n||0);
    const waterTests = parseInt(water.rows[0]?.n||0);
    const waterViolations = parseInt(water.rows[0]?.violations||0);
    const soilReports = parseInt(soil.rows[0]?.n||0);
    const alertCount = parseInt(alerts.rows[0]?.n||0);
    // Score components (max 100)
    const certScore     = Math.min(activeCerts.length * 15, 30);
    const traceScore    = Math.min(cteCount * 2, 25);
    const waterScore    = waterTests > 0 ? (waterViolations === 0 ? 20 : 5) : 0;
    const soilScore     = Math.min(soilReports * 5, 10);
    const penaltyScore  = Math.max(0, (expiredCerts.length * -5) + (alertCount * -8));
    const baseScore     = 15; // registered grower baseline
    const total = Math.max(0, Math.min(100, baseScore + certScore + traceScore + waterScore + soilScore + penaltyScore));
    const tier = total >= 80 ? 'PLATINUM' : total >= 60 ? 'GOLD' : total >= 40 ? 'SILVER' : 'BRONZE';
    res.json({ ok:true, grower_id:growerId, trust_score:total, tier,
      breakdown:{ base:baseScore, certs:certScore, traceability:traceScore, water:waterScore, soil:soilScore, penalties:penaltyScore },
      active_certs: activeCerts.map(c=>c.cert_type), expired_certs: expiredCerts.length,
      cte_events: cteCount, water_tests: waterTests, water_violations: waterViolations,
      buyer_access: total >= 60 ? ['Walmart','Kroger','Whole Foods','Costco','Target'] : total >= 40 ? ['Regional distributors','Food service'] : ['Direct sales only'],
      bank_eligible: total >= 50,
      note:'Score powers buyer marketplace visibility + factoring eligibility + export certification',
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /globalgap-umbrella — umbrella certification cost-share program
router.get('/globalgap-umbrella', (req, res) => {
  res.json({ ok:true,
    program:'GlobalGAP Umbrella Certification — Mexausa Food Group, Inc.',
    description:'MFG pools small growers under one umbrella cert. Individual growers share the cost and get GlobalGAP certified without the full audit burden.',
    certs_covered:['GlobalGAP IFA v6','Primus GFS','USDA Organic','FSMA 204','GAP/GHP'],
    cost_share:{ individual_audit:'$3,500-$8,000/year', umbrella_share:'$299-$799/year', savings:'85-92% cost reduction' },
    benefits:['Access Walmart, Costco, Whole Foods supplier programs','Export to EU, Canada, Japan','USDA SBIR grant eligibility','Bank loan collateral (Grower Trust Score)'],
    eligibility:['Registered in LOAF platform','Minimum 2 CTE events recorded','Active water test on file'],
    apply: 'POST /api/grower-compliance/globalgap-umbrella/apply',
    contact:'Mexausa Food Group — Pablo Alatorre, pablo@mexausafg.com',
  });
});

// POST /globalgap-umbrella/apply
router.post('/globalgap-umbrella/apply', async (req, res) => {
  const db = req.app.get('db') || global.db;
  const { grower_id, cert_type, contact_name, email, commodities } = req.body;
  if (!grower_id || !cert_type) return res.status(400).json({ error:'grower_id and cert_type required' });
  if (db) {
    await db.query(
      `INSERT INTO compliance_certs (grower_id, cert_type, status, notes, created_at)
       VALUES ($1,$2,'PENDING_UMBRELLA','Applied via MFG umbrella program',NOW())
       ON CONFLICT DO NOTHING`,
      [grower_id, cert_type]
    ).catch(()=>{});
  }
  res.json({ ok:true, status:'APPLIED', grower_id, cert_type,
    next_steps:['MFG team will contact within 2 business days','Prepare field records and water test results','Assign field inspector visit'],
    timeline:'6-8 weeks to certification',
  });
});

// GET /aphis-eligibility/:commodity — export eligibility check
router.get('/aphis-eligibility/:commodity', (req, res) => {
  const APHIS = {
    avocado: { permit_required:true, treatment:'Hot water: 46.1°C for 65-90 min (Hass <350g)', markets:['USA','Canada','Japan'], restricted:['EU (Anthracnose protocols)'], source:'https://www.aphis.usda.gov/permits' },
    mango:   { permit_required:true, treatment:'Hot water or vapor heat required', markets:['USA','Canada'], restricted:[], source:'https://www.aphis.usda.gov/permits' },
    default: { permit_required:false, treatment:'Inspection at POE only', markets:['USA','Canada','Japan','EU'], restricted:[], source:'https://www.aphis.usda.gov' },
  };
  const c = req.params.commodity.toLowerCase();
  const info = APHIS[c] || APHIS.default;
  res.json({ ok:true, commodity:c, ...info, note:'Verify current requirements at https://www.aphis.usda.gov/import_export/plants' });
});

module.exports = router;

