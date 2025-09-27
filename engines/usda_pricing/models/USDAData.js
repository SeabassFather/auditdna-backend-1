const mongoose = require('mongoose');

const USDADataSchema = new mongoose.Schema({
    commodity: {
        type: String,
        required: true,
        index: true
    },
    price: {
        type: Number,
        required: true
    },
    priceUnit: {
        type: String,
        required: true,
        default: 'USD/bushel'
    },
    marketDate: {
        type: Date,
        required: true,
        index: true
    },
    location: {
        type: String,
        required: true
    },
    grade: {
        type: String,
        default: 'No. 1'
    },
    volume: {
        type: Number,
        default: 0
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
        default: 'USDA'
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

// Create compound indexes for efficient querying
USDADataSchema.index({ commodity: 1, marketDate: -1 });
USDADataSchema.index({ location: 1, commodity: 1 });

const USDAData = mongoose.model('USDAData', USDADataSchema);

module.exports = USDAData;