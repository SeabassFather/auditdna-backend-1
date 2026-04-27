// =============================================================================
// File: scheduler.js
// Save to: C:\AuditDNA\backend\scheduler.js
// =============================================================================
// Sprint D Wave 3C - Generic scheduler module
// Stops [WARN] Scheduler not loaded.
//
// Lightweight wrapper around setInterval for named jobs.
// Real cron-style scheduling for autonomy modules already exists inline in
// server.js (A1-A15 autonomy loops). This is a public API for ad-hoc jobs.
// =============================================================================

const jobs = new Map();

function add(name, fn, intervalMs) {
  if (jobs.has(name)) return false;
  const handle = setInterval(() => {
    try { Promise.resolve(fn()).catch(() => {}); } catch (e) {}
  }, intervalMs);
  jobs.set(name, { handle, intervalMs, started_at: new Date(), runs: 0 });
  return true;
}

function remove(name) {
  const j = jobs.get(name);
  if (!j) return false;
  clearInterval(j.handle);
  jobs.delete(name);
  return true;
}

function list() {
  const out = [];
  for (const [name, j] of jobs.entries()) {
    out.push({ name, intervalMs: j.intervalMs, started_at: j.started_at, runs: j.runs });
  }
  return out;
}

function clear() {
  for (const [, j] of jobs.entries()) clearInterval(j.handle);
  jobs.clear();
}

module.exports = { add, remove, list, clear };
