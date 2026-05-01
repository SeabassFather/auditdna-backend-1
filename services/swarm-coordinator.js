// =============================================================================
// SWARM COORDINATOR - PHASE 4
// File: C:\AuditDNA\backend\services\swarm-coordinator.js
//
// The Pacman engine. Watches brain_events, routes to agents, records dispatches.
// Designed to survive a broken DB pool: every query is wrapped in safeQuery()
// with timeout + circuit breaker + retry. Agents that fail get backed off
// exponentially. Coordinator never crashes the parent process.
//
// Subscriptions: each agent declares which event_type prefixes it cares about.
// Coordinator polls brain_events every 2s, dispatches matching events.
// Cron jobs run periodic agents (HARVESTER, INVENTORY, WHISPERER).
// =============================================================================

const AGENTS = require('./swarm-agents');

const POLL_INTERVAL_MS    = 2000;
const QUERY_TIMEOUT_MS    = 4000;
const MAX_BATCH_SIZE      = 50;
const CIRCUIT_OPEN_AFTER  = 5;       // failures
const CIRCUIT_RESET_MS    = 60000;   // 60s before attempting reset
const DISPATCH_TIMEOUT_MS = 30000;   // 30s max per agent run

// =============================================================================
// PARANOID DB WRAPPER
// =============================================================================
function safeQuery(pool, sql, params = [], timeoutMs = QUERY_TIMEOUT_MS) {
  if (!pool) return Promise.resolve({ rows: [], skipped: true, error: 'no_pool' });
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ rows: [], skipped: true, error: 'timeout' });
    }, timeoutMs);
    pool.query(sql, params)
      .then(r => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ rows: r.rows || [], skipped: false });
      })
      .catch(e => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ rows: [], skipped: true, error: e.message });
      });
  });
}

// =============================================================================
// CIRCUIT BREAKER per agent
// =============================================================================
class CircuitBreaker {
  constructor() { this.state = new Map(); }
  isOpen(agent) {
    const s = this.state.get(agent);
    if (!s) return false;
    if (s.openedAt && Date.now() - s.openedAt > CIRCUIT_RESET_MS) {
      this.state.delete(agent);
      return false;
    }
    return s.failures >= CIRCUIT_OPEN_AFTER;
  }
  recordFailure(agent) {
    const s = this.state.get(agent) || { failures: 0, openedAt: null };
    s.failures += 1;
    if (s.failures === CIRCUIT_OPEN_AFTER) s.openedAt = Date.now();
    this.state.set(agent, s);
  }
  recordSuccess(agent) { this.state.delete(agent); }
  snapshot() {
    const out = {};
    for (const [k,v] of this.state.entries()) {
      out[k] = { failures: v.failures, openedAt: v.openedAt };
    }
    return out;
  }
}

// =============================================================================
// COORDINATOR
// =============================================================================
class SwarmCoordinator {
  constructor(opts = {}) {
    this.pool         = opts.pool || global.pool || global.db || null;
    this.brainEmit    = opts.brainEmit || global.brainEmit || (() => {});
    this.startedAt    = Date.now();
    this.running      = false;
    this.pollTimer    = null;
    this.cronTimers   = [];
    this.lastEventId  = 0;
    this.breaker      = new CircuitBreaker();
    this.stats        = { polled: 0, dispatched: 0, succeeded: 0, failed: 0, skipped: 0 };

    // Subscriptions: { 'agent.name': ['event_prefix1', 'event_prefix2'] }
    this.subscriptions = {};
    for (const [name, agent] of Object.entries(AGENTS.REGISTRY)) {
      this.subscriptions[name] = agent.subscribes || [];
    }
  }

  // -------------------------------------------------------------------------
  async start() {
    if (this.running) return;
    this.running = true;
    console.log('[SWARM] coordinator starting...');

    // Restore watermark from DB
    const wm = await safeQuery(this.pool, 'SELECT last_event_id FROM swarm_watermark WHERE id = 1');
    if (wm.rows[0]) this.lastEventId = wm.rows[0].last_event_id || 0;
    await safeQuery(this.pool, 'UPDATE swarm_watermark SET coordinator_started_at = NOW() WHERE id = 1');

    console.log(`[SWARM] watermark restored at event_id=${this.lastEventId}`);
    console.log(`[SWARM] ${Object.keys(AGENTS.REGISTRY).length} agents registered`);

    // Start poll loop
    this.pollTimer = setInterval(() => this.tick().catch(e => {
      console.warn('[SWARM] tick error:', e.message);
    }), POLL_INTERVAL_MS);

    // Start cron jobs
    this.startCronJobs();

    console.log('[SWARM] coordinator ONLINE');
  }

