// ================================================================
// NOTIFICATION MODEL - MONGOOSE SCHEMA
// ================================================================
// Date: 2025-11-20 04:43:22 UTC
// Author: SeabassFather (Saul Garcia)
// Purpose: Real-time notifications for buyers and admins
// ================================================================

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: { type: String, enum: ['Client', 'Admin', 'All'], required: true },
    id: { type: mongoose.Schema.Types.ObjectId, refPath: 'recipient.type' }
  },
  
  title: { type: String, required: true },
  message: { type: String, required: true },
  
  type: {
    type: String,
    enum: ['Test Result', 'New Product', 'Alert', 'System', 'Marketing', 'Other'],
    default: 'System'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  
  relatedTest: { type: mongoose.Schema.Types.ObjectId, ref: 'TestHistory' },
  relatedClient: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  
  read: { type: Boolean, default: false },
  readDate: Date,
  
  deliveryMethod: {
    type: String,
    enum: ['Email', 'SMS', 'Push', 'In-App', 'All'],
    default: 'In-App'
  },
  sent: { type: Boolean, default: false },
  sentDate: Date,
  
  expiresAt: Date,
  
  actionUrl: String,
  actionLabel: String,
  
  createdBy: { type: String, default: 'System' }
}, {
  timestamps: true
});

notificationSchema.index({ 'recipient.id': 1, read: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ priority: 1 });
notificationSchema.index({ sent: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
