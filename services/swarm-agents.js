// =============================================================================
// SWARM AGENTS - PHASE 4
// File: C:\AuditDNA\backend\services\swarm-agents.js
//
// 15 agent handlers. Each handler is async (eventRow, ctx) => result.
// ctx provides: pool, brainEmit, safeQuery (paranoid wrapper), agentName.
//
// Result shape: { ok: true, ... } success | { skipped: true, reason } skip
// Throw to signal failure (coordinator records error + opens circuit eventually).
//
// Naming: agents have a role-based name. Their job is single-purpose. They emit
// brain events when they do something so other agents can react (Pacman loop).
// =============================================================================

// =============================================================================
// 1. ECHO - logs every event for debugging (always-on)
// =============================================================================
const ECHO = {
  description: 'Logs every event to console (debugging)',
  subscribes: [],  // Subscribed via wildcard in coordinator if needed
  cron:       null,
  async handler(event, ctx) {
    console.log(`[ECHO] ${event.event_type} id=${event.id}`);
    return { ok: true };
  }
};

// =============================================================================
// 2. HEALER - frontend module reports empty/broken state -> opens issue
// =============================================================================
const HEALER = {
  description: 'Frontend module empty/broken -> publishes scaffold needed',
  subscribes: ['frontend.module.empty', 'frontend.error', 'frontend.module.error'],
  cron:       null,
  async handler(event, ctx) {
    const p = event.payload || {};
    if (!p.module && !p.component) {
      return { skipped: true, reason: 'no_module_id' };
    }
    const module = p.module || p.component;

    // Look for existing open issue for this module
    const existing = await ctx.safeQuery(
      `SELECT id FROM swarm_dispatches
        WHERE agent_name = 'STITCHER' AND status IN ('pending','running')
          AND payload->>'module' = $1
        LIMIT 1`,
      [module]
    );
    if (existing.rows.length) return { skipped: true, reason: 'already_dispatched' };

    // Emit scaffold-needed event so STITCHER picks it up
    ctx.brainEmit({
      event: 'swarm.module.needs_scaffold',
      source_module: 'HEALER',
      module,
      reason: p.reason || 'empty_render',
      reported_by: p.user_id || null,
      url: p.url || null
    });

    return { ok: true, action: 'scaffold_requested', module };
  }
};

// =============================================================================
// 3. STITCHER - module scaffold needed -> writes placeholder file (logs only,
//    never writes files in v1; logs the request and queues for human review)
// =============================================================================
const STITCHER = {
  description: 'Module scaffold needed -> queues for review (no file writes in v1)',
  subscribes: ['swarm.module.needs_scaffold'],
  cron:       null,
  async handler(event, ctx) {
    const p = event.payload || {};
    const module = p.module;
    if (!module) return { skipped: true, reason: 'no_module' };

    // Insert into autonomy_queue for human review
    await ctx.safeQuery(
      `INSERT INTO autonomy_queue (agent_id, task_type, payload, status, created_at)
       VALUES ('STITCHER', 'module_scaffold_review', $1, 'pending', NOW())
       ON CONFLICT DO NOTHING`,
      [JSON.stringify({ module, reason: p.reason, reported_at: event.created_at })]
    );

    ctx.brainEmit({
      event: 'swarm.module.queued_for_review',
      source_module: 'STITCHER',
      module,
      message: `Module ${module} queued for scaffold review`
    });

    return { ok: true, action: 'queued_for_review', module };
  }
};

// =============================================================================
// 4. FOLLOWUP - abandoned wizard sessions -> emit reminder event
// =============================================================================
const FOLLOWUP = {
  description: 'Finds wizard sessions idle 24h+, emits reminder events',
  subscribes: [],  // cron-driven only
  cron:       30 * 60 * 1000,
  async handler(event, ctx) {
    // Find sessions that are active but haven't been touched in 24h
    const r = await ctx.safeQuery(
      `SELECT id, agent_type, language, resume_token, created_at, updated_at,
              state->>'email' AS email, state->>'phone' AS phone, state->>'full_name' AS name
         FROM agent_sessions
        WHERE status = 'active'
          AND updated_at < NOW() - INTERVAL '24 hours'
          AND updated_at > NOW() - INTERVAL '14 days'
          AND (last_followup_at IS NULL OR last_followup_at < NOW() - INTERVAL '3 days')
        LIMIT 20`,
      []
    );
    if (r.skipped || !r.rows.length) {
      return { skipped: true, reason: r.skipped ? 'db_unavail' : 'none_eligible' };
    }

    let emitted = 0;
    for (const s of r.rows) {
      ctx.brainEmit({
        event: 'swarm.session.followup_due',
        source_module: 'FOLLOWUP',
        session_id: s.id,
        agent_type: s.agent_type,
        resume_token: s.resume_token,
        contact: { email: s.email, phone: s.phone, name: s.name },
        idle_hours: Math.floor((Date.now() - new Date(s.updated_at)) / 3600000)
      });
      emitted += 1;
    }
    return { ok: true, emitted };
  }
};

