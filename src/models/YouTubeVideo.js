const mongoose = require('mongoose');

const youtubeVideoSchema = new mongoose.Schema({
  videoId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  platform: {
    type: String,
    default: 'youtube',
    immutable: true
  },
  type: {
    type: String,
    default: 'video',
    immutable: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 5000
  },
  thumbnail: {
    default: String,
    medium: String,
    high: String,
    standard: String,
    maxres: String
  },
  url: {
    type: String,
    required: true
  },
  publishedAt: {
    type: Date,
    required: true,
    index: true
  },
  channelTitle: {
    type: String,
    required: true
  },
  channelId: {
    type: String,
    required: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  duration: {
    type: String // ISO 8601 duration format (PT4M13S)
  },
  statistics: {
    viewCount: {
      type: Number,
      default: 0
    },
    likeCount: {
      type: Number,
      default: 0
    },
    commentCount: {
      type: Number,
      default: 0
    }
  },
  engagement: {
    views: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    },
    comments: {
      type: Number,
      default: 0
    }
  },
  metadata: {
    categoryId: String,
    defaultLanguage: String,
    defaultAudioLanguage: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  // Cache control
  cacheExpiry: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    index: { expireAfterSeconds: 0 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
youtubeVideoSchema.index({ publishedAt: -1 });
youtubeVideoSchema.index({ 'statistics.viewCount': -1 });
youtubeVideoSchema.index({ isActive: 1, publishedAt: -1 });
youtubeVideoSchema.index({ cacheExpiry: 1 });

// Virtual for formatted duration
youtubeVideoSchema.virtual('formattedDuration').get(function () {
  if (!this.duration) return null;

  // Convert ISO 8601 duration (PT4M13S) to readable format
  const match = this.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;

  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
});

// Virtual for engagement rate
youtubeVideoSchema.virtual('engagementRate').get(function () {
  if (!this.statistics.viewCount || this.statistics.viewCount === 0) return 0;

  const totalEngagement = (this.statistics.likeCount || 0) + (this.statistics.commentCount || 0);
  return (totalEngagement / this.statistics.viewCount * 100).toFixed(2);
});

// Static method to find active videos
youtubeVideoSchema.statics.findActive = function (limit = 10) {
  return this.find({ isActive: true })
    .sort({ publishedAt: -1 })
    .limit(limit);
};

// Static method to find popular videos
youtubeVideoSchema.statics.findPopular = function (limit = 10) {
  return this.find({ isActive: true })
    .sort({ 'statistics.viewCount': -1 })
    .limit(limit);
};

// Static method to find videos by date range
youtubeVideoSchema.statics.findByDateRange = function (startDate, endDate, limit = 10) {
  return this.find({
    isActive: true,
    publishedAt: {
      $gte: startDate,
      $lte: endDate
    }
  })
    .sort({ publishedAt: -1 })
    .limit(limit);
};

// Instance method to check if cache is expired
youtubeVideoSchema.methods.isCacheExpired = function () {
  return new Date() > this.cacheExpiry;
};

// Instance method to refresh cache expiry
youtubeVideoSchema.methods.refreshCache = function () {
  this.cacheExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
  this.lastUpdated = new Date();
  return this.save();
};

// Pre-save middleware to update lastUpdated
youtubeVideoSchema.pre('save', function (next) {
  if (this.isModified() && !this.isNew) {
    this.lastUpdated = new Date();
  }
  next();
});

module.exports = mongoose.model('YouTubeVideo', youtubeVideoSchema);