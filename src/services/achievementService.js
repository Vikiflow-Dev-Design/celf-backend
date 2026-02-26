const { Achievement, UserAchievement, User, Wallet, Transaction, MobileMiningSession } = require('../models');
const mongoose = require('mongoose');

class AchievementService {
  /**
   * Initialize user achievements when they first register
   */
  async initializeUserAchievements(userId) {
    try {
      const achievements = await Achievement.findActiveAchievements();
      const userAchievements = [];

      for (const achievement of achievements) {
        // Check if user achievement already exists
        const existingUserAchievement = await UserAchievement.findOne({
          userId,
          achievementKey: achievement.achievementId
        });

        if (!existingUserAchievement) {
          userAchievements.push({
            userId,
            achievementId: achievement._id,
            achievementKey: achievement.achievementId,
            progress: 0,
            isCompleted: false
          });
        }
      }

      if (userAchievements.length > 0) {
        await UserAchievement.insertMany(userAchievements);
      }

      return userAchievements.length;
    } catch (error) {
      console.error('Error initializing user achievements:', error);
      throw error;
    }
  }

  /**
   * Get all achievements for a user with their progress
   */
  async getUserAchievements(userId, options = {}) {
    try {
      const userAchievements = await UserAchievement.findUserAchievements(userId, options);
      
      // Transform data to match mobile app format
      return userAchievements.map(ua => ({
        id: ua.achievementKey,
        title: ua.achievementId.title,
        description: ua.achievementId.description,
        category: ua.achievementId.category,
        progress: ua.progress,
        maxProgress: ua.achievementId.maxProgress,
        reward: ua.achievementId.reward,
        isCompleted: ua.isCompleted,
        icon: ua.achievementId.icon,
        completedDate: ua.completedAt ? ua.completedAt.toISOString().split('T')[0] : undefined,
        tips: ua.achievementId.tips,
        requirements: ua.achievementId.requirements,
        rewardClaimed: ua.rewardClaimed
      }));
    } catch (error) {
      console.error('Error getting user achievements:', error);
      throw error;
    }
  }

  /**
   * Update achievement progress for a user
   */
  async updateAchievementProgress(userId, achievementKey, newProgress, source = 'manual', details = {}) {
    try {
      const userAchievement = await UserAchievement.findUserAchievementByKey(userId, achievementKey);
      
      if (!userAchievement) {
        throw new Error(`Achievement ${achievementKey} not found for user`);
      }

      await userAchievement.updateProgress(newProgress, source, details);
      
      // Check if achievement is now completed
      const wasCompleted = await userAchievement.checkCompletion();
      
      if (wasCompleted) {
        // Trigger completion event (could send notification, etc.)
        await this.handleAchievementCompletion(userId, userAchievement);
      }

      return userAchievement;
    } catch (error) {
      console.error('Error updating achievement progress:', error);
      throw error;
    }
  }

  /**
   * Increment achievement progress
   */
  async incrementAchievementProgress(userId, achievementKey, amount = 1, source = 'automatic', details = {}) {
    try {
      const userAchievement = await UserAchievement.findUserAchievementByKey(userId, achievementKey);
      
      if (!userAchievement) {
        // Initialize achievement if it doesn't exist
        await this.initializeUserAchievements(userId);
        return this.incrementAchievementProgress(userId, achievementKey, amount, source, details);
      }

      await userAchievement.incrementProgress(amount, source, details);
      
      // Check if achievement is now completed
      const wasCompleted = await userAchievement.checkCompletion();
      
      if (wasCompleted) {
        await this.handleAchievementCompletion(userId, userAchievement);
      }

      return userAchievement;
    } catch (error) {
      console.error('Error incrementing achievement progress:', error);
      throw error;
    }
  }

  /**
   * Handle achievement completion
   */
  async handleAchievementCompletion(userId, userAchievement) {
    try {
      console.log(`🏆 Achievement completed: ${userAchievement.achievementKey} for user ${userId}`);
      
      // Here you could add:
      // - Send push notification
      // - Log achievement completion
      // - Trigger other events
      
      return true;
    } catch (error) {
      console.error('Error handling achievement completion:', error);
      throw error;
    }
  }

