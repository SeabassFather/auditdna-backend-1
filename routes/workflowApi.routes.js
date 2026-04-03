// ═══════════════════════════════════════════════════════════════════════════════════════════
// AUDITDNA - WORKFLOW API ROUTES (CommonJS)
// Mexausa Food Group, Inc. | AuditDNA Platform
// ═══════════════════════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════════════════════
// WORKFLOW DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════════════════
const WORKFLOW_TYPES = {
  INVOICE: {
    name: 'Invoice Workflow',
    states: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED'],
    transitions: {
      DRAFT: ['SUBMITTED', 'CANCELLED'],
      SUBMITTED: ['APPROVED', 'REJECTED'],
      APPROVED: ['PAID', 'CANCELLED'],
      REJECTED: ['DRAFT'],
      PAID: [],
      CANCELLED: []
    }
  },
  PAYMENT: {
    name: 'Payment Workflow',
    states: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED'],
    transitions: {
      PENDING: ['PROCESSING', 'CANCELLED'],
      PROCESSING: ['COMPLETED', 'FAILED'],
      COMPLETED: ['REFUNDED'],
      FAILED: ['PENDING'],
      REFUNDED: []
    }
  },
  SETTLEMENT: {
    name: 'Settlement Workflow',
    states: ['INITIATED', 'FUNDED', 'LOCKED', 'RELEASED', 'DISPUTED', 'REFUNDED'],
    transitions: {
      INITIATED: ['FUNDED', 'CANCELLED'],
      FUNDED: ['LOCKED', 'REFUNDED'],
      LOCKED: ['RELEASED', 'DISPUTED'],
      RELEASED: [],
      DISPUTED: ['RELEASED', 'REFUNDED'],
      REFUNDED: []
    }
  },
  COMPLIANCE: {
    name: 'Compliance Workflow',
    states: ['PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED'],
    transitions: {
      PENDING: ['IN_REVIEW'],
      IN_REVIEW: ['APPROVED', 'REJECTED'],
      APPROVED: ['EXPIRED'],
      REJECTED: ['PENDING'],
      EXPIRED: ['PENDING']
    }
  },
  ONBOARDING: {
    name: 'Grower Onboarding',
    states: ['APPLICATION', 'DOCUMENT_REVIEW', 'SITE_VISIT', 'APPROVED', 'REJECTED'],
    transitions: {
      APPLICATION: ['DOCUMENT_REVIEW', 'REJECTED'],
      DOCUMENT_REVIEW: ['SITE_VISIT', 'REJECTED'],
      SITE_VISIT: ['APPROVED', 'REJECTED'],
      APPROVED: [],
      REJECTED: ['APPLICATION']
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════════════════
// IN-MEMORY STORE
// ═══════════════════════════════════════════════════════════════════════════════════════════
const workflowStates = new Map();
const workflowHistory = [];

// Sample workflows
workflowStates.set('WF-001', {
  id: 'WF-001',
  workflow_type: 'INVOICE',
  entity_id: 'INV-12345',
  current_state: 'SUBMITTED',
  previous_state: 'DRAFT',
  jurisdiction: 'MX',
  created_at: '2026-01-14T10:00:00Z',
  updated_at: '2026-01-14T14:30:00Z'
});

workflowStates.set('WF-002', {
  id: 'WF-002',
  workflow_type: 'SETTLEMENT',
  entity_id: 'SET-98765',
  current_state: 'LOCKED',
  previous_state: 'FUNDED',
  jurisdiction: 'US',
  created_at: '2026-01-13T08:00:00Z',
  updated_at: '2026-01-15T09:15:00Z'
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// GET ALL WORKFLOWS
// ═══════════════════════════════════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const { workflow_type, current_state, entity_id, limit = 100 } = req.query;
    
    let results = Array.from(workflowStates.values());
    
    if (workflow_type) results = results.filter(w => w.workflow_type === workflow_type);
    if (current_state) results = results.filter(w => w.current_state === current_state);
    if (entity_id) results = results.filter(w => w.entity_id === entity_id);
    
    results = results.slice(0, Number(limit));
    
    // Enrich with allowed transitions
    results = results.map(w => ({
      ...w,
      allowed_transitions: WORKFLOW_TYPES[w.workflow_type]?.transitions[w.current_state] || []
    }));
    
    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// GET SINGLE WORKFLOW
// ═══════════════════════════════════════════════════════════════════════════════════════════
router.get('/:id', async (req, res) => {
  try {
    const workflow = workflowStates.get(req.params.id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
    
    const workflowDef = WORKFLOW_TYPES[workflow.workflow_type];
    const history = workflowHistory.filter(h => h.workflow_id === workflow.id);
    
    res.json({
      success: true,
      data: {
        ...workflow,
        allowed_transitions: workflowDef?.transitions[workflow.current_state] || [],
        definition: workflowDef,
        history
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// CREATE WORKFLOW
// ═══════════════════════════════════════════════════════════════════════════════════════════
router.post('/', async (req, res) => {
  try {
    const { workflow_type, entity_id, jurisdiction, initial_state } = req.body;
    
    if (!workflow_type || !entity_id) {
      return res.status(400).json({ error: 'workflow_type and entity_id required' });
    }
    
    const workflowDef = WORKFLOW_TYPES[workflow_type];
    if (!workflowDef) {
      return res.status(400).json({ 
        error: 'Invalid workflow type',
        validTypes: Object.keys(WORKFLOW_TYPES)
      });
    }
    
    const startState = initial_state || workflowDef.states[0];
    
    const workflow = {
      id: `WF-${Date.now()}`,
      workflow_type,
      entity_id,
      current_state: startState,
      previous_state: null,
      jurisdiction: jurisdiction || 'US',
      state_data: {},
      created_at: new Date().toISOString(),
      created_by: req.user?.sub || 'SYSTEM',
      updated_at: new Date().toISOString()
    };
    
    workflowStates.set(workflow.id, workflow);
    
    workflowHistory.push({
      id: `WFH-${Date.now()}`,
      workflow_id: workflow.id,
      from_state: null,
      to_state: startState,
      changed_by: req.user?.sub || 'SYSTEM',
      changed_at: workflow.created_at
    });
    
    res.status(201).json({
      success: true,
      data: {
        ...workflow,
        allowed_transitions: workflowDef.transitions[startState]
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// TRANSITION WORKFLOW
// ═══════════════════════════════════════════════════════════════════════════════════════════
router.post('/:id/transition', async (req, res) => {
  try {
    const workflow = workflowStates.get(req.params.id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
    
    const { to_state, reason, data } = req.body;
    if (!to_state) {
      return res.status(400).json({ error: 'to_state required' });
    }
    
    const workflowDef = WORKFLOW_TYPES[workflow.workflow_type];
    const allowedTransitions = workflowDef?.transitions[workflow.current_state] || [];
    
    if (!allowedTransitions.includes(to_state)) {
      return res.status(400).json({
        error: 'Invalid transition',
        current_state: workflow.current_state,
        requested_state: to_state,
        allowed_transitions: allowedTransitions
      });
    }
    
    const previousState = workflow.current_state;
    workflow.previous_state = previousState;
    workflow.current_state = to_state;
    workflow.updated_at = new Date().toISOString();
    workflow.last_changed_by = req.user?.sub || 'SYSTEM';
    
    if (data) {
      workflow.state_data = { ...workflow.state_data, ...data };
    }
    
    workflowStates.set(workflow.id, workflow);
    
    workflowHistory.push({
      id: `WFH-${Date.now()}`,
      workflow_id: workflow.id,
      from_state: previousState,
      to_state,
      reason,
      changed_by: req.user?.sub || 'SYSTEM',
      changed_at: workflow.updated_at
    });
    
    res.json({
      success: true,
      data: {
        ...workflow,
        allowed_transitions: workflowDef?.transitions[to_state] || []
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// GET WORKFLOW HISTORY
// ═══════════════════════════════════════════════════════════════════════════════════════════
router.get('/:id/history', async (req, res) => {
  try {
    const workflow = workflowStates.get(req.params.id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
    
    const history = workflowHistory.filter(h => h.workflow_id === workflow.id);
    
    res.json({
      success: true,
      workflow_id: workflow.id,
      current_state: workflow.current_state,
      transitions: history.length,
      data: history
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// GET BY ENTITY
// ═══════════════════════════════════════════════════════════════════════════════════════════
router.get('/entity/:entityId', async (req, res) => {
  try {
    const workflows = Array.from(workflowStates.values())
      .filter(w => w.entity_id === req.params.entityId);
    
    res.json({
      success: true,
      entity_id: req.params.entityId,
      count: workflows.length,
      data: workflows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════════════════════════════════════════════════════════
router.get('/stats/summary', async (req, res) => {
  try {
    const all = Array.from(workflowStates.values());
    
    const stats = {
      total: all.length,
      byType: {},
      byState: {},
      totalTransitions: workflowHistory.length
    };
    
    all.forEach(w => {
      stats.byType[w.workflow_type] = (stats.byType[w.workflow_type] || 0) + 1;
      stats.byState[w.current_state] = (stats.byState[w.current_state] || 0) + 1;
    });
    
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// REFERENCE DATA
// ═══════════════════════════════════════════════════════════════════════════════════════════
router.get('/reference/types', (req, res) => {
  res.json({ success: true, data: Object.keys(WORKFLOW_TYPES) });
});

router.get('/reference/definitions', (req, res) => {
  res.json({ success: true, data: WORKFLOW_TYPES });
});

router.get('/reference/definitions/:type', (req, res) => {
  const def = WORKFLOW_TYPES[req.params.type];
  if (!def) return res.status(404).json({ error: 'Workflow type not found' });
  res.json({ success: true, data: def });
});

module.exports = router;