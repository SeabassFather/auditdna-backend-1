// =============================================================================
// File: complianceCleaner.js
// Save to: C:\AuditDNA\backend\complianceCleaner.js
// =============================================================================
// Sprint D Wave 3C.1 - Compliance cleanup module (CALLABLE EXPORT)
//
// Wave 3C version exported { sweep, start, stop } object - but server.js
// calls it like require('./complianceCleaner')(args), expecting a function.
// This version exports a callable function with .sweep/.start/.stop properties.
// =============================================================================

const db = () => global.db || null;
let intervalHandle = null;

async function sweep() {
  const pool = db();
  if (!pool) return { ok: false, reason: 'db unavailable' };
  const result = { ok: true, swept_at: new Date().toISOString(), actions: [] };
  try {
    try {
      const r = await pool.query(
        `UPDATE grower_certifications SET status = 'expired'
         WHERE status = 'active' AND expires_at < NOW()
         RETURNING id`
      );
      if (r.rowCount > 0) result.actions.push({ marked_expired: r.rowCount });
    } catch (e) { /* table might not exist - ignore */ }
  } catch (e) { result.error = e.message; }
  return result;
}

function start(intervalMs) {
  if (intervalHandle) return;
  intervalHandle = setInterval(() => { sweep().catch(() => {}); }, intervalMs || 3600000);
  setTimeout(() => { sweep().catch(() => {}); }, 60000);
}

function stop() {
  if (intervalHandle) { clearInterval(intervalHandle); intervalHandle = null; }
}

// Make the default export a callable function (handles server.js's calling pattern)
// Calling complianceCleaner() runs a sweep and returns the result promise
function complianceCleaner(opts) {
  // If called with options that include .schedule = true, start the interval
  if (opts && opts.schedule) {
    start(opts.intervalMs);
    return { scheduled: true };
  }
  // Otherwise, just run a one-shot sweep
  return sweep();
}

// Attach helpers as properties so existing imports keep working
complianceCleaner.sweep = sweep;
complianceCleaner.start = start;
complianceCleaner.stop = stop;

// Auto-start interval (1hr cadence) - can be cancelled via complianceCleaner.stop()
start();

module.exports = complianceCleaner;
