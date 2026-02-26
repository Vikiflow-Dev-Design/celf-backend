const mongoose = require('mongoose');

const newsletterCampaignSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sending', 'sent', 'cancelled'],
    default: 'draft'
  },
  scheduledFor: {
    type: Date
  },
  sentAt: {
    type: Date
  },
  targetAudience: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'all']
    },
    topics: [{
      type: String,
      trim: true
    }],
    status: {
      type: String,
      enum: ['active', 'all'],
      default: 'active'
    },
    customFilter: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  stats: {
    sent: {
      type: Number,
      default: 0
    },
    opened: {
      type: Number,
      default: 0
    },
    clicked: {
      type: Number,
      default: 0
    },
    bounced: {
      type: Number,
      default: 0
    },
    unsubscribed: {
      type: Number,
      default: 0
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
newsletterCampaignSchema.index({ status: 1 });
newsletterCampaignSchema.index({ scheduledFor: 1 });
newsletterCampaignSchema.index({ sentAt: -1 });
newsletterCampaignSchema.index({ createdBy: 1 });
newsletterCampaignSchema.index({ createdAt: -1 });

// Virtual for open rate
newsletterCampaignSchema.virtual('openRate').get(function() {
  if (this.stats.sent === 0) return 0;
  return Math.round((this.stats.opened / this.stats.sent) * 100 * 100) / 100;
});

// Virtual for click rate
newsletterCampaignSchema.virtual('clickRate').get(function() {
  if (this.stats.sent === 0) return 0;
  return Math.round((this.stats.clicked / this.stats.sent) * 100 * 100) / 100;
});

// Virtual for bounce rate
newsletterCampaignSchema.virtual('bounceRate').get(function() {
  if (this.stats.sent === 0) return 0;
  return Math.round((this.stats.bounced / this.stats.sent) * 100 * 100) / 100;
});

// Static method to find by status
newsletterCampaignSchema.statics.findByStatus = function(status) {
  return this.find({ status }).sort({ createdAt: -1 });
};

// Static method to find scheduled campaigns
newsletterCampaignSchema.statics.findScheduled = function() {
  return this.find({ 
    status: 'scheduled',
    scheduledFor: { $lte: new Date() }
  }).sort({ scheduledFor: 1 });
};

// Static method to find sent campaigns
newsletterCampaignSchema.statics.findSent = function() {
  return this.find({ status: 'sent' }).sort({ sentAt: -1 });
};

// Method to schedule campaign
newsletterCampaignSchema.methods.schedule = function(scheduledFor) {
  this.status = 'scheduled';
  this.scheduledFor = scheduledFor;
  return this.save();
};

// Method to start sending
newsletterCampaignSchema.methods.startSending = function() {
  this.status = 'sending';
  return this.save();
};

// Method to mark as sent
newsletterCampaignSchema.methods.markSent = function() {
  this.status = 'sent';
  this.sentAt = new Date();
  return this.save();
};

// Method to cancel campaign
newsletterCampaignSchema.methods.cancel = function() {
  if (this.status === 'sending' || this.status === 'sent') {
    throw new Error('Cannot cancel a campaign that is already sending or sent');
  }
  this.status = 'cancelled';
  return this.save();
};

// Method to update stats
newsletterCampaignSchema.methods.updateStats = function(statType, increment = 1) {
  if (!this.stats[statType] && this.stats[statType] !== 0) {
    throw new Error(`Invalid stat type: ${statType}`);
  }
  this.stats[statType] += increment;
  return this.save();
};

// Method to increment sent count
newsletterCampaignSchema.methods.incrementSent = function(count = 1) {
  return this.updateStats('sent', count);
};

// Method to increment opened count
newsletterCampaignSchema.methods.incrementOpened = function(count = 1) {
  return this.updateStats('opened', count);
};

// Method to increment clicked count
newsletterCampaignSchema.methods.incrementClicked = function(count = 1) {
  return this.updateStats('clicked', count);
};

// Method to increment bounced count
newsletterCampaignSchema.methods.incrementBounced = function(count = 1) {
  return this.updateStats('bounced', count);
};

// Method to increment unsubscribed count
newsletterCampaignSchema.methods.incrementUnsubscribed = function(count = 1) {
  return this.updateStats('unsubscribed', count);
};

module.exports = mongoose.model('NewsletterCampaign', newsletterCampaignSchema);
