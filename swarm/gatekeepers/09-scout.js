// =============================================================================
// File: C:\AuditDNA\backend\swarm\gatekeepers\09-scout.js
// STAGE 9 - SCOUT: passive surveillance, contact enrichment, intel gathering
// =============================================================================

function emailDomain(email) {
  if (!email || typeof email !== 'string') return null;
  const m = email.match(/@([^@]+)$/);
  return m ? m[1].toLowerCase() : null;
}

function phoneCountry(phone) {
  if (!phone) return null;
  const cleaned = String(phone).replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+52') || cleaned.startsWith('52')) return 'MX';
  if (cleaned.startsWith('+1') || cleaned.startsWith('1')) return 'US';
  return null;
}

const COMPETITOR_DOMAINS = new Set([
  'driscolls.com', 'naturipefarms.com', 'wellpictstrawberries.com',
  'sungoldgrowers.com', 'kingsweetpeppers.com', 'tanimuracorp.com'
]);

const TARGET_BUYER_DOMAINS = new Set([
  'walmart.com', 'costco.com', 'krogerco.com', 'wegmans.com',
  'wholefoodsmarket.com', 'sysco.com', 'usfoods.com'
]);

async function run(ctx) {
  const data = ctx.normalized || {};
  const intel = {
    email_domain: emailDomain(data.email),
    phone_country: phoneCountry(data.phone),
    is_competitor: false,
    is_target_buyer: false,
    geo: {
      country: data.country || null,
      region: data.region || null
    },
    flags: []
  };

  if (intel.email_domain && COMPETITOR_DOMAINS.has(intel.email_domain)) {
    intel.is_competitor = true;
    intel.flags.push('competitor_domain');
  }
  if (intel.email_domain && TARGET_BUYER_DOMAINS.has(intel.email_domain)) {
    intel.is_target_buyer = true;
    intel.flags.push('target_buyer_domain');
  }

  // Note volume tier intel
  if (data.volume_estimate) {
    const v = String(data.volume_estimate).toLowerCase();
    if (/truck|tl|fcl|container/.test(v)) intel.flags.push('truck_load_volume');
    if (/pallet/.test(v)) intel.flags.push('pallet_volume');
  }

  // Company size signal
  if (data.company && /inc\.|corp|ltd|llc/i.test(data.company)) {
    intel.flags.push('formal_entity');
  }

  ctx.intel = intel;

  return {
    domain: intel.email_domain,
    competitor: intel.is_competitor,
    target_buyer: intel.is_target_buyer,
    flag_count: intel.flags.length
  };
}

module.exports = {
  number: 9,
  name: 'gather_intel',
  agent: 'scout',
  run
};
