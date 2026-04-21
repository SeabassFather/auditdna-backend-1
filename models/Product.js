const mongoose = require('mongoose');
const ProductSchema = new mongoose.Schema({
  name: String,
  category: String,
  origin: String,
  hsCode: String,
  priceHistory: [{ date: Date, price: Number }], // For historical charting
  description: String,
  images: [String],
});
module.exports = mongoose.model('Product', ProductSchema);

