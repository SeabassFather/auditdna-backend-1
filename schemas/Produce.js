const mongoose = require('mongoose');

const ProduceSchema = new mongoose.Schema({
    produceId: { type: String, required: true },
    growerId: { type: String, required: true },
    lotId: { type: String, required: true },
    commodity: { type: String, required: true },
    variety: { type: String, required: true },
    harvestDate: { type: Date, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true },
    grade: { type: String, required: true },
    packagingType: { type: String, required: true },
    temperature: { type: Number, required: true },
    shelfLife: { type: Number, required: true },
    labTestIds: { type: [String], required: false },
    certifications: { type: [String], required: false },
    status: { type: String, required: true },
});

module.exports = mongoose.model('Produce', ProduceSchema);
