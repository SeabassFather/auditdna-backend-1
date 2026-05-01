// =============================================================================
// MINIAPI AGENTS BOOTSTRAP (with notifier)
// File: C:\AuditDNA\backend\MiniAPI\agents\index.js
//
// ES MODULE - imports all 3 watchers + shared notifier
// =============================================================================

import express from 'express';
import { createRequire } from 'module';
import enrique from './enrique-health-watcher.js';
import kiki    from './kiki-route-sentinel.js';
import eliott  from './eliott-data-janitor.js';

// Load CommonJS notifier from main backend (it's a sibling at ../../services/swarm-notifier.js
// from MiniAPI's perspective: C:\AuditDNA\backend\services\swarm-notifier.js)
const require = createRequire(import.meta.url);
let notifier = null;
try {
  notifier = require('../../services/swarm-notifier.js');
  console.log('[MiniAPI Agents] swarm-notifier loaded');
} catch (err) {
  console.warn('[MiniAPI Agents] swarm-notifier not found, falling back to brain-only:', err.message);
}

let initialized = false;

export function initAll({ pool, aiHelper }) {
  if (initialized) return;
  enrique.init({ pool, aiHelper, notifier });
  kiki.init({ pool, aiHelper, notifier });
  eliott.init({ pool, aiHelper, notifier });
  initialized = true;
  console.log('[MiniAPI Agents] Initialized: ENRIQUE (THE FATHER), KIKI, ELIOTT' + (notifier ? ' + notifier' : ''));
}

export function startAll() {
  enrique.start();
  kiki.start();
  eliott.start();
  console.log('[MiniAPI Agents] All 3 watchers started');
}

export function stopAll() {
  enrique.stop();
  kiki.stop();
  eliott.stop();
}

export const kikiMiddleware = kiki.middleware;

export const statusRouter = express.Router();
statusRouter.use(express.json());

statusRouter.get('/status', (req, res) => {
  res.json({
    ok: true,
    agents: [enrique.getStatus(), kiki.getStatus(), eliott.getStatus()],
    initialized,
    notifier_loaded: !!notifier
  });
});

statusRouter.get('/enrique/status', (req, res) => res.json(enrique.getStatus()));
statusRouter.get('/kiki/status',    (req, res) => res.json(kiki.getStatus()));
statusRouter.get('/eliott/status',  (req, res) => res.json(eliott.getStatus()));

statusRouter.post('/eliott/scan-now', async (req, res) => {
  const r = await eliott.scanNow();
  res.json(r);
});

// Test the notifier (Saul can curl this to test smartwatch + email)
statusRouter.post('/test-notify', async (req, res) => {
  if (!notifier) return res.json({ ok: false, error: 'notifier_not_loaded' });
  const severity = (req.body && req.body.severity) || (req.query && req.query.severity) || 'medium';
  const r = await notifier.notify({
    agent: 'ENRIQUE',
    event_type: 'manual.test',
    severity,
    summary: `Manual notifier test from MiniAPI - severity ${severity}`,
    context: { triggered_by: 'POST /api/agents/test-notify', time: new Date().toISOString() }
  });
  res.json(r);
});

export default { initAll, startAll, stopAll, kikiMiddleware, statusRouter };
