import mongoose from 'mongoose';

const EmployeeTrainingSchema = new mongoose.Schema({
  growerId: String,
  employeeName: String,
  employeeId: String,
  courseName: String,
  trainingDate: Date,
  expiryDate: Date,
  certificateUrl: String,
  instructor: String,
  status: {
    type: String,
    enum: ['Valid', 'Expired', 'Pending'],
    default: 'Valid'
  },
  score: Number,
  notes: String
}, {
  timestamps: true
});

export default mongoose.model('EmployeeTraining', EmployeeTrainingSchema);
