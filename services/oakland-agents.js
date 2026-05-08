// ============================================================================
// OAKLAND A'S 25 AI AGENTS — AuditDNA Agriculture Intelligence Corps
// Path: C:\AuditDNA\backend\services\oakland-agents.js
// 1989 World Series Champions — 25 agents, 25 real platform functions
// init(app, brain, pool) called from server.js on startup
// ============================================================================

const EventEmitter = require('events');
const express = require('express');

class OaklandAgents extends EventEmitter {
  constructor() {
    super();
    this.pool = null;
    this.ai = null;
    this.brain = null;
    this.stats = {};
    this.roster = this._buildRoster();
    Object.keys(this.roster).forEach(k => {
      this.stats[k] = { fired: 0, completed: 0, errors: 0, lastRun: null, lastResult: null };
    });
  }

  setPool(pool) { this.pool = pool; }
  setAI(ai)     { this.ai = ai; }
  setBrain(b)   { this.brain = b; }

  _buildRoster() {
    return {

      // 1 — RICKEY HENDERSON — Lead-Off Data Scout
      RICKEY: {
        number: 24, name: 'Rickey Henderson', position: 'LF',
        role: 'GROWER_SCOUT',
        description: 'First on base. Scans all new grower registrations and classifies them instantly.',
        trigger: 'GROWER_REGISTERED',
        outputEvent: 'GROWER_CLASSIFIED',
        job: async (payload, ctx) => {
          const { companyLegal, entityType, contactEmail, state, commodities } = payload;
          return await ctx.ai.si(`Classify grower: company="${companyLegal}", type="${entityType}", email="${contactEmail}", state="${state}", commodities="${commodities}". Return JSON: { tier: "TIER_0"|"TIER_1"|"TIER_2"|"TIER_3", risk: "LOW"|"MEDIUM"|"HIGH", commodityGuess: string, priority: "NORMAL"|"HIGH"|"URGENT", notes: string, recommendedAction: string }`);
        },
      },

      // 2 — JOSE CANSECO — Power Commodity Analyst
      CANSECO: {
        number: 33, name: 'Jose Canseco', position: 'RF',
        role: 'COMMODITY_POWER_ANALYST',
        description: 'Power hitter. Runs heavy commodity price and volume analysis.',
        trigger: 'COMMODITY_INTEL',
        outputEvent: 'COMMODITY_ANALYSIS_COMPLETE',
        job: async (payload, ctx) => {
          const { commodity, region, qty, currentPrice } = payload;
          return await ctx.ai.si(`Analyze commodity: commodity="${commodity}", region="${region}", qty="${qty}", price=$${currentPrice}. Return JSON: { buySignal: boolean, sellSignal: boolean, priceTarget: number, confidence: number, marketCondition: "BULL"|"BEAR"|"NEUTRAL", reasoning: string, urgency: "LOW"|"MEDIUM"|"HIGH"|"CRITICAL" }`);
        },
      },

      // 3 — MARK McGWIRE — Deal Closer / Factoring Engine
      MCGWIRE: {
        number: 25, name: 'Mark McGwire', position: '1B',
        role: 'DEAL_CLOSER',
        description: 'Big swing deal closer. Evaluates factoring and financing eligibility.',
        trigger: 'INVOICE_SUBMITTED',
        outputEvent: 'FACTORING_DECISION',
        job: async (payload, ctx) => {
          const { invoiceAmount, growerId, buyer, commodity, dueDate } = payload;
          return await ctx.ai.si(`Evaluate factoring: invoice=$${invoiceAmount}, grower="${growerId}", buyer="${buyer}", commodity="${commodity}", due="${dueDate}". Return JSON: { approved: boolean, advanceRate: number, fee: number, risk: "LOW"|"MEDIUM"|"HIGH", decision: string, conditions: string[], estimatedFunding: string }`);
        },
      },

      // 4 — DAVE STEWART — Master Orchestrator / Ace
      STEWART: {
        number: 34, name: 'Dave Stewart', position: 'SP/ACE',
        role: 'MASTER_ORCHESTRATOR',
        description: 'The Ace. Orchestrates multi-module pipelines. Calls the plays.',
        trigger: 'OWNER_AUTOPILOT_START',
        outputEvent: 'ORCHESTRATION_COMPLETE',
        job: async (payload, ctx) => {
          const { role, activeModules } = payload;
          return await ctx.ai.si(`Orchestrate platform: role="${role}", modules=${JSON.stringify(activeModules||[])}. Return JSON: { priority_tasks: string[], assign_to: string[], alerts: string[], recommendations: string[], status: string }`);
        },
      },

      // 5 — DENNIS ECKERSLEY — Final Gate / Quality Approver
      ECKERSLEY: {
        number: 43, name: 'Dennis Eckersley', position: 'CLOSER',
        role: 'QUALITY_GATE',
        description: 'Nothing gets past Eck. Final compliance gate before any deal closes.',
        trigger: 'DEAL_FINAL_REVIEW',
        outputEvent: 'QUALITY_GATE_VERDICT',
        job: async (payload, ctx) => {
          const { growerId, buyerId, commodity, invoiceAmount, complianceScore } = payload;
          return await ctx.ai.si(`Final gate review: grower="${growerId}", buyer="${buyerId}", commodity="${commodity}", amount=$${invoiceAmount}, compliance=${complianceScore}. Return JSON: { approved: boolean, flags: string[], requiredDocs: string[], verdict: "CLEAR"|"HOLD"|"REJECT", reason: string }`);
        },
      },

      // 6 — DAVE HENDERSON — Clutch Intel / Hot Leads
      DHENDERSON: {
        number: 42, name: 'Dave Henderson', position: 'CF',
        role: 'HOT_LEADS_ENGINE',
        description: 'Clutch performer. Identifies hot leads and buyer intent signals.',
        trigger: 'BUYER_VIEWED',
        outputEvent: 'LEAD_TEMPERATURE_SCORED',
        job: async (payload, ctx) => {
          const { buyerId, commodity, searchQuery, pageViews } = payload;
          return await ctx.ai.si(`Lead temperature: buyer="${buyerId}", commodity="${commodity}", searches="${searchQuery}", views=${pageViews||0}. Return JSON: { temperature: "COLD"|"WARM"|"HOT"|"ON_FIRE", intentScore: number, recommendedAction: string, bestContactTime: string, suggestedOffer: string }`);
        },
      },

      // 7 — DAVE PARKER — Campaign Veteran / Email Blast
      PARKER: {
        number: 39, name: 'Dave Parker', position: 'DH',
        role: 'EMAIL_BLAST_ENGINE',
        description: 'Veteran power. Crafts targeted email campaigns for buyer segments.',
        trigger: 'EMAIL_CAMPAIGN_QUEUED',
        outputEvent: 'EMAIL_CAMPAIGN_GENERATED',
        job: async (payload, ctx) => {
          const { commodity, segment, targetCount, pricePoint } = payload;
          return await ctx.ai.si(`Generate email campaign: commodity="${commodity}", segment="${segment}", targets=${targetCount||0}, price=$${pricePoint||0}. Return JSON: { subject: string, previewText: string, headline: string, body: string, cta: string, urgencyFlag: boolean, bestSendTime: string }`);
        },
      },

      // 8 — CARNEY LANSFORD — Compliance Monitor
      LANSFORD: {
        number: 4, name: 'Carney Lansford', position: '3B',
        role: 'COMPLIANCE_MONITOR',
        description: 'Rock solid. Monitors cert expiry, flags gaps, triggers renewals.',
        trigger: 'COMPLIANCE_CHECK_REQUESTED',
        outputEvent: 'COMPLIANCE_AUDIT_COMPLETE',
        job: async (payload, ctx) => {
          const { growerId, certs, uploadTypes, lastUpload } = payload;
          return await ctx.ai.si(`Compliance audit: grower="${growerId}", certs=${JSON.stringify(certs||[])}, uploads=${JSON.stringify(uploadTypes||[])}, lastUpload="${lastUpload}". Return JSON: { score: number, tier: string, gaps: string[], expiring: string[], critical: boolean, requiredActions: string[], daysUntilViolation: number }`);
        },
      },

      // 9 — WALT WEISS — CRM Connector
      WEISS: {
        number: 7, name: 'Walt Weiss', position: 'SS',
        role: 'CRM_CONNECTOR',
        description: 'Steady shortstop. Connects grower and buyer records across the CRM mesh.',
        trigger: 'BUYER_STAGED',
        outputEvent: 'CRM_MATCH_COMPLETE',
        job: async (payload, ctx) => {
          const { buyerId, commodity, region, volume } = payload;
          return await ctx.ai.si(`Match buyer to growers: buyer="${buyerId}", commodity="${commodity}", region="${region}", volume="${volume}". Return JSON: { matchScore: number, recommendedGrowers: string[], matchReason: string, estimatedDeal: string, nextStep: string }`);
        },
      },

      // 10 — TERRY STEINBACH — Data Receiver / Upload Intake
      STEINBACH: {
        number: 36, name: 'Terry Steinbach', position: 'C',
        role: 'UPLOAD_INTAKE',
        description: 'Behind the plate. Receives all uploaded reports and validates them.',
        trigger: 'WATER_TEST_UPLOADED',
        outputEvent: 'UPLOAD_VALIDATED',
        job: async (payload, ctx) => {
          const { uploadType, fileName, growerId, rawData } = payload;
          return await ctx.ai.si(`Validate upload: type="${uploadType}", file="${fileName}", grower="${growerId}", data=${JSON.stringify(rawData||{})}. Return JSON: { valid: boolean, confidence: number, extractedValues: object, anomalies: string[], passesThreshold: boolean, labAccredited: boolean, notes: string }`);
        },
      },

      // 11 — MIKE GALLEGO — Cross-Module Router
      GALLEGO: {
        number: 9, name: 'Mike Gallego', position: '2B',
        role: 'CROSS_MODULE_ROUTER',
        description: 'Utility infielder. Routes events between modules, keeps data mesh alive.',
        trigger: 'MODULE_NAVIGATE',
        outputEvent: 'MODULE_ROUTED',
        job: async (payload, ctx) => {
          const { module, section, role } = payload;
          return await ctx.ai.si(`Route navigation: module="${module}", section="${section}", role="${role}". Return JSON: { preloadModules: string[], dataToFetch: string[], alerts: string[], suggestedActions: string[] }`);
        },
      },

      // 12 — BOB WELCH — USDA Intelligence Engine
      WELCH: {
        number: 35, name: 'Bob Welch', position: 'SP',
        role: 'USDA_INTEL',
        description: 'Cy Young pitcher. Pulls and interprets USDA market data.',
        trigger: 'USDA_DATA_REQUESTED',
        outputEvent: 'USDA_ANALYSIS_COMPLETE',
        job: async (payload, ctx) => {
          const { commodity, region, week } = payload;
          return await ctx.ai.si(`Analyze USDA data: commodity="${commodity}", region="${region}", week="${week}". Return JSON: { avgPrice: number, priceDirection: "UP"|"DOWN"|"STABLE", volumeTrend: string, recommendation: string, marketAlert: boolean, alertReason: string }`);
        },
      },

      // 13 — MIKE MOORE — Grower Intelligence Engine
      MOORE: {
        number: 10, name: 'Mike Moore', position: 'SP',
        role: 'GROWER_INTEL',
        description: 'Consistent starter. Deep grower profile analysis and risk scoring.',
        trigger: 'GROWER_HUB_OPENED',
        outputEvent: 'GROWER_PROFILE_BUILT',
        job: async (payload, ctx) => {
          const { growerId, commodity, state, complianceScore } = payload;
          return await ctx.ai.si(`Profile grower: id="${growerId}", commodity="${commodity}", state="${state}", compliance=${complianceScore||0}. Return JSON: { riskScore: number, riskTier: string, strengths: string[], weaknesses: string[], opportunities: string[], recommendedNext: string }`);
        },
      },

      // 14 — STORM DAVIS — Weather Market Intelligence
      SDAVIS: {
        number: 31, name: 'Storm Davis', position: 'SP',
        role: 'WEATHER_MARKET_INTEL',
        description: 'Storm specialist. Correlates weather events with commodity price impacts.',
        trigger: 'WEATHER_ALERT_RECEIVED',
        outputEvent: 'WEATHER_MARKET_ANALYZED',
        job: async (payload, ctx) => {
          const { region, weatherEvent, severity, commodities } = payload;
          return await ctx.ai.si(`Weather-market impact: region="${region}", event="${weatherEvent}", severity="${severity}", commodities=${JSON.stringify(commodities||[])}. Return JSON: { priceImpact: object, supplyRisk: string, buyNow: string[], waitOn: string[], alertBuyers: boolean, estimatedDuration: string }`);
        },
      },

      // 15 — RICK HONEYCUTT — Compliance Repair Specialist
      HONEYCUTT: {
        number: 45, name: 'Rick Honeycutt', position: 'LHP',
        role: 'COMPLIANCE_REPAIR',
        description: 'Relief specialist. Fixes compliance gaps and generates remediation plans.',
        trigger: 'COMPLIANCE_GAP_DETECTED',
        outputEvent: 'REMEDIATION_PLAN_GENERATED',
        job: async (payload, ctx) => {
          const { growerId, gaps, tier, daysUntilViolation } = payload;
          return await ctx.ai.si(`Remediation plan: grower="${growerId}", gaps=${JSON.stringify(gaps||[])}, tier="${tier}", daysLeft=${daysUntilViolation||0}. Return JSON: { steps: string[], priority: string[], estimatedCost: string, estimatedDays: number, resourceLinks: string[], urgencyMessage: string }`);
        },
      },

      // 16 — TODD BURNS — Brain Event Logger
      BURNS: {
        number: 40, name: 'Todd Burns', position: 'RP',
        role: 'BRAIN_EVENT_LOGGER',
        description: 'Reliable reliever. Logs and categorizes all brain events for audit trails.',
        trigger: 'ANY',
        outputEvent: 'EVENT_CATEGORIZED',
        job: async (payload, ctx) => {
          const { type, module, role } = payload;
          return await ctx.ai.si(`Categorize event: type="${type}", module="${module}", role="${role}". Return JSON: { category: string, priority: "LOW"|"NORMAL"|"HIGH"|"CRITICAL", requiresAction: boolean, routeTo: string[], logLevel: "INFO"|"WARN"|"ALERT" }`);
        },
      },

      // 17 — GENE NELSON — Notification Engine
      NELSON: {
        number: 50, name: 'Gene Nelson', position: 'RP',
        role: 'NOTIFICATION_ENGINE',
        description: 'Middle reliever. Generates smart notifications and ntfy alerts.',
        trigger: 'NOTIFICATION_REQUESTED',
        outputEvent: 'NOTIFICATION_GENERATED',
        job: async (payload, ctx) => {
          const { eventType, recipient, data } = payload;
          return await ctx.ai.si(`Generate notification: event="${eventType}", recipient="${recipient}", data=${JSON.stringify(data||{})}. Return JSON: { title: string, body: string, urgency: "LOW"|"NORMAL"|"HIGH"|"CRITICAL", channel: "ntfy"|"email"|"sms"|"all", action: string }`);
        },
      },

      // 18 — ERIC PLUNK — Price Alert Engine
      PLUNK: {
        number: 30, name: 'Eric Plunk', position: 'RP',
        role: 'PRICE_ALERT_ENGINE',
        description: 'Power reliever. Fires price alerts when thresholds are crossed.',
        trigger: 'PRICE_THRESHOLD_CROSSED',
        outputEvent: 'PRICE_ALERT_FIRED',
        job: async (payload, ctx) => {
          const { commodity, currentPrice, threshold, direction } = payload;
          return await ctx.ai.si(`Price alert: commodity="${commodity}", price=$${currentPrice}, threshold=$${threshold}, direction="${direction}". Return JSON: { alertMessage: string, severity: "INFO"|"WARNING"|"CRITICAL", recommendedAction: string, targetBuyers: string, window: string }`);
        },
      },

      // 19 — STAN JAVIER — Bilingual Translation Engine
      JAVIER: {
        number: 22, name: 'Stan Javier', position: 'OF',
        role: 'BILINGUAL_ENGINE',
        description: 'Versatile outfielder. Handles all EN/ES translation for the platform.',
        trigger: 'TRANSLATION_REQUESTED',
        outputEvent: 'TRANSLATION_COMPLETE',
        job: async (payload, ctx) => {
          const { text, fromLang, toLang, context } = payload;
          return await ctx.ai.si(`Translate: text="${text}", from="${fromLang}", to="${toLang}", context="${context}". Return JSON: { translation: string, confidence: number, regionalNotes: string, alternativeTerms: string[] }`);
        },
      },

      // 20 — RON HASSEY — Backup SMTP / Comms Handler
      HASSEY: {
        number: 15, name: 'Ron Hassey', position: 'C',
        role: 'COMMS_BACKUP',
        description: 'Backup catcher. Handles email delivery failures and retry logic.',
        trigger: 'EMAIL_DELIVERY_FAILED',
        outputEvent: 'COMMS_RETRY_PLAN',
        job: async (payload, ctx) => {
          const { recipient, subject, error, attempts } = payload;
          return await ctx.ai.si(`Email failure: to="${recipient}", subject="${subject}", error="${error}", attempts=${attempts||0}. Return JSON: { diagnosis: string, retry: boolean, retryDelay: number, alternativeChannel: string, action: string }`);
        },
      },

      // 21 — LANCE BLANKENSHIP — Field Operations Agent
      BLANKENSHIP: {
        number: 21, name: 'Lance Blankenship', position: 'UTILITY',
        role: 'FIELD_OPS',
        description: 'Utility player. Handles mobile field uploads and QR traceability scans.',
        trigger: 'FIELD_UPLOAD_RECEIVED',
        outputEvent: 'FIELD_UPLOAD_PROCESSED',
        job: async (payload, ctx) => {
          const { uploadType, growerId, gpsLat, gpsLng, commodity } = payload;
          return await ctx.ai.si(`Process field upload: type="${uploadType}", grower="${growerId}", gps="${gpsLat},${gpsLng}", commodity="${commodity}". Return JSON: { valid: boolean, lotNumber: string, qualityFlag: "PASS"|"WARN"|"FAIL", notes: string, nextStep: string }`);
        },
      },

      // 22 — FELIX JOSE — New Grower Onboarding
      JOSE: {
        number: 17, name: 'Felix Jose', position: 'OF',
        role: 'GROWER_ONBOARDING',
        description: 'Young talent. Guides new growers through the full onboarding sequence.',
        trigger: 'GROWER_HUB_TAB',
        outputEvent: 'ONBOARDING_GUIDANCE_SENT',
        job: async (payload, ctx) => {
          const { tab, growerId } = payload;
          return await ctx.ai.si(`Onboarding guidance: tab="${tab}", grower="${growerId}". Return JSON: { nextStep: string, completionPercent: number, missingItems: string[], encouragement: string, estimatedTimeToComplete: string }`);
        },
      },

      // 23 — GLENN HUBBARD — Traceability Engine
      HUBBARD: {
        number: 17, name: 'Glenn Hubbard', position: '2B',
        role: 'TRACEABILITY_ENGINE',
        description: 'Steady second baseman. Builds and verifies full chain of custody for every lot.',
        trigger: 'TRACEABILITY_LOT_UPLOADED',
        outputEvent: 'TRACEABILITY_CHAIN_BUILT',
        job: async (payload, ctx) => {
          const { lotNumber, growerId, commodity, harvestDate } = payload;
          return await ctx.ai.si(`Traceability chain: lot="${lotNumber}", grower="${growerId}", commodity="${commodity}", harvest="${harvestDate}". Return JSON: { chainComplete: boolean, fsma204Ready: boolean, missingLinks: string[], lotStatus: string, traceScore: number, recommendations: string[] }`);
        },
      },

      // 24 — TONY La RUSSA — Master Command Brain / Manager
      LARUSSA: {
        number: 10, name: 'Tony La Russa', position: 'MANAGER',
        role: 'MASTER_COMMAND',
        description: 'The Manager. Reads the full platform state and calls the right play at the right time.',
        trigger: 'OWNER_AUTOPILOT_COMPLETE',
        outputEvent: 'STRATEGIC_PLAY_CALLED',
        job: async (payload, ctx) => {
          const { tasks, activeUsers, pendingDeals, growerCount, buyerCount } = payload;
          return await ctx.ai.si(`Strategic review: tasks=${JSON.stringify(tasks||[])}, users=${activeUsers||0}, deals=${pendingDeals||0}, growers=${growerCount||0}, buyers=${buyerCount||0}. Return JSON: { topPriority: string, callToAction: string, riskAlerts: string[], opportunities: string[], agentsToActivate: string[], platformHealth: "OPTIMAL"|"GOOD"|"NEEDS_ATTENTION"|"CRITICAL" }`);
        },
      },

      // 25 — DAVE DUNCAN — AI Learning Engine / Pitching Coach
      DUNCAN: {
        number: 18, name: 'Dave Duncan', position: 'PITCHING_COACH',
        role: 'AI_LEARNING_ENGINE',
        description: 'The Coach. Learns from every session and improves all agent accuracy.',
        trigger: 'SESSION_ENDED',
        outputEvent: 'LEARNING_CYCLE_COMPLETE',
        job: async (payload, ctx) => {
          const { sessionId, events, errors, userRole } = payload;
          return await ctx.ai.si(`Learning analysis: id="${sessionId}", events=${events||0}, errors=${errors||0}, role="${userRole}". Return JSON: { learningPoints: string[], agentImprovements: object, commonPatterns: string[], suggestedFixes: string[], overallScore: number }`);
        },
      },

    };
  }

