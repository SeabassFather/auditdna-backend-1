// ============================================================================
// brain-commerce.js â€” Brain Commerce Intelligence Engine
// MexaUSA Food Group, Inc. â€” AuditDNA Agriculture
// Save to: C:\AuditDNA\backend\routes\brain-commerce.js
//
// WHAT THIS DOES:
//   1. Demand-Match: Buyer needs lettuce â†’ Brain finds lettuce growers in CRM
//      â†’ fires autonomous emails to matched growers â†’ returns deal economics
//   2. Price Table: Commodity + quantity â†’ predictive FOB/wholesale/margin table
//   3. Deal Monitor: Logs all demand signals for USDA data resale
//
// ENDPOINTS:
//   POST /api/brain/commerce/demand-match  â€” buyer need â†’ grower alert + economics
//   POST /api/brain/commerce/price-table   â€” commodity â†’ margin/profit table
//   GET  /api/brain/commerce/signals       â€” recent demand signals (JWT required)
// ============================================================================

const express   = require('express');
const router    = express.Router();
const nodemailer = require('nodemailer');
const Anthropic  = require('@anthropic-ai/sdk');
const pool = require('../db');

const getDb = () => pool || require('../db');

const getTransport = () => nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const FROM = `"MexaUSA Food Group â€” Brain Intelligence" <${process.env.SMTP_USER || 'saul@mexausafg.com'}>`;

const ADMIN = [
  process.env.SMTP_USER || 'saul@mexausafg.com',
  'saul@mexausafg.com',
];

// â”€â”€ COMMODITY ALIASES (match growers to buyer commodity terms) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const COMMODITY_MAP = {
  'lettuce':    ['lettuce','lechuga','romaine','iceberg','butter lettuce','mixed greens','leafy','greens'],
  'spinach':    ['spinach','espinaca','baby spinach'],
  'avocado':    ['avocado','aguacate','hass avocado'],
  'strawberry': ['strawberry','fresa','berries','berry'],
  'blueberry':  ['blueberry','arandano','berries','berry'],
  'blackberry': ['blackberry','mora','berries','berry'],
  'raspberry':  ['raspberry','frambuesa','berries','berry'],
  'tomato':     ['tomato','jitomate','tomate','roma','cherry tomato'],
  'broccoli':   ['broccoli','brocoli','broccolini'],
  'cauliflower':['cauliflower','coliflor'],
  'cabbage':    ['cabbage','col','repollo'],
  'jalapeÃ±o':   ['jalapeÃ±o','jalapeno','chile','pepper','chili'],
  'cucumber':   ['cucumber','pepino'],
  'zucchini':   ['zucchini','calabacita','squash'],
  'lime':       ['lime','limon','persian lime','lemon'],
  'cilantro':   ['cilantro','coriander'],
  'garlic':     ['garlic','ajo'],
  'onion':      ['onion','cebolla','green onion'],
  'mango':      ['mango'],
  'asparagus':  ['asparagus','esparrago'],
  'radicchio':  ['radicchio'],
};

function getCommodityTerms(commodity) {
  const lower = (commodity || '').toLowerCase();
  for (const [key, terms] of Object.entries(COMMODITY_MAP)) {
    if (lower.includes(key) || terms.some(t => lower.includes(t))) {
      return terms;
    }
  }
  return [lower, lower + 's'];
}

