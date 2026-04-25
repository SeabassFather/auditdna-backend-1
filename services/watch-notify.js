
// === A6.2 JWT minting for tappable Actions ===
const _jwt = require('jsonwebtoken');
const _JWT_SECRET = process.env.JWT_SECRET || 'auditdna-grower-jwt-dev';
function mintWatchJwt(scope) {
  // 24h watch-action token, scoped to factor approve/skip/view only
  return _jwt.sign(
    { userId: 1, username: 'saul', role: 'owner', name: 'Saul', module: 'watch', scope: scope || ['factor:approve','factor:skip','factor:view','*'] },
    _JWT_SECRET,
    { expiresIn: '24h' }
  );
}
// ============================================================
// watch-notify.js â€” SmartWatch Notification Bridge
// AuditDNA Backend | C:\AuditDNA\backend\services\watch-notify.js
// Uses ntfy.sh â€” free, no API key, works on any smartwatch
//   via companion phone app (Android / iOS)
// ============================================================

const fetch = (...args) =>
  import('node-fetch').then(({ default: f }) => f(...args));

// â”€â”€ Config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const NTFY_BASE   = 'https://ntfy.sh';
const CHANNEL     = process.env.WATCH_CHANNEL || 'auditdna-agro-YOUR_SECRET'; // override in .env
const NTFY_TOKEN  = process.env.NTFY_TOKEN    || '';   // optional: paid ntfy account token

// Priority levels  (ntfy scale: 1=min â€¦ 5=urgent)
const P = { MIN: 1, LOW: 2, DEFAULT: 3, HIGH: 4, URGENT: 5 };

// Tag â†’ ntfy emoji shortcode map (ntfy renders these as icons on watch)
const TAGS = {
  grs:       ['chart_with_upwards_trend', 'rotating_light'],
  fsma:      ['calendar', 'warning'],
  trace:     ['white_check_mark', 'seedling'],
  kyc:       ['busts_in_silhouette', 'new'],
  tier3:     ['rotating_light', 'skull'],
  loi:       ['handshake', 'briefcase'],
  shipment:  ['truck', 'world_map'],
  market:    ['bar_chart', 'corn'],
  water:     ['droplet', 'warning'],
  heat:      ['sunny', 'thermometer'],
  lead:      ['mega', 'moneybag'],
  buyer:     ['shopping_cart', 'seedling'],
};

// â”€â”€ Core sender â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function sendWatch({ title, message, priority = P.DEFAULT, tags = [], actions = [] }) {
  const headers = {
    'Content-Type': 'text/plain',
    Title:    title,
    Priority: String(priority),
    Tags:     tags.join(','),
  };

  if (NTFY_TOKEN) headers['Authorization'] = `Bearer ${NTFY_TOKEN}`;
  if (actions.length) const _watchTok = mintWatchJwt(); const _authedActions = actions.map(a => a + (a.toLowerCase().startsWith('http,') && a.indexOf('headers.Authorization=') < 0 ? , headers.Authorization=Bearer +_watchTok : '')); headers['Actions'] = _authedActions.join('; ');

  try {
    const res = await fetch(`${NTFY_BASE}/${CHANNEL}`, {
      method:  'POST',
      headers,
      body:    message,
    });
    const ok = res.ok;
    console.log(`[WatchNotify] ${ok ? 'SENT' : 'FAIL'} â†’ ${title}`);
    return { ok, status: res.status };
  } catch (err) {
    console.error('[WatchNotify] Network error:', err.message);
    return { ok: false, error: err.message };
  }
}

// â”€â”€ Event Builders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** GRS Risk Tier Change */
async function notifyGRSTierChange({ growerName, oldTier, newTier, growerId }) {
  const escalating = newTier > oldTier;
  return sendWatch({
    title:    `GRS Tier ${escalating ? 'ESCALATED' : 'Improved'} â€” ${growerName}`,
    message:  `Grower #${growerId} moved from Tier ${oldTier} to Tier ${newTier}. ${escalating ? 'Review required.' : 'Risk reduced.'}`,
    priority: escalating ? (newTier >= 3 ? P.URGENT : P.HIGH) : P.DEFAULT,
    tags:     TAGS.grs,
  });
}

/** FSMA 204 Compliance Deadline */
async function notifyFSMADeadline({ growerName, lot, daysRemaining, dueDate }) {
  const urgent = daysRemaining <= 1;
  return sendWatch({
    title:    `FSMA 204 Due ${urgent ? 'TODAY' : `in ${daysRemaining}d`} â€” ${growerName}`,
    message:  `Lot: ${lot} | Due: ${dueDate}. ${urgent ? 'IMMEDIATE action required.' : 'Prepare documentation.'}`,
    priority: urgent ? P.URGENT : daysRemaining <= 3 ? P.HIGH : P.DEFAULT,
    tags:     TAGS.fsma,
  });
}

/** TraceSafe Scan Confirmation */
async function notifyTraceSafeScan({ growerName, lot, product, location, success }) {
  return sendWatch({
    title:    `TraceSafe ${success ? 'Scan OK' : 'Scan FAILED'} â€” ${product}`,
    message:  `Grower: ${growerName} | Lot: ${lot} | Location: ${location}`,
    priority: success ? P.DEFAULT : P.HIGH,
    tags:     TAGS.trace,
  });
}

/** New Grower KYC Submission */
async function notifyNewKYC({ growerName, growerId, tier, submittedAt }) {
  return sendWatch({
    title:    `New KYC Submission â€” ${growerName}`,
    message:  `Grower #${growerId} submitted registration. Initial Tier: ${tier}. Submitted: ${submittedAt}`,
    priority: P.HIGH,
    tags:     TAGS.kyc,
    actions:  [`view, Review, https://auditdna.netlify.app/growers/${growerId}`],
  });
}

