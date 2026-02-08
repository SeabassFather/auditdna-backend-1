// ================================================================
// CLIENTS ROUTES - REST API ENDPOINTS
// ================================================================
// Date: 2025-11-20 05:05:28 UTC
// Author: SeabassFather (Saul Garcia)
// Endpoints: 8 REST API endpoints for client management
// ================================================================

const express = require('express');
const router = express.Router();
const Client = require('../models/Client.cjs');
const Notification = require('../models/Notification.cjs');

// ================================================================
// 1. GET ALL CLIENTS
// ================================================================
router.get('/', async (req, res) => {
  try {
    const { status, businessType, search } = req.query;
    let query = {};
    
    if (status) query.status = status;
    if (businessType) query.businessType = businessType;
    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { contactName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const clients = await Client.find(query)
      .populate('testHistory')
      .populate('notifications')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, count: clients.length, data: clients });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================================================================
// 2. GET SINGLE CLIENT BY ID
// ================================================================
router.get('/:id', async (req, res) => {
  try {
    const client = await Client.findById(req.params.id)
      .populate('testHistory')
      .populate('notifications');
    
    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }
    
    res.json({ success: true, data: client });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================================================================
// 3. CREATE NEW CLIENT
// ================================================================
router.post('/', async (req, res) => {
  try {
    const newClient = new Client(req.body);
    await newClient.save();
    
    // Create welcome notification
    const notification = new Notification({
      recipient: { type: 'Client', id: newClient._id },
      title: 'Welcome to CM Products!',
      message: 'Your account has been created successfully. You can now access test results and product information.',
      type: 'System',
      priority: 'Medium',
      deliveryMethod: 'Email'
    });
    await notification.save();
    
    res.status(201).json({ success: true, data: newClient });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ================================================================
// 4. UPDATE CLIENT
// ================================================================
router.put('/:id', async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { ...req.body, lastModified: Date.now() },
      { new: true, runValidators: true }
    );
    
    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }
    
    res.json({ success: true, data: client });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ================================================================
// 5. DELETE CLIENT
// ================================================================
router.delete('/:id', async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    
    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }
    
    res.json({ success: true, data: {}, message: 'Client deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================================================================
// 6. GET CLIENT STATISTICS
// ================================================================
router.get('/stats/summary', async (req, res) => {
  try {
    const totalClients = await Client.countDocuments();
    const activeClients = await Client.countDocuments({ status: 'Active' });
    const pendingClients = await Client.countDocuments({ status: 'Pending' });
    const inactiveClients = await Client.countDocuments({ status: 'Inactive' });
    
    const byBusinessType = await Client.aggregate([
      { $group: { _id: '$businessType', count: { $sum: 1 } } }
    ]);
    
    res.json({
      success: true,
      data: {
        total: totalClients,
        active: activeClients,
        pending: pendingClients,
        inactive: inactiveClients,
        byBusinessType
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================================================================
// 7. UPDATE CLIENT STATUS
// ================================================================
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['Active', 'Inactive', 'Pending', 'Suspended'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { status, lastModified: Date.now() },
      { new: true }
    );
    
    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }
    
    // Create status change notification
    const notification = new Notification({
      recipient: { type: 'Client', id: client._id },
      title: 'Account Status Updated',
      message: `Your account status has been changed to: ${status}`,
      type: 'System',
      priority: status === 'Suspended' ? 'High' : 'Medium',
      deliveryMethod: 'Email'
    });
    await notification.save();
    
    res.json({ success: true, data: client });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ================================================================
// 8. ADD CERTIFICATION TO CLIENT
// ================================================================
router.post('/:id/certifications', async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }
    
    client.certifications.push(req.body);
    client.lastModified = Date.now();
    await client.save();
    
    res.json({ success: true, data: client });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;