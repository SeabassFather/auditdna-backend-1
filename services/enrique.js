// =============================================================================
// File: C:\AuditDNA\backend\services\enrique.js
// ENRIQUE — Head AI Command Agent
// Monitors: Brain, Gatekeeper, Autonomous Blast, PM2, SMTP, Anthropic
// Reports: Email (sgarcia1911@gmail.com) + ntfy.sh smartwatch
// Schedule: Status report every 60min | Critical alerts immediate
// =============================================================================
'use strict';

const crypto = require('crypto');

const NTFY_TOPIC   = process.env.NTFY_TOPIC   || 'mexausa-saul';
const NTFY_URL     = `https://ntfy.sh/${NTFY_TOPIC}`;
const REPORT_EMAIL = process.env.ENRIQUE_EMAIL || 'sgarcia1911@gmail.com';
const REPORT_EVERY = 60 * 60 * 1000; // 1 hour

// ─── SMARTWATCH NOTIFICATION via ntfy.sh ─────────────────────────────────────
async function notify(title, message, priority = 'default') {
  try {
    await fetch(NTFY_URL, {
      method: 'POST',
      headers: {
        'Title': title,
        'Priority': priority,
        'Content-Type': 'text/plain',
      },
      body: message,
    });
    console.log(`[ENRIQUE] Smartwatch ping: ${title}`);
  } catch (e) {
    // ntfy failure is non-fatal — fallback to email only
    console.error('[ENRIQUE] ntfy failed:', e.message);
  }
}

// ─── EMAIL REPORT ─────────────────────────────────────────────────────────────
async function sendReport(transporter, subject, body) {
  try {
    await transporter.sendMail({
      from: '"ENRIQUE — LOAF Command" <sgarcia1911@gmail.com>',
      to: REPORT_EMAIL,
      subject,
      text: body,
      html: `<div style="font-family:Arial,sans-serif;font-size:13px;line-height:1.7;max-width:640px;margin:0 auto;padding:20px">
        <div style="background:#0F1419;color:#0F7B41;padding:10px 16px;border-radius:6px 6px 0 0;font-family:monospace;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700">
          ENRIQUE — MEXAUSA FOOD GROUP COMMAND CENTER
        </div>
        <div style="background:#f8fafb;padding:20px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 6px 6px;white-space:pre-wrap;font-family:monospace;font-size:12px;color:#1a1a1a">
          ${body.replace(/</g,'&lt;').replace(/>/g,'&gt;')}
        </div>
        <div style="margin-top:10px;font-size:10px;color:#94a3b8">
          Mexausa Food Group, Inc. | loaf.mexausafg.com | ${new Date().toISOString()}
        </div>
      </div>`,
    });
    console.log(`[ENRIQUE] Report sent: ${subject}`);
  } catch (e) {
    console.error('[ENRIQUE] Email failed:', e.message);
  }
}

