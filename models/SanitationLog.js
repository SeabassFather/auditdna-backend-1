import mongoose from 'mongoose';

const SanitationLogSchema = new mongoose.Schema({
  growerId: String,
  facilityName: String,
  equipmentLine: String,
  sanitizerLot: String,
  employeeInitials: String,
  cleaningDateTime: Date,
  verifiedBy: String,
  notes: String,
  passed: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export default mongoose.model('SanitationLog', SanitationLogSchema);
