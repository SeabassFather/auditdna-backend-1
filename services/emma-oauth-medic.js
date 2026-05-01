// =============================================================================
// EMMA - OAuth Medic (Claude-powered self-repair for Google OAuth tokens)
// File: C:\AuditDNA\backend\services\emma-oauth-medic.js
//
// Responsibilities:
//   1. Poll OAuth token expiry every 60s
//   2. If token expires in < 5 min -> auto-call refreshAccessToken() (silent, no Claude)
//   3. If 3 consecutive refresh FAILURES -> escalate to Claude with full context
//      and write proposal to ai_oauth_repair table
//   4. NEVER auto-applies fixes (human approval gate via /api/emma/approve/:id)
//   5. Publishes brain_events: oauth.token.refreshed | oauth.refresh.failed | oauth.token.expired
//
// Sister agent to GG (SMTP medic). Both share same Claude-medic pattern.
// =============================================================================

'use strict';

const fs   = require('fs');
const path = require('path');

const POLL_INTERVAL_MS    = 60 * 1000;
const REFRESH_BEFORE_MS   = 5 * 60 * 1000;      // refresh when < 5 min left
const FAILURE_THRESHOLD   = 3;
const TOKEN_FILE_PATH     = path.join(__dirname, '..', 'gmail_token.json');

// In-memory state
let pool                = null;
let aiHelper            = null;
let oAuth2Client        = null;     // injected from gmail.js or built fresh
let pollTimer           = null;
let lastVerifyAt        = null;
let lastVerifyOk        = null;
let consecutiveFailures = 0;
let lastError           = null;
let running             = false;

// ----------------------------------------------------------------------------
// Fix recipes (Claude picks one based on error context)
// ----------------------------------------------------------------------------
const FIX_RECIPES = {
  reauth_required: {
    description: 'User must visit /api/gmail/auth to grant fresh consent',
    severity: 'high',
    auto_fixable: false
  },
  scope_drift: {
    description: 'Required scope missing from current grant - user must re-auth with new scope list',
    severity: 'high',
    auto_fixable: false
  },
  client_secret_rotated: {
    description: 'GOCSPX changed in Google Console - new value needed in .env',
    severity: 'critical',
    auto_fixable: false
  },
  refresh_token_revoked: {
    description: 'User revoked access from Google account - must re-grant',
    severity: 'critical',
    auto_fixable: false
  },
  network_blip: {
    description: 'Transient network issue - retry recommended',
    severity: 'low',
    auto_fixable: true
  }
};

// ----------------------------------------------------------------------------
// Get current token state (file or DB)
// ----------------------------------------------------------------------------
async function readTokenState() {
  let state = { source: null, refresh_token: null, access_token: null, expiry_date: null };

  // Try file first
  try {
    if (fs.existsSync(TOKEN_FILE_PATH)) {
      const tok = JSON.parse(fs.readFileSync(TOKEN_FILE_PATH, 'utf8'));
      state = { source: 'file', refresh_token: tok.refresh_token, access_token: tok.access_token, expiry_date: tok.expiry_date };
      return state;
    }
  } catch {}

  // Fallback to DB
  if (pool) {
    try {
      const r = await pool.query(
        `SELECT refresh_token, access_token, EXTRACT(EPOCH FROM expires_at) * 1000 AS expiry_date
         FROM gmail_auth ORDER BY id DESC LIMIT 1`
      );
      if (r.rows[0]) {
        state = { source: 'db', ...r.rows[0] };
      }
    } catch (err) {
      // gmail_auth schema might differ - try alternates silently
      try {
        const r2 = await pool.query(`SELECT refresh_token, access_token FROM gmail_auth ORDER BY id DESC LIMIT 1`);
        if (r2.rows[0]) state = { source: 'db', ...r2.rows[0] };
      } catch {}
    }
  }

  return state;
}

// ----------------------------------------------------------------------------
// Attempt OAuth refresh (the actual fix Emma performs silently)
// ----------------------------------------------------------------------------
async function attemptRefresh() {
  if (!oAuth2Client) {
    return { ok: false, error: 'oAuth2Client not injected - emma cannot refresh' };
  }

  const state = await readTokenState();
  if (!state.refresh_token) {
    return { ok: false, error: 'no_refresh_token', requires_reauth: true };
  }

  try {
    oAuth2Client.setCredentials({ refresh_token: state.refresh_token });
    const { credentials } = await oAuth2Client.refreshAccessToken();

    // Persist new tokens
    const merged = { ...credentials, refresh_token: credentials.refresh_token || state.refresh_token };
    try {
      fs.writeFileSync(TOKEN_FILE_PATH, JSON.stringify(merged, null, 2));
    } catch (e) {
      console.warn('[EMMA] Could not persist token file:', e.message);
    }

    return { ok: true, expiry_date: credentials.expiry_date, access_token_short: (credentials.access_token || '').slice(0, 20) + '...' };
  } catch (err) {
    return { ok: false, error: err.message, code: err.code, status: err.response?.status };
  }
}

