// =============================================================================
// File: C:\AuditDNA\backend\services\autonomous-blast.js
// AUTONOMOUS EMAIL BLAST ENGINE ΓÇö 8 AI AGENTS
// Agents: AVOCADO | BUYER_OUTREACH | GROWER_TENDER | LOGISTICS |
//         FOOD_SAFETY | FINANCE | MARKET_INTEL | PRODUCTION_REPORT
// All agents talk to: Brain, Niner Miners, Gatekeeper, Margie, Command Center
// Production reports fire every 2 hours
// Daily outreach agents fire at 6am, 10am, 2pm per category
// =============================================================================

'use strict';

const crypto = require('crypto');

// ΓöÇΓöÇΓöÇ AGENT REGISTRY ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const AGENTS = {
  AVOCADO:          { id: 'AVOCADO',          name: 'Avocado Program Agent',         schedule_ms: 8 * 60 * 60 * 1000,  category: 'grower_buyer',  commodity: 'avocado'   },
  BUYER_OUTREACH:   { id: 'BUYER_OUTREACH',   name: 'Buyer Outreach Agent',          schedule_ms: 12 * 60 * 60 * 1000, category: 'buyer',         commodity: null        },
  GROWER_TENDER:    { id: 'GROWER_TENDER',    name: 'Grower Tender Agent',           schedule_ms: 10 * 60 * 60 * 1000, category: 'grower',        commodity: null        },
  LOGISTICS:        { id: 'LOGISTICS',        name: 'Logistics & Shipping Agent',    schedule_ms: 24 * 60 * 60 * 1000, category: 'shipper',       commodity: null        },
  FOOD_SAFETY:      { id: 'FOOD_SAFETY',      name: 'Food Safety & Compliance Agent',schedule_ms: 24 * 60 * 60 * 1000, category: 'compliance',    commodity: null        },
  FINANCE:          { id: 'FINANCE',          name: 'Trade Finance Agent',           schedule_ms: 24 * 60 * 60 * 1000, category: 'finance',       commodity: null        },
  MARKET_INTEL:     { id: 'MARKET_INTEL',     name: 'Market Intelligence Agent',     schedule_ms: 6 * 60 * 60 * 1000,  category: 'market',        commodity: null        },
  PRODUCTION_REPORT:{ id: 'PRODUCTION_REPORT',name: 'Production Report Agent',       schedule_ms: 2 * 60 * 60 * 1000,  category: 'internal',      commodity: null        },
};

