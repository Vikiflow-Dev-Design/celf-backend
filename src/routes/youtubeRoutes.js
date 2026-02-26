const express = require('express');
const router = express.Router();
const youtubeController = require('../controllers/youtubeController');
const { validateQuery, validateParams, validate } = require('../middleware/validationMiddleware');
const {
  videosQuerySchema,
  popularVideosQuerySchema,
  videoIdParamSchema,
  searchQuerySchema,
  refreshSchema,
} = require('../validators/youtubeValidator');

// Public routes for fetching YouTube content

/**
 * @route GET /api/youtube/videos
 * @desc Get latest YouTube videos
 * @access Public
 */
router.get('/videos', validateQuery(videosQuerySchema), youtubeController.getLatestVideos);

/**
 * @route GET /api/youtube/videos/popular
 * @desc Get popular YouTube videos (sorted by view count)
 * @access Public
 */
router.get('/videos/popular', validateQuery(popularVideosQuerySchema), youtubeController.getPopularVideos);

/**
 * @route GET /api/youtube/videos/:videoId
 * @desc Get specific YouTube video by ID
 * @access Public
 */
router.get('/videos/:videoId', validateParams(videoIdParamSchema), youtubeController.getVideoById);

/**
 * @route GET /api/youtube/search
 * @desc Search YouTube videos on the channel
 * @access Public
 */
router.get('/search', validateQuery(searchQuerySchema), youtubeController.searchVideos);

/**
 * @route GET /api/youtube/channel
 * @desc Get YouTube channel information
 * @access Public
 */
router.get('/channel', youtubeController.getChannelInfo);

/**
 * @route GET /api/youtube/test
 * @desc Test YouTube API connection
 * @access Public (temporarily for demo - should be admin only)
 */
router.get('/test', youtubeController.testConnection);

// Admin routes (temporarily public for demo purposes)
// TODO: Re-enable authentication when admin accounts are set up

/**
 * @route POST /api/youtube/refresh
 * @desc Manually refresh YouTube video cache
 * @access Admin (temporarily public)
 */
router.post(
  '/refresh',
  // authorize(['admin']), // TODO: Uncomment when admin auth is ready
  validate(refreshSchema),
  youtubeController.refreshCache
);

module.exports = router;