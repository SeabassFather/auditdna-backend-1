const mongoose = require('mongoose');
const ComplianceRuleSchema = new mongoose.Schema({
    ruleId: { type: String, required: true, unique: true, index: true },
    jurisdiction: { type: String, required: true },
    category: { type: String, enum: ['MRL', 'FSVP', 'GAP', 'HACCP', 'customs'], required: true },
    commodity: String,
    parameter: String,
    limit: mongoose.Schema.Types.Mixed,
    unit: String,
    severity: { type: String, enum: ['critical', 'major', 'minor'], default: 'major' },
    effectiveDate: Date,
    expiryDate: Date,
    description: String,
    reference: String,
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
ComplianceRuleSchema.pre('save', function(next) { this.updatedAt = Date.now(); next(); });
module.exports = mongoose.model('ComplianceRule', ComplianceRuleSchema);