// â”€â”€ FIND MATCHED GROWERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function findMatchedGrowers(db, commodity, region) {
  const terms = getCommodityTerms(commodity);
  const conditions = terms.map((_, i) => `(
    LOWER(COALESCE(primary_commodity,'')) LIKE $${i+1} OR
    LOWER(COALESCE(commodities,'')) LIKE $${i+1} OR
    LOWER(COALESCE(products_grown,'')) LIKE $${i+1} OR
    LOWER(COALESCE(notes,'')) LIKE $${i+1}
  )`).join(' OR ');
  const params = terms.map(t => `%${t}%`);

  let growers = [];
  try {
    const r = await db.query(`
      SELECT id, full_name, company_name, email, phone, mobile,
             primary_commodity, commodities, region, state, country,
             city, tier, status
      FROM growers
      WHERE (email IS NOT NULL AND email != '')
        AND (${conditions})
      ORDER BY tier ASC, id DESC
      LIMIT 100
    `, params);
    growers = r.rows;
  } catch (e) {
    console.warn('[BRAIN-COMMERCE] growers query:', e.message);
  }

  // Also check shipper_contacts and buyer_segments for grower-type contacts
  try {
    const r2 = await db.query(`
      SELECT id, COALESCE(full_name, company_name) AS full_name,
             company_name, email, COALESCE(mobile, phone) AS phone,
             commodity, city, state, country, 'shipper_contacts' AS src
      FROM shipper_contacts
      WHERE email IS NOT NULL AND email != ''
        AND (contact_type ILIKE '%grow%' OR contact_type ILIKE '%farm%' OR contact_type ILIKE '%producer%')
        AND (${conditions})
      LIMIT 50
    `, params);
    const seen = new Set(growers.map(g => g.email?.toLowerCase()));
    r2.rows.forEach(r => {
      if (!seen.has(r.email?.toLowerCase())) growers.push(r);
    });
  } catch (e) {
    console.warn('[BRAIN-COMMERCE] shipper_contacts grower query:', e.message);
  }

  console.log(`[BRAIN-COMMERCE] Found ${growers.length} growers for "${commodity}"`);
  return growers;
}

// â”€â”€ GROWER ALERT EMAIL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildGrowerAlertEmail(grower, data) {
  const {
    commodity, quantity, unit, deliveryWindow, urgency, buyerRegion,
    buyerType, notes, requestedBy
  } = data;

  const urgencyColor = urgency === 'URGENT' ? '#B91C1C' : urgency === 'HIGH' ? '#D97706' : '#0F7B41';
  const urgencyBg    = urgency === 'URGENT' ? '#FEF2F2' : urgency === 'HIGH' ? '#FFFBEB' : '#F0FDF4';
  const growerName   = grower.full_name || grower.company_name || 'Grower';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:20px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
<tr><td style="background:#0F1419;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:16px 22px 12px;">
      <div style="font-size:9px;letter-spacing:4px;color:#475569;text-transform:uppercase;">MexaUSA Food Group â€” Brain Intelligence</div>
      <div style="font-size:16px;font-weight:700;color:#ffffff;letter-spacing:3px;margin-top:3px;">BUYER DEMAND ALERT</div>
    </td></tr>
    <tr><td style="background:${urgencyColor};padding:7px 22px;">
      <div style="font-size:9px;font-weight:700;color:#ffffff;letter-spacing:3px;text-transform:uppercase;">${urgency || 'STANDARD'} DEMAND â€” ${commodity.toUpperCase()}</div>
    </td></tr>
  </table>
