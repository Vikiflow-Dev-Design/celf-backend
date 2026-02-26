const achievementService = require('../services/achievementService');
const { Achievement, UserAchievement } = require('../models');

class AchievementController {
  /**
   * Get all achievements for the authenticated user
   * GET /api/achievements
   */
  async getUserAchievements(req, res) {
    try {
      const userId = req.user.id;
      const { category, completed } = req.query;

      const options = {};
      if (completed !== undefined) {
        options.completed = completed === 'true';
      }

      let achievements = await achievementService.getUserAchievements(userId, options);

      // Filter by category if specified
      if (category && category !== 'all') {
        achievements = achievements.filter(achievement => achievement.category === category);
      }

      // Get user stats
      const stats = await achievementService.getUserAchievementStats(userId);

      res.json({
        success: true,
        data: {
          achievements,
          stats,
          categories: [
            { key: 'all', label: 'All', icon: 'apps', color: '#007AFF' },
            { key: 'mining', label: 'Mining', icon: 'diamond', color: '#FF9500' },
            { key: 'social', label: 'Social', icon: 'people', color: '#34C759' },
            { key: 'wallet', label: 'Wallet', icon: 'card', color: '#007AFF' },
            { key: 'milestone', label: 'Milestone', icon: 'trophy', color: '#FF3B30' }
          ]
        }
      });
    } catch (error) {
      console.error('Error getting user achievements:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get achievements',
        error: error.message
      });
    }
  }

  /**
   * Get specific achievement details
   * GET /api/achievements/:achievementId
   */
  async getAchievementDetails(req, res) {
    try {
      const userId = req.user.id;
      const { achievementId } = req.params;

      const userAchievement = await UserAchievement.findUserAchievementByKey(userId, achievementId);

      if (!userAchievement) {
        return res.status(404).json({
          success: false,
          message: 'Achievement not found'
        });
      }

      const achievement = {
        id: userAchievement.achievementKey,
        title: userAchievement.achievementId.title,
        description: userAchievement.achievementId.description,
        category: userAchievement.achievementId.category,
        progress: userAchievement.progress,
        maxProgress: userAchievement.achievementId.maxProgress,
        reward: userAchievement.achievementId.reward,
        isCompleted: userAchievement.isCompleted,
        icon: userAchievement.achievementId.icon,
        completedDate: userAchievement.completedAt ? userAchievement.completedAt.toISOString().split('T')[0] : undefined,
        tips: userAchievement.achievementId.tips,
        requirements: userAchievement.achievementId.requirements,
        rewardClaimed: userAchievement.rewardClaimed,
        progressHistory: userAchievement.progressHistory
      };

      res.json({
        success: true,
        data: achievement
      });
    } catch (error) {
      console.error('Error getting achievement details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get achievement details',
        error: error.message
      });
    }
  }

  /**
   * Claim achievement reward
   * POST /api/achievements/:achievementId/claim
   */
  async claimReward(req, res) {
    try {
      const userId = req.user.id;
      const { achievementId } = req.params;

      const result = await achievementService.claimAchievementReward(userId, achievementId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error claiming achievement reward:', error);

      let statusCode = 500;
      if (error.message.includes('not found')) statusCode = 404;
      if (error.message.includes('not completed') || error.message.includes('already claimed')) statusCode = 400;

      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get user achievement statistics
   * GET /api/achievements/stats
   */
  async getUserStats(req, res) {
    try {
      const userId = req.user.id;
      const stats = await achievementService.getUserAchievementStats(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting user achievement stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get achievement statistics',
        error: error.message
      });
    }
  }

  /**
   * Initialize achievements for a user (usually called during registration)
   * POST /api/achievements/initialize
   */
  async initializeUserAchievements(req, res) {
    try {
      const userId = req.user.id;
      const count = await achievementService.initializeUserAchievements(userId);

      res.json({
        success: true,
        message: `Initialized ${count} achievements`,
        data: { initializedCount: count }
      });
    } catch (error) {
      console.error('Error initializing user achievements:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initialize achievements',
        error: error.message
      });
    }
  }

  // Admin endpoints

  /**
   * Get all achievements (admin only)
   * GET /api/admin/achievements
   */
  async getAllAchievements(req, res) {
    try {
      const achievements = await Achievement.findActiveAchievements();

      res.json({
        success: true,
        data: achievements
      });
    } catch (error) {
      console.error('Error getting all achievements:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get achievements',
        error: error.message
      });
    }
  }

  /**
   * Create new achievement (admin only)
   * POST /api/admin/achievements
   */
  async createAchievement(req, res) {
    try {
      const achievement = new Achievement(req.body);
      await achievement.save();

      res.status(201).json({
        success: true,
        data: achievement,
        message: 'Achievement created successfully'
      });
    } catch (error) {
      console.error('Error creating achievement:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create achievement',
        error: error.message
      });
    }
  }

  /**
   * Update achievement (admin only)
   * PUT /api/admin/achievements/:id
   */
  async updateAchievement(req, res) {
    try {
      const { id } = req.params;
      const achievement = await Achievement.findByIdAndUpdate(id, req.body, { new: true });

      if (!achievement) {
        return res.status(404).json({
          success: false,
          message: 'Achievement not found'
        });
      }

      res.json({
        success: true,
        data: achievement,
        message: 'Achievement updated successfully'
      });
    } catch (error) {
      console.error('Error updating achievement:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update achievement',
        error: error.message
      });
    }
  }

  /**
   * Delete achievement (admin only)
   * DELETE /api/admin/achievements/:id
   */
  async deleteAchievement(req, res) {
    try {
      const { id } = req.params;
      const achievement = await Achievement.findByIdAndUpdate(
        id,
        { isActive: false },
        { new: true }
      );

      if (!achievement) {
        return res.status(404).json({
          success: false,
          message: 'Achievement not found'
        });
      }

      res.json({
        success: true,
        message: 'Achievement deactivated successfully'
      });
    } catch (error) {
      console.error('Error deleting achievement:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete achievement',
        error: error.message
      });
    }
  }

  /**
   * Manually update user achievement progress (admin only)
   * PUT /api/admin/achievements/users/:userId/:achievementId/progress
   */
  async updateUserProgress(req, res) {
    try {
      const { userId, achievementId } = req.params;
      const { progress } = req.body;

      const userAchievement = await achievementService.updateAchievementProgress(
        userId,
        achievementId,
        progress,
        'manual',
        { updatedBy: req.user.id }
      );

      res.json({
        success: true,
        data: userAchievement,
        message: 'User achievement progress updated successfully'
      });
    } catch (error) {
      console.error('Error updating user achievement progress:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user achievement progress',
        error: error.message
      });
    }
  }
}

module.exports = new AchievementController();
