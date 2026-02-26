const mongoose = require('mongoose');

const userTaskSchema = new mongoose.Schema({
  // User reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Task reference
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
    index: true
  },
  
  // Task identifier for easier queries
  taskKey: {
    type: String,
    required: true,
    index: true
  },
  
  // Progress tracking
  progress: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Completion status
  isCompleted: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Completion timestamp
  completedAt: {
    type: Date,
    sparse: true
  },
  
  // Reward claim status
  rewardClaimed: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Reward claim timestamp
  rewardClaimedAt: {
    type: Date,
    sparse: true
  },

  // External link visit tracking
  hasVisitedExternalLink: {
    type: Boolean,
    default: false,
    index: true
  },

  // External link visit timestamp
  externalLinkVisitedAt: {
    type: Date,
    sparse: true
  },
  
  // Progress history for tracking changes
  progressHistory: [{
    progress: {
      type: Number,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    source: {
      type: String,
      enum: ['manual', 'automatic', 'admin'],
      default: 'automatic'
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }],
  
  // Metadata for additional information
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

// Compound indexes for better performance
userTaskSchema.index({ userId: 1, taskKey: 1 }, { unique: true });
userTaskSchema.index({ userId: 1, isCompleted: 1 });
userTaskSchema.index({ userId: 1, rewardClaimed: 1 });

// Pre-save middleware to update completion status
userTaskSchema.pre('save', function(next) {
  // Auto-complete task if progress reaches maxProgress
  if (this.isModified('progress') && this.taskId && this.taskId.maxProgress) {
    if (this.progress >= this.taskId.maxProgress && !this.isCompleted) {
      this.isCompleted = true;
      this.completedAt = new Date();
    }
  }
  
  next();
});

// Static methods
userTaskSchema.statics.findUserTasks = function(userId, options = {}) {
  const query = { userId };
  
  if (options.completed !== undefined) {
    query.isCompleted = options.completed;
  }
  
  if (options.category) {
    // This will be handled in the populate
  }
  
  return this.find(query)
    .populate('taskId')
    .sort({ createdAt: -1 });
};

userTaskSchema.statics.findUserTaskByKey = function(userId, taskKey) {
  return this.findOne({ userId, taskKey }).populate('taskId');
};

userTaskSchema.statics.getUserStats = function(userId) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalTasks: { $sum: 1 },
        completedTasks: {
          $sum: {
            $cond: [{ $eq: ['$isCompleted', true] }, 1, 0]
          }
        },
        unclaimedRewards: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$isCompleted', true] }, { $eq: ['$rewardClaimed', false] }] },
              1,
              0
            ]
          }
        }
      }
    }
  ]);
};

userTaskSchema.statics.getAllCompletedTasksWithRewards = function(userId) {
  return this.find({ 
    userId, 
    isCompleted: true 
  }).populate('taskId');
};

userTaskSchema.statics.getCompletedTasks = function(userId) {
  return this.find({ userId, isCompleted: true })
    .populate('taskId')
    .sort({ completedAt: -1 });
};

userTaskSchema.statics.getUnclaimedRewards = function(userId) {
  return this.find({ 
    userId, 
    isCompleted: true, 
    rewardClaimed: false 
  }).populate('taskId');
};

// Instance methods
userTaskSchema.methods.updateProgress = function(newProgress, source = 'manual', details = {}) {
  // Add to progress history
  this.progressHistory.push({
    progress: newProgress,
    source,
    details,
    timestamp: new Date()
  });
  
  // Update progress (only increase, never decrease)
  this.progress = Math.max(this.progress, newProgress);
  
  return this.save();
};

userTaskSchema.methods.incrementProgress = function(amount = 1, source = 'manual', details = {}) {
  const newProgress = this.progress + amount;
  return this.updateProgress(newProgress, source, details);
};

userTaskSchema.methods.checkCompletion = async function() {
  if (this.isCompleted) {
    return false; // Already completed
  }
  
  // Populate task if not already populated
  if (!this.taskId.maxProgress) {
    await this.populate('taskId');
  }
  
  if (this.progress >= this.taskId.maxProgress) {
    this.isCompleted = true;
    this.completedAt = new Date();
    await this.save();
    return true;
  }
  
  return false;
};

userTaskSchema.methods.claimReward = async function() {
  if (!this.isCompleted) {
    throw new Error('Task not completed');
  }
  
  if (this.rewardClaimed) {
    throw new Error('Reward already claimed');
  }
  
  this.rewardClaimed = true;
  this.rewardClaimedAt = new Date();
  
  return this.save();
};

module.exports = mongoose.model('UserTask', userTaskSchema);
