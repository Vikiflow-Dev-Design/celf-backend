const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  reference: {
    type: String,
    unique: true,
    index: true,
    required: true
  },
  provider: {
    type: String,
    enum: ['paystack'],
    default: 'paystack'
  },
  status: {
    type: String,
    enum: ['initialized', 'pending', 'success', 'failed', 'abandoned'],
    default: 'initialized'
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'NGN'
  },
  email: {
    type: String,
    required: true,
    index: true
  },
  donor: {
    firstName: String,
    lastName: String,
    phone: String,
    city: String,
    state: String,
    zip: String,
    country: String,
    inHonor: { type: Boolean, default: false },
    onBehalf: { type: Boolean, default: false },
    organization: String
  },
  authorizationUrl: {
    type: String
  },
  accessCode: {
    type: String
  },
  paystack: {
    transactionId: { type: String },
    channel: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    rawInitializeResponse: { type: mongoose.Schema.Types.Mixed, default: {} },
    rawVerifyResponse: { type: mongoose.Schema.Types.Mixed, default: {} },
    rawWebhookEvent: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true
  },
  verifiedAt: { type: Date },
  completedAt: { type: Date }
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

// Indexes for reporting

donationSchema.index({ email: 1, createdAt: -1 });
donationSchema.index({ status: 1, createdAt: -1 });

donationSchema.methods.markSuccess = function (verifyData) {
  this.status = 'success';
  this.paystack.rawVerifyResponse = verifyData || {};
  this.verifiedAt = new Date();
  this.completedAt = new Date();
};

donationSchema.methods.markFailure = function (verifyData) {
  this.status = 'failed';
  this.paystack.rawVerifyResponse = verifyData || {};
  this.verifiedAt = new Date();
};

module.exports = mongoose.model('Donation', donationSchema);