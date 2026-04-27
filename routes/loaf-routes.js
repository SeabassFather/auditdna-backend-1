// loaf-routes.js — FULL REBUILD — Save to: C:\AuditDNA\backend\routes\loaf-routes.js
const express  = require('express');
const router   = express.Router();
const nodemailer = require('nodemailer');

let intelligence, dataEngine;
try { intelligence = require('../services/loaf-intelligence'); console.log('[loaf-routes] intelligence loaded'); }
catch (e) { console.warn('[loaf-routes] intelligence not found:', e.message); intelligence = { runLOAFIntelligence: async () => ({ sent:0, chainStores:0 }) }; }
try { dataEngine = require('../services/loaf-data-engine'); console.log('[loaf-routes] data engine loaded'); }
catch (e) { console.warn('[loaf-routes] data engine not found:', e.message); dataEngine = { saveSubmission: async()=>null, updateDailyAnalytics: async()=>{}, ensureDataTables: async()=>{}, generateUSDAReport: async()=>({error:'not loaded'}), generateFDAReport: async()=>({error:'not loaded'}), generateSustainabilityReport: async()=>({error:'not loaded'}), generateCorridorIntelligence: async()=>({error:'not loaded'}) }; }

const getDb = () => global.db || require('../db');
const getTransport = () => nodemailer.createTransport({ host: process.env.SMTP_HOST||'smtp.gmail.com', port: parseInt(process.env.SMTP_PORT||'587'), secure:false, auth:{ user:process.env.SMTP_USER, pass:process.env.SMTP_PASS } });
const FROM = `"MexaUSA Food Group — LOAF" <${process.env.SMTP_USER||'sgarcia1911@gmail.com'}>`;
const ADMIN_EMAILS = ['saul@mexausafg.com','sgarcia1911@gmail.com','palt@mfginc.com'];

async function notifyAdmins(action, data, intel) {
  const { commodity, quantity, unit, user, gps } = data;
  const ir = intel || {};
  try {
    const transport = getTransport();
    await transport.sendMail({ from:FROM, to:ADMIN_EMAILS.join(','),
      subject:`[LOAF ${action}] ${commodity} — ${quantity} ${unit} — ${user?.name||'Unknown'}`,
      text:[`Action: ${action}`,`Commodity: ${commodity}`,`Quantity: ${quantity} ${unit}`,`Grower: ${user?.name||'--'} / ${user?.company||'--'} / ${user?.phone||'--'}`,`Region: ${user?.region||'--'}`,`GPS: ${gps?`${gps.lat}, ${gps.lng}`:'Not captured'}`,`Buyers notified: ${ir.sent||0} regular + ${ir.chainStores||0} chain stores`,`Time: ${new Date().toLocaleString()}`].join('\n')
    });
  } catch(e) { console.warn('[loaf-routes] admin notify failed:', e.message); }
}

router.post('/register', async (req, res) => {
  const { name, company, phone, commodity, region, gps } = req.body;
  const db = getDb();
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS loaf_grower_registrations (id SERIAL PRIMARY KEY, name VARCHAR(200), company VARCHAR(200), phone VARCHAR(50), commodity VARCHAR(100), region VARCHAR(200), gps_lat NUMERIC(10,7), gps_lng NUMERIC(10,7), created_at TIMESTAMPTZ DEFAULT NOW())`).catch(()=>{});
    await db.query(`INSERT INTO loaf_grower_registrations (name,company,phone,commodity,region,gps_lat,gps_lng) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [name,company,phone,commodity,region,gps?.lat||null,gps?.lng||null]);
  } catch(e) { console.warn('[LOAF REGISTER]', e.message); }
  res.json({ success:true });
});

