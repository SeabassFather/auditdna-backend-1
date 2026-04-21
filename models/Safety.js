import mongoose from 'mongoose';

const PriceSchema = new mongoose.Schema({
  entry_point: String,
  region: String,
  commodity: String,
  country: String,
  date: Date,
  price_wholesale: Number,
  price_retail: Number,
  source: String
});

export default mongoose.model('Price', PriceSchema);

