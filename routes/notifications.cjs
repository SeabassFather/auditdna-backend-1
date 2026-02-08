// ================================================================
// NOTIFICATIONS ROUTES - REST API ENDPOINTS
// ================================================================
// Date: 2025-11-20 05:06:43 UTC
// Author: SeabassFather (Saul Garcia)
// Endpoints: 11 REST API endpoints for notification management
// ================================================================

const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification.cjs');
const Client = require('../models/Client.cjs');

// ================================================================
// 1. GET ALL NOTIFICATIONS
// ================================================================
router.get('/', async (req, res) => {
  try {
    const { type, priority, read, sent } = req.query;
    let query = {};
    
    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (read !== undefined) query.read = read === 'true';
    if (sent !== undefined) query.sent = sent === 'true';
    
    const notifications = await Notification.find(query)
      .populate('relatedTest', 'productName lotNumber result')
      .populate('relatedClient', 'companyName contactName')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, count: notifications.length, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================================================================
// 2. GET NOTIFICATIONS BY CLIENT ID
// ================================================================
router.get('/client/:clientId', async (req, res) => {
  try {
    const notifications = await Notification.find({ 
      'recipient.id': req.params.clientId 
    })
    .populate('relatedTest', 'productName lotNumber result')
    .sort({ createdAt: -1 });
    
    res.json({ success: true, count: notifications.length, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================================================================
// 3. GET UNREAD NOTIFICATIONS BY CLIENT
// ================================================================
router.get('/client/:clientId/unread', async (req, res) => {
  try {
    const notifications = await Notification.find({ 
      'recipient.id': req.params.clientId,
      read: false
    })
    .populate('relatedTest', 'productName lotNumber result')
    .sort({ createdAt: -1 });
    
    res.json({ success: true, count: notifications.length, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================================================================
// 4. CREATE NEW NOTIFICATION
// ================================================================
router.post('/', async (req, res) => {
  try {
    const newNotification = new Notification(req.body);
    await newNotification.save();
    
    // Add notification to client
    if (newNotification.recipient.type === 'Client' && newNotification.recipient.id) {
      await Client.findByIdAndUpdate(
        newNotification.recipient.id,
        { $push: { notifications: newNotification._id } }
      );
    }
    
    res.status(201).json({ success: true, data: newNotification });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ================================================================
// 5. MARK NOTIFICATION AS READ
// ================================================================
router.patch('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true, readDate: Date.now() },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    
    res.json({ success: true, data: notification });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ================================================================
// 6. MARK ALL AS READ FOR CLIENT
// ================================================================
router.patch('/client/:clientId/read-all', async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { 'recipient.id': req.params.clientId, read: false },
      { read: true, readDate: Date.now() }
    );
    
    res.json({ 
      success: true, 
      message: `Marked ${result.modifiedCount} notifications as read` 
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ================================================================
// 7. DELETE NOTIFICATION
// ================================================================
router.delete('/:id', async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    
    // Remove from client
    if (notification.recipient.type === 'Client' && notification.recipient.id) {
      await Client.findByIdAndUpdate(
        notification.recipient.id,
        { $pull: { notifications: notification._id } }
      );
    }
    
    res.json({ success: true, data: {}, message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================================================================
// 8. GET NOTIFICATION STATISTICS
// ================================================================
router.get('/stats/summary', async (req, res) => {
  try {
    const totalNotifications = await Notification.countDocuments();
    const unreadNotifications = await Notification.countDocuments({ read: false });
    const sentNotifications = await Notification.countDocuments({ sent: true });
    
    const byType = await Notification.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    
    const byPriority = await Notification.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);
    
    res.json({
      success: true,
      data: {
        total: totalNotifications,
        unread: unreadNotifications,
        sent: sentNotifications,
        byType,
        byPriority
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================================================================
// 9. SEND NOTIFICATION (Mark as sent)
// ================================================================
router.patch('/:id/send', async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { sent: true, sentDate: Date.now() },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    
    // TODO: Integrate with email/SMS service here
    
    res.json({ success: true, data: notification });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ================================================================
// 10. GET URGENT NOTIFICATIONS
// ================================================================
router.get('/urgent/all', async (req, res) => {
  try {
    const urgentNotifications = await Notification.find({ 
      priority: 'Urgent',
      read: false
    })
    .populate('relatedTest', 'productName lotNumber result')
    .populate('relatedClient', 'companyName contactName email')
    .sort({ createdAt: -1 });
    
    res.json({ success: true, count: urgentNotifications.length, data: urgentNotifications });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================================================================
// 11. BROADCAST NOTIFICATION TO ALL CLIENTS
// ================================================================
router.post('/broadcast', async (req, res) => {
  try {
    const { title, message, type, priority } = req.body;
    
    const clients = await Client.find({ status: 'Active' });
    
    const notifications = clients.map(client => ({
      recipient: { type: 'Client', id: client._id },
      title,
      message,
      type: type || 'System',
      priority: priority || 'Medium',
      deliveryMethod: 'All',
      createdBy: 'Admin'
    }));
    
    const created = await Notification.insertMany(notifications);
    
    res.json({ 
      success: true, 
      message: `Broadcast sent to ${clients.length} clients`,
      count: created.length 
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;