// ─── GATHER PLATFORM STATUS ───────────────────────────────────────────────────
async function gatherStatus(pool, ai) {
  const results = {};

  const q = async (name, fn) => {
    try { results[name] = await fn(); }
    catch (e) { results[name] = { error: e.message }; }
  };

  await Promise.allSettled([
    q('gatekeeper', async () => {
      const r = await pool.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER(WHERE status='success') AS ok, COUNT(*) FILTER(WHERE status='failed') AS fail, AVG(duration_ms)::INTEGER AS avg_ms FROM gatekeeper_runs WHERE created_at > NOW() - INTERVAL '1 hour'`);
      return r.rows[0];
    }),
    q('blast_agents', async () => {
      const r = await pool.query(`SELECT agent_id, COUNT(*) AS runs, SUM(emails_sent) AS sent, MAX(created_at) AS last_run FROM autonomous_agent_runs WHERE created_at > NOW() - INTERVAL '1 hour' GROUP BY agent_id`);
      return r.rows;
    }),
    q('loaf_chat', async () => {
      const r = await pool.query(`SELECT COUNT(*) AS chats, COUNT(DISTINCT session_id) AS sessions FROM loaf_chat_log WHERE created_at > NOW() - INTERVAL '1 hour'`);
      return r.rows[0];
    }),
    q('contacts', async () => {
      const r = await pool.query(`SELECT (SELECT COUNT(*) FROM growers) AS growers, (SELECT COUNT(*) FROM buyers) AS buyers, (SELECT COUNT(*) FROM shipper_contacts) AS shippers`);
      return r.rows[0];
    }),
    q('brain_events', async () => {
      const r = await pool.query(`SELECT COUNT(*) AS total FROM brain_events WHERE created_at > NOW() - INTERVAL '1 hour'`).catch(() => ({ rows: [{ total: 'N/A' }] }));
      return r.rows[0];
    }),
    q('blast_runs_24h', async () => {
      const r = await pool.query(`SELECT COUNT(*) AS runs, SUM(emails_sent) AS sent, SUM(emails_failed) AS failed FROM autonomous_agent_runs WHERE created_at > NOW() - INTERVAL '24 hours'`);
      return r.rows[0];
    }),
  ]);

  return results;
}

// ─── GENERATE AI REPORT ───────────────────────────────────────────────────────
async function generateReport(ai, status) {
  const prompt = `You are ENRIQUE, the Head AI Command Agent for Mexausa Food Group's LOAF agricultural intelligence platform. Generate a concise executive status report for Saul Garcia (Owner) based on this platform data:

GATEKEEPER (last 1hr): ${JSON.stringify(status.gatekeeper)}
AUTONOMOUS BLAST AGENTS (last 1hr): ${JSON.stringify(status.blast_agents)}
BLAST 24HR SUMMARY: ${JSON.stringify(status.blast_runs_24h)}
LOAF CHAT (last 1hr): ${JSON.stringify(status.loaf_chat)}
BRAIN EVENTS (last 1hr): ${JSON.stringify(status.brain_events)}
DATABASE: ${JSON.stringify(status.contacts)}
TIMESTAMP: ${new Date().toISOString()}

Format as:
- PLATFORM STATUS (overall health, one line)
- PIPELINE (gatekeeper activity)  
- MARKETING ENGINE (blast agents, emails sent)
- LOAF ENGAGEMENT (chat sessions, inquiries)
- DATABASE (contact counts)
- ALERTS (anything requiring attention)
- NEXT ACTION (recommendation)

Keep it tight. No emojis. Direct. This goes to Saul's phone and email.`;

  return ai.ask(prompt, 'You are ENRIQUE, Head AI Command Agent for Mexausa Food Group. You write concise, actionable executive reports. No emojis. No fluff. Direct operator tone.');
}

// ─── CRITICAL ALERT MONITOR ───────────────────────────────────────────────────
async function watchForAlerts(pool, transporter) {
  try {
    // Check for gatekeeper failures in last 10 min
    const fails = await pool.query(
      `SELECT COUNT(*) AS n FROM gatekeeper_runs WHERE status='failed' AND started_at > NOW() - INTERVAL '10 minutes'`
    );
    if (parseInt(fails.rows[0].n) >= 3) {
      const msg = `ALERT: ${fails.rows[0].n} gatekeeper failures in last 10 minutes. Check backend logs immediately.`;
      await notify('LOAF ALERT — Gatekeeper Failures', msg, 'high');
      await sendReport(transporter, '[ENRIQUE ALERT] Gatekeeper Pipeline Failures', msg);
    }

    // Check blast agent failures
    const blastFails = await pool.query(
      `SELECT COUNT(*) AS n FROM autonomous_agent_runs WHERE status='failed' AND started_at > NOW() - INTERVAL '30 minutes'`
    );
    if (parseInt(blastFails.rows[0].n) >= 2) {
      const msg = `ALERT: ${blastFails.rows[0].n} blast agent failures in last 30 minutes. Email delivery may be degraded.`;
      await notify('LOAF ALERT — Blast Agent Failures', msg, 'high');
    }
  } catch (e) {
    console.error('[ENRIQUE] Alert watch failed:', e.message);
  }
}

// ─── START ENRIQUE ────────────────────────────────────────────────────────────
function startEnrique(app, brain) {
  const pool       = app.get('pool');
  const ai         = app.get('ai');
  const transporter= app.get('smtp');

  console.log('[ENRIQUE] Head AI Command Agent initializing...');

  // Hourly status report
  async function runReport() {
    try {
      console.log('[ENRIQUE] Generating hourly status report...');
      const status = await gatherStatus(pool, ai);
      const report = await generateReport(ai, status);
      const subject = `[ENRIQUE] LOAF Platform Status — ${new Date().toLocaleString('en-US', {timeZone:'America/Los_Angeles'})} PST`;

      await sendReport(transporter, subject, report);
      await notify('LOAF Status Report', report.substring(0, 280), 'default');
      console.log('[ENRIQUE] Hourly report complete');
    } catch (e) {
      console.error('[ENRIQUE] Report failed:', e.message);
    }
  }

  // Alert check every 10 minutes
  setInterval(() => watchForAlerts(pool, transporter).catch(() => {}), 10 * 60 * 1000);

  // First report after 3 minutes
  setTimeout(() => {
    runReport();
    setInterval(runReport, REPORT_EVERY);
  }, 3 * 60 * 1000);

  // Startup ping to smartwatch
  setTimeout(() => {
    notify('ENRIQUE ONLINE', 'LOAF Command Agent active. Monitoring all systems. First report in 3 min.', 'default');
  }, 15000);

  console.log('[ENRIQUE] Online — reports every 60min, alerts every 10min, smartwatch via ntfy.sh/' + NTFY_TOPIC);
}

module.exports = { startEnrique, notify, sendReport };