// =============================================================================
// 5. TRIAGER - Diego flag raised -> classifies + routes
// =============================================================================
const TRIAGER = {
  description: 'Diego SI flag raised -> tags + routes to right queue',
  subscribes: ['agent.flag.raised', 'diego.flag', 'swarm.flag'],
  cron:       null,
  async handler(event, ctx) {
    const p = event.payload || {};
    if (!p.flag_id && !p.session_id) return { skipped: true, reason: 'no_target' };

    // Pull the flag
    const r = await ctx.safeQuery(
      `SELECT id, session_id, severity, code, recommendation, payload
         FROM agent_flags
        WHERE id = $1 OR session_id = $2
        ORDER BY id DESC LIMIT 1`,
      [p.flag_id || 0, p.session_id || null]
    );
    if (!r.rows.length) return { skipped: true, reason: 'flag_not_found' };
    const flag = r.rows[0];

    // Route based on severity
    let route = 'review';
    if (flag.severity === 'blocking')  route = 'block_and_alert';
    else if (flag.severity === 'critical') route = 'manual_review_urgent';
    else if (flag.severity === 'warning')  route = 'review';

    ctx.brainEmit({
      event: 'swarm.flag.routed',
      source_module: 'TRIAGER',
      flag_id: flag.id,
      session_id: flag.session_id,
      severity: flag.severity,
      route
    });

    return { ok: true, route, severity: flag.severity };
  }
};

// =============================================================================
// 6. ARCHIVIST - completed wizard session -> tag CRM + log
// =============================================================================
const ARCHIVIST = {
  description: 'Wizard session completed -> CRM tag + log',
  subscribes: ['agent.session.completed', 'session.completed', 'wizard.completed'],
  cron:       null,
  async handler(event, ctx) {
    const p = event.payload || {};
    if (!p.session_id) return { skipped: true, reason: 'no_session_id' };

    // Pull session
    const r = await ctx.safeQuery(
      `SELECT id, agent_type, state, language, completed_at
         FROM agent_sessions WHERE id = $1`,
      [p.session_id]
    );
    if (!r.rows.length) return { skipped: true, reason: 'session_not_found' };

    const s = r.rows[0];
    const state = s.state || {};

    ctx.brainEmit({
      event: 'swarm.session.archived',
      source_module: 'ARCHIVIST',
      session_id: s.id,
      agent_type: s.agent_type,
      contact_name: state.full_name || state.name || null,
      contact_email: state.email || null,
      contact_phone: state.phone || null,
      company: state.company_name || null,
      tag: s.agent_type === 'enrique' ? 'GROWER_ONBOARDED' : 'BUYER_INQUIRED'
    });

    return { ok: true, archived: s.id };
  }
};

