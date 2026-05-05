// services/category-letters.js
// Per-category buyer letter templates for Mexausa Food Group blind matcher blasts
// Each USA buyer category gets a custom subject + opening pitch + value props
// Brand: Mexausa Food Group, Inc - EIN 88-1698129 - PACA #20241168

const FROM_NAME = 'Saul Garcia';
const FROM_TITLE = 'Owner, Mexausa Food Group, Inc.';
const PHONE_US = '+1-831-251-3116';
const PHONE_MX = '+52-646-340-2686';
const REPLY_EMAIL = 'saul@mexausafg.com';
const EIN = '88-1698129';
const PACA = '20241168';

const C = {
  green: '#0F7B41', greenDark: '#075028', gold: '#C9A55C',
  black: '#0F1419', charcoal: '#2A3138',
  cream: '#F4F6F4', border: '#D4DBD3', white: '#FFFFFF'
};

const CATEGORY_PITCH = {
  MX_EXPORTER: {
    subjectSuffix: 'Factoring + PO Advance for Mexico Exporters | 24-Hour Funding',
    opening: 'Para exportadores mexicanos enviando producto al mercado USA, Mexausa Food Group ofrece factoraje y anticipo de PO directos. Tu vendes a buyers USA, nosotros te pagamos en 24 horas hasta el 95 por ciento del valor de la factura. Sin garantias personales en facturas calificadas. Tu sigues con tu cliente, nosotros asumimos el riesgo de pago. For Mexican exporters shipping to USA buyers, Mexausa Food Group offers direct factoring and PO advance. You ship, we pay 24 hours, up to 95 percent of invoice value, 1.5-3.5 percent fee.',
    valueProps: [
      'Factoraje hasta 95 por ciento sobre cuentas por cobrar / Factoring up to 95 percent of AR',
      'Fondeo en 24 horas / 24-hour funding once invoice verified',
      'Comision 1.5-3.5 por ciento por factura / 1.5-3.5 percent fee per invoice',
      'Sin garantias personales en facturas calificadas / No personal guarantees on qualifying invoices',
      'Anticipo de PO antes de embarque / PO advance before shipment',
      'Cobertura de credito comercial / Trade credit insurance available',
      'Mantienes tu relacion con el buyer / You keep your buyer relationship',
      'PACA #20241168 + EIN 88-1698129 garantia de pago'
    ]
  },
  CHAIN_STORE: {
    subjectSuffix: 'Year-Round Program | FSMA 204 + Full Traceability',
    opening: 'For chain retail operators sourcing produce at scale, Mexausa Food Group delivers year-round programs backed by FSMA 204 traceability, GlobalGAP and PrimusGFS audits, and lot-level blockchain anchoring. We support category managers with weekly volume commitments, ESG-grade documentation, and recall-ready chain-of-custody on every load.',
    valueProps: [
      'Year-round volume commitment with weekly draw',
      'FSMA 204 lot traceability with QR-coded pallets',
      'GlobalGAP, PrimusGFS, SQF, BRCGS, USDA Organic certifications pre-verified',
      'ESG documentation for sustainability reporting',
      'Cold chain telemetry on every reefer load',
      'Direct-from-grower pricing 15-20 percent below terminal markets'
    ]
  },
  WHOLESALER: {
    subjectSuffix: '48ct/60ct FOB Pricing 15-20 Percent Below Terminal',
    opening: 'For wholesale produce operators, Mexausa Food Group offers FOB pricing direct from Mexico and Peru growers structured 15-20 percent below USDA terminal market reference prices. Weekly load availability across the full 26-commodity catalog with FSMA 204 compliance and PACA protection built in.',
    valueProps: [
      'FOB pricing 15-20 percent below USDA terminal market',
      'Weekly load availability across 26+ commodities',
      'FOB Otay, Pharr, Laredo, Nogales border crossings',
      'Net-30/45/60 PO Finance lines $50K-$5M',
      'Volume tiers from 1 pallet to truckload+',
      'PACA #20241168 protected on every transaction'
    ]
  },
  DISTRIBUTOR: {
    subjectSuffix: 'Multi-Commodity Mexico + Peru Sourcing Program',
    opening: 'For multi-state distributors, Mexausa Food Group consolidates Mexico and Peru sourcing across our 26-commodity catalog into a single weekly draw. One vendor, one PO, one set of compliance docs covering avocado, berries, citrus, vegetables, and specialty items.',
    valueProps: [
      'Single-vendor consolidation across 26+ commodities',
      'Weekly delivery programs to your DCs',
      'FSMA 204 + traceability docs unified per shipment',
      'PO Finance Net-30/45/60 with $50K-$5M lines',
      'Cold chain telemetry from origin to your dock',
      'Cross-dock options at all major border crossings'
    ]
  },
  PACKER: {
    subjectSuffix: 'Co-Pack Bulk Volume + Inbound Supply',
    opening: 'For packing operations, Mexausa Food Group offers steady bulk-load supply programs from Mexico and Peru growers. Co-pack arrangements, repack opportunities, and direct grower-to-packhouse flow with full traceability documentation on every inbound load.',
    valueProps: [
      'Bulk load consolidation into your packhouse',
      'Co-pack and repack arrangements available',
      'Inbound chain-of-custody documentation',
      'Cold storage drop-and-roll at border',
      'Volume scaling Q1-Q4 based on your forecast',
      'PACA-protected transactions on every load'
    ]
  },
  SHIPPER: {
    subjectSuffix: 'Reefer Lane Programs Mexico Border to USA DCs',
    opening: 'For reefer carriers and freight operators, Mexausa Food Group is building dedicated lane programs for our Mexico-and-Peru-to-USA produce flow. Steady volume, predictable schedules, and direct grower-to-shipper allocations across all major border crossings.',
    valueProps: [
      'Dedicated lanes Otay/Pharr/Laredo/Nogales to USA DCs',
      'Predictable weekly tonnage commitments',
      'FSMA 204 lot tracking integrates with your TMS',
      'Cold chain telemetry handoff at pickup',
      'Net-7 quick-pay on dedicated programs',
      'Multi-year lane partnerships available'
    ]
  },
  BROKER: {
    subjectSuffix: 'Commission Program 6-10 Percent on Hass + Berry + Citrus',
    opening: 'For licensed produce brokers, Mexausa Food Group offers a structured commission program on our 26-commodity catalog. Bring your buyer relationships - we handle vetting, food safety, factoring, freight, and document workflow. You earn the spread while we operate the deal.',
    valueProps: [
      'Commission 6-10 percent per commodity tier',
      'PACA-licensed counterparty protection',
      'You bring buyers, we handle deal mechanics',
      'Factoring + escrow workflow integrated',
      'Weekly inventory drops to your dashboard',
      'Blind broker mode protects your relationships'
    ]
  },
  FOODSERVICE: {
    subjectSuffix: 'Foodservice Cut-Grade + Year-Round Programs',
    opening: 'For foodservice operators, Mexausa Food Group delivers cut-grade specifications year-round across our 26-commodity catalog. Restaurant chains, hotels, hospitals, schools, and broadliners - we structure programs around your menu cycle and DC requirements.',
    valueProps: [
      'Cut-grade spec sheets for back-of-house operations',
      'Year-round volume programs aligned to menu cycle',
      'Direct-to-DC deliveries with FSMA 204 docs',
      'Custom pack styles for foodservice case sizes',
      'Net-30 standard terms on contracted volume',
      'Recall management and incident response built in'
    ]
  },
  IMPORTER: {
    subjectSuffix: 'FOB Border + Cross-Dock Direct Loads',
    opening: 'For licensed importers, Mexausa Food Group offers FOB border pickup and cross-dock-ready loads from Mexican and Peruvian growers. Customs documentation, APHIS phytosanitary certificates, and FDA Prior Notice all handled before pickup at any major port of entry.',
    valueProps: [
      'FOB border (Otay, Pharr, Laredo, Nogales)',
      'APHIS + SENASICA certificates pre-verified',
      'FDA Prior Notice filed on every shipment',
      'Cross-dock options at all major ports of entry',
      'Customs broker handoff included',
      'PACA #20241168 + EIN 88-1698129 on all paperwork'
    ]
  },
  RETAIL: {
    subjectSuffix: 'Direct-to-Store Hass + Berry Program | No Minimum',
    opening: 'For independent grocery, ethnic markets, and specialty retail, Mexausa Food Group offers direct-to-store deliveries with no order minimums. Weekly drops of avocado, berries, and seasonal commodities priced for retail margins with full compliance docs.',
    valueProps: [
      'Direct-to-store delivery with no DC required',
      'No minimum order quantity',
      'Weekly delivery cadence',
      'Retail-ready pack styles available',
      'Trade credit terms for established accounts',
      'Specialty and ethnic SKU support'
    ]
  }
};