</td></tr>
<tr><td style="background:#ffffff;padding:22px;">
  <p style="margin:0 0 14px;font-size:14px;color:#1e293b;line-height:1.7;">Dear ${growerName},</p>
  <p style="margin:0 0 14px;font-size:14px;color:#1e293b;line-height:1.7;">
    Our intelligence system has identified a <strong>verified buyer demand</strong> for <strong>${commodity}</strong> that matches your operation. We are reaching out immediately so you can respond first.
  </p>
  <div style="background:${urgencyBg};border:1px solid ${urgencyColor}33;border-radius:6px;padding:14px 16px;margin:14px 0;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;padding:3px 0;width:38%;font-weight:600;">Commodity</td><td style="font-size:13px;color:#1e293b;font-weight:700;padding:3px 0;">${commodity}</td></tr>
      <tr><td style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;padding:3px 0;font-weight:600;">Quantity Needed</td><td style="font-size:13px;color:#1e293b;font-weight:700;padding:3px 0;">${quantity} ${unit || 'loads'}</td></tr>
      <tr><td style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;padding:3px 0;font-weight:600;">Delivery Window</td><td style="font-size:13px;color:#1e293b;font-weight:700;padding:3px 0;color:${urgencyColor};">${deliveryWindow || 'As soon as possible'}</td></tr>
      ${buyerRegion ? `<tr><td style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;padding:3px 0;font-weight:600;">Buyer Region</td><td style="font-size:13px;color:#1e293b;padding:3px 0;">${buyerRegion}</td></tr>` : ''}
      ${buyerType ? `<tr><td style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;padding:3px 0;font-weight:600;">Buyer Type</td><td style="font-size:13px;color:#1e293b;padding:3px 0;">${buyerType}</td></tr>` : ''}
      ${notes ? `<tr><td style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;padding:3px 0;font-weight:600;vertical-align:top;">Notes</td><td style="font-size:12px;color:#1e293b;padding:3px 0;">${notes}</td></tr>` : ''}
    </table>
  </div>
  <p style="margin:0 0 14px;font-size:14px;color:#1e293b;line-height:1.7;">
    <strong>If you can fulfill this demand, contact us immediately.</strong> The buyer is actively purchasing and the first grower to confirm gets priority introduction.
  </p>
  <p style="margin:0;font-size:13px;color:#1e293b;line-height:1.8;">
    Saul Garcia &nbsp;|&nbsp; CEO, MexaUSA Food Group, Inc.<br>
    US: <a href="tel:+18312513116" style="color:#0F7B41;">+1-831-251-3116</a> &nbsp;|&nbsp; 
    MX: <a href="tel:+526463402686" style="color:#0F7B41;">+52-646-340-2686</a><br>
    <a href="mailto:saul@mexausafg.com" style="color:#0F7B41;">saul@mexausafg.com</a> &nbsp;|&nbsp; 
    <a href="https://mexausafg.com" style="color:#0F7B41;">mexausafg.com</a>
  </p>
</td></tr>
<tr><td style="background:#0F1419;padding:9px 22px;text-align:center;">
  <div style="font-size:8px;color:#334155;letter-spacing:1px;">MexaUSA Food Group, Inc. Â· AuditDNA Agriculture Intelligence Â· Brain Commerce Engine</div>
</td></tr>
</table></td></tr></table>
</body></html>`;
}

// â”€â”€ PREDICTIVE PRICING ENGINE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function generatePriceTable(commodity, quantity, unit) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `You are a produce market analyst and pricing expert for MexaUSA Food Group, Inc. â€” a US-Mexico corridor wholesale importer.