  // ============================================================================
  // FIRE AN AGENT
  // ============================================================================
  async fire(agentKey, payload) {
    const agent = this.roster[agentKey];
    if (!agent) return { error: 'Agent not found: ' + agentKey };
    if (!this.ai) return { error: 'AI not initialized on Oakland Agents' };

    this.stats[agentKey].fired++;
    this.stats[agentKey].lastRun = new Date().toISOString();

    try {
      const ctx = { ai: this.ai, pool: this.pool, brain: this.brain };
      const result = await agent.job(payload, ctx);

      this.stats[agentKey].completed++;
      this.stats[agentKey].lastResult = result;

      if (this.pool) {
        this.pool.query(
          `INSERT INTO brain_events (type, payload, created_at) VALUES ($1, $2, NOW())`,
          [agent.outputEvent, JSON.stringify({ agentKey, agentName: agent.name, result })]
        ).catch(() => {});
      }

      this.emit(agent.outputEvent, { agentKey, result, payload });
      console.log(`[OAKLAND:${agentKey}] ${agent.name} fired -> ${agent.outputEvent}`);
      return { success: true, agent: agent.name, event: agent.outputEvent, result };
    } catch (err) {
      this.stats[agentKey].errors++;
      console.error(`[OAKLAND:${agentKey}] Error:`, err.message);
      return { error: err.message, agent: agent.name };
    }
  }