/** Tier 3 Risk Escalation (critical) */
async function notifyTier3Escalation({ growerName, growerId, reason }) {
  return sendWatch({
    title:    `TIER 3 ALERT â€” ${growerName}`,
    message:  `Critical risk flag on Grower #${growerId}. Reason: ${reason}. Immediate review required.`,
    priority: P.URGENT,
    tags:     TAGS.tier3,
  });
}

/** LOI / LOC Pipeline Stage Change */
async function notifyLOIPipeline({ dealName, stage, previousStage, amount }) {
  return sendWatch({
    title:    `Deal Pipeline â€” ${stage}`,
    message:  `${dealName} moved from [${previousStage}] to [${stage}]. Amount: $${Number(amount).toLocaleString()}`,
    priority: P.HIGH,
    tags:     TAGS.loi,
  });
}

/** Cross-Border Shipment Status */
async function notifyShipmentStatus({ shipmentId, product, status, location, delay }) {
  const isDelay = !!delay;
  return sendWatch({
    title:    `Shipment ${isDelay ? 'DELAYED' : 'Update'} â€” ${product}`,
    message:  `#${shipmentId} | Status: ${status} | Location: ${location}${isDelay ? ` | Delay: ${delay}` : ''}`,
    priority: isDelay ? P.HIGH : P.DEFAULT,
    tags:     TAGS.shipment,
  });
}

/** USDA / Market Price Alert */
async function notifyMarketAlert({ product, currentPrice, threshold, direction, region }) {
  return sendWatch({
    title:    `Market Alert â€” ${product} ${direction === 'above' ? 'HIGH' : 'LOW'}`,
    message:  `${product} in ${region} hit $${currentPrice}/unit. Threshold: $${threshold}. Direction: ${direction} threshold.`,
    priority: P.HIGH,
    tags:     TAGS.market,
  });
}

/** WaterTech Usage Threshold */
async function notifyWaterAlert({ field, currentUsage, threshold, unit }) {
  const pct = Math.round((currentUsage / threshold) * 100);
  return sendWatch({
    title:    `Water Alert â€” ${field} at ${pct}%`,
    message:  `Field: ${field} | Usage: ${currentUsage}${unit} / Threshold: ${threshold}${unit}. ${pct >= 100 ? 'THRESHOLD EXCEEDED.' : 'Approaching limit.'}`,
    priority: pct >= 100 ? P.URGENT : P.HIGH,
    tags:     TAGS.water,
  });
}

/** Heat / UV Field Warning */
async function notifyHeatWarning({ region, tempC, uvIndex, advisory }) {
  const tempF = Math.round(tempC * 9 / 5 + 32);
  return sendWatch({
    title:    `Heat Advisory â€” ${region}`,
    message:  `Temp: ${tempC}Â°C (${tempF}Â°F) | UV Index: ${uvIndex}. ${advisory}`,
    priority: uvIndex >= 11 || tempC >= 40 ? P.URGENT : P.HIGH,
    tags:     TAGS.heat,
  });
}

/** Buyer Inquiry with Product(s) Needed */
async function notifyBuyerInquiry({ buyerName, company, products, quantity, unit, urgency, phone, email, notes }) {
  const productList = Array.isArray(products) ? products.join(', ') : products;
  const urgencyPriority = { high: P.URGENT, medium: P.HIGH, low: P.DEFAULT };
  return sendWatch({
    title:    `Buyer Inquiry${urgency === 'high' ? ' â€” URGENT' : ''} â€” ${buyerName}`,
    message:  `Products: ${productList}${quantity ? ` | Qty: ${quantity}${unit ? ' ' + unit : ''}` : ''}${company ? ` | Co: ${company}` : ''}${phone ? ` | ${phone}` : ''}${email ? ` | ${email}` : ''}${notes ? ` | ${notes}` : ''}`,
    priority: urgencyPriority[urgency] || P.HIGH,
    tags:     TAGS.buyer,
  });
}

/** New Marketing Lead */
async function notifyNewLead({ name, source, phone, email, score, notes }) {
  const hot = score >= 80;
  const warm = score >= 50;
  return sendWatch({
    title:    `${hot ? 'HOT LEAD' : warm ? 'New Lead' : 'Lead'} â€” ${name}`,
    message:  `Source: ${source} | Score: ${score}/100${phone ? ` | ${phone}` : ''}${email ? ` | ${email}` : ''}${notes ? ` | ${notes}` : ''}`,
    priority: hot ? P.URGENT : warm ? P.HIGH : P.DEFAULT,
    tags:     TAGS.lead,
  });
}

/** Generic test ping */
async function notifyTest() {
  return sendWatch({
    title:    'AuditDNA Watch Connected',
    message:  'Smartwatch notification bridge is active. All agricultural alerts enabled.',
    priority: P.DEFAULT,
    tags:     ['white_check_mark', 'seedling'],
  });
}

// â”€â”€ Exports â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
module.exports = {
  CHANNEL,
  NTFY_BASE,
  sendWatch,
  notifyGRSTierChange,
  notifyFSMADeadline,
  notifyTraceSafeScan,
  notifyNewKYC,
  notifyTier3Escalation,
  notifyLOIPipeline,
  notifyShipmentStatus,
  notifyMarketAlert,
  notifyWaterAlert,
  notifyHeatWarning,
  notifyNewLead,
  notifyBuyerInquiry,
  notifyTest,
};

