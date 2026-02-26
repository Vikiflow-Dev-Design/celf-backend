/**
 * Profile Controller
 * Handles profile-related API endpoints
 */

const profileService = require('../services/profileService');

class ProfileController {
  /**
   * Get current user's profile
   * GET /api/profile
   */
  async getProfile(req, res) {
    try {
      const userId = req.user.userId; // Changed from req.user.id to req.user.userId
      console.log('📋 Profile request for user ID:', userId);
      console.log('📋 User object:', req.user);
      const profile = await profileService.getUserProfile(userId);

      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      console.error('Error getting profile:', error);

      let statusCode = 500;
      if (error.message.includes('not found')) statusCode = 404;

      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to get profile'
      });
    }
  }

  /**
   * Update current user's profile
   * PUT /api/profile
   */
  async updateProfile(req, res) {
    try {
      const userId = req.user.userId; // Changed from req.user.id to req.user.userId
      const updateData = req.body;

      const updatedProfile = await profileService.updateUserProfile(userId, updateData);

      res.json({
        success: true,
        data: updatedProfile,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      console.error('Error updating profile:', error);

      let statusCode = 500;
      if (error.message.includes('not found')) statusCode = 404;
      if (error.message.includes('already taken') || error.message.includes('validation')) statusCode = 400;

      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to update profile'
      });
    }
  }

  /**
   * Upload profile picture
   * POST /api/profile/picture
   */
  async uploadProfilePicture(req, res) {
    try {
      const userId = req.user.userId; // Changed from req.user.id to req.user.userId
      const { imageUrl } = req.body;

      if (!imageUrl) {
        return res.status(400).json({
          success: false,
          message: 'Image URL is required'
        });
      }

      const result = await profileService.uploadProfilePicture(userId, imageUrl);

      res.json({
        success: true,
        data: result,
        message: 'Profile picture updated successfully'
      });
    } catch (error) {
      console.error('Error uploading profile picture:', error);

      res.status(500).json({
        success: false,
        message: 'Failed to upload profile picture'
      });
    }
  }

  /**
   * Get profile completion status
   * GET /api/profile/completion
   */
  async getProfileCompletion(req, res) {
    try {
      const userId = req.user.userId; // Changed from req.user.id to req.user.userId
      const completion = await profileService.getProfileCompletion(userId);

      res.json({
        success: true,
        data: completion
      });
    } catch (error) {
      console.error('Error getting profile completion:', error);

      res.status(500).json({
        success: false,
        message: 'Failed to get profile completion status'
      });
    }
  }

  /**
   * Search users
   * GET /api/profile/search?q=query
   */
  async searchUsers(req, res) {
    try {
      const { q: query, limit = 10 } = req.query;

      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Search query must be at least 2 characters'
        });
      }

      const users = await profileService.searchUsers(query.trim(), parseInt(limit));

      res.json({
        success: true,
        data: {
          users,
          query: query.trim(),
          count: users.length
        }
      });
    } catch (error) {
      console.error('Error searching users:', error);

      res.status(500).json({
        success: false,
        message: 'Failed to search users'
      });
    }
  }

  /**
   * Get another user's public profile
   * GET /api/profile/user/:userId
   */
  async getUserProfile(req, res) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      const profile = await profileService.getUserProfile(userId);

      // Return only public profile data
      const publicProfile = {
        userId: profile.userId,
        username: profile.username,
        displayName: profile.displayName,
        bio: profile.bio,
        profilePicture: profile.profilePicture,
        joinDate: profile.joinDate,
        totalMined: profile.totalMined,
        referrals: profile.referrals,
        achievements: profile.achievements
      };

      res.json({
        success: true,
        data: publicProfile
      });
    } catch (error) {
      console.error('Error getting user profile:', error);

      let statusCode = 500;
      if (error.message.includes('not found')) statusCode = 404;

      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to get user profile'
      });
    }
  }

  // Admin endpoints

  /**
   * Update user profile stats (admin only)
   * PUT /api/admin/profile/:userId/stats
   */
  async updateUserStats(req, res) {
    try {
      const { userId } = req.params;
      const stats = req.body;

      await profileService.updateProfileStats(userId, stats);

      res.json({
        success: true,
        message: 'User stats updated successfully'
      });
    } catch (error) {
      console.error('Error updating user stats:', error);

      let statusCode = 500;
      if (error.message.includes('not found')) statusCode = 404;

      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to update user stats'
      });
    }
  }
}

module.exports = new ProfileController();
