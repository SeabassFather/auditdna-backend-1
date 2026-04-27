// ============================================================================
// loaf-intelligence.js — LOAF Autonomous Intelligence Engine v3
// MexaUSA Food Group, Inc. — AuditDNA Agriculture Intelligence Platform
// Save to: C:\AuditDNA\backend\services\loaf-intelligence.js
//
// COMMODITY-PRECISE MATCHING:
//   Buyers/Wholesalers/Distributors/Retailers/Chain Stores:
//     → STRICT match — only contacts who explicitly buy that commodity/family
//   Shippers/Packers/Logistics:
//     → OPEN match — they move all produce, always notified
//
// COMMODITY FAMILIES (a blueberry buyer also gets blackberry alerts):
//   BERRIES     — strawberry, blueberry, blackberry, raspberry, boysenberry
//   LEAFY       — spinach, lettuce, romaine, iceberg, arugula, kale, radicchio, chard, mixed greens
//   BRASSICAS   — broccoli, cauliflower, cabbage, brussels sprouts
//   TROPICALS   — avocado, mango, papaya, pineapple, coconut
//   CITRUS      — lime, lemon, orange, grapefruit, tangerine, mandarin
//   ROOT_VEG    — potato, carrot, beet, radish, turnip, yam
//   ALLIUMS     — onion, garlic, green onion, leek, shallot
//   NIGHTSHADES — tomato, pepper, jalapeño, chile, eggplant
//   CUCURBITS   — cucumber, zucchini, squash, pumpkin, melon
//   MELONS      — watermelon, cantaloupe, honeydew
//   STONE_FRUIT — peach, plum, nectarine, cherry, apricot
//   GRAPES      — table grape, wine grape, raisin
//   HERBS       — cilantro, basil, parsley, mint, dill, epazote
//   ASPARAGUS   — asparagus, esparrago
// ============================================================================

const nodemailer = require('nodemailer');

const getTransport = () => nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});
const FROM = `"MexaUSA Food Group — LOAF Intelligence" <${process.env.SMTP_USER || 'sgarcia1911@gmail.com'}>`;

// ── COMMODITY TAXONOMY ────────────────────────────────────────────────────────
const COMMODITY_FAMILIES = {
  BERRIES:      ['strawberry','blueberry','blackberry','raspberry','boysenberry','cranberry','gooseberry','fresa','arandano','mora','frambuesa','zarzamora','berry','berries','baya'],
  LEAFY:        ['spinach','lettuce','romaine','iceberg','arugula','kale','radicchio','chard','mixed greens','spring mix','baby spinach','baby kale','escarole','endive','watercress','espinaca','lechuga','acelga','berros','greens','leafy'],
  BRASSICAS:    ['broccoli','cauliflower','cabbage','brussels','kohlrabi','bok choy','napa','col','repollo','coliflor','brocoli','broccolini','brassica'],
  TROPICALS:    ['avocado','mango','papaya','pineapple','coconut','guava','aguacate','mango','papaya','pina','coco','guayaba','tropical'],
  CITRUS:       ['lime','lemon','orange','grapefruit','tangerine','mandarin','clementine','citrus','limon','naranja','toronja','mandarina'],
  ROOT_VEG:     ['potato','carrot','beet','radish','turnip','yam','sweet potato','parsnip','papa','zanahoria','betabel','rabano','nabo','camote'],
  ALLIUMS:      ['onion','garlic','green onion','leek','shallot','scallion','chive','cebolla','ajo','cebollita','puerro','chalote'],
  NIGHTSHADES:  ['tomato','roma','vine ripe','cherry tomato','pepper','bell pepper','jalapeño','jalapeno','chile','chili','serrano','poblano','habanero','eggplant','tomate','jitomate','pimiento','berenjena','nightshade'],
  CUCURBITS:    ['cucumber','zucchini','squash','calabaza','pepino','chayote','bitter melon','calabacita','cucurbit'],
  MELONS:       ['watermelon','cantaloupe','honeydew','melon','sandia','melon','cantaloup'],
  STONE_FRUIT:  ['peach','plum','nectarine','cherry','apricot','durazno','ciruela','cereza','chabacano','stone fruit','drupe'],
  GRAPES:       ['grape','raisin','uva','table grape','wine grape','pasa'],
  HERBS:        ['cilantro','basil','parsley','mint','dill','oregano','thyme','epazote','hierbabuena','perejil','albahaca','herb','hierba'],
  ASPARAGUS:    ['asparagus','esparrago','esparragos'],
  MUSHROOMS:    ['mushroom','hongo','seta','champignon','portobello','shiitake'],
  CORN:         ['corn','maiz','elote','sweet corn'],
  BEANS:        ['green bean','ejote','bean','frijol','snap bean'],
  ARTICHOKE:    ['artichoke','alcachofa'],
  CELERY:       ['celery','apio','fennel','hinojo'],
};

