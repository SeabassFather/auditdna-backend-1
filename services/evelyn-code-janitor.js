// =============================================================================
// EVELYN - Code Janitor (Claude-powered, aggressive cleanup, auto-execute on approve)
// File: C:\AuditDNA\backend\services\evelyn-code-janitor.js
//
// Saul's settings:
//   - AGGRESSIVE flagging (any cleanup opportunity)
//   - AUTO-EXECUTE on approval (deletes file directly via fs.unlinkSync)
//   - NEVER pauses for active user (always runs)
//
// What Evelyn flags:
//   - Module-load warnings: '[WARN] X not loaded: Cannot find module' from stdout
//   - Orphaned root .js files (not required by server.js or any route/service/src)
//   - .bak/.BACKUP/_backup files older than 7 days (still flagged in aggressive mode)
//   - Empty .js files (< 100 bytes)
//   - Duplicate filenames (case-insensitive matches)
//   - Files with TODO/FIXME comments older than 30 days (file mtime)
//   - Stale migrations (.sql files referencing dropped tables)
//
// Cron: every 30 min (24/7, no pause)
//
// SAFETY (even with auto-execute):
//   - Cooldown: never deletes a file proposed less than 5 min ago
//   - Hard skip list: never touches db.js, server.js, scheduler.js, Brain.js,
//     anything in node_modules, anything in routes/services/src/migrations
//   - All deletions logged to ai_code_cleanup with full path
// =============================================================================

'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SCAN_INTERVAL_MS  = 30 * 60 * 1000;  // 30 min
const APPROVAL_COOLDOWN = 5  * 60 * 1000;  // 5 min minimum between proposal and execution
const ROOT              = 'C:/AuditDNA/backend';

// Hard never-touch list
const PROTECTED_FILES = new Set([
  'db.js', 'server.js', 'scheduler.js', 'Brain.js'
]);
const PROTECTED_DIRS = ['node_modules', 'routes', 'services', 'src', 'migrations', 'scripts', 'email-templates', '.git'];

// In-memory state
let pool         = null;
let aiHelper     = null;
let scanTimer    = null;
let lastScanAt   = null;
let lastScanFindings = 0;
let running      = false;

// ----------------------------------------------------------------------------
// Walk file system, return candidates
// ----------------------------------------------------------------------------
function walkBackend(dir, files = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return files; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel  = full.replace(/\\/g, '/').replace(ROOT + '/', '');
    if (PROTECTED_DIRS.some(p => rel.startsWith(p + '/') || rel === p)) continue;
    if (e.isDirectory()) {
      walkBackend(full, files);
    } else if (e.isFile()) {
      files.push(full);
    }
  }
  return files;
}

function isProtected(filePath) {
  const base = path.basename(filePath);
  if (PROTECTED_FILES.has(base)) return true;
  const rel = filePath.replace(/\\/g, '/').replace(ROOT + '/', '');
  return PROTECTED_DIRS.some(p => rel.startsWith(p + '/'));
}

// ----------------------------------------------------------------------------
// Detect orphans by scanning all server.js + routes/* + services/* + src/* requires
// ----------------------------------------------------------------------------
function buildReferenceMap() {
  const referenced = new Set();
  const dirs = ['', 'routes', 'services', 'src', 'src/routes', 'scripts'];
  for (const d of dirs) {
    const dirFull = d ? path.join(ROOT, d) : ROOT;
    if (!fs.existsSync(dirFull)) continue;
    let entries;
    try { entries = fs.readdirSync(dirFull); } catch { continue; }
    for (const f of entries) {
      const full = path.join(dirFull, f);
      try {
        const st = fs.statSync(full);
        if (!st.isFile() || !f.endsWith('.js')) continue;
        const content = fs.readFileSync(full, 'utf8');
        // Match require('./foo') / require('../foo') / require('./routes/foo')
        const matches = content.matchAll(/require\(['"]([^'"]+)['"]\)/g);
        for (const m of matches) {
          const target = m[1];
          if (target.startsWith('.')) {
            referenced.add(path.basename(target).replace(/\.js$/, ''));
          }
        }
      } catch {}
    }
  }
  return referenced;
}

