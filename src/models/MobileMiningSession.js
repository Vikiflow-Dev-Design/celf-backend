const mongoose = require('mongoose');

const mobileMiningSessionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Mining session name is required'],
    trim: true,
    maxlength: [100, 'Mining session name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  session_id: {
    type: String,
    unique: true,
    required: [true, 'Session ID is required']
  },
  status: {
    type: String,
    enum: ['created', 'active', 'paused', 'completed', 'failed', 'cancelled', 'expired'],
    default: 'created'
  },
  miningRatePerSecond: {
    type: Number,
    required: [true, 'Mining rate per second is required'],
    min: [0, 'Mining rate cannot be negative']
  },
  miningIntervalMs: {
    type: Number,
    required: [true, 'Mining interval is required'],
    min: [100, 'Mining interval must be at least 100ms']
  },
  tokensEarned: {
    type: Number,
    default: 0,
    min: [0, 'Tokens earned cannot be negative']
  },
  referralBoostEarnings: {
    type: Number,
    default: 0,
    min: [0, 'Referral boost earnings cannot be negative']
  },
  max_duration_ms: {
    type: Number,
    required: [true, 'Maximum duration is required'],
    min: [1000, 'Maximum duration must be at least 1 second']
  },
  remaining_time_ms: {
    type: Number,
    min: [0, 'Remaining time cannot be negative']
  },
  device_info: {
    deviceId: String,
    platform: String,
    appVersion: String,
    osVersion: String
  },
  validation_data: {
    last_validated_at: Date,
    validation_count: { type: Number, default: 0 },
    suspicious_activity: { type: Boolean, default: false },
    flagged_reasons: [String],
    client_reported_earnings: Number,
    server_calculated_earnings: Number,
    validation_tolerance: { type: Number, default: 0.1 }
  },
  completion_data: {
    completion_method: {
      type: String,
      enum: ['user_stopped', 'auto_completed', 'cancelled'],
      default: null
    },
    final_earnings: Number,
    session_duration_ms: Number,
    completed_intervals: Number,
    earnings_calculation: {
      expected_intervals: Number,
      actual_intervals: Number,
      rate_per_interval: Number
    }
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  server_time: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function (doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for performance
mobileMiningSessionSchema.index({ userId: 1, status: 1 });
mobileMiningSessionSchema.index({ session_id: 1 });
mobileMiningSessionSchema.index({ startedAt: -1 });
mobileMiningSessionSchema.index({ status: 1, startedAt: 1 });

// Virtual for session duration
mobileMiningSessionSchema.virtual('sessionDurationMs').get(function () {
  if (this.startedAt) {
    const endTime = this.completedAt || new Date();
    return endTime - this.startedAt;
  }
  return 0;
});

// Virtual for progress percentage
mobileMiningSessionSchema.virtual('progressPercentage').get(function () {
  if (this.max_duration_ms && this.startedAt) {
    const elapsed = this.sessionDurationMs;
    return Math.min(100, (elapsed / this.max_duration_ms) * 100);
  }
  return 0;
});

// Method to calculate server-side earnings
mobileMiningSessionSchema.methods.calculateServerEarnings = function () {
  if (this.status !== 'active' && this.status !== 'completed') {
    return this.tokensEarned || 0;
  }

  const elapsedMs = this.sessionDurationMs;
  const cappedElapsedMs = Math.min(elapsedMs, this.max_duration_ms);

  // Calculate based on completed intervals
  const completedIntervals = Math.floor(cappedElapsedMs / this.miningIntervalMs);
  const intervalRate = this.miningRatePerSecond * (this.miningIntervalMs / 1000);

  return completedIntervals * intervalRate;
};

// Method to validate client earnings against server calculation
mobileMiningSessionSchema.methods.validateClientEarnings = function (clientEarnings) {
  const serverEarnings = this.calculateServerEarnings();
  const tolerance = this.validation_data?.validation_tolerance || 0.1;
  const difference = Math.abs(clientEarnings - serverEarnings);
  const allowedDifference = serverEarnings * tolerance;

  return {
    isValid: difference <= allowedDifference,
    serverEarnings,
    clientEarnings,
    difference,
    allowedDifference,
    tolerance
  };
};

// Method to complete session with server-authoritative calculation
mobileMiningSessionSchema.methods.completeSession = function (completionMethod = 'user_stopped', clientEarnings = null) {
  const now = new Date();
  const sessionDurationMs = now - this.startedAt;
  const cappedDurationMs = Math.min(sessionDurationMs, this.max_duration_ms);

  // Server-authoritative calculation
  const completedIntervals = Math.floor(cappedDurationMs / this.miningIntervalMs);
  const intervalRate = this.miningRatePerSecond * (this.miningIntervalMs / 1000);
  const finalEarnings = completedIntervals * intervalRate;

  // Update session data
  this.status = 'completed';
  this.completedAt = now;
  this.tokensEarned = finalEarnings;

  this.completion_data = {
    completion_method: completionMethod,
    final_earnings: finalEarnings,
    session_duration_ms: sessionDurationMs,
    completed_intervals: completedIntervals,
    earnings_calculation: {
      expected_intervals: Math.floor(this.max_duration_ms / this.miningIntervalMs),
      actual_intervals: completedIntervals,
      rate_per_interval: intervalRate
    }
  };

  // Validate against client earnings if provided
  if (clientEarnings !== null) {
    const validation = this.validateClientEarnings(clientEarnings);
    this.validation_data.client_reported_earnings = clientEarnings;
    this.validation_data.server_calculated_earnings = finalEarnings;

    if (!validation.isValid) {
      this.validation_data.suspicious_activity = true;
      this.validation_data.flagged_reasons.push(
        `Client earnings mismatch: reported ${clientEarnings}, calculated ${finalEarnings}`
      );
    }
  }

  return this.save();
};

// Static method to auto-complete expired sessions
mobileMiningSessionSchema.statics.autoCompleteExpiredSessions = async function () {
  const expiredSessions = await this.find({
    status: 'active',
    $expr: {
      $gte: [
        { $subtract: [new Date(), '$startedAt'] },
        '$max_duration_ms'
      ]
    }
  });

  const results = [];
  for (const session of expiredSessions) {
    await session.completeSession('auto_completed');
    results.push({
      sessionId: session.session_id,
      userId: session.userId,
      finalEarnings: session.tokensEarned
    });
  }

  return results;
};

module.exports = mongoose.model('MobileMiningSession', mobileMiningSessionSchema);
