// =============================================================================
// File: C:\AuditDNA\backend\swarm\gatekeepers\02-atlas.js
// STAGE 2 - ATLAS: accepts payload, validates envelope, normalizes shape
// =============================================================================

const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

async function run(ctx) {
  const payload = ctx.request.payload;
  if (payload === undefined || payload === null) {
    throw new Error('ATLAS: payload missing');
  }

  // Size check
  let size = 0;
  try {
    size = Buffer.byteLength(JSON.stringify(payload), 'utf8');
  } catch (e) {
    throw new Error('ATLAS: payload not JSON-serializable: ' + e.message);
  }
  if (size > MAX_PAYLOAD_BYTES) {
    throw new Error('ATLAS: payload too large (' + size + ' bytes, max ' + MAX_PAYLOAD_BYTES + ')');
  }

  // Normalize envelope: ensure object shape
  const normalized = (typeof payload === 'object' && !Array.isArray(payload)) ? { ...payload } : { value: payload };

  // Stamp tracing fields
  normalized._meta = {
    received_at: ctx.request.received_at || new Date().toISOString(),
    source_ip: ctx.request.source_ip || null,
    user_agent: ctx.request.user_agent || null,
    actor_user_id: ctx.request.actor_user_id || null,
    actor_role: ctx.request.actor_role || null
  };

  ctx.normalized = normalized;
  ctx.payload_bytes = size;

  return {
    bytes: size,
    keys: Object.keys(normalized).filter(k => k !== '_meta'),
    has_meta: true
  };
}

module.exports = {
  number: 2,
  name: 'carry',
  agent: 'atlas',
  run
};
