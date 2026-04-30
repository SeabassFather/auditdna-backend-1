// =============================================================================
// DIEGO SI -- COMPLIANCE SENTINEL CRON SERVICE
// Save to: C:\AuditDNA\backend\services\diego-si.js
// =============================================================================
// Diego runs as a cron job every 60 seconds, scanning new onboarding_sessions
// and buyer_inquiries that haven't been reviewed yet. Runs deterministic
// compliance checks. Pushes flags to agent_flags + brain stream.
//
// Wire in server.js (after route mounts):
//   const diego = require('./services/diego-si');
//   diego.startCron();
// =============================================================================

const Anthropic = require('@anthropic-ai/sdk');
const { DIEGO_SYSTEM, MODELS, TOKEN_CAPS } = require('./agent-prompts');

const getDb = () => global.db;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const FLAG_SEVERITY_WEIGHTS = { info: 0, warning: 5, critical: 20, blocking: 50 };

// -----------------------------------------------------------------------------
// Deterministic compliance checks (SI core -- no AI for these)
// -----------------------------------------------------------------------------

async function checkDuplicateRegistration(db, onboarding) {
  const flags = [];
  const checks = [
    { col: 'paca_number', label: 'PACA #' },
    { col: 'rfc',         label: 'RFC' },
    { col: 'ein',         label: 'EIN' },
    { col: 'applicant_email', label: 'email' },
  ];
  for (const c of checks) {
    const val = onboarding[c.col];
    if (!val) continue;
    // Check existing onboarding_sessions
    const r = await db.query(`
      SELECT id FROM onboarding_sessions
      WHERE ${c.col} = $1 AND id <> $2 AND status NOT IN ('rejected', 'abandoned')
      LIMIT 1
    `, [val, onboarding.id]);
    if (r.rows.length) {
      flags.push({
        flag_type: 'DUPLICATE_REGISTRATION',
        severity: 'warning',
        detail: `Duplicate ${c.label} matches existing onboarding ${r.rows[0].id}`,
        evidence: { matched_id: r.rows[0].id, field: c.col, value: val },
      });
    }
    // Check live growers table
    try {
      const rg = await db.query(`SELECT id FROM growers WHERE ${c.col} = $1 LIMIT 1`, [val]);
      if (rg.rows.length) {
        flags.push({
          flag_type: 'DUPLICATE_REGISTRATION',
          severity: 'critical',
          detail: `${c.label} already registered as live grower ${rg.rows[0].id}`,
          evidence: { matched_grower_id: rg.rows[0].id, field: c.col, value: val },
        });
      }
    } catch {}
  }
  return flags;
}

async function checkInvalidPaca(db, onboarding) {
  const flags = [];
  const paca = onboarding.paca_number;
  if (!paca) return flags;
  const digits = String(paca).replace(/\D/g, '');
  if (digits.length < 4 || digits.length > 7) {
    flags.push({
      flag_type: 'INVALID_PACA',
      severity: 'critical',
      detail: `PACA number "${paca}" has invalid length (${digits.length} digits, expected 4-7)`,
      evidence: { provided: paca, normalized: digits },
    });
  }
  // TODO: hit USDA AMS API to verify active status
  return flags;
}

async function checkExpiredCerts(db, onboarding) {
  const flags = [];
  const certs = onboarding.certifications || [];
  const now = new Date();
  const soon = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
  for (const c of certs) {
    if (!c.expires_at) continue;
    const exp = new Date(c.expires_at);
    if (exp < now) {
      flags.push({
        flag_type: 'EXPIRED_CERT',
        severity: 'critical',
        detail: `Certification ${c.type} expired on ${c.expires_at}`,
        evidence: { cert_type: c.type, expires_at: c.expires_at },
      });
    } else if (exp < soon) {
      flags.push({
        flag_type: 'EXPIRED_CERT',
        severity: 'warning',
        detail: `Certification ${c.type} expires within 30 days (${c.expires_at})`,
        evidence: { cert_type: c.type, expires_at: c.expires_at },
      });
    }
  }
  return flags;
}

async function checkGeographicConsistency(db, onboarding) {
  const flags = [];
  // Map of impossible commodity x state pairs (very rough sanity check)
  const stateRegion = (onboarding.state_region || '').toUpperCase();
  const country = (onboarding.country || '').toUpperCase();
  const commodities = onboarding.commodities || [];
  const tropicalOnly = ['avocado', 'aguacate', 'mango', 'papaya', 'coconut', 'pineapple'];
  const coldStates = ['ALASKA', 'AK', 'NORTH DAKOTA', 'ND', 'MAINE', 'ME', 'VERMONT', 'VT'];
  for (const c of commodities) {
    const name = (typeof c === 'string' ? c : c.name || c.id || '').toLowerCase();
    if (tropicalOnly.some(t => name.includes(t)) && coldStates.includes(stateRegion) && country === 'USA') {
      flags.push({
        flag_type: 'GEOGRAPHIC_INCONSISTENCY',
        severity: 'warning',
        detail: `Tropical commodity "${name}" claimed in cold-climate state ${stateRegion}`,
        evidence: { commodity: name, state: stateRegion, country },
      });
    }
  }
  return flags;
}

async function checkRapidResubmit(db, onboarding) {
  const flags = [];
  const email = onboarding.applicant_email;
  if (!email) return flags;
  const r = await db.query(`
    SELECT id, created_at FROM onboarding_sessions
    WHERE applicant_email = $1 AND status = 'rejected' AND id <> $2
    AND created_at > NOW() - INTERVAL '24 hours'
    LIMIT 1
  `, [email, onboarding.id]);
  if (r.rows.length) {
    flags.push({
      flag_type: 'RAPID_RESUBMIT',
      severity: 'warning',
      detail: `Same email submitted within 24h after recent rejection (${r.rows[0].id})`,
      evidence: { previous_rejected_id: r.rows[0].id, prev_at: r.rows[0].created_at },
    });
  }
  return flags;
}

