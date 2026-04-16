// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM CONTROL ROUTES - MISSION CONTROL LAUNCHER
// Allows Mission Control to ACTUALLY launch services
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { exec, spawn } = require('child_process');
const os = require('os');

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/systemcontrol/launch-backend - Launch Backend Server
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/launch-backend', (req, res) => {
  try {
    const isWindows = os.platform() === 'win32';
    
    if (isWindows) {
      // Launch backend in new window
      exec('start "AuditDNA Backend" cmd /k "cd /d C:\\AuditDNA\\backend\\MiniAPI && node server.js"', (error) => {
        if (error) {
          return res.status(500).json({ 
            success: false, 
            message: 'Failed to launch backend', 
            error: error.message 
          });
        }
        res.json({ 
          success: true, 
          message: 'Backend server launching in new window...',
          port: 5050
        });
      });
    } else {
      // Unix/Mac
      const child = spawn('node', ['server.js'], {
        cwd: '/path/to/backend',
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
      res.json({ success: true, message: 'Backend launched' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/systemcontrol/launch-frontend - Launch Frontend
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/launch-frontend', (req, res) => {
  try {
    const isWindows = os.platform() === 'win32';
    
    if (isWindows) {
      exec('start "AuditDNA Frontend" cmd /k "cd /d C:\\AuditDNA\\frontend && npm start"', (error) => {
        if (error) {
          return res.status(500).json({ 
            success: false, 
            message: 'Failed to launch frontend', 
            error: error.message 
          });
        }
        res.json({ 
          success: true, 
          message: 'Frontend launching in new window...',
          port: 3000
        });
      });
    } else {
      res.json({ success: false, message: 'Frontend launch not supported on this OS' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/systemcontrol/launch-postgres - Launch PostgreSQL
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/launch-postgres', (req, res) => {
  try {
    exec('net start postgresql-x64-14', (error, stdout, stderr) => {
      if (error) {
        // Check if already running
        if (stderr.includes('already') || stdout.includes('already')) {
          return res.json({ 
            success: true, 
            message: 'PostgreSQL already running',
            alreadyRunning: true
          });
        }
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to start PostgreSQL', 
          error: error.message 
        });
      }
      res.json({ 
        success: true, 
        message: 'PostgreSQL started successfully',
        port: 5432
      });
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/systemcontrol/launch-all - FIRE ALL MISSILES!
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/launch-all', (req, res) => {
  try {
    const isWindows = os.platform() === 'win32';
    
    if (isWindows) {
      // Execute the master launch script
      exec('start "AuditDNA Launcher" cmd /k "C:\\AuditDNA\\LAUNCH_AUDITDNA.bat"', (error) => {
        if (error) {
          return res.status(500).json({ 
            success: false, 
            message: 'Failed to launch all services', 
            error: error.message 
          });
        }
        res.json({ 
          success: true, 
          message: 'Launching all services (PostgreSQL, Backend, Frontend)...',
          services: [
            { name: 'PostgreSQL', port: 5432 },
            { name: 'Backend', port: 5050 },
            { name: 'Frontend', port: 3000 }
          ]
        });
      });
    } else {
      res.json({ success: false, message: 'Launch all not supported on this OS' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/systemcontrol/kill-port - Kill Process on Specific Port
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/kill-port', (req, res) => {
  try {
    const { port } = req.body;
    
    if (!port) {
      return res.status(400).json({ success: false, message: 'Port number required' });
    }
    
    const isWindows = os.platform() === 'win32';
    
    if (isWindows) {
      // Windows command to kill process on port
      const cmd = `for /f "tokens=5" %a in ('netstat -ano ^| findstr ":${port}" ^| findstr "LISTENING"') do taskkill /F /PID %a`;
      
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          return res.json({ 
            success: false, 
            message: `No process found on port ${port} or failed to kill`,
            port
          });
        }
        res.json({ 
          success: true, 
          message: `Process on port ${port} terminated`,
          port
        });
      });
    } else {
      // Unix/Mac
      exec(`lsof -ti:${port} | xargs kill -9`, (error) => {
        if (error) {
          return res.json({ 
            success: false, 
            message: `No process found on port ${port}`,
            port
          });
        }
        res.json({ 
          success: true, 
          message: `Process on port ${port} terminated`,
          port
        });
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/systemcontrol/status - Get System Status
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/status', (req, res) => {
  res.json({
    success: true,
    message: 'System control API online',
    features: [
      'launch-backend',
      'launch-frontend', 
      'launch-postgres',
      'launch-all',
      'kill-port'
    ],
    platform: os.platform(),
    available: os.platform() === 'win32'
  });
});

module.exports = router;
