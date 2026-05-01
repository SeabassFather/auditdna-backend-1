// =============================================================================
// MASS GLOBAL.DB REFACTOR - 2026-05-01
// File: C:\AuditDNA\backend\.global-db-refactor.js
//
// Replaces every `pool` reference with `pool` (from require('../db')).
//
// SAFETY:
//   - Skips: node_modules, .bak/.BACKUP/_backup files, uploads/, db.js itself,
//     server.js itself, this script
//   - Per-file: backs up to <file>.bak-globaldb-<stamp> BEFORE writing
//   - Per-file: runs node --check after write; restores backup on syntax fail
//   - Per-file: refuses to write if pool still present after replace
//   - Auto-injects `const pool = require('../db');` at top if missing
//   - Idempotent (won't double-patch if `pool` is already gone)
// =============================================================================

const fs   = require('fs');
const path = require('path');

const ROOT = 'C:/AuditDNA/backend';
const STAMP = new Date().toISOString().replace(/[:.]/g, '').slice(0, 14);
const { execSync } = require('child_process');

const SKIP_PATTERNS = [
  /node_modules/,
  /\.bak/i,
  /BACKUP/,
  /_backup_/,
  /legacy_backup/i,
  /[\\\/]uploads[\\\/]/i,
  /[\\\/]db\.js$/,
  /[\\\/]server\.js$/,
  /\.global-db-refactor\.js$/,
  /[\\\/]r\.js$/,
];

function walkDir(dir, files = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return files; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (SKIP_PATTERNS.some(p => p.test(full.replace(/\\/g, '/')))) continue;
    if (e.isDirectory()) walkDir(full, files);
    else if (e.isFile() && full.endsWith('.js')) files.push(full);
  }
  return files;
}

function relativeDbPath(filePath) {
  const fileDir = path.dirname(filePath);
  let rel = path.relative(fileDir, path.join(ROOT, 'db.js'));
  rel = rel.replace(/\\/g, '/').replace(/\.js$/, '');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

function hasPoolImport(content) {
  // Check for any of these patterns:
  //   const pool = require('./db' or '../db' etc)
  //   const { pool } = require('./db')
  //   let pool = require('./db')
  return /(?:const|let|var)\s+(?:pool|\{[^}]*\bpool\b[^}]*\})\s*=\s*require\(['"][^'"]*?\bdb(?:\/connection)?['"]\)/.test(content);
}

function injectPoolImport(content, dbRelPath) {
  // Find the last require() at the top of the file, insert after it
  const lines = content.split(/\r?\n/);
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  let lastRequireIdx = -1;
  for (let i = 0; i < Math.min(lines.length, 50); i++) {
    if (/^\s*(?:const|let|var)\s+.*=\s*require\(/.test(lines[i])) lastRequireIdx = i;
  }
  const insertion = `const pool = require('${dbRelPath}');`;
  if (lastRequireIdx >= 0) {
    lines.splice(lastRequireIdx + 1, 0, insertion);
  } else {
    // Insert at the top after any 'use strict' / shebang
    let insertAt = 0;
    if (lines[0] && /^#!|use strict/.test(lines[0])) insertAt = 1;
    lines.splice(insertAt, 0, insertion);
  }
  return lines.join(eol);
}

function refactorFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');

  if (!/\bglobal\.db\b/.test(original)) {
    return { path: filePath, status: 'no_global_db', changed: false };
  }

  let updated = original;

  // Replace `pool` with `pool` everywhere it's a complete identifier match
  // Word boundary (\b) handles property access like pool.query
  updated = updated.replace(/\bglobal\.db\b/g, 'pool');

  // If there's any `pool` still present (shouldn't be, but defensive), bail
  if (/\bglobal\.db\b/.test(updated)) {
    return { path: filePath, status: 'incomplete_replace', changed: false };
  }

  // Check if we now have `pool` references but no pool import — inject it
  if (!hasPoolImport(updated)) {
    const dbRelPath = relativeDbPath(filePath);
    updated = injectPoolImport(updated, dbRelPath);
  }

  if (updated === original) {
    return { path: filePath, status: 'no_change', changed: false };
  }

  // Backup BEFORE writing
  const backupPath = `${filePath}.bak-globaldb-${STAMP}`;
  fs.writeFileSync(backupPath, original, 'utf8');

  // Write the patched file
  fs.writeFileSync(filePath, updated, 'utf8');

  // Syntax check
  try {
    execSync(`node --check "${filePath}"`, { stdio: 'pipe' });
  } catch (err) {
    // Restore from backup
    fs.copyFileSync(backupPath, filePath);
    return { path: filePath, status: 'syntax_fail', changed: false, error: err.message.slice(0, 200) };
  }

  return { path: filePath, status: 'patched', changed: true, backup: backupPath };
}

// =============================================================================
// MAIN
// =============================================================================

console.log(`\n[REFACTOR] Scanning ${ROOT}...`);
const allFiles = walkDir(ROOT);
console.log(`[REFACTOR] Found ${allFiles.length} candidate .js files`);

const targetFiles = allFiles.filter(f => /\bglobal\.db\b/.test(fs.readFileSync(f, 'utf8')));
console.log(`[REFACTOR] ${targetFiles.length} contain pool\n`);

const results = { patched: [], no_change: [], syntax_fail: [], incomplete_replace: [], no_global_db: [] };

for (const f of targetFiles) {
  const result = refactorFile(f);
  results[result.status] = results[result.status] || [];
  results[result.status].push(result);
  const shortPath = f.replace(ROOT + path.sep, '').replace(/\\/g, '/');
  if (result.status === 'patched') {
    console.log(`  [OK]   ${shortPath}`);
  } else if (result.status === 'syntax_fail') {
    console.log(`  [FAIL] ${shortPath} - ${result.error}`);
  } else if (result.status === 'incomplete_replace') {
    console.log(`  [SKIP] ${shortPath} - pool still present after replace`);
  } else if (result.status === 'no_change') {
    console.log(`  [--]   ${shortPath} - already clean`);
  }
}

console.log(`\n=== SUMMARY ===`);
console.log(`  Patched:           ${results.patched.length}`);
console.log(`  Already clean:     ${results.no_change.length}`);
console.log(`  Syntax fail:       ${results.syntax_fail.length}`);
console.log(`  Incomplete:        ${results.incomplete_replace.length}`);

if (results.syntax_fail.length > 0) {
  console.log(`\n[ATTENTION] ${results.syntax_fail.length} files restored from backup due to syntax errors:`);
  results.syntax_fail.forEach(r => console.log(`    ${r.path}`));
}