// =============================================================================
// 7. NIGHTWATCH - schema drift / DB pool starvation / table missing detector
// =============================================================================
const NIGHTWATCH = {
  description: 'Detects schema drift, missing tables, pool starvation - alerts',
  subscribes: [],  // cron only
  cron:       60_000,
  async handler(event, ctx) {
    const findings = [];

    // 1. Pool health check
    const ping = await ctx.safeQuery(`SELECT 1 AS ok`, [], 2000);
    if (ping.skipped) {
      findings.push({ kind: 'pool_unresponsive', detail: ping.error });
    }

    // 2. Connection count
    const conns = await ctx.safeQuery(
      `SELECT count(*) AS c, state FROM pg_stat_activity GROUP BY state`,
      [], 2000
    );
    if (!conns.skipped && conns.rows.length) {
      const total = conns.rows.reduce((sum, r) => sum + parseInt(r.c, 10), 0);
      if (total > 80) {
        findings.push({ kind: 'high_connection_count', count: total, breakdown: conns.rows });
      }
    }

    // 3. Required tables
    const expectedTables = [
      'agent_sessions','agent_flags','brain_events',
      'autonomy_queue','swarm_dispatches'
    ];
    const existing = await ctx.safeQuery(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema='public' AND table_name = ANY($1)`,
      [expectedTables]
    );
    if (!existing.skipped) {
      const found = new Set(existing.rows.map(r => r.table_name));
      const missing = expectedTables.filter(t => !found.has(t));
      if (missing.length) {
        findings.push({ kind: 'missing_tables', tables: missing });
      }
    }

    if (!findings.length) return { ok: true, healthy: true };

    ctx.brainEmit({
      event: 'swarm.nightwatch.alert',
      source_module: 'NIGHTWATCH',
      findings,
      checked_at: new Date().toISOString()
    });

    return { ok: true, findings };
  }
};

// =============================================================================
// 8. HARVESTER - Gmail Other Contacts pull (your 50K backlog item)
// =============================================================================
const HARVESTER = {
  description: 'Gmail other-contacts pull (~50K addresses) - stub in v1',
  subscribes: [],
  cron:       60 * 60_000,  // hourly
  async handler(event, ctx) {
    // Stub: real Google People API call goes here
    // Just log the intent for now and queue task
    await ctx.safeQuery(
      `INSERT INTO autonomy_queue (agent_id, task_type, payload, status, created_at)
       VALUES ('HARVESTER', 'gmail_other_contacts_pull',
               '{"endpoint":"people.googleapis.com/v1/otherContacts","page_size":1000}'::jsonb,
               'pending', NOW())
       ON CONFLICT DO NOTHING`,
      []
    );
    return { skipped: true, reason: 'stub_v1_queued_for_real_impl' };
  }
};

// =============================================================================
// 9. TRANSLATOR - new EN prompt added -> auto-translates to ES (stub)
// =============================================================================
const TRANSLATOR = {
  description: 'Auto-translates new prompts EN->ES (stub in v1)',
  subscribes: ['prompt.created', 'i18n.missing_translation'],
  cron:       null,
  async handler(event, ctx) {
    return { skipped: true, reason: 'stub_v1_needs_anthropic_wiring' };
  }
};

// =============================================================================
// 10. COMMITWATCH - non-Saul GitHub commit detected -> alert
// =============================================================================
const COMMITWATCH = {
  description: 'Watches for unauthorized git commits (the bot incident detector)',
  subscribes: ['github.commit', 'github.push'],
  cron:       null,
  async handler(event, ctx) {
    const p = event.payload || {};
    const author = (p.author || p.commit_author || '').toLowerCase();
    const message = p.commit_message || p.message || '';
    const expectedAuthors = ['seabassfather', 'sgarcia1911@gmail.com', 'saul'];

    const isExpected = expectedAuthors.some(a => author.includes(a));
    const isSuspicious = /hello.*goodbye|placeholder|test commit|update print/i.test(message);

    if (!isExpected || isSuspicious) {
      ctx.brainEmit({
        event: 'swarm.commitwatch.alert',
        source_module: 'COMMITWATCH',
        author,
        message,
        sha: p.sha || p.commit_sha,
        suspicious: isSuspicious,
        repo: p.repo
      });
      return { ok: true, alerted: true, reason: isSuspicious ? 'suspicious_message' : 'unexpected_author' };
    }
    return { ok: true, alerted: false };
  }
};

// =============================================================================
// 11. ROUTECHECK - pings critical URLs every 10min, flags 4xx/5xx
// =============================================================================
const ROUTECHECK = {
  description: 'Pings critical URLs, flags 4xx/5xx',
  subscribes: [],
  cron:       10 * 60_000,
  async handler(event, ctx) {
    const urls = [
      'https://mexausafg.com/api/health',
      'https://mexausafg.com/onboard',
      'https://mexausafg.com/inquire',
      'https://loaf.mexausafg.com',
      'https://auditdna-backend-1-production.up.railway.app/api/brain/status'
    ];
    const findings = [];
    for (const url of urls) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        const r = await fetch(url, { signal: ctrl.signal, redirect: 'follow' });
        clearTimeout(timer);
        if (!r.ok) findings.push({ url, status: r.status });
      } catch (e) {
        findings.push({ url, error: e.message });
      }
    }
    if (findings.length) {
      ctx.brainEmit({
        event: 'swarm.routecheck.alert',
        source_module: 'ROUTECHECK',
        findings
      });
    }
    return { ok: true, checked: urls.length, failed: findings.length };
  }
};

// =============================================================================
// 12. COSTHAWK - watches Anthropic spend, throttles if over threshold
// =============================================================================
const COSTHAWK = {
  description: 'Anthropic spend > threshold -> emit throttle event',
  subscribes: [],
  cron:       15 * 60_000,
  async handler(event, ctx) {
    const r = await ctx.safeQuery(
      `SELECT SUM(cost_cents) AS total_cents
         FROM agent_sessions
        WHERE updated_at >= NOW() - INTERVAL '24 hours'`,
      []
    );
    if (r.skipped) return { skipped: true, reason: 'db_unavail' };

    const cents = parseInt(r.rows[0]?.total_cents || 0, 10);
    const dollars = cents / 100;
    const THRESHOLD_DOLLARS = 50;

    if (dollars > THRESHOLD_DOLLARS) {
      ctx.brainEmit({
        event: 'swarm.cost.over_threshold',
        source_module: 'COSTHAWK',
        cents,
        dollars,
        threshold: THRESHOLD_DOLLARS,
        action: 'recommend_throttle'
      });
    }
    return { ok: true, dollars, threshold: THRESHOLD_DOLLARS };
  }
};

// =============================================================================
// 13. INVENTORY - daily scan of React modules (stub: just queues)
// =============================================================================
const INVENTORY = {
  description: 'Daily inventory of frontend modules - stub v1',
  subscribes: [],
  cron:       24 * 60 * 60_000,
  async handler(event, ctx) {
    await ctx.safeQuery(
      `INSERT INTO autonomy_queue (agent_id, task_type, payload, status, created_at)
       VALUES ('INVENTORY', 'frontend_module_scan', '{}'::jsonb, 'pending', NOW())
       ON CONFLICT DO NOTHING`,
      []
    );
    return { ok: true, queued: true };
  }
};

// =============================================================================
// 14. WHISPERER - 7am daily summary email to Saul (stub: emits brain event)
// =============================================================================
const WHISPERER = {
  description: 'Daily 7am summary - emits brain event (real email v2)',
  subscribes: [],
  cron:       24 * 60 * 60_000,
  async handler(event, ctx) {
    const r = await ctx.safeQuery(
      `SELECT
         (SELECT COUNT(*) FROM swarm_dispatches WHERE created_at >= NOW() - INTERVAL '24 hours') AS dispatches_24h,
         (SELECT COUNT(*) FROM swarm_dispatches WHERE status='failed' AND created_at >= NOW() - INTERVAL '24 hours') AS failed_24h,
         (SELECT COUNT(*) FROM agent_sessions WHERE created_at >= NOW() - INTERVAL '24 hours') AS sessions_24h,
         (SELECT COUNT(*) FROM agent_flags WHERE created_at >= NOW() - INTERVAL '24 hours') AS flags_24h`,
      []
    );
    const summary = r.rows[0] || {};

    ctx.brainEmit({
      event: 'swarm.whisperer.daily_summary',
      source_module: 'WHISPERER',
      to: 'saul@mexausafg.com',
      subject: 'AuditDNA Daily Swarm Report',
      summary
    });

    return { ok: true, summary };
  }
};

// =============================================================================
// 15. COURIER - agent-to-agent message routing (Enrique handoff to Diego, etc.)
// =============================================================================
const COURIER = {
  description: 'Agent-to-agent message routing (Enrique -> Diego handoff etc.)',
  subscribes: ['agent.handoff', 'session.handoff', 'swarm.handoff'],
  cron:       null,
  async handler(event, ctx) {
    const p = event.payload || {};
    if (!p.from || !p.to) return { skipped: true, reason: 'no_routing_pair' };

    await ctx.safeQuery(
      `INSERT INTO agent_handoffs (session_id, from_agent, to_agent, reason, payload, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW())`,
      [p.session_id || null, p.from, p.to, p.reason || 'unspecified', JSON.stringify(p)]
    );

    ctx.brainEmit({
      event: 'swarm.courier.delivered',
      source_module: 'COURIER',
      from: p.from, to: p.to,
      session_id: p.session_id || null
    });

    return { ok: true, routed: { from: p.from, to: p.to } };
  }
};

// =============================================================================
// 16. GG - SMTP Medic (self-repair via Claude AI)
// =============================================================================
const GG = {
  description: 'SMTP Medic - self-repair via Claude AI',
  subscribes: ['smtp.health.degraded', 'smtp.send.failed', 'smtp.health.recovered'],
  cron:       null,
  async handler(event, ctx) {
    return { ok: true, note: 'handled_by_gg-smtp-medic_service', event_type: event.event_type };
  }
};

// =============================================================================
// REGISTRY - the swarm
// =============================================================================
const REGISTRY = {
  ECHO,
  HEALER,
  STITCHER,
  FOLLOWUP,
  TRIAGER,
  ARCHIVIST,
  NIGHTWATCH,
  HARVESTER,
  TRANSLATOR,
  COMMITWATCH,
  ROUTECHECK,
  COSTHAWK,
  INVENTORY,
  WHISPERER,
  COURIER,
  GG
};

module.exports = { REGISTRY };