// Get the family name for a commodity
function getCommodityFamily(commodity) {
  const lower = (commodity || '').toLowerCase();
  for (const [family, terms] of Object.entries(COMMODITY_FAMILIES)) {
    if (terms.some(t => lower.includes(t) || t.includes(lower))) return family;
  }
  return null;
}

// Get ALL search terms for a commodity (exact + family members)
function getCommoditySearchTerms(commodity) {
  const lower = (commodity || '').toLowerCase();
  const family = getCommodityFamily(commodity);

  // Always include exact commodity terms
  const exact = [lower];

  // Add common variations
  if (!lower.endsWith('s')) exact.push(lower + 's');
  if (lower.endsWith('s'))  exact.push(lower.slice(0, -1));

  // Add Spanish equivalents from family
  const familyTerms = family ? COMMODITY_FAMILIES[family] : [];

  return { exact, familyTerms, family };
}

// ── CONTACT TYPE CLASSIFIERS ──────────────────────────────────────────────────
const SHIPPER_PATTERNS    = ['ship','freight','carrier','trucking','logistics','transport','forwarding','customs broker','freight broker','camion','flete','transportista','aduanal'];
const PACKER_PATTERNS     = ['pack','packing','packinghouse','empaque','cooling','precool','cold storage','shed','envase'];
const CHAINSTORE_PATTERNS = ['walmart','costco','kroger','whole foods','trader joe','safeway','albertsons','sprouts','target','publix','heb','aldi','wegmans','giant','stop shop','chain store','grocery chain','supermarket chain','retail chain'];
const WHOLESALE_PATTERNS  = ['wholesale','wholesaler','terminal market','mercado','produce market','distribuidor mayorista','mayoreo'];
const DISTRIBUTOR_PATTERNS= ['distribut','distribuidor','distribucion','reparto','delivery service'];
const RETAILER_PATTERNS   = ['retail','retailer','tienda','store','market','bodega','supermercado','supermarket'];

function classifyContact(contact) {
  const text = [contact.company, contact.buyer_type, contact.contact_type, contact.business_type, contact.category, contact.notes].filter(Boolean).join(' ').toLowerCase();
  if (CHAINSTORE_PATTERNS.some(p => text.includes(p))) return 'chain_store';
  if (WHOLESALE_PATTERNS.some(p => text.includes(p)))  return 'wholesaler';
  if (PACKER_PATTERNS.some(p => text.includes(p)))     return 'packer';
  if (SHIPPER_PATTERNS.some(p => text.includes(p)))    return 'shipper';
  if (DISTRIBUTOR_PATTERNS.some(p => text.includes(p)))return 'distributor';
  if (RETAILER_PATTERNS.some(p => text.includes(p)))   return 'retailer';
  return 'buyer';
}

