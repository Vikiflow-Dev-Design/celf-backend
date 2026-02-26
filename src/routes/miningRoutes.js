const express = require('express');
const router = express.Router();

const miningController = require('../controllers/miningController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validate, validateParams } = require('../middleware/validationMiddleware');
const {
  updateMiningProgressSchema,
  updateMiningRateSchema,
  sessionIdParamSchema,
  sessionStatusSchema,
} = require('../validators/miningValidator');

// Current mining session routes (for mobile app)
router.get('/status', authenticate, miningController.getMiningStatus);
router.post('/start', authenticate, miningController.startMining);
router.post('/stop', authenticate, miningController.stopMining);
router.post('/cancel', authenticate, miningController.cancelMining);
router.post('/pause', authenticate, miningController.pauseMining);
router.post('/resume', authenticate, miningController.resumeMining);

// Mining progress and updates
router.post('/progress', authenticate, validate(updateMiningProgressSchema), miningController.updateMiningProgress);
router.get('/current-session', authenticate, miningController.getCurrentSession);

// Mining history and statistics
router.get('/sessions', authenticate, miningController.getMiningSessions);
router.get('/sessions/:id', authenticate, validateParams(sessionIdParamSchema), miningController.getMiningSessionById);
router.get('/stats', authenticate, miningController.getUserMiningStats);
router.get('/stats/daily', authenticate, miningController.getDailyMiningStats);
router.get('/stats/weekly', authenticate, miningController.getWeeklyMiningStats);
router.get('/stats/monthly', authenticate, miningController.getMonthlyMiningStats);

// Mining rate and configuration
router.get('/rate', authenticate, miningController.getMiningRate);
router.put('/rate', authenticate, validate(updateMiningRateSchema), miningController.updateMiningRate);

// Mining achievements and milestones
router.get('/achievements', authenticate, miningController.getMiningAchievements);
router.get('/milestones', authenticate, miningController.getMiningMilestones);

// Mining leaderboard
router.get('/leaderboard', authenticate, miningController.getMiningLeaderboard);
router.get('/leaderboard/friends', authenticate, miningController.getFriendsLeaderboard);

// Admin routes
router.use(authorize(['admin', 'moderator'])); // Admin/moderator only routes below

router.get('/admin/all-sessions', miningController.getAllMiningSessions);
router.get('/admin/stats', miningController.getGlobalMiningStats);
router.get('/admin/users/:userId/sessions', miningController.getUserMiningSessionsAdmin);
router.put('/admin/sessions/:id/status', validate(sessionStatusSchema), miningController.updateSessionStatusAdmin);

module.exports = router;
