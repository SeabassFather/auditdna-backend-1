// routes/loaf-quality-guard.js — LOAF Quality Guard / Shelf Life Integrity Engine
// POST /api/loaf/quality/check    — real-time shelf life flag
// POST /api/loaf/quality/submit   — log declaration + 9-photo submission
// GET  /api/loaf/quality/flags    — owner: all flagged submissions
// POST /api/loaf/quality/override — owner/admin override
// GET  /api/loaf/quality/stats    — GRS impact per grower
const express = require('express');
const router  = express.Router();

// ── 9 REQUIRED PHOTO SLOTS ────────────────────────────────────────────────────
const REQUIRED_PHOTOS = [
  { slot: 1, label: 'Top View',          desc: 'Looking straight down at the top of the product or case' },
  { slot: 2, label: 'Front Face',        desc: 'Front of the product / bin / pallet facing camera' },
  { slot: 3, label: 'Left Side',         desc: 'Left side view' },
  { slot: 4, label: 'Right Side',        desc: 'Right side view' },
  { slot: 5, label: 'Bottom / Root End', desc: 'Root end, stem end, or base of product' },
  { slot: 6, label: 'Close-Up Detail',   desc: 'Tight crop showing texture, color, and surface condition' },
  { slot: 7, label: 'Cut / Cross Section', desc: 'One unit cut open showing interior quality (color, moisture, no decay)' },
  { slot: 8, label: 'Field / Storage Context', desc: 'Wide shot showing product in field, cooler, or packing environment' },
  { slot: 9, label: 'Label / Pack Date Tag', desc: 'Visible pack date, lot number, or harvest tag — must be legible' },
];

// ── SHELF LIFE TABLE (days at optimal cold storage) ──────────────────────────
const SL = {
  'Artichoke':       [14,21,34,false], 'Asparagus':       [14,21,32,true],
  'Avocado':         [7, 14,50,false], 'Avocado (ripe)':  [3, 5, 40,true],
  'Beet':            [60,90,32,false], 'Bell Pepper':     [14,21,45,false],
  'Blueberry':       [10,14,32,true],  'Broccoli':        [14,21,32,true],
  'Broccoli Florets':[7, 10,32,true],  'Brussels Sprouts':[21,35,32,false],
  'Cabbage':         [90,180,32,false],'Carrot':          [28,56,32,false],
  'Cauliflower':     [21,28,32,true],  'Cauliflower Florets':[10,14,32,true],
  'Celery':          [21,28,32,false], 'Cilantro':        [7, 14,32,true],
  'Cucumber':        [10,14,50,false], 'Garlic':          [120,270,32,false],
  'Grape':           [14,21,32,false], 'Green Bean':      [7, 10,40,true],
  'Green Onion':     [14,21,32,true],  'Lemon':           [28,56,50,false],
  'Lettuce':         [21,28,32,true],  'Lettuce (leaf)':  [7, 10,32,true],
  'Lime':            [28,56,48,false], 'Mango':           [14,21,55,false],
  'Mango (ripe)':    [3, 5, 55,true],  'Napa Cabbage':    [28,42,32,false],
  'Onion':           [90,180,34,false],'Potato':          [90,180,40,false],
  'Radish':          [21,28,32,false], 'Romaine':         [14,21,32,true],
  'Spinach':         [10,14,32,true],  'Squash':          [7, 14,50,false],
  'Strawberry':      [5, 7, 32,true],  'Tomato':          [14,21,55,false],
  'Tomato (ripe)':   [7, 10,55,true],  'Zucchini':        [7, 14,50,false],
  'Other':           [7, 14,35,false],
};

