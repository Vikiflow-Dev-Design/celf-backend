/**
 * Referral Controller
 * Handles referral-related API endpoints
 */

const { createResponse } = require('../utils/responseUtils');
const ReferralService = require('../services/referralService');

class ReferralController {

  /**
   * Get user's referral information and statistics
   */
  async getReferralInfo(req, res, next) {
    try {
      const userId = req.user.userId;

      console.log(`🔍 ReferralController: Getting referral info for user ${userId}`);

      const referralData = await ReferralService.getUserReferralStats(userId);

      res.json(createResponse(true, 'Referral information retrieved successfully', referralData));
    } catch (error) {
      console.error('❌ ReferralController: Error getting referral info:', error);
      next(error);
    }
  }

  /**
   * Validate a referral code
   */
  async validateReferralCode(req, res, next) {
    try {
      const { code } = req.params;

      console.log(`🔍 ReferralController: Validating referral code ${code}`);

      const validation = await ReferralService.validateReferralCode(code);

      res.json(createResponse(true, 'Referral code validation completed', validation));
    } catch (error) {
      console.error('❌ ReferralController: Error validating referral code:', error);
      next(error);
    }
  }

  /**
   * Claim mining milestone bonuses
   */
  async claimMilestone(req, res, next) {
    try {
      const userId = req.user.userId;
      console.log(`🔍 ReferralController: Claiming milestones for user ${userId}`);

      const claimed = await ReferralService.claimMiningMilestone(userId);

      if (claimed.length > 0) {
        res.json(createResponse(true, `Successfully claimed ${claimed.length} milestone bonuses`, { claimed }));
      } else {
        res.json(createResponse(true, 'No new milestones to claim', { claimed: [] }));
      }
    } catch (error) {
      console.error('❌ ReferralController: Error claiming milestones:', error);
      next(error);
    }
  }

  /**
   * Process referral signup (called during user registration)
   */
  async processReferralSignup(req, res, next) {
    try {
      const { referralCode, userId } = req.body;
      const metadata = {
        source: 'mobile_app',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      };

      console.log(`🔍 ReferralController: Processing referral signup for user ${userId} with code ${referralCode}`);

      const referral = await ReferralService.processReferralSignup(userId, referralCode, metadata);

      if (referral) {
        // Give rewards immediately
        await ReferralService.giveReferralRewards(referral._id);

        res.json(createResponse(true, 'Referral processed successfully', {
          referral: {
            id: referral._id,
            status: referral.status,
            reward: referral.refereeReward.amount
          }
        }));
      } else {
        res.json(createResponse(false, 'Invalid referral code or referral not processed'));
      }
    } catch (error) {
      console.error('❌ ReferralController: Error processing referral signup:', error);
      next(error);
    }
  }

  /**
   * Get referral leaderboard (top referrers)
   */
  async getReferralLeaderboard(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 10;

      console.log(`🔍 ReferralController: Getting referral leaderboard (top ${limit})`);

      const User = require('../models/User');
      const topReferrers = await User.find({
        'referralStats.successfulReferrals': { $gt: 0 }
      })
        .select('firstName lastName referralStats')
        .sort({ 'referralStats.successfulReferrals': -1, 'referralStats.totalEarned': -1 })
        .limit(limit);

      const leaderboard = topReferrers.map((user, index) => ({
        rank: index + 1,
        name: `${user.firstName} ${user.lastName}`,
        referrals: user.referralStats.successfulReferrals,
        earned: user.referralStats.totalEarned
      }));

      res.json(createResponse(true, 'Referral leaderboard retrieved successfully', { leaderboard }));
    } catch (error) {
      console.error('❌ ReferralController: Error getting referral leaderboard:', error);
      next(error);
    }
  }

  /**
   * Generate or regenerate referral code for user (DEPRECATED: Use setReferralCode)
   */
  async generateReferralCode(req, res, next) {
    // Forward to setReferralCode logic
    const controller = require('./referralController');
    return controller.setReferralCode(req, res, next);
  }

  /**
   * Set or update referral code
   */
  async setReferralCode(req, res, next) {
    try {
      const userId = req.user.userId;
      const { code } = req.body; // Optional: custom code

      console.log(`🔍 ReferralController: Setting referral code for user ${userId} to ${code || 'random'}`);

      const referralCode = await ReferralService.setReferralCodeForUser(userId, code);

      const appBaseUrl = process.env.APP_URL || 'https://celf-website.vikiflow.com';
      res.json(createResponse(true, 'Referral code set successfully', {
        referralCode,
        referralLink: `${appBaseUrl}/auth/register?ref=${referralCode}`
      }));
    } catch (error) {
      console.error('❌ ReferralController: Error setting referral code:', error);
      next(error);
    }
  }

  /**
   * Delete referral code
   */
  async deleteReferralCode(req, res, next) {
    try {
      const userId = req.user.userId;
      console.log(`🔍 ReferralController: Deleting referral code for user ${userId}`);

      await ReferralService.deleteReferralCode(userId);

      res.json(createResponse(true, 'Referral code deleted successfully'));
    } catch (error) {
      console.error('❌ ReferralController: Error deleting referral code:', error);
      next(error);
    }
  }

  /**
   * Get detailed referral history
   */
  async getReferralHistory(req, res, next) {
    try {
      const userId = req.user.userId;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      console.log(`🔍 ReferralController: Getting referral history for user ${userId}`);

      const Referral = require('../models/Referral');

      const referrals = await Referral.find({ referrerId: userId })
        .populate('refereeId', 'firstName lastName email createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Referral.countDocuments({ referrerId: userId });

      const history = referrals.map(ref => ({
        id: ref._id,
        referee: {
          name: `${ref.refereeId.firstName} ${ref.refereeId.lastName}`,
          email: ref.refereeId.email,
          joinDate: ref.refereeId.createdAt
        },
        status: ref.status,
        reward: ref.referrerReward.amount,
        rewardGiven: ref.referrerReward.given,
        signupDate: ref.signupDate,
        source: ref.source
      }));

      res.json(createResponse(true, 'Referral history retrieved successfully', {
        referrals: history,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }));
    } catch (error) {
      console.error('❌ ReferralController: Error getting referral history:', error);
      next(error);
    }
  }
}

module.exports = new ReferralController();
