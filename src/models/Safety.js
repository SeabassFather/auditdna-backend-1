import mongoose from 'mongoose';

const SafetySchema = new mongoose.Schema({
  grower: { type: mongoose.Schema.Types.ObjectId, ref: 'Grower' },
  status: String,
  last_action: Date,
  action_type: String,
  notes: String
});

export default mongoose.model('Safety', SafetySchema);