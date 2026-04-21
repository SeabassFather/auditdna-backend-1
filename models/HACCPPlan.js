import mongoose from 'mongoose';

const HACCPPlanSchema = new mongoose.Schema({
  growerId: {
    type: String,
    required: true,
    index: true
  },
  facilityName: String,
  productType: String,
  hazards: [{
    type: {
      type: String,
      enum: ['Biological', 'Chemical', 'Physical']
    },
    description: String,
    severity: {
      type: String,
      enum: ['Low', 'Medium', 'High']
    }
  }],
  criticalControlPoints: [{
    ccp: String,
    criticalLimit: String,
    monitoringProcedure: String,
    frequency: String,
    correctiveAction: String,
    verificationProcedure: String,
    recordKeeping: String
  }],
  flowDiagram: String, // URL to diagram
  lastReviewDate: Date,
  nextReviewDate: Date,
  approvedBy: String,
  status: {
    type: String,
    enum: ['Draft', 'Approved', 'Under Review'],
    default: 'Draft'
  }
}, {
  timestamps: true
});

export default mongoose.model('HACCPPlan', HACCPPlanSchema);

