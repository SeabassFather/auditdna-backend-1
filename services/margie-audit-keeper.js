// =============================================================================
// MARGIE - Swarm Audit Keeper (memory of all agent activity)
// File: C:\AuditDNA\backend\services\margie-audit-keeper.js
//
// Role: Listens to EVERY brain_event from EVERY agent and writes structured
// change-log entries to ai_audit_log. Keeps a permanent record of:
//   - Every agent state change (online/offline/degraded)
//   - Every proposal made (by GG, Emma, Evelyn, Kiki, Eliott)
//   - Every approval, rejection, deletion, escalation
//   - Every notification sent (ntfy push, email)
//   - Every config change Saul makes
//
// Also exposes summary endpoints:
//   GET /api/margie/timeline       - last 200 audit entries
//   GET /api/margie/agent/:name    - all activity for one agent
//   GET /api/margie/today          - everything that happened today
//   GET /api/margie/stats          - counts by agent, severity, category
// =============================================================================

'use strict';

const POLL_INTERVAL_MS = 30 * 1000;
const WATERMARK_KEY    = 'margie_last_event_id';

let pool         = null;
let pollTimer    = null;
let running      = false;
let lastWatermark = 0;
let lastPollAt   = null;
let entriesWritten = 0;

// Categories Margie classifies events into
const CATEGORY_RULES = [
  { pattern: /\.proposal\./,                   category: 'proposal' },
  { pattern: /\.approved/,                     category: 'approval' },
  { pattern: /\.rejected/,                     category: 'rejection' },
  { pattern: /\.executed/,                     category: 'execution' },
  { pattern: /\.health\./,                     category: 'health' },
  { pattern: /\.token\./,                      category: 'oauth' },
  { pattern: /\.scan\./,                       category: 'scan' },
  { pattern: /\.failed/,                       category: 'failure' },
  { pattern: /\.recovered/,                    category: 'recovery' },
  { pattern: /\.alert/,                        category: 'alert' },
  { pattern: /\.startup/,                      category: 'lifecycle' },
  { pattern: /\.degraded/,                     category: 'degradation' }
];

function classify(eventType) {
  for (const r of CATEGORY_RULES) {
    if (r.pattern.test(eventType)) return r.category;
  }
  return 'general';
}

function severityFromEvent(eventType, payload) {
  if (payload?.severity) return payload.severity;
  if (/critical|fatal|emergency/.test(eventType)) return 'critical';
  if (/failed|error|degraded|expired/.test(eventType)) return 'high';
  if (/warning|stale|slow/.test(eventType)) return 'medium';
  if (/recovered|success|completed/.test(eventType)) return 'info';
  return 'low';
}

// ----------------------------------------------------------------------------
// Watermark - persist between restarts
// ----------------------------------------------------------------------------
async function loadWatermark() {
  if (!pool) return 0;
  try {
    const r = await pool.query(`SELECT value FROM brain_state WHERE key = $1`, [WATERMARK_KEY]);
    if (r.rows[0]) return parseInt(r.rows[0].value, 10) || 0;
  } catch {}
  return 0;
}

