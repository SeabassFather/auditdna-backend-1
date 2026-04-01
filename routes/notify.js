const express  = require('express');
const router   = express.Router();
const nodemailer = require('nodemailer');

// Save to: C:\AuditDNA\backend\routes\notify.js

const transporter = nodemailer.createTransport({
  host: 'smtpout.secureserver.net',
  port: 465,
  secure: true,
  auth: { user: 'saul@mexausafg.com', pass: 'KongKing#321' },
});

const TIER_LABELS = {
  free:'Free Observer', tier1:'Tier 1 — Grower MX', tier2:'Tier 2 — Grower USA',
  tier3:'Tier 3 — Buyer', tier4:'Tier 4 — Shipper/Broker',
  tier5:'Tier 5 — Enterprise', owner:'Owner',
};

// POST /api/notify/access-request
router.post('/access-request', async (req, res) => {
  const { moduleName, requiredTier, userEmail, userName, currentTier } = req.body;
  const ts = new Date().toLocaleString('en-US', { timeZone:'America/Tijuana', dateStyle:'medium', timeStyle:'short' });

  const text = `
MODULE ACCESS REQUEST — AUDITDNA
${'='.repeat(44)}

Module:        ${moduleName || 'N/A'}
Required Tier: ${TIER_LABELS[requiredTier] || requiredTier || 'N/A'}
User Name:     ${userName || 'N/A'}
User Email:    ${userEmail || 'N/A'}
Current Tier:  ${TIER_LABELS[currentTier] || currentTier || 'free'}
Time:          ${ts}

--- AuditDNA Access Control System ---
`.trim();

  try {
    await transporter.sendMail({
      from: '"AuditDNA Access Control" <saul@mexausafg.com>',
      to: 'saul@mexausafg.com',
      subject: `[AuditDNA] Access Request — ${moduleName} — ${userName || userEmail}`,
      text,
    });
    console.log(`[notify] Access request sent: ${moduleName} by ${userEmail}`);
    res.json({ success: true });
  } catch (err) {
    console.error('[notify] Failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// POST /api/notify/admin-alert
// Called by CRMWorkflow.jsx and other modules to fire admin alerts
router.post('/admin-alert', async (req, res) => {
  try {
    const { type, message, module, data, severity } = req.body;
    console.log(`[NOTIFY] Admin alert: ${type} from ${module} — ${message}`);
    // Log to brain event bus if available
    try {
      const pool = req.app.locals.pool || req.pool;
      if (pool) {
        await pool.query(
          `INSERT INTO brain_events (event_type, module, payload, created_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT DO NOTHING`,
          [type || 'ADMIN_ALERT', module || 'system', JSON.stringify({ message, severity, data })]
        ).catch(() => {});
      }
    } catch {}
    res.json({ success: true, type, message, module, severity: severity || 'info', timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[NOTIFY] admin-alert error:', err.message);
    res.json({ success: true, note: 'Alert logged' });
  }
});

module.exports = router;
