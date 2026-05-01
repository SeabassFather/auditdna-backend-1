// =============================================================================
// MARGIE - Swarm Audit Keeper (schema-correct v2)
// File: C:\AuditDNA\backend\services\margie-audit-keeper.js
//
// Listens to brain_events (id, event_type, agent_id, severity, payload, created_at)
// Writes structured audit log to ai_audit_log
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

const CATEGORY_RULES = [
  { pattern: /\.proposal\./i,                category: 'proposal' },
  { pattern: /proposal\.|approved/i,         category: 'approval' },
  { pattern: /rejected/i,                    category: 'rejection' },
  { pattern: /executed/i,                    category: 'execution' },
  { pattern: /health/i,                      category: 'health' },
  { pattern: /token|oauth/i,                 category: 'oauth' },
  { pattern: /scan/i,                        category: 'scan' },
  { pattern: /failed|error/i,                category: 'failure' },
  { pattern: /recovered|success/i,           category: 'recovery' },
  { pattern: /alert/i,                       category: 'alert' },
  { pattern: /startup|shutdown/i,            category: 'lifecycle' },
  { pattern: /degraded/i,                    category: 'degradation' },
  { pattern: /rollup/i,                      category: 'rollup' },
  { pattern: /registered|created/i,          category: 'create' }
];

// brain_events.severity is smallint 0-4
// Convert to text for ai_audit_log readability
const SEVERITY_INT_TO_TEXT = ['info','low','medium','high','critical'];

function classify(eventType) {
  if (!eventType) return 'general';
  for (const r of CATEGORY_RULES) {
    if (r.pattern.test(eventType)) return r.category;
  }
  return 'general';
}

function severityFromRow(row) {
  // First, prefer the smallint severity column directly
  if (typeof row.severity === 'number') {
    return SEVERITY_INT_TO_TEXT[row.severity] || 'info';
  }
  // Fallback to payload.severity (string) if present
  if (row.payload && row.payload.severity) {
    return String(row.payload.severity).toLowerCase();
  }
  // Heuristic from event_type
  const evt = row.event_type || '';
  if (/critical|fatal|emergency/i.test(evt)) return 'critical';
  if (/failed|error|degraded|expired|unreachable/i.test(evt)) return 'high';
  if (/warning|stale|slow/i.test(evt)) return 'medium';
  if (/recovered|success|completed|ok/i.test(evt)) return 'info';
  return 'low';
}

// ----------------------------------------------------------------------------
// Watermark
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
// Poll brain_events
// ----------------------------------------------------------------------------
async function pollOnce() {
  if (!pool) return { ok: false, error: 'no_pool' };
  lastPollAt = new Date().toISOString();

  try {
    const r = await pool.query(
      `SELECT id, event_type, agent_id, severity, payload, created_at
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
      const severity = severityFromRow(row);
      const summary  = buildSummary(row);
      const agentName = (row.agent_id || (row.payload && row.payload.source_module) || 'unknown').toString().toUpperCase();

      try {
        await pool.query(
          `INSERT INTO ai_audit_log
           (agent_name, event_type, category, severity, summary, brain_event_id, payload, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (brain_event_id) WHERE brain_event_id IS NOT NULL DO NOTHING`,
          [
            agentName.slice(0, 40),
            (row.event_type || 'unknown').slice(0, 80),
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
        // Try fallback without ON CONFLICT (in case index doesn't support it)
        try {
          await pool.query(
            `INSERT INTO ai_audit_log
             (agent_name, event_type, category, severity, summary, brain_event_id, payload, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              agentName.slice(0, 40),
              (row.event_type || 'unknown').slice(0, 80),
              category,
              severity,
              summary,
              row.id,
              row.payload ? JSON.stringify(row.payload) : null,
              row.created_at
            ]
          );
          written++;
        } catch {}
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
  const agent = (row.agent_id || 'unknown').toString();
  const evt = row.event_type || 'unknown';
  const p = row.payload || {};

  if (/proposal\.created/i.test(evt)) return `${agent} created proposal ${p.proposal_id || ''} (${p.recipe || p.kind || ''})`.trim();
  if (/proposal\.approved/i.test(evt)) return `${agent} proposal ${p.proposal_id || ''} approved`.trim();
  if (/proposal\.rejected/i.test(evt)) return `${agent} proposal ${p.proposal_id || ''} rejected`.trim();
  if (/cleanup\.executed/i.test(evt)) return `${agent} executed deletion: ${p.file_path || ''}`.trim();
  if (/health\.degraded/i.test(evt)) return `${agent} health degraded`;
  if (/health\.recovered/i.test(evt)) return `${agent} health recovered`;
  if (/token\.refreshed/i.test(evt)) return `${agent} OAuth token refreshed`;
  if (/refresh\.failed/i.test(evt)) return `${agent} OAuth refresh failed: ${p.error || ''}`.trim();
  if (/scan\.completed/i.test(evt)) return `${agent} scan completed`;
  if (/rollup\.ok/i.test(evt)) return `${agent} all children healthy (${p.children_count || ''})`.trim();
  if (/children\.degraded/i.test(evt)) return `${agent} swarm degraded: ${p.summary || ''}`.trim();
  if (/startup/i.test(evt)) return `${agent} started up`;
  if (/shutdown/i.test(evt)) return `${agent} shut down`;
  if (/manual\.test/i.test(evt)) return `${agent} manual test - ${p.summary || ''}`.trim();

  return p.summary || `${agent}: ${evt}`;
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------
function init({ pool: p }) { pool = p; }

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
