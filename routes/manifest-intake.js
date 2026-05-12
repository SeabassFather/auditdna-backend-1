// ============================================================================
// manifest-intake.js — Grower/Supplier manifest upload + cross-commodity buyer ping
// POST /api/manifest/submit   — submit a manifest, ping matched + adjacent buyers
// GET  /api/manifest/list     — list manifests (role-filtered)
// GET  /api/manifest/:id      — single manifest detail
// ============================================================================
const express = require('express');
const router  = express.Router();

// Cross-commodity adjacency map — "who else wants to know about this"
const ADJACENT = {
  avocado:    ['lemon','lime','citrus','mango','tropical'],
  lemon:      ['lime','citrus','avocado','orange','grapefruit'],
  lime:       ['lemon','citrus','avocado'],
  strawberry: ['blueberry','raspberry','blackberry','berry','grape','cherry'],
  blueberry:  ['strawberry','blackberry','raspberry','berry'],
  lettuce:    ['spinach','kale','arugula','salad','cabbage','romaine','iceberg'],
  spinach:    ['lettuce','kale','arugula','salad','chard'],
  tomato:     ['pepper','cucumber','zucchini','eggplant','tomatillo'],
  cucumber:   ['zucchini','squash','tomato','pepper'],
  pepper:     ['tomato','chile','jalapeno','poblano','cucumber'],
  broccoli:   ['cauliflower','cabbage','brussels','kale','asparagus'],
  celery:     ['fennel','lettuce','parsley','cilantro'],
  garlic:     ['onion','shallot','leek','chile'],
  onion:      ['garlic','shallot','leek','scallion'],
  mango:      ['avocado','papaya','tropical','pineapple'],
  grape:      ['berry','strawberry','cherry','plum'],
  apple:      ['pear','plum','peach','nectarine','cherry'],
  peach:      ['nectarine','apricot','plum','cherry','apple'],
  orange:     ['lemon','grapefruit','citrus','tangerine','mandarin'],
};

