const instagramService = require('../services/instagramService');
const InstagramPost = require('../models/InstagramPost');
/**
 * Get latest Instagram posts (with caching)
 * @route GET /api/instagram/posts
 * @access Public
 */
const getLatestPosts = async (req, res) => {
  try {
    const { limit = 10, forceRefresh = false } = req.query;
    const maxLimit = Math.min(parseInt(limit), 25); // Instagram API limit is 25

    // Check if we should use cached data
    if (!forceRefresh) {
      const cachedPosts = await InstagramPost.findActive(maxLimit);

      // If we have cached posts and they're not all expired, return them
      if (cachedPosts.length > 0) {
        const nonExpiredPosts = cachedPosts.filter(post => !post.isCacheExpired());

        if (nonExpiredPosts.length >= Math.min(maxLimit, 5)) { // At least 5 non-expired posts
          return res.json({
            success: true,
            data: cachedPosts,
            cached: true,
            count: cachedPosts.length
          });
        }
      }
    }

    // Fetch fresh data from Instagram API
    if (!instagramService.isConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Instagram API not configured'
      });
    }

    const freshPosts = await instagramService.getUserMedia(maxLimit);

    // Update cache
    await updatePostCache(freshPosts);

    res.json({
      success: true,
      data: freshPosts,
      cached: false,
      count: freshPosts.length
    });

  } catch (error) {
    console.error('Error fetching Instagram posts:', error);

    // Fallback to cached data if API fails
    try {
      const cachedPosts = await InstagramPost.findActive(parseInt(req.query.limit) || 10);
      if (cachedPosts.length > 0) {
        return res.json({
          success: true,
          data: cachedPosts,
          cached: true,
          fallback: true,
          count: cachedPosts.length,
          message: 'Using cached data due to API error'
        });
      }
    } catch (cacheError) {
      console.error('Error fetching cached posts:', cacheError);
    }

    res.status(500).json({
      success: false,
      message: 'Error fetching Instagram posts',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Helper function to update Instagram post cache
 */
const updatePostCache = async (posts) => {
  const updateResult = { updated: 0, created: 0 };

  for (const postData of posts) {
    try {
      const existingPost = await InstagramPost.findOne({ mediaId: postData.id });

      if (existingPost) {
        // Update existing post
        Object.assign(existingPost, postData);
        await existingPost.refreshCache();
        updateResult.updated++;
      } else {
        // Create new post
        const newPost = new InstagramPost(postData);
        await newPost.save();
        updateResult.created++;
      }
    } catch (error) {
      console.error(`Error updating cache for post ${postData.id}:`, error);
    }
  }

  return updateResult;
};

/**
 * Get Instagram post by ID
 * @route GET /api/instagram/posts/:postId
 * @access Public
 */
const getPostById = async (req, res) => {
  try {
    const { postId } = req.params;

    // First check cache
    let post = await InstagramPost.findOne({ mediaId: postId, isActive: true });

    // If not in cache or expired, fetch from API
    if (!post || post.isCacheExpired()) {
      if (!instagramService.isConfigured()) {
        return res.status(503).json({
          success: false,
          message: 'Instagram API not configured'
        });
      }

      const freshPost = await instagramService.getMediaById(postId);

      // Update cache
      if (post) {
        // Update existing
        Object.assign(post, freshPost);
        await post.refreshCache();
      } else {
        // Create new
        post = new InstagramPost(freshPost);
        await post.save();
      }
    }

    res.json({
      success: true,
      data: post
    });

  } catch (error) {
    console.error('Error fetching Instagram post:', error);

    if (error.message === 'Post not found') {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error fetching post'
    });
  }
};

/**
 * Get Instagram user info
 * @route GET /api/instagram/user
 * @access Public
 */
const getUserInfo = async (req, res) => {
  try {
    if (!instagramService.isConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Instagram API not configured'
      });
    }

    const userInfo = await instagramService.getUserInfo();

    res.json({
      success: true,
      data: {
        id: userInfo.id,
        username: userInfo.username,
        accountType: userInfo.account_type,
        mediaCount: userInfo.media_count
      }
    });

  } catch (error) {
    console.error('Error fetching Instagram user info:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user information'
    });
  }
};

/**
 * Refresh Instagram post cache
 * @route POST /api/instagram/refresh
 * @access Admin (temporarily public for demo)
 */
const refreshCache = async (req, res) => {
  try {
    if (!instagramService.isConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Instagram API not configured'
      });
    }

    const { limit = 20 } = req.body;
    const maxLimit = Math.min(parseInt(limit), 25);

    // Fetch fresh posts from Instagram
    const freshPosts = await instagramService.getUserMedia(maxLimit);

    // Update cache
    const updateResult = await updatePostCache(freshPosts);

    res.json({
      success: true,
      message: 'Cache refreshed successfully',
      data: {
        fetched: freshPosts.length,
        updated: updateResult.updated,
        created: updateResult.created
      }
    });

  } catch (error) {
    console.error('Error refreshing cache:', error);
    res.status(500).json({
      success: false,
      message: 'Error refreshing cache'
    });
  }
};

/**
 * Test Instagram API connection
 * @route GET /api/instagram/test
 * @access Public (temporarily for demo - should be admin only)
 */
const testConnection = async (req, res) => {
  try {
    const result = await instagramService.testConnection();

    if (result.success) {
      res.json({
        success: true,
        message: 'Instagram API connection successful',
        data: result
      });
    } else {
      res.status(503).json({
        success: false,
        message: 'Instagram API connection failed',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error testing Instagram connection:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing connection'
    });
  }
};

module.exports = {
  getLatestPosts,
  getPostById,
  getUserInfo,
  refreshCache,
  testConnection
};