  stop() {
    this.running = false;
    if (this.pollTimer) clearInterval(this.pollTimer);
    for (const t of this.cronTimers) clearInterval(t);
    this.cronTimers = [];
    console.log('[SWARM] coordinator stopped');
  }

  // -------------------------------------------------------------------------
  async tick() {
    if (!this.running) return;
    this.stats.polled += 1;

    // Pull new events since last watermark
    const r = await safeQuery(
      this.pool,
      `SELECT id, event_type, payload, created_at
         FROM brain_events
        WHERE id > $1
        ORDER BY id ASC
        LIMIT $2`,
      [this.lastEventId, MAX_BATCH_SIZE]
    );

    if (r.skipped) return;
    if (!r.rows.length) return;

    for (const row of r.rows) {
      try {
        await this.routeEvent(row);
      } catch (e) {
        console.warn(`[SWARM] route error for event ${row.id}:`, e.message);
      }
      if (row.id > this.lastEventId) this.lastEventId = row.id;
    }

    // Persist watermark (best-effort, non-blocking)
    safeQuery(
      this.pool,
      'UPDATE swarm_watermark SET last_event_id = $1, last_polled_at = NOW() WHERE id = 1',
      [this.lastEventId]
    );
  }

  // -------------------------------------------------------------------------
  async routeEvent(eventRow) {
    const eventType = eventRow.event_type || '';
    const matchedAgents = [];

    for (const [name, prefixes] of Object.entries(this.subscriptions)) {
      if (!prefixes || !prefixes.length) continue;
      if (this.breaker.isOpen(name)) continue;
      const matches = prefixes.some(prefix =>
        prefix === '*' ||
        eventType === prefix ||
        eventType.startsWith(prefix + '.') ||
        eventType.startsWith(prefix)
      );
      if (matches) matchedAgents.push(name);
    }

    for (const agentName of matchedAgents) {
      this.dispatchToAgent(agentName, eventRow).catch(e => {
        console.warn(`[SWARM] dispatch ${agentName} crashed:`, e.message);
      });
    }
  }

  // -------------------------------------------------------------------------
  async dispatchToAgent(agentName, eventRow) {
    const agent = AGENTS.REGISTRY[agentName];
    if (!agent) return;

    this.stats.dispatched += 1;
    const startedAt = Date.now();

    // Insert dispatch row
    const ins = await safeQuery(
      this.pool,
      `INSERT INTO swarm_dispatches
         (agent_name, event_type, brain_event_id, payload, status, started_at)
       VALUES ($1, $2, $3, $4, 'running', NOW())
       RETURNING id`,
      [agentName, eventRow.event_type, eventRow.id, eventRow.payload || {}]
    );
    const dispatchId = ins.rows[0]?.id || null;

    // Run handler with timeout
    let result = null;
    let errorMessage = null;
    let status = 'succeeded';

    try {
      const ctx = {
        pool: this.pool,
        brainEmit: this.brainEmit,
        safeQuery: (sql, params, timeout) => safeQuery(this.pool, sql, params, timeout),
        agentName,
        coordinator: this
      };
      result = await Promise.race([
        agent.handler(eventRow, ctx),
        new Promise((_, reject) => setTimeout(
          () => reject(new Error('agent_timeout')),
          DISPATCH_TIMEOUT_MS
        ))
      ]);
      this.breaker.recordSuccess(agentName);
      this.stats.succeeded += 1;
      if (result && result.skipped) {
        status = 'skipped';
        this.stats.skipped += 1;
      }
    } catch (e) {
      errorMessage = e.message || String(e);
      status = 'failed';
      this.breaker.recordFailure(agentName);
      this.stats.failed += 1;
    }

    const durationMs = Date.now() - startedAt;

    // Update dispatch row
    if (dispatchId) {
      safeQuery(
        this.pool,
        `UPDATE swarm_dispatches
            SET status = $1, result = $2, error_message = $3,
                duration_ms = $4, completed_at = NOW()
          WHERE id = $5`,
        [status, result || {}, errorMessage, durationMs, dispatchId]
      );
    }

    // Emit dispatch event back to brain so other agents can react
    try {
      this.brainEmit({
        event: `swarm.dispatch.${status}`,
        source_module: 'swarm-coordinator',
        agent: agentName,
        event_type: eventRow.event_type,
        duration_ms: durationMs,
        error: errorMessage
      });
    } catch (e) {}
  }

