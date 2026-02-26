/**
 * Referral Service
 * Handles all referral-related business logic
 */

const crypto = require('crypto');
const User = require('../models/User');
const Referral = require('../models/Referral');
const Transaction = require('../models/Transaction');
const mongodbService = require('./mongodbService');
const mobileMiningService = require('./mobileMiningService');

class ReferralService {

  /**
   * Generate a unique referral code for a user
   */
  static generateReferralCode(firstName, lastName) {
    const namePrefix = (firstName.substring(0, 2) + lastName.substring(0, 2)).toUpperCase();
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `${namePrefix}${randomSuffix}`;
  }

  /**
   * Generate and verify unique referral code (without saving to user)
   */
  static async generateUniqueReferralCode(firstName, lastName) {
    let referralCode;
    let isUnique = false;
    let attempts = 0;

    // Generate unique referral code
    while (!isUnique && attempts < 10) {
      referralCode = this.generateReferralCode(firstName, lastName);
      const existingUser = await User.findOne({ referralCode });
      if (!existingUser) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new Error('Failed to generate unique referral code');
    }

    return referralCode;
  }

  /**
   * Create referral code for existing user (DEPRECATED - Use setReferralCodeForUser)
   * Kept for backward compatibility if needed internally
   */
  static async createReferralCodeForUser(userId) {
    return this.setReferralCodeForUser(userId);
  }

  /**
   * Set or update referral code for user (Manual Creation/Edit)
   * If code is provided, it validates uniqueness.
   * If code is NOT provided, it generates a random one based on name.
   */
  static async setReferralCodeForUser(userId, customCode = null) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      let newCode = customCode;

      if (customCode) {
        // Validate custom code format (optional: alphanumeric, length)
        const codeRegex = /^[A-Za-z0-9-_]{3,20}$/;
        if (!codeRegex.test(customCode)) {
          throw new Error('Invalid referral code format. Use 3-20 alphanumeric characters.');
        }

        // Check uniqueness
        const existing = await User.findOne({ referralCode: customCode });
        if (existing && existing._id.toString() !== userId.toString()) {
          throw new Error('Referral code already taken');
        }
      } else {
        // Generate random if no custom code provided
        newCode = await this.generateUniqueReferralCode(user.firstName, user.lastName);
      }

      user.referralCode = newCode;
      await user.save();

