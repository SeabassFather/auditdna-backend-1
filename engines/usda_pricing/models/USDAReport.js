const mongoose = require('mongoose');

const USDAReportSchema = new mongoose.Schema({
    reportId: {
        type: String,
        required: true,
        unique: true
    },
    engine: {
        type: String,
        default: 'usda_pricing'
    },
    type: {
        type: String,
        required: true,
        enum: ['price_analysis', 'risk_assessment', 'compliance_check', 'market_trends']
    },
    title: {
        type: String,
        required: true
    },
    data: {
        commodity: String,
        timeframe: String,
        analysis: mongoose.Schema.Types.Mixed,
        metrics: {
            price_volatility: Number,
            market_risk_score: Number,
            compliance_status: String,
            forecast_accuracy: Number
        },
        charts: [String], // URLs to chart images
        tables: [mongoose.Schema.Types.Mixed]
    },
    generatedAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['pending', 'generating', 'completed', 'failed'],
        default: 'pending'
    },
    options: {
        format: {
            type: String,
            enum: ['pdf', 'json', 'csv'],
            default: 'json'
        },
        includeCharts: {
            type: Boolean,
            default: true
        },
        includeRawData: {
            type: Boolean,
            default: false
        }
    },
    filePath: String, // Path to generated report file
    fileSize: Number
});

const USDAReport = mongoose.model('USDAReport', USDAReportSchema);

module.exports = USDAReport;