// ── SCORING ───────────────────────────────────────────────────────────────────
function scoreContact(contact, quantity, unit, region) {
  let score = 0;
  const qtyNum = parseFloat(quantity) || 0;
  const regionLower = (region || '').toLowerCase();
  const vol = parseFloat(contact.avg_volume || contact.avg_weekly_volume_cases || 0);
  if (vol > 0 && qtyNum > 0) score += (Math.min(vol, qtyNum) / Math.max(vol, qtyNum)) * 35;
  else score += 17;
  const txCount = parseInt(contact.tx_count || contact.transaction_count || 0);
  score += Math.min(txCount, 10) / 10 * 30;
  const contactRegion = [contact.city, contact.state, contact.region, contact.country].filter(Boolean).join(' ').toLowerCase();
  if (regionLower && contactRegion) {
    const tokens = regionLower.split(/[\s,]+/).filter(t => t.length > 2);
    if (tokens.some(t => contactRegion.includes(t))) score += 20;
    else if ((contact.country || '').toLowerCase().includes('us')) score += 10;
  }
  score += (parseFloat(contact.response_rate || 0.5)) * 15;
  return Math.round(score);
}

// ── MULTI-TABLE CONTACT FETCH ─────────────────────────────────────────────────
async function fetchAllMatchedContacts(db, commodity, quantity, unit, region) {
  const { exact, familyTerms, family } = getCommoditySearchTerms(commodity);

  // STRICT terms for commercial buyers (exact commodity + family only)
  const strictTerms = [...new Set([...exact, ...familyTerms])];
  // Build SQL conditions for strict match — ONLY commodity fields, NOT company name
  const strictConditions = strictTerms.map((_, i) => `(
    LOWER(COALESCE(commodity,'')) LIKE $${i+1} OR
    LOWER(COALESCE(commodities,'')) LIKE $${i+1} OR
    LOWER(COALESCE(product_interest,'')) LIKE $${i+1} OR
    LOWER(COALESCE(category,'')) LIKE $${i+1}
  )`).join(' OR ');
  const strictParams = strictTerms.map(t => `%${t}%`);

  const allContacts = [];
  const seenEmails = new Set();

  function addContacts(rows) {
    rows.forEach(r => {
      const email = r.email?.toLowerCase();
      if (email && !seenEmails.has(email)) {
        seenEmails.add(email);
        allContacts.push(r);
      }
    });
  }

  // ── buyers — STRICT commodity match ──────────────────────────────────────────
  try {
    const r = await db.query(`
      SELECT id, company, contact_name, email, phone,
             city, state, country, region, commodity,
             COALESCE(avg_weekly_volume_cases,0) AS avg_volume,
             COALESCE(transaction_count,0)       AS tx_count,
             COALESCE(response_rate,0.5)         AS response_rate,
             COALESCE(buyer_type,'buyer')        AS contact_type,
             'buyers' AS source_table
      FROM buyers
      WHERE email IS NOT NULL AND email != ''
        AND (${strictConditions})
      ORDER BY COALESCE(transaction_count,0) DESC, COALESCE(response_rate,0.5) DESC
      LIMIT 400
    `, strictParams);
    addContacts(r.rows);
    console.log(`[LOAF-INTEL] buyers strict match: ${r.rows.length} for ${commodity} (family: ${family})`);
  } catch (e) { console.warn('[LOAF-INTEL] buyers:', e.message); }

  // ── buyer_segments — STRICT commodity match ───────────────────────────────────
  try {
    const r = await db.query(`
      SELECT id, company, contact_name, email, phone,
             city, state, country, commodity,
             0 AS avg_volume, 0 AS tx_count, 0.5 AS response_rate,
             COALESCE(buyer_type,'buyer') AS contact_type,
             'buyer_segments' AS source_table
      FROM buyer_segments
      WHERE email IS NOT NULL AND email != ''
        AND (${strictConditions})
      LIMIT 300
    `, strictParams);
    addContacts(r.rows);
    console.log(`[LOAF-INTEL] buyer_segments strict match: ${r.rows.length}`);
  } catch (e) { console.warn('[LOAF-INTEL] buyer_segments:', e.message); }

  // ── shipper_contacts — OPEN match (logistics handles all produce) ─────────────
  // Shippers/packers/logistics get notified regardless of commodity
  // ONLY contact_type-classified logistics contacts get open match
  try {
    const r = await db.query(`
      SELECT id,
             COALESCE(company_name, company, full_name) AS company,
             COALESCE(contact_name, full_name)          AS contact_name,
             email,
             COALESCE(mobile, phone)                    AS phone,
             city, state, country, commodity,
             0 AS avg_volume, 0 AS tx_count, 0.5 AS response_rate,
             COALESCE(contact_type, company_type, 'shipper') AS contact_type,
             'shipper_contacts' AS source_table
      FROM shipper_contacts
      WHERE email IS NOT NULL AND email != ''
      LIMIT 500
    `);
    addContacts(r.rows);
    console.log(`[LOAF-INTEL] shipper_contacts: ${r.rows.length} logistics contacts`);
  } catch (e) { console.warn('[LOAF-INTEL] shipper_contacts:', e.message); }

  // Score and classify all contacts
  const scored = allContacts.map(c => ({
    ...c,
    classified_type: classifyContact(c),
    score: scoreContact(c, quantity, unit, region),
  })).sort((a, b) => b.score - a.score);

  // For logistics contacts from shipper_contacts that have commodity info,
  // include them only if commodity matches OR they have no commodity specified
  const filteredScored = scored.filter(c => {
    if (c.source_table === 'shipper_contacts') {
      // Logistics — include if no commodity or commodity matches
      if (!c.commodity || c.commodity === '') return true;
      const contactCommodity = (c.commodity || '').toLowerCase();
      return strictTerms.some(t => contactCommodity.includes(t.replace('%','')));
    }
    // Buyers — already filtered by strict SQL query, include all
    return true;
  });

  // Segment by classified type
  const segments = {
    buyers:        filteredScored.filter(c => c.classified_type === 'buyer').slice(0, 40),
    wholesalers:   filteredScored.filter(c => c.classified_type === 'wholesaler').slice(0, 20),
    chain_stores:  filteredScored.filter(c => c.classified_type === 'chain_store').slice(0, 15),
    distributors:  filteredScored.filter(c => c.classified_type === 'distributor').slice(0, 20),
    retailers:     filteredScored.filter(c => c.classified_type === 'retailer').slice(0, 15),
    packers:       filteredScored.filter(c => c.classified_type === 'packer').slice(0, 20),
    shippers:      filteredScored.filter(c => c.classified_type === 'shipper').slice(0, 25),
  };

  const total = Object.values(segments).reduce((s, a) => s + a.length, 0);
  console.log(`[LOAF-INTEL] ${commodity} (${family}) — Total contacts: ${total}`);
  Object.entries(segments).forEach(([type, arr]) => { if (arr.length) console.log(`  ${type}: ${arr.length}`); });

  return { segments, family, total };
}

