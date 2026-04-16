// ═══════════════════════════════════════════════════════════════════════════════
// SEABASS VOICE COMMAND ROUTES
// Backend API for voice-controlled navigation and actions
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();

// In-memory state for voice commands (can be replaced with WebSocket)
let voiceState = {
  currentModule: 'Dashboard',
  lastCommand: null,
  lastCommandTime: null,
  pendingAction: null
};

// WebSocket clients for real-time updates
const wsClients = new Set();

// Broadcast to all connected clients
const broadcast = (message) => {
  const data = JSON.stringify(message);
  wsClients.forEach(client => {
    try {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(data);
      }
    } catch (e) {
      console.error('[Voice] Broadcast error:', e);
    }
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/voice/navigate - Navigate to a module
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/navigate', (req, res) => {
  const { module } = req.body;
  
  if (!module) {
    return res.status(400).json({ success: false, error: 'Module name required' });
  }
  
  voiceState.currentModule = module;
  voiceState.lastCommand = 'navigate';
  voiceState.lastCommandTime = new Date().toISOString();
  
  // Broadcast navigation command to frontend
  broadcast({
    type: 'VOICE_NAVIGATE',
    module: module,
    timestamp: voiceState.lastCommandTime
  });
  
  console.log(`[SEABASS] Navigate to: ${module}`);
  
  res.json({
    success: true,
    message: `Navigating to ${module}`,
    module: module
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/voice/search - Execute search
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/search', (req, res) => {
  const { query, scope } = req.body;
  
  if (!query) {
    return res.status(400).json({ success: false, error: 'Search query required' });
  }
  
  voiceState.lastCommand = 'search';
  voiceState.lastCommandTime = new Date().toISOString();
  
  // Broadcast search command
  broadcast({
    type: 'VOICE_SEARCH',
    query: query,
    scope: scope || 'all',
    timestamp: voiceState.lastCommandTime
  });
  
  console.log(`[SEABASS] Search: ${query}`);
  
  res.json({
    success: true,
    message: `Searching for ${query}`,
    query: query
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/voice/report - Generate report
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/report', async (req, res) => {
  const { type, dateRange, format } = req.body;
  
  voiceState.lastCommand = 'report';
  voiceState.lastCommandTime = new Date().toISOString();
  
  // Broadcast report request
  broadcast({
    type: 'VOICE_REPORT',
    reportType: type || 'summary',
    dateRange: dateRange || 'today',
    format: format || 'screen',
    timestamp: voiceState.lastCommandTime
  });
  
  console.log(`[SEABASS] Generate report: ${type || 'summary'}`);
  
  res.json({
    success: true,
    message: `Generating ${type || 'summary'} report`,
    reportType: type || 'summary'
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/voice/refresh - Refresh current view
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/refresh', (req, res) => {
  voiceState.lastCommand = 'refresh';
  voiceState.lastCommandTime = new Date().toISOString();
  
  broadcast({
    type: 'VOICE_REFRESH',
    timestamp: voiceState.lastCommandTime
  });
  
  console.log('[SEABASS] Refresh');
  
  res.json({ success: true, message: 'Refreshing' });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/voice/action - Execute custom action
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/action', (req, res) => {
  const { action, params } = req.body;
  
  voiceState.lastCommand = action;
  voiceState.lastCommandTime = new Date().toISOString();
  
  broadcast({
    type: 'VOICE_ACTION',
    action: action,
    params: params || {},
    timestamp: voiceState.lastCommandTime
  });
  
  console.log(`[SEABASS] Action: ${action}`);
  
  res.json({
    success: true,
    message: `Executing ${action}`,
    action: action
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/voice/state - Get current voice state
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/state', (req, res) => {
  res.json({
    success: true,
    state: voiceState
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/voice/commands - Get available commands
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/commands', (req, res) => {
  res.json({
    success: true,
    commands: {
      navigation: [
        'Open [module name]',
        'Go to [module name]',
        'Show [module name]',
        'Switch to [module name]'
      ],
      search: [
        'Search for [query]',
        'Find [query]',
        'Look up [query]'
      ],
      reports: [
        'Generate report',
        'Create summary report',
        'Run analytics report'
      ],
      system: [
        'Check status',
        'System status',
        'Refresh',
        'Reload'
      ],
      data: [
        'How many growers',
        'How many buyers',
        'Total contacts',
        'Count [entity]'
      ],
      control: [
        'Sleep',
        'Wake up',
        'Stop',
        'Help'
      ]
    },
    modules: [
      'Dashboard', 'CRM', 'Growers', 'Buyers', 'Finance',
      'Compliance', 'Traceability', 'Market Intelligence',
      'Logistics', 'Quality Control', 'Reports', 'Settings'
    ]
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// WebSocket handler (attach to server.js)
// ═══════════════════════════════════════════════════════════════════════════════
router.setupWebSocket = (wss) => {
  wss.on('connection', (ws) => {
    console.log('[SEABASS] WebSocket client connected');
    wsClients.add(ws);
    
    ws.on('close', () => {
      wsClients.delete(ws);
      console.log('[SEABASS] WebSocket client disconnected');
    });
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'VOICE_ACK') {
          console.log('[SEABASS] Frontend acknowledged:', data.command);
        }
      } catch (e) {
        console.error('[SEABASS] WebSocket message error:', e);
      }
    });
    
    // Send current state on connect
    ws.send(JSON.stringify({
      type: 'VOICE_STATE',
      state: voiceState
    }));
  });
};

module.exports = router;
