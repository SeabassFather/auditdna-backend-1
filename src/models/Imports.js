import mongoose from 'mongoose';

const ImportSchema = new mongoose.Schema({
  grower: { type: mongoose.Schema.Types.ObjectId, ref: 'Grower' },
  commodity: String,
  country: String,
  entry_point: String,
  region: String,
  volume: Number,
  unit: String,
  date: Date,
  price_wholesale: Number,
  price_retail: Number
});

export default mongoose.model('Import', ImportSchema);
