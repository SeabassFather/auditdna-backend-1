// ============================================================================
// EVENT SINK - Unified event logger
// File: C:\AuditDNA\backend\services\event-sink.js
//
// Every backend event funnels through here:
// 1. INSERT into email_activity_log -> visible on /api/calendar/events
// 2. POST to ntfy.sh/{topic} -> phone + smartwatch buzz
//
// Usage:
//   const { logEvent } = require('./services/event-sink');
//   await logEvent(pool, {
//     agent_id: 'INTAKE_SUBMIT',
//     direction: 'system',
//     contact_email: 'consumer@example.com',
//     contact_name: 'John Doe',
//     contact_type: 'consumer',
//     commodity: null,
//     subject: 'SPARTAN intake submitted - Mortgage Loan Audit',
//     intent: 'intake',
//     ntfy: true,
//     ntfy_priority: 'high',
//     ntfy_title: 'SPARTAN Intake Submitted',
//     ntfy_tags: 'shield,money_with_wings'
//   });
// ============================================================================

'use strict';

const NTFY_TOPIC = process.env.NTFY_TOPIC || 'mexausa-saul';
const NTFY_BASE = process.env.NTFY_BASE || 'https://ntfy.sh';

/**
 * Log an event to email_activity_log AND optionally fire ntfy push.
 * Never throws - logs errors and continues. Calendar/ntfy are best-effort.
 *
 * @param {Pool} pool - pg pool (required)
 * @param {object} ev - event payload
 * @param {string} ev.agent_id - 'INTAKE_OPEN' | 'EVELYN' | 'DEPLOY' | etc.
 * @param {string} ev.direction - 'inbound' | 'outbound' | 'system'
 * @param {string} [ev.contact_email]
 * @param {string} [ev.contact_name]
 * @param {string} [ev.contact_type] - 'grower' | 'buyer' | 'consumer' | 'system'
 * @param {string} [ev.commodity]
 * @param {string} [ev.subject] - human-readable summary (max 500 chars)
 * @param {string} [ev.snippet]
 * @param {string} [ev.intent] - 'intake' | 'sourcing' | 'audit' | 'deploy' | 'agent_run'
 * @param {boolean} [ev.ntfy] - whether to fire ntfy push (default false)
 * @param {string} [ev.ntfy_priority] - 'min' | 'low' | 'default' | 'high' | 'urgent'
 * @param {string} [ev.ntfy_title]
 * @param {string} [ev.ntfy_tags] - comma-separated emoji tags
 * @param {string} [ev.ntfy_topic] - override topic
 * @returns {Promise<{logged: boolean, ntfy: boolean}>}
 */
async function logEvent(pool, ev) {
  const result = { logged: false, ntfy: false, error: null };

  // ---- 1. INSERT into email_activity_log ----
  if (pool) {
    try {
      await pool.query(
        `INSERT INTO email_activity_log
          (direction, contact_email, contact_name, contact_type, commodity,
           subject, snippet, intent, agent_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          ev.direction || 'system',
          (ev.contact_email || '').slice(0, 200) || null,
          (ev.contact_name || '').slice(0, 200) || null,
          ev.contact_type || null,
          ev.commodity || null,
          (ev.subject || '').slice(0, 500) || null,
          (ev.snippet || '').slice(0, 1000) || null,
          ev.intent || null,
          ev.agent_id || 'UNKNOWN',
        ]
      );
      result.logged = true;
    } catch (e) {
      console.error('[event-sink] log fail:', e.message);
      result.error = e.message;
    }
  }

  // ---- 2. Fire ntfy push if requested ----
  if (ev.ntfy) {
    const topic = ev.ntfy_topic || NTFY_TOPIC;
    const url = `${NTFY_BASE}/${topic}`;
    const headers = {
      'Title': ev.ntfy_title || ev.subject || ev.agent_id || 'AuditDNA Event',
      'Priority': ev.ntfy_priority || 'default',
      'Tags': ev.ntfy_tags || '',
    };

    // Try native fetch first (Node 18+), fall back to node-fetch
    try {
      const fetchFn = (typeof fetch !== 'undefined') ? fetch : require('node-fetch');
      const r = await fetchFn(url, {
        method: 'POST',
        headers,
        body: ev.subject || ev.snippet || ev.agent_id || 'event',
      });
      result.ntfy = !!r && (r.ok || r.status === 200);
    } catch (e) {
      console.error('[event-sink] ntfy fail:', e.message);
    }
  }

  return result;
}

// Convenience wrappers for common event types
async function logIntakeEvent(pool, mode, eventType, caseId, payload = {}) {
  const eventTypeMap = {
    CASE_OPENED:    { agent: 'INTAKE_OPEN',    ntfy: false, priority: 'low',     tags: mode === 'trojan' ? 'lock' : 'shield' },
    FILE_UPLOADED:  { agent: 'INTAKE_FILE',    ntfy: false, priority: 'low',     tags: 'page_facing_up' },
    ID_VERIFIED:    { agent: 'INTAKE_ID',      ntfy: true,  priority: 'default', tags: 'id' },
    CONSENT_SIGNED: { agent: 'INTAKE_CONSENT', ntfy: true,  priority: 'default', tags: 'pencil' },
    CASE_SUBMITTED: { agent: 'INTAKE_SUBMIT',  ntfy: true,  priority: 'high',    tags: 'rocket,money_with_wings' },
  };
  const cfg = eventTypeMap[eventType] || { agent: 'INTAKE_OTHER', ntfy: false, priority: 'low', tags: '' };

  const subject = `[${mode.toUpperCase()}] ${eventType.replace('_', ' ')} - ${caseId}` +
                  (payload.service_name ? ` - ${payload.service_name}` : '') +
                  (payload.file_count ? ` - ${payload.file_count} files` : '') +
                  (payload.estimated_recovery ? ` - $${(payload.estimated_recovery || 0).toLocaleString()}` : '');

  return logEvent(pool, {
    agent_id: cfg.agent,
    direction: 'system',
    contact_email: payload.consumer_email || null,
    contact_name: payload.consumer_name || null,
    contact_type: 'consumer',
    commodity: null,
    subject,
    intent: 'intake',
    ntfy: cfg.ntfy,
    ntfy_priority: cfg.priority,
    ntfy_title: `${mode === 'trojan' ? 'TROJAN' : 'SPARTAN'} ${eventType.replace('_', ' ')}`,
    ntfy_tags: cfg.tags,
  });
}

async function logSystemEvent(pool, agent_id, subject, opts = {}) {
  return logEvent(pool, {
    agent_id,
    direction: 'system',
    subject,
    intent: opts.intent || 'system',
    ntfy: opts.ntfy || false,
    ntfy_priority: opts.priority || 'default',
    ntfy_title: opts.title || agent_id,
    ntfy_tags: opts.tags || '',
  });
}

async function logAgentRun(pool, agent_id, payload = {}) {
  return logEvent(pool, {
    agent_id,
    direction: 'system',
    commodity: payload.commodity || null,
    subject: payload.subject || `${agent_id} run - ${payload.summary || ''}`,
    intent: 'agent_run',
    ntfy: payload.ntfy || false,
    ntfy_priority: payload.priority || 'low',
    ntfy_title: payload.title || agent_id,
    ntfy_tags: payload.tags || 'robot',
  });
}

module.exports = {
  logEvent,
  logIntakeEvent,
  logSystemEvent,
  logAgentRun,
  NTFY_TOPIC,
};
