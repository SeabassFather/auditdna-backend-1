const mongoose = require('mongoose');

const loanApplicationSchema = new mongoose.Schema({
    loanId: { type: String, required: true },
    clientId: { type: String, required: true },
    clientType: { type: String, enum: ['individual', 'business'], required: true },
    loanType: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    term: { type: Number, required: true },
    interestRate: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'approved', 'declined'], required: true },
    triangularRiskScore: { type: Number },
    grsScore: { type: Number },
    collateral: { type: String },
    documents: { type: [String] },
    approvalDate: { type: Date },
    disbursementDate: { type: Date }
});

module.exports = mongoose.model('LoanApplication', loanApplicationSchema);

