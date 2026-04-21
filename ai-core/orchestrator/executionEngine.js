'use strict';

const claudeProvider   = require('../providers/claudeProvider');
const ollamaProvider   = require('../providers/ollamaProvider');
const validationEngine = require('../validation/validationEngine');
const confidenceGate   = require('../validation/confidenceGate');
const decisionLog      = require('../memory/decisionLog');

const LOCAL_TASKS = new Set([
  'lead-scoring','grower-analysis','buyer-profiler','temp-classification',
  'email-draft','crm-enrichment','tier-assignment','si-scoring',
  'route-ranger','cash-wrangler','contact-summary','dev-repair-agent','syntax-fix'
]);

const CLOUD_ONLY_TASKS = new Set([
  'mortgage-audit','cfpb-compliance','legal-analysis','fsma-compliance',
  'paca-violation','attorney-referral','audit-report','financial-risk','patent-analysis'
]);

let ollamaStatus = null, ollamaCheckedAt = 0;

async function getOllamaStatus() {
  const now = Date.now();
  if (now - ollamaCheckedAt < 60000 && ollamaStatus !== null) return ollamaStatus;
  ollamaStatus = await ollamaProvider.isOllamaOnline();
  ollamaCheckedAt = now;
  return ollamaStatus;
}

async function selectProvider(agentId, taskType, override) {
  if (override === 'claude') return claudeProvider;
  if (override === 'ollama') return ollamaProvider;
  if (CLOUD_ONLY_TASKS.has(taskType)) return claudeProvider;
  if (LOCAL_TASKS.has(taskType) || LOCAL_TASKS.has(agentId)) {
    if (await getOllamaStatus()) return ollamaProvider;
    console.warn(`[ROUTER] Ollama offline â€” routing ${agentId} to Claude`);
  }
  return claudeProvider;
}

async function executeAgent(agentId, payload) {
  const start    = Date.now();
  const taskType = payload.taskType || agentId;
  const override = payload.provider || null;

  try {
    const provider     = await selectProvider(agentId, taskType, override);
    const providerName = provider === ollamaProvider ? 'ollama' : 'claude';

    console.log(`[ENGINE] ${agentId} -> ${providerName.toUpperCase()} | task: ${taskType}`);

    const response   = await provider.runAgent(agentId, payload);
    const validation = await validationEngine.run(agentId, response);

    if (!validation.passed) return { success: false, error: 'Validation failed', validation, provider: providerName, agentId };

    const conf = response.confidence ?? 0.75;
    if (!confidenceGate(conf)) {
      return { success: false, error: 'Low confidence â€” manual review required', confidence: conf, result: response, requiresReview: true, provider: providerName, agentId };
    }

    const duration = Date.now() - start;
    decisionLog.record({ agentId, taskType, provider: providerName, payload, response, confidence: conf, duration, timestamp: Date.now() });

    return { success: true, result: response, provider: providerName, agentId, duration, confidence: conf };

  } catch (err) {
    if (err.message.includes('Ollama') || err.message.includes('ECONNREFUSED')) {
      console.warn(`[ENGINE] Ollama failed â€” auto-retrying with Claude`);
      ollamaStatus = false; ollamaCheckedAt = Date.now();
      try {
        const response = await claudeProvider.runAgent(agentId, payload);
        const duration = Date.now() - start;
        decisionLog.record({ agentId, taskType, provider: 'claude (fallback)', payload, response, duration, timestamp: Date.now() });
        return { success: true, result: response, provider: 'claude', fallback: true, agentId, duration };
      } catch (fe) { return { success: false, error: fe.message, agentId }; }
    }
    return { success: false, error: err.message, agentId };
  }
}

async function runLocal(agentId, payload)  { return executeAgent(agentId, { ...payload, provider: 'ollama' }); }
async function runCloud(agentId, payload)  { return executeAgent(agentId, { ...payload, provider: 'claude' }); }

async function getStatus() {
  const ollamaOnline = await getOllamaStatus();
  const models       = ollamaOnline ? await ollamaProvider.listModels() : [];
  return {
    claude: { available: !!process.env.ANTHROPIC_API_KEY, mode: 'cloud' },
    ollama: { available: ollamaOnline, mode: 'local', models },
    routing: { localTasks: [...LOCAL_TASKS], cloudOnlyTasks: [...CLOUD_ONLY_TASKS] },
  };
}

module.exports = { executeAgent, runLocal, runCloud, getStatus };

