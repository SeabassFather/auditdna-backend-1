const mongoose = require('mongoose');
const DisputeSchema = new mongoose.Schema({
    disputeId: { type: String, required: true, unique: true, index: true },
    escrowId: { type: String, required: true, index: true },
    shipmentId: { type: String, required: true },
    initiatedBy: { type: String, enum: ['buyer', 'seller'], required: true },
    reason: { type: String, required: true },
    description: String,
    evidence: [{ type: String, description: String, uploadedAt: Date, url: String }],
    faultAttribution: { party: String, percentage: Number, reasoning: String },
    recoveryPercentage: Number,
    status: { type: String, enum: ['open', 'investigating', 'resolved', 'escalated'], default: 'open' },
    resolution: String,
    legalPacket: { english: String, spanish: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    resolvedAt: Date
});
DisputeSchema.pre('save', function(next) { this.updatedAt = Date.now(); next(); });
module.exports = mongoose.model('Dispute', DisputeSchema);