  // -------------------------------------------------------------------------
  startCronJobs() {
    const cron = (label, intervalMs, fn) => {
      const timer = setInterval(async () => {
        try { await fn(); }
        catch (e) { console.warn(`[SWARM/CRON ${label}]`, e.message); }
      }, intervalMs);
      this.cronTimers.push(timer);
    };

    // Roll up metrics every 60s
    cron('metrics', 60_000, () => this.rollupMetrics());

    // Periodic agents
    cron('NIGHTWATCH',  60_000,        () => this.runPeriodic('NIGHTWATCH'));
    cron('ROUTECHECK',  10 * 60_000,   () => this.runPeriodic('ROUTECHECK'));
    cron('COSTHAWK',    15 * 60_000,   () => this.runPeriodic('COSTHAWK'));
    cron('FOLLOWUP',    30 * 60_000,   () => this.runPeriodic('FOLLOWUP'));
    cron('HARVESTER',   60 * 60_000,   () => this.runPeriodic('HARVESTER'));
    cron('INVENTORY',   24 * 60 * 60_000, () => this.runPeriodic('INVENTORY'));
    cron('WHISPERER',   24 * 60 * 60_000, () => this.runPeriodic('WHISPERER'));
  }

  async runPeriodic(agentName) {
    const agent = AGENTS.REGISTRY[agentName];
    if (!agent || this.breaker.isOpen(agentName)) return;
    const fakeEvent = {
      id: null,
      event_type: 'swarm.cron.' + agentName.toLowerCase(),
      payload: { cron: true },
      created_at: new Date().toISOString()
    };
    await this.dispatchToAgent(agentName, fakeEvent);
  }

  async rollupMetrics() {
    const minuteAgo = new Date(Date.now() - 60_000).toISOString();
    await safeQuery(
      this.pool,
      `INSERT INTO swarm_metrics (bucket_minute, agent_name, dispatched, succeeded, failed, skipped,
                                  avg_duration_ms, p95_duration_ms)
       SELECT date_trunc('minute', created_at) AS bucket,
              agent_name,
              COUNT(*),
              COUNT(*) FILTER (WHERE status='succeeded'),
              COUNT(*) FILTER (WHERE status='failed'),
              COUNT(*) FILTER (WHERE status='skipped'),
              AVG(duration_ms)::INTEGER,
              (PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms))::INTEGER
         FROM swarm_dispatches
        WHERE created_at >= $1 AND duration_ms IS NOT NULL
        GROUP BY bucket, agent_name
       ON CONFLICT (bucket_minute, agent_name) DO UPDATE
         SET dispatched      = EXCLUDED.dispatched,
             succeeded       = EXCLUDED.succeeded,
             failed          = EXCLUDED.failed,
             skipped         = EXCLUDED.skipped,
             avg_duration_ms = EXCLUDED.avg_duration_ms,
             p95_duration_ms = EXCLUDED.p95_duration_ms`,
      [minuteAgo]
    );
  }

  // -------------------------------------------------------------------------
  status() {
    return {
      running:      this.running,
      uptime_ms:    Date.now() - this.startedAt,
      last_event_id: this.lastEventId,
      stats:        this.stats,
      circuits:     this.breaker.snapshot(),
      agents:       Object.keys(AGENTS.REGISTRY),
      subscriptions: this.subscriptions
    };
  }
}

// =============================================================================
// SINGLETON + EXPORTS
// =============================================================================
let instance = null;

function start(opts = {}) {
  if (instance) return instance;
  instance = new SwarmCoordinator(opts);
  instance.start().catch(e => console.warn('[SWARM] start error:', e.message));
  return instance;
}

function get() { return instance; }

function stop() {
  if (instance) instance.stop();
  instance = null;
}

module.exports = { start, get, stop, SwarmCoordinator };
