const express = require('express');
const router = express.Router();
const instagramController = require('../controllers/instagramController');
const { authenticate } = require('../middleware/authMiddleware');
const { socialRateLimiter } = require('../middleware/rateLimiter');

// Apply rate limiting to all Instagram routes
router.use(socialRateLimiter);

/**
 * @route   GET /api/instagram/posts
 * @desc    Get latest Instagram posts
 * @access  Public
 * @query   limit - Number of posts to return (default: 10, max: 50)
 * @query   type - Filter by media type (image, video, carousel_album)
 * @query   refresh - Force refresh cache (requires auth)
 */
router.get('/posts', async (req, res) => {
  try {
    await instagramController.getLatestPosts(req, res);
  } catch (error) {
    console.error('Error in Instagram posts route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/instagram/posts/:mediaId
 * @desc    Get specific Instagram post by media ID
 * @access  Public
 */
router.get('/posts/:mediaId', async (req, res) => {
  try {
    await instagramController.getPostById(req, res);
  } catch (error) {
    console.error('Error in Instagram post by ID route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/instagram/user
 * @desc    Get Instagram user information
 * @access  Public
 */
router.get('/user', async (req, res) => {
  try {
    await instagramController.getUserInfo(req, res);
  } catch (error) {
    console.error('Error in Instagram user info route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/instagram/refresh-cache
 * @desc    Force refresh Instagram posts cache
 * @access  Private (requires authentication)
 */
router.post('/refresh-cache', authenticate, async (req, res) => {
  try {
    await instagramController.refreshCache(req, res);
  } catch (error) {
    console.error('Error in Instagram refresh cache route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/instagram/test
 * @desc    Test Instagram API connection
 * @access  Private (requires authentication)
 */
router.get('/test', authenticate, async (req, res) => {
  try {
    await instagramController.testConnection(req, res);
  } catch (error) {
    console.error('Error in Instagram test connection route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/instagram/stats
 * @desc    Get Instagram integration statistics
 * @access  Private (requires authentication)
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const InstagramPost = require('../models/InstagramPost');
    
    const stats = await Promise.all([
      InstagramPost.countDocuments({ isActive: true }),
      InstagramPost.countDocuments({ mediaType: 'IMAGE', isActive: true }),
      InstagramPost.countDocuments({ mediaType: 'VIDEO', isActive: true }),
      InstagramPost.countDocuments({ mediaType: 'CAROUSEL_ALBUM', isActive: true }),
      InstagramPost.findOne({ isActive: true }).sort({ publishedAt: -1 }),
      InstagramPost.aggregate([
        { $match: { isActive: true } },
        { $group: { 
          _id: null, 
          totalLikes: { $sum: '$statistics.likeCount' },
          totalComments: { $sum: '$statistics.commentCount' },
          avgLikes: { $avg: '$statistics.likeCount' },
          avgComments: { $avg: '$statistics.commentCount' }
        }}
      ])
    ]);

    const [
      totalPosts,
      totalImages,
      totalVideos,
      totalCarousels,
      latestPost,
      engagementStats
    ] = stats;

    res.json({
      success: true,
      data: {
        posts: {
          total: totalPosts,
          images: totalImages,
          videos: totalVideos,
          carousels: totalCarousels
        },
        latest: latestPost ? {
          mediaId: latestPost.mediaId,
          title: latestPost.title,
          publishedAt: latestPost.publishedAt,
          mediaType: latestPost.mediaType
        } : null,
        engagement: engagementStats[0] || {
          totalLikes: 0,
          totalComments: 0,
          avgLikes: 0,
          avgComments: 0
        },
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('Error in Instagram stats route:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get Instagram statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   DELETE /api/instagram/cache
 * @desc    Clear Instagram posts cache
 * @access  Private (requires authentication)
 */
router.delete('/cache', authenticate, async (req, res) => {
  try {
    const InstagramPost = require('../models/InstagramPost');
    
    const result = await InstagramPost.deleteMany({});
    
    res.json({
      success: true,
      message: `Cleared ${result.deletedCount} Instagram posts from cache`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error in Instagram clear cache route:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear Instagram cache',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/instagram/health
 * @desc    Check Instagram API health status
 * @access  Public
 */
router.get('/health', async (req, res) => {
  try {
    const instagramService = require('../services/instagramService');
    
    const isConfigured = instagramService.isConfigured();
    
    if (!isConfigured) {
      return res.status(503).json({
        success: false,
        status: 'not_configured',
        message: 'Instagram API is not configured'
      });
    }

    // Test basic connectivity
    const testResult = await instagramService.testConnection();
    
    res.json({
      success: true,
      status: testResult.success ? 'healthy' : 'degraded',
      message: testResult.message,
      timestamp: new Date(),
      configured: true
    });
  } catch (error) {
    console.error('Error in Instagram health check:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      message: 'Instagram API health check failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date()
    });
  }
});

module.exports = router;