const youtubeService = require('../services/youtubeService');
const YouTubeVideo = require('../models/YouTubeVideo');
/**
 * Get latest YouTube videos (with caching)
 * @route GET /api/youtube/videos
 * @access Public
 */
const getLatestVideos = async (req, res) => {
  try {
    const { limit = 10, forceRefresh = false, search } = req.query;
    const maxLimit = Math.min(parseInt(limit), 50); // Cap at 50 videos

    // Check if we should use cached data (only if no search query)
    if (!forceRefresh && !search) {
      const cachedVideos = await YouTubeVideo.findActive(maxLimit);

      // If we have cached videos and they're not all expired, return them
      if (cachedVideos.length > 0) {
        const nonExpiredVideos = cachedVideos.filter(video => !video.isCacheExpired());

        if (nonExpiredVideos.length >= Math.min(maxLimit, 5)) { // At least 5 non-expired videos
          return res.json({
            success: true,
            data: cachedVideos,
            cached: true,
            count: cachedVideos.length
          });
        }
      }
    }

    // Fetch fresh data from YouTube API
    if (!youtubeService.isConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'YouTube API not configured'
      });
    }

    let freshVideos;

    // If search query is provided, perform search
    if (search && search.trim()) {
      freshVideos = await youtubeService.searchVideos(search.trim(), maxLimit);
    } else {
      freshVideos = await youtubeService.getChannelVideos(maxLimit);
    }

    // Update cache only if not a search query (to avoid polluting cache with search results)
    if (!search) {
      await updateVideoCache(freshVideos);
    }

    res.json({
      success: true,
      data: freshVideos,
      cached: false,
      count: freshVideos.length
    });

  } catch (error) {
    console.error('Error fetching YouTube videos:', error);

    // Fallback to cached data if API fails
    try {
      const cachedVideos = await YouTubeVideo.findActive(parseInt(req.query.limit) || 10);
      if (cachedVideos.length > 0) {
        return res.json({
          success: true,
          data: cachedVideos,
          cached: true,
          fallback: true,
          count: cachedVideos.length,
          message: 'Using cached data due to API error'
        });
      }
    } catch (cacheError) {
      console.error('Error fetching cached videos:', cacheError);
    }

    res.status(500).json({
      success: false,
      message: 'Error fetching YouTube videos',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get popular YouTube videos
 * @route GET /api/youtube/videos/popular
 * @access Public
 */
const getPopularVideos = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const maxLimit = Math.min(parseInt(limit), 50);

    const popularVideos = await YouTubeVideo.findPopular(maxLimit);

    res.json({
      success: true,
      data: popularVideos,
      count: popularVideos.length
    });

  } catch (error) {
    console.error('Error fetching popular YouTube videos:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching popular videos'
    });
  }
};

/**
 * Get YouTube video by ID
 * @route GET /api/youtube/videos/:videoId
 * @access Public
 */
const getVideoById = async (req, res) => {
  try {
    const { videoId } = req.params;

    // First check cache
    let video = await YouTubeVideo.findOne({ videoId, isActive: true });

    // If not in cache or expired, fetch from API
    if (!video || video.isCacheExpired()) {
      if (!youtubeService.isConfigured()) {
        return res.status(503).json({
          success: false,
          message: 'YouTube API not configured'
        });
      }

      const freshVideo = await youtubeService.getVideoById(videoId);

      // Update cache
      if (video) {
        // Update existing
        Object.assign(video, freshVideo);
        await video.refreshCache();
      } else {
        // Create new
        video = new YouTubeVideo(freshVideo);
        await video.save();
      }
    }

    res.json({
      success: true,
      data: video
    });

  } catch (error) {
    console.error('Error fetching YouTube video:', error);

    if (error.message === 'Video not found') {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error fetching video'
    });
  }
};

/**
 * Search YouTube videos
 * @route GET /api/youtube/search
 * @access Public
 */
