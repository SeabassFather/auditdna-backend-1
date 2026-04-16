import mongoose from 'mongoose';

const GrowerSchema = new mongoose.Schema({
  name: String,
  country: String,
  region: String,
  state: String,
  city: String,
  commodity: [String],
  certification: String,
  cert_status: String,
  cert_expiry: Date,
  last_inspection: Date,
  entry_points: [String],
  registration_number: String,
  food_safety_status: String,
  extra: mongoose.Schema.Types.Mixed
});

export default mongoose.model('Grower', GrowerSchema);
