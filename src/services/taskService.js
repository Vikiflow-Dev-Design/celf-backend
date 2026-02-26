const { Task, UserTask } = require('../models');

class TaskService {
  /**
   * Initialize user tasks when they first register
   */
  async initializeUserTasks(userId) {
    try {
      const tasks = await Task.findActiveTasks();
      const userTasks = [];

      for (const task of tasks) {
        // Check if user task already exists
        const existingUserTask = await UserTask.findOne({
          userId,
          taskKey: task.taskId
        });

        if (!existingUserTask) {
          userTasks.push({
            userId,
            taskId: task._id,
            taskKey: task.taskId,
            progress: 0,
            isCompleted: false
          });
        }
      }

      if (userTasks.length > 0) {
        await UserTask.insertMany(userTasks);
      }

      return userTasks.length;
    } catch (error) {
      console.error('Error initializing user tasks:', error);
      throw error;
    }
  }

  /**
   * Get all tasks for a user with their progress
   */
  async getUserTasks(userId, options = {}) {
    try {
      const userTasks = await UserTask.findUserTasks(userId, options);
      
      // Transform data to match mobile app format
      return userTasks
        .filter(ut => ut.taskId && ut.taskId.title) // Filter out records with null or incomplete taskId
        .map(ut => ({
          id: ut.taskKey,
          title: ut.taskId.title,
          description: ut.taskId.description,
          category: ut.taskId.category,
          progress: ut.progress,
          maxProgress: ut.taskId.maxProgress,
          reward: ut.taskId.reward,
          isCompleted: ut.isCompleted,
          icon: ut.taskId.icon,
          completedDate: ut.completedAt ? ut.completedAt.toISOString().split('T')[0] : undefined,
          tips: ut.taskId.tips,
          requirements: ut.taskId.requirements,
          rewardClaimed: ut.rewardClaimed
        }));
    } catch (error) {
      console.error('Error getting user tasks:', error);
      throw error;
    }
  }

  /**
   * Get user task statistics
   */
  async getUserTaskStats(userId) {
    try {
      // Get basic stats
      const stats = await UserTask.getUserStats(userId);
      const basicStats = stats[0] || {
        totalTasks: 0,
        completedTasks: 0,
        unclaimedRewards: 0
      };

      // Get unclaimed rewards with task details for unclaimed reward value
      const unclaimedRewards = await UserTask.getUnclaimedRewards(userId);
      const totalUnclaimedRewardValue = unclaimedRewards.reduce((total, userTask) => {
        return total + (userTask.taskId?.reward || 0);
      }, 0);

      // Get all completed tasks with rewards for total CELF earned
      const allCompletedTasks = await UserTask.getAllCompletedTasksWithRewards(userId);
      const totalCelfEarned = allCompletedTasks.reduce((total, userTask) => {
        return total + (userTask.taskId?.reward || 0);
      }, 0);

      // Calculate completion percentage
      const completionPercentage = basicStats.totalTasks > 0 
        ? Math.round((basicStats.completedTasks / basicStats.totalTasks) * 100)
        : 0;

      return {
        totalTasks: basicStats.totalTasks,
        completedTasks: basicStats.completedTasks,
        unclaimedRewards: basicStats.unclaimedRewards,
        totalUnclaimedRewardValue,
        totalCelfEarned,
        completionPercentage
      };
    } catch (error) {
      console.error('Error getting user task stats:', error);
      throw error;
    }
  }

  /**
   * Increment task progress
   */
  async incrementTaskProgress(userId, taskKey, amount = 1, source = 'automatic', details = {}) {
    try {
      const userTask = await UserTask.findUserTaskByKey(userId, taskKey);
      
      if (!userTask) {
        // Initialize task if it doesn't exist
        await this.initializeUserTasks(userId);
        return this.incrementTaskProgress(userId, taskKey, amount, source, details);
      }

      await userTask.incrementProgress(amount, source, details);
      
      // Check if task is now completed
      const wasCompleted = await userTask.checkCompletion();
      
      if (wasCompleted) {
        await this.handleTaskCompletion(userId, userTask);
      }

      return {
        taskKey,
        newProgress: userTask.progress,
        maxProgress: userTask.taskId.maxProgress,
        isCompleted: userTask.isCompleted,
        wasJustCompleted: wasCompleted
      };
    } catch (error) {
      console.error('Error incrementing task progress:', error);
      throw error;
    }
  }

  /**
   * Handle task completion
   */
  async handleTaskCompletion(userId, userTask) {
    try {
      console.log(`🎉 Task completed: ${userTask.taskKey} for user ${userId}`);
      
      // Here you could add additional logic like:
      // - Send notifications
      // - Award bonus rewards
      // - Trigger other tasks
      // - Log completion events
      
      return {
        taskKey: userTask.taskKey,
        reward: userTask.taskId.reward,
        completedAt: userTask.completedAt
      };
    } catch (error) {
      console.error('Error handling task completion:', error);
      throw error;
    }
  }

  /**
   * Claim task reward
   */
  async claimTaskReward(userId, taskKey) {
    try {
      const userTask = await UserTask.findUserTaskByKey(userId, taskKey);
      
      if (!userTask) {
        throw new Error('Task not found');
      }
      
      if (!userTask.isCompleted) {
        throw new Error('Task not completed');
      }
      
      if (userTask.rewardClaimed) {
        throw new Error('Reward already claimed');
      }
      
      await userTask.claimReward();
      
      // Here you could add logic to actually award the tokens to the user's wallet
      
      return {
        success: true,
        reward: userTask.taskId.reward,
        message: `Successfully claimed ${userTask.taskId.reward} CELF tokens!`
      };
    } catch (error) {
      console.error('Error claiming task reward:', error);
      throw error;
    }
  }

  /**
   * Get specific task details for a user
   */
  async getUserTaskDetails(userId, taskKey) {
    try {
      const userTask = await UserTask.findUserTaskByKey(userId, taskKey);
      
      if (!userTask) {
        throw new Error('Task not found');
      }
      
      return {
        id: userTask.taskKey,
        title: userTask.taskId.title,
        description: userTask.taskId.description,
        category: userTask.taskId.category,
        progress: userTask.progress,
        maxProgress: userTask.taskId.maxProgress,
        reward: userTask.taskId.reward,
        isCompleted: userTask.isCompleted,
        icon: userTask.taskId.icon,
        completedDate: userTask.completedAt ? userTask.completedAt.toISOString().split('T')[0] : undefined,
        tips: userTask.taskId.tips,
        requirements: userTask.taskId.requirements,
        rewardClaimed: userTask.rewardClaimed,
        progressHistory: userTask.progressHistory
      };
    } catch (error) {
      console.error('Error getting user task details:', error);
      throw error;
    }
  }

  /**
   * Update task progress manually (admin function)
   */
  async updateTaskProgress(userId, taskKey, newProgress, source = 'admin', details = {}) {
    try {
      const userTask = await UserTask.findUserTaskByKey(userId, taskKey);
      
      if (!userTask) {
        throw new Error('Task not found');
      }
      
      await userTask.updateProgress(newProgress, source, details);
      
      // Check if task is now completed
      const wasCompleted = await userTask.checkCompletion();
      
      if (wasCompleted) {
        await this.handleTaskCompletion(userId, userTask);
      }
      
      return {
        taskKey,
        oldProgress: userTask.progress,
        newProgress,
        isCompleted: userTask.isCompleted,
        wasJustCompleted: wasCompleted
      };
    } catch (error) {
      console.error('Error updating task progress:', error);
      throw error;
    }
  }
}

module.exports = new TaskService();
