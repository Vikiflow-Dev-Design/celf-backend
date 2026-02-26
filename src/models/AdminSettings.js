const mongoose = require('mongoose');

const adminSettingsSchema = new mongoose.Schema({
  settingKey: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 100,
    index: true
  },
  settingValue: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    default: 'general',
    trim: true,
    maxlength: 50
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

// Indexes for better performance
// settingKey already has unique index from schema definition
adminSettingsSchema.index({ category: 1 });
adminSettingsSchema.index({ isActive: 1 });
adminSettingsSchema.index({ createdAt: -1 });

// Static method to find by category
adminSettingsSchema.statics.findByCategory = function (category) {
  return this.find({ category, isActive: true }).sort({ settingKey: 1 });
};

// Static method to find active settings
adminSettingsSchema.statics.findActive = function () {
  return this.find({ isActive: true }).sort({ category: 1, settingKey: 1 });
};

// Static method to get setting value by key
adminSettingsSchema.statics.getValue = async function (settingKey, defaultValue = null) {
  const setting = await this.findOne({ settingKey, isActive: true });
  return setting ? setting.settingValue : defaultValue;
};

// Static method to set setting value
adminSettingsSchema.statics.setValue = async function (settingKey, settingValue, updatedBy = null) {
  const setting = await this.findOneAndUpdate(
    { settingKey },
    {
      settingValue,
      updatedBy,
      updatedAt: new Date()
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );
  return setting;
};

// Static method to get mining settings
adminSettingsSchema.statics.getMiningSettings = function () {
  return this.findByCategory('mining');
};

// Static method to get system settings
adminSettingsSchema.statics.getSystemSettings = function () {
  return this.findByCategory('system');
};

// Method to update value
adminSettingsSchema.methods.updateValue = function (newValue, updatedBy = null) {
  this.settingValue = newValue;
  this.updatedBy = updatedBy;
  return this.save();
};

// Method to activate setting
adminSettingsSchema.methods.activate = function () {
  this.isActive = true;
  return this.save();
};

// Method to deactivate setting
adminSettingsSchema.methods.deactivate = function () {
  this.isActive = false;
  return this.save();
};

// Pre-save middleware to handle JSON values
adminSettingsSchema.pre('save', function (next) {
  // If settingValue is a string that looks like JSON, try to parse it
  if (typeof this.settingValue === 'string') {
    try {
      // Check if it's a JSON string
      if (this.settingValue.startsWith('{') || this.settingValue.startsWith('[') || this.settingValue.startsWith('"')) {
        this.settingValue = JSON.parse(this.settingValue);
      }
    } catch (error) {
      // If parsing fails, keep as string
    }
  }
  next();
});

// Static method to initialize default settings
adminSettingsSchema.statics.initializeDefaults = async function () {
  const defaultSettings = [
    // Mining settings - New per-second based system
    { settingKey: 'mining_rate_per_second', settingValue: 0.000278, description: 'Mining rate in CELF per second (0.000278 = 1 CELF/hour)', category: 'mining' },
    { settingKey: 'mining_interval_ms', settingValue: 1000, description: 'Mining interval in milliseconds (how often tokens are mined)', category: 'mining' },
    { settingKey: 'mining_max_session_time', settingValue: 3600, description: 'Maximum mining session time in seconds', category: 'mining' },
    { settingKey: 'mining_maintenance_mode', settingValue: false, description: 'Mining maintenance mode status', category: 'mining' },
    { settingKey: 'mining_referral_bonus', settingValue: 0.1, description: 'Bonus multiplier for referrals', category: 'mining' },
    { settingKey: 'mining_welcome_bonus', settingValue: 10, description: 'Welcome bonus for new users (CELF)', category: 'mining' },
    { settingKey: 'mining_auto_claim', settingValue: true, description: 'Auto-claim earnings at session end', category: 'mining' },
    { settingKey: 'mining_notification_enabled', settingValue: true, description: 'Enable mining notifications', category: 'mining' },
    { settingKey: 'referral_reward_referrer', settingValue: 10, description: 'CELF reward for the referrer upon successful signup', category: 'mining' },
    { settingKey: 'referral_reward_referee', settingValue: 10, description: 'CELF reward for the referee upon successful signup', category: 'mining' },

    // System settings
    { settingKey: 'system_site_name', settingValue: 'CELF Platform', description: 'Site name', category: 'system' },
    { settingKey: 'system_registration_enabled', settingValue: true, description: 'User registration enabled', category: 'system' },
    { settingKey: 'system_mining_enabled', settingValue: true, description: 'Mining system enabled', category: 'system' },
    { settingKey: 'system_max_users_per_day', settingValue: 1000, description: 'Maximum users per day', category: 'system' },
    { settingKey: 'system_email_notifications', settingValue: true, description: 'Email notifications enabled', category: 'system' }
  ];

  for (const setting of defaultSettings) {
    await this.findOneAndUpdate(
      { settingKey: setting.settingKey },
      setting,
      { upsert: true, setDefaultsOnInsert: true }
    );
  }
};

module.exports = mongoose.model('AdminSettings', adminSettingsSchema);
