import mongoose from 'mongoose';

const LabResultSchema = new mongoose.Schema({
  growerId: String,
  lotId: String,
  labName: String,
  testDate: Date,
  receivedDate: Date,
  analyte: String,
  testMethod: String,
  result: Number,
  unit: String,
  threshold: Number,
  passFailStatus: {
    type: String,
    enum: ['Pass', 'Fail', 'Inconclusive'],
    required: true
  },
  category: {
    type: String,
    enum: ['Microbial', 'Pesticide', 'Heavy Metal', 'Residue', 'Other']
  },
  documentUrl: String,
  aiFlags: [{
    flag: String,
    severity: String
  }],
  notes: String
}, {
  timestamps: true
});

export default mongoose.model('LabResult', LabResultSchema);

