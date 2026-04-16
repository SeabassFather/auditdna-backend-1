// ================================================================
// PRODUCE RECORD MODEL
// ================================================================
const mongoose = require('mongoose');

const produceRecordSchema = new mongoose.Schema({
  date: { type: Date, required: true, index: true },
  commodity: { type: String, required: true, index: true },
  variety: String,
  pack: String,
  region: { type: String, required: true, index: true },
  wholesalePrice: Number,
  retailPrice: Number,
  costEstimate: Number,
  freightCost: Number,
  volume: Number,
  currency: { type: String, default: 'USD' },
  source: { type: String, enum: ['AMS', 'NASS', 'RetailFeed'], default: 'AMS' },
  riskIndex: Number,
  aiForecast: Number,
  createdAt: { type: Date, default: Date.now }
});

// Compound indexes for performance
produceRecordSchema.index({ commodity: 1, date: -1 });
produceRecordSchema.index({ commodity: 1, variety: 1, pack: 1 });
produceRecordSchema.index({ region: 1, date: -1 });

module.exports = mongoose.model('ProduceRecord', produceRecordSchema);
