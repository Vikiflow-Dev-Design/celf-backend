const mongodbService = require('./mongodbService');

class MiningService {
  constructor() {
    this.activeSessions = new Map(); // Store active mining processes
  }

  /**
   * Start mining process for a session
   * @param {object} session - Mining session object
   */
  async startMiningProcess(session) {
    try {
      console.log(`🚀 Starting mining process for session: ${session.name}`);
      
      // Add session to active sessions
      this.activeSessions.set(session._id.toString(), {
        sessionId: session._id,
        startTime: new Date(),
        status: 'active',
        process: null // In a real implementation, this would be the actual mining process
      });

      // Log the start event
      await session.addLog('info', 'Mining process started', {
        algorithm: session.parameters.algorithm,
        difficulty: session.parameters.difficulty,
        threads: session.parameters.threads
      });

      // Simulate mining process (in real implementation, this would start actual mining)
      this.simulateMiningProcess(session);

      return { success: true, message: 'Mining process started successfully' };
    } catch (error) {
      console.error('Failed to start mining process:', error);
      await session.addError('START_ERROR', error.message, error.stack);
      throw error;
    }
  }

  /**
   * Pause mining process for a session
   * @param {object} session - Mining session object
   */
  async pauseMiningProcess(session) {
    try {
      console.log(`⏸️ Pausing mining process for session: ${session.name}`);
      
      const activeSession = this.activeSessions.get(session._id.toString());
      if (activeSession) {
        activeSession.status = 'paused';
        // In real implementation, pause the actual mining process
      }

      await session.addLog('info', 'Mining process paused');

      return { success: true, message: 'Mining process paused successfully' };
    } catch (error) {
      console.error('Failed to pause mining process:', error);
      await session.addError('PAUSE_ERROR', error.message, error.stack);
      throw error;
    }
  }

  /**
   * Stop mining process for a session
   * @param {object} session - Mining session object
   */
  async stopMiningProcess(session) {
    try {
      console.log(`⏹️ Stopping mining process for session: ${session.name}`);
      
      const activeSession = this.activeSessions.get(session._id.toString());
      if (activeSession) {
        // In real implementation, terminate the actual mining process
        this.activeSessions.delete(session._id.toString());
      }

      await session.addLog('info', 'Mining process stopped');

      return { success: true, message: 'Mining process stopped successfully' };
    } catch (error) {
      console.error('Failed to stop mining process:', error);
      await session.addError('STOP_ERROR', error.message, error.stack);
      throw error;
    }
  }

  /**
   * Get mining statistics for a session
   * @param {string} sessionId - Session ID
   */
  getMiningStats(sessionId) {
    const activeSession = this.activeSessions.get(sessionId);
    if (!activeSession) {
      return null;
    }

    const runtime = Date.now() - activeSession.startTime.getTime();
    
    return {
      sessionId,
      status: activeSession.status,
      runtime: Math.floor(runtime / 1000), // runtime in seconds
      isActive: activeSession.status === 'active'
    };
  }

  /**
   * Simulate mining process (for demonstration purposes)
   * In a real implementation, this would interface with actual mining software
   * @param {object} session - Mining session object
   */
  simulateMiningProcess(session) {
    const sessionId = session._id.toString();
    let progress = 0;
    let hashRate = Math.random() * 100 + 50; // Random hash rate between 50-150
    let sharesAccepted = 0;
    let sharesRejected = 0;

    const interval = setInterval(async () => {
      const activeSession = this.activeSessions.get(sessionId);
      
      if (!activeSession || activeSession.status !== 'active') {
        clearInterval(interval);
        return;
      }

      // Simulate mining progress
      progress += Math.random() * 2; // Increase progress by 0-2%
      if (progress > 100) progress = 100;

      // Simulate hash rate fluctuation
      hashRate += (Math.random() - 0.5) * 10;
      if (hashRate < 10) hashRate = 10;
      if (hashRate > 200) hashRate = 200;

      // Simulate shares
      if (Math.random() > 0.7) { // 30% chance of finding a share
        if (Math.random() > 0.1) { // 90% acceptance rate
          sharesAccepted++;
        } else {
          sharesRejected++;
        }
      }

      // Update session in database
      try {
        const updatedSession = await MiningSession.findById(sessionId);
        if (updatedSession) {
          updatedSession.progress = Math.floor(progress);
          updatedSession.results.hashRate = Math.floor(hashRate);
          updatedSession.results.sharesAccepted = sharesAccepted;
          updatedSession.results.sharesRejected = sharesRejected;
          updatedSession.results.totalHashes += Math.floor(hashRate * 5); // Approximate hashes in 5 seconds
          
          // Simulate metrics
          updatedSession.metrics.temperature = Math.floor(Math.random() * 20 + 60); // 60-80°C
          updatedSession.metrics.fanSpeed = Math.floor(Math.random() * 30 + 70); // 70-100%
          updatedSession.metrics.memoryUsage = Math.floor(Math.random() * 20 + 60); // 60-80%
          updatedSession.metrics.cpuUsage = Math.floor(Math.random() * 30 + 50); // 50-80%

          await updatedSession.save();

          // Log periodic updates
          if (Math.random() > 0.8) { // 20% chance of logging
            await updatedSession.addLog('info', `Mining update: ${Math.floor(progress)}% complete, ${Math.floor(hashRate)} H/s`, {
              progress: Math.floor(progress),
              hashRate: Math.floor(hashRate),
              sharesAccepted,
              sharesRejected
            });
          }
        }
      } catch (error) {
        console.error('Error updating mining session:', error);
      }

      // Complete mining if progress reaches 100%
      if (progress >= 100) {
        clearInterval(interval);
        this.completeMiningSession(sessionId);
      }
    }, 5000); // Update every 5 seconds
  }

  /**
   * Complete mining session
   * @param {string} sessionId - Session ID
   */
  async completeMiningSession(sessionId) {
    try {
      const session = await MiningSession.findById(sessionId);
      if (session) {
        session.status = 'completed';
        session.completedAt = new Date();
        session.progress = 100;
        
        // Calculate final earnings (simplified calculation)
        session.results.earnings = session.results.sharesAccepted * 0.001; // 0.001 per share

        await session.save();
        await session.addLog('info', 'Mining session completed successfully');
        
        console.log(`✅ Mining session completed: ${session.name}`);
      }

      // Remove from active sessions
      this.activeSessions.delete(sessionId);
    } catch (error) {
      console.error('Error completing mining session:', error);
    }
  }

  /**
   * Get all active mining sessions
   */
  getActiveSessions() {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Clean up inactive sessions
   */
  cleanupInactiveSessions() {
    const now = Date.now();
    const maxInactiveTime = 24 * 60 * 60 * 1000; // 24 hours

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now - session.startTime.getTime() > maxInactiveTime) {
        console.log(`🧹 Cleaning up inactive session: ${sessionId}`);
        this.activeSessions.delete(sessionId);
      }
    }
  }
}

// Create singleton instance
const miningService = new MiningService();

// Clean up inactive sessions every hour
setInterval(() => {
  miningService.cleanupInactiveSessions();
}, 60 * 60 * 1000);

module.exports = {
  startMiningProcess: (session) => miningService.startMiningProcess(session),
  pauseMiningProcess: (session) => miningService.pauseMiningProcess(session),
  stopMiningProcess: (session) => miningService.stopMiningProcess(session),
  getMiningStats: (sessionId) => miningService.getMiningStats(sessionId),
  getActiveSessions: () => miningService.getActiveSessions()
};
