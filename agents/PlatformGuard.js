// ============================================================================
// PlatformGuard.js — AuditDNA Self-Healing Platform Health System
// 50 health agents | Auto-deploy fixes | ntfy smartwatch alerts
// Save to: C:\AuditDNA\backend\agents\PlatformGuard.js
// Mount in server.js: require('./agents/PlatformGuard').start(app, pool);
// ============================================================================

const fetch = (...a) => import('node-fetch').then(({ default: f }) => f(...a));
const https = require('https');

const BASE        = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : 'http://localhost:5050';
const NTFY_TOPIC  = process.env.NTFY_TOPIC  || 'mexausa-saul';
const NTFY_URL    = `https://ntfy.sh/${NTFY_TOPIC}`;
const GH_TOKEN = process.env.GITHUB_TOKEN;
const GH_REPO     = 'SeabassFather/auditdna-backend-1';
const GH_BRANCH   = 'main';

// ── NTFY ALERT ────────────────────────────────────────────────────────────────
async function alert(title, msg, priority = 'default') {
  try {
    await fetch(NTFY_URL, {
      method: 'POST',
      headers: {
        'Title': title,
        'Priority': priority,
        'Tags': priority === 'urgent' ? 'rotating_light' : 'white_check_mark',
        'Content-Type': 'text/plain',
      },
      body: msg,
    });
  } catch (e) { console.error('[GUARD] ntfy fail:', e.message); }
}

