const mongodbService = require('./mongodbService');
const MobileMiningSession = require('../models/MobileMiningSession');
const User = require('../models/User'); // Import User model
const Referral = require('../models/Referral'); // Import Referral model
const socketService = require('./socketService'); // Import SocketService
const { v4: uuidv4 } = require('uuid');

class MobileMiningService {
  constructor() {
    // Default fallback values (will be overridden by admin settings)
    this.DEFAULT_MINING_RATE_PER_SECOND = 0.000278; // CELF per second (1 CELF/hour)
    this.DEFAULT_MINING_INTERVAL_MS = 1000; // Mine every 1 second
    this.DEFAULT_MAX_SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
    this.VALIDATION_TOLERANCE = 0.1; // 10% tolerance for network delays

    // Auto-complete expired sessions every 5 minutes
    this.startAutoCompletionTimer();
  }

  /**
   * Start timer to auto-complete expired sessions
   */
  startAutoCompletionTimer() {
    setInterval(async () => {
      try {
        const completedSessions = await MobileMiningSession.autoCompleteExpiredSessions();
        if (completedSessions.length > 0) {
          console.log(`⏰ Auto-completed ${completedSessions.length} expired mining sessions`);

          // Add rewards to wallets for auto-completed sessions
          for (const sessionResult of completedSessions) {
            try {
              // We need to re-fetch the session to get the full object for overlap calculation
              const fullSession = await MobileMiningSession.findOne({ session_id: sessionResult.sessionId });
              await this.completeMiningSession(sessionResult.sessionId, { force: true }, fullSession);
            } catch (error) {
              console.error(`Failed to add rewards for auto-completed session ${sessionResult.sessionId}:`, error);
            }
          }
        }
      } catch (error) {
        console.error('Error in auto-completion timer:', error);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Get current admin mining settings
   */
  async getAdminMiningSettings() {
    try {
      // console.log('Fetching admin mining settings...');
      const settings = await mongodbService.getMiningSettings();
      // console.log('Admin settings retrieved:', settings);

      const adminSettings = {
        miningRatePerSecond: settings.miningRatePerSecond || this.DEFAULT_MINING_RATE_PER_SECOND,
        miningIntervalMs: settings.miningIntervalMs || this.DEFAULT_MINING_INTERVAL_MS,
        maxSessionTimeMs: (settings.maxSessionTime || 86400) * 1000, // Convert seconds to ms
        maintenanceMode: settings.maintenanceMode || false,
        referralBonus: settings.referralBonus || 0.1,
        autoClaim: settings.autoClaim !== undefined ? settings.autoClaim : true,
        notificationEnabled: settings.notificationEnabled !== undefined ? settings.notificationEnabled : true
      };

      return adminSettings;
    } catch (error) {
      console.error('Failed to get admin mining settings, using defaults:', error);

      const defaultSettings = {
        miningRatePerSecond: this.DEFAULT_MINING_RATE_PER_SECOND,
        miningIntervalMs: this.DEFAULT_MINING_INTERVAL_MS,
        maxSessionTimeMs: this.DEFAULT_MAX_SESSION_DURATION_MS,
        maintenanceMode: false
      };

      return defaultSettings;
    }
  }

  /**
   * Start a new mining session
   * @param {string} userId - User ID
   * @param {object} deviceInfo - Device information
   * @returns {Promise<object>} Session data
   */
  async startMiningSession(userId, deviceInfo = {}) {
    try {
      // Get current admin settings
      const adminSettings = await this.getAdminMiningSettings();

      // Check if mining is in maintenance mode
      if (adminSettings.maintenanceMode) {
        throw new Error('Mining is currently in maintenance mode. Please try again later.');
      }

      // Check if user already has an active session
      const existingSession = await MobileMiningSession.findOne({
        userId: userId,
        status: 'active'
      });

      if (existingSession) {
        // Check if existing session is expired using admin-configured max time
        const sessionAge = new Date() - new Date(existingSession.startedAt);
        if (sessionAge >= adminSettings.maxSessionTimeMs) {
          await this.completeMiningSession(existingSession.session_id, { force: true });
          console.log('✅ Expired session auto-completed before start');
        } else {
          throw new Error('User already has an active mining session');
        }
      }

      // Create new session with admin-configured settings
      const sessionId = uuidv4();
      const miningRatePerSecond = adminSettings.miningRatePerSecond;
      const miningIntervalMs = adminSettings.miningIntervalMs;

      const sessionData = {
        name: `Mining Session ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`,
        description: `Server-authoritative mining session`,
        userId: userId,
        session_id: sessionId,
        status: 'active',
        miningRatePerSecond: miningRatePerSecond,
        miningIntervalMs: miningIntervalMs,
        tokensEarned: 0,
        referralBoostEarnings: 0,
        max_duration_ms: adminSettings.maxSessionTimeMs,
        remaining_time_ms: adminSettings.maxSessionTimeMs,
        device_info: {
          deviceId: deviceInfo.deviceId || 'unknown',
          platform: deviceInfo.platform || 'unknown',
          appVersion: deviceInfo.appVersion || 'unknown',
          osVersion: deviceInfo.osVersion || 'unknown'
        },
        validation_data: {
          last_validated_at: new Date(),
          validation_count: 0,
          suspicious_activity: false,
          flagged_reasons: [],
          validation_tolerance: this.VALIDATION_TOLERANCE
        },
        startedAt: new Date(),
        server_time: new Date()
      };

      const session = await MobileMiningSession.create(sessionData);
      console.log('✅ Server-authoritative mining session created:', session.session_id);

      // --- Referral System Notification ---
      // Notify the referrer that their friend started mining (so their UI updates)
      const user = await User.findById(userId).select('referredBy');
      if (user && user.referredBy) {
        console.log(`📡 Notifying referrer ${user.referredBy} of active friend`);
        socketService.emitToUser(user.referredBy.toString(), 'referral-activity-update', {
          type: 'start',
          friendId: userId
        });
      }
      // ------------------------------------

      return {
        sessionId: session.session_id,
        startTime: session.startedAt,
        miningRatePerSecond: session.miningRatePerSecond,
        miningIntervalMs: session.miningIntervalMs,
        maxDurationMs: session.max_duration_ms,
        serverTime: session.server_time,
        estimatedMaxEarnings: session.calculateServerEarnings()
      };
    } catch (error) {
      console.error('Error starting mining session:', error);
      throw error;
    }
  }

  /**
   * Complete a mining session with server-authoritative calculation
   * @param {string} sessionId - Session ID
   * @param {object} clientData - Client-reported data for validation
   * @param {object} preFetchedSession - Optional pre-fetched session object
   * @returns {Promise<object>} Completion result
   */
  async completeMiningSession(sessionId, clientData = {}, preFetchedSession = null) {
    try {
      console.log(`🏁 Completing mining session: ${sessionId}`);

      const session = preFetchedSession || await MobileMiningSession.findOne({ session_id: sessionId });

      if (!session) {
        throw new Error('Mining session not found');
      }

      // Handle already completed sessions
      if (session.status !== 'active') {
        if (session.status === 'completed' || session.status === 'auto_completed') {
          console.log(`⚠️ Session ${sessionId} already completed`);
          return {
            sessionId: session.session_id,
            finalEarnings: session.tokensEarned,
            alreadyCompleted: true
          };
        }
      }

      // 1. Calculate Base Earnings
      const now = new Date();
      const sessionDurationMs = now - session.startedAt;
      const cappedDurationMs = Math.min(sessionDurationMs, session.max_duration_ms);

      const serverEarnings = await session.calculateServerEarnings();

      // 2. Calculate Referral Boost (Overlap Strategy)
      // Find all sessions of users referred BY this user that overlap with this session
      const referralBoostEarnings = await this.calculateReferralOverlapEarnings(
        session.userId,
        session.startedAt,
        now,
        session.miningRatePerSecond
      );

      console.log(`💰 Base Earnings: ${serverEarnings.toFixed(6)} | Boost: ${referralBoostEarnings.toFixed(6)}`);

      const totalEarnings = serverEarnings + referralBoostEarnings;

      // Update session
      session.status = clientData.force ? 'auto_completed' : 'completed';
      session.completedAt = now;
      session.tokensEarned = serverEarnings;
      session.referralBoostEarnings = referralBoostEarnings;

      session.completion_data = {
        completion_method: clientData.force ? 'auto_completed' : 'user_stopped',
        final_earnings: totalEarnings,
        session_duration_ms: sessionDurationMs,
        completed_intervals: Math.floor(cappedDurationMs / session.miningIntervalMs),
      };

      await session.save();

      // 3. Add Rewards to Wallet
      const walletResult = await this.addMiningRewardsToWallet(
        session.userId,
        totalEarnings,
        session.id
      );

      // 4. Notify Referrer (Friend Stopped)
      const user = await User.findById(session.userId).select('referredBy');
      if (user && user.referredBy) {
        socketService.emitToUser(user.referredBy.toString(), 'referral-activity-update', {
          type: 'stop',
          friendId: session.userId
        });
      }

      return {
        sessionId: session.session_id,
        finalEarnings: totalEarnings,
        baseEarnings: serverEarnings,
        boostEarnings: referralBoostEarnings,
        actualDurationMs: session.completion_data.session_duration_ms,
        completedAt: session.completedAt,
        transactionId: walletResult.transactionId,
        newWalletBalance: walletResult.newBalance
      };
    } catch (error) {
      console.error('Error completing mining session:', error);
      throw error;
    }
  }

  /**
   * Calculate earnings from overlapping referee sessions
   * @param {string} referrerId - The user mining
   * @param {Date} startTime - Session start
   * @param {Date} endTime - Session end
   * @param {number} baseRate - Base mining rate
   */
  async calculateReferralOverlapEarnings(referrerId, startTime, endTime, baseRate) {
    try {
      // Find all referees
      const referrals = await Referral.find({ referrerId }).select('refereeId');
      const refereeIds = referrals.map(r => r.refereeId);

      if (refereeIds.length === 0) return 0;

      // Find sessions of referees that overlap with [startTime, endTime]
      // Overlap Condition: (StartA <= EndB) and (EndA >= StartB)
      const overlappingSessions = await MobileMiningSession.find({
        userId: { $in: refereeIds },
        startedAt: { $lte: endTime },
        $or: [
          { completedAt: { $gte: startTime } }, // Completed after I started
          { completedAt: null }, // Still active (or crashed, but we count up to now)
          { status: 'active' } // Explicit active check
        ]
      });

      let totalOverlapSeconds = 0;

      for (const refSession of overlappingSessions) {
        // Determine overlap window
        const refStart = refSession.startedAt;
        const refEnd = refSession.completedAt || endTime; // If active, assume overlap until now

        const overlapStart = new Date(Math.max(startTime, refStart));
        const overlapEnd = new Date(Math.min(endTime, refEnd));

        const overlapDuration = overlapEnd - overlapStart;

        if (overlapDuration > 0) {
          totalOverlapSeconds += (overlapDuration / 1000);
        }
      }

      // Bonus: 5% of base rate per active friend-second
      // Note: This sums up all seconds. If 2 friends active for 10s, that's 20 friend-seconds.
      // Formula: TotalFriendSeconds * (BaseRatePerSecond * 0.05)

      const boostRatePerSecond = baseRate * 0.05;
      const totalBoost = totalOverlapSeconds * boostRatePerSecond;

      return totalBoost;

    } catch (error) {
      console.error('Error calculating referral overlap:', error);
      return 0; // Fail safe to 0 boost
    }
  }

  /**
   * Get current session status
   */
  async getCurrentSession(userId) {
    try {
      const session = await MobileMiningSession.findOne({
        userId: userId,
        status: 'active'
      });

      if (!session) {
        return null; // No active session
      }

      // Check if session is expired
      const sessionAge = new Date() - new Date(session.startedAt);
      if (sessionAge >= session.max_duration_ms) {
        const completedResult = await this.completeMiningSession(session.session_id, { force: true }, session);
        return null;
      }

      // Calculate server-side earnings (visual only)
      const currentServerEarnings = session.calculateServerEarnings();

      // Calculate active referees for live rate display
      const activeRefereesCount = await this.getActiveRefereesCount(userId);

      return {
        sessionId: session.session_id,
        startTime: session.startedAt,
        miningRatePerSecond: session.miningRatePerSecond,
        miningIntervalMs: session.miningIntervalMs,
        maxDurationMs: session.max_duration_ms,
        currentEarnings: currentServerEarnings,
        activeReferees: activeRefereesCount, // Send active count for UI boost
        isActive: true
      };
    } catch (error) {
      console.error('Error getting current session:', error);
      throw error;
    }
  }

  /**
   * Count currently active referees
   */
  async getActiveRefereesCount(referrerId) {
    try {
      const referrals = await Referral.find({ referrerId }).select('refereeId');
      if (referrals.length === 0) return 0;

      const refereeIds = referrals.map(r => r.refereeId);

      const activeCount = await MobileMiningSession.countDocuments({
        userId: { $in: refereeIds },
        status: 'active',
        // Ensure not expired
        startedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });

      return activeCount;
    } catch (error) {
      console.error('Error counting active referees:', error);
      return 0;
    }
  }

  /**
   * Cancel an active mining session (original code preserved)
   */
  async cancelMiningSession(sessionId) {
    // ... (Keep existing implementation logic if needed, or rely on completeMiningSession with cancel flag)
    // For brevity/consistency using similar logic to complete:
    try {
      const session = await MobileMiningSession.findOne({ session_id: sessionId });
      if (!session || session.status !== 'active') {
        throw new Error('Session not active');
      }

      session.status = 'cancelled';
      session.completedAt = new Date();
      session.tokensEarned = 0; // No earnings for cancelled
      await session.save();

      return { status: 'cancelled' };
    } catch (error) {
      console.log('Cancel error', error);
      throw error;
    }
  }


  /**
   * Add mining rewards to user wallet
   */
  async addMiningRewardsToWallet(userId, amount, sessionId) {
    try {
      // Get user wallet
      const wallet = await mongodbService.findWalletByUserId(userId);
      if (!wallet) {
        throw new Error('User wallet not found');
      }

      // Add to non-sendable balance (mining rewards are non-transferable)
      const newNonSendableBalance = wallet.nonSendableBalance + amount;
      const newTotalBalance = (wallet.sendableBalance || 0) + newNonSendableBalance;

      const updatedWallet = await mongodbService.update('Wallet', wallet.id, {
        nonSendableBalance: newNonSendableBalance,
        totalBalance: newTotalBalance,
        totalMined: (wallet.totalMined || 0) + amount,
        lastActivity: new Date().toISOString()
      });

      // Create transaction record
      const transactionData = {
        toUserId: userId,
        amount,
        type: 'mining',
        status: 'completed',
        description: 'Mobile mining reward',
        session_id: sessionId,
        miningRate: this.DEFAULT_MINING_RATE_PER_SECOND, // Store base rate reference
        processedAt: new Date().toISOString()
      };

      const transaction = await mongodbService.createTransaction(transactionData);

      return {
        transactionId: transaction.id,
        newBalance: {
          total: updatedWallet.totalBalance,
          nonSendable: updatedWallet.nonSendableBalance,
          sendable: updatedWallet.sendableBalance,
          pending: updatedWallet.pendingBalance
        }
      };
    } catch (error) {
      console.error('Error adding mining rewards to wallet:', error);
      throw error;
    }
  }

  // ... (Preserve other methods like getUserMiningStats, cleanupExpiredSessions if they were there)
  async getUserMiningStats(userId) {
    try {
      const result = await MobileMiningSession.aggregate([
        { 
          $match: { 
            userId: new mongoose.Types.ObjectId(userId),
            status: { $in: ['completed', 'expired', 'auto_completed'] }
          } 
        },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            totalEarnings: { 
              $sum: { $add: ['$tokensEarned', { $ifNull: ['$referralBoostEarnings', 0] }] } 
            },
            totalMiningTime: { 
              $sum: { $ifNull: ['$completion_data.session_duration_ms', 0] } 
            }
          }
        }
      ]);

      // Get last session separately
      const lastSession = await MobileMiningSession.findOne({ userId })
        .sort({ startedAt: -1 })
        .select('startedAt status tokensEarned');

      const stats = result[0] || {
        totalSessions: 0,
        totalEarnings: 0,
        totalMiningTime: 0
      };

      return {
        totalSessions: stats.totalSessions,
        completedSessions: stats.totalSessions, // Since we matched only completed/expired
        totalEarnings: stats.totalEarnings,
        totalMiningTime: stats.totalMiningTime,
        averageSessionDuration: stats.totalSessions > 0 ? stats.totalMiningTime / stats.totalSessions : 0,
        lastMiningSession: lastSession
      };
    } catch (err) { 
      console.error('Error getting user mining stats:', err);
      return {
        totalSessions: 0,
        completedSessions: 0,
        totalEarnings: 0,
        totalMiningTime: 0,
        averageSessionDuration: 0,
        lastMiningSession: null
      }; 
    }
  }

}

module.exports = new MobileMiningService();
