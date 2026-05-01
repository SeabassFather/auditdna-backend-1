// =============================================================================
// GG - SMTP MEDIC AGENT
// File: C:\AuditDNA\backend\services\gg-smtp-medic.js
//
// Self-repair AI agent for SMTP transporter health.
// - Polls transporter.verify() every 60s
// - On failure: publishes brain_event, calls Claude with full context, gets fix proposal
// - Writes proposal to ai_smtp_repair table with status='proposed'
// - NEVER auto-applies. Human must POST /api/gg/approve/:id
// - Built-in fix recipes for 4 common SMTP failure modes
//
// Standing rules: SMTP = Gmail only (smtp.gmail.com:587, sgarcia1911@gmail.com)
// =============================================================================

const nodemailer = require('nodemailer');

let pool = null;
let aiHelper = null;
let transporter = null;
let pollTimer = null;
let consecutiveFailures = 0;
let lastVerifyAt = null;
let lastVerifyOk = null;
let lastError = null;

const POLL_INTERVAL_MS = 60 * 1000;          // 60s
const FAILURE_THRESHOLD = 3;                  // 3 consecutive fails -> Claude proposal
const PROPOSAL_COOLDOWN_MS = 30 * 60 * 1000;  // don't spam Claude more than once per 30min
let lastProposalAt = 0;

// Static fix recipes - applied as candidate diagnostics in the Claude prompt
const FIX_RECIPES = [
  { id: 'app_pwd_rotation',  trigger: /Invalid login|535|Username and Password not accepted|EAUTH/i,
    description: 'Gmail App Password expired or rotated. Need new 16-char app password from https://myaccount.google.com/apppasswords' },
  { id: 'port_toggle',       trigger: /ETIMEDOUT|ECONNREFUSED.*465|EAI_AGAIN/i,
    description: 'Port 587 unreachable. Try 465 (secure=true) or check firewall/ISP blocking' },
  { id: 'tls_handshake',     trigger: /SSL|TLS|certificate|self-signed/i,
    description: 'TLS handshake failure. Verify secure flag matches port (587=false, 465=true)' },
  { id: 'rate_limit',        trigger: /421|450|too many|rate/i,
    description: 'Gmail rate limit hit (500/day for app passwords, 100/hr per IP). Back off or switch to Workspace OAuth2' },
];

// =============================================================================
function init({ pool: poolInst, aiHelper: aiInst, transporter: trInst }) {
  pool = poolInst;
  aiHelper = aiInst;
  transporter = trInst;
  if (!pool)        throw new Error('[GG] pool required');
  if (!aiHelper)    console.warn('[GG] aiHelper missing - Claude proposals disabled');
  if (!transporter) throw new Error('[GG] transporter required');
}

// =============================================================================
async function start() {
  if (pollTimer) {
    console.warn('[GG] already running');
    return;
  }
  console.log('[GG] SMTP Medic starting (poll every 60s)');

  // Immediate first check
  await tick();

  pollTimer = setInterval(() => {
    tick().catch(err => console.error('[GG] tick error:', err.message));
  }, POLL_INTERVAL_MS);

  console.log('[GG] ONLINE');
}

function stop() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
  console.log('[GG] stopped');
}

// =============================================================================
async function tick() {
  lastVerifyAt = new Date();
  try {
    await transporter.verify();
    if (!lastVerifyOk && lastVerifyOk !== null) {
      // RECOVERED
      await publishEvent('smtp.health.recovered', { after_failures: consecutiveFailures });
      console.log('[GG] SMTP recovered after', consecutiveFailures, 'failures');
    }
    lastVerifyOk = true;
    lastError = null;
    consecutiveFailures = 0;
  } catch (err) {
    lastVerifyOk = false;
    lastError = { message: err.message, code: err.code, command: err.command };
    consecutiveFailures++;

    await publishEvent('smtp.health.degraded', {
      consecutive_failures: consecutiveFailures,
      error: lastError,
      transporter_options: scrubAuth(transporter.options),
    });

    console.warn(`[GG] SMTP verify failed (${consecutiveFailures}/${FAILURE_THRESHOLD}):`, err.message);

    // Trigger Claude proposal at threshold (with cooldown)
    if (consecutiveFailures >= FAILURE_THRESHOLD &&
        Date.now() - lastProposalAt > PROPOSAL_COOLDOWN_MS) {
      lastProposalAt = Date.now();
      proposeRepair(lastError).catch(e => {
        console.error('[GG] proposeRepair error:', e.message);
      });
    }
  }
}

// =============================================================================
function scrubAuth(opts) {
  if (!opts) return null;
  const o = { ...opts };
  if (o.auth) o.auth = { user: o.auth.user, pass: '***REDACTED***' };
  return o;
}

async function publishEvent(event_type, payload) {
  try {
    await pool.query(
      `INSERT INTO brain_events (event_type, payload, agent_id, severity)
       VALUES ($1, $2, $3, $4)`,
      [event_type, JSON.stringify(payload), 'GG', event_type === 'smtp.health.degraded' ? 2 : 0]
    );
  } catch (e) {
    console.warn('[GG] brain_event publish failed:', e.message);
  }
}