  /**
   * Claim achievement reward
   */
  async claimAchievementReward(userId, achievementKey) {
    try {
      const userAchievement = await UserAchievement.findUserAchievementByKey(userId, achievementKey);
      
      if (!userAchievement) {
        throw new Error('Achievement not found');
      }

      if (!userAchievement.isCompleted) {
        throw new Error('Achievement not completed');
      }

      if (userAchievement.rewardClaimed) {
        throw new Error('Reward already claimed');
      }

      // Claim the reward
      await userAchievement.claimReward();

      // Add tokens to user's wallet
      const wallet = await Wallet.findOne({ userId });
      if (wallet) {
        wallet.nonSendableBalance += userAchievement.achievementId.reward;
        await wallet.save();

        // Create transaction record
        await Transaction.create({
          type: 'bonus',
          amount: userAchievement.achievementId.reward,
          toUserId: userId,
          status: 'completed',
          description: `Achievement reward: ${userAchievement.achievementId.title}`,
          metadata: {
            achievementId: userAchievement.achievementKey,
            source: 'achievement_reward'
          }
        });
      }

      return {
        success: true,
        reward: userAchievement.achievementId.reward,
        message: `Claimed ${userAchievement.achievementId.reward} CELF tokens!`
      };
    } catch (error) {
      console.error('Error claiming achievement reward:', error);
      throw error;
    }
  }

  /**
   * Get user achievement statistics
   */
  async getUserAchievementStats(userId) {
    try {
      const stats = await UserAchievement.getUserStats(userId);
      const unclaimedRewards = await UserAchievement.getUnclaimedRewards(userId);
      
      const totalRewards = unclaimedRewards.reduce((sum, ua) => sum + ua.achievementId.reward, 0);
      
      return {
        totalAchievements: stats[0]?.totalAchievements || 0,
        completedAchievements: stats[0]?.completedAchievements || 0,
        unclaimedRewards: stats[0]?.unclaimedRewards || 0,
        totalUnclaimedRewardValue: totalRewards,
        completionPercentage: stats[0]?.totalAchievements > 0 
          ? Math.round((stats[0].completedAchievements / stats[0].totalAchievements) * 100)
          : 0
      };
    } catch (error) {
      console.error('Error getting user achievement stats:', error);
      throw error;
    }
  }

  /**
   * Track mining achievement progress
   */
  async trackMiningProgress(userId, sessionData) {
    try {
      // Track mining session count
      await this.incrementAchievementProgress(userId, '1', 1, 'mining', {
        sessionId: sessionData.sessionId,
        amount: sessionData.amount
      });

      // Track mining amount for other achievements
      const miningStats = await MiningSession.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        { $group: { _id: null, totalSessions: { $sum: 1 }, totalMined: { $sum: '$tokensEarned' } } }
      ]);

      if (miningStats.length > 0) {
        const { totalSessions, totalMined } = miningStats[0];
        
        // Update mining milestone achievements
        await this.updateAchievementProgress(userId, '2', totalSessions, 'mining', { totalMined });
        await this.updateAchievementProgress(userId, '5', totalMined, 'mining', { totalSessions });
      }
    } catch (error) {
      console.error('Error tracking mining progress:', error);
      throw error;
    }
  }

  /**
   * Track transaction achievement progress
   */
  async trackTransactionProgress(userId, transactionData) {
    try {
      // Track first transaction
      await this.incrementAchievementProgress(userId, '4', 1, 'transaction', {
        transactionId: transactionData.transactionId,
        amount: transactionData.amount
      });

      // Track total transactions
      const transactionCount = await Transaction.countDocuments({
        $or: [{ fromUserId: userId }, { toUserId: userId }],
        status: 'completed'
      });

      await this.updateAchievementProgress(userId, '8', transactionCount, 'transaction', {
        totalTransactions: transactionCount
      });
    } catch (error) {
      console.error('Error tracking transaction progress:', error);
      throw error;
    }
  }

  /**
   * Track social achievement progress
   */
  async trackSocialProgress(userId, socialData) {
    try {
      // Track referrals and social achievements
      await this.incrementAchievementProgress(userId, '3', 1, 'social', socialData);
    } catch (error) {
      console.error('Error tracking social progress:', error);
      throw error;
    }
  }
}

module.exports = new AchievementService();
