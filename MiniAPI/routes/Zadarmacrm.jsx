/**
 * ZADARMA CRM ROUTES
 * AuditDNA Backend - Zadarma VoIP/CRM Integration
 * 
 * Endpoints:
 * - POST /call        - Initiate outbound call
 * - POST /sms         - Send SMS
 * - GET  /stats       - Call statistics
 * - GET  /recordings/:id - Get call recording
 * - GET  /calls       - Call log
 * - GET  /leads       - Get leads/contacts
 * - POST /leads       - Create lead
 * - PUT  /leads/:id   - Update lead
 * - DELETE /leads/:id - Delete lead
 * - POST /leads/import - Bulk import
 * - GET  /metrics     - Dashboard metrics
 * - POST /webhook/call - Zadarma incoming call webhook
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ============================================
// ZADARMA CONFIGURATION
// ============================================
const ZADARMA = {
  API_KEY: process.env.ZADARMA_KEY || 'a2aaea04d645d80e739c',
  API_SECRET: process.env.ZADARMA_SECRET || '424a974e04f67227b466',
  BASE_URL: 'https://api.zadarma.com/v1',
  WHATSAPP: '+52-646-340-2686'
};

// ============================================
// IN-MEMORY STORAGE (use MongoDB in production)
// ============================================
let callLog = [];
let smsLog = [];
let leads = [];

// Load contacts from JSON file if exists
const contactsPath = path.join(__dirname, '../data/shipper-contacts.json');
if (fs.existsSync(contactsPath)) {
  try {
    leads = JSON.parse(fs.readFileSync(contactsPath, 'utf-8'));
    console.log(`✓ Loaded ${leads.length} contacts from shipper-contacts.json`);
  } catch (e) {
    console.log('Could not load contacts file:', e.message);
  }
}

// ============================================
// ZADARMA API SIGNATURE
// ============================================
function generateSignature(method, params = {}) {
  const sortedParams = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');
  const signatureString = method + sortedParams + crypto.createHash('md5').update(sortedParams).digest('hex');
  const signature = crypto.createHmac('sha1', ZADARMA.API_SECRET).update(signatureString).digest('hex');
  return Buffer.from(signature).toString('base64');
}

// ============================================
// ZADARMA API HELPER
// ============================================
async function zadarmaRequest(method, endpoint, params = {}) {
  const signature = generateSignature(endpoint, params);
  const url = `${ZADARMA.BASE_URL}${endpoint}`;
  
  try {
    const response = await axios({
      method,
      url,
      headers: { 'Authorization': `${ZADARMA.API_KEY}:${signature}` },
      params: method === 'GET' ? params : undefined,
      data: method === 'POST' ? params : undefined
    });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Zadarma API error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}

// ============================================
// CALL ROUTES
// ============================================

// Initiate call
router.post('/call', async (req, res) => {
  const { from, to } = req.body;
  
  if (!from || !to) {
    return res.status(400).json({ success: false, error: 'Missing from or to number' });
  }

  const callRecord = {
    id: Date.now().toString(),
    from,
    to,
    direction: 'outbound',
    status: 'initiated',
    timestamp: new Date().toISOString()
  };
  callLog.push(callRecord);

  const result = await zadarmaRequest('GET', '/request/callback/', {
    from: from.replace(/[^\d+]/g, ''),
    to: to.replace(/[^\d+]/g, ''),
    predicted: 'true'
  });

  if (result.success) {
    callRecord.status = 'connecting';
    callRecord.zadarmaCallId = result.data?.call_id;
    res.json({ success: true, callId: callRecord.id, zadarma: result.data });
  } else {
    callRecord.status = 'failed';
    res.status(500).json({ success: false, error: result.error });
  }
});

// Get call statistics
router.get('/stats', async (req, res) => {
  const { start, end } = req.query;
  const startDate = start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = end || new Date().toISOString().split('T')[0];

  const result = await zadarmaRequest('GET', '/statistics/', { start: startDate, end: endDate });

  const localStats = {
    totalCalls: callLog.length,
    answered: callLog.filter(c => c.status === 'answered').length,
    missed: callLog.filter(c => c.status === 'missed').length,
    outbound: callLog.filter(c => c.direction === 'outbound').length,
    inbound: callLog.filter(c => c.direction === 'inbound').length
  };

  res.json({ success: true, zadarma: result.data, local: localStats });
});

// Get call recordings
router.get('/recordings/:callId', async (req, res) => {
  const { callId } = req.params;
  const result = await zadarmaRequest('GET', '/pbx/record/request/', { call_id: callId });
  res.json(result.success ? { success: true, recording: result.data } : { success: false, error: result.error });
});

// Get call log
router.get('/calls', (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  const calls = callLog.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
  res.json({ success: true, total: callLog.length, calls });
});

// ============================================
// SMS ROUTES
// ============================================

// Send SMS
router.post('/sms', async (req, res) => {
  const { to, message, sender } = req.body;
  
  if (!to || !message) {
    return res.status(400).json({ success: false, error: 'Missing to or message' });
  }

  const smsRecord = {
    id: Date.now().toString(),
    to: to.replace(/[^\d+]/g, ''),
    message,
    sender: sender || ZADARMA.WHATSAPP,
    status: 'pending',
    timestamp: new Date().toISOString()
  };
  smsLog.push(smsRecord);

  const result = await zadarmaRequest('GET', '/sms/send/', {
    number: to.replace(/[^\d+]/g, ''),
    message: message.substring(0, 160),
    sender: sender || undefined
  });

  if (result.success) {
    smsRecord.status = 'sent';
    res.json({ success: true, smsId: smsRecord.id, zadarma: result.data });
  } else {
    smsRecord.status = 'failed';
    res.status(500).json({ success: false, error: result.error });
  }
});

// Get SMS log
router.get('/sms', (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  const messages = smsLog.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
  res.json({ success: true, total: smsLog.length, messages });
});

// ============================================
// LEADS/CONTACTS ROUTES
// ============================================

// Get all leads
router.get('/leads', (req, res) => {
  const { status, tag, region, search, limit = 50, offset = 0 } = req.query;
  
  let filtered = [...leads];
  
  if (status && status !== 'all') {
    filtered = filtered.filter(l => l.status === status);
  }
  if (tag && tag !== 'all') {
    filtered = filtered.filter(l => l.tags?.includes(tag));
  }
  if (region && region !== 'all') {
    filtered = filtered.filter(l => l.region === region);
  }
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(l => 
      l.name?.toLowerCase().includes(s) ||
      l.company?.toLowerCase().includes(s) ||
      l.email?.toLowerCase().includes(s)
    );
  }
  
  res.json({
    success: true,
    total: filtered.length,
    leads: filtered.slice(parseInt(offset), parseInt(offset) + parseInt(limit))
  });
});

// Create lead
router.post('/leads', (req, res) => {
  const lead = {
    id: Date.now().toString(),
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  leads.push(lead);
  res.json({ success: true, lead });
});

// Update lead
router.put('/leads/:id', (req, res) => {
  const { id } = req.params;
  const index = leads.findIndex(l => l.id == id);
  
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Lead not found' });
  }
  
  leads[index] = { ...leads[index], ...req.body, updatedAt: new Date().toISOString() };
  res.json({ success: true, lead: leads[index] });
});

// Delete lead
router.delete('/leads/:id', (req, res) => {
  const { id } = req.params;
  const index = leads.findIndex(l => l.id == id);
  
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Lead not found' });
  }
  
  leads.splice(index, 1);
  res.json({ success: true, message: 'Lead deleted' });
});

// Bulk import
router.post('/leads/import', (req, res) => {
  const { contacts } = req.body;
  
  if (!Array.isArray(contacts)) {
    return res.status(400).json({ success: false, error: 'contacts must be an array' });
  }
  
  const imported = contacts.map(c => ({
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    ...c,
    status: c.status || 'new',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
  
  leads.push(...imported);
  res.json({ success: true, imported: imported.length, total: leads.length });
});

// Export leads
router.get('/leads/export', (req, res) => {
  res.json({ success: true, exported: leads.length, data: leads });
});

// ============================================
// METRICS/DASHBOARD
// ============================================

router.get('/metrics', (req, res) => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  const todayCalls = callLog.filter(c => c.timestamp?.startsWith(today));
  const todaySms = smsLog.filter(s => s.timestamp?.startsWith(today));
  
  // Count by status
  const statusCounts = {};
  const regionCounts = {};
  const tagCounts = {};
  
  leads.forEach(l => {
    statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
    regionCounts[l.region] = (regionCounts[l.region] || 0) + 1;
    l.tags?.forEach(t => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    });
  });

  res.json({
    success: true,
    metrics: {
      totalLeads: leads.length,
      statusCounts,
      regionCounts,
      tagCounts,
      totalCalls: callLog.length,
      todayCalls: todayCalls.length,
      totalSms: smsLog.length,
      todaySms: todaySms.length,
      conversionRate: leads.length > 0 
        ? Math.round((leads.filter(l => l.status === 'active').length / leads.length) * 100) 
        : 0
    }
  });
});

// ============================================
// WEBHOOKS
// ============================================

// Incoming call webhook
router.post('/webhook/call', (req, res) => {
  console.log('Zadarma webhook:', req.body);
  
  const { event, call_start, caller_id, called_did, internal, duration, disposition } = req.body;
  
  const callRecord = {
    id: Date.now().toString(),
    from: caller_id,
    to: called_did,
    internal,
    direction: 'inbound',
    status: event === 'NOTIFY_START' ? 'ringing' : 
            event === 'NOTIFY_ANSWER' ? 'answered' :
            event === 'NOTIFY_END' ? (disposition === 'answered' ? 'completed' : 'missed') : event,
    duration: duration || 0,
    timestamp: call_start || new Date().toISOString()
  };
  
  callLog.push(callRecord);
  res.json({ status: 'ok' });
});

// Recording ready webhook
router.post('/webhook/recording', (req, res) => {
  console.log('Recording webhook:', req.body);
  const { call_id, link } = req.body;
  
  const call = callLog.find(c => c.zadarmaCallId === call_id);
  if (call) call.recordingUrl = link;
  
  res.json({ status: 'ok' });
});

module.exports = router;