// =============================================================================
// PROPOSE REPAIR - asks Claude for a fix, writes proposal to ai_smtp_repair
// =============================================================================
async function proposeRepair(error) {
  if (!aiHelper) {
    console.warn('[GG] no aiHelper - skipping Claude proposal');
    return null;
  }

  // Match against known recipes
  const matches = FIX_RECIPES.filter(r => r.trigger.test(error.message || '') || r.trigger.test(error.code || ''));
  const recipeHints = matches.length
    ? matches.map(r => `- ${r.id}: ${r.description}`).join('\n')
    : '(none of the known recipes matched - this is a novel failure)';

  const transporterOpts = scrubAuth(transporter.options);

  const prompt = `SMTP transporter has failed verify() ${consecutiveFailures} consecutive times.

ERROR:
  message: ${error.message}
  code:    ${error.code || 'N/A'}
  command: ${error.command || 'N/A'}

CURRENT TRANSPORTER CONFIG:
${JSON.stringify(transporterOpts, null, 2)}

KNOWN FIX RECIPES MATCHING THIS ERROR:
${recipeHints}

PLATFORM RULES (NON-NEGOTIABLE):
- SMTP MUST be Gmail (smtp.gmail.com:587, secure=false)
- User: sgarcia1911@gmail.com
- App password authentication (16-char from Google)
- NEVER suggest GoDaddy/SecureServer or any other host
- NEVER suggest changing the user account

Respond with a single JSON object (no markdown, no preamble) with shape:
{
  "diagnosis": "1-2 sentence root cause",
  "confidence": "low|medium|high",
  "recommended_action": "single sentence what to do",
  "fix_type": "env_update|config_change|external_action|investigation_only",
  "specific_changes": [
    { "type": "env", "key": "SMTP_PASS", "current_value_hint": "starts with...", "new_value_hint": "fetch new 16-char app password from Google" }
  ],
  "human_steps": ["step 1", "step 2"],
  "risk_level": "low|medium|high",
  "auto_apply_safe": false
}`;

  try {
    const response = await aiHelper.ask(prompt, 'You are an SMTP infrastructure repair agent. Respond ONLY with valid JSON. Be precise. Never recommend anything that violates the stated platform rules.');
    let proposal = null;
    try {
      // Strip markdown fences if Claude added them
      const clean = String(response).replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      proposal = JSON.parse(clean);
    } catch (parseErr) {
      console.warn('[GG] Claude response not valid JSON:', String(response).slice(0, 200));
      proposal = { raw_response: String(response).slice(0, 2000), parse_error: parseErr.message };
    }

    const result = await pool.query(
      `INSERT INTO ai_smtp_repair (error_message, error_code, transporter_config, matched_recipes, proposal_json, status)
       VALUES ($1, $2, $3, $4, $5, 'proposed') RETURNING id, created_at`,
      [error.message, error.code || null, JSON.stringify(transporterOpts), JSON.stringify(matches.map(m => m.id)), JSON.stringify(proposal)]
    );

    const proposalId = result.rows[0].id;
    console.log(`[GG] Repair proposal #${proposalId} written. Review: GET /api/gg/proposals/${proposalId}`);

    await publishEvent('smtp.repair.proposed', {
      proposal_id: proposalId,
      diagnosis: proposal.diagnosis,
      fix_type: proposal.fix_type,
      risk_level: proposal.risk_level,
    });

    return { id: proposalId, proposal };
  } catch (err) {
    console.error('[GG] Claude call failed:', err.message);
    return null;
  }
}

// =============================================================================
// API HOOKS - called by routes
// =============================================================================
async function getStatus() {
  return {
    running:              !!pollTimer,
    last_verify_at:       lastVerifyAt,
    last_verify_ok:       lastVerifyOk,
    consecutive_failures: consecutiveFailures,
    last_error:           lastError,
    transporter_config:   transporter ? scrubAuth(transporter.options) : null,
    poll_interval_ms:     POLL_INTERVAL_MS,
    failure_threshold:    FAILURE_THRESHOLD,
  };
}

async function listProposals(limit = 20) {
  const r = await pool.query(
    `SELECT id, error_message, error_code, status, created_at, applied_at, rejected_at,
            (proposal_json->>'diagnosis') AS diagnosis,
            (proposal_json->>'fix_type') AS fix_type,
            (proposal_json->>'risk_level') AS risk_level
     FROM ai_smtp_repair
     ORDER BY created_at DESC
     LIMIT $1`, [limit]);
  return r.rows;
}

async function getProposal(id) {
  const r = await pool.query('SELECT * FROM ai_smtp_repair WHERE id = $1', [id]);
  return r.rows[0] || null;
}

async function rejectProposal(id, reason) {
  await pool.query(
    `UPDATE ai_smtp_repair SET status = 'rejected', rejected_at = NOW(), reject_reason = $2
     WHERE id = $1 AND status = 'proposed'`, [id, reason || 'human_rejected']);
  await publishEvent('smtp.repair.rejected', { proposal_id: id, reason });
  return { ok: true };
}

async function approveProposal(id, approver) {
  // CRITICAL: This marks the proposal approved but does NOT actually mutate .env or restart anything.
  // The human still has to apply the change manually. GG only logs the approval.
  // Auto-apply to .env or restart PM2 is intentionally NOT implemented - too dangerous.
  await pool.query(
    `UPDATE ai_smtp_repair SET status = 'approved', applied_at = NOW(), approver = $2
     WHERE id = $1 AND status = 'proposed'`, [id, approver || 'unknown']);
  await publishEvent('smtp.repair.approved', { proposal_id: id, approver });
  return { ok: true, note: 'Proposal approved. Human must apply changes to .env and restart PM2.' };
}

async function testNow() {
  await tick();
  return await getStatus();
}

// =============================================================================
module.exports = {
  init,
  start,
  stop,
  getStatus,
  listProposals,
  getProposal,
  rejectProposal,
  approveProposal,
  testNow,
  // exposed for swarm registry
  agentMeta: {
    name: 'GG',
    description: 'SMTP Medic - self-repair via Claude AI',
    subscribes: ['smtp.health.degraded', 'smtp.send.failed'],
  },
};