// ----------------------------------------------------------------------------
// Build Claude prompt + get proposal
// ----------------------------------------------------------------------------
async function escalateToClaude(state, errors) {
  if (!aiHelper) {
    return { ok: false, error: 'aiHelper not available' };
  }

  const ctx = {
    consecutive_failures:  consecutiveFailures,
    last_error:            lastError,
    error_history:         errors.slice(-5),
    token_state: {
      has_refresh_token:   !!state.refresh_token,
      source:              state.source,
      expiry_date:         state.expiry_date,
      minutes_until_expiry: state.expiry_date ? Math.round((state.expiry_date - Date.now()) / 60000) : null
    },
    env: {
      client_id_prefix:     (process.env.GOOGLE_CLIENT_ID || '').slice(0, 20),
      has_client_secret:    !!process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri:         process.env.GMAIL_REDIRECT_URI || null
    },
    available_recipes: Object.keys(FIX_RECIPES)
  };

  const systemPrompt = `You are Emma, an OAuth medic AI agent. Diagnose Google OAuth token refresh failures.
Return ONLY valid JSON matching this schema:
{
  "diagnosis": "short technical description",
  "recipe": "one of: reauth_required | scope_drift | client_secret_rotated | refresh_token_revoked | network_blip",
  "confidence": 0.0-1.0,
  "human_action": "exact step the human should take",
  "auto_recoverable": boolean
}
NO markdown, NO preamble, JSON only.`;

  const userPrompt = `OAuth token refresh failed ${consecutiveFailures} times in a row. Diagnose:\n${JSON.stringify(ctx, null, 2)}`;

  try {
    const text = await aiHelper.ask(userPrompt, systemPrompt);
    const cleaned = text.replace(/```json|```/g, '').trim();
    const proposal = JSON.parse(cleaned);
    return { ok: true, proposal, raw: text };
  } catch (err) {
    return { ok: false, error: 'claude_parse_failed', detail: err.message };
  }
}

// ----------------------------------------------------------------------------
// Save proposal to ai_oauth_repair table
// ----------------------------------------------------------------------------
async function saveProposal(proposal, errors) {
  if (!pool) return null;
  try {
    const r = await pool.query(
      `INSERT INTO ai_oauth_repair
       (status, recipe, diagnosis, confidence, human_action, auto_recoverable, context, error_history, created_at)
       VALUES ('proposed', $1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id`,
      [
        proposal.recipe,
        proposal.diagnosis,
        proposal.confidence,
        proposal.human_action,
        proposal.auto_recoverable,
        JSON.stringify({ consecutive_failures: consecutiveFailures, last_error: lastError }),
        JSON.stringify(errors.slice(-10))
      ]
    );
    return r.rows[0]?.id;
  } catch (err) {
    console.error('[EMMA] Could not save proposal:', err.message);
    return null;
  }
}

// ----------------------------------------------------------------------------
// Main poll cycle
// ----------------------------------------------------------------------------
const errorHistory = [];