// ── EMAIL BUILDERS ────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  buyer:       { accent:'#3B6D11', label:'BUYER ALERT',       cta:'First confirmed response gets priority contact with the grower. Reply YES.' },
  wholesaler:  { accent:'#854F0B', label:'WHOLESALE ALERT',   cta:'First wholesale buyer to confirm gets direct grower pricing. Reply YES.' },
  chain_store: { accent:'#185FA5', label:'CHAIN STORE ALERT', cta:'Purchasing surplus supports your ESG reporting and food waste reduction goals. Reply YES.' },
  distributor: { accent:'#7C3AED', label:'DISTRIBUTION ALERT',cta:'First distribution partner confirmed gets direct grower introduction. Reply YES.' },
  retailer:    { accent:'#185FA5', label:'RETAIL ALERT',      cta:'Direct from grower. Verified origin. FSMA traceability available. Reply YES.' },
  packer:      { accent:'#0F7B41', label:'PACKING OPPORTUNITY',cta:'If you have packing capacity for this commodity, reply YES. We will connect you.' },
  shipper:     { accent:'#475569', label:'FREIGHT OPPORTUNITY',cta:'If you have capacity in this corridor, reply YES with your rate and availability.' },
};

function buildSubject(action, type, commodity, quantity, unit, family) {
  const familyLabel = family ? ` [${family}]` : '';
  const typeLabels = {
    buyer:       action === 'ALTRUISTIC' ? `[ALTRUISTIC${familyLabel}] ${commodity} Surplus — ${quantity} ${unit}` : `[LAUNCH${familyLabel}] ${commodity} Available — ${quantity} ${unit}`,
    wholesaler:  action === 'ALTRUISTIC' ? `[WHOLESALE${familyLabel}] ${commodity} Surplus — ${quantity} ${unit}` : `[WHOLESALE${familyLabel}] ${commodity} — ${quantity} ${unit}`,
    chain_store: action === 'ALTRUISTIC' ? `[ESG ALERT${familyLabel}] ${commodity} Surplus — Waste Prevention` : `[CHAIN PROCUREMENT${familyLabel}] ${commodity} — ${quantity} ${unit}`,
    distributor: action === 'ALTRUISTIC' ? `[DISTRIBUTION${familyLabel}] ${commodity} Surplus — ${quantity} ${unit}` : `[DISTRIBUTION${familyLabel}] ${commodity} Available`,
    retailer:    action === 'ALTRUISTIC' ? `[RETAIL${familyLabel}] ${commodity} Surplus` : `[RETAIL${familyLabel}] ${commodity} — ${quantity} ${unit}`,
    packer:      `[PACKING${familyLabel}] ${commodity} — ${quantity} ${unit} — Capacity Needed`,
    shipper:     `[FREIGHT${familyLabel}] ${commodity} — ${quantity} ${unit} — Ready to Move`,
  };
  return typeLabels[type] || typeLabels.buyer;
}

