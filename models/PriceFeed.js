const mongoose = require('mongoose');
const PriceFeedSchema = new mongoose.Schema({
  product: String,
  zone: String,
  price: Number,
  volume: Number,
  timestamp: { type: Date, default: Date.now },
});
module.exports = mongoose.model('PriceFeed', PriceFeedSchema);

