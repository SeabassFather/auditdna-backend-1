// ========================================================================
// C:\AuditDNA\backend\routes\omegaKernel.js
// OMEGA KERNEL BACKEND ROUTES
// Mount in server.js:  app.use('/api/omega/kernel', require('./routes/omegaKernel'));
//
// Endpoints:
//   POST /api/omega/kernel/register    - module registration
//   POST /api/omega/kernel/heartbeat   - module liveness
//   GET  /api/omega/kernel/registry    - list all modules
//   POST /api/omega/kernel/error       - error capture
//   GET  /api/omega/kernel/errors      - error history
//   POST /api/omega/kernel/heal        - dispatch Claude heal agent
//   GET  /api/omega/kernel/heals       - heal history
//   POST /api/omega/kernel/orchestrate - cross-module workflow router
//   GET  /api/omega/kernel/health      - system health snapshot
// ========================================================================

const express = require('express');
const router = express.Router();

// In-memory stores. Move to PostgreSQL when ready.
const moduleRegistry = new Map(); // moduleId -> meta
const errorLog = []; // newest first
const healLog = []; // newest first
const eventLog = []; // newest first
const orchestrateLog = [];

const LOG_CAP = 1000;
const STALE_THRESHOLD_MS = 60000;

// ----------------------------------------------------------------------
// REGISTRATION
// ----------------------------------------------------------------------
router.post('/register', (req, res) => {
  const { moduleId, meta = {}, timestamp } = req.body || {};
  if (!moduleId) return res.status(400).json({ error: 'moduleId required' });
  moduleRegistry.set(moduleId, {
    ...meta,
    moduleId,
    registeredAt: timestamp || Date.now(),
    lastHeartbeat: Date.now()
  });
  res.json({ success: true, moduleId, total: moduleRegistry.size });
});

router.post('/heartbeat', (req, res) => {
  const { moduleId } = req.body || {};
  const mod = moduleRegistry.get(moduleId);
  if (mod) {
    mod.lastHeartbeat = Date.now();
    moduleRegistry.set(moduleId, mod);
  }
  res.json({ success: true, moduleId });
});

router.get('/registry', (req, res) => {
  res.json({
    modules: Array.from(moduleRegistry.values()),
    count: moduleRegistry.size,
    timestamp: Date.now()
  });
});

// ----------------------------------------------------------------------
// ERROR CAPTURE
// ----------------------------------------------------------------------
router.post('/error', (req, res) => {
  const entry = { ...req.body, receivedAt: Date.now() };
  errorLog.unshift(entry);
  if (errorLog.length > LOG_CAP) errorLog.length = LOG_CAP;
  console.error(`[OmegaKernel] ${entry.classification || 'ERROR'} in ${entry.moduleId}: ${entry.message}`);
  res.json({ success: true, errorId: entry.id });
});

router.get('/errors', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const moduleId = req.query.moduleId;
  let errors = errorLog;
  if (moduleId) errors = errors.filter(e => e.moduleId === moduleId);
  res.json({ errors: errors.slice(0, limit), total: errorLog.length });
});

// ----------------------------------------------------------------------
// AUTO-HEAL DISPATCH (Claude agent)
// ----------------------------------------------------------------------
router.post('/heal', async (req, res) => {
  const { moduleId, error, timestamp } = req.body || {};
  const entry = {
    moduleId, error, timestamp,
    dispatchedAt: Date.now(),
    agent: 'CLAUDE_HEAL_AGENT',
    status: 'dispatched'
  };

  // TODO: replace with actual Anthropic API call to suggest a fix.
  // Pseudocode:
  //   const fix = await anthropic.messages.create({
  //     model: 'claude-opus-4-7',
  //     max_tokens: 1024,
  //     messages: [{
  //       role: 'user',
  //       content: `Module ${moduleId} threw:\n${error.message}\n\nStack:\n${error.stack}\n\nSuggest a code fix.`
  //     }]
  //   });
  //   entry.suggestion = fix.content[0].text;

  // For now: log + acknowledge
  entry.suggestion = 'Claude agent dispatch stub - wire ANTHROPIC_API_KEY to enable.';

  healLog.unshift(entry);
  if (healLog.length > LOG_CAP) healLog.length = LOG_CAP;

  res.json({
    success: true,
    dispatched: true,
    agent: entry.agent,
    suggestion: entry.suggestion
  });
});

router.get('/heals', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  res.json({ heals: healLog.slice(0, limit), total: healLog.length });
});

// ----------------------------------------------------------------------
// ORCHESTRATION ROUTER
// ----------------------------------------------------------------------
const WORKFLOW_HANDLERS = {
  // Manifest pipeline - called from Omega manifest tab
  manifest_intake_pipeline: async (data) => ({
    matched: 0, blasted: 0, loafRouted: false,
    pipeline: ['categorize', 'match_buyers', 'blast_emails', 'loaf_route'],
    note: 'Wire actual handlers in /api/omega/manifest'
  }),
  manifest_match_buyers: async (data) => ({ matched: 0, note: 'Stub - implement against buyer_segments table' }),
  manifest_blast_emails: async (data) => ({ blasted: 0, note: 'Stub - call EmailMarketing service' }),
  manifest_loaf_route: async (data) => ({ routed: false, note: 'Stub - call LOAF gatekeeper' }),
  omega_manifest_pipeline: async (data) => ({ pipeline: 'started' }),
  // Add more workflows as they get wired
};

router.post('/orchestrate', async (req, res) => {
  const { workflow, data, moduleId, timestamp } = req.body || {};
  if (!workflow) return res.status(400).json({ error: 'workflow required' });

  const entry = { workflow, moduleId, timestamp, receivedAt: Date.now() };
  orchestrateLog.unshift(entry);
  if (orchestrateLog.length > LOG_CAP) orchestrateLog.length = LOG_CAP;

  const handler = WORKFLOW_HANDLERS[workflow];
  if (handler) {
    try {
      const result = await handler(data);
      res.json({ success: true, workflow, result });
    } catch (e) {
      console.error(`[OmegaKernel] orchestrate ${workflow} failed:`, e.message);
      res.status(500).json({ success: false, workflow, error: e.message });
    }
  } else {
    // Unknown workflow - log and acknowledge so frontend can move on
    res.json({
      success: true,
      workflow,
      result: { handler: 'none', logged: true, note: `No handler registered for ${workflow}` }
    });
  }
});

router.get('/orchestrations', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  res.json({ orchestrations: orchestrateLog.slice(0, limit), total: orchestrateLog.length });
});

// ----------------------------------------------------------------------
// HEALTH SNAPSHOT
// ----------------------------------------------------------------------
router.get('/health', (req, res) => {
  const now = Date.now();
  const modules = Array.from(moduleRegistry.values()).map(m => {
    const age = now - (m.lastHeartbeat || m.registeredAt || now);
    return {
      moduleId: m.moduleId,
      category: m.category,
      label: m.label,
      ageMs: age,
      status: age < STALE_THRESHOLD_MS ? 'HEALTHY' : 'STALE'
    };
  });
  res.json({
    healthy: modules.filter(m => m.status === 'HEALTHY').length,
    stale: modules.filter(m => m.status === 'STALE').length,
    total: modules.length,
    errors: errorLog.length,
    heals: healLog.length,
    orchestrations: orchestrateLog.length,
    modules,
    timestamp: now
  });
});

module.exports = router;
