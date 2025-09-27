const mongoose = require('mongoose');

const FactoringDataSchema = new mongoose.Schema({
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
        default: 'USD'
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
        default: 'credit_analysis'
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
        default: 'Factoring'
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

FactoringDataSchema.index({ name: 1, testDate: -1 });
FactoringDataSchema.index({ location: 1, name: 1 });

const FactoringData = mongoose.model('FactoringData', FactoringDataSchema);

module.exports = FactoringData;