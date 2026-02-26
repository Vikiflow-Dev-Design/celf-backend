const mongoose = require('mongoose');

const instagramPostSchema = new mongoose.Schema({
  mediaId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  platform: {
    type: String,
    default: 'instagram',
    immutable: true
  },
  type: {
    type: String,
    enum: ['image', 'video', 'carousel_album'],
    default: 'image'
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
    maxlength: 2200 // Instagram caption limit
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
  username: {
    type: String,
    required: true
  },
  mediaType: {
    type: String,
    enum: ['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM'],
    required: true
  },
  mediaUrl: {
    type: String,
    required: true
  },
  thumbnailUrl: {
    type: String
  },
  statistics: {
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
    mediaType: String,
    isVideo: {
      type: Boolean,
      default: false
    },
    isCarousel: {
      type: Boolean,
      default: false
    }
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
instagramPostSchema.index({ publishedAt: -1 });
instagramPostSchema.index({ 'statistics.likeCount': -1 });
instagramPostSchema.index({ isActive: 1, publishedAt: -1 });
instagramPostSchema.index({ cacheExpiry: 1 });
instagramPostSchema.index({ mediaType: 1 });

// Virtual for engagement rate
instagramPostSchema.virtual('engagementRate').get(function () {
  const totalEngagement = this.statistics.likeCount + this.statistics.commentCount;
  return totalEngagement; // Instagram doesn't provide follower count in basic API
});

// Virtual for formatted media type
instagramPostSchema.virtual('formattedMediaType').get(function () {
  switch (this.mediaType) {
    case 'IMAGE':
      return 'Photo';
    case 'VIDEO':
      return 'Video';
    case 'CAROUSEL_ALBUM':
      return 'Album';
    default:
      return 'Post';
  }
});

// Instance methods
instagramPostSchema.methods.isCacheExpired = function () {
  return new Date() > this.cacheExpiry;
};

instagramPostSchema.methods.refreshCache = function () {
  this.cacheExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
  this.lastUpdated = new Date();
  return this.save();
};

// Static methods
instagramPostSchema.statics.findActive = function (limit = 10) {
  return this.find({ isActive: true })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .exec();
};

instagramPostSchema.statics.findByMediaType = function (mediaType, limit = 10) {
  return this.find({
    isActive: true,
    mediaType: mediaType.toUpperCase()
  })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .exec();
};

instagramPostSchema.statics.findPopular = function (limit = 10) {
  return this.find({ isActive: true })
    .sort({ 'statistics.likeCount': -1, publishedAt: -1 })
    .limit(limit)
    .exec();
};

instagramPostSchema.statics.findRecent = function (days = 7, limit = 10) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return this.find({
    isActive: true,
    publishedAt: { $gte: cutoffDate }
  })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .exec();
};

instagramPostSchema.statics.cleanupExpired = function () {
  return this.deleteMany({
    cacheExpiry: { $lt: new Date() },
    isActive: false
  });
};

// Pre-save middleware
instagramPostSchema.pre('save', function (next) {
  // Set metadata flags based on mediaType
  if (this.mediaType) {
    this.metadata.isVideo = this.mediaType === 'VIDEO';
    this.metadata.isCarousel = this.mediaType === 'CAROUSEL_ALBUM';
  }

  // Ensure engagement stats are synced
  if (this.statistics) {
    this.engagement.likes = this.statistics.likeCount;
    this.engagement.comments = this.statistics.commentCount;
  }

  next();
});

const InstagramPost = mongoose.model('InstagramPost', instagramPostSchema);

module.exports = InstagramPost;