router.post('/launch', async (req, res) => {
  const data = req.body;
  if (!data.commodity || !data.quantity) return res.status(400).json({ success:false, error:'Commodity and quantity required' });
  console.log(`[LOAF LAUNCH] ${data.commodity} ${data.quantity} ${data.unit} — ${data.user?.name}`);
  const db = getDb();
  const submissionId = await dataEngine.saveSubmission(db, 'LAUNCH', data, null);
  intelligence.runLOAFIntelligence(db, 'LAUNCH', submissionId, data).then(async r => {
    await dataEngine.updateDailyAnalytics(db, 'LAUNCH', data, r);
    await notifyAdmins('LAUNCH', data, r);
    if (submissionId) db.query('UPDATE loaf_submissions SET intelligence_sent=true,buyers_notified=$1,chains_notified=$2 WHERE id=$3',[r.sent||0,r.chainStores||0,submissionId]).catch(()=>{});
  }).catch(e => console.error('[LOAF LAUNCH] intel error:', e.message));
  res.json({ success:true, submission_id:submissionId, message:`${data.commodity} launched. Matched buyers will be notified automatically.`, action:'LAUNCH' });
});

router.post('/origin', async (req, res) => {
  const data = req.body;
  if (!data.commodity || !data.lot) return res.status(400).json({ success:false, error:'Commodity and lot number required' });
  console.log(`[LOAF ORIGIN] ${data.commodity} Lot:${data.lot} — ${data.user?.name}`);
  const db = getDb();
  const submissionId = await dataEngine.saveSubmission(db, 'ORIGIN', data, null);
  await dataEngine.updateDailyAnalytics(db, 'ORIGIN', data, null);
  await notifyAdmins('ORIGIN', data, null);
  res.json({ success:true, submission_id:submissionId, message:`Origin record created. Traceability logged for USDA/FDA reporting.`, action:'ORIGIN', grade_saved:!!data.grade });
});

router.post('/altruistic', async (req, res) => {
  const data = req.body;
  if (!data.commodity || !data.quantity) return res.status(400).json({ success:false, error:'Commodity and quantity required' });
  console.log(`[LOAF ALTRUISTIC] ${data.commodity} ${data.quantity} ${data.unit} — ${data.user?.name}`);
  const db = getDb();
  const submissionId = await dataEngine.saveSubmission(db, 'ALTRUISTIC', data, null);
  intelligence.runLOAFIntelligence(db, 'ALTRUISTIC', submissionId, data).then(async r => {
    await dataEngine.updateDailyAnalytics(db, 'ALTRUISTIC', data, r);
    await notifyAdmins('ALTRUISTIC', data, r);
    if (data.broadcastOpenClaw) {
      try {
        const http = require('http');
        const body = JSON.stringify({ to:'all', message:`[LOAF ALTRUISTIC] ${data.commodity} surplus available — ${data.quantity} ${data.unit} — ${data.user?.region||'corridor'}. Contact MexaUSA Food Group: +1-831-251-3116` });
        const opts = { hostname:'localhost', port:3001, path:'/api/openclaw/broadcast', method:'POST', headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)} };
        http.request(opts, ()=>{}).write(body);
      } catch(e) { console.warn('[LOAF ALTRUISTIC] OpenClaw error:', e.message); }
    }
    if (submissionId) db.query('UPDATE loaf_submissions SET intelligence_sent=true,buyers_notified=$1,chains_notified=$2 WHERE id=$3',[r.sent||0,r.chainStores||0,submissionId]).catch(()=>{});
  }).catch(e => console.error('[LOAF ALTRUISTIC] intel error:', e.message));
  res.json({ success:true, submission_id:submissionId, message:`${data.commodity} surplus posted. Matched buyers, chain stores, and grower network being notified.`, action:'ALTRUISTIC', openclaw_broadcast:!!data.broadcastOpenClaw });
});

router.post('/factor', async (req, res) => {
  const data = req.body;
  if (!data.buyer || !data.invoiceAmount) return res.status(400).json({ success:false, error:'Buyer name and invoice amount required' });
  console.log(`[LOAF FACTOR] $${data.invoiceAmount} Buyer:${data.buyer} — ${data.user?.name}`);
  const db = getDb();
  const submissionId = await dataEngine.saveSubmission(db, 'FACTOR', data, null);
  await dataEngine.updateDailyAnalytics(db, 'FACTOR', data, null);
  await notifyAdmins('FACTOR', data, null);
  const advance = Math.round(parseFloat(data.invoiceAmount)*0.85*100)/100;
  res.json({ success:true, submission_id:submissionId, message:`Invoice submitted for factoring. Capital partners will be notified. Estimated advance: $${advance.toFixed(2)}.`, estimated_advance:advance, action:'FACTOR' });
});