// ΓöÇΓöÇΓöÇ SYSTEM PROMPTS ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const SYSTEM_PROMPTS = {
  AVOCADO: `You are a senior trade specialist at Mexausa Food Group, Inc. Write a compelling outreach email to a grower or buyer in the Hass avocado program. Promote the LOAF Platform at loaf.mexausafg.com — upload your inventory and reach 3,000+ matched buyers instantly, or post a tender and receive bids from verified growers in minutes. Also highlight invoice factoring: receive up to 80% advance on your avocado invoices same week. Professional, direct, no emojis. Sign as Saul Garcia, CEO, Mexausa Food Group, Inc.`,

  BUYER_OUTREACH: `You are a senior trade specialist at Mexausa Food Group, Inc. Write a compelling outreach email to a fresh produce buyer. Lead with the LOAF Platform at loaf.mexausafg.com — the US-Mexico produce intelligence platform that matches buyers with 3,200+ verified growers in Mexico and the US. Highlight: (1) instant access to year-round Hass avocado, berry, tomato, lime, and vegetable programs direct from Michoacan, Jalisco, Sinaloa, and Baja California growers; (2) Call for Tender feature — post your need, growers bid, PO generated in one tap, zero phone calls; (3) Trade financing and invoice factoring available for importers and exporters — advance up to 80% of invoice value. Professional, direct, no emojis. Sign as Saul Garcia, CEO, Mexausa Food Group, Inc.`,

  GROWER_TENDER: `You are a senior trade specialist at Mexausa Food Group, Inc. Write a compelling outreach email to a fresh produce grower. Promote the LOAF Platform at loaf.mexausafg.com — upload your inventory in seconds, reach 3,000+ verified US buyers instantly, no broker fees, no phone calls. Buyers come to you. Also promote invoice factoring for growers: get paid in days, not 30-60 days. Mexausa advances up to 80% of your invoice the same week. Professional, direct, no emojis. Sign as Saul Garcia, CEO, Mexausa Food Group, Inc.`,

  LOGISTICS: `You are the Logistics and Shipping Agent for Mexausa Food Group's LOAF platform. You write outreach to shippers, cold chain operators, freight companies, and customs brokers about joining the LOAF network for US-Mexico produce corridor logistics partnerships. No emojis. Direct logistics tone. Return ONLY the email body.`,

  FOOD_SAFETY: `You are the Food Safety and Compliance Agent for Mexausa Food Group. You write professional alerts and outreach about FSMA compliance, traceability requirements, SENASICA, GAP/LGMA certifications, and how the LOAF platform automates food safety documentation. Regulatory, precise, professional tone. No emojis. Return ONLY the email body.`,

  FINANCE: `You are the Trade Finance Agent for Mexausa Food Group. You write targeted outreach about accounts receivable factoring for PACA-protected invoices and purchase order financing available through the LOAF platform. Direct, financial professional tone. No emojis. Include: advance rates, timeline, PACA protection, submission process. Return ONLY the email body.`,

  MARKET_INTEL: `You are the Market Intelligence Agent for Mexausa Food Group. You write concise market intelligence emails covering USDA terminal market pricing trends, demand signals, seasonal availability, and commodity outlook for fresh produce. Data-driven, precise, actionable. No emojis. Return ONLY the email body.`,

  PRODUCTION_REPORT: `You are the Production Report Agent for Mexausa Food Group internal reporting. Generate a comprehensive 2-hour production report covering: active LOAF transactions, gatekeeper pipeline status, agent email blast performance, contact database activity, and operational KPIs. Format as a structured executive report. No emojis.`,
};

// ΓöÇΓöÇΓöÇ SUBJECTS ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const SUBJECTS = {
  AVOCADO:           'Year-Round Hass Avocado Supply ΓÇö Direct Source Michoacan | Mexausa Food Group',
  BUYER_OUTREACH:    'Direct Grower Access ΓÇö Fresh Produce Network | LOAF Platform',
  GROWER_TENDER:     'Active Buyer Tenders Available for Your Commodity | LOAF Platform',
  LOGISTICS:         'US-Mexico Produce Corridor Logistics Partnership | Mexausa Food Group',
  FOOD_SAFETY:       'FSMA Traceability & Compliance Update | LOAF Platform',
  FINANCE:           'Invoice Factoring & PO Finance for Fresh Produce | LOAF Platform',
  MARKET_INTEL:      'Fresh Produce Market Intelligence Report | Mexausa Food Group',
  PRODUCTION_REPORT: '[PRODUCTION REPORT] LOAF Platform 2-Hour Summary',
};

// ΓöÇΓöÇΓöÇ CONTACT QUERIES ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
async function getContacts(pool, agentId, limit = 50) {
  try {
    switch (agentId) {
      case 'AVOCADO':
        return await pool.query(
          `SELECT * FROM (SELECT email, COALESCE(contact_name, legal_name) AS name, 'avocado' AS commodity, state_province AS state, country FROM growers WHERE (crops_grown::text ILIKE '%avocado%' OR notes ILIKE '%avocado%' OR primary_products::text ILIKE '%avocado%') AND email IS NOT NULL AND email != '' UNION ALL SELECT email, legal_name AS name, 'avocado' AS commodity, state_region AS state, country FROM buyers WHERE product_specialties ILIKE '%avocado%' AND email IS NOT NULL AND email != '') t ORDER BY random() LIMIT $1`, [limit]
        );
      case 'BUYER_OUTREACH':
        return await pool.query(
          `SELECT email, legal_name AS name, product_specialties AS commodity, state_region AS state, country FROM buyers WHERE email IS NOT NULL AND email != '' ORDER BY random() LIMIT $1`, [limit]
        );
      case 'GROWER_TENDER':
        return await pool.query(
          `SELECT email, contact_name AS name, COALESCE(array_to_string(crops_grown,','),'') AS commodity, state_province AS state, country FROM growers WHERE email IS NOT NULL AND email != '' ORDER BY random() LIMIT $1`, [limit]
        );
      case 'LOGISTICS':
        return await pool.query(
          `SELECT email, COALESCE(name, company) AS name, company AS commodity, state, address_country AS country FROM shipper_contacts WHERE email IS NOT NULL AND email != '' ORDER BY random() LIMIT $1`, [limit]
        );
      case 'FOOD_SAFETY':
        return await pool.query(
          `SELECT email, contact_name AS name, COALESCE(array_to_string(crops_grown,','),'') AS commodity, state_province AS state, country FROM growers WHERE email IS NOT NULL AND email != '' ORDER BY random() LIMIT $1`, [limit]
        );
      case 'FINANCE':
        return await pool.query(
          `SELECT email, contact_name AS name, COALESCE(array_to_string(crops_grown,','),'') AS commodity, state_province AS state, country FROM growers WHERE email IS NOT NULL AND email != '' ORDER BY random() LIMIT $1`, [limit]
        );
      case 'MARKET_INTEL':
        return await pool.query(
          `SELECT email, legal_name AS name, product_specialties AS commodity, state_region AS state, country FROM buyers WHERE email IS NOT NULL AND email != '' ORDER BY random() LIMIT $1`, [limit]
        );
      default:
        return { rows: [] };
    }
  } catch (e) {
    console.error(`[BLAST-${agentId}] Contact query failed:`, e.message);
    return { rows: [] };
  }
}

