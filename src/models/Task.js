const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  // Task identification
  taskId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Basic information
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  
  // Category for grouping tasks
  category: {
    type: String,
    enum: ['mining', 'social', 'wallet', 'referral'],
    required: true,
    index: true
  },
  
  // Progress tracking
  maxProgress: {
    type: Number,
    required: true,
    min: 1
  },
  
  // Reward information
  reward: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Visual representation
  icon: {
    type: String,
    required: true,
    trim: true
  },
  
  // Helper information
  tips: [{
    type: String,
    trim: true,
    maxlength: 200
  }],
  requirements: [{
    type: String,
    trim: true,
    maxlength: 200
  }],
  
  // Task status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Task type for tracking logic
  trackingType: {
    type: String,
    enum: ['manual', 'automatic'],
    default: 'automatic'
  },
  
  // Conditions for automatic tracking
  conditions: {
    // For mining tasks
    miningSessionsRequired: {
      type: Number,
      min: 0
    },
    miningAmountRequired: {
      type: Number,
      min: 0
    },
    
    // For social tasks
    referralsRequired: {
      type: Number,
      min: 0
    },
    
    // For wallet tasks
    transactionsRequired: {
      type: Number,
      min: 0
    },
    balanceRequired: {
      type: Number,
      min: 0
    },
    
    // For milestone tasks
    totalTokensRequired: {
      type: Number,
      min: 0
    },
    
    // Custom conditions (for complex tasks)
    customConditions: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  
  // Ordering and display
  sortOrder: {
    type: Number,
    default: 0
  },
  
  // Link task functionality
  isLinkTask: {
    type: Boolean,
    default: false
  },
  linkUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        // Only validate URL if isLinkTask is true
        if (this.isLinkTask && v) {
          return /^https?:\/\/.+/.test(v);
        }
        return true;
      },
      message: 'Link URL must be a valid HTTP/HTTPS URL'
    }
  },
  
  // Metadata
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
taskSchema.index({ category: 1, isActive: 1 });
taskSchema.index({ sortOrder: 1 });
taskSchema.index({ isActive: 1, sortOrder: 1 });

// Static methods
taskSchema.statics.findByCategory = function(category) {
  return this.find({ category, isActive: true }).sort({ sortOrder: 1 });
};

taskSchema.statics.findActiveTasks = function() {
  return this.find({ isActive: true }).sort({ category: 1, sortOrder: 1 });
};

taskSchema.statics.findByTaskId = function(taskId) {
  return this.findOne({ taskId, isActive: true });
};

// Instance methods
taskSchema.methods.checkConditions = function(userStats) {
  const conditions = this.conditions;
  
  // Check mining conditions
  if (conditions.miningSessionsRequired && userStats.miningSessionsCount < conditions.miningSessionsRequired) {
    return false;
  }
  
  if (conditions.miningAmountRequired && userStats.totalMined < conditions.miningAmountRequired) {
    return false;
  }
  
  // Check social conditions
  if (conditions.referralsRequired && userStats.referralsCount < conditions.referralsRequired) {
    return false;
  }
  
  // Check wallet conditions
  if (conditions.transactionsRequired && userStats.transactionsCount < conditions.transactionsRequired) {
    return false;
  }
  
  if (conditions.balanceRequired && userStats.totalBalance < conditions.balanceRequired) {
    return false;
  }
  
  // Check milestone conditions
  if (conditions.totalTokensRequired && userStats.totalTokens < conditions.totalTokensRequired) {
    return false;
  }
  
  return true;
};

module.exports = mongoose.model('Task', taskSchema);
