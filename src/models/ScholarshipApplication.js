const mongoose = require('mongoose');

const scholarshipApplicationSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    maxlength: 255
  },
  phone: {
    type: String,
    trim: true,
    maxlength: 50
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  education: {
    type: String,
    trim: true,
    required: true
  },
  institution: {
    type: String,
    trim: true,
    required: true
  },
  fieldOfStudy: {
    type: String,
    trim: true,
    required: true
  },
  gpa: {
    type: Number
  },
  achievements: {
    type: String,
    trim: true
  },
  statement: {
    type: String,
    required: true,
    trim: true
  },
  references: [{
    name: String,
    relationship: String,
    contact: String
  }],
  documents: [{
    name: String,
    url: String,
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Add any pre-save hooks or methods here if needed
scholarshipApplicationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('ScholarshipApplication', scholarshipApplicationSchema);