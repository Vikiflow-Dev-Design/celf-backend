const mongoose = require('mongoose');

const contactSubmissionSchema = new mongoose.Schema({
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
  company: {
    type: String,
    trim: true,
    maxlength: 200
  },
  inquiryType: {
    type: String,
    required: true,
    enum: ['general', 'technical', 'partnership', 'media', 'other']
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['new', 'in_progress', 'resolved', 'closed'],
    default: 'new'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  response: {
    type: String,
    trim: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for better performance
contactSubmissionSchema.index({ email: 1 });
contactSubmissionSchema.index({ status: 1 });
contactSubmissionSchema.index({ inquiryType: 1 });
contactSubmissionSchema.index({ createdAt: -1 });
contactSubmissionSchema.index({ assignedTo: 1 });

// Virtual for full name
contactSubmissionSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Static method to find by status
contactSubmissionSchema.statics.findByStatus = function(status) {
  return this.find({ status }).sort({ createdAt: -1 });
};

// Static method to find by inquiry type
contactSubmissionSchema.statics.findByInquiryType = function(inquiryType) {
  return this.find({ inquiryType }).sort({ createdAt: -1 });
};

// Method to assign to user
contactSubmissionSchema.methods.assignTo = function(userId) {
  this.assignedTo = userId;
  this.status = 'in_progress';
  return this.save();
};

// Method to resolve submission
contactSubmissionSchema.methods.resolve = function(response) {
  this.status = 'resolved';
  this.response = response;
  return this.save();
};

module.exports = mongoose.model('ContactSubmission', contactSubmissionSchema);
