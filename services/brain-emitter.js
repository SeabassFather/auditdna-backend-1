// services/brain-emitter.js
// Writes directly to brain_events table to guarantee event_type lands as we set it
// Also calls global.brainEmit for tree_bus fan-out (OpenClaw + Niner Miners + CommandSphere)

let pool = null;
function setPool(p) { pool = p; }

function emit(eventType, payload, opts) {
  opts = opts || {};
  const agentId = opts.agent_id || 'SEGMENTS_BLAST';
  const severity = (opts.severity != null) ? opts.severity : 1;

  // 1. Write directly to brain_events (guarantees event_type column is correct)
  if (pool) {
    pool.query(
      'INSERT INTO brain_events (event_type, agent_id, severity, payload) VALUES ($1, $2, $3, $4)',
      [eventType, agentId, severity, JSON.stringify(payload || {})]
    ).catch(function(e){ console.error('[brain-emitter] DB insert failed:', e.message); });
  }

  // 2. ALSO emit to tree_bus so OpenClaw + Niner Miners + Marketing + CommandSphere see it
  try {
    if (typeof global.brainEmit === 'function') {
      global.brainEmit({
        event_type: eventType,
        agent_id: agentId,
        agent: agentId,
        severity: severity,
        payload: payload || {},
        event: eventType,
        source: agentId,
        created_at: new Date()
      });
    }
  } catch (e) { console.error('[brain-emitter] tree_bus emit failed:', e.message); }

  return { ok: true, mode: pool ? 'db+tree_bus' : 'tree_bus_only' };
}

module.exports = { emit, setPool };