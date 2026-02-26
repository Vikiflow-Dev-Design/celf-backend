const mongoose = require('mongoose');

const externalLinkSessionSchema = new mongoose.Schema({
  // User and task identification
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  taskId: {
    type: String,
    required: true,
    index: true
  },

  // Session tracking
  sessionKey: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Session state
  hasVisitedExternalLink: {
    type: Boolean,
    default: false
  },
  hasReturnedFromExternalLink: {
    type: Boolean,
    default: false
  },

  // Timestamps
  visitedAt: {
    type: Date,
    default: Date.now
  },
  returnedAt: {
    type: Date
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    index: { expireAfterSeconds: 0 }
  },

  // Additional metadata
  linkUrl: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  ipAddress: {
    type: String,
    trim: true
  },

  // Status tracking
  status: {
    type: String,
    enum: ['active', 'completed', 'expired'],
    default: 'active'
  }
}, {
  timestamps: true,
  collection: 'external_link_sessions'
});

// Compound indexes for efficient queries
externalLinkSessionSchema.index({ userId: 1, taskId: 1 });
externalLinkSessionSchema.index({ sessionKey: 1, status: 1 });
externalLinkSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Instance methods
externalLinkSessionSchema.methods.markAsReturned = function () {
  this.hasReturnedFromExternalLink = true;
  this.returnedAt = new Date();
  this.status = 'completed';
  return this.save();
};

externalLinkSessionSchema.methods.isExpired = function () {
  return new Date() > this.expiresAt;
};

externalLinkSessionSchema.methods.isValid = function () {
  return this.status === 'active' && !this.isExpired();
};

// Static methods
externalLinkSessionSchema.statics.findActiveSession = function (userId, taskId) {
  return this.findOne({
    userId,
    taskId,
    status: 'active',
    expiresAt: { $gt: new Date() }
  });
};

externalLinkSessionSchema.statics.createSession = function (userId, taskId, linkUrl, metadata = {}) {
  const sessionKey = `external_link_session_${taskId}_${Date.now()}`;

  return this.create({
    userId,
    taskId,
    sessionKey,
    linkUrl,
    userAgent: metadata.userAgent,
    ipAddress: metadata.ipAddress,
    hasVisitedExternalLink: true
  });
};

externalLinkSessionSchema.statics.cleanupExpiredSessions = function () {
  return this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { status: 'expired' }
    ]
  });
};

module.exports = mongoose.model('ExternalLinkSession', externalLinkSessionSchema);