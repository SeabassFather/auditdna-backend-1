const mongoose = require('mongoose');

const USDAAuditLogSchema = new mongoose.Schema({
    engine: {
        type: String,
        default: 'usda_pricing'
    },
    action: {
        type: String,
        required: true,
        enum: ['search', 'upload', 'report_generate', 'compliance_check', 'data_update', 'price_analysis']
    },
    data: {
        query: String,
        filters: mongoose.Schema.Types.Mixed,
        uploadId: String,
        reportId: String,
        commodity: String,
        priceData: mongoose.Schema.Types.Mixed,
        results: mongoose.Schema.Types.Mixed
    },
    userId: String,
    sessionId: String,
    timestamp: {
        type: Date,
        default: Date.now
    },
    ip: String,
    userAgent: String,
    status: {
        type: String,
        enum: ['success', 'failure', 'partial'],
        default: 'success'
    },
    error: String,
    duration: Number, // in milliseconds
    metadata: {
        apiVersion: String,
        clientVersion: String,
        source: String
    }
});

// Index for efficient querying
USDAAuditLogSchema.index({ timestamp: -1 });
USDAAuditLogSchema.index({ action: 1, timestamp: -1 });
USDAAuditLogSchema.index({ userId: 1, timestamp: -1 });

const USDAAuditLog = mongoose.model('USDAAuditLog', USDAAuditLogSchema);

module.exports = USDAAuditLog;