async function ensureTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS manifests (
      id              SERIAL PRIMARY KEY,
      submitter_username VARCHAR(100),
      submitter_name  VARCHAR(150),
      submitter_role  VARCHAR(50),
      company_name    VARCHAR(200),
      commodity       VARCHAR(100) NOT NULL,
      variety         VARCHAR(100),
      grade           VARCHAR(80),
      volume          VARCHAR(100),
      pack_type       VARCHAR(80),
      pack_size       VARCHAR(80),
      end_use         VARCHAR(200),
      harvest_status  VARCHAR(80),
      certifications  TEXT,
      country_origin  VARCHAR(80),
      region          VARCHAR(100),
      price_fob       VARCHAR(80),
      available_from  DATE,
      available_to    DATE,
      bol_number      VARCHAR(100),
      notes           TEXT,
      status          VARCHAR(30) DEFAULT 'active',
      buyers_pinged   INTEGER DEFAULT 0,
      adjacent_pinged INTEGER DEFAULT 0,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_manifests_commodity ON manifests(commodity);
    CREATE INDEX IF NOT EXISTS idx_manifests_status    ON manifests(status);
    CREATE INDEX IF NOT EXISTS idx_manifests_created   ON manifests(created_at DESC);
  `).catch(()=>{});
}

// ── POST /submit ─────────────────────────────────────────────────────────────
router.post('/submit', async (req, res) => {
  const pool = global.db || req.app.locals.pool;
  const {
    submitter_username, submitter_name, submitter_role, company_name,
    commodity, variety, grade, volume, pack_type, pack_size, end_use,
    harvest_status, certifications, country_origin, region,
    price_fob, available_from, available_to, bol_number, notes
  } = req.body;

  if (!commodity || !volume) {
    return res.status(400).json({ ok: false, error: 'commodity + volume required' });
  }

  try {
    await ensureTable(pool);

    // Store manifest
    const ins = await pool.query(
      `INSERT INTO manifests
         (submitter_username,submitter_name,submitter_role,company_name,
          commodity,variety,grade,volume,pack_type,pack_size,end_use,
          harvest_status,certifications,country_origin,region,
          price_fob,available_from,available_to,bol_number,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING id`,
      [submitter_username||'', submitter_name||'', submitter_role||'grower', company_name||'',
       commodity, variety||'', grade||'', volume, pack_type||'', pack_size||'',
       end_use||'General', harvest_status||'available now', certifications||'',
       country_origin||'', region||'', price_fob||'', available_from||null,
       available_to||null, bol_number||'', notes||'']
    );
    const manifestId = ins.rows[0].id;

    // Log activity
    await pool.query(
      `INSERT INTO user_activity_log
         (username,display_name,role,event_type,module,description,meta)
       VALUES ($1,$2,$3,'MANIFEST_SUBMITTED','Manifests',$4,$5)`,
      [submitter_username||'tenant', submitter_name||'Supplier', submitter_role||'grower',
       `Manifest #${manifestId}: ${commodity}${variety?' '+variety:''} | ${volume}${price_fob?' @ '+price_fob:''}`,
       JSON.stringify({manifestId,commodity,variety,grade,volume,end_use,harvest_status})]
    ).catch(()=>{});

    // Brain event
    try {
      if (global.brain) global.brain.ping('MANIFEST_SUBMITTED', {
        manifestId, commodity, variety, grade, volume, price_fob,
        submitter: submitter_name, end_use, harvest_status
      });
    } catch(_) {}

    // Build ping subject + body
    const commodityLabel = `${commodity}${variety?' — '+variety:''}`;
    const subject = `[MEXAUSA] New Supply Available: ${commodityLabel} | ${volume}${price_fob?' @ '+price_fob:''}`;
    const body = buildPingEmail(commodityLabel, grade, pack_type, pack_size, end_use,
      harvest_status, certifications, country_origin, region,
      volume, price_fob, available_from, available_to, notes, manifestId);

    const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5050';
    const sendEmail = async (to, name, bodyText) => {
      try {
        await fetch(`${BASE}/api/gmail/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to,
            subject,
            body: `Hi ${name||''},\n\n${bodyText}\n\nReply STOP to unsubscribe.`
          })
        });
        return true;
      } catch(_) { return false; }
    };

    // Always ping Saul first
    await sendEmail('sgarcia1911@gmail.com', 'Saul', `[MANIFEST #${manifestId}] ${body}`);

    const commodityClean = commodity.toLowerCase();
    const adjacent = (ADJACENT[commodityClean] || []).concat(
      Object.entries(ADJACENT)
        .filter(([k,v]) => v.includes(commodityClean))
        .map(([k]) => k)
    );

    // TIER 1 — Exact commodity buyers
    const exactBuyers = await pool.query(
      `SELECT DISTINCT email, first_name, company_name FROM contacts
       WHERE (commodities ILIKE $1 OR commodity ILIKE $1 OR notes ILIKE $1)
         AND email IS NOT NULL AND email != ''
         AND (crmtype='buyer' OR crmtype='shipper' OR role ILIKE '%buyer%'
              OR role ILIKE '%wholesale%' OR role ILIKE '%importer%'
              OR role ILIKE '%distributor%' OR role ILIKE '%chain%')
       LIMIT 300`,
      [`%${commodityClean}%`]
    ).catch(() => ({ rows: [] }));

    let pinged = 0;
    const pingedEmails = new Set();
    for (const b of exactBuyers.rows) {
      if (await sendEmail(b.email, b.first_name || b.company_name, body)) {
        pinged++;
        pingedEmails.add(b.email);
      }
    }

    // TIER 2 — Adjacent commodity buyers (cross-commodity prospecting)
    let adjPinged = 0;
    if (adjacent.length > 0) {
      const adjQuery = adjacent.map((_, i) => `commodities ILIKE $${i+1} OR commodity ILIKE $${i+1}`).join(' OR ');
      const adjBuyers = await pool.query(
        `SELECT DISTINCT email, first_name, company_name FROM contacts
         WHERE (${adjQuery})
           AND email IS NOT NULL AND email != ''
           AND (crmtype='buyer' OR crmtype='shipper' OR role ILIKE '%buyer%'
                OR role ILIKE '%wholesale%' OR role ILIKE '%importer%'
                OR role ILIKE '%distributor%')
         LIMIT 200`,
        adjacent.map(a => `%${a}%`)
      ).catch(() => ({ rows: [] }));

      const adjBody = `[ADJACENT COMMODITY ALERT] You primarily buy ${adjacent.slice(0,3).join('/')} — we thought you'd want to know about this related supply:\n\n${body}`;
      for (const b of adjBuyers.rows) {
        if (pingedEmails.has(b.email)) continue;
        if (await sendEmail(b.email, b.first_name || b.company_name, adjBody)) {
          adjPinged++;
          pingedEmails.add(b.email);
        }
      }
    }

    // TIER 3 — General wholesale/chain store buyers (regardless of commodity)
    const generalBuyers = await pool.query(
      `SELECT DISTINCT email, first_name, company_name FROM contacts
       WHERE email IS NOT NULL AND email != ''
         AND (role ILIKE '%wholesale%' OR role ILIKE '%chain store%'
              OR role ILIKE '%food service%' OR role ILIKE '%distributor%'
              OR company_name ILIKE '%wholesale%' OR company_name ILIKE '%foods%'
              OR company_name ILIKE '%produce%' OR company_name ILIKE '%market%')
       LIMIT 100`
    ).catch(() => ({ rows: [] }));

    let generalPinged = 0;
    const generalBody = `[NEW SUPPLY — BROAD ALERT] A new produce supply is available on the Mexausa network. You are receiving this because you handle multiple produce categories:\n\n${body}`;
    for (const b of generalBuyers.rows) {
      if (pingedEmails.has(b.email)) continue;
      if (await sendEmail(b.email, b.first_name || b.company_name, generalBody)) {
        generalPinged++;
        pingedEmails.add(b.email);
      }
    }

    // Update ping counts on manifest
    await pool.query(
      `UPDATE manifests SET buyers_pinged=$1, adjacent_pinged=$2 WHERE id=$3`,
      [pinged, adjPinged + generalPinged, manifestId]
    ).catch(()=>{});

    res.json({
      ok: true, manifestId,
      pinged_exact: pinged,
      pinged_adjacent: adjPinged,
      pinged_general: generalPinged,
      total_pinged: pinged + adjPinged + generalPinged,
      adjacent_commodities: adjacent.slice(0, 6)
    });

  } catch(e) {
    console.error('[MANIFEST SUBMIT]', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

function buildPingEmail(commodityLabel, grade, pack_type, pack_size, end_use,
  harvest_status, certifications, country_origin, region,
  volume, price_fob, available_from, available_to, notes, manifestId) {
  return `NEW SUPPLY MANIFEST — MEXAUSA FOOD GROUP
${'='.repeat(50)}
MANIFEST ID:     #${manifestId}
COMMODITY:       ${commodityLabel}
GRADE:           ${grade || 'Standard'}
PACK TYPE:       ${pack_type || 'N/A'}
PACK SIZE:       ${pack_size || 'N/A'}
END USE:         ${end_use || 'General / Wholesale'}
HARVEST STATUS:  ${harvest_status || 'Available now'}
CERTIFICATIONS:  ${certifications || 'None listed'}
ORIGIN:          ${country_origin || 'N/A'}${region ? ' — ' + region : ''}

VOLUME:          ${volume}
PRICE FOB:       ${price_fob || 'Contact for pricing'}
AVAILABILITY:    ${available_from || 'Immediate'} to ${available_to || 'TBD'}
${notes ? 'NOTES:           ' + notes + '\n' : ''}
${'─'.repeat(50)}
BLIND STRUCTURE — Supplier identity protected.
Mexausa Food Group | mexausafg.com
Fee: 1.5–2.5% on closed deals only. Zero upfront cost.
To express interest: Log in → Post a Need → reference Manifest #${manifestId}
${'─'.repeat(50)}`;
}

// ── GET /list ─────────────────────────────────────────────────────────────────
router.get('/list', async (req, res) => {
  const pool = global.db || req.app.locals.pool;
  try {
    await ensureTable(pool);
    const { commodity, end_use, status, limit } = req.query;
    let where = ["COALESCE(m.status,'active')='active'"], params = [], p = 1;
    if (commodity) { where.push(`m.commodity ILIKE $${p++}`); params.push(`%${commodity}%`); }
    if (end_use)   { where.push(`m.end_use ILIKE $${p++}`);   params.push(`%${end_use}%`); }
    const rows = await pool.query(
      `SELECT id,commodity,variety,grade,volume,pack_type,pack_size,end_use,
              harvest_status,certifications,country_origin,region,price_fob,
              available_from,available_to,buyers_pinged,adjacent_pinged,created_at,
              'VERIFIED SUPPLIER' AS supplier_label, status
       FROM manifests m WHERE ${where.join(' AND ')}
       ORDER BY created_at DESC LIMIT $${p}`,
      [...params, Math.min(parseInt(limit) || 50, 200)]
    ).catch(() => ({ rows: [] }));
    res.json({ ok: true, manifests: rows.rows, total: rows.rows.length });
  } catch(e) { res.status(500).json({ ok: false, manifests: [], error: e.message }); }
});

// ── GET /:id ──────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const pool = global.db || req.app.locals.pool;
  try {
    await ensureTable(pool);
    const row = await pool.query('SELECT * FROM manifests WHERE id=$1', [req.params.id]);
    if (!row.rows.length) return res.status(404).json({ ok: false, error: 'Not found' });
    res.json({ ok: true, manifest: row.rows[0] });
  } catch(e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
