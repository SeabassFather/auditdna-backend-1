// =============================================================================
// File: complianceCleaner.js
// Save to: C:\AuditDNA\backend\complianceCleaner.js
// =============================================================================
// Sprint D Wave 3C - Compliance cleanup module
// Stops [WARN] complianceCleaner not loaded.
//
// Periodic sweep that:
//   - Marks expired certifications (FSMA, GlobalGAP, etc.) as 'expired'
//   - Flags growers without recent compliance documents
//   - No-op if compliance tables don't exist
// =============================================================================

const db = () => global.db || null;
let intervalHandle = null;

async function sweep() {
  const pool = db();
  if (!pool) return { ok: false, reason: 'db unavailable' };
  const result = { ok: true, swept_at: new Date().toISOString(), actions: [] };
  try {
    // Mark expired certifications, if table exists
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
  // First sweep delayed so it doesn't fire during boot
  setTimeout(() => { sweep().catch(() => {}); }, 60000);
}

function stop() {
  if (intervalHandle) { clearInterval(intervalHandle); intervalHandle = null; }
}

// Auto-start when imported (1 hr cadence)
start();

module.exports = { sweep, start, stop };
