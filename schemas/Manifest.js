const mongoose = require('mongoose');
const ManifestSchema = new mongoose.Schema({
    manifestId: { type: String, required: true, unique: true, index: true },
    shipmentId: { type: String, required: true, index: true },
    bolNumber: { type: String, required: true },
    origin: { address: String, city: String, state: String, country: String },
    destination: { address: String, city: String, state: String, country: String },
    carrier: String,
    departureDate: Date,
    estimatedArrival: Date,
    actualArrival: Date,
    items: [{ produceId: String, commodity: String, quantity: Number, unit: String, grade: String }],
    temperatureLog: [{ timestamp: Date, temperature: Number, location: String }],
    inspections: [{ inspectionId: String, date: Date, result: String, notes: String }],
    status: { type: String, enum: ['pending', 'in_transit', 'delivered', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
ManifestSchema.pre('save', function(next) { this.updatedAt = Date.now(); next(); });
module.exports = mongoose.model('Manifest', ManifestSchema);