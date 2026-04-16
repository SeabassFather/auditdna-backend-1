const mongoose = require('mongoose');
const TraceabilityEventSchema = new mongoose.Schema({
    eventId: { type: String, required: true, unique: true, index: true },
    shipmentId: { type: String, required: true, index: true },
    eventType: { type: String, enum: ['harvest', 'pack', 'load', 'transit', 'inspection', 'delivery'], required: true },
    timestamp: { type: Date, required: true, default: Date.now },
    location: { latitude: Number, longitude: Number, address: String },
    temperature: Number,
    humidity: Number,
    responsibleParty: String,
    notes: String,
    photos: [String],
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('TraceabilityEvent', TraceabilityEventSchema);