      console.log(`✅ ReferralService: Set referral code ${newCode} for user ${user.email}`);
      return newCode;
    } catch (error) {
      console.error('❌ ReferralService: Error setting referral code:', error);
      throw error;
    }
  }

  /**
   * Delete referral code for user
   */
  static async deleteReferralCode(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.referralCode) {
        return; // Nothing to delete
      }

      user.referralCode = null;
      await user.save();

      console.log(`✅ ReferralService: Deleted referral code for user ${user.email}`);
      return true;
    } catch (error) {
      console.error('❌ ReferralService: Error deleting referral code:', error);
      throw error;
    }
  }

  /**
   * Process referral signup
   */
  static async processReferralSignup(refereeId, referralCode, metadata = {}) {
    try {
      console.log(`🔍 ReferralService: Processing referral signup for ${refereeId} with code ${referralCode}`);

      // Find referrer by code
      const referrer = await User.findOne({ referralCode });
      if (!referrer) {
        console.log(`⚠️  ReferralService: Invalid referral code: ${referralCode}`);
        return null;
      }

      // Prevent self-referral
      if (referrer._id.toString() === refereeId.toString()) {
        console.log(`⚠️  ReferralService: Self-referral attempt blocked`);
        return null;
      }

      // Check if referral already exists
      const existingReferral = await Referral.findOne({ refereeId });
      if (existingReferral) {
        console.log(`⚠️  ReferralService: User already has a referral record`);
        return existingReferral;
      }

      // Get rewards from settings
      const settings = await mongodbService.getMiningSettings();
      const referrerRewardAmount = settings.referralRewardReferrer || 10;
      const refereeRewardAmount = settings.referralRewardReferee || 10;

      console.log(`💰 ReferralService: Using reward rates - Referrer: ${referrerRewardAmount}, Referee: ${refereeRewardAmount}`);

      // Create referral record
      const referral = new Referral({
        referrerId: referrer._id,
        refereeId,
        referralCode,
        status: 'completed', // Signup completed
        referrerReward: { amount: referrerRewardAmount },
        refereeReward: { amount: refereeRewardAmount },
        source: metadata.source || 'mobile_app',
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        milestoneClaimed: false // Track 3-session milestone separately
      });

      await referral.save();

      // Update referee's referredBy field
      await User.findByIdAndUpdate(refereeId, { referredBy: referrer._id });

      console.log(`✅ ReferralService: Referral created successfully`);
      return referral;
    } catch (error) {
      console.error('❌ ReferralService: Error processing referral signup:', error);
      throw error;
    }
  }

  /**
   * Check and claim mining milestones for a referrer
   * Triggered manually when visiting the referral task page
   */
  static async claimMiningMilestone(userId) {
    try {
      console.log(`🔍 ReferralService: Checking mining milestones for referrer ${userId}`);

      // Find all referrals made by this user that haven't claimed milestone yet
      const referrals = await Referral.find({
        referrerId: userId,
        milestoneClaimed: false // Only check unclaimed
      }).populate('refereeId', 'firstName lastName email');

      const claimedRewards = [];
      const MobileMiningSession = require('../models/MobileMiningSession');

      for (const referral of referrals) {
        // Count completed sessions for this referee
        const sessionCount = await MobileMiningSession.countDocuments({
          userId: referral.refereeId._id,
          status: { $in: ['completed', 'auto_completed'] },
          // Optional: valid sessions > 1 min? For now just count completions
        });

        if (sessionCount >= 3) {
          console.log(`🎉 ReferralService: Milestone reached for referee ${referral.refereeId.email} (${sessionCount} sessions)`);

          // Award 20 CELF to referrer
          const rewardAmount = 20;
          await this.addRewardToWallet(userId, rewardAmount, 'referral_milestone',
            `Milestone Bonus: ${referral.refereeId.firstName} completed 3 mining sessions`,
            referral._id
          );

          // Mark as claimed
          referral.milestoneClaimed = true;
          await referral.save();

          // Update stats
          await User.findByIdAndUpdate(userId, {
            $inc: { 'referralStats.totalEarned': rewardAmount }
          });

          claimedRewards.push({
            refereeName: `${referral.refereeId.firstName} ${referral.refereeId.lastName}`,
            amount: rewardAmount
          });
        }
      }

      return claimedRewards;
    } catch (error) {
      console.error('❌ ReferralService: Error claiming mining milestones:', error);
      throw error;
    }
  }

  /**
   * Helper to add reward to wallet
   */
  static async addRewardToWallet(userId, amount, type, description, referralId = null) {
    const wallet = await mongodbService.findWalletByUserId(userId);
    if (!wallet) return;

    const newBalance = wallet.sendableBalance + amount;
    await mongodbService.updateWallet(wallet.id, {
      sendableBalance: newBalance,
      totalBalance: newBalance + wallet.nonSendableBalance + wallet.pendingBalance,
      totalReceived: (wallet.totalReceived || 0) + amount
    });

    const txData = {
      toUserId: userId,
      amount: amount,
      type: type || 'referral',
      status: 'completed',
      description: description,
      fee: 0
    };

    if (referralId) {
        txData.referralId = referralId;
    }

    await mongodbService.createTransaction(txData);

    console.log(`💰 ReferralService: Added ${amount} CELF to wallet for ${userId}`);
  }

  /**
   * Give referral rewards (Signup Bonus)
   */
  static async giveReferralRewards(referralId) {
    try {
      const referral = await Referral.findById(referralId)
        .populate('referrerId', 'firstName lastName email')
        .populate('refereeId', 'firstName lastName email');

      if (!referral) {
        throw new Error('Referral not found');
      }

      if (referral.status === 'rewarded') {
        console.log(`⚠️  ReferralService: Rewards already given for referral ${referralId}`);
        return referral;
      }

      console.log(`💰 ReferralService: Giving signup rewards for referral ${referralId}`);

      // Give reward to referrer (20 CELF)
      if (!referral.referrerReward.given) {
        await this.addRewardToWallet(
          referral.referrerId._id,
          referral.referrerReward.amount,
          'referral',
          `Referral reward for inviting ${referral.refereeId.firstName}`,
          referral._id
        );
      }

      // Give reward to referee (20 CELF)
      if (!referral.refereeReward.given) {
        await this.addRewardToWallet(
          referral.refereeId._id,
          referral.refereeReward.amount,
          'referral',
          `Signup bonus from ${referral.referrerId.firstName}`,
          referral._id
        );
      }

      // Mark referral as rewarded
      await referral.markRewarded();

      // Update referrer stats
      await User.findByIdAndUpdate(referral.referrerId._id, {
        $inc: {
          'referralStats.successfulReferrals': 1,
          'referralStats.totalEarned': referral.referrerReward.amount
        },
        $set: {
          'referralStats.lastReferralDate': new Date()
        }
      });

      console.log(`✅ ReferralService: Referral rewards completed for ${referralId}`);
      return referral;
    } catch (error) {
      console.error('❌ ReferralService: Error giving referral rewards:', error);
      throw error;
    }
  }

  /**
   * Get user's referral statistics
   */
  static async getUserReferralStats(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Ensure user has referral code
      // if (!user.referralCode) {
      //   await this.createReferralCodeForUser(userId);
      //   user.referralCode = await User.findById(userId).select('referralCode').referralCode;
      // }

      const referralStats = await Referral.getStats(userId);
      const referrals = await Referral.findByReferrer(userId);

      // Get real active miners count
      const activeMiners = await mobileMiningService.getActiveRefereesCount(userId);

      const appBaseUrl = process.env.APP_URL || 'https://celf-website.vikiflow.com';
      return {
        referralCode: user.referralCode,
        referralLink: `${appBaseUrl}/auth/register?ref=${user.referralCode}`,
        stats: {
          ...referralStats,
          activeMiners // Add real active miners count
        },
        referrals: referrals.map(ref => ({
          id: ref._id,
          referee: {
            name: `${ref.refereeId.firstName} ${ref.refereeId.lastName}`,
            email: ref.refereeId.email
          },
          status: ref.status,
          reward: ref.referrerReward.amount,
          date: ref.createdAt
        }))
      };
    } catch (error) {
      console.error('❌ ReferralService: Error getting referral stats:', error);
      throw error;
    }
  }

  /**
   * Validate referral code
   */
  static async validateReferralCode(referralCode) {
    try {
      const referrer = await User.findOne({ referralCode }).select('firstName lastName email');
      return referrer ? {
        valid: true,
        referrer: {
          name: `${referrer.firstName} ${referrer.lastName}`,
          email: referrer.email
        }
      } : { valid: false };
    } catch (error) {
      console.error('❌ ReferralService: Error validating referral code:', error);
      return { valid: false };
    }
  }
}

module.exports = ReferralService;