function calcShelfLife({ commodity, harvest_date, cooler_hours=0, cooler_temp_f=34, origin='US', distance_miles=0 }) {
  const data = SL[commodity] || SL['Other'];
  const [minDays, maxDays, optTemp, highRisk] = data;
  const avgShelf = (minDays + maxDays) / 2;

  // Time already elapsed since harvest
  const harvestMs  = new Date(harvest_date).getTime();
  const nowMs      = Date.now();
  const elapsedDays = Math.max(0, (nowMs - harvestMs) / 86400000);

  // Temperature penalty: each degree above optimal costs 8% per day
  const tempDelta  = Math.max(0, cooler_temp_f - optTemp);
  const tempFactor = 1 - (tempDelta * 0.08);

  // Origin penalty: Mexico/CA/LATAM = extra 1.5 days transit buffer to port
  const originPenalty = (origin === 'MX' || origin === 'CA' || origin === 'LATAM') ? 1.5 : 0;

  // Distance: each 100 miles beyond 200 costs 0.4 days (refrigerated truck)
  const distancePenalty = Math.max(0, (distance_miles - 200) / 100 * 0.4);

  // Remaining shelf life
  const remaining = (avgShelf * tempFactor) - elapsedDays - originPenalty - distancePenalty;

  // Flag level
  let flag = 'green', flag_label = 'GOOD TO SHIP', color = '#0F7B41';
  if (remaining <= 1) {
    flag = 'red';    flag_label = 'DO NOT LIST — EXPIRED OR TOO RISKY'; color = '#dc2626';
  } else if (remaining <= 3) {
    flag = 'orange'; flag_label = 'HIGH RISK — WARN BUYER REQUIRED';    color = '#f97316';
  } else if (remaining <= 5) {
    flag = 'yellow'; flag_label = 'CAUTION — VERIFY WITH BUYER';        color = '#eab308';
  }

  return {
    commodity, origin, distance_miles,
    avg_shelf_days: Math.round(avgShelf),
    elapsed_days:   Math.round(elapsedDays * 10) / 10,
    temp_penalty:   Math.round((1 - tempFactor) * avgShelf * 10) / 10,
    origin_penalty: originPenalty,
    distance_penalty: Math.round(distancePenalty * 10) / 10,
    estimated_days_at_delivery: Math.round(remaining * 10) / 10,
    high_risk_commodity: highRisk,
    flag, flag_label, color,
    can_list: flag !== 'red',
    requires_buyer_warning: flag === 'orange' || flag === 'yellow',
  };
}