// ----------------------------------------------------------------------------
// Scan for cleanup candidates
// ----------------------------------------------------------------------------
function scan() {
  const findings = [];
  const referenced = buildReferenceMap();
  const allFiles = walkBackend(ROOT);

  const baseNameMap = new Map(); // for duplicate detection

  for (const f of allFiles) {
    if (isProtected(f)) continue;
    let st;
    try { st = fs.statSync(f); } catch { continue; }

    const base = path.basename(f);
    const baseLower = base.toLowerCase();
    const ext = path.extname(f).toLowerCase();
    const ageMs = Date.now() - st.mtime.getTime();
    const ageDays = ageMs / (24 * 60 * 60 * 1000);

    // 1. .bak / BACKUP / _backup files (any age in aggressive mode)
    if (/\.bak/i.test(base) || /BACKUP/.test(base) || /_backup_/.test(base)) {
      findings.push({
        kind: 'stale_backup',
        path: f,
        size: st.size,
        age_days: Math.round(ageDays),
        reason: 'Backup file - git is rollback'
      });
      continue;
    }

    // 2. Empty .js files
    if (ext === '.js' && st.size < 100) {
      findings.push({
        kind: 'empty_file',
        path: f,
        size: st.size,
        age_days: Math.round(ageDays),
        reason: `Empty/stub file (${st.size} bytes)`
      });
      continue;
    }

    // 3. Orphan .js at backend root (not in protected dirs, not referenced)
    if (ext === '.js') {
      const rel = f.replace(/\\/g, '/').replace(ROOT + '/', '');
      const isRootLevel = !rel.includes('/');
      const baseName = base.replace(/\.js$/, '');
      if (isRootLevel && !referenced.has(baseName) && !PROTECTED_FILES.has(base)) {
        findings.push({
          kind: 'orphan_root_js',
          path: f,
          size: st.size,
          age_days: Math.round(ageDays),
          reason: `Root .js with no require() references anywhere in codebase`
        });
        continue;
      }
    }

    // 4. Duplicate filename detection (case-insensitive)
    if (!baseNameMap.has(baseLower)) {
      baseNameMap.set(baseLower, [f]);
    } else {
      baseNameMap.get(baseLower).push(f);
    }

    // 5. Old TODO/FIXME files (mtime > 30 days, file contains TODO)
    if (ext === '.js' && ageDays > 30) {
      try {
        const content = fs.readFileSync(f, 'utf8');
        if (/\b(TODO|FIXME|XXX|HACK)\b/.test(content)) {
          findings.push({
            kind: 'stale_todo',
            path: f,
            size: st.size,
            age_days: Math.round(ageDays),
            reason: 'Contains TODO/FIXME, not modified in 30+ days'
          });
        }
      } catch {}
    }
  }

  // Process duplicates
  for (const [name, paths] of baseNameMap.entries()) {
    if (paths.length > 1) {
      // Keep the largest, flag the rest
      paths.sort((a, b) => fs.statSync(b).size - fs.statSync(a).size);
      for (let i = 1; i < paths.length; i++) {
        findings.push({
          kind: 'duplicate_filename',
          path: paths[i],
          size: fs.statSync(paths[i]).size,
          age_days: Math.round((Date.now() - fs.statSync(paths[i]).mtime.getTime()) / (24 * 60 * 60 * 1000)),
          reason: `Case-insensitive duplicate of ${paths[0]}`
        });
      }
    }
  }

  return findings;
}

// ----------------------------------------------------------------------------
// Build Claude prompt for batch validation of findings
// ----------------------------------------------------------------------------
async function validateWithClaude(findings) {
  if (!aiHelper || findings.length === 0) return [];

  // Cap at 20 findings per call to avoid overwhelming Claude
  const batch = findings.slice(0, 8);

  const systemPrompt = `You are Evelyn, a code janitor AI agent. You validate cleanup proposals before they're written to a database for human approval.
Return ONLY a JSON array (no markdown, no preamble) where each entry matches:
{
  "path": "/absolute/path/of/the/file",
  "verdict": "delete | keep | review",
  "confidence": 0.0-1.0,
  "reasoning": "one short sentence"
}
Be aggressive - if a file is clearly orphaned, .bak, empty, or duplicate, return verdict='delete'. Only return 'keep' or 'review' if there's a real reason to preserve.`;

  const userPrompt = `Validate these ${batch.length} cleanup candidates:\n${JSON.stringify(batch, null, 2)}`;

  try {
    const __ant = require('@anthropic-ai/sdk'); const __ac = new __ant.Anthropic({apiKey: process.env.ANTHROPIC_API_KEY}); const __r = await __ac.messages.create({model: process.env.ANTHROPIC_MODEL||'claude-sonnet-4-6',max_tokens:1024,system:systemPrompt,messages:[{role:'user',content:userPrompt}]}); const text = __r.content[0]?.text||'';
    const cleaned = text.replace(/```json|```/g, '').trim();
    const verdicts = JSON.parse(cleaned);
    return Array.isArray(verdicts) ? verdicts : [];
  } catch (err) {
    console.error('[EVELYN] Claude validation failed:', err.message);
    return [];
  }
}

