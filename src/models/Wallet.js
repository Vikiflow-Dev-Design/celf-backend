const mongoose = require('mongoose');

const walletAddressSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    unique: true
  },
  label: {
    type: String,
    default: 'Wallet Address'
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  
  // Balance breakdown matching mobile app structure
  sendableBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  nonSendableBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  pendingBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  totalBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Addresses
  addresses: [walletAddressSchema],
  currentAddress: {
    type: String,
    required: true
  },
  
  // Preferences matching mobile app
  preferences: {
    currency: {
      type: String,
      enum: ['CELF', 'USD'],
      default: 'CELF'
    },
    notifications: {
      type: Boolean,
      default: true
    }
  },
  
  // Exchange rate for USD conversion
  lastExchangeRate: {
    type: Number,
    default: 0.25 // 1 CELF = $0.25
  },
  
  // Statistics
  totalSent: {
    type: Number,
    default: 0
  },
  totalReceived: {
    type: Number,
    default: 0
  },
  totalMined: {
    type: Number,
    default: 0
  },
  
  // Security
  isLocked: {
    type: Boolean,
    default: false
  },
  lockReason: String,
  
  // Metadata
  lastActivity: {
    type: Date,
    default: Date.now
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

// Indexes (userId already has unique index from schema definition)
walletSchema.index({ currentAddress: 1 });

// Virtual for available balance (legacy compatibility)
walletSchema.virtual('availableBalance').get(function() {
  return this.sendableBalance;
});

// Pre-save middleware to calculate total balance
walletSchema.pre('save', function(next) {
  this.totalBalance = this.sendableBalance + this.nonSendableBalance + this.pendingBalance;
  this.lastActivity = new Date();
  next();
});

// Methods
walletSchema.methods.addMiningReward = function(amount) {
  this.nonSendableBalance += amount;
  this.totalMined += amount;
  return this.save();
};

walletSchema.methods.addWelcomeBonus = function(amount) {
  this.nonSendableBalance += amount;
  return this.save();
};

walletSchema.methods.exchangeTokens = function(amount, fromType, toType) {
  if (fromType === 'sendable' && toType === 'nonSendable') {
    if (this.sendableBalance < amount) {
      throw new Error('Insufficient sendable balance');
    }
    this.sendableBalance -= amount;
    this.nonSendableBalance += amount;
  } else if (fromType === 'nonSendable' && toType === 'sendable') {
    if (this.nonSendableBalance < amount) {
      throw new Error('Insufficient non-sendable balance');
    }
    this.nonSendableBalance -= amount;
    this.sendableBalance += amount;
  } else {
    throw new Error('Invalid exchange types');
  }
  
  return this.save();
};

walletSchema.methods.canSend = function(amount) {
  return this.sendableBalance >= amount && !this.isLocked;
};

walletSchema.methods.getFormattedBalance = function(amount, currency = null) {
  const curr = currency || this.preferences.currency;
  if (curr === 'USD') {
    return `$${(amount * this.lastExchangeRate).toFixed(2)}`;
  }
  return `${amount.toFixed(4)} CELF`;
};

walletSchema.methods.addAddress = function(address, label = null) {
  const existingAddress = this.addresses.find(addr => addr.address === address);
  if (existingAddress) {
    throw new Error('Address already exists');
  }
  
  this.addresses.push({
    address,
    label: label || `Address ${this.addresses.length + 1}`,
    isDefault: this.addresses.length === 0
  });
  
  if (this.addresses.length === 1) {
    this.currentAddress = address;
  }
  
  return this.save();
};

walletSchema.methods.setDefaultAddress = function(address) {
  const addressObj = this.addresses.find(addr => addr.address === address);
  if (!addressObj) {
    throw new Error('Address not found');
  }
  
  // Reset all addresses to non-default
  this.addresses.forEach(addr => {
    addr.isDefault = false;
  });
  
  // Set the specified address as default
  addressObj.isDefault = true;
  this.currentAddress = address;
  
  return this.save();
};

module.exports = mongoose.model('Wallet', walletSchema);
