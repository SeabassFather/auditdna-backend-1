// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// BACKEND API FOR COMMUNICATION COMMAND CENTER
// Zadarma PBX | Email | SMS | Video Conferencing | Automation
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const axios = require('axios');
const pool = require('../db');

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ZADARMA CONFIGURATION (from memory)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const ZADARMA_CONFIG = {
  key: 'YOUR_ZADARMA_KEY', // Replace with actual key
  secret: 'YOUR_ZADARMA_SECRET',
  apiUrl: 'https://api.zadarma.com/v1'
};

// Generate Zadarma signature
function generateZadarmaSignature(method, params) {
  const paramsString = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');
  const data = method + paramsString + ZADARMA_CONFIG.secret;
  return crypto.createHash('md5').update(data).digest('hex');
}

// Make Zadarma API request
async function zadarmaRequest(endpoint, params = {}) {
  const method = endpoint;
  const signature = generateZadarmaSignature(method, params);
  
  try {
    const res = await axios.get(`${ZADARMA_CONFIG.apiUrl}${endpoint}`, {
      params,
      headers: {
        'Authorization': `${ZADARMA_CONFIG.key}:${signature}`
      }
    });
    return res.data;
  } catch (err) {
    console.error('Zadarma API error:', err);
    throw err;
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ZADARMA PHONE CALLS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.post('/zadarma/call', async (req, res) => {
  const { to, from, encrypted } = req.body;
  
  try {
    const data = await zadarmaRequest('/request/callback/', {
      from: from,
      to: to,
      sip: 'YOUR_SIP_NUMBER'
    });
    
    res.json({ 
      success: true, 
      callId: data.callId,
      encrypted: encrypted,
      status: 'initiated'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/zadarma/hangup', async (req, res) => {
  try {
    await zadarmaRequest('/request/hangup/', {});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/zadarma/mute', async (req, res) => {
  const { muted } = req.body;
  
  try {
    await zadarmaRequest('/request/mute/', { action: muted ? 'on' : 'off' });
    res.json({ success: true, muted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/zadarma/hold', async (req, res) => {
  const { hold } = req.body;
  
  try {
    await zadarmaRequest('/request/hold/', { action: hold ? 'on' : 'off' });
    res.json({ success: true, hold });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/zadarma/record', async (req, res) => {
  const { record } = req.body;
  
  try {
    const data = await zadarmaRequest('/request/record/', { action: record ? 'on' : 'off' });
    res.json({ success: true, record, recordingUrl: data.link || null });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/zadarma/status', async (req, res) => {
  try {
    const data = await zadarmaRequest('/info/balance/');
    res.json({ 
      sipRegistered: true,
      balance: data.balance,
      currency: data.currency
    });
  } catch (err) {
    res.json({ sipRegistered: false, error: err.message });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SMS VIA ZADARMA
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.post('/zadarma/sms', async (req, res) => {
  const { message, recipients } = req.body;
  
  let sent = 0;
  let failed = 0;
  const errors = [];
  
  for (const number of recipients) {
    try {
      await zadarmaRequest('/sms/send/', {
        number: number,
        message: message
      });
      sent++;
    } catch (err) {
      failed++;
      errors.push({ number, error: err.message });
    }
  }
  
  res.json({ sent, failed, errors });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// EMAIL CAMPAIGNS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.post('/email/send-campaign', async (req, res) => {
  const { subject, body, recipients, images, attachments, videos, voices } = req.body;
  
  // Use your configured email service (from earlier BACKEND_EMAIL_SERVICE.js)
  // This is a placeholder - integrate with your email service
  
  let sent = 0;
  let failed = 0;
  
  for (const recipientId of JSON.parse(recipients)) {
    try {
      // Get contact from database
      // Send email
      sent++;
    } catch (err) {
      failed++;
    }
  }
  
  res.json({ sent, failed });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// GROUPS MANAGEMENT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.get('/communication/groups', async (req, res) => {
  // Fetch groups from database
  // Example with PostgreSQL:
  // const result = await pool.query('SELECT * FROM communication_groups');
  // res.json(result.rows);
  
  res.json([
    { id: 1, name: 'VIP Clients', contacts: [1, 2, 3] },
    { id: 2, name: 'Growers', contacts: [4, 5, 6] }
  ]);
});

router.post('/communication/groups', async (req, res) => {
  const { name, contacts } = req.body;
  
  // Save to database
  // Example:
  // const result = await pool.query(
  //   'INSERT INTO communication_groups (name, contacts) VALUES ($1, $2) RETURNING *',
  //   [name, JSON.stringify(contacts)]
  // );
  // res.json(result.rows[0]);
  
  res.json({ id: Date.now(), name, contacts });
});

router.delete('/communication/groups/:id', async (req, res) => {
  const { id } = req.params;
  
  // Delete from database
  // await pool.query('DELETE FROM communication_groups WHERE id = $1', [id]);
  
  res.json({ success: true });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// AUTOMATIONS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.get('/communication/automations', async (req, res) => {
  // Fetch from database
  res.json([]);
});

router.post('/communication/automations', async (req, res) => {
  const { name, type, trigger, schedule, recipients, template, active } = req.body;
  
  // Save to database
  const automation = {
    id: Date.now(),
    name,
    type,
    trigger,
    schedule,
    recipients,
    template,
    active
  };
  
  res.json(automation);
});

router.patch('/communication/automations/:id', async (req, res) => {
  const { id } = req.params;
  const { active } = req.body;
  
  // Update in database
  res.json({ success: true });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MODULE DATA INTEGRATION
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.get('/traceability/summary', async (req, res) => {
  // Fetch from Traceability module
  res.json({ activeShipments: 42 });
});

router.get('/financial/summary', async (req, res) => {
  // Fetch from Financial module
  res.json({ revenue: 12.5 });
});

router.get('/intelligence/summary', async (req, res) => {
  // Fetch from Intelligence module
  res.json({ cowboys: 81 });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// WEBRTC SIGNALING (for video conferencing)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const io = require('socket.io');

function setupWebRTCSignaling(server) {
  const socketIO = io(server);
  
  socketIO.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('join-room', (roomId) => {
      socket.join(roomId);
      socket.to(roomId).emit('user-connected', socket.id);
    });
    
    socket.on('offer', (data) => {
      socket.to(data.to).emit('offer', data);
    });
    
    socket.on('answer', (data) => {
      socket.to(data.to).emit('answer', data);
    });
    
    socket.on('ice-candidate', (data) => {
      socket.to(data.to).emit('ice-candidate', data);
    });
    
    socket.on('disconnect', () => {
      socket.broadcast.emit('user-disconnected', socket.id);
    });
  });
}

module.exports = { router, setupWebRTCSignaling };

