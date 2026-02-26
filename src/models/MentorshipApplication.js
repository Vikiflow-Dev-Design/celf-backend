const mongoose = require('mongoose');

const mentorshipApplicationSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['mentor', 'mentee']
  },
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
  
  // Common fields
  availability: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  
  // Mentor-specific fields
  education: {
    type: String,
    trim: true
  },
  experience: {
    type: String,
    trim: true
  },
  expertise: {
    type: mongoose.Schema.Types.Mixed,
    default: []
  },
  motivation: {
    type: String,
    trim: true
  },
  linkedinProfile: {
    type: String,
    trim: true,
    maxlength: 500
  },
  resumeUrl: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  // Mentee-specific fields
  currentEducation: {
    type: String,
    trim: true
  },
  goals: {
    type: String,
    trim: true
  },
  interests: {
    type: mongoose.Schema.Types.Mixed,
    default: []
  },
  challenges: {
    type: String,
    trim: true
  },
  
  // Review fields
  reviewNotes: {
    type: String,
    trim: true
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
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
mentorshipApplicationSchema.index({ email: 1 });
mentorshipApplicationSchema.index({ type: 1 });
mentorshipApplicationSchema.index({ status: 1 });
mentorshipApplicationSchema.index({ createdAt: -1 });
mentorshipApplicationSchema.index({ reviewedBy: 1 });

// Virtual for full name
mentorshipApplicationSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for is mentor
mentorshipApplicationSchema.virtual('isMentor').get(function() {
  return this.type === 'mentor';
});

// Virtual for is mentee
mentorshipApplicationSchema.virtual('isMentee').get(function() {
  return this.type === 'mentee';
});

// Static method to find by type
mentorshipApplicationSchema.statics.findByType = function(type) {
  return this.find({ type }).sort({ createdAt: -1 });
};

// Static method to find by status
mentorshipApplicationSchema.statics.findByStatus = function(status) {
  return this.find({ status }).sort({ createdAt: -1 });
};

// Static method to find mentors
mentorshipApplicationSchema.statics.findMentors = function() {
  return this.find({ type: 'mentor' }).sort({ createdAt: -1 });
};

// Static method to find mentees
mentorshipApplicationSchema.statics.findMentees = function() {
  return this.find({ type: 'mentee' }).sort({ createdAt: -1 });
};

// Static method to find approved mentors
mentorshipApplicationSchema.statics.findApprovedMentors = function() {
  return this.find({ type: 'mentor', status: 'approved' }).sort({ createdAt: -1 });
};

// Static method to find approved mentees
mentorshipApplicationSchema.statics.findApprovedMentees = function() {
  return this.find({ type: 'mentee', status: 'approved' }).sort({ createdAt: -1 });
};

// Method to approve application
mentorshipApplicationSchema.methods.approve = function(reviewedBy, reviewNotes = null) {
  this.status = 'approved';
  this.reviewedBy = reviewedBy;
  this.reviewedAt = new Date();
  if (reviewNotes) {
    this.reviewNotes = reviewNotes;
  }
  return this.save();
};

// Method to reject application
mentorshipApplicationSchema.methods.reject = function(reviewedBy, reviewNotes = null) {
  this.status = 'rejected';
  this.reviewedBy = reviewedBy;
  this.reviewedAt = new Date();
  if (reviewNotes) {
    this.reviewNotes = reviewNotes;
  }
  return this.save();
};

// Method to add expertise (for mentors)
mentorshipApplicationSchema.methods.addExpertise = function(expertiseItem) {
  if (this.type !== 'mentor') {
    throw new Error('Only mentors can have expertise');
  }
  if (!Array.isArray(this.expertise)) {
    this.expertise = [];
  }
  if (!this.expertise.includes(expertiseItem)) {
    this.expertise.push(expertiseItem);
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to add interest (for mentees)
mentorshipApplicationSchema.methods.addInterest = function(interest) {
  if (this.type !== 'mentee') {
    throw new Error('Only mentees can have interests');
  }
  if (!Array.isArray(this.interests)) {
    this.interests = [];
  }
  if (!this.interests.includes(interest)) {
    this.interests.push(interest);
    return this.save();
  }
  return Promise.resolve(this);
};

module.exports = mongoose.model('MentorshipApplication', mentorshipApplicationSchema);