// ── ENSURE TABLES ─────────────────────────────────────────────────────────────
const ensure = async (pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS loaf_quality_submissions (
      id              SERIAL PRIMARY KEY,
      submission_id   VARCHAR(50) UNIQUE NOT NULL,
      grower_id       VARCHAR(100),
      grower_name     VARCHAR(200),
      commodity       VARCHAR(100) NOT NULL,
      variety         VARCHAR(100),
      origin          VARCHAR(10) DEFAULT 'US',
      harvest_date    DATE NOT NULL,
      cooler_hours    INTEGER DEFAULT 0,
      cooler_temp_f   NUMERIC(5,1) DEFAULT 34,
      distance_miles  INTEGER DEFAULT 0,
      pack_date       DATE,
      lot_number      VARCHAR(100),
      quantity        VARCHAR(100),
      unit            VARCHAR(50),
      photos_submitted INTEGER DEFAULT 0,
      photos_json     JSONB,
      photo_timestamps JSONB,
      photo_gps       JSONB,
      shelf_calc      JSONB,
      flag_level      VARCHAR(20) DEFAULT 'green',
      flag_label      VARCHAR(100),
      declaration_signed BOOLEAN DEFAULT FALSE,
      declaration_text TEXT,
      status          VARCHAR(30) DEFAULT 'pending',
      override_by     VARCHAR(100),
      override_note   TEXT,
      override_at     TIMESTAMPTZ,
      grs_impact      NUMERIC(5,2) DEFAULT 0,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_quality_grower    ON loaf_quality_submissions(grower_id);
    CREATE INDEX IF NOT EXISTS idx_quality_flag      ON loaf_quality_submissions(flag_level);
    CREATE INDEX IF NOT EXISTS idx_quality_status    ON loaf_quality_submissions(status);
    CREATE INDEX IF NOT EXISTS idx_quality_commodity ON loaf_quality_submissions(commodity);
    CREATE INDEX IF NOT EXISTS idx_quality_created   ON loaf_quality_submissions(created_at DESC);
  `).catch(()=>{});
};

// ── GET /slots — return the 9 required photo slots ───────────────────────────
router.get('/slots', (req, res) => {
  res.json({ ok: true, slots: REQUIRED_PHOTOS, required_count: 9 });
});

// ── POST /check — real-time shelf life calculation ───────────────────────────
router.post('/check', (req, res) => {
  const { commodity, harvest_date, cooler_hours, cooler_temp_f, origin, distance_miles } = req.body;
  if (!commodity || !harvest_date) return res.status(400).json({ ok:false, error:'commodity and harvest_date required' });
  try {
    const result = calcShelfLife({ commodity, harvest_date, cooler_hours:parseInt(cooler_hours)||0, cooler_temp_f:parseFloat(cooler_temp_f)||34, origin:origin||'US', distance_miles:parseInt(distance_miles)||0 });
    res.json({ ok: true, ...result });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

// ── POST /submit — log full quality declaration ──────────────────────────────
router.post('/submit', async (req, res) => {
  const pool = global.db || req.app.locals.pool;
  await ensure(pool);
  const {
    grower_id, grower_name, commodity, variety, origin, harvest_date,
    cooler_hours, cooler_temp_f, distance_miles, pack_date, lot_number,
    quantity, unit, photos, photo_timestamps, photo_gps,
    declaration_signed, declaration_text,
  } = req.body;

  if (!commodity || !harvest_date) return res.status(400).json({ ok:false, error:'commodity and harvest_date required' });
  if (!declaration_signed) return res.status(400).json({ ok:false, error:'Declaration must be signed' });

  const photosSubmitted = Array.isArray(photos) ? photos.length : 0;
  if (photosSubmitted < 9) return res.status(400).json({ ok:false, error:`9 photos required. ${photosSubmitted} submitted.`, required: 9, submitted: photosSubmitted, slots: REQUIRED_PHOTOS });

  const calc = calcShelfLife({ commodity, harvest_date, cooler_hours:parseInt(cooler_hours)||0, cooler_temp_f:parseFloat(cooler_temp_f)||34, origin:origin||'US', distance_miles:parseInt(distance_miles)||0 });

  if (!calc.can_list) return res.status(422).json({ ok:false, error:calc.flag_label, flag:'red', shelf_calc:calc });

  const subId = `LQG-${Date.now()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;

  // GRS impact: orange/yellow flags ding the grower's score
  const grsImpact = calc.flag === 'orange' ? -0.5 : calc.flag === 'yellow' ? -0.2 : 0.1;

  try {
    await pool.query(`
      INSERT INTO loaf_quality_submissions
        (submission_id,grower_id,grower_name,commodity,variety,origin,harvest_date,
         cooler_hours,cooler_temp_f,distance_miles,pack_date,lot_number,quantity,unit,
         photos_submitted,photos_json,photo_timestamps,photo_gps,shelf_calc,
         flag_level,flag_label,declaration_signed,declaration_text,status,grs_impact)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)`,
      [subId,grower_id||'',grower_name||'',commodity,variety||'',origin||'US',harvest_date,
       parseInt(cooler_hours)||0,parseFloat(cooler_temp_f)||34,parseInt(distance_miles)||0,
       pack_date||null,lot_number||'',quantity||'',unit||'',
       photosSubmitted,JSON.stringify(photos),JSON.stringify(photo_timestamps||[]),
       JSON.stringify(photo_gps||[]),JSON.stringify(calc),
       calc.flag,calc.flag_label,true,declaration_text||'',
       calc.requires_buyer_warning ? 'flagged' : 'approved', grsImpact]
    );

    // Brain event
    try { if(global.brain) global.brain.ping('LOAF_QUALITY_SUBMITTED',{ subId, commodity, flag:calc.flag, grower:grower_id }); } catch(_){}

    // ntfy owner if flagged
    if (calc.flag !== 'green') {
      try {
        await fetch(`https://ntfy.sh/${process.env.NTFY_TOPIC||'mfginc-alerts'}`, {
          method:'POST',
          headers:{ 'Title':`LOAF Quality ${calc.flag.toUpperCase()}: ${commodity}`, 'Priority':calc.flag==='orange'?'high':'default', 'Tags':'quality,loaf' },
          body: `${grower_name||grower_id} — ${commodity} — ${calc.flag_label}. ${calc.estimated_days_at_delivery} days at delivery. Sub ID: ${subId}`
        });
      } catch(_){}
    }

    res.json({ ok:true, submission_id:subId, flag:calc.flag, flag_label:calc.flag_label, shelf_calc:calc, can_list:calc.can_list, requires_buyer_warning:calc.requires_buyer_warning });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

// ── GET /flags — owner sees all flagged submissions ──────────────────────────
router.get('/flags', async (req, res) => {
  const pool = global.db || req.app.locals.pool;
  await ensure(pool);
  const { flag, status, limit } = req.query;
  let where=['1=1'], params=[], p=1;
  if (flag)   { where.push(`flag_level=$${p++}`);  params.push(flag); }
  if (status) { where.push(`status=$${p++}`);       params.push(status); }
  try {
    const rows = await pool.query(
      `SELECT * FROM loaf_quality_submissions WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT $${p}`,
      [...params, Math.min(parseInt(limit)||100,500)]
    ).catch(()=>({rows:[]}));
    res.json({ ok:true, submissions:rows.rows, total:rows.rows.length });
  } catch(e) { res.json({ ok:false, submissions:[], error:e.message }); }
});

// ── POST /override — owner/admin manually approves a flagged submission ──────
router.post('/override/:id', async (req, res) => {
  const pool = global.db || req.app.locals.pool;
  const { override_by, override_note, action } = req.body;
  try {
    await pool.query(
      `UPDATE loaf_quality_submissions SET status=$1,override_by=$2,override_note=$3,override_at=NOW(),updated_at=NOW() WHERE submission_id=$4`,
      [action==='approve'?'approved':'rejected', override_by||'owner', override_note||'', req.params.id]
    );
    res.json({ ok:true });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

// ── GET /stats — GRS impact per grower ───────────────────────────────────────
router.get('/stats', async (req, res) => {
  const pool = global.db || req.app.locals.pool;
  await ensure(pool);
  try {
    const rows = await pool.query(`
      SELECT grower_id, grower_name,
        COUNT(*)                                      AS total_submissions,
        COUNT(*) FILTER(WHERE flag_level='green')     AS green_count,
        COUNT(*) FILTER(WHERE flag_level='yellow')    AS yellow_count,
        COUNT(*) FILTER(WHERE flag_level='orange')    AS orange_count,
        COUNT(*) FILTER(WHERE flag_level='red')       AS red_count,
        SUM(grs_impact)                               AS total_grs_impact,
        MAX(created_at)                               AS last_submission
      FROM loaf_quality_submissions
      GROUP BY grower_id, grower_name
      ORDER BY total_submissions DESC LIMIT 100
    `).catch(()=>({rows:[]}));
    res.json({ ok:true, stats:rows.rows });
  } catch(e) { res.json({ ok:false, stats:[] }); }
});

// ── GET /commodities — return shelf life reference table ─────────────────────
router.get('/commodities', (req, res) => {
  const table = Object.entries(SL).map(([name, [min,max,temp,highRisk]]) => ({
    name, min_days:min, max_days:max, optimal_temp_f:temp, high_risk:highRisk
  }));
  res.json({ ok:true, commodities:table });
});

module.exports = router;