router.post('/admin-ping', async (req, res) => {
  const { action, user, timestamp } = req.body;
  console.log(`[LOAF ADMIN-PING] ${action} — ${user||'unknown'} — ${timestamp}`);
  res.json({ success:true });
});

router.get('/history', async (req, res) => {
  const { phone, company } = req.query;
  const db = getDb();
  try {
    const r = await db.query(`SELECT id,action,commodity,quantity,unit,price,buyers_notified,chains_notified,submitted_at FROM loaf_submissions WHERE ($1::text IS NULL OR grower_phone=$1) AND ($2::text IS NULL OR LOWER(grower_company) LIKE LOWER($2)) ORDER BY submitted_at DESC LIMIT 50`, [phone||null, company?`%${company}%`:null]);
    res.json({ success:true, submissions:r.rows });
  } catch(e) { res.json({ success:false, error:e.message, submissions:[] }); }
});

router.get('/analytics', async (req, res) => {
  const db = getDb();
  const days = parseInt(req.query.days||'30');
  const start = new Date(Date.now()-days*86400000).toISOString().slice(0,10);
  try {
    await dataEngine.ensureDataTables(db);
    const [s, a] = await Promise.all([
      db.query(`SELECT action, COUNT(*) as count FROM loaf_submissions WHERE submitted_at >= NOW() - INTERVAL '${days} days' GROUP BY action`),
      db.query(`SELECT SUM(waste_prevented_lbs) as waste, SUM(water_use_gallons) as water, SUM(carbon_miles_saved) as carbon, SUM(buyers_notified) as buyers FROM loaf_analytics_daily WHERE report_date >= $1`,[start])
    ]);
    const stats = a.rows[0]||{};
    const breakdown = {};
    s.rows.forEach(r => { breakdown[r.action]=parseInt(r.count); });
    res.json({ success:true, period_days:days, transactions:breakdown, total:Object.values(breakdown).reduce((a,b)=>a+b,0), impact:{ waste_prevented_lbs:Math.round(parseFloat(stats.waste)||0), water_tracked_gallons:Math.round(parseFloat(stats.water)||0), carbon_mt_saved:Math.round((parseFloat(stats.carbon)||0)*1000)/1000, buyers_contacted:parseInt(stats.buyers)||0 } });
  } catch(e) { res.json({ success:false, error:e.message }); }
});

const jwt = require('jsonwebtoken');
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ','');
  if (!token) return res.status(401).json({ error:'Unauthorized' });
  try { jwt.verify(token, process.env.JWT_SECRET||'auditdna_jwt_2026'); next(); }
  catch(e) { res.status(401).json({ error:'Invalid token' }); }
}

router.get('/reports/usda', requireAuth, async (req,res) => {
  const db=getDb(), start=req.query.start||new Date(Date.now()-30*86400000).toISOString().slice(0,10), end=req.query.end||new Date().toISOString().slice(0,10);
  res.json(await dataEngine.generateUSDAReport(db,start,end));
});
router.get('/reports/fda', requireAuth, async (req,res) => {
  const db=getDb(), start=req.query.start||new Date(Date.now()-30*86400000).toISOString().slice(0,10), end=req.query.end||new Date().toISOString().slice(0,10);
  res.json(await dataEngine.generateFDAReport(db,start,end));
});
router.get('/reports/sustainability', requireAuth, async (req,res) => {
  const db=getDb(), start=req.query.start||new Date(Date.now()-30*86400000).toISOString().slice(0,10), end=req.query.end||new Date().toISOString().slice(0,10);
  res.json(await dataEngine.generateSustainabilityReport(db,start,end));
});
router.get('/reports/corridor', requireAuth, async (req,res) => {
  const db=getDb(), start=req.query.start||new Date(Date.now()-30*86400000).toISOString().slice(0,10), end=req.query.end||new Date().toISOString().slice(0,10);
  res.json(await dataEngine.generateCorridorIntelligence(db,start,end));
});

module.exports = router;
