// =============================================================================
// ai-core/orchestrator/index.js
// Save to: C:\AuditDNA\backend\ai-core\orchestrator\index.js
// =============================================================================
// AuditDNA Master Orchestrator — routes all agent tasks, tracks state,
// emits Brain events, coordinates executionEngine + claudeProvider
// =============================================================================
'use strict';

const EventEmitter       = require('events');
const executionEngine    = require('./executionEngine');
const claudeProvider     = require('../providers/claudeProvider');
const confidenceGate     = require('../validation/confidenceGate');
const validationEngine   = require('../validation/validationEngine');
const decisionLog        = require('../memory/decisionLog');

// ---------------------------------------------------------------------------
// Task type → agent routing table
// ---------------------------------------------------------------------------
const TASK_ROUTING = {
  // Agriculture intelligence
  'grower-match':          { agentId: 'ATLAS',   provider: 'auto',  priority: 'high'   },
  'buyer-match':           { agentId: 'ATLAS',   provider: 'auto',  priority: 'high'   },
  'price-alert':           { agentId: 'KIKI',    provider: 'claude', priority: 'urgent' },
  'commodity-analysis':    { agentId: 'KIKI',    provider: 'claude', priority: 'normal' },
  'compliance-check':      { agentId: 'RANGER',  provider: 'claude', priority: 'high'   },
  'cert-expiry':           { agentId: 'RANGER',  provider: 'auto',  priority: 'high'   },
  // CRM
  'lead-scoring':          { agentId: 'SCOUT',   provider: 'auto',  priority: 'normal' },
  'contact-summary':       { agentId: 'SCOUT',   provider: 'claude', priority: 'low'   },
  'crm-enrichment':        { agentId: 'SCOUT',   provider: 'auto',  priority: 'normal' },
  // Finance
  'deal-analysis':         { agentId: 'BANKER',  provider: 'claude', priority: 'high'   },
  'factoring-score':       { agentId: 'BANKER',  provider: 'auto',  priority: 'normal' },
  'risk-assessment':       { agentId: 'BANKER',  provider: 'claude', priority: 'high'   },
  // Compliance
  'fsma-compliance':       { agentId: 'DIEGO',   provider: 'claude', priority: 'urgent' },
  'audit-report':          { agentId: 'DIEGO',   provider: 'claude', priority: 'high'   },
  // LOAF field ops
  'loaf-registration':     { agentId: 'FIELD',   provider: 'auto',  priority: 'normal' },
  'loaf-intelligence':     { agentId: 'FIELD',   provider: 'claude', priority: 'normal' },
  // Generic fallback
  'default':               { agentId: 'BRAIN',   provider: 'claude', priority: 'normal' },
};

// ---------------------------------------------------------------------------
// Orchestrator class
// ---------------------------------------------------------------------------
class Orchestrator extends EventEmitter {
  constructor() {
    super();
    this.version    = '1.0';
    this.taskQueue  = [];
    this.activeTasks = new Map();
    this.completedTasks = [];
    this.metrics = {
      tasksDispatched: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      toolCallsTotal: 0,
      avgConfidence: 0,
      lastActivity: null,
    };
    this._pool = null;
    console.log(`[ORCHESTRATOR v${this.version}] Master agent coordinator online`);
  }

  // Inject DB pool (called from server.js after pool is ready)
  setPool(pool) {
    this._pool = pool;
    console.log('[ORCHESTRATOR] DB pool connected');
  }

  // Route a task to the correct agent + provider
  route(taskType) {
    return TASK_ROUTING[taskType] || TASK_ROUTING['default'];
  }

  // ---------------------------------------------------------------------------
  // dispatch() — main entry point for all agent tasks
  // ---------------------------------------------------------------------------
  async dispatch(taskType, payload = {}, options = {}) {
    const taskId  = `T-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const route   = this.route(taskType);
    const start   = Date.now();

    this.metrics.tasksDispatched++;
    this.metrics.lastActivity = new Date().toISOString();

    const task = {
      id: taskId, taskType, agentId: route.agentId,
      provider: options.provider || route.provider,
      priority: route.priority, status: 'RUNNING',
      startedAt: new Date().toISOString(), payload,
    };

    this.activeTasks.set(taskId, task);
    this.emit('task:start', { taskId, taskType, agentId: route.agentId });

    console.log(`[ORCHESTRATOR] Dispatch ${taskId} | ${taskType} → ${route.agentId} | priority: ${route.priority}`);

    try {
      // Use executionEngine for routing to claude vs ollama
      const result = await executionEngine.executeAgent(route.agentId, {
        ...payload,
        taskType,
        provider: task.provider,
      });

      // Validate + confidence gate
      const validation = await validationEngine.run(route.agentId, result);
      const confidence  = result.confidence || 0;
      const gated       = confidenceGate(confidence);

      // Log decision
      decisionLog.record({
        taskId, taskType, agentId: route.agentId,
        confidence, gated, durationMs: Date.now() - start,
        ts: new Date().toISOString(),
      });

      const completed = {
        ...task, status: gated ? 'COMPLETED' : 'LOW_CONFIDENCE',
        result, validation, confidence, gated,
        durationMs: Date.now() - start,
        completedAt: new Date().toISOString(),
      };

      this.activeTasks.delete(taskId);
      this.completedTasks.unshift(completed);
      if (this.completedTasks.length > 200) this.completedTasks.pop();

      this.metrics.tasksCompleted++;
      this.metrics.toolCallsTotal += result.toolsUsed || 0;
      const prevAvg = this.metrics.avgConfidence;
      this.metrics.avgConfidence = Math.round(
        ((prevAvg * (this.metrics.tasksCompleted - 1)) + confidence) / this.metrics.tasksCompleted * 1000
      ) / 1000;

      this.emit('task:complete', { taskId, taskType, agentId: route.agentId, confidence, gated });
      return completed;

    } catch (err) {
      console.error(`[ORCHESTRATOR] Task ${taskId} failed:`, err.message);
      this.metrics.tasksFailed++;
      const failed = {
        ...task, status: 'FAILED', error: err.message,
        durationMs: Date.now() - start, completedAt: new Date().toISOString(),
      };
      this.activeTasks.delete(taskId);
      this.completedTasks.unshift(failed);
      this.emit('task:error', { taskId, taskType, error: err.message });
      return failed;
    }
  }

  // ---------------------------------------------------------------------------
  // Direct Claude dispatch — bypasses executionEngine routing, calls Claude directly
  // ---------------------------------------------------------------------------
  async dispatchClaude(agentId, payload = {}) {
    return claudeProvider.runAgent(agentId, payload, this._pool);
  }

  // ---------------------------------------------------------------------------
  // Status + health
  // ---------------------------------------------------------------------------
  status() {
    return {
      version:      this.version,
      metrics:      this.metrics,
      activeTasks:  Array.from(this.activeTasks.values()),
      recentTasks:  this.completedTasks.slice(0, 20),
      taskRouting:  TASK_ROUTING,
      dbConnected:  !!this._pool,
    };
  }

  health() {
    return {
      ok:           true,
      orchestrator: `v${this.version}`,
      dbConnected:  !!this._pool,
      activeTasks:  this.activeTasks.size,
      metrics:      this.metrics,
    };
  }
}

// Singleton
const orchestrator = new Orchestrator();
module.exports = orchestrator;