// ΓöÇΓöÇΓöÇ BRAIN EVENT ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
async function fireBrainEvent(brain, eventType, payload) {
  try {
    if (brain && typeof brain.emit === 'function') {
      brain.emit(eventType, payload);
    } else if (brain && typeof brain.on === 'function') {
      // brain in direct-call mode ΓÇö log only
      console.log(`[BRAIN-EVENT] ${eventType}:`, JSON.stringify(payload).substring(0, 120));
    }
  } catch (e) {
    console.error('[BRAIN-EVENT] Failed:', e.message);
  }
}

// ΓöÇΓöÇΓöÇ GATEKEEPER PIPELINE TRIGGER ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
async function triggerGatekeeper(pool, agentId, runId, stats) {
  try {
    const { runPipeline } = require('../swarm/gatekeepers/orchestrator');
    await runPipeline({
      request_type: `autonomous.blast.${agentId.toLowerCase()}`,
      source: `autonomous_agent_${agentId}`,
      payload: {
        agent_id: agentId,
        blast_run_id: runId,
        contacts_targeted: stats.targeted,
        emails_sent: stats.sent,
        emails_failed: stats.failed,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (e) {
    console.error(`[GATEKEEPER-${agentId}] Pipeline trigger failed:`, e.message);
  }
}

// ΓöÇΓöÇΓöÇ LOG RUN TO DB ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
async function logRun(pool, runId, agentId, status, stats, reportText) {
  try {
    await pool.query(
      `INSERT INTO autonomous_agent_runs
        (run_id, agent_id, status, contacts_targeted, emails_sent, emails_failed, report_text, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
       ON CONFLICT (run_id) DO UPDATE SET status=$3, emails_sent=$5, emails_failed=$6, updated_at=NOW()`,
      [runId, agentId, status, stats.targeted || 0, stats.sent || 0, stats.failed || 0, reportText || null]
    );
  } catch (e) {
    console.error(`[LOG-${agentId}] DB log failed:`, e.message);
  }
}

// ΓöÇΓöÇΓöÇ SEND EMAIL ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
async function sendEmail(transporter, to, subject, body, fromName) {
  return transporter.sendMail({
    from: `"${fromName || 'Saul Garcia ΓÇö Mexausa Food Group'}" <sgarcia1911@gmail.com>`,
    to,
    subject,
    text: body,
    html: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px">
      <div style="border-bottom:2px solid #0F7B41;padding-bottom:12px;margin-bottom:20px">
        <div style="font-size:11px;letter-spacing:3px;color:#0F7B41;text-transform:uppercase;font-weight:700">Mexausa Food Group, Inc.</div>
        <div style="font-size:10px;color:#64748b;letter-spacing:2px">LOAF Agricultural Intelligence Platform</div>
      </div>
      ${body.replace(/\n/g, '<br>')}
      <div style="margin-top:28px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;letter-spacing:1px">
        Mexausa Food Group, Inc. | Salinas, California | +1-831-251-3116 | loaf.mexausafg.com<br>
        To unsubscribe reply REMOVE to this email.
      </div>
    </div>`,
  });
}

// ΓöÇΓöÇΓöÇ PRODUCTION REPORT ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
async function runProductionReport(app, brain) {
  const pool = app.get('pool');
  const ai = app.get('ai');
  const transporter = app.get('smtp');
  const runId = crypto.randomUUID();

  console.log('[PRODUCTION-REPORT] Generating 2-hour production report...');

  try {
    // Gather all stats
    const [
      growerCount, buyerCount, shipperCount,
      gkStats, chatLog, agentRuns
    ] = await Promise.allSettled([
      pool.query('SELECT COUNT(*) FROM growers'),
      pool.query('SELECT COUNT(*) FROM buyers'),
      pool.query('SELECT COUNT(*) FROM shipper_contacts'),
      pool.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER(WHERE status='success') AS success, COUNT(*) FILTER(WHERE status='failed') AS failed, AVG(duration_ms)::INTEGER AS avg_ms FROM gatekeeper_runs WHERE created_at > NOW() - INTERVAL '2 hours'`),
      pool.query(`SELECT COUNT(*) AS chats, COUNT(DISTINCT session_id) AS sessions FROM loaf_chat_log WHERE created_at > NOW() - INTERVAL '2 hours'`),
      pool.query(`SELECT agent_id, COUNT(*) AS runs, SUM(emails_sent) AS sent FROM autonomous_agent_runs WHERE created_at > NOW() - INTERVAL '24 hours' GROUP BY agent_id`),
    ]);

    const stats = {
      growers: growerCount.value?.rows[0]?.count || 'N/A',
      buyers: buyerCount.value?.rows[0]?.count || 'N/A',
      shippers: shipperCount.value?.rows[0]?.count || 'N/A',
      gk: gkStats.value?.rows[0] || {},
      chat: chatLog.value?.rows[0] || {},
      agents: agentRuns.value?.rows || [],
    };

    const prompt = `Generate a 2-hour production report for Mexausa Food Group LOAF platform with this data:
CONTACT DATABASE: Growers: ${stats.growers} | Buyers: ${stats.buyers} | Shippers: ${stats.shippers}
GATEKEEPER (last 2hr): Total runs: ${stats.gk.total||0} | Success: ${stats.gk.success||0} | Failed: ${stats.gk.failed||0} | Avg ms: ${stats.gk.avg_ms||0}
CHAT AGENTS (last 2hr): Conversations: ${stats.chat.chats||0} | Unique sessions: ${stats.chat.sessions||0}
AUTONOMOUS AGENTS (last 24hr): ${stats.agents.map(a => `${a.agent_id}: ${a.runs} runs, ${a.sent} emails sent`).join(' | ') || 'No runs yet'}
TIME: ${new Date().toISOString()}
Include: operational status, email blast performance, pipeline health, recommendations for next cycle.`;

    const reportText = await ai.ask(prompt, SYSTEM_PROMPTS.PRODUCTION_REPORT);

    // Email report to Saul
    await sendEmail(
      transporter,
      'sgarcia1911@gmail.com',
      SUBJECTS.PRODUCTION_REPORT + ` ΓÇö ${new Date().toLocaleString()}`,
      reportText,
      'LOAF Production Report Agent'
    );

    // Brain event
    await fireBrainEvent(brain, 'production.report.issued', {
      run_id: runId,
      timestamp: new Date().toISOString(),
      growers: stats.growers,
      buyers: stats.buyers,
      gk_success: stats.gk.success || 0,
      chat_sessions: stats.chat.sessions || 0,
    });

    await logRun(pool, runId, 'PRODUCTION_REPORT', 'success', { targeted: 1, sent: 1, failed: 0 }, reportText);
    console.log('[PRODUCTION-REPORT] Report issued to sgarcia1911@gmail.com');
  } catch (e) {
    console.error('[PRODUCTION-REPORT] Failed:', e.message);
    await logRun(pool, runId, 'PRODUCTION_REPORT', 'failed', { targeted: 0, sent: 0, failed: 1 }, e.message);
  }
}

// ΓöÇΓöÇΓöÇ MAIN AGENT RUNNER ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
async function runAgent(app, brain, agentId) {
  const pool = app.get('pool');
  const ai = app.get('ai');
  const transporter = app.get('smtp');
  const agent = AGENTS[agentId];
  const runId = crypto.randomUUID();
  const stats = { targeted: 0, sent: 0, failed: 0 };

  console.log(`[AGENT-${agentId}] Starting blast run ${runId}...`);

  await fireBrainEvent(brain, `autonomous.agent.started`, {
    agent_id: agentId,
    run_id: runId,
    timestamp: new Date().toISOString(),
  });

  try {
    // Get contacts
    const result = await getContacts(pool, agentId, 200);
    const contacts = result.rows || [];
    stats.targeted = contacts.length;

    if (contacts.length === 0) {
      console.log(`[AGENT-${agentId}] No contacts found ΓÇö skipping blast`);
      await logRun(pool, runId, agentId, 'skipped', stats, 'No contacts available');
      return;
    }

    // Generate AI email body ΓÇö one body per run, personalized at send time
    const contextPrompt = `Write an outreach email for ${contacts.length} ${agent.category} contacts in the fresh produce industry.
Context: Mexausa Food Group LOAF platform. Year-round Hass avocado program from Michoacan.
Target segment: ${agent.category} ΓÇö commodities including ${contacts.slice(0,5).map(c=>c.commodity||'fresh produce').join(', ')}.
Markets: ${[...new Set(contacts.slice(0,10).map(c=>c.state||c.country).filter(Boolean))].join(', ')}.
Make it specific, actionable, and professional. No emojis.`;

    const emailBody = await ai.ask(contextPrompt, SYSTEM_PROMPTS[agentId]);

    // Send emails in batches of 10
    const BATCH = 10;
    for (let i = 0; i < contacts.length; i += BATCH) {
      const batch = contacts.slice(i, i + BATCH);
      await Promise.allSettled(batch.map(async (contact) => {
        try {
          const personalizedBody = emailBody.replace(/\[NAME\]/gi, contact.name || 'Producer')
            .replace(/\[COMMODITY\]/gi, contact.commodity || 'fresh produce')
            .replace(/\[STATE\]/gi, contact.state || contact.country || '');

          await sendEmail(transporter, contact.email, SUBJECTS[agentId], personalizedBody);
          stats.sent++;

          // Log individual send to DB
          await pool.query(
            `INSERT INTO autonomous_agent_logs (run_id, agent_id, contact_email, contact_name, status, created_at)
             VALUES ($1,$2,$3,$4,'sent',NOW())`,
            [runId, agentId, contact.email, contact.name || null]
          ).catch(() => {});

        } catch (e) {
          stats.failed++;
          await pool.query(
            `INSERT INTO autonomous_agent_logs (run_id, agent_id, contact_email, contact_name, status, error_msg, created_at)
             VALUES ($1,$2,$3,$4,'failed',$5,NOW())`,
            [runId, agentId, contact.email, contact.name || null, e.message]
          ).catch(() => {});
        }
      }));

      // Throttle between batches
      if (i + BATCH < contacts.length) await new Promise(r => setTimeout(r, 2000));
    }

    // Trigger gatekeeper pipeline
    await triggerGatekeeper(pool, agentId, runId, stats);

    // Fire completion brain event
    await fireBrainEvent(brain, 'autonomous.agent.completed', {
      agent_id: agentId,
      run_id: runId,
      contacts_targeted: stats.targeted,
      emails_sent: stats.sent,
      emails_failed: stats.failed,
      timestamp: new Date().toISOString(),
    });

    // Log run
    await logRun(pool, runId, agentId, 'success', stats, emailBody.substring(0, 500));

    console.log(`[AGENT-${agentId}] Run complete ΓÇö sent: ${stats.sent} | failed: ${stats.failed} | targeted: ${stats.targeted}`);

  } catch (e) {
    console.error(`[AGENT-${agentId}] Run failed:`, e.message);
    await fireBrainEvent(brain, 'autonomous.agent.failed', { agent_id: agentId, run_id: runId, error: e.message });
    await logRun(pool, runId, agentId, 'failed', stats, e.message);
  }
}

// ΓöÇΓöÇΓöÇ INCOMING EMAIL INQUIRY HANDLER ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// Handles inbound inquiries ΓÇö routes to correct agent, generates AI reply, logs
async function handleInboundInquiry(app, brain, { from, subject, body, agent_hint }) {
  const pool = app.get('pool');
  const ai = app.get('ai');
  const transporter = app.get('smtp');

  // Route to agent
  const agentId = agent_hint || detectAgentFromContent(subject + ' ' + body);
  const runId = crypto.randomUUID();

  console.log(`[INBOUND] Routing inquiry from ${from} to ${agentId}`);

  try {
    // AI generates reply
    const replyBody = await ai.ask(
      `Respond to this inbound inquiry professionally:\nFrom: ${from}\nSubject: ${subject}\nMessage: ${body}\n\nWrite a complete, helpful response.`,
      SYSTEM_PROMPTS[agentId] || SYSTEM_PROMPTS.BUYER_OUTREACH
    );

    // Send reply
    await sendEmail(transporter, from, `Re: ${subject}`, replyBody, 'Saul Garcia ΓÇö Mexausa Food Group');

    // Brain event
    await fireBrainEvent(brain, 'inbound.inquiry.handled', {
      from, subject, agent_id: agentId, run_id: runId
    });

    // Log to DB
    await pool.query(
      `INSERT INTO autonomous_agent_logs (run_id, agent_id, contact_email, status, created_at)
       VALUES ($1,$2,$3,'inbound_replied',NOW())`,
      [runId, agentId, from]
    ).catch(() => {});

    console.log(`[INBOUND] Reply sent to ${from} via ${agentId}`);
  } catch (e) {
    console.error('[INBOUND] Handler failed:', e.message);
  }
}

function detectAgentFromContent(text) {
  const t = text.toLowerCase();
  if (t.includes('avocado')) return 'AVOCADO';
  if (t.includes('factor') || t.includes('invoice') || t.includes('finance') || t.includes('po ')) return 'FINANCE';
  if (t.includes('ship') || t.includes('freight') || t.includes('logistics') || t.includes('cold chain')) return 'LOGISTICS';
  if (t.includes('fsma') || t.includes('gap') || t.includes('certif') || t.includes('food safety')) return 'FOOD_SAFETY';
  if (t.includes('market') || t.includes('price') || t.includes('usda')) return 'MARKET_INTEL';
  if (t.includes('grower') || t.includes('tender') || t.includes('harvest')) return 'GROWER_TENDER';
  return 'BUYER_OUTREACH';
}

// ΓöÇΓöÇΓöÇ START ALL AGENTS ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function startAutonomousAgents(app, brain) {
  console.log('[AUTONOMOUS] Starting 8 autonomous email blast agents...');

  const agentList = Object.keys(AGENTS).filter(id => id !== 'PRODUCTION_REPORT');

  // Stagger initial runs ΓÇö don't blast all at once on startup
  agentList.forEach((agentId, idx) => {
    const agent = AGENTS[agentId];
    const initialDelay = (idx + 1) * 90000; // 90s stagger between agents

    setTimeout(() => {
      runAgent(app, brain, agentId);
      setInterval(() => runAgent(app, brain, agentId), agent.schedule_ms);
    }, initialDelay);

    console.log(`[AUTONOMOUS] ${agent.name} scheduled ΓÇö first run in ${Math.round(initialDelay/60000)}min, then every ${Math.round(agent.schedule_ms/3600000)}hr`);
  });

  // Production report every 2 hours ΓÇö first run after 5 minutes
  setTimeout(() => {
    runProductionReport(app, brain);
    setInterval(() => runProductionReport(app, brain), AGENTS.PRODUCTION_REPORT.schedule_ms);
  }, 5 * 60 * 1000);

  console.log('[AUTONOMOUS] Production report agent scheduled ΓÇö first run in 5min, then every 2hr');

  // Expose handler for inbound inquiries
  app.set('blastInbound', (inquiry) => handleInboundInquiry(app, brain, inquiry));

  console.log('[AUTONOMOUS] All 8 agents initialized. Blast engine running.');
}

module.exports = { startAutonomousAgents, runAgent, handleInboundInquiry, AGENTS };
