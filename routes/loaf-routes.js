// loaf-routes.js — FULL REBUILD — Save to: C:\AuditDNA\backend\routes\loaf-routes.js
const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const pool = require("../db");

let intelligence, dataEngine;
try {
  intelligence = require("../services/loaf-intelligence");
  console.log("[loaf-routes] intelligence loaded");
} catch (e) {
  console.warn("[loaf-routes] intelligence not found:", e.message);
  intelligence = { runLOAFIntelligence: async () => ({ sent: 0, chainStores: 0 }) };
}
try {
  dataEngine = require("../services/loaf-data-engine");
  console.log("[loaf-routes] data engine loaded");
} catch (e) {
  console.warn("[loaf-routes] data engine not found:", e.message);
  dataEngine = {
    saveSubmission: async () => null,
    updateDailyAnalytics: async () => {},
    ensureDataTables: async () => {},
    generateUSDAReport: async () => ({ error: "not loaded" }),
    generateFDAReport: async () => ({ error: "not loaded" }),
    generateSustainabilityReport: async () => ({ error: "not loaded" }),
    generateCorridorIntelligence: async () => ({ error: "not loaded" }),
  };
}

const getDb = () => pool || require("../db");
const getTransport = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
const FROM = `"MexaUSA Food Group — LOAF" <${process.env.SMTP_USER || "saul@mexausafg.com"}>`;
const ADMIN_EMAILS = ["saul@mexausafg.com", "saul@mexausafg.com", "palt@mfginc.com"];

async function notifyAdmins(action, data, intel) {
  const { commodity, quantity, unit, user, gps } = data;
  const ir = intel || {};
  try {
    const transport = getTransport();
    await transport.sendMail({
      from: FROM,
      to: ADMIN_EMAILS.join(","),
      subject: `[LOAF ${action}] ${commodity} — ${quantity} ${unit} — ${user?.name || "Unknown"}`,
      text: [
        `Action: ${action}`,
        `Commodity: ${commodity}`,
        `Quantity: ${quantity} ${unit}`,
        `Grower: ${user?.name || "--"} / ${user?.company || "--"} / ${user?.phone || "--"}`,
        `Region: ${user?.region || "--"}`,
        `GPS: ${gps ? `${gps.lat}, ${gps.lng}` : "Not captured"}`,
        `Buyers notified: ${ir.sent || 0} regular + ${ir.chainStores || 0} chain stores`,
        `Time: ${new Date().toLocaleString()}`,
      ].join("\n"),
    });
  } catch (e) {
    console.warn("[loaf-routes] admin notify failed:", e.message);
  }
}

