// services/brain-emitter.js
// Single helper used everywhere we want Niner Miners + tree_bus to see an event
// Uses global.brainEmit (set up by openclaw-routes.js at boot+4500ms)
// Falls back to direct DB insert if brainEmit not yet hooked

let pool = null;
function setPool(p) { pool = p; }

function emit(eventType, payload, opts) {
  opts = opts || {};
  const agentId = opts.agent_id || 'SEGMENTS_BLAST';
  const severity = (opts.severity != null) ? opts.severity : 1;
  const evt = {
    event_type: eventType,
    agent_id: agentId,
    severity: severity,
    payload: payload || {},
    created_at: new Date()
  };
  try {
    if (typeof global.brainEmit === 'function') {
      global.brainEmit(evt);
      return { ok: true, mode: 'tree_bus' };
    }
  } catch (e) { console.error('[brain-emitter] tree_bus emit failed:', e.message); }
  if (pool) {
    pool.query(
      'INSERT INTO brain_events (event_type, agent_id, severity, payload) VALUES ($1, $2, $3, $4)',
      [eventType, agentId, severity, JSON.stringify(payload || {})]
    ).catch(function(e){ console.error('[brain-emitter] DB fallback failed:', e.message); });
    return { ok: true, mode: 'db_fallback' };
  }
  return { ok: false, error: 'no pool and no brainEmit' };
}

module.exports = { emit, setPool };