async function saveWatermark(id) {
  if (!pool) return;
  try {
    await pool.query(
      `INSERT INTO brain_state (key, value, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [WATERMARK_KEY, String(id)]
    );
  } catch {}
}

// ----------------------------------------------------------------------------
// Poll brain_events, write audit entries
// ----------------------------------------------------------------------------
async function pollOnce() {
  if (!pool) return { ok: false, error: 'no_pool' };
  lastPollAt = new Date().toISOString();

  try {
    const r = await pool.query(
      `SELECT id, event_type, source_module, payload, created_at
       FROM brain_events
       WHERE id > $1
       ORDER BY id ASC
       LIMIT 200`,
      [lastWatermark]
    );

    if (r.rows.length === 0) return { ok: true, new_entries: 0 };

    let written = 0;
    for (const row of r.rows) {
      const category = classify(row.event_type);
      const severity = severityFromEvent(row.event_type, row.payload);
      const summary  = buildSummary(row);

      try {
        await pool.query(
          `INSERT INTO ai_audit_log
           (agent_name, event_type, category, severity, summary, brain_event_id, payload, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            row.source_module || 'unknown',
            row.event_type,
            category,
            severity,
            summary,
            row.id,
            row.payload ? JSON.stringify(row.payload) : null,
            row.created_at
          ]
        );
        written++;
      } catch (err) {
        // duplicate or constraint - skip silently
      }

      lastWatermark = row.id;
    }

    if (written > 0) {
      entriesWritten += written;
      await saveWatermark(lastWatermark);
    }

    return { ok: true, new_entries: written, watermark: lastWatermark };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function buildSummary(row) {
  const agent = row.source_module || 'unknown';
  const evt = row.event_type;
  const p = row.payload || {};

  // Type-specific summaries
  if (/proposal\.created/.test(evt)) return `${agent} created proposal #${p.proposal_id || '?'} (${p.recipe || p.kind || 'unknown'})`;
  if (/proposal\.approved/.test(evt)) return `${agent} proposal #${p.proposal_id || '?'} approved`;
  if (/proposal\.rejected/.test(evt)) return `${agent} proposal #${p.proposal_id || '?'} rejected`;
  if (/cleanup\.executed/.test(evt)) return `${agent} executed deletion: ${p.file_path || 'unknown'}`;
  if (/health\.degraded/.test(evt)) return `${agent} health degraded (failures: ${p.failures || p.consecutive_failures || '?'})`;
  if (/health\.recovered/.test(evt)) return `${agent} health recovered`;
  if (/token\.refreshed/.test(evt)) return `${agent} OAuth token refreshed`;
  if (/refresh\.failed/.test(evt)) return `${agent} OAuth refresh failed: ${p.error || 'unknown'}`;
  if (/scan\.completed/.test(evt)) return `${agent} scan completed - ${p.candidates || 0} candidates, ${p.saved || 0} saved`;
  if (/routes\.degraded/.test(evt)) return `${agent} route errors spiked (${(p.error_rate * 100).toFixed(1)}% on ${p.worst_route || '?'})`;
  if (/data\.scan_completed/.test(evt)) return `${agent} data scan: ${p.findings || 0} issues, ${p.saved || 0} saved`;
  if (/startup/.test(evt)) return `${agent} started up`;
  if (/shutdown/.test(evt)) return `${agent} shut down`;

  return `${agent}: ${evt}`;
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------
function init({ pool: p }) {
  pool = p;
}

async function start() {
  if (running) return;
  running = true;
  lastWatermark = await loadWatermark();
  console.log(`[MARGIE] Audit Keeper ONLINE (watermark=${lastWatermark}, poll every 30s)`);
  pollOnce().catch(err => console.error('[MARGIE] poll error:', err.message));
  pollTimer = setInterval(() => {
    pollOnce().catch(err => console.error('[MARGIE] poll error:', err.message));
  }, POLL_INTERVAL_MS);
}

function stop() {
  running = false;
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

function getStatus() {
  return {
    ok: true,
    agent: 'MARGIE',
    role: 'Swarm Audit Keeper',
    running,
    last_poll_at:    lastPollAt,
    last_watermark:  lastWatermark,
    entries_written: entriesWritten,
    poll_interval_ms: POLL_INTERVAL_MS,
    has_pool: !!pool,
    timestamp: new Date().toISOString()
  };
}

async function getTimeline(limit = 200) {
  if (!pool) return [];
  try {
    const r = await pool.query(
      `SELECT id, agent_name, event_type, category, severity, summary, created_at
       FROM ai_audit_log ORDER BY id DESC LIMIT $1`, [limit]
    );
    return r.rows;
  } catch { return []; }
}

async function getAgentActivity(agentName, limit = 100) {
  if (!pool) return [];
  try {
    const r = await pool.query(
      `SELECT id, event_type, category, severity, summary, created_at
       FROM ai_audit_log WHERE agent_name = $1 ORDER BY id DESC LIMIT $2`,
      [agentName, limit]
    );
    return r.rows;
  } catch { return []; }
}

async function getToday() {
  if (!pool) return [];
  try {
    const r = await pool.query(
      `SELECT id, agent_name, event_type, category, severity, summary, created_at
       FROM ai_audit_log
       WHERE created_at >= CURRENT_DATE
       ORDER BY id DESC`
    );
    return r.rows;
  } catch { return []; }
}

async function getStats() {
  if (!pool) return {};
  try {
    const byAgent = await pool.query(
      `SELECT agent_name, COUNT(*) AS count FROM ai_audit_log
       WHERE created_at >= NOW() - INTERVAL '24 hours' GROUP BY agent_name ORDER BY count DESC`
    );
    const bySeverity = await pool.query(
      `SELECT severity, COUNT(*) AS count FROM ai_audit_log
       WHERE created_at >= NOW() - INTERVAL '24 hours' GROUP BY severity`
    );
    const byCategory = await pool.query(
      `SELECT category, COUNT(*) AS count FROM ai_audit_log
       WHERE created_at >= NOW() - INTERVAL '24 hours' GROUP BY category ORDER BY count DESC`
    );
    const total = await pool.query(`SELECT COUNT(*) AS total FROM ai_audit_log`);
    return {
      ok: true,
      total_all_time: parseInt(total.rows[0].total, 10),
      last_24h: {
        by_agent:    byAgent.rows,
        by_severity: bySeverity.rows,
        by_category: byCategory.rows
      }
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = {
  init, start, stop, getStatus,
  getTimeline, getAgentActivity, getToday, getStats
};
