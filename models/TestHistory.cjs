// ================================================================
// TEST HISTORY MODEL - MONGOOSE SCHEMA
// ================================================================
// Date: 2025-11-20 04:43:22 UTC
// Author: SeabassFather (Saul Garcia)
// Purpose: Track all produce test results for buyers
// ================================================================

const mongoose = require('mongoose');

const testHistorySchema = new mongoose.Schema({
  client: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Client', 
    required: true 
  },
  
  productName: { type: String, required: true },
  productCategory: {
    type: String,
    enum: ['Produce', 'Protein', 'Dairy', 'Packaged', 'Other'],
    default: 'Produce'
  },
  variety: String,
  
  lotNumber: { type: String, required: true },
  batchNumber: String,
  growerInfo: {
    name: String,
    location: String,
    certifications: [String]
  },
  
  testType: {
    type: String,
    enum: ['Microbial', 'Pesticide', 'Heavy Metals', 'Quality', 'Visual', 'Other'],
    required: true
  },
  testDate: { type: Date, default: Date.now },
  sampleSize: String,
  
  result: {
    type: String,
    enum: ['Pass', 'Fail', 'Pending', 'Conditional'],
    default: 'Pending'
  },
  resultDetails: String,
  
  labName: String,
  labCertNumber: String,
  testedBy: String,
  
  reportUrl: String,
  certificateUrl: String,
  attachments: [{
    fileName: String,
    fileUrl: String,
    uploadDate: Date
  }],
  
  status: {
    type: String,
    enum: ['Scheduled', 'In Progress', 'Completed', 'Rejected', 'Expired'],
    default: 'Scheduled'
  },
  
  alertSent: { type: Boolean, default: false },
  alertSentDate: Date,
  
  createdBy: { type: String, default: 'SeabassFather' },
  notes: String
}, {
  timestamps: true
});

testHistorySchema.index({ client: 1 });
testHistorySchema.index({ lotNumber: 1 });
testHistorySchema.index({ testDate: -1 });
testHistorySchema.index({ result: 1 });
testHistorySchema.index({ status: 1 });

module.exports = mongoose.model('TestHistory', testHistorySchema);