function buildEmail(contact, type, action, data, family) {
  const { commodity, quantity, unit, price, negotiable, notes, user, gps } = data;
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.buyer;
  const origin = gps ? `${gps.lat}, ${gps.lng}` : (user?.region || 'US-Mexico Corridor');
  const familyLine = family ? `<div style="font-size:10px;color:#64748b;letter-spacing:1px;margin-top:2px;">Commodity Group: ${family}</div>` : '';

  const introByType = {
    buyer:       action==='ALTRUISTIC' ? `A grower in the MexaUSA network has <strong>${quantity} ${unit} of ${commodity}</strong> surplus — offered to buyers who may have a shortfall or weather gap.` : `A verified grower has <strong>${quantity} ${unit} of ${commodity}</strong> available on the open market.`,
    wholesaler:  action==='ALTRUISTIC' ? `Wholesale opportunity: <strong>${quantity} ${unit} of ${commodity}</strong> surplus available at favorable terms to move quickly.` : `<strong>${quantity} ${unit} of ${commodity}</strong> is available for wholesale through the MexaUSA network.`,
    chain_store: action==='ALTRUISTIC' ? `ESG opportunity: <strong>${quantity} ${unit} of ${commodity}</strong> surplus available. Purchasing this prevents food waste and qualifies for your sustainability reporting metrics.` : `<strong>${quantity} ${unit} of ${commodity}</strong> is available for chain procurement through the MexaUSA Food Group network.`,
    distributor: action==='ALTRUISTIC' ? `Distribution needed: <strong>${quantity} ${unit} of ${commodity}</strong> surplus requires a distribution partner.` : `<strong>${quantity} ${unit} of ${commodity}</strong> is available for distribution.`,
    retailer:    action==='ALTRUISTIC' ? `Fresh produce available: <strong>${quantity} ${unit} of ${commodity}</strong> surplus from a verified MexaUSA grower.` : `<strong>${quantity} ${unit} of ${commodity}</strong> available for retail — direct from grower.`,
    packer:      `Packing capacity needed: <strong>${quantity} ${unit} of ${commodity}</strong> in field and ready for harvest. If you have capacity, we want to connect you with the grower.`,
    shipper:     `Freight opportunity: <strong>${quantity} ${unit} of ${commodity}</strong> is ready to move from the US-Mexico corridor. Origin: ${origin}.`,
  };

  const intro = introByType[type] || introByType.buyer;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:18px 14px;">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
<tr><td style="background:#0F1419;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:16px 22px 12px;">
      <div style="font-size:9px;letter-spacing:4px;color:#475569;text-transform:uppercase;">MexaUSA Food Group, Inc.</div>
      <div style="font-size:17px;font-weight:700;color:#fff;letter-spacing:4px;margin-top:3px;">MFGINC-LOAF</div>
    </td></tr>
    <tr><td style="background:${cfg.accent};padding:7px 22px;">
      <div style="font-size:8px;font-weight:700;color:#fff;letter-spacing:3px;text-transform:uppercase;">${cfg.label}</div>
      ${familyLine ? `<div style="font-size:8px;color:rgba(255,255,255,0.7);letter-spacing:1px;margin-top:1px;">Commodity Group: ${family}</div>` : ''}
    </td></tr>
  </table>
</td></tr>
<tr><td style="background:#fff;padding:20px 22px;">
  <p style="margin:0 0 12px;font-size:14px;color:#1e293b;line-height:1.7;">Dear ${contact.contact_name || contact.company || 'Trade Partner'},</p>
  <p style="margin:0 0 12px;font-size:14px;color:#1e293b;line-height:1.7;">${intro}</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;margin:12px 0;">
    <tr><td style="padding:13px 15px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;padding:3px 0;width:38%;">Commodity</td><td style="font-size:13px;color:#1e293b;font-weight:700;padding:3px 0;">${commodity}</td></tr>
        ${family ? `<tr><td style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;padding:3px 0;">Category</td><td style="font-size:12px;color:#64748b;padding:3px 0;">${family}</td></tr>` : ''}
        <tr><td style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;padding:3px 0;">Quantity</td><td style="font-size:13px;color:#1e293b;font-weight:700;padding:3px 0;">${quantity} ${unit}</td></tr>
        ${price ? `<tr><td style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;padding:3px 0;">Price</td><td style="font-size:13px;color:#1e293b;font-weight:700;padding:3px 0;">${price}/unit${negotiable?' (Negotiable)':''}</td></tr>` : ''}
        <tr><td style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;padding:3px 0;">Origin</td><td style="font-size:13px;color:#1e293b;font-weight:600;padding:3px 0;">${origin}</td></tr>
        <tr><td style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;padding:3px 0;">Available</td><td style="font-size:12px;color:#1e293b;padding:3px 0;">${new Date().toLocaleDateString('en-US',{weekday:'short',year:'numeric',month:'short',day:'numeric'})}</td></tr>
        ${notes ? `<tr><td style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;padding:3px 0;vertical-align:top;">Notes</td><td style="font-size:12px;color:#1e293b;padding:3px 0;">${notes}</td></tr>` : ''}
      </table>
    </td></tr>
  </table>
  <p style="margin:0 0 12px;font-size:12px;color:#64748b;background:#f8fafc;padding:10px 13px;border-radius:4px;border-left:3px solid ${cfg.accent};line-height:1.6;">${cfg.cta}</p>
  <p style="margin:0;font-size:13px;color:#1e293b;line-height:1.8;">Saul Garcia &nbsp;|&nbsp; Founder, MexaUSA Food Group, Inc.<br>
    US: <a href="tel:+18312513116" style="color:${cfg.accent};">+1-831-251-3116</a> &nbsp;|&nbsp; MX: <a href="tel:+526463402686" style="color:${cfg.accent};">+52-646-340-2686</a><br>
    <a href="mailto:saul@mexausafg.com" style="color:${cfg.accent};">saul@mexausafg.com</a> &nbsp;|&nbsp; <a href="https://mexausafg.com" style="color:${cfg.accent};">mexausafg.com</a></p>
</td></tr>
<tr><td style="background:#0F1419;padding:8px 22px;text-align:center;">
  <div style="font-size:8px;color:#334155;letter-spacing:1px;">MexaUSA Food Group, Inc. · AuditDNA Agriculture Intelligence · LOAF Autonomous System</div>
  <div style="font-size:8px;color:#1e293b;margin-top:2px;">Reducing food waste in the US-Mexico corridor. Trust. Transparency. Intelligence.</div>
</td></tr>
</table></td></tr></table></body></html>`;
}

// ── LOG OUTREACH ──────────────────────────────────────────────────────────────
async function logOutreach(db, action, commodity, email, type, submissionId, status) {
  try {
    await db.query(
      `INSERT INTO loaf_outreach_log (action,commodity,buyer_email,submission_id,status) VALUES ($1,$2,$3,$4,$5)`,
      [action, commodity, email, submissionId||null, `${status}_${type}`]
    ).catch(()=>{});
  } catch(e){}
}

// ── MAIN INTELLIGENCE FUNCTION ────────────────────────────────────────────────
async function runLOAFIntelligence(db, action, submissionId, data) {
  const { commodity, quantity, unit, user } = data;
  if (!commodity) return { sent:0, chainStores:0, total:0 };

  console.log(`[LOAF-INTEL] ${action} — "${commodity}" ${quantity} ${unit}`);

  const { segments, family, total } = await fetchAllMatchedContacts(db, commodity, quantity, unit, user?.region);

  if (total === 0) {
    console.log(`[LOAF-INTEL] No contacts matched for ${commodity}`);
    return { sent:0, chainStores:0, total:0, family };
  }

  let transport;
  try {
    transport = getTransport();
    await transport.verify();
  } catch(e) {
    console.error('[LOAF-INTEL] SMTP unavailable:', e.message);
    return { sent:0, chainStores:0, error:'SMTP unavailable' };
  }

  const results = {};
  const DELAY = 500;

  for (const [segmentKey, contacts] of Object.entries(segments)) {
    if (!contacts.length) continue;
    const emailType = {
      buyers:'buyer', wholesalers:'wholesaler', chain_stores:'chain_store',
      distributors:'distributor', retailers:'retailer', packers:'packer', shippers:'shipper'
    }[segmentKey] || 'buyer';

    let segSent = 0;
    for (let i = 0; i < contacts.length; i++) {
      const c = contacts[i];
      if (!c.email) continue;
      try {
        await transport.sendMail({
          from: FROM,
          to:   c.email,
          subject: buildSubject(action, emailType, commodity, quantity, unit, family),
          html:    buildEmail(c, emailType, action, data, family),
          headers: {
            'X-LOAF-Action':    action,
            'X-LOAF-Commodity': commodity,
            'X-LOAF-Family':    family || 'unknown',
            'X-LOAF-Segment':   emailType,
            'Reply-To':         'saul@mexausafg.com',
          }
        });
        segSent++;
        await logOutreach(db, action, commodity, c.email, emailType, submissionId, 'sent');
      } catch(e) {
        await logOutreach(db, action, commodity, c.email, emailType, submissionId, 'failed');
      }
      if (i < contacts.length-1) await new Promise(r => setTimeout(r, DELAY));
    }
    if (segSent) console.log(`[LOAF-INTEL] ${emailType}s: ${segSent} sent`);
    results[segmentKey] = segSent;
  }

  const totalSent = Object.values(results).reduce((s,n)=>s+n,0);
  console.log(`[LOAF-INTEL] ${action} "${commodity}" (${family}) — ${totalSent} total sent`);

  return {
    sent:         results.buyers||0,
    chainStores:  results.chain_stores||0,
    wholesalers:  results.wholesalers||0,
    packers:      results.packers||0,
    shippers:     results.shippers||0,
    distributors: results.distributors||0,
    retailers:    results.retailers||0,
    total:        totalSent,
    family,
  };
}

module.exports = { runLOAFIntelligence };