async function pollOnce() {
  lastVerifyAt = new Date().toISOString();

  const state = await readTokenState();

  // No refresh token = nothing to do until user does first-time auth
  if (!state.refresh_token) {
    lastVerifyOk = null;
    return { ok: true, skipped: true, reason: 'no_refresh_token_yet' };
  }

  // Token still has plenty of life
  const minutesLeft = state.expiry_date ? (state.expiry_date - Date.now()) / 60000 : 0;
  if (state.expiry_date && minutesLeft > 5) {
    lastVerifyOk = true;
    consecutiveFailures = 0;
    return { ok: true, skipped: true, reason: 'token_fresh', minutes_left: Math.round(minutesLeft) };
  }

  // Time to refresh
  const result = await attemptRefresh();

  if (result.ok) {
    lastVerifyOk = true;
    if (consecutiveFailures > 0) {
      // Was failing, now recovered
      try { global.brainEmit && global.brainEmit({ event: 'oauth.token.refreshed', source_module: 'EMMA', after_failures: consecutiveFailures }); } catch {}
      consecutiveFailures = 0;
    }
    return { ok: true, refreshed: true, expiry_date: result.expiry_date };
  }

  // Refresh failed
  lastVerifyOk = false;
  lastError = result.error;
  consecutiveFailures++;
  errorHistory.push({ at: lastVerifyAt, error: result.error, code: result.code, status: result.status });
  if (errorHistory.length > 50) errorHistory.shift();

  try { global.brainEmit && global.brainEmit({ event: 'oauth.refresh.failed', source_module: 'EMMA', consecutive_failures: consecutiveFailures, error: result.error }); } catch {}

  // Threshold hit -> call Claude
  if (consecutiveFailures === FAILURE_THRESHOLD) {
    console.warn(`[EMMA] ${FAILURE_THRESHOLD} consecutive refresh failures - escalating to Claude`);
    const claudeResult = await escalateToClaude(state, errorHistory);
    if (claudeResult.ok) {
      const proposalId = await saveProposal(claudeResult.proposal, errorHistory);
      console.warn(`[EMMA] Proposal saved id=${proposalId} recipe=${claudeResult.proposal.recipe}`);
      try { global.brainEmit && global.brainEmit({ event: 'oauth.proposal.created', source_module: 'EMMA', proposal_id: proposalId, recipe: claudeResult.proposal.recipe }); } catch {}
    } else {
      console.error('[EMMA] Claude escalation failed:', claudeResult.error);
    }
  }

  return { ok: false, error: result.error, consecutive_failures: consecutiveFailures };
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------
function init({ pool: p, aiHelper: ai, oAuth2Client: oc }) {
  pool         = p;
  aiHelper     = ai;
  oAuth2Client = oc;
}

function setOAuth2Client(oc) {
  oAuth2Client = oc;
}

function start() {
  if (running) return;
  running = true;
  console.log('[EMMA] OAuth medic ONLINE (poll every 60s)');
  pollOnce().catch(err => console.error('[EMMA] poll error:', err.message));
  pollTimer = setInterval(() => {
    pollOnce().catch(err => console.error('[EMMA] poll error:', err.message));
  }, POLL_INTERVAL_MS);
}

function stop() {
  running = false;
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

function getStatus() {
  return {
    ok: true,
    running,
    last_verify_at:        lastVerifyAt,
    last_verify_ok:        lastVerifyOk,
    consecutive_failures:  consecutiveFailures,
    last_error:            lastError,
    poll_interval_ms:      POLL_INTERVAL_MS,
    failure_threshold:     FAILURE_THRESHOLD,
    has_oauth_client:      !!oAuth2Client,
    has_pool:              !!pool,
    has_ai:                !!aiHelper,
    timestamp:             new Date().toISOString()
  };
}

async function getProposals(limit = 50) {
  if (!pool) return [];
  try {
    const r = await pool.query(
      `SELECT id, status, recipe, diagnosis, confidence, human_action, auto_recoverable, created_at, approved_at, rejected_at
       FROM ai_oauth_repair ORDER BY created_at DESC LIMIT $1`, [limit]
    );
    return r.rows;
  } catch { return []; }
}

async function getProposal(id) {
  if (!pool) return null;
  try {
    const r = await pool.query(`SELECT * FROM ai_oauth_repair WHERE id = $1`, [id]);
    return r.rows[0] || null;
  } catch { return null; }
}

async function approveProposal(id, approvedBy = 'saul') {
  if (!pool) return { ok: false, error: 'no_pool' };
  try {
    await pool.query(
      `UPDATE ai_oauth_repair SET status='approved', approved_at=NOW(), approved_by=$1 WHERE id=$2`,
      [approvedBy, id]
    );
    try { global.brainEmit && global.brainEmit({ event: 'oauth.proposal.approved', source_module: 'EMMA', proposal_id: id }); } catch {}
    return { ok: true };
  } catch (err) { return { ok: false, error: err.message }; }
}

async function rejectProposal(id, rejectedBy = 'saul', reason = null) {
  if (!pool) return { ok: false, error: 'no_pool' };
  try {
    await pool.query(
      `UPDATE ai_oauth_repair SET status='rejected', rejected_at=NOW(), rejected_by=$1, reject_reason=$2 WHERE id=$3`,
      [rejectedBy, reason, id]
    );
    return { ok: true };
  } catch (err) { return { ok: false, error: err.message }; }
}

async function forceRefresh() {
  return attemptRefresh();
}

async function testNow() {
  return pollOnce();
}

module.exports = {
  init,
  setOAuth2Client,
  start,
  stop,
  getStatus,
  getProposals,
  getProposal,
  approveProposal,
  rejectProposal,
  forceRefresh,
  testNow,
  pollOnce
};
