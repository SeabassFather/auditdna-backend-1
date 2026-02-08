// ================================================================
// CLIENT MODEL - MONGOOSE SCHEMA
// ================================================================
// Date: 2025-11-20 04:43:22 UTC
// Author: SeabassFather (Saul Garcia)
// Purpose: Buyer/Client management for CM Products
// ================================================================

const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  companyName: { type: String, required: true, trim: true },
  contactName: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, required: true },
  
  address: {
    street: String,
    city: String,
    state: String,
    zip: String,
    country: { type: String, default: 'USA' }
  },
  
  businessType: {
    type: String,
    enum: ['Retailer', 'Wholesaler', 'Restaurant', 'Processor', 'Exporter', 'Other'],
    default: 'Retailer'
  },
  
  registeredDate: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Pending', 'Suspended'],
    default: 'Pending'
  },
  
  certifications: [{
    type: { type: String },
    number: String,
    issueDate: Date,
    expiryDate: Date,
    verified: { type: Boolean, default: false }
  }],
  
  testHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TestHistory' }],
  notifications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Notification' }],
  
  createdBy: { type: String, default: 'SeabassFather' },
  lastModified: { type: Date, default: Date.now }
}, {
  timestamps: true
});

clientSchema.index({ email: 1 }, { unique: true });
clientSchema.index({ companyName: 1 });
clientSchema.index({ status: 1 });

module.exports = mongoose.model('Client', clientSchema);
