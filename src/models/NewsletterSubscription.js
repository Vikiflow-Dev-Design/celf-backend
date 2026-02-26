const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const newsletterSubscriptionSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 255,
    index: true
  },
  firstName: {
    type: String,
    trim: true,
    maxlength: 100
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: 100
  },
  status: {
    type: String,
    enum: ['active', 'unsubscribed', 'bounced'],
    default: 'active'
  },
  preferences: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly'
    },
    topics: [{
      type: String,
      trim: true
    }],
    format: {
      type: String,
      enum: ['html', 'text'],
      default: 'html'
    }
  },
  unsubscribeToken: {
    type: String,
    unique: true,
    default: uuidv4,
    index: true
  },
  unsubscribeReason: {
    type: String,
    trim: true
  },
  subscribedAt: {
    type: Date,
    default: Date.now
  },
  unsubscribedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.unsubscribeToken; // Don't expose token in JSON
      return ret;
    }
  }
});

// Indexes for better performance
// email already has unique index from schema definition
newsletterSubscriptionSchema.index({ status: 1 });
// unsubscribeToken already has unique index from schema definition
newsletterSubscriptionSchema.index({ subscribedAt: -1 });
newsletterSubscriptionSchema.index({ 'preferences.frequency': 1 });

// Virtual for full name
newsletterSubscriptionSchema.virtual('fullName').get(function() {
  if (!this.firstName && !this.lastName) return null;
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

// Static method to find active subscriptions
newsletterSubscriptionSchema.statics.findActive = function() {
  return this.find({ status: 'active' }).sort({ subscribedAt: -1 });
};

// Static method to find by frequency
newsletterSubscriptionSchema.statics.findByFrequency = function(frequency) {
  return this.find({ 
    status: 'active',
    'preferences.frequency': frequency 
  }).sort({ subscribedAt: -1 });
};

// Static method to find by topic
newsletterSubscriptionSchema.statics.findByTopic = function(topic) {
  return this.find({ 
    status: 'active',
    'preferences.topics': topic 
  }).sort({ subscribedAt: -1 });
};

// Method to unsubscribe
newsletterSubscriptionSchema.methods.unsubscribe = function(reason = null) {
  this.status = 'unsubscribed';
  this.unsubscribedAt = new Date();
  if (reason) {
    this.unsubscribeReason = reason;
  }
  return this.save();
};

// Method to resubscribe
newsletterSubscriptionSchema.methods.resubscribe = function() {
  this.status = 'active';
  this.unsubscribedAt = null;
  this.unsubscribeReason = null;
  return this.save();
};

// Method to mark as bounced
newsletterSubscriptionSchema.methods.markBounced = function() {
  this.status = 'bounced';
  return this.save();
};

// Method to update preferences
newsletterSubscriptionSchema.methods.updatePreferences = function(newPreferences) {
  this.preferences = { ...this.preferences, ...newPreferences };
  return this.save();
};

// Method to add topic
newsletterSubscriptionSchema.methods.addTopic = function(topic) {
  if (!this.preferences.topics.includes(topic)) {
    this.preferences.topics.push(topic);
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to remove topic
newsletterSubscriptionSchema.methods.removeTopic = function(topic) {
  this.preferences.topics = this.preferences.topics.filter(t => t !== topic);
  return this.save();
};

// Static method to find by unsubscribe token
newsletterSubscriptionSchema.statics.findByUnsubscribeToken = function(token) {
  return this.findOne({ unsubscribeToken: token });
};

module.exports = mongoose.model('NewsletterSubscription', newsletterSubscriptionSchema);
