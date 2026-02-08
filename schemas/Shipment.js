const mongoose = require('mongoose');
const ShipmentSchema = new mongoose.Schema({
    shipmentId: { type: String, required: true, unique: true, index: true },
    manifestId: { type: String, required: true, index: true },
    growerId: { type: String, required: true },
    buyerId: { type: String, required: true },
    origin: { address: String, city: String, state: String, country: String },
    destination: { address: String, city: String, state: String, country: String },
    departureDate: Date,
    estimatedArrival: Date,
    actualArrival: Date,
    status: { type: String, enum: ['pending', 'in_transit', 'delivered', 'rejected', 'disputed'], default: 'pending' },
    temperatureViolations: [{ timestamp: Date, temperature: Number, threshold: Number }],
    currentLocation: { latitude: Number, longitude: Number, address: String, lastUpdated: Date },
    carrier: String,
    trackingNumber: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
ShipmentSchema.pre('save', function(next) { this.updatedAt = Date.now(); next(); });
module.exports = mongoose.model('Shipment', ShipmentSchema);