  // ============================================================================
  // BIND TO BRAIN EVENTS — auto-fire agents based on triggers
  // ============================================================================
  bindToBrainEvents() {
    if (!this.pool) return;

    // Add processed column if missing
    this.pool.query(
      `ALTER TABLE brain_events ADD COLUMN IF NOT EXISTS processed_by_oakland TIMESTAMPTZ`
    ).catch(() => {});

    // Poll every 30 seconds for new brain events
    setInterval(async () => {
      try {
        const r = await this.pool.query(
          `SELECT id, type, payload FROM brain_events WHERE processed_by_oakland IS NULL ORDER BY id DESC LIMIT 20`
        ).catch(() => ({ rows: [] }));

        for (const row of r.rows) {
          const matchingAgents = Object.entries(this.roster)
            .filter(([, a]) => a.trigger === row.type || a.trigger === 'ANY')
            .map(([key]) => key);

          for (const key of matchingAgents) {
            const p = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload || {};
            await this.fire(key, p);
          }

          await this.pool.query(
            `UPDATE brain_events SET processed_by_oakland = NOW() WHERE id = $1`, [row.id]
          ).catch(() => {});
        }
      } catch (e) {
        // silent
      }
    }, 30000);

    console.log('[OAKLAND] Brain event polling active — 30s intervals');
  }

