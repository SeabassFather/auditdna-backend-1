const mongoose = require('mongoose');

const ComplianceDataSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        index: true
    },
    value: {
        type: Number,
        required: true
    },
    unit: {
        type: String,
        required: true,
        default: 'score'
    },
    testDate: {
        type: Date,
        required: true,
        index: true
    },
    location: {
        type: String,
        required: true
    },
    testType: {
        type: String,
        default: 'regulatory_check'
    },
    riskFactors: [{
        factor: String,
        severity: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical']
        },
        impact: Number
    }],
    complianceStatus: {
        type: String,
        enum: ['compliant', 'non-compliant', 'pending'],
        default: 'pending'
    },
    dataSource: {
        type: String,
        default: 'Compliance'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

ComplianceDataSchema.index({ name: 1, testDate: -1 });
ComplianceDataSchema.index({ location: 1, name: 1 });

const ComplianceData = mongoose.model('ComplianceData', ComplianceDataSchema);

module.exports = ComplianceData;