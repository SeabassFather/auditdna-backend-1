const mongoose = require('mongoose');

const USDAUploadSchema = new mongoose.Schema({
    engine: {
        type: String,
        default: 'usda_pricing'
    },
    filename: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    mimetype: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    path: {
        type: String,
        required: true
    },
    metadata: {
        commodity: String,
        location: String,
        marketDate: Date,
        source: String,
        description: String
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['uploaded', 'processing', 'processed', 'failed'],
        default: 'uploaded'
    },
    processedData: {
        recordsFound: Number,
        recordsImported: Number,
        errors: [String]
    }
});

const USDAUpload = mongoose.model('USDAUpload', USDAUploadSchema);

module.exports = USDAUpload;