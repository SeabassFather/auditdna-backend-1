const mongoose = require('mongoose');
const EscrowSchema = new mongoose.Schema({
    escrowId: { type: String, required: true, unique: true, index: true },
    invoiceId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, enum: ['USD', 'MXN', 'CAD'], default: 'USD' },
    status: { type: String, enum: ['pending', 'held', 'released', 'disputed', 'cancelled'], default: 'pending' },
    conditions: [{ type: String, status: { type: String, enum: ['pending', 'met', 'failed'] }, verifiedAt: Date }],
    holdReason: String,
    releaseDate: Date,
    disputeId: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
EscrowSchema.pre('save', function(next) { this.updatedAt = Date.now(); next(); });
module.exports = mongoose.model('Escrow', EscrowSchema);