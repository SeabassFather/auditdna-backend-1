// loaf-routes.js â€” FULL REBUILD â€” Save to: C:\AuditDNA\backend\routes\loaf-routes.js
const express  = require('express');
const router   = express.Router();
const nodemailer = require('nodemailer');
const pool = require('../db');

let intelligence, dataEngine;
try { intelligence = require('../services/loaf-intelligence'); console.log('[loaf-routes] intelligence loaded'); }
catch (e) { console.warn('[loaf-routes] intelligence not found:', e.message); intelligence = { runLOAFIntelligence: async () => ({ sent:0, chainStores:0 }) }; }
try { dataEngine = require('../services/loaf-data-engine'); console.log('[loaf-routes] data engine loaded'); }
catch (e) { console.warn('[loaf-routes] data engine not found:', e.message); dataEngine = { saveSubmission: async()=>null, updateDailyAnalytics: async()=>{}, ensureDataTables: async()=>{}, generateUSDAReport: async()=>({error:'not loaded'}), generateFDAReport: async()=>({error:'not loaded'}), generateSustainabilityReport: async()=>({error:'not loaded'}), generateCorridorIntelligence: async()=>({error:'not loaded'}) }; }

const getDb = () => pool || require('../db');
const getTransport = () => nodemailer.createTransport({ host: process.env.SMTP_HOST||'smtp.gmail.com', port: parseInt(process.env.SMTP_PORT||'587'), secure:false, auth:{ user:process.env.SMTP_USER, pass:process.env.SMTP_PASS } });
const FROM = `"MexaUSA Food Group â€” LOAF" <${process.env.SMTP_USER||'saul@mexausafg.com'}>`;
const ADMIN_EMAILS = ['saul@mexausafg.com','saul@mexausafg.com','palt@mfginc.com'];

