const mongoose = require('mongoose');
const InvoiceSchema = new mongoose.Schema({
    invoiceId: { type: String, required: true, unique: true, index: true },
    clientId: { type: String, required: true, index: true },
    shipmentId: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, enum: ['USD', 'MXN', 'CAD'], default: 'USD' },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'paid', 'overdue', 'disputed'], default: 'pending' },
    lineItems: [{ description: String, quantity: Number, unitPrice: Number, total: Number }],
    escrowId: String,
    paymentDate: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
InvoiceSchema.pre('save', function(next) { this.updatedAt = Date.now(); next(); });
module.exports = mongoose.model('Invoice', InvoiceSchema);
