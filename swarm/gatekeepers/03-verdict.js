// =============================================================================
// File: C:\AuditDNA\backend\swarm\gatekeepers\03-verdict.js
// STAGE 3 - VERDICT: confirms schema, auth, rate limit
// =============================================================================

// Per-request-type required fields
const REQUIRED = {
  'plastpac.inquiry':    ['name', 'email'],
  'plastpac.outreach':   ['target_email'],
  'contact.create':      ['name'],
  'contact.update':      ['id'],
  'email.campaign.send': ['campaign_id', 'recipients'],
  'grower.onboard':      ['name', 'commodity'],
  'buyer.inquire':       ['name', 'commodity'],
  'loaf.upload':         ['file_ref'],
  'agent.resume':        ['token'],
  'mortgage.lead':       ['name', 'email'],
  'factor.invoice':      ['amount', 'invoice_ref'],
  'auth.login':          ['username'],
  'admin.action':        ['action_type']
};

const NEEDS_AUTH = new Set([
  'contact.create', 'contact.update', 'email.campaign.send',
  'admin.action'
]);

// Per-IP rate limit window (in-memory, reset on process restart - good enough for v1)
const rateBucket = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = {
  'plastpac.inquiry':    10,
  'plastpac.outreach':    5,
  'contact.create':     100,
  'auth.login':          20,
  default:               60
};

function withinLimit(ip, type) {
  const limit = MAX_PER_WINDOW[type] || MAX_PER_WINDOW.default;
  const key = ip + '|' + type;
  const now = Date.now();
  const arr = rateBucket.get(key) || [];
  const recent = arr.filter(ts => (now - ts) < WINDOW_MS);
  if (recent.length >= limit) return false;
  recent.push(now);
  rateBucket.set(key, recent);
  return true;
}

async function run(ctx) {
  const type = ctx.request.request_type;
  const data = ctx.normalized || ctx.request.payload || {};

  // 1. Schema check
  const required = REQUIRED[type] || [];
  const missing = required.filter(k => data[k] === undefined || data[k] === null || data[k] === '');
  if (missing.length) {
    throw new Error('VERDICT: missing required fields: ' + missing.join(', '));
  }

  // 2. Auth check
  if (NEEDS_AUTH.has(type)) {
    if (!data._meta || !data._meta.actor_user_id) {
      throw new Error('VERDICT: authentication required for ' + type);
    }
  }

  // 3. Rate limit
  const ip = (data._meta && data._meta.source_ip) || 'unknown';
  if (!withinLimit(ip, type)) {
    throw new Error('VERDICT: rate limit exceeded for ' + type + ' from ' + ip);
  }

  ctx.verified = true;

  return {
    schema_ok: true,
    auth_ok: true,
    rate_ok: true,
    required_count: required.length,
    auth_required: NEEDS_AUTH.has(type)
  };
}

module.exports = {
  number: 3,
  name: 'confirm',
  agent: 'verdict',
  run
};
