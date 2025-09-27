const mongoose = require('mongoose');

const SearchMetaDataSchema = new mongoose.Schema({
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
        default: 'relevance'
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
        default: 'meta_search'
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
        default: 'Search Meta'
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

SearchMetaDataSchema.index({ name: 1, testDate: -1 });
SearchMetaDataSchema.index({ location: 1, name: 1 });

const SearchMetaData = mongoose.model('SearchMetaData', SearchMetaDataSchema);

module.exports = SearchMetaData;