  // ============================================================================
  // STATUS
  // ============================================================================
  getStatus() {
    return Object.entries(this.roster).map(([key, agent]) => ({
      key,
      number:      agent.number,
      name:        agent.name,
      position:    agent.position,
      role:        agent.role,
      description: agent.description,
      trigger:     agent.trigger,
      outputEvent: agent.outputEvent,
      stats:       this.stats[key] || {},
    }));
  }

  // ============================================================================
  // INIT — called from server.js
  // ============================================================================
  init(app, brain, pool) {
    this.pool  = pool  || global.db;
    this.brain = brain;
    this.ai    = (brain && brain.ai) ? brain.ai : (app ? app.get('ai') : null);

    this.bindToBrainEvents();

    const router = express.Router();

    // GET /api/oakland/roster
    router.get('/roster', (req, res) => {
      res.json({ success: true, agents: this.getStatus(), total: 25 });
    });

    // GET /api/oakland/stats
    router.get('/stats', (req, res) => {
      res.json({ success: true, stats: this.stats });
    });

    // GET /api/oakland/agent/:key
    router.get('/agent/:key', (req, res) => {
      const key = req.params.key.toUpperCase();
      const agent = this.roster[key];
      if (!agent) return res.status(404).json({ error: 'Agent not found' });
      res.json({ success: true, agent: { ...agent, stats: this.stats[key] } });
    });

    // POST /api/oakland/fire/:agent — manually fire any agent
    router.post('/fire/:agent', async (req, res) => {
      const key = req.params.agent.toUpperCase();
      const result = await this.fire(key, req.body || {});
      res.json(result);
    });

    // POST /api/oakland/fire-all
    router.post('/fire-all', async (req, res) => {
      const results = {};
      for (const key of Object.keys(this.roster)) {
        results[key] = await this.fire(key, req.body || {});
      }
      res.json({ success: true, results });
    });

    app.use('/api/oakland', router);

    console.log('[OK] Oakland A\'s 25 AI Agents ONLINE --> /api/oakland/*');
    console.log('[LINEUP] Tony La Russa (MGR) | Stewart (ACE) | Eckersley (CL) | Rickey | Canseco | McGwire + 19 more');
  }
}

const oaklandAgents = new OaklandAgents();
module.exports = oaklandAgents;