Commodity: ${commodity}
Requested quantity: ${quantity} ${unit || 'cases'}
Date: ${new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
Corridor: US-Mexico (Baja California, Michoacan, Sinaloa â†’ California, Arizona, Texas)

Generate a comprehensive pricing and margin analysis table. Return ONLY valid JSON (no markdown, no explanation):

{
  "commodity": "${commodity}",
  "analysis_date": "${new Date().toISOString().slice(0,10)}",
  "unit": "case",
  "cases_per_pallet": 48,
  "pallets_per_load": 20,
  "cases_per_load": 960,
  "current_fob_low": 0.00,
  "current_fob_high": 0.00,
  "current_fob_avg": 0.00,
  "wholesale_price_avg": 0.00,
  "retail_price_avg": 0.00,
  "freight_cost_per_load_usd": 0.00,
  "handling_cost_per_case_usd": 0.00,
  "compliance_cost_per_case_usd": 0.00,
  "price_trend": "rising|falling|stable",
  "trend_pct_change_30d": 0.0,
  "market_notes": "2-3 sentences on current market conditions, supply/demand, season",
  "best_buy_window": "specific recommendation",
  "risk_factors": ["factor1","factor2"],
  "volume_scenarios": [
    {
      "loads": 1,
      "cases": 960,
      "fob_cost": 0.00,
      "freight_cost": 0.00,
      "handling_cost": 0.00,
      "compliance_cost": 0.00,
      "total_cost": 0.00,
      "gross_revenue": 0.00,
      "gross_profit": 0.00,
      "margin_pct": 0.0,
      "profit_per_case": 0.00
    },
    { "loads": 3, "cases": 2880 },
    { "loads": 5, "cases": 4800 },
    { "loads": 10, "cases": 9600 },
    { "loads": 20, "cases": 19200 }
  ],
  "usda_terminal_reference": "terminal market name",
  "confidence": 85
}`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }],
    });

    const text = (response.content || [])
      .map(b => b.type === 'text' ? b.text : '')
      .join('').trim();

    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    return { success: true, table: parsed };
  } catch (e) {
    console.error('[BRAIN-COMMERCE] price table error:', e.message);
    return { success: false, error: e.message };
  }
}

// â”€â”€ LOG DEMAND SIGNAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function logDemandSignal(db, data, growerCount, priceTable) {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS brain_demand_signals (
        id             SERIAL PRIMARY KEY,
        commodity      VARCHAR(100),
        quantity       NUMERIC(10,2),
        unit           VARCHAR(20),
        delivery_window VARCHAR(100),
        urgency        VARCHAR(20),
        buyer_region   VARCHAR(200),
        buyer_type     VARCHAR(100),
        growers_notified INTEGER DEFAULT 0,
        fob_avg        NUMERIC(10,2),
        wholesale_avg  NUMERIC(10,2),
        margin_pct_1load NUMERIC(6,2),
        profit_1load   NUMERIC(10,2),
        notes          TEXT,
        triggered_by   VARCHAR(200),
        created_at     TIMESTAMPTZ DEFAULT NOW()
      )
    `).catch(() => {});

    const table = priceTable?.table;
    const scenario1 = table?.volume_scenarios?.[0];

    await db.query(`
      INSERT INTO brain_demand_signals
        (commodity, quantity, unit, delivery_window, urgency, buyer_region, buyer_type,
         growers_notified, fob_avg, wholesale_avg, margin_pct_1load, profit_1load, notes, triggered_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    `, [
      data.commodity, parseFloat(data.quantity) || null, data.unit,
      data.deliveryWindow, data.urgency, data.buyerRegion, data.buyerType,
      growerCount,
      table?.current_fob_avg || null,
      table?.wholesale_price_avg || null,
      scenario1?.margin_pct || null,
      scenario1?.gross_profit || null,
      data.notes || null,
      data.triggeredBy || 'manual',
    ]);
  } catch (e) {
    console.warn('[BRAIN-COMMERCE] logDemandSignal:', e.message);
  }
}

