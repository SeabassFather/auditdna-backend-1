import mongoose from 'mongoose';

const CertificationSchema = new mongoose.Schema({
  growerId: {
    type: String,
    required: true,
    index: true
  },
  certificationType: {
    type: String,
    required: true,
    enum: ['PrimusGFS', 'HACCP', 'FDA', 'GLOBALG.A.P.', 'BRC', 'SQF', 'Organic', 'Other']
  },
  issuingBody: String,
  certificateNumber: String,
  scope: String,
  validFrom: Date,
  validTo: Date,
  status: {
    type: String,
    enum: ['Valid', 'Expired', 'Pending Renewal', 'Suspended'],
    default: 'Valid'
  },
  documentUrl: String,
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  verifiedBy: String,
  notes: String
}, {
  timestamps: true
});

// Check expiry status
CertificationSchema.methods.checkExpiry = function() {
  const now = new Date();
  const daysUntilExpiry = Math.floor((this.validTo - now) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiry < 0) {
    this.status = 'Expired';
  } else if (daysUntilExpiry < 30) {
    this.status = 'Pending Renewal';
  } else {
    this.status = 'Valid';
  }
  
  return daysUntilExpiry;
};

export default mongoose.model('Certification', CertificationSchema);