const searchVideos = async (req, res) => {
  try {
    const { q: query, limit = 10 } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    if (!youtubeService.isConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'YouTube API not configured'
      });
    }

    const maxLimit = Math.min(parseInt(limit), 50);
    const searchResults = await youtubeService.searchChannelVideos(query.trim(), maxLimit);

    res.json({
      success: true,
      data: searchResults,
      query: query.trim(),
      count: searchResults.length
    });

  } catch (error) {
    console.error('Error searching YouTube videos:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching videos'
    });
  }
};

/**
 * Get YouTube channel info
 * @route GET /api/youtube/channel
 * @access Public
 */
const getChannelInfo = async (req, res) => {
  try {
    if (!youtubeService.isConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'YouTube API not configured'
      });
    }

    const channelInfo = await youtubeService.getChannelInfo();

    res.json({
      success: true,
      data: {
        id: channelInfo.id,
        title: channelInfo.snippet.title,
        description: channelInfo.snippet.description,
        thumbnail: channelInfo.snippet.thumbnails.high?.url,
        subscriberCount: channelInfo.statistics.subscriberCount,
        videoCount: channelInfo.statistics.videoCount,
        viewCount: channelInfo.statistics.viewCount,
        publishedAt: channelInfo.snippet.publishedAt
      }
    });

  } catch (error) {
    console.error('Error fetching channel info:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching channel information'
    });
  }
};

/**
 * Refresh YouTube video cache
 * @route POST /api/youtube/refresh
 * @access Admin (temporarily public for demo)
 */
const refreshCache = async (req, res) => {
  try {
    if (!youtubeService.isConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'YouTube API not configured'
      });
    }

    const { limit = 20 } = req.body;
    const maxLimit = Math.min(parseInt(limit), 50);

    // Fetch fresh videos from YouTube
    const freshVideos = await youtubeService.getChannelVideos(maxLimit);

    // Update cache
    const updateResult = await updateVideoCache(freshVideos);

    res.json({
      success: true,
      message: 'Cache refreshed successfully',
      data: {
        fetched: freshVideos.length,
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
 * Test YouTube API connection
 * @route GET /api/youtube/test
 * @access Admin (temporarily public for demo)
 */
const testConnection = async (req, res) => {
  try {
    const testResult = await youtubeService.testConnection();

    res.json({
      success: testResult.success,
      data: testResult
    });

  } catch (error) {
    console.error('Error testing YouTube connection:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing connection'
    });
  }
};

/**
 * Helper function to update video cache
 */
async function updateVideoCache(videos) {
  let updated = 0;
  let created = 0;

  for (const videoData of videos) {
    try {
      const existingVideo = await YouTubeVideo.findOne({ videoId: videoData.id });

      // Transform the data to match the model schema
      const transformedData = {
        videoId: videoData.id,
        platform: videoData.platform,
        type: videoData.type,
        title: videoData.title,
        description: videoData.description,
        thumbnail: videoData.thumbnail,
        url: videoData.url,
        publishedAt: videoData.publishedAt,
        channelTitle: videoData.channelTitle,
        channelId: videoData.channelId,
        tags: videoData.tags,
        duration: videoData.duration,
        statistics: videoData.statistics,
        engagement: videoData.engagement,
        metadata: videoData.metadata
      };

      if (existingVideo) {
        // Update existing video
        Object.assign(existingVideo, transformedData);
        await existingVideo.refreshCache();
        updated++;
      } else {
        // Create new video
        const newVideo = new YouTubeVideo(transformedData);
        await newVideo.save();
        created++;
      }
    } catch (error) {
      console.error(`Error updating video ${videoData.id}:`, error);
    }
  }

  return { updated, created };
}

module.exports = {
  getLatestVideos,
  getPopularVideos,
  getVideoById,
  searchVideos,
  getChannelInfo,
  refreshCache,
  testConnection
};