// ----------------------------------------------------------------------------
// Save proposal
// ----------------------------------------------------------------------------
async function saveProposal(finding, verdict) {
  if (!pool) return null;
  try {
    const r = await pool.query(
      `INSERT INTO ai_code_cleanup
       (status, kind, file_path, file_size, age_days, reason, claude_verdict, claude_confidence, claude_reasoning, created_at)
       VALUES ('proposed', $1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (file_path) WHERE status = 'proposed' DO UPDATE SET claude_verdict=EXCLUDED.claude_verdict, claude_confidence=EXCLUDED.claude_confidence, claude_reasoning=EXCLUDED.claude_reasoning
       RETURNING id`,
      [
        finding.kind,
        finding.path,
        finding.size,
        finding.age_days,
        finding.reason,
        verdict?.verdict || 'review',
        verdict?.confidence || null,
        verdict?.reasoning || null
      ]
    );
    return r.rows[0]?.id || null;
  } catch (err) {
    console.error('[EVELYN] Could not save proposal:', err.message);
    return null;
  }
}

// ----------------------------------------------------------------------------
// Scan + propose cycle
// ----------------------------------------------------------------------------
async function runScan() {
  lastScanAt = new Date().toISOString();
  console.log('[EVELYN] Starting scan...');

  const findings = scan();
  lastScanFindings = findings.length;

  if (findings.length === 0) {
    console.log('[EVELYN] No cleanup candidates found');
    return { ok: true, findings: 0 };
  }

  console.log(`[EVELYN] Found ${findings.length} candidates - asking Claude to validate...`);

  const verdicts = await validateWithClaude(findings);
  const verdictMap = new Map(verdicts.map(v => [v.path, v]));

  let saved = 0;
  for (const finding of findings) {
    const verdict = verdictMap.get(finding.path);
    const id = await saveProposal(finding, verdict);
    if (id) saved++;
  }

  console.log(`[EVELYN] Saved ${saved} proposals`);
  try { global.brainEmit && global.brainEmit({ event: 'cleanup.scan.completed', source_module: 'EVELYN', candidates: findings.length, saved }); } catch {}

  return { ok: true, findings: findings.length, proposals_saved: saved };
}