async function notifyAdmins(action, data, intel) {
  const { commodity, quantity, unit, user, gps } = data;
  const ir = intel || {};
  try {
    const transport = getTransport();
    await transport.sendMail({ from:FROM, to:ADMIN_EMAILS.join(','),
      subject:`[LOAF ${action}] ${commodity} â€” ${quantity} ${unit} â€” ${user?.name||'Unknown'}`,
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
  console.log(`[LOAF LAUNCH] ${data.commodity} ${data.quantity} ${data.unit} â€” ${data.user?.name}`);
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
  console.log(`[LOAF ORIGIN] ${data.commodity} Lot:${data.lot} â€” ${data.user?.name}`);
  const db = getDb();
  const submissionId = await dataEngine.saveSubmission(db, 'ORIGIN', data, null);
  await dataEngine.updateDailyAnalytics(db, 'ORIGIN', data, null);
  await notifyAdmins('ORIGIN', data, null);
  res.json({ success:true, submission_id:submissionId, message:`Origin record created. Traceability logged for USDA/FDA reporting.`, action:'ORIGIN', grade_saved:!!data.grade });
});

router.post('/altruistic', async (req, res) => {
  const data = req.body;
  if (!data.commodity || !data.quantity) return res.status(400).json({ success:false, error:'Commodity and quantity required' });
  console.log(`[LOAF ALTRUISTIC] ${data.commodity} ${data.quantity} ${data.unit} â€” ${data.user?.name}`);
  const db = getDb();
  const submissionId = await dataEngine.saveSubmission(db, 'ALTRUISTIC', data, null);
  intelligence.runLOAFIntelligence(db, 'ALTRUISTIC', submissionId, data).then(async r => {
    await dataEngine.updateDailyAnalytics(db, 'ALTRUISTIC', data, r);
    await notifyAdmins('ALTRUISTIC', data, r);
    if (data.broadcastOpenClaw) {
      try {
        const http = require('http');
        const body = JSON.stringify({ to:'all', message:`[LOAF ALTRUISTIC] ${data.commodity} surplus available â€” ${data.quantity} ${data.unit} â€” ${data.user?.region||'corridor'}. Contact MexaUSA Food Group: +1-831-251-3116` });
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
  console.log(`[LOAF FACTOR] $${data.invoiceAmount} Buyer:${data.buyer} â€” ${data.user?.name}`);
  const db = getDb();
  const submissionId = await dataEngine.saveSubmission(db, 'FACTOR', data, null);
  await dataEngine.updateDailyAnalytics(db, 'FACTOR', data, null);
  await notifyAdmins('FACTOR', data, null);
  const advance = Math.round(parseFloat(data.invoiceAmount)*0.85*100)/100;
  res.json({ success:true, submission_id:submissionId, message:`Invoice submitted for factoring. Capital partners will be notified. Estimated advance: $${advance.toFixed(2)}.`, estimated_advance:advance, action:'FACTOR' });
});

// ============== AUCTION (BID) - grower posts a lot, buyers bid up ==============
router.post('/auction', async (req, res) => {
  try {
    const { commodity, quantity, unit, reservePrice, durationHours, notes, grade } = req.body || {};
    if (!commodity || !quantity) return res.status(400).json({ ok:false, error:'commodity and quantity required' });
    const startsAt = new Date();
    const endsAt = new Date(Date.now() + (parseInt(durationHours||24,10) * 3600 * 1000));
    let saved = null;
    try {
      saved = await dataEngine.saveSubmission({
        kind: 'auction',
        payload: { commodity, quantity, unit, reservePrice, durationHours, notes, grade, startsAt, endsAt }
      });
    } catch (e) { console.warn('[loaf-routes] auction save warn:', e.message); }

    // Fan-out to brain events so AuditDNA Mission Control sees it
    try {
      const { getPool } = require('../db');
      const pool = getPool();
      await pool.query(
        "INSERT INTO rfq_brain_events(event_type, payload, created_at) VALUES ($1, $2, NOW())",
        ['loaf.auction.opened', JSON.stringify({ commodity, quantity, reservePrice, endsAt })]
      );
    } catch (e) { console.warn('[loaf-routes] auction event warn:', e.message); }

    res.json({ ok:true, success:true, kind:'auction', startsAt, endsAt, saved });
  } catch (e) {
    console.error('[loaf-routes] /auction error:', e.message);
    res.status(500).json({ ok:false, error: e.message });
  }
});

// ============== REVERSE BUY - buyer posts a need, growers bid down ==============
router.post('/reverse', async (req, res) => {
  try {
    const { commodity, quantity, unit, targetPrice, needByDate, destination, gradeRequired, notes } = req.body || {};
    if (!commodity || !quantity) return res.status(400).json({ ok:false, error:'commodity and quantity required' });
    let saved = null;
    try {
      saved = await dataEngine.saveSubmission({
        kind: 'reverse',
        payload: { commodity, quantity, unit, targetPrice, needByDate, destination, gradeRequired, notes }
      });
    } catch (e) { console.warn('[loaf-routes] reverse save warn:', e.message); }

    try {
      const { getPool } = require('../db');
      const pool = getPool();
      await pool.query(
        "INSERT INTO rfq_brain_events(event_type, payload, created_at) VALUES ($1, $2, NOW())",
        ['loaf.reverse.posted', JSON.stringify({ commodity, quantity, targetPrice, needByDate, destination })]
      );
    } catch (e) { console.warn('[loaf-routes] reverse event warn:', e.message); }

    res.json({ ok:true, success:true, kind:'reverse', saved });
  } catch (e) {
    console.error('[loaf-routes] /reverse error:', e.message);
    res.status(500).json({ ok:false, error: e.message });
  }
});

// ============== GET OPEN AUCTIONS - feeds W panel auction list ==============
router.get('/auctions/open', async (req, res) => {
  try {
    const { getPool } = require('../db');
    const pool = getPool();

    // Pull auctions from rfq_needs that are status='auction'
    // Plus any LOAF-originated auctions stored via dataEngine (loaf_submissions table)
    let auctions = [];

    try {
      const r = await pool.query(`
        SELECT id, rfq_code, commodity_category AS commodity, quantity, quantity_unit AS unit,
               target_price AS reserve_price, auction_starts_at, auction_ends_at,
               estimated_gmv, destination_state, destination_country
        FROM rfq_needs
        WHERE status='auction' AND auction_ends_at > NOW()
        ORDER BY auction_ends_at ASC
        LIMIT 50
      `);
      auctions = r.rows.map(row => ({
        id: row.id,
        commodity: row.commodity,
        quantity: parseFloat(row.quantity),
        unit: row.unit,
        reservePrice: parseFloat(row.reserve_price || 0),
        endsAt: row.auction_ends_at,
        startsAt: row.auction_starts_at,
        origin: [row.destination_state, row.destination_country].filter(Boolean).join(', ')
      }));
    } catch (e) { console.warn('[loaf-routes] auctions/open rfq_needs warn:', e.message); }

    // Also pull LOAF /auction submissions (table created by data engine)
    try {
      const lr = await pool.query(`
        SELECT id, payload, created_at
        FROM loaf_submissions
        WHERE kind='auction' AND (payload->>'endsAt')::timestamptz > NOW()
        ORDER BY (payload->>'endsAt')::timestamptz ASC
        LIMIT 50
      `);
      for (const row of lr.rows) {
        const p = row.payload || {};
        auctions.push({
          id: 'loaf-' + row.id,
          commodity: p.commodity,
          quantity: parseFloat(p.quantity || 0),
          unit: p.unit,
          reservePrice: parseFloat(p.reservePrice || 0),
          currentBid: parseFloat(p.currentBid || p.reservePrice || 0),
          endsAt: p.endsAt,
          startsAt: p.startsAt,
          origin: 'LOAF'
        });
      }
    } catch (e) { console.warn('[loaf-routes] auctions/open loaf_submissions warn:', e.message); }

    // Compute current high bid per auction by checking loaf_bids table
    try {
      const ids = auctions.map(a => String(a.id).replace('loaf-','')).filter(Boolean);
      if (ids.length) {
        const br = await pool.query(`
          SELECT auction_id, MAX(bid_amount)::NUMERIC(14,2) AS current_high
          FROM loaf_bids
          WHERE auction_id = ANY(::text[])
          GROUP BY auction_id
        `, [ids]);
        const bidMap = {};
        for (const row of br.rows) { bidMap[row.auction_id] = parseFloat(row.current_high); }
        for (const a of auctions) {
          const k = String(a.id).replace('loaf-','');
          if (bidMap[k] !== undefined) a.currentBid = bidMap[k];
        }
      }
    } catch (e) { console.warn('[loaf-routes] auctions/open bids warn:', e.message); }

    res.json({ ok: true, auctions });
  } catch (e) {
    console.error('[loaf-routes] /auctions/open error:', e.message);
    res.status(500).json({ ok:false, error: e.message });
  }
});

// ============== POST BID on a specific auction ==============
router.post('/auctions/:id/bid', async (req, res) => {
  try {
    const { id } = req.params;
    const { bidder, bidderPhone, bidAmount, gps } = req.body || {};
    if (!bidAmount || isNaN(parseFloat(bidAmount))) {
      return res.status(400).json({ ok:false, error:'bidAmount required' });
    }
    const amt = parseFloat(bidAmount);
    const auctionId = String(id).replace('loaf-','');

    const { getPool } = require('../db');
    const pool = getPool();

    // Ensure loaf_bids table exists (idempotent)
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS loaf_bids (
          id BIGSERIAL PRIMARY KEY,
          auction_id TEXT NOT NULL,
          bidder TEXT,
          bidder_phone TEXT,
          bid_amount NUMERIC NOT NULL,
          gps JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_loaf_bids_auction ON loaf_bids(auction_id, bid_amount DESC);
      `);
    } catch (e) { console.warn('[loaf-routes] loaf_bids ensure warn:', e.message); }

    // Validate beats current high
    try {
      const cr = await pool.query(`SELECT MAX(bid_amount)::NUMERIC(14,2) AS cur FROM loaf_bids WHERE auction_id=`, [auctionId]);
      const cur = parseFloat((cr.rows[0] && cr.rows[0].cur) || 0);
      if (amt <= cur) {
        return res.status(400).json({ ok:false, error: `Bid must beat current high $${cur.toFixed(2)}` });
      }
    } catch (e) { console.warn('[loaf-routes] high check warn:', e.message); }

    await pool.query(
      `INSERT INTO loaf_bids(auction_id, bidder, bidder_phone, bid_amount, gps) VALUES (, , , , )`,
      [auctionId, bidder || null, bidderPhone || null, amt, gps ? JSON.stringify(gps) : null]
    );

    // Fire brain event
    try {
      await pool.query(
        `INSERT INTO rfq_brain_events(event_type, payload, created_at) VALUES (, , NOW())`,
        ['loaf.auction.bid_placed', JSON.stringify({ auctionId, bidder, bidAmount: amt })]
      );
    } catch (e) { console.warn('[loaf-routes] bid event warn:', e.message); }

    res.json({ ok:true, success:true, auctionId, bidAmount: amt });
  } catch (e) {
    console.error('[loaf-routes] /auctions/:id/bid error:', e.message);
    res.status(500).json({ ok:false, error: e.message });
  }
});



router.post('/admin-ping', async (req, res) => {
  const { action, user, timestamp } = req.body;
  console.log(`[LOAF ADMIN-PING] ${action} â€” ${user||'unknown'} â€” ${timestamp}`);
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
