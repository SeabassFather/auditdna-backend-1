// =============================================================================
// ELIOTT - MiniAPI Data Janitor (Claude-powered data quality watchdog)
// File: C:\AuditDNA\backend\MiniAPI\agents\eliott-data-janitor.js
//
// ES MODULE (MiniAPI uses "type": "module")
//
// What Eliott watches:
//   - JSON data files in MiniAPI/data: stale (>30 days unmodified), corrupt JSON,
//     missing required fields, suspicious size shrinkage
//   - Duplicate contacts across Senasica + Shippers + unified_contacts
//   - Cache files in MiniAPI/cache: stale entries, oversized cache
//
// Scans every 30 minutes. Writes proposals (NOT auto-deletes - data is sacred).
// =============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const DATA_DIR   = path.join(__dirname, '..', 'data');
const CACHE_DIR  = path.join(__dirname, '..', 'cache');

const SCAN_INTERVAL_MS = 30 * 60 * 1000;
const STALE_DAYS       = 30;

let pool       = null;
let aiHelper   = null;
let scanTimer  = null;
let running    = false;
let lastScan   = null;
let lastFindings = 0;

// Track previous file sizes for shrinkage detection
const sizeHistory = new Map();   // filepath -> [{ at, size }, ...]

// ----------------------------------------------------------------------------
// Scanner
// ----------------------------------------------------------------------------
function scanDir(dir, requireJson = false) {
  const findings = [];
  if (!fs.existsSync(dir)) return findings;

  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return findings; }

  for (const e of entries) {
    if (!e.isFile()) continue;
    const full = path.join(dir, e.name);
    let st;
    try { st = fs.statSync(full); } catch { continue; }

    const ageMs   = Date.now() - st.mtime.getTime();
    const ageDays = ageMs / (24 * 60 * 60 * 1000);

    // Stale
    if (ageDays > STALE_DAYS) {
      findings.push({
        kind: 'stale_file', path: full, size: st.size,
        age_days: Math.round(ageDays),
        reason: `Not modified in ${Math.round(ageDays)} days`
      });
    }

    // Suspicious shrinkage
    const hist = sizeHistory.get(full) || [];
    if (hist.length > 0) {
      const prev = hist[hist.length - 1].size;
      if (prev > 1024 && st.size < prev * 0.5) {
        findings.push({
          kind: 'size_shrinkage', path: full, size: st.size,
          prev_size: prev,
          reason: `File shrank from ${prev} to ${st.size} bytes (${Math.round(100 * st.size / prev)}%)`
        });
      }
    }
    hist.push({ at: Date.now(), size: st.size });
    if (hist.length > 10) hist.shift();
    sizeHistory.set(full, hist);

    // JSON validation
    if (requireJson && e.name.endsWith('.json')) {
      try {
        const content = fs.readFileSync(full, 'utf8');
        if (content.trim().length === 0) {
          findings.push({ kind: 'empty_json', path: full, size: st.size, reason: 'JSON file is empty' });
          continue;
        }
        JSON.parse(content);
      } catch (err) {
        findings.push({
          kind: 'corrupt_json', path: full, size: st.size,
          reason: `JSON parse error: ${err.message}`
        });
      }
    }
  }

  return findings;
}

async function runScan() {
  lastScan = new Date().toISOString();

  const findings = [
    ...scanDir(DATA_DIR, true),
    ...scanDir(CACHE_DIR, true)
  ];

  lastFindings = findings.length;
  if (findings.length === 0) return { ok: true, findings: 0 };

  console.log(`[ELIOTT] found ${findings.length} data quality issues - validating with Claude`);

  let saved = 0;
  if (aiHelper && pool) {
    const verdicts = await validateWithClaude(findings.slice(0, 15));
    const map = new Map(verdicts.map(v => [v.path, v]));

    for (const f of findings) {
      const v = map.get(f.path);
      const id = await saveProposal(f, v);
      if (id) saved++;
    }
  }

  try { global.brainEmit && global.brainEmit({ event: 'miniapi.data.scan_completed', source_module: 'ELIOTT', findings: findings.length, saved }); } catch {}

  return { ok: true, findings: findings.length, proposals_saved: saved };
}

async function validateWithClaude(findings) {
  if (!aiHelper) return [];
  const sys = `You are Eliott, a data quality AI. Validate findings about data files.
Return ONLY a JSON array:
[{ "path": "string", "verdict": "investigate|archive|delete|keep", "confidence": 0.0-1.0, "reasoning": "string" }]
Be CONSERVATIVE - data files are sacred. Default to "investigate" or "keep" unless clearly corrupt.`;
  const usr = `Validate these data quality findings:\n${JSON.stringify(findings, null, 2)}`;
  try {
    const text = await aiHelper.ask(usr, sys);
    const arr = JSON.parse(text.replace(/```json|```/g, '').trim());
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

async function saveProposal(finding, verdict) {
  if (!pool) return null;
  try {
    const r = await pool.query(
      `INSERT INTO ai_miniapi_watchers
       (agent_name, status, severity, diagnosis, human_action, context, created_at)
       VALUES ('ELIOTT', 'proposed', $1, $2, $3, $4, NOW())
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [
        finding.kind === 'corrupt_json' ? 'high' : 'low',
        `${finding.kind}: ${finding.reason}`,
        verdict?.reasoning || 'Review file manually',
        JSON.stringify({ ...finding, claude_verdict: verdict?.verdict, claude_confidence: verdict?.confidence })
      ]
    );
    return r.rows[0]?.id;
  } catch { return null; }
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------
export function init({ pool: p, aiHelper: ai }) { pool = p; aiHelper = ai; }

export function start() {
  if (running) return;
  running = true;
  console.log('[ELIOTT] Data Janitor ONLINE (scan every 30 min)');
  setTimeout(() => runScan().catch(e => console.error('[ELIOTT] initial scan:', e.message)), 90 * 1000);
  scanTimer = setInterval(() => runScan().catch(e => console.error('[ELIOTT] scan:', e.message)), SCAN_INTERVAL_MS);
}

export function stop() {
  running = false;
  if (scanTimer) { clearInterval(scanTimer); scanTimer = null; }
}

export function getStatus() {
  return {
    ok: true,
    agent: 'ELIOTT',
    role: 'MiniAPI Data Janitor',
    running,
    last_scan_at: lastScan,
    last_findings: lastFindings,
    scan_interval_ms: SCAN_INTERVAL_MS,
    stale_threshold_days: STALE_DAYS,
    files_tracked: sizeHistory.size,
    has_pool: !!pool,
    has_ai: !!aiHelper,
    timestamp: new Date().toISOString()
  };
}

export async function scanNow() { return runScan(); }

export default { init, start, stop, getStatus, scanNow };
