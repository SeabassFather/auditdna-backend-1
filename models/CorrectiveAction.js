import mongoose from 'mongoose';

const CorrectiveActionSchema = new mongoose.Schema({
  growerId: String,
  deviationType: String,
  description: String,
  identifiedDate: Date,
  assignedTo: String,
  dueDate: Date,
  completedDate: Date,
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Completed', 'Verified'],
    default: 'Open'
  },
  beforePhotos: [String],
  afterPhotos: [String],
  rootCause: String,
  correctiveAction: String,
  preventiveAction: String,
  verifiedBy: String,
  verificationDate: Date,
  notes: String
}, {
  timestamps: true
});

export default mongoose.model('CorrectiveAction', CorrectiveActionSchema);