const DEFAULT_PITCH = CATEGORY_PITCH.WHOLESALER;

function getPitch(category) {
  return CATEGORY_PITCH[category] || DEFAULT_PITCH;
}

function buildSubject(category, commoditySlug, commodityName) {
  const pitch = getPitch(category);
  const cName = commodityName || commoditySlug || 'Produce';
  return cName + ' | ' + pitch.subjectSuffix + ' | Mexausa Food Group';
}

function buildLetter(category, item, blindId) {
  const pitch = getPitch(category);
  const commodityName = item.commodity_name || item.commodity_slug || 'Produce';
  const origin = item.origin_state ? (item.origin_state + ', ' + (item.origin_country || 'MX')) : (item.origin_country || 'Mexico');
  const fob = item.fob_price ? ('$' + parseFloat(item.fob_price).toFixed(2) + '/case') : 'priced to market';
  const window = (item.available_from && item.available_thru) ? (item.available_from + ' through ' + item.available_thru) : 'now';
  const loads = item.available_loads || 'multiple';

  const valueRows = pitch.valueProps.map(function(p) {
    return '<tr><td style="background:' + C.cream + ';padding:10px 14px;border-left:3px solid ' + C.gold + ';font-size:13px">' + p + '</td></tr>';
  }).join('');

  return [
    '<!doctype html><html><body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:' + C.cream + ';color:' + C.black + '">',
    '<div style="max-width:720px;margin:0 auto;background:' + C.white + ';border:1px solid ' + C.border + '">',
    '<div style="background:' + C.green + ';color:' + C.white + ';padding:28px">',
    '<div style="font-size:11px;letter-spacing:2.5px;font-weight:700;opacity:.9">MEXAUSA FOOD GROUP, INC.</div>',
    '<div style="font-size:24px;font-weight:800;margin-top:8px;line-height:1.15">' + commodityName + ' - ' + origin + '</div>',
    '<div style="font-size:13px;opacity:.85;margin-top:8px;letter-spacing:0.8px">FSMA 204 - GlobalGAP - PrimusGFS - PACA #' + PACA + ' - EIN ' + EIN + '</div>',
    '</div>',
    '<div style="padding:24px 28px 0">',
    '<div style="font-size:12px;color:' + C.charcoal + ';letter-spacing:1.5px;font-weight:700">A NOTE FROM SAUL GARCIA, OWNER</div>',
    '<p style="margin:12px 0 0;font-size:14px;line-height:1.65">' + pitch.opening + '</p>',
    '</div>',
    '<div style="padding:24px 28px">',
    '<div style="font-size:12px;letter-spacing:1.5px;color:' + C.green + ';font-weight:700">CURRENT AVAILABILITY</div>',
    '<table cellpadding="10" cellspacing="0" style="width:100%;border-collapse:separate;border-spacing:0;margin-top:10px;background:' + C.cream + ';border-left:4px solid ' + C.green + '">',
    '<tr><td style="font-size:13px;line-height:1.7"><b>Commodity:</b> ' + commodityName + '<br><b>Origin:</b> ' + origin + '<br><b>Pack Style:</b> ' + (item.pack_style || 'Standard') + '<br><b>FOB Price:</b> ' + fob + '<br><b>Window:</b> ' + window + '<br><b>Available Loads:</b> ' + loads + '<br><b>Blind Match ID:</b> ' + blindId + '</td></tr>',
    '</table></div>',
    '<div style="padding:0 28px 24px">',
    '<div style="font-size:12px;letter-spacing:1.5px;color:' + C.green + ';font-weight:700">WHY MEXAUSA FOR ' + category.replace(/_/g,' ') + '</div>',
    '<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:separate;border-spacing:0 6px;margin-top:10px">',
    valueRows,
    '</table></div>',
    '<div style="padding:0 28px 24px">',
    '<div style="font-size:12px;letter-spacing:1.5px;color:' + C.green + ';font-weight:700">EMBEDDED FINANCE</div>',
    '<table cellpadding="10" cellspacing="0" style="width:100%;border-collapse:separate;border-spacing:0 6px;margin-top:10px;font-size:13px">',
    '<tr><td style="background:' + C.cream + ';padding:10px 14px;border-left:3px solid ' + C.gold + '"><b>PO Finance for Buyers:</b> Net-30/45/60 lines $50K-$5M, 48hr approval. Pay your terms while suppliers get paid up front.</td></tr>',
    '<tr><td style="background:' + C.cream + ';padding:10px 14px;border-left:3px solid ' + C.gold + '"><b>Factoring for Growers:</b> Up to 95 percent advance on AR, 24-hour funding, 1.5-3.5 percent fee.</td></tr>',
    '<tr><td style="background:' + C.cream + ';padding:10px 14px;border-left:3px solid ' + C.gold + '"><b>Escrow on First Deals:</b> Buyer wires to escrow, grower ships, freight clears, escrow releases. Removes counterparty risk.</td></tr>',
    '</table></div>',
    '<div style="padding:0 28px 24px">',
    '<div style="font-size:12px;letter-spacing:1.5px;color:' + C.green + ';font-weight:700">FULL TRACEABILITY - FIELD TO DOCK</div>',
    '<table cellpadding="10" cellspacing="0" style="width:100%;border-collapse:separate;border-spacing:0 6px;margin-top:10px;font-size:13px">',
    '<tr><td style="background:' + C.cream + ';padding:10px 14px;border-left:3px solid ' + C.green + '"><b>FSMA 204:</b> KDE capture at harvest, pack, ship, receive. 24-hour recall capability.</td></tr>',
    '<tr><td style="background:' + C.cream + ';padding:10px 14px;border-left:3px solid ' + C.green + '"><b>TraceSafe Lot Tracking:</b> QR-coded pallets, blockchain-anchored chain of custody.</td></tr>',
    '<tr><td style="background:' + C.cream + ';padding:10px 14px;border-left:3px solid ' + C.green + '"><b>Cold Chain:</b> Live temperature telemetry on every reefer. Alerts on excursions.</td></tr>',
    '<tr><td style="background:' + C.cream + ';padding:10px 14px;border-left:3px solid ' + C.green + '"><b>Recall Manager:</b> One-click pull of every lot, every receiving party, every doc.</td></tr>',
    '</table></div>',
    '<div style="padding:0 28px 24px">',
    '<div style="background:' + C.black + ';color:' + C.white + ';padding:20px 22px">',
    '<div style="font-size:11px;letter-spacing:2px;color:' + C.gold + ';font-weight:700">81 NINER MINERS - AI INTELLIGENCE LAYER</div>',
    '<p style="margin:10px 0 0;font-size:13px;line-height:1.6">Autonomous AI agents monitor markets, score risk, surface opportunities 24/7. ENRIQUE handles grower onboarding. ELIOT vets buyers. DIEGO audits compliance. NADINE drives outbound. PRISCILLA sorts inbox. MARKET INTEL tracks 92+ commodities daily. Full pipeline runs without manual buttons.</p>',
    '</div></div>',
    '<div style="padding:0 28px 28px;text-align:center">',
    '<a href="https://loaf.mexausafg.com" style="display:inline-block;padding:14px 32px;background:' + C.gold + ';color:' + C.black + ';text-decoration:none;font-weight:800;letter-spacing:2px;font-size:13px">REGISTER ON LOAF MARKETPLACE</a>',
    '<div style="margin-top:12px;font-size:13px;color:' + C.charcoal + ';line-height:1.55">Or reply directly with your interest, target volume, and delivery region.<br>We will route to a vetted source within 24 hours.</div>',
    '</div>',
    '<div style="padding:20px 28px;border-top:1px solid ' + C.border + ';font-size:13px;color:' + C.black + '">',
    '<p style="margin:0 0 6px"><b>' + FROM_NAME + ', ' + FROM_TITLE + '</b></p>',
    '<p style="margin:0 0 4px">' + PHONE_US + ' (US) - ' + PHONE_MX + ' (MX)</p>',
    '<p style="margin:0 0 4px"><a href="mailto:' + REPLY_EMAIL + '" style="color:' + C.green + '">' + REPLY_EMAIL + '</a> - <a href="https://mexausafg.com" style="color:' + C.green + '">mexausafg.com</a></p>',
    '<p style="margin:6px 0 0;font-size:11px;color:' + C.charcoal + '">Mexausa Food Group, Inc. - EIN ' + EIN + ' - PACA #' + PACA + ' - Salinas, CA</p>',
    '</div>',
    '<div style="padding:12px 28px;background:' + C.black + ';color:#94a3b0;font-size:10px;text-align:center">',
    'Category: ' + category + ' - Blind Match ID: ' + blindId + ' - <a href="mailto:' + REPLY_EMAIL + '?subject=UNSUBSCRIBE" style="color:' + C.gold + '">unsubscribe</a>',
    '</div></div></body></html>'
  ].join('');
}

module.exports = { buildSubject, buildLetter, getPitch, CATEGORY_PITCH };
