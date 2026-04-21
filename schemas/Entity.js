const mongoose = require('mongoose');
const EntitySchema = new mongoose.Schema({
    entityId: { type: String, required: true, unique: true, index: true },
    entityType: { type: String, enum: ['grower', 'buyer', 'field', 'lot', 'shipment'], required: true },
    name: { type: String, required: true },
    aliases: [String],
    linkedEntities: [{ entityId: String, relationship: String }],
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
EntitySchema.pre('save', function(next) { this.updatedAt = Date.now(); next(); });
module.exports = mongoose.model('Entity', EntitySchema);