async function checkMissingRequired(db, onboarding) {
  const flags = [];
  const required = ['applicant_name', 'applicant_email', 'state_region'];
  for (const f of required) {
    if (!onboarding[f]) {
      flags.push({
        flag_type: 'MISSING_REQUIRED',
        severity: 'warning',
        detail: `Required field "${f}" missing`,
        evidence: { field: f },
      });
    }
  }
  return flags;
}

async function checkIncompleteBanking(db, onboarding) {
  const flags = [];
  const data = onboarding.collected_data || {};
  if (data.banking_completed && !data.ein && !data.rfc) {
    flags.push({
      flag_type: 'INCOMPLETE_BANKING',
      severity: 'warning',
      detail: 'Banking completed but EIN/RFC missing -- factor program ineligible',
      evidence: {},
    });
  }
  return flags;
}

// -----------------------------------------------------------------------------
// Main review pass
// -----------------------------------------------------------------------------
async function reviewOnboarding(db, onboarding) {
  const allChecks = await Promise.all([
    checkDuplicateRegistration(db, onboarding),
    checkInvalidPaca(db, onboarding),
    checkExpiredCerts(db, onboarding),
    checkGeographicConsistency(db, onboarding),
    checkRapidResubmit(db, onboarding),
    checkMissingRequired(db, onboarding),
    checkIncompleteBanking(db, onboarding),
  ]);
  const flags = allChecks.flat();

  // Compute compliance score
  let score = 100;
  for (const f of flags) score -= (FLAG_SEVERITY_WEIGHTS[f.severity] || 0);
  score = Math.max(0, score);

  // Recommendation
  let recommendation = 'approve';
  const hasBlocking = flags.some(f => f.severity === 'blocking');
  const hasCritical = flags.some(f => f.severity === 'critical');
  const hasWarning  = flags.some(f => f.severity === 'warning');
  if (hasBlocking)      recommendation = 'reject';
  else if (hasCritical) recommendation = 'manual_review';
  else if (hasWarning)  recommendation = 'needs_info';

  return { flags, score, recommendation };
}

// -----------------------------------------------------------------------------
// Persist Diego output
// -----------------------------------------------------------------------------
async function persistDiegoOutput(db, onboarding, result) {
  // Insert flags
  for (const f of result.flags) {
    await db.query(`
      INSERT INTO agent_flags (onboarding_id, flag_type, severity, detail, evidence, raised_by, raised_at)
      VALUES ($1, $2, $3, $4, $5, 'diego', NOW())
    `, [onboarding.id, f.flag_type, f.severity, f.detail, JSON.stringify(f.evidence || {})]);
  }
  // Update onboarding with score + flags + checked_at
  await db.query(`
    UPDATE onboarding_sessions
    SET diego_score = $1, diego_flags = $2, diego_checked_at = NOW(), status = $3, updated_at = NOW()
    WHERE id = $4
  `, [
    result.score,
    JSON.stringify(result.flags),
    result.recommendation === 'approve' ? 'pending' : (result.recommendation === 'needs_info' ? 'needs_info' : 'reviewing'),
    onboarding.id,
  ]);
  // Brain ping
  pingBrain('COMPLIANCE_FLAG_RAISED', {
    onboarding_id: onboarding.id,
    score: result.score,
    flag_count: result.flags.length,
    recommendation: result.recommendation,
    severities: result.flags.map(f => f.severity),
  });
  if (result.flags.length === 0) {
    pingBrain('COMPLIANCE_GREEN_LIGHT', { onboarding_id: onboarding.id });
  }
}

function pingBrain(type, payload) {
  try {
    const fetchFn = global.fetch || require('node-fetch');
    const apiBase = process.env.RAILWAY_URL || process.env.SELF_URL || 'http://localhost:5050';
    fetchFn(apiBase + '/api/brain/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [{ type, payload, timestamp: Date.now() }] }),
    }).catch(() => {});
  } catch {}
}

// -----------------------------------------------------------------------------
// CRON LOOP
// -----------------------------------------------------------------------------
let cronTimer = null;
let isRunning = false;

async function tick() {
  if (isRunning) return;
  isRunning = true;
  try {
    const db = getDb();
    if (!db) { isRunning = false; return; }
    // Find onboarding sessions that need review
    const r = await db.query(`
      SELECT * FROM onboarding_sessions
      WHERE diego_checked_at IS NULL
        AND status IN ('pending', 'reviewing')
      ORDER BY created_at ASC
      LIMIT 10
    `);
    for (const onb of r.rows) {
      try {
        console.log('[diego] reviewing onboarding ' + onb.id);
        const result = await reviewOnboarding(db, onb);
        await persistDiegoOutput(db, onb, result);
        console.log('[diego] ' + onb.id + ' score=' + result.score + ' flags=' + result.flags.length + ' rec=' + result.recommendation);
      } catch (e) {
        console.error('[diego] error reviewing ' + onb.id + ':', e.message);
      }
    }
  } catch (e) {
    console.error('[diego] tick error:', e.message);
  }
  isRunning = false;
}

function startCron(intervalMs = 60000) {
  if (cronTimer) return;
  console.log('[diego] SI compliance watchdog starting (every ' + (intervalMs / 1000) + 's)');
  cronTimer = setInterval(tick, intervalMs);
  setTimeout(tick, 5000); // first run after 5s
}

function stopCron() {
  if (cronTimer) clearInterval(cronTimer);
  cronTimer = null;
}

module.exports = {
  startCron, stopCron, tick,
  reviewOnboarding, persistDiegoOutput,  // exported for direct admin re-run
};
