/**
 * Referral Model
 * Manages referral relationships and tracking
 */

const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  // The user who made the referral
  referrerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // The user who was referred
  refereeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Unique referral code used
  referralCode: {
    type: String,
    required: true,
    index: true
  },

  // Status of the referral
  status: {
    type: String,
    enum: ['pending', 'completed', 'rewarded'],
    default: 'pending'
  },

  // Rewards given
  referrerReward: {
    amount: { type: Number, default: 0 },
    given: { type: Boolean, default: false },
    givenAt: { type: Date }
  },

  refereeReward: {
    amount: { type: Number, default: 0 },
    given: { type: Boolean, default: false },
    givenAt: { type: Date }
  },

  // Tracking information
  signupDate: {
    type: Date,
    default: Date.now
  },

  firstTransactionDate: {
    type: Date
  },

  // Metadata
  source: {
    type: String,
    enum: ['mobile_app', 'web', 'link', 'manual'],
    default: 'mobile_app'
  },

  ipAddress: String,
  userAgent: String,

  // Additional tracking
  isActive: {
    type: Boolean,
    default: true
  },

  notes: String
}, {
  timestamps: true
});

// Indexes for performance
referralSchema.index({ referrerId: 1, createdAt: -1 });
referralSchema.index({ refereeId: 1 });
referralSchema.index({ referralCode: 1 });
referralSchema.index({ status: 1 });

// Prevent duplicate referrals
referralSchema.index({ referrerId: 1, refereeId: 1 }, { unique: true });

// Virtual for referral link
referralSchema.virtual('referralLink').get(function () {
  return `${process.env.APP_URL || 'https://celf-website.vikiflow.com'}/auth/register?ref=${this.referralCode}`;
});

// Methods
referralSchema.methods.markCompleted = async function () {
  this.status = 'completed';
  return this.save();
};

referralSchema.methods.markRewarded = async function () {
  this.status = 'rewarded';
  this.referrerReward.given = true;
  this.referrerReward.givenAt = new Date();
  this.refereeReward.given = true;
  this.refereeReward.givenAt = new Date();
  return this.save();
};

// Static methods
referralSchema.statics.findByReferrer = function (referrerId) {
  return this.find({ referrerId }).populate('refereeId', 'firstName lastName email');
};

referralSchema.statics.findByReferee = function (refereeId) {
  return this.findOne({ refereeId }).populate('referrerId', 'firstName lastName email');
};

referralSchema.statics.findByCode = function (referralCode) {
  return this.findOne({ referralCode }).populate('referrerId', 'firstName lastName email');
};

referralSchema.statics.getStats = async function (referrerId) {
  const stats = await this.aggregate([
    { $match: { referrerId: new mongoose.Types.ObjectId(referrerId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalReward: { $sum: '$referrerReward.amount' }
      }
    }
  ]);

  return {
    total: stats.reduce((sum, stat) => sum + stat.count, 0),
    pending: stats.find(s => s._id === 'pending')?.count || 0,
    completed: stats.find(s => s._id === 'completed')?.count || 0,
    rewarded: stats.find(s => s._id === 'rewarded')?.count || 0,
    totalEarned: stats.reduce((sum, stat) => sum + stat.totalReward, 0)
  };
};

module.exports = mongoose.model('Referral', referralSchema);
