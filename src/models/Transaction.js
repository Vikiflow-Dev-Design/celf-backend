const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  // Transaction identification
  hash: {
    type: String,
    unique: true,
    sparse: true, // Allows null values while maintaining uniqueness for non-null values
    index: true
  },
  
  // Transaction type matching mobile app
  type: {
    type: String,
    enum: ['send', 'receive', 'mining', 'referral', 'exchange', 'bonus', 'task_reward'],
    required: true
  },
  
  // Amount and fee
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  fee: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Participants
  fromUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true // Not required for mining/referral transactions
  },
  toUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true // Not required for send transactions to external addresses
  },
  fromAddress: {
    type: String,
    sparse: true
  },
  toAddress: {
    type: String,
    sparse: true
  },
  
  // Status matching mobile app
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  
  // Description and metadata
  description: {
    type: String,
    maxlength: 200
  },
  
  // Mining-specific fields
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MiningSession',
    sparse: true,
    index: true
  },
  miningRate: {
    type: Number,
    sparse: true
  },
  
  // Referral-specific fields
  referralId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Referral',
    sparse: true
  },
  
  // Exchange-specific fields
  exchangeDetails: {
    fromType: {
      type: String,
      enum: ['sendable', 'nonSendable']
    },
    toType: {
      type: String,
      enum: ['sendable', 'nonSendable']
    },
    rate: Number
  },
  
  // Network and confirmation details
  blockNumber: {
    type: Number,
    sparse: true
  },
  confirmations: {
    type: Number,
    default: 0
  },
  gasUsed: {
    type: Number,
    sparse: true
  },
  
  // Error handling
  errorMessage: {
    type: String,
    sparse: true
  },
  retryCount: {
    type: Number,
    default: 0
  },
  
  // Timestamps
  scheduledAt: {
    type: Date,
    sparse: true
  },
  processedAt: {
    type: Date,
    sparse: true
  },
  
  // Task-specific fields
  taskId: {
    type: String,
    sparse: true,
    index: true
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

// Indexes
transactionSchema.index({ fromUserId: 1, createdAt: -1 });
transactionSchema.index({ toUserId: 1, createdAt: -1 });
transactionSchema.index({ type: 1, createdAt: -1 });
transactionSchema.index({ status: 1 });
// hash and sessionId already have indexes from schema definition
transactionSchema.index({ createdAt: -1 });

// Compound indexes for common queries
transactionSchema.index({ fromUserId: 1, type: 1, status: 1 });
transactionSchema.index({ toUserId: 1, type: 1, status: 1 });

// Virtual for net amount (amount + fee for outgoing, just amount for incoming)
transactionSchema.virtual('netAmount').get(function() {
  if (this.type === 'send') {
    return -(this.amount + this.fee);
  }
  return this.amount;
});

// Virtual for display amount (formatted for UI)
transactionSchema.virtual('displayAmount').get(function() {
  const sign = this.type === 'send' ? '-' : '+';
  return `${sign}${this.amount.toFixed(4)} CELF`;
});

// Pre-save middleware
transactionSchema.pre('save', function(next) {
  // Generate hash for completed transactions if not present
  if (this.status === 'completed' && !this.hash) {
    this.hash = `0x${Math.random().toString(16).substr(2, 64)}`;
  }
  
  // Set processedAt when status changes to completed
  if (this.status === 'completed' && !this.processedAt) {
    this.processedAt = new Date();
  }
  
  next();
});

// Static methods
transactionSchema.statics.findByUser = function(userId, options = {}) {
  const query = {
    $or: [{ fromUserId: userId }, { toUserId: userId }]
  };
  
  if (options.type) {
    query.type = options.type;
  }
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .populate('fromUserId', 'firstName lastName')
    .populate('toUserId', 'firstName lastName');
};

transactionSchema.statics.getUserStats = function(userId) {
  return this.aggregate([
    {
      $match: {
        $or: [{ fromUserId: userId }, { toUserId: userId }],
        status: 'completed'
      }
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);
};

// Instance methods
transactionSchema.methods.canCancel = function() {
  return this.status === 'pending' && this.type === 'send';
};

transactionSchema.methods.cancel = function() {
  if (!this.canCancel()) {
    throw new Error('Transaction cannot be cancelled');
  }
  
  this.status = 'cancelled';
  return this.save();
};

transactionSchema.methods.retry = function() {
  if (this.status !== 'failed') {
    throw new Error('Only failed transactions can be retried');
  }
  
  this.status = 'pending';
  this.retryCount += 1;
  this.errorMessage = undefined;
  
  return this.save();
};

transactionSchema.methods.markCompleted = function(hash = null) {
  this.status = 'completed';
  this.processedAt = new Date();
  if (hash) {
    this.hash = hash;
  }
  
  return this.save();
};

transactionSchema.methods.markFailed = function(errorMessage) {
  this.status = 'failed';
  this.errorMessage = errorMessage;
  this.processedAt = new Date();
  
  return this.save();
};

module.exports = mongoose.model('Transaction', transactionSchema);
