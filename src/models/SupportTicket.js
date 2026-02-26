const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
    trim: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isStaff: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const attachmentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const supportTicketSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    maxlength: 255
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  category: {
    type: String,
    required: true,
    enum: ['technical', 'account', 'mining', 'wallet', 'general']
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deviceInfo: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  attachments: [attachmentSchema],
  responses: [responseSchema],
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
supportTicketSchema.index({ email: 1 });
supportTicketSchema.index({ status: 1 });
supportTicketSchema.index({ priority: 1 });
supportTicketSchema.index({ category: 1 });
supportTicketSchema.index({ createdAt: -1 });
supportTicketSchema.index({ assignedTo: 1 });

// Virtual for response count
supportTicketSchema.virtual('responseCount').get(function() {
  return this.responses.length;
});

// Virtual for last response
supportTicketSchema.virtual('lastResponse').get(function() {
  if (this.responses.length === 0) return null;
  return this.responses[this.responses.length - 1];
});

// Static method to find by status
supportTicketSchema.statics.findByStatus = function(status) {
  return this.find({ status }).sort({ createdAt: -1 });
};

// Static method to find by priority
supportTicketSchema.statics.findByPriority = function(priority) {
  return this.find({ priority }).sort({ createdAt: -1 });
};

// Static method to find by category
supportTicketSchema.statics.findByCategory = function(category) {
  return this.find({ category }).sort({ createdAt: -1 });
};

// Method to assign to user
supportTicketSchema.methods.assignTo = function(userId) {
  this.assignedTo = userId;
  this.status = 'in_progress';
  return this.save();
};

// Method to add response
supportTicketSchema.methods.addResponse = function(message, authorId, isStaff = false) {
  this.responses.push({
    message,
    author: authorId,
    isStaff,
    createdAt: new Date()
  });
  
  // Update status if it's the first staff response
  if (isStaff && this.status === 'open') {
    this.status = 'in_progress';
  }
  
  return this.save();
};

// Method to add attachment
supportTicketSchema.methods.addAttachment = function(attachmentData) {
  this.attachments.push(attachmentData);
  return this.save();
};

// Method to resolve ticket
supportTicketSchema.methods.resolve = function() {
  this.status = 'resolved';
  return this.save();
};

// Method to close ticket
supportTicketSchema.methods.close = function() {
  this.status = 'closed';
  return this.save();
};

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