router.post("/register", async (req, res) => {
  const { name, company, phone, commodity, region, gps } = req.body;
  const db = getDb();
  try {
    await db
      .query(
        `CREATE TABLE IF NOT EXISTS loaf_grower_registrations (id SERIAL PRIMARY KEY, name VARCHAR(200), company VARCHAR(200), phone VARCHAR(50), commodity VARCHAR(100), region VARCHAR(200), gps_lat NUMERIC(10,7), gps_lng NUMERIC(10,7), created_at TIMESTAMPTZ DEFAULT NOW())`,
      )
      .catch(() => {});
    await db.query(
      `INSERT INTO loaf_grower_registrations (name,company,phone,commodity,region,gps_lat,gps_lng) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [name, company, phone, commodity, region, gps?.lat || null, gps?.lng || null],
    );
  } catch (e) {
    console.warn("[LOAF REGISTER]", e.message);
  }
  res.json({ success: true });
});

router.post("/launch", async (req, res) => {
  const data = req.body;
  if (!data.commodity || !data.quantity)
    return res.status(400).json({ success: false, error: "Commodity and quantity required" });
  console.log(`[LOAF LAUNCH] ${data.commodity} ${data.quantity} ${data.unit} — ${data.user?.name}`);
  const db = getDb();
  const submissionId = await dataEngine.saveSubmission(db, "LAUNCH", data, null);
  intelligence
    .runLOAFIntelligence(db, "LAUNCH", submissionId, data)
    .then(async (r) => {
      await dataEngine.updateDailyAnalytics(db, "LAUNCH", data, r);
      await notifyAdmins("LAUNCH", data, r);
      if (submissionId)
        db.query(
          "UPDATE loaf_submissions SET intelligence_sent=true,buyers_notified=$1,chains_notified=$2 WHERE id=$3",
          [r.sent || 0, r.chainStores || 0, submissionId],
        ).catch(() => {});
    })
    .catch((e) => console.error("[LOAF LAUNCH] intel error:", e.message));
  res.json({
    success: true,
    submission_id: submissionId,
    message: `${data.commodity} launched. Matched buyers will be notified automatically.`,
    action: "LAUNCH",
  });
});

router.post("/origin", async (req, res) => {
  const data = req.body;
  if (!data.commodity || !data.lot)
    return res.status(400).json({ success: false, error: "Commodity and lot number required" });
  console.log(`[LOAF ORIGIN] ${data.commodity} Lot:${data.lot} — ${data.user?.name}`);
  const db = getDb();
  const submissionId = await dataEngine.saveSubmission(db, "ORIGIN", data, null);
  await dataEngine.updateDailyAnalytics(db, "ORIGIN", data, null);
  await notifyAdmins("ORIGIN", data, null);
  res.json({
    success: true,
    submission_id: submissionId,
    message: `Origin record created. Traceability logged for USDA/FDA reporting.`,
    action: "ORIGIN",
    grade_saved: !!data.grade,
  });
});

router.post("/altruistic", async (req, res) => {
  const data = req.body;
  if (!data.commodity || !data.quantity)
    return res.status(400).json({ success: false, error: "Commodity and quantity required" });
  console.log(`[LOAF ALTRUISTIC] ${data.commodity} ${data.quantity} ${data.unit} — ${data.user?.name}`);
  const db = getDb();
  const submissionId = await dataEngine.saveSubmission(db, "ALTRUISTIC", data, null);
  intelligence
    .runLOAFIntelligence(db, "ALTRUISTIC", submissionId, data)
    .then(async (r) => {
      await dataEngine.updateDailyAnalytics(db, "ALTRUISTIC", data, r);
      await notifyAdmins("ALTRUISTIC", data, r);
      if (data.broadcastOpenClaw) {
        try {
          const http = require("http");
          const body = JSON.stringify({
            to: "all",
            message: `[LOAF ALTRUISTIC] ${data.commodity} surplus available — ${data.quantity} ${data.unit} — ${data.user?.region || "corridor"}. Contact MexaUSA Food Group: +1-831-251-3116`,
          });
          const opts = {
            hostname: "localhost",
            port: 3001,
            path: "/api/openclaw/broadcast",
            method: "POST",
            headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
          };
          http.request(opts, () => {}).write(body);
        } catch (e) {
          console.warn("[LOAF ALTRUISTIC] OpenClaw error:", e.message);
        }
      }
      if (submissionId)
        db.query(
          "UPDATE loaf_submissions SET intelligence_sent=true,buyers_notified=$1,chains_notified=$2 WHERE id=$3",
          [r.sent || 0, r.chainStores || 0, submissionId],
        ).catch(() => {});
    })
    .catch((e) => console.error("[LOAF ALTRUISTIC] intel error:", e.message));
  res.json({
    success: true,
    submission_id: submissionId,
    message: `${data.commodity} surplus posted. Matched buyers, chain stores, and grower network being notified.`,
    action: "ALTRUISTIC",
    openclaw_broadcast: !!data.broadcastOpenClaw,
  });
});

router.post("/factor", async (req, res) => {
  const data = req.body;
  if (!data.buyer || !data.invoiceAmount)
    return res.status(400).json({ success: false, error: "Buyer name and invoice amount required" });
  console.log(`[LOAF FACTOR] $${data.invoiceAmount} Buyer:${data.buyer} — ${data.user?.name}`);
  const db = getDb();
  const submissionId = await dataEngine.saveSubmission(db, "FACTOR", data, null);
  await dataEngine.updateDailyAnalytics(db, "FACTOR", data, null);
  await notifyAdmins("FACTOR", data, null);
  const advance = Math.round(parseFloat(data.invoiceAmount) * 0.85 * 100) / 100;
  res.json({
    success: true,
    submission_id: submissionId,
    message: `Invoice submitted for factoring. Capital partners will be notified. Estimated advance: $${advance.toFixed(2)}.`,
    estimated_advance: advance,
    action: "FACTOR",
  });
});

// ============== AUCTION (BID) - grower posts a lot, buyers bid up ==============
router.post("/auction", async (req, res) => {
  try {
    const { commodity, quantity, unit, reservePrice, durationHours, notes, grade } = req.body || {};
    if (!commodity || !quantity) return res.status(400).json({ ok: false, error: "commodity and quantity required" });
    const startsAt = new Date();
    const endsAt = new Date(Date.now() + parseInt(durationHours || 24, 10) * 3600 * 1000);
    let saved = null;
    try {
      saved = await dataEngine.saveSubmission({
        kind: "auction",
        payload: { commodity, quantity, unit, reservePrice, durationHours, notes, grade, startsAt, endsAt },
      });
    } catch (e) {
      console.warn("[loaf-routes] auction save warn:", e.message);
    }

    // Fan-out to brain events so AuditDNA Mission Control sees it
    try {
      const { getPool } = require("../db");
      const pool = getPool();
      await pool.query("INSERT INTO rfq_brain_events(event_type, payload, created_at) VALUES ($1, $2, NOW())", [
        "loaf.auction.opened",
        JSON.stringify({ commodity, quantity, reservePrice, endsAt }),
      ]);
    } catch (e) {
      console.warn("[loaf-routes] auction event warn:", e.message);
    }

    res.json({ ok: true, success: true, kind: "auction", startsAt, endsAt, saved });
  } catch (e) {
    console.error("[loaf-routes] /auction error:", e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ============== REVERSE BUY - buyer posts a need, growers bid down ==============
router.post("/reverse", async (req, res) => {
  try {
    const { commodity, quantity, unit, targetPrice, needByDate, destination, gradeRequired, notes } = req.body || {};
    if (!commodity || !quantity) return res.status(400).json({ ok: false, error: "commodity and quantity required" });
    let saved = null;
    try {
      saved = await dataEngine.saveSubmission({
        kind: "reverse",
        payload: { commodity, quantity, unit, targetPrice, needByDate, destination, gradeRequired, notes },
      });
    } catch (e) {
      console.warn("[loaf-routes] reverse save warn:", e.message);
    }

    try {
      const { getPool } = require("../db");
      const pool = getPool();
      await pool.query("INSERT INTO rfq_brain_events(event_type, payload, created_at) VALUES ($1, $2, NOW())", [
        "loaf.reverse.posted",
        JSON.stringify({ commodity, quantity, targetPrice, needByDate, destination }),
      ]);
    } catch (e) {
      console.warn("[loaf-routes] reverse event warn:", e.message);
    }

    res.json({ ok: true, success: true, kind: "reverse", saved });
  } catch (e) {
    console.error("[loaf-routes] /reverse error:", e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ============== GET OPEN AUCTIONS - feeds W panel auction list ==============
router.get("/auctions/open", async (req, res) => {
  try {
    const { getPool } = require("../db");
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
      auctions = r.rows.map((row) => ({
        id: row.id,
        commodity: row.commodity,
        quantity: parseFloat(row.quantity),
        unit: row.unit,
        reservePrice: parseFloat(row.reserve_price || 0),
        endsAt: row.auction_ends_at,
        startsAt: row.auction_starts_at,
        origin: [row.destination_state, row.destination_country].filter(Boolean).join(", "),
      }));
    } catch (e) {
      console.warn("[loaf-routes] auctions/open rfq_needs warn:", e.message);
    }

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
          id: "loaf-" + row.id,
          commodity: p.commodity,
          quantity: parseFloat(p.quantity || 0),
          unit: p.unit,
          reservePrice: parseFloat(p.reservePrice || 0),
          currentBid: parseFloat(p.currentBid || p.reservePrice || 0),
          endsAt: p.endsAt,
          startsAt: p.startsAt,
          origin: "LOAF",
        });
      }
    } catch (e) {
      console.warn("[loaf-routes] auctions/open loaf_submissions warn:", e.message);
    }

    // Compute current high bid per auction by checking loaf_bids table
    try {
      const ids = auctions.map((a) => String(a.id).replace("loaf-", "")).filter(Boolean);
      if (ids.length) {
        const br = await pool.query(
          `
          SELECT auction_id, MAX(bid_amount)::NUMERIC(14,2) AS current_high
          FROM loaf_bids
          WHERE auction_id = ANY($1::text[])
          GROUP BY auction_id
        `,
          [ids],
        );
        const bidMap = {};
        for (const row of br.rows) {
          bidMap[row.auction_id] = parseFloat(row.current_high);
        }
        for (const a of auctions) {
          const k = String(a.id).replace("loaf-", "");
          if (bidMap[k] !== undefined) a.currentBid = bidMap[k];
        }
      }
    } catch (e) {
      console.warn("[loaf-routes] auctions/open bids warn:", e.message);
    }

    res.json({ ok: true, auctions });
  } catch (e) {
    console.error("[loaf-routes] /auctions/open error:", e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ============== POST BID on a specific auction ==============
router.post("/auctions/:id/bid", async (req, res) => {
  try {
    const { id } = req.params;
    const { bidder, bidderPhone, bidAmount, gps } = req.body || {};
    if (!bidAmount || isNaN(parseFloat(bidAmount))) {
      return res.status(400).json({ ok: false, error: "bidAmount required" });
    }
    const amt = parseFloat(bidAmount);
    const auctionId = String(id).replace("loaf-", "");

    const { getPool } = require("../db");
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
    } catch (e) {
      console.warn("[loaf-routes] loaf_bids ensure warn:", e.message);
    }

    // Validate beats current high
    try {
      const cr = await pool.query(`SELECT MAX(bid_amount)::NUMERIC(14,2) AS cur FROM loaf_bids WHERE auction_id=$1`, [
        auctionId,
      ]);
      const cur = parseFloat((cr.rows[0] && cr.rows[0].cur) || 0);
      if (amt <= cur) {
        return res.status(400).json({ ok: false, error: `Bid must beat current high $${cur.toFixed(2)}` });
      }
    } catch (e) {
      console.warn("[loaf-routes] high check warn:", e.message);
    }

    await pool.query(
      `INSERT INTO loaf_bids(auction_id, bidder, bidder_phone, bid_amount, gps) VALUES ($1, $2, $3, $4, $5)`,
      [auctionId, bidder || null, bidderPhone || null, amt, gps ? JSON.stringify(gps) : null],
    );

    // Fire brain event
    try {
      await pool.query(`INSERT INTO rfq_brain_events(event_type, payload, created_at) VALUES ($1, $2, NOW())`, [
        "loaf.auction.bid_placed",
        JSON.stringify({ auctionId, bidder, bidAmount: amt }),
      ]);
    } catch (e) {
      console.warn("[loaf-routes] bid event warn:", e.message);
    }

    res.json({ ok: true, success: true, auctionId, bidAmount: amt });
  } catch (e) {
    console.error("[loaf-routes] /auctions/:id/bid error:", e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post("/admin-ping", async (req, res) => {
  const { action, user, timestamp } = req.body;
  console.log(`[LOAF ADMIN-PING] ${action} — ${user || "unknown"} — ${timestamp}`);
  res.json({ success: true });
});

router.get("/history", async (req, res) => {
  const { phone, company } = req.query;
  const db = getDb();
  try {
    const r = await db.query(
      `SELECT id,action,commodity,quantity,unit,price,buyers_notified,chains_notified,submitted_at FROM loaf_submissions WHERE ($1::text IS NULL OR grower_phone=$1) AND ($2::text IS NULL OR LOWER(grower_company) LIKE LOWER($2)) ORDER BY submitted_at DESC LIMIT 50`,
      [phone || null, company ? `%${company}%` : null],
    );
    res.json({ success: true, submissions: r.rows });
  } catch (e) {
    res.json({ success: false, error: e.message, submissions: [] });
  }
});

router.get("/analytics", async (req, res) => {
  const db = getDb();
  const days = parseInt(req.query.days || "30");
  const start = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  try {
    await dataEngine.ensureDataTables(db);
    const [s, a] = await Promise.all([
      db.query(
        `SELECT action, COUNT(*) as count FROM loaf_submissions WHERE submitted_at >= NOW() - INTERVAL '${days} days' GROUP BY action`,
      ),
      db.query(
        `SELECT SUM(waste_prevented_lbs) as waste, SUM(water_use_gallons) as water, SUM(carbon_miles_saved) as carbon, SUM(buyers_notified) as buyers FROM loaf_analytics_daily WHERE report_date >= $1`,
        [start],
      ),
    ]);
    const stats = a.rows[0] || {};
    const breakdown = {};
    s.rows.forEach((r) => {
      breakdown[r.action] = parseInt(r.count);
    });
    res.json({
      success: true,
      period_days: days,
      transactions: breakdown,
      total: Object.values(breakdown).reduce((a, b) => a + b, 0),
      impact: {
        waste_prevented_lbs: Math.round(parseFloat(stats.waste) || 0),
        water_tracked_gallons: Math.round(parseFloat(stats.water) || 0),
        carbon_mt_saved: Math.round((parseFloat(stats.carbon) || 0) * 1000) / 1000,
        buyers_contacted: parseInt(stats.buyers) || 0,
      },
    });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

const jwt = require("jsonwebtoken");
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    jwt.verify(token, process.env.JWT_SECRET || "auditdna_jwt_2026");
    next();
  } catch (e) {
    res.status(401).json({ error: "Invalid token" });
  }
}

router.get("/reports/usda", requireAuth, async (req, res) => {
  const db = getDb(),
    start = req.query.start || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    end = req.query.end || new Date().toISOString().slice(0, 10);
  res.json(await dataEngine.generateUSDAReport(db, start, end));
});
router.get("/reports/fda", requireAuth, async (req, res) => {
  const db = getDb(),
    start = req.query.start || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    end = req.query.end || new Date().toISOString().slice(0, 10);
  res.json(await dataEngine.generateFDAReport(db, start, end));
});
router.get("/reports/sustainability", requireAuth, async (req, res) => {
  const db = getDb(),
    start = req.query.start || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    end = req.query.end || new Date().toISOString().slice(0, 10);
  res.json(await dataEngine.generateSustainabilityReport(db, start, end));
});
router.get("/reports/corridor", requireAuth, async (req, res) => {
  const db = getDb(),
    start = req.query.start || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    end = req.query.end || new Date().toISOString().slice(0, 10);
  res.json(await dataEngine.generateCorridorIntelligence(db, start, end));
});


// ============================================================================
// LOAF INVENTORY POST — grower posts floor product, auto-pings matched buyers
// ============================================================================
router.post("/inventory-post", async (req, res) => {
  const {name,phone,commodity,volume,price,location,condition,notes,lat,lng,radius,country,commission_pct,
         variety,grade,pack_type,pack_size,end_use,harvest_status,certifications,available_from,available_to,grower_username} = req.body;
  try {
    const db=getDb(), ts=new Date().toISOString(), commodityClean=(commodity||'').split('/')[0].trim().toLowerCase();
    await db.query('ALTER TABLE loaf_inventory ADD COLUMN IF NOT EXISTS variety VARCHAR(100),ADD COLUMN IF NOT EXISTS grade VARCHAR(80),ADD COLUMN IF NOT EXISTS pack_type VARCHAR(80),ADD COLUMN IF NOT EXISTS pack_size VARCHAR(80),ADD COLUMN IF NOT EXISTS end_use VARCHAR(200),ADD COLUMN IF NOT EXISTS harvest_status VARCHAR(80),ADD COLUMN IF NOT EXISTS certifications TEXT,ADD COLUMN IF NOT EXISTS available_from DATE,ADD COLUMN IF NOT EXISTS available_to DATE,ADD COLUMN IF NOT EXISTS grower_username VARCHAR(100),ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'active'').catch(()=>{});
    await db.query(`INSERT INTO loaf_inventory (name,phone,commodity,volume,price,location,condition,notes,lat,lng,radius,country,commission_pct,created_at,variety,grade,pack_type,pack_size,end_use,harvest_status,certifications,available_from,available_to,grower_username,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,'active')`,[name,phone,commodity,volume,price,location,condition||'Available',notes||'',lat||null,lng||null,radius||100,country||'MX',commission_pct||'1.5',ts,variety||'',grade||'',pack_type||'',pack_size||'',end_use||'General',harvest_status||'available now',certifications||'',available_from||null,available_to||null,grower_username||name||'']).catch(()=>{});
    await db.query(`INSERT INTO user_activity_log (username,display_name,role,event_type,module,description,meta) VALUES ($1,$2,'grower','INVENTORY_POSTED','LOAF',$3,$4)`,[grower_username||name||'loaf_grower',name||'Grower',`Posted: ${commodity}${variety?' '+variety:''} | ${volume} @ ${price} | ${location}`,JSON.stringify({commodity,variety,grade,pack_type,pack_size,end_use,harvest_status})]).catch(()=>{});
    try{if(global.brain)global.brain.ping('LOAF_INVENTORY_POSTED',{commodity,variety,grade,end_use,volume,price,location});}catch(_){}
    const subject=`[LOAF] ${commodity}${variety?' — '+variety:''} | ${volume} @ ${price} | ${location}`;
    const body=`LOAF INVENTORY ALERT\nCOMMODITY: ${commodity}${variety?' — '+variety:''}\nGRADE: ${grade||'Standard'} | PACK: ${pack_type||'N/A'} ${pack_size||''} | END USE: ${end_use||'General'}\nHARVEST: ${harvest_status||'Available now'} | CERTS: ${certifications||'None'}\nVOLUME: ${volume} | PRICE: ${price} FOB | ${location} ${country||'Mexico'}\nAVAIL: ${available_from||'Now'} to ${available_to||'TBD'}\n${notes?'NOTES: '+notes+'\n':''}\nBLIND DEAL — identity protected until NDA. Fee: ${commission_pct||1.5}% closed deals only.\nmexausafg.com`;
    try{await fetch(`${process.env.REACT_APP_API_URL||'http://localhost:5050'}/api/gmail/send`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:'sgarcia1911@gmail.com',subject:`[LOAF] ${commodity} posted`,body})});}catch(_){}
    const buyers=await db.query(`SELECT DISTINCT email,first_name,company_name FROM contacts WHERE (commodities ILIKE $1 OR commodity ILIKE $1) AND email IS NOT NULL AND email!='' AND (crmtype='buyer' OR crmtype='shipper' OR role ILIKE '%buyer%' OR role ILIKE '%wholesale%' OR role ILIKE '%importer%') LIMIT 200`,[`%${commodityClean}%`]).catch(()=>({rows:[]}));
    let pinged=0;
    for(const b of (buyers.rows||[])){try{await fetch(`${process.env.REACT_APP_API_URL||'http://localhost:5050'}/api/gmail/send`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:b.email,subject,body:`Hi ${b.first_name||b.company_name||''},\n\n${body}\n\nReply STOP to unsubscribe.`})});pinged++;}catch(_){}}
    res.json({ok:true,pinged,commodity,variety,grade,end_use,ts});
  }catch(e){res.status(500).json({error:e.message});}
});

router.get("/inventory",async(req,res)=>{
  try{const db=getDb();const{commodity,end_use,country,harvest_status,limit}=req.query;let where=["COALESCE(status,'active')='active'"],params=[],p=1;if(commodity){where.push(`commodity ILIKE $${p++}`);params.push(`%${commodity}%`);}if(end_use){where.push(`end_use ILIKE $${p++}`);params.push(`%${end_use}%`);}if(country){where.push(`country ILIKE $${p++}`);params.push(`%${country}%`);}if(harvest_status){where.push(`harvest_status ILIKE $${p++}`);params.push(`%${harvest_status}%`);}const rows=await db.query(`SELECT id,commodity,variety,grade,volume,price,location,country,pack_type,pack_size,end_use,harvest_status,certifications,condition,notes,available_from,available_to,created_at,'VERIFIED GROWER' AS grower_label,commission_pct FROM loaf_inventory WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT $${p}`,[...params,Math.min(parseInt(limit)||50,200)]).catch(()=>({rows:[]}));res.json({ok:true,inventory:rows.rows,total:rows.rows.length});}catch(e){res.status(500).json({ok:false,inventory:[],error:e.message});}
});

router.get("/buyer-needs",async(req,res)=>{
  try{const db=getDb();const rows=await db.query(`SELECT id,commodity,volume,max_price,location,delivery,needed_by,created_at,'VERIFIED BUYER' AS buyer_label FROM loaf_buyer_needs WHERE COALESCE(status,'active')='active' ORDER BY created_at DESC LIMIT 50`).catch(()=>({rows:[]}));res.json({ok:true,needs:rows.rows});}catch(e){res.json({ok:false,needs:[]});}


      // Query CRM for matched buyers and ping them
      try {
        const buyers = await db.query(
          `SELECT email, first_name, company_name FROM contacts
           WHERE (commodities ILIKE $1 OR commodity ILIKE $1 OR company_name ILIKE $2)
           AND email IS NOT NULL AND email != ''
           AND (crmtype = 'buyer' OR crm_type = 'buyer' OR role ILIKE '%buyer%' OR role ILIKE '%wholesale%' OR role ILIKE '%distributor%')
           LIMIT 150`,
          [`%${commodityClean}%`, `%produce%`]
        ).catch(()=>({rows:[]}));

        let pinged = 0;
        for (const buyer of (buyers.rows||[])) {
          try {
            await fetch(`${process.env.REACT_APP_API_URL||'http://localhost:5050'}/api/gmail/send`, {
              method:'POST', headers:{'Content-Type':'application/json'},
              body: JSON.stringify({
                to: buyer.email,
                subject: subject,
                body: `Hi ${buyer.first_name||buyer.company_name||''},

${body}

This alert was sent because you are registered as a produce buyer on the LOAF network.
To unsubscribe reply STOP.`
              })
            });
            pinged++;
          } catch(_) {}
        }
        res.json({ ok: true, pinged, commodity, radius: radiusMi, ts });
      } catch(e) {
        res.json({ ok: true, pinged: 0, note: 'Posted — buyer ping pending', error: e.message });
      }
    } else {
      res.json({ ok: true, ts });
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// LOAF BUYER NEED — buyer posts what they need, auto-pings matched growers
// ============================================================================
router.post("/buyer-need", async (req, res) => {
  const { name, company, phone, email, commodity, volume, max_price,
          needed_by, location, delivery, radius, auto_ping_growers } = req.body;
  try {
    const db = getDb();
    const commodityClean = (commodity||'').split('/')[0].trim().toLowerCase();
    const radiusMi = parseInt(radius)||0;
    const subject = `[LOAF] Buyer Needs ${commodity} — ${volume} | ${location}`;

    // Ping Saul
    try {
      await fetch(`${process.env.REACT_APP_API_URL||'http://localhost:5050'}/api/gmail/send`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          to: 'sgarcia1911@gmail.com',
          subject: `[LOAF ACTION] Buyer needs ${commodity} — ${volume}`,
          body: `LOAF BUYER NEED

${name} (${company||''})
Phone: ${phone}
Email: ${email}
Needs: ${commodity} — ${volume} @ max $${max_price}
By: ${needed_by||'ASAP'}
Location: ${location}
Delivery: ${delivery}
Radius: ${radiusMi===0?'Global':radiusMi+' miles'}

Ping all matched growers — mexausafg.com`
        })
      });
    } catch(_) {}

    // Query CRM for matched growers
    if (auto_ping_growers) {
      const growers = await db.query(
        `SELECT email, first_name, company_name FROM contacts
         WHERE (commodities ILIKE $1 OR commodity ILIKE $1)
         AND email IS NOT NULL AND email != ''
         AND (crmtype = 'grower' OR crm_type = 'grower' OR role ILIKE '%grower%' OR role ILIKE '%producer%' OR role ILIKE '%farmer%')
         LIMIT 200`,
        [`%${commodityClean}%`]
      ).catch(()=>({rows:[]}));

      let pinged = 0;
      for (const grower of (growers.rows||[])) {
        try {
          await fetch(`${process.env.REACT_APP_API_URL||'http://localhost:5050'}/api/gmail/send`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({
              to: grower.email,
              subject: subject,
              body: `Hi ${grower.first_name||grower.company_name||''},

A buyer is looking for your product on the LOAF network right now:

Commodity: ${commodity}
Volume needed: ${volume}
Max price: $${max_price}
Needed by: ${needed_by||'ASAP'}
Buyer location: ${location}
Delivery: ${delivery}

Contact the buyer directly:
Name: ${name} (${company||''})
Phone: ${phone}
Email: ${email}

Deal facilitated by Mexausa Food Group. Platform fee 2.5% on closed deals only.

mexausafg.com | loaf.mexausafg.com`
            })
          });
          pinged++;
        } catch(_) {}
      }
      res.json({ ok: true, pinged, commodity, radius: radiusMi });
    } else {
      res.json({ ok: true });
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// LOAF FACTORING INTAKE — routes to Liquid Capital Group
// ============================================================================
router.post("/factoring-intake", async (req, res) => {
  const { name, phone, buyer, commodity, amount, type, factoring_partner } = req.body;
  try {
    const advance = (parseFloat(amount)||0) * 0.85;
    const fee = (parseFloat(amount)||0) * 0.035;
    const body = `LOAF FACTORING REQUEST

Type: ${type==='po'?'PO Finance':'AR Invoice Factoring'}
Submitted by: ${name} — ${phone}
Buyer/Debtor: ${buyer}
Commodity: ${commodity}
Invoice Amount: $${parseFloat(amount).toLocaleString()}
Estimated Advance (85%): $${advance.toLocaleString('en-US',{maximumFractionDigits:0})}
Estimated Fee (3.5%): $${fee.toLocaleString('en-US',{maximumFractionDigits:0})}

Factoring Partner: ${factoring_partner||'Liquid Capital Group'}
First Right of Refusal: YES

Action required: Review and contact grower within 1 hour.

mexausafg.com`;

    await fetch(`${process.env.REACT_APP_API_URL||'http://localhost:5050'}/api/gmail/send`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        to: 'sgarcia1911@gmail.com',
        subject: `[LOAF FACTORING] $${parseFloat(amount).toLocaleString()} — ${commodity} — ${name}`,
        body
      })
    }).catch(()=>{});

    res.json({ ok: true, advance: advance.toFixed(2), fee: fee.toFixed(2), partner: 'Liquid Capital Group' });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// LOAF EQUIPMENT POST
// ============================================================================
router.post("/equipment-post", async (req, res) => {
  const { name, phone, type, desc, listing, location, market_value, listing_price } = req.body;
  const maxAllowed = (parseFloat(market_value)||0) * 0.20;
  if (market_value && listing_price && parseFloat(listing_price) > maxAllowed) {
    return res.status(400).json({ error: 'Price exceeds 20% of market value. Platform rule violation.' });
  }
  try {
    await fetch(`${process.env.REACT_APP_API_URL||'http://localhost:5050'}/api/gmail/send`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        to: 'sgarcia1911@gmail.com',
        subject: `[LOAF EQUIPMENT] ${listing||'For Sale'}: ${type} — ${name}`,
        body: `LOAF EQUIPMENT LISTING

${name} — ${phone}
Type: ${type}
Listing: ${listing}
Description: ${desc}
Location: ${location}
Market Value: $${market_value}
Listing Price: $${listing_price} (${((parseFloat(listing_price)/parseFloat(market_value))*100).toFixed(1)}% of value)

mexausafg.com`
      })
    }).catch(()=>{});
    res.json({ ok: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// LOAF ECOCRATE INQUIRY — routes to Hector Mariscal
// ============================================================================
router.post("/ecocrate-inquiry", async (req, res) => {
  const { name, company, email, phone, product, notes } = req.body;
  try {
    await fetch(`${process.env.REACT_APP_API_URL||'http://localhost:5050'}/api/gmail/send`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        to: 'sgarcia1911@gmail.com',
        cc: 'h11mariscal@gmail.com',
        subject: `[LOAF] EcoCrate Sample Request — ${company||name}`,
        body: `ECOCRATE / PLASTIPAC INQUIRY via LOAF

Name: ${name}
Company: ${company||'—'}
Email: ${email}
Phone: ${phone||'—'}
Current box/product: ${product||'—'}
Notes: ${notes||'—'}

Forwarded to Hector G. Mariscal — DEVAN INC.
loaf.mexausafg.com`
      })
    }).catch(()=>{});
    res.json({ ok: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// LOAF PULSE — 3/6hr actionable report to Saul (call from cron or manually)
// ============================================================================
router.post("/pulse", async (req, res) => {
  try {
    const db = getDb();
    const since = new Date(Date.now() - 6*60*60*1000).toISOString();

    const [inv, buyers, equip, factor] = await Promise.all([
      db.query(`SELECT COUNT(*) as n FROM loaf_inventory WHERE created_at > $1`,[since]).catch(()=>({rows:[{n:0}]})),
      db.query(`SELECT COUNT(*) as n FROM loaf_buyer_needs WHERE created_at > $1`,[since]).catch(()=>({rows:[{n:0}]})),
      db.query(`SELECT COUNT(*) as n FROM loaf_equipment WHERE created_at > $1`,[since]).catch(()=>({rows:[{n:0}]})),
      db.query(`SELECT COUNT(*) as n, COALESCE(SUM(amount),0) as total FROM loaf_factoring WHERE created_at > $1`,[since]).catch(()=>({rows:[{n:0,total:0}]}))
    ]);

    const report = `LOAF 6-HOUR PULSE
${new Date().toLocaleString()}

ACTIONABLE ITEMS:
- Inventory posts: ${inv.rows[0].n}
- Buyer needs posted: ${buyers.rows[0].n}
- Equipment listings: ${equip.rows[0].n}
- Factoring requests: ${factor.rows[0].n} ($${parseFloat(factor.rows[0].total).toLocaleString()})

${parseInt(inv.rows[0].n)+parseInt(buyers.rows[0].n)===0?'No new activity.':'Review and follow up on open items at mexausafg.com'}`;

    await fetch(`${process.env.REACT_APP_API_URL||'http://localhost:5050'}/api/gmail/send`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        to: 'sgarcia1911@gmail.com',
        subject: `[LOAF PULSE] ${new Date().toLocaleDateString()} — ${parseInt(inv.rows[0].n)+parseInt(buyers.rows[0].n)} actions`,
        body: report
      })
    }).catch(()=>{});

    res.json({ ok: true, report });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;