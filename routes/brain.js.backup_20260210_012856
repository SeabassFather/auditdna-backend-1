// =============================================================================
// BRAIN API ROUTE - Auto-loaded by server.js
// =============================================================================
// Path: /api/brain
// Manages all 81 Niner Miners and workflow orchestration
// =============================================================================

const express = require('express');
const router = express.Router();
const brain = require('../Brain');

// GET /api/brain/status - Full system status
router.get('/status', (req, res) => {
  try {
    const status = {
      miners: brain.getAllMinersStatus(),
      metrics: brain.getMetrics(),
      activeWorkflows: brain.activeWorkflows.size,
      timestamp: new Date().toISOString()
    };
    res.json(status);
  } catch (error) {
    console.error('Brain status error:', error);
    res.status(500).json({ error: 'Failed to get brain status' });
  }
});

// GET /api/brain/metrics - Just metrics
router.get('/metrics', (req, res) => {
  try {
    res.json(brain.getMetrics());
  } catch (error) {
    console.error('Brain metrics error:', error);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

// GET /api/brain/miners - All miners status
router.get('/miners', (req, res) => {
  try {
    res.json(brain.getAllMinersStatus());
  } catch (error) {
    console.error('Brain miners error:', error);
    res.status(500).json({ error: 'Failed to get miners' });
  }
});

// GET /api/brain/miners/:team - Specific team miners
router.get('/miners/:team', (req, res) => {
  try {
    const { team } = req.params;
    const miners = brain.ninerMiners[team];
    
    if (!miners) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    res.json(miners);
  } catch (error) {
    console.error('Brain team miners error:', error);
    res.status(500).json({ error: 'Failed to get team miners' });
  }
});

// POST /api/brain/assign - Assign task to miner
router.post('/assign', (req, res) => {
  try {
    const { type, data, priority = 'NORMAL' } = req.body;
    
    if (!type || !data) {
      return res.status(400).json({ error: 'Missing required fields: type, data' });
    }
    
    const workflowId = brain.assignTask({ type, data, priority });
    
    if (!workflowId) {
      return res.status(503).json({ error: 'No available miners' });
    }
    
    res.json({
      workflowId,
      status: 'assigned',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Brain assign error:', error);
    res.status(500).json({ error: 'Failed to assign task' });
  }
});

// POST /api/brain/complete - Complete workflow
router.post('/complete', (req, res) => {
  try {
    const { workflowId, result } = req.body;
    
    if (!workflowId) {
      return res.status(400).json({ error: 'Missing workflowId' });
    }
    
    brain.completeTask(workflowId, result);
    
    res.json({
      workflowId,
      status: 'completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Brain complete error:', error);
    res.status(500).json({ error: 'Failed to complete task' });
  }
});

// GET /api/brain/workflows - Active workflows
router.get('/workflows', (req, res) => {
  try {
    const workflows = Array.from(brain.activeWorkflows.values());
    res.json({
      count: workflows.length,
      workflows
    });
  } catch (error) {
    console.error('Brain workflows error:', error);
    res.status(500).json({ error: 'Failed to get workflows' });
  }
});

module.exports = router;