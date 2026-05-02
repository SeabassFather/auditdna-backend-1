// =============================================================================
// File: C:\AuditDNA\backend\swarm\gatekeepers\08-prism.js
// STAGE 8 - PRISM: shapes JSON response payload for caller
// =============================================================================

function safe(obj) {
  if (obj === null || obj === undefined) return null;
  try { return JSON.parse(JSON.stringify(obj)); } catch (e) { return null; }
}

async function run(ctx) {
  const response = {
    ok: true,
    run_id: ctx.run_id,
    request_type: ctx.request.request_type,
    classification: safe(ctx.classification),
    inserted: safe(ctx.inserted),
    business: safe(ctx.business),
    next_actions: safe(ctx.next_actions) || [],
    dedupe: safe(ctx.dedupe) || { duplicate: false }
  };

  // Strip sensitive fields from response (passwords, pins, tokens, _meta)
  if (response.inserted && response.inserted.payload) {
    delete response.inserted.payload.password;
    delete response.inserted.payload.password_hash;
    delete response.inserted.payload.pin;
    delete response.inserted.payload.pin_hash;
    delete response.inserted.payload.access_code;
    delete response.inserted.payload._meta;
  }

  ctx.response = response;
  return { keys: Object.keys(response), bytes: Buffer.byteLength(JSON.stringify(response), 'utf8') };
}

module.exports = {
  number: 8,
  name: 'render_data',
  agent: 'prism',
  run
};
