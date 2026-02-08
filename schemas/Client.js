const mongoose = require('mongoose');
const ClientSchema = new mongoose.Schema({
    clientId: { type: String, required: true, unique: true, index: true },
    clientType: { type: String, enum: ['grower', 'buyer', 'distributor', 'exporter'], required: true },
    companyName: { type: String, required: true },
    contactPerson: { firstName: String, lastName: String, title: String },
    email: { type: String, required: true },
    phone: String,
    address: { street: String, city: String, state: String, country: String, postalCode: String },
    taxId: String,
    certifications: [String],
    activeContracts: [String],
    creditLimit: Number,
    paymentTerms: String,
    status: { type: String, enum: ['active', 'suspended', 'inactive'], default: 'active' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
ClientSchema.pre('save', function(next) { this.updatedAt = Date.now(); next(); });
module.exports = mongoose.model('Client', ClientSchema);