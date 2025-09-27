const mongoose = require('mongoose');

const MortgageRealEstateDataSchema = new mongoose.Schema({
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
        default: 'property_analysis'
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
        default: 'Mortgage Real Estate'
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

MortgageRealEstateDataSchema.index({ name: 1, testDate: -1 });
MortgageRealEstateDataSchema.index({ location: 1, name: 1 });

const MortgageRealEstateData = mongoose.model('MortgageRealEstateData', MortgageRealEstateDataSchema);

module.exports = MortgageRealEstateData;