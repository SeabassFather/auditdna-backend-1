const mongoose = require('mongoose');

const labTestSchema = new mongoose.Schema({
    testId: { type: String, required: true },
    growerId: { type: String, required: true },
    testType: { type: String, required: true },
    sampleDate: { type: Date, required: true },
    resultsDate: { type: Date, required: true },
    status: { type: String, required: true },
    labName: { type: String, required: true },
    parameters: { type: [String], required: true },
    complianceStatus: { type: String, required: true },
    violations: { type: [String], default: [] },
    pdfUrl: { type: String, required: true }
});

module.exports = mongoose.model('LabTest', labTestSchema);