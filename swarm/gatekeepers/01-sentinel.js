// =============================================================================
// File: C:\AuditDNA\backend\swarm\gatekeepers\01-sentinel.js
// STAGE 1 - SENTINEL: matches incoming request, classifies type, decides route
// =============================================================================

const KNOWN_TYPES = new Map([
  ['plastpac.inquiry',     { domain: 'plastpac', priority: 'high',   notify: true  }],
  ['plastpac.outreach',    { domain: 'plastpac', priority: 'medium', notify: false }],
  ['contact.create',       { domain: 'crm',      priority: 'medium', notify: false }],
  ['contact.update',       { domain: 'crm',      priority: 'low',    notify: false }],
  ['email.campaign.send',  { domain: 'email',    priority: 'high',   notify: true  }],
  ['grower.onboard',       { domain: 'grower',   priority: 'high',   notify: true  }],
  ['buyer.inquire',        { domain: 'buyer',    priority: 'high',   notify: true  }],
  ['loaf.upload',          { domain: 'loaf',     priority: 'medium', notify: false }],
  ['agent.resume',         { domain: 'agent',    priority: 'medium', notify: false }],
  ['mortgage.lead',        { domain: 'finance',  priority: 'high',   notify: true  }],
  ['factor.invoice',       { domain: 'finance',  priority: 'high',   notify: true  }],
  ['auth.login',           { domain: 'auth',     priority: 'low',    notify: false }],
  ['admin.action',         { domain: 'admin',    priority: 'high',   notify: true  }]
]);

async function run(ctx) {
  const t = ctx.request.request_type;
  if (!t || typeof t !== 'string') {
    throw new Error('SENTINEL: missing request_type');
  }
  const meta = KNOWN_TYPES.get(t);
  if (!meta) {
    // unknown but not fatal - tag as catchall, low priority, no notify
    ctx.classification = { domain: 'unknown', priority: 'low', notify: false, known: false };
  } else {
    ctx.classification = { ...meta, known: true };
  }
  ctx.routed_at = Date.now();
  return {
    matched: ctx.classification.known,
    domain: ctx.classification.domain,
    priority: ctx.classification.priority,
    notify_on_complete: ctx.classification.notify
  };
}

module.exports = {
  number: 1,
  name: 'match',
  agent: 'sentinel',
  run
};