// â”€â”€ ENDPOINT: DEMAND MATCH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/demand-match', async (req, res) => {
  const {
    commodity, quantity, unit, deliveryWindow, urgency,
    buyerRegion, buyerType, notes, triggeredBy, skipEmail,
    buyerName, buyerCompany,
  } = req.body;

  if (!commodity) {
    return res.status(400).json({ success: false, error: 'commodity required' });
  }

  console.log(`[BRAIN-COMMERCE] DEMAND MATCH: ${commodity} â€” ${quantity} ${unit} â€” ${urgency || 'STANDARD'}`);

  const db = getDb();

  // 1. Find matched growers
  const growers = await findMatchedGrowers(db, commodity, buyerRegion);

  // 2. Generate pricing table (async, don't block grower emails)
  const priceTablePromise = generatePriceTable(commodity, quantity, unit);

  // 3. Fire emails to matched growers (unless skipEmail)
  let emailsSent = 0;
  let emailsFailed = 0;

  if (!skipEmail && growers.length > 0) {
    let transport;
    try {
      transport = getTransport();
      await transport.verify();

      const emailData = { commodity, quantity, unit, deliveryWindow, urgency, buyerRegion, buyerType, notes };
      const DELAY = 400;

      for (let i = 0; i < growers.length; i++) {
        const g = growers[i];
        const email = g.email;
        if (!email) continue;
        try {
          await transport.sendMail({
            from: FROM,
            to: email,
            subject: `[BRAIN DEMAND ALERT] ${commodity} â€” ${quantity} ${unit || 'loads'} needed â€” ${deliveryWindow || 'ASAP'}`,
            html: buildGrowerAlertEmail(g, emailData),
            headers: {
              'X-Brain-Action':    'DEMAND_MATCH',
              'X-Brain-Commodity': commodity,
              'X-Brain-Urgency':   urgency || 'STANDARD',
              'Reply-To':          'saul@mexausafg.com',
            }
          });
          emailsSent++;
        } catch (e) {
          emailsFailed++;
          console.warn(`[BRAIN-COMMERCE] grower email failed ${email}:`, e.message);
        }
        if (i < growers.length - 1) await new Promise(r => setTimeout(r, DELAY));
      }
    } catch (e) {
      console.error('[BRAIN-COMMERCE] SMTP unavailable:', e.message);
    }
  }

  // 4. Notify admins
  try {
    const transport = getTransport();
    await transport.sendMail({
      from: FROM,
      to: ADMIN.join(','),
      subject: `[BRAIN COMMERCE] ${commodity} demand matched â€” ${emailsSent} growers alerted`,
      text: [
        `Commodity: ${commodity}`,
        `Quantity: ${quantity} ${unit}`,
        `Delivery: ${deliveryWindow || 'ASAP'}`,
        `Urgency: ${urgency || 'STANDARD'}`,
        `Buyer Region: ${buyerRegion || '--'}`,
        `Buyer Type: ${buyerType || '--'}`,
        `Growers found: ${growers.length}`,
        `Emails sent: ${emailsSent}`,
        `Triggered by: ${triggeredBy || 'manual'}`,
      ].join('\n')
    }).catch(() => {});
  } catch (e) {}

  // 5. Await price table
  const priceTable = await priceTablePromise;

  // 6. Log demand signal
  await logDemandSignal(db, req.body, emailsSent, priceTable);

  console.log(`[BRAIN-COMMERCE] COMPLETE â€” ${emailsSent}/${growers.length} growers alerted`);

  res.json({
    success: true,
    commodity,
    growers_found:    growers.length,
    emails_sent:      emailsSent,
    emails_failed:    emailsFailed,
    price_table:      priceTable.success ? priceTable.table : null,
    price_table_error: priceTable.success ? null : priceTable.error,
    grower_sample:    growers.slice(0, 5).map(g => ({
      name:      g.full_name || g.company_name,
      commodity: g.primary_commodity || g.commodities || g.commodity,
      region:    [g.city, g.state, g.country].filter(Boolean).join(', '),
    })),
  });
});

// â”€â”€ ENDPOINT: PRICE TABLE ONLY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/price-table', async (req, res) => {
  const { commodity, quantity, unit } = req.body;
  if (!commodity) return res.status(400).json({ success: false, error: 'commodity required' });
  console.log(`[BRAIN-COMMERCE] PRICE TABLE: ${commodity} ${quantity} ${unit}`);
  const result = await generatePriceTable(commodity, quantity || 1, unit || 'loads');
  res.json(result);
});

// â”€â”€ ENDPOINT: DEMAND SIGNALS (protected) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const jwt = require('jsonwebtoken');
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try { jwt.verify(token, process.env.JWT_SECRET || 'auditdna_jwt_2026'); next(); }
  catch (e) { res.status(401).json({ error: 'Invalid token' }); }
}

router.get('/signals', requireAuth, async (req, res) => {
  const db = getDb();
  try {
    const r = await db.query(`
      SELECT commodity, quantity, unit, delivery_window, urgency,
             buyer_region, buyer_type, growers_notified,
             fob_avg, wholesale_avg, margin_pct_1load, profit_1load,
             created_at
      FROM brain_demand_signals
      ORDER BY created_at DESC
      LIMIT 100
    `);
    res.json({ success: true, signals: r.rows });
  } catch (e) {
    res.json({ success: false, signals: [], error: e.message });
  }
});

module.exports = router;