// ── GITHUB AUTO-PATCH ─────────────────────────────────────────────────────────
async function githubPatchServerJS(routeName, routePath) {
  try {
    // Get current server.js from GitHub
    const getRes = await fetch(
      `https://api.github.com/repos/${GH_REPO}/contents/server.js?ref=${GH_BRANCH}`,
      { headers: { Authorization: `token ${GH_TOKEN}`, Accept: 'application/vnd.github.v3+json' } }
    );
    if (!getRes.ok) throw new Error(`GitHub GET failed: ${getRes.status}`);
    const { content, sha } = await getRes.json();
    let code = Buffer.from(content, 'base64').toString('utf8');

    // Check if already mounted
    if (code.includes(routePath)) {
      console.log(`[GUARD] ${routeName} already in server.js — skipping patch`);
      return false;
    }

    // Inject before last app.listen or at end of route block
    const injection = `\ntry { app.use('${routeName}', require('${routePath}')); console.log('[OK] ${routeName} auto-healed'); } catch(e) { console.error('[FAIL] ${routeName}:', e.message); }`;
    const anchor = `app.use('/api/auth', require('./routes/pin-verify'));`;
    if (code.includes(anchor)) {
      code = code.replace(anchor, injection + '\n' + anchor);
    } else {
      code += injection;
    }

    // Push patch to GitHub
    const putRes = await fetch(
      `https://api.github.com/repos/${GH_REPO}/contents/server.js`,
      {
        method: 'PUT',
        headers: { Authorization: `token ${GH_TOKEN}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `fix(auto-heal): mount ${routeName} via PlatformGuard`,
          content: Buffer.from(code).toString('base64'),
          sha,
          branch: GH_BRANCH,
        }),
      }
    );
    if (!putRes.ok) throw new Error(`GitHub PUT failed: ${putRes.status}`);
    console.log(`[GUARD] AUTO-HEALED: ${routeName} pushed to GitHub — Railway redeploy triggered`);
    await alert(`AUTO-HEAL: ${routeName}`, `Route ${routeName} was missing. PlatformGuard patched server.js and pushed to GitHub. Railway redeploying now.`, 'high');
    return true;
  } catch (e) {
    console.error(`[GUARD] GitHub patch failed for ${routeName}:`, e.message);
    return false;
  }
}

// ── ROUTE HEALTH CHECK ────────────────────────────────────────────────────────
async function checkRoute(method, path, expectedStatus = [200, 201, 400, 401, 403]) {
  try {
    const res = await fetch(`${BASE}${path}`, { method, headers: { 'Content-Type': 'application/json' }, timeout: 8000 });
    return { ok: expectedStatus.includes(res.status), status: res.status };
  } catch (e) {
    return { ok: false, status: 0, error: e.message };
  }
}

// ── DB HEALTH ─────────────────────────────────────────────────────────────────
async function checkDB(pool) {
  try {
    await pool.query('SELECT 1');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ── 50 AGENTS DEFINITION ──────────────────────────────────────────────────────
function buildAgents(pool) {
  return [
    // CORE HEALTH
    { name: 'HEALTH_MAIN',        interval: 60,   run: () => checkRoute('GET',  '/health') },
    { name: 'HEALTH_API',         interval: 60,   run: () => checkRoute('GET',  '/api/brain/status') },
    { name: 'DB_POSTGRES',        interval: 120,  run: () => checkDB(pool) },

    // AUTH
    { name: 'AUTH_VERIFY',        interval: 300,  run: () => checkRoute('POST', '/api/auth/verify') },
    { name: 'AUTH_PIN',           interval: 300,  run: () => checkRoute('POST', '/api/auth/pin-verify') },

    // CRM
    { name: 'CRM_CONTACTS',       interval: 300,  run: () => checkRoute('GET',  '/api/gmail/contacts') },
    { name: 'CRM_ALL_CONTACTS',   interval: 600,  run: () => checkRoute('GET',  '/api/crm/all-contacts') },
    { name: 'CRM_SEGMENTS',       interval: 600,  run: () => checkRoute('GET',  '/api/crm/segments') },
    { name: 'CRM_BUYERS',         interval: 600,  run: () => checkRoute('GET',  '/api/buyers') },
    { name: 'CRM_GROWERS',        interval: 600,  run: () => checkRoute('GET',  '/api/crm/growers') },

    // LOAF
    { name: 'LOAF_LAUNCH',        interval: 300,  run: () => checkRoute('GET',  '/api/loaf/listings') },
    { name: 'LOAF_WHATSAPP',      interval: 600,  run: () => checkRoute('GET',  '/api/loaf/whatsapp/status') },
    { name: 'LOAF_CONSOLIDATOR',  interval: 600,  run: () => checkRoute('GET',  '/api/loaf/loads') },
    { name: 'LOAF_FRESHNESS',     interval: 600,  run: () => checkRoute('GET',  '/api/loaf/freshness') },

    // LAND LISTINGS
    { name: 'LAND_LISTINGS',      interval: 300,  run: () => checkRoute('GET',  '/api/land-listings'),
      routeName: '/api/land-listings', routePath: './routes/land-listings' },
    { name: 'LAND_UPLOAD',        interval: 300,  run: () => checkRoute('GET',  '/api/land-listings/template'),
      routeName: '/api/land-listings', routePath: './routes/land-listings-upload' },

    // BRAIN / AI
    { name: 'BRAIN_STATUS',       interval: 120,  run: () => checkRoute('GET',  '/api/brain/status') },
    { name: 'BRAIN_EVENTS',       interval: 180,  run: () => checkRoute('GET',  '/api/brain/health') },
    { name: 'ENRIQUE_AGENT',      interval: 300,  run: () => checkRoute('GET',  '/api/brain/status') },
    { name: 'OAKLAND_AGENTS',     interval: 300,  run: () => checkRoute('GET',  '/api/oakland/status') },

    // EMAIL / BLAST
    { name: 'GMAIL_ROUTES',       interval: 300,  run: () => checkRoute('GET',  '/api/gmail/contacts') },
    { name: 'CAMPAIGNS',          interval: 300,  run: () => checkRoute('GET',  '/api/campaigns') },
    { name: 'BLAST_TEMPLATES',    interval: 600,  run: () => checkRoute('GET',  '/api/blast-templates') },
    { name: 'AUTONOMOUS_BLAST',   interval: 300,  run: () => checkRoute('GET',  '/api/blast/status') },
    { name: 'INBOX_SORTER',       interval: 300,  run: () => checkRoute('GET',  '/api/inbox') },

    // GROWER PIPELINE
    { name: 'GROWER_PIPELINE',    interval: 300,  run: () => checkRoute('GET',  '/api/grower/pipeline') },
    { name: 'GROWER_ONBOARD',     interval: 600,  run: () => checkRoute('GET',  '/api/grower/queue') },
    { name: 'GROWER_INTEL',       interval: 600,  run: () => checkRoute('GET',  '/api/grower/intel') },

    // MARKET INTELLIGENCE
    { name: 'USDA_MARKETS',       interval: 600,  run: () => checkRoute('GET',  '/api/usda-market-intel/status') },
    { name: 'COMMODITY_SEARCH',   interval: 300,  run: () => checkRoute('GET',  '/api/commodity/search?q=lettuce') },
    { name: 'PRICE_INTEL',        interval: 600,  run: () => checkRoute('GET',  '/api/ai/predict-price') },
    { name: 'COMMODITY_TAGS',     interval: 600,  run: () => checkRoute('GET',  '/api/commodity-tags') },

    // FINANCIAL
    { name: 'FACTOR_ENGINE',      interval: 300,  run: () => checkRoute('GET',  '/api/factor') },
    { name: 'ESCROW_ENGINE',      interval: 300,  run: () => checkRoute('GET',  '/api/escrow') },
    { name: 'FINANCING',          interval: 600,  run: () => checkRoute('GET',  '/api/financing/admin/dashboard') },
    { name: 'DEAL_FLOOR',         interval: 600,  run: () => checkRoute('GET',  '/api/stream') },

    // COMPLIANCE
    { name: 'COMPLIANCE_CENTER',  interval: 600,  run: () => checkRoute('GET',  '/api/compliance-center') },
    { name: 'PRODUCTION_DECL',    interval: 600,  run: () => checkRoute('GET',  '/api/production-declaration') },
    { name: 'MANIFEST_INTAKE',    interval: 600,  run: () => checkRoute('GET',  '/api/manifest') },

    // NADINE / SPONSOR
    { name: 'NADINE_QUEUE',       interval: 180,  run: () => checkRoute('GET',  '/api/nadine/sponsor/queue') },
    { name: 'NADINE_SPONSOR',     interval: 300,  run: () => checkRoute('GET',  '/api/nadine/sponsor/queue') },

    // PROPERTY / REAL ESTATE
    { name: 'PROPERTIES',         interval: 600,  run: () => checkRoute('GET',  '/api/properties') },

    // COMMS
    { name: 'INTERNAL_INBOX',     interval: 300,  run: () => checkRoute('GET',  '/api/inbox') },
    { name: 'MESSENGER',          interval: 300,  run: () => checkRoute('GET',  '/api/inbox') },

    // MOBILE / FIELD
    { name: 'MOBILE_WORKSPACE',   interval: 600,  run: () => checkRoute('GET',  '/api/mobile/status') },
    { name: 'FIELD_REPS',         interval: 600,  run: () => checkRoute('GET',  '/api/field-reps') },

    // AGENTS
    { name: 'AGENTS_ROUTE',       interval: 300,  run: () => checkRoute('GET',  '/api/agents') },
    { name: 'AUTONOMY_LOOP',      interval: 300,  run: () => checkRoute('GET',  '/api/autonomy/status') },
    { name: 'WESOURCE',           interval: 600,  run: () => checkRoute('GET',  '/api/wesource') },
    { name: 'NINER_BRIDGE',       interval: 300,  run: () => checkRoute('GET',  '/api/niner/status') },

    // SOURCING
    { name: 'SOURCING_BLAST',     interval: 600,  run: () => checkRoute('GET',  '/api/sourcing') },
    { name: 'MATCH_ENGINE',       interval: 300,  run: () => checkRoute('GET',  '/api/match') },
  ];
}

// ── HEALTH STATE ──────────────────────────────────────────────────────────────
const healthState = {};
const failCounts  = {};
const lastChecked = {};
const FAIL_THRESHOLD = 2; // alert after 2 consecutive failures

// ── RUN ONE AGENT ─────────────────────────────────────────────────────────────
async function runAgent(agent) {
  const result = await agent.run();
  lastChecked[agent.name] = new Date().toISOString();

  if (!result.ok) {
    failCounts[agent.name] = (failCounts[agent.name] || 0) + 1;
    healthState[agent.name] = 'FAIL';
    console.error(`[GUARD][${agent.name}] FAIL — status ${result.status || result.error} (x${failCounts[agent.name]})`);

    if (failCounts[agent.name] >= FAIL_THRESHOLD) {
      // Send ntfy alert
      await alert(
        `PLATFORM FAIL: ${agent.name}`,
        `Agent ${agent.name} has failed ${failCounts[agent.name]} times. Status: ${result.status || result.error}. Auto-heal attempting...`,
        'urgent'
      );

      // Attempt auto-heal if route info provided
      if (agent.routeName && agent.routePath && failCounts[agent.name] === FAIL_THRESHOLD) {
        const healed = await githubPatchServerJS(agent.routeName, agent.routePath);
        if (healed) {
          await alert(`AUTO-HEAL FIRED: ${agent.name}`, `PlatformGuard pushed fix to GitHub. Railway redeploy triggered. Check in 90 seconds.`, 'high');
        }
      }
    }
  } else {
    if (healthState[agent.name] === 'FAIL' && failCounts[agent.name] >= FAIL_THRESHOLD) {
      // Recovery alert
      await alert(`RECOVERED: ${agent.name}`, `Agent ${agent.name} is back online.`, 'low');
    }
    failCounts[agent.name] = 0;
    healthState[agent.name] = 'OK';
  }
}

// ── HOURLY FULL REPORT ────────────────────────────────────────────────────────
async function sendHourlyReport() {
  const failing = Object.entries(healthState).filter(([,v]) => v === 'FAIL').map(([k]) => k);
  const ok      = Object.entries(healthState).filter(([,v]) => v === 'OK').length;
  const total   = Object.keys(healthState).length;

  if (failing.length > 0) {
    await alert(
      `PLATFORM REPORT — ${failing.length} FAILING`,
      `OK: ${ok}/${total}\nFAILING: ${failing.join(', ')}`,
      'high'
    );
  } else if (total > 0) {
    await alert(
      `PLATFORM REPORT — ALL CLEAR`,
      `All ${total} agents reporting healthy. AuditDNA is solid.`,
      'low'
    );
  }
}

// ── START ALL AGENTS ──────────────────────────────────────────────────────────
function start(app, pool) {
  const agents = buildAgents(pool);
  console.log(`[GUARD] PlatformGuard starting — ${agents.length} agents initializing...`);

  // Stagger initial runs to avoid thundering herd
  agents.forEach((agent, i) => {
    setTimeout(async () => {
      await runAgent(agent);
      // Then schedule on interval
      setInterval(() => runAgent(agent), agent.interval * 1000);
    }, i * 800); // 800ms stagger between agents
  });

  // Hourly report
  setInterval(sendHourlyReport, 60 * 60 * 1000);
  // First report after 5 min
  setTimeout(sendHourlyReport, 5 * 60 * 1000);

  console.log(`[GUARD] PlatformGuard LIVE — ${agents.length} agents armed. ntfy: ${NTFY_TOPIC}`);

  // ── STATUS ENDPOINT ──────────────────────────────────────────────────────────
  app.get('/api/guard/status', (req, res) => {
    const agents = buildAgents(pool);
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      totalAgents: agents.length,
      healthy: Object.values(healthState).filter(v => v === 'OK').length,
      failing: Object.values(healthState).filter(v => v === 'FAIL').length,
      unknown: agents.length - Object.keys(healthState).length,
      agents: agents.map(a => ({
        name: a.name,
        status: healthState[a.name] || 'PENDING',
        failCount: failCounts[a.name] || 0,
        lastChecked: lastChecked[a.name] || null,
        interval: a.interval,
      })),
    });
  });

  // Force re-check a specific agent
  app.post('/api/guard/check/:agentName', async (req, res) => {
    const agent = agents.find(a => a.name === req.params.agentName);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    await runAgent(agent);
    res.json({ agent: agent.name, status: healthState[agent.name], failCount: failCounts[agent.name] || 0 });
  });

  // Force heal a specific agent
  app.post('/api/guard/heal/:agentName', async (req, res) => {
    const agent = agents.find(a => a.name === req.params.agentName);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    if (!agent.routeName) return res.status(400).json({ error: 'No auto-heal config for this agent' });
    const healed = await githubPatchServerJS(agent.routeName, agent.routePath);
    res.json({ agent: agent.name, healed, message: healed ? 'Patch pushed to GitHub. Railway redeploying.' : 'Patch failed or already mounted.' });
  });
}

module.exports = { start };
