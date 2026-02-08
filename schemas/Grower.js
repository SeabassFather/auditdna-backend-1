const mongoose = require('mongoose');
const GrowerSchema = new mongoose.Schema({
  growerId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  grsScore: { type: Number, min: 0, max: 100, default: 0 },
  certifications: [String],
  fieldIds: [String],
  waterTestResults: [{ testId: String, date: Date, status: String, score: Number }],
  soilTestResults: [{ testId: String, date: Date, status: String, score: Number }],
  complianceStatus: { type: String, enum: ['compliant', 'non-compliant', 'pending'], default: 'pending' },
  exportEligible: { type: Boolean, default: false },
  contactInfo: { phone: String, email: String, address: String },
  region: String,
  commodities: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

GrowerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Grower', GrowerSchema);