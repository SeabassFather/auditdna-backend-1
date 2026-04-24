// Agent Registry: tick loop, sleep mode, confidence gating, event log, queue
const { broadcast } = require('./sse-broadcaster');

let pool = null;
const agents = new Map();
const timers = new Map();
let started = false;

function init(pgPool) { pool = pgPool; }

function register(agent) {
  if (!agent || !agent.code || !agent.name) throw new Error('Agent must have code + name');
  agents.set(agent.code, agent);
}

function isSleepHours(now = new Date()) {
  // Pacific Time 10pm-6am
  const h = parseInt(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles', hour: '2-digit', hour12: false }), 10);
  return h >= 22 || h < 6;
}

async function logEvent(agentCode, eventType, severity, fields = {}) {
  if (!pool) return;
  try {
    await pool.query(
      `INSERT INTO autonomy_events (agent_code, event_type, severity, deal_id, channel_id, target_email, title, payload_json)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [agentCode, eventType, severity,
       fields.deal_id || null, fields.channel_id || null, fields.target_email || null,
       fields.title || null, JSON.stringify(fields.payload || {})]
    );
  } catch (e) { console.error('[AUTONOMY/logEvent]', e.message); }
  broadcast('autonomy.event', { agent_code: agentCode, event_type: eventType, severity, ...fields });
}

async function queueAction(agentCode, actionType, fields = {}) {
  if (!pool) return null;
  try {
    const r = await pool.query(
      `INSERT INTO autonomy_queue (agent_code, action_type, target_email, target_id, payload_json, reason)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [agentCode, actionType,
       fields.target_email || null, fields.target_id || null,
       JSON.stringify(fields.payload || {}), fields.reason || null]
    );
    broadcast('autonomy.queued', { agent_code: agentCode, action_type: actionType, id: r.rows[0].id, ...fields });
    return r.rows[0].id;
  } catch (e) { console.error('[AUTONOMY/queueAction]', e.message); return null; }
}

async function tickAgent(agent) {
  if (!pool) return;
  try {
    const r = await pool.query('SELECT enabled, confidence, tick_interval_s FROM autonomy_agents WHERE code=$1', [agent.code]);
    if (r.rows.length === 0 || !r.rows[0].enabled) return;
    const dbAgent = r.rows[0];

    const ctx = {
      pool,
      sleepMode: isSleepHours(),
      confidence: dbAgent.confidence,
      logEvent: (type, severity, fields) => logEvent(agent.code, type, severity, fields),
      queueAction: (actionType, fields) => queueAction(agent.code, actionType, fields),
      broadcast
    };

    await pool.query('UPDATE autonomy_agents SET last_tick_at=NOW(), total_ticks=total_ticks+1 WHERE code=$1', [agent.code]);

    if (typeof agent.tick === 'function') {
      await agent.tick(ctx);
    }
  } catch (e) {
    console.error(`[AGENT ${agent.code}] tick error:`, e.message);
    try { await logEvent(agent.code, 'ERROR', 'error', { title: 'tick failed', payload: { message: e.message } }); } catch {}
  }
}

async function start() {
  if (started) return;
  started = true;
  console.log(`[AUTONOMY] Starting registry with ${agents.size} agents`);
  for (const agent of agents.values()) {
    try {
      const r = await pool.query('SELECT tick_interval_s FROM autonomy_agents WHERE code=$1', [agent.code]);
      const intervalS = r.rows[0]?.tick_interval_s || agent.tickInterval || 300;
      const t = setInterval(() => { tickAgent(agent).catch(()=>{}); }, intervalS * 1000);
      timers.set(agent.code, t);
      console.log(`[AUTONOMY] ${agent.code} ${agent.name} every ${intervalS}s`);
    } catch (e) { console.warn(`[AUTONOMY] Could not start ${agent.code}:`, e.message); }
  }
  broadcast('autonomy.registry_started', { agent_count: agents.size, started_at: new Date().toISOString() });
}

function stop() {
  for (const t of timers.values()) clearInterval(t);
  timers.clear();
  started = false;
}

function listAgents() { return Array.from(agents.values()).map(a => ({ code: a.code, name: a.name })); }

module.exports = { init, register, start, stop, tickAgent, logEvent, queueAction, listAgents, isSleepHours };