// ----------------------------------------------------------------------------
// Auto-execute approved deletion (Saul chose auto-execute = true)
// ----------------------------------------------------------------------------
async function executeDeletion(proposalId) {
  if (!pool) return { ok: false, error: 'no_pool' };

  try {
    // Re-fetch proposal to verify status + cooldown
    const r = await pool.query(`SELECT * FROM ai_code_cleanup WHERE id = $1`, [proposalId]);
    const p = r.rows[0];
    if (!p) return { ok: false, error: 'proposal_not_found' };
    if (p.status !== 'approved') return { ok: false, error: 'not_approved', current_status: p.status };

    // Cooldown check - never delete file proposed < 5 min ago
    const ageMs = Date.now() - new Date(p.created_at).getTime();
    if (ageMs < APPROVAL_COOLDOWN) {
      return { ok: false, error: 'cooldown_active', minutes_until_executable: Math.ceil((APPROVAL_COOLDOWN - ageMs) / 60000) };
    }

    // Re-verify file still meets safety criteria
    if (isProtected(p.file_path)) {
      await pool.query(
        `UPDATE ai_code_cleanup SET status='blocked', execution_error='protected_file' WHERE id=$1`,
        [proposalId]
      );
      return { ok: false, error: 'file_now_protected' };
    }

    // Verify file still exists
    if (!fs.existsSync(p.file_path)) {
      await pool.query(
        `UPDATE ai_code_cleanup SET status='executed', executed_at=NOW(), execution_error='file_already_gone' WHERE id=$1`,
        [proposalId]
      );
      return { ok: true, already_gone: true };
    }

    // Execute deletion
    fs.unlinkSync(p.file_path);

    await pool.query(
      `UPDATE ai_code_cleanup SET status='executed', executed_at=NOW() WHERE id=$1`,
      [proposalId]
    );

    try { global.brainEmit && global.brainEmit({ event: 'cleanup.executed', source_module: 'EVELYN', proposal_id: proposalId, file_path: p.file_path }); } catch {}

    return { ok: true, deleted: p.file_path };
  } catch (err) {
    try {
      await pool.query(
        `UPDATE ai_code_cleanup SET status='failed', execution_error=$1 WHERE id=$2`,
        [err.message, proposalId]
      );
    } catch {}
    return { ok: false, error: err.message };
  }
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------
function init({ pool: p, aiHelper: ai }) {
  pool     = p;
  aiHelper = ai;
}

function start() {
  if (running) return;
  running = true;
  console.log('[EVELYN] Code janitor ONLINE (scan every 30 min, AGGRESSIVE mode, auto-execute on approve)');
  scanTimer = setInterval(() => {
    runScan().catch(err => console.error('[EVELYN] scan error:', err.message));
  }, SCAN_INTERVAL_MS);
  // First scan after 60s to let server settle
  setTimeout(() => runScan().catch(err => console.error('[EVELYN] initial scan error:', err.message)), 60 * 1000);
}

function stop() {
  running = false;
  if (scanTimer) { clearInterval(scanTimer); scanTimer = null; }
}

function getStatus() {
  return {
    ok: true,
    running,
    last_scan_at:        lastScanAt,
    last_scan_findings:  lastScanFindings,
    scan_interval_ms:    SCAN_INTERVAL_MS,
    approval_cooldown_ms: APPROVAL_COOLDOWN,
    mode: 'aggressive',
    auto_execute: true,
    pause_when_user_active: false,
    has_pool:            !!pool,
    has_ai:              !!aiHelper,
    timestamp:           new Date().toISOString()
  };
}

async function getProposals(filter = {}, limit = 100) {
  if (!pool) return [];
  try {
    let where = [];
    let params = [];
    if (filter.status) { params.push(filter.status); where.push(`status = $${params.length}`); }
    if (filter.kind)   { params.push(filter.kind);   where.push(`kind = $${params.length}`);   }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    params.push(limit);
    const r = await pool.query(
      `SELECT id, status, kind, file_path, file_size, age_days, reason, claude_verdict, claude_confidence, created_at, approved_at, executed_at
       FROM ai_code_cleanup ${whereSql} ORDER BY created_at DESC LIMIT $${params.length}`,
      params
    );
    return r.rows;
  } catch { return []; }
}

async function getProposal(id) {
  if (!pool) return null;
  try {
    const r = await pool.query(`SELECT * FROM ai_code_cleanup WHERE id = $1`, [id]);
    return r.rows[0] || null;
  } catch { return null; }
}

async function approveProposal(id, approvedBy = 'saul') {
  if (!pool) return { ok: false, error: 'no_pool' };
  try {
    await pool.query(
      `UPDATE ai_code_cleanup SET status='approved', approved_at=NOW(), approved_by=$1 WHERE id=$2 AND status='proposed'`,
      [approvedBy, id]
    );
    try { global.brainEmit && global.brainEmit({ event: 'cleanup.approved', source_module: 'EVELYN', proposal_id: id }); } catch {}

    // Auto-execute (per Saul's settings)
    const result = await executeDeletion(id);
    return { ok: true, approved: true, execution: result };
  } catch (err) { return { ok: false, error: err.message }; }
}

async function rejectProposal(id, rejectedBy = 'saul', reason = null) {
  if (!pool) return { ok: false, error: 'no_pool' };
  try {
    await pool.query(
      `UPDATE ai_code_cleanup SET status='rejected', rejected_at=NOW(), rejected_by=$1, reject_reason=$2 WHERE id=$3`,
      [rejectedBy, reason, id]
    );
    return { ok: true };
  } catch (err) { return { ok: false, error: err.message }; }
}

async function scanNow() {
  return runScan();
}

async function bulkApprove(filter = {}) {
  if (!pool) return { ok: false, error: 'no_pool' };
  try {
    const proposals = await getProposals({ status: 'proposed', ...filter }, 1000);
    let approved = 0;
    let executed = 0;
    for (const p of proposals) {
      const result = await approveProposal(p.id, 'saul-bulk');
      if (result.ok) {
        approved++;
        if (result.execution?.ok && result.execution?.deleted) executed++;
      }
    }
    return { ok: true, total: proposals.length, approved, executed };
  } catch (err) { return { ok: false, error: err.message }; }
}

module.exports = {
  init,
  start,
  stop,
  getStatus,
  getProposals,
  getProposal,
  approveProposal,
  rejectProposal,
  scanNow,
  bulkApprove,
  executeDeletion
};
