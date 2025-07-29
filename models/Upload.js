const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema({
  filename: String,
  originalname: String,
  mimetype: String,
  size: Number,
  uploadDate: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Upload', uploadSchema);
