const taskService = require('../services/taskService');
const { Task, UserTask } = require('../models');
const mongodbService = require('../services/mongodbService');

class TaskController {
  /**
   * Get all tasks (same for all users)
   * GET /api/tasks
   */
  async getUserTasks(req, res) {
    try {
      const { category } = req.query;
      const userId = req.user?.userId; // Get user ID if authenticated

      // Get all active tasks from database
      let tasks = await Task.findActiveTasks();

      // If user is authenticated, get their specific task progress
      if (userId) {
        // Get user-specific task data
        const userTasks = await taskService.getUserTasks(userId);
        const userTaskMap = new Map(userTasks.map(ut => [ut.id, ut]));

        // Transform tasks with user-specific data
        tasks = tasks.map(task => {
          const userTask = userTaskMap.get(task.taskId);
          return {
            id: task.taskId,
            title: task.title,
            description: task.description,
            category: task.category,
            progress: userTask ? userTask.progress : 0,
            maxProgress: task.maxProgress,
            reward: task.reward,
            isCompleted: userTask ? userTask.isCompleted : false,
            icon: task.icon,
            tips: task.tips,
            requirements: task.requirements,
            rewardClaimed: userTask ? userTask.rewardClaimed : false,
            isLinkTask: task.isLinkTask || false,
            linkUrl: task.linkUrl || null
          };
        });

        // Get real user statistics
        const stats = await taskService.getUserTaskStats(userId);

        // Filter by category if specified
        if (category && category !== 'all') {
          tasks = tasks.filter(task => task.category === category);
        }

        res.json({
          success: true,
          data: {
            tasks,
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
      } else {
        // For unauthenticated users, return tasks with default values
        tasks = tasks.map(task => ({
          id: task.taskId,
          title: task.title,
          description: task.description,
          category: task.category,
          progress: 0,
          maxProgress: task.maxProgress,
          reward: task.reward,
          isCompleted: false,
          icon: task.icon,
          tips: task.tips,
          requirements: task.requirements,
          rewardClaimed: false,
          isLinkTask: task.isLinkTask || false,
          linkUrl: task.linkUrl || null
        }));

        // Filter by category if specified
        if (category && category !== 'all') {
          tasks = tasks.filter(task => task.category === category);
        }

        // Default stats for unauthenticated users
        const stats = {
          totalTasks: tasks.length,
          completedTasks: 0,
          unclaimedRewards: 0,
          totalUnclaimedRewardValue: 0,
          completionPercentage: 0
        };

        res.json({
          success: true,
          data: {
            tasks,
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
      }
    } catch (error) {
      console.error('Error getting tasks:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get tasks',
        error: error.message
      });
    }
  }

  /**
   * Get specific task details with user-specific progress and claim status
   * GET /api/tasks/:taskId
   */
  async getTaskDetails(req, res) {
    try {
      const { taskId } = req.params;
      const userId = req.user?.userId; // Get user ID if authenticated

      // Find task by taskId
      const task = await Task.findOne({ taskId, isActive: true });

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }

      // Get user-specific task data if user is authenticated
      let userTask = null;
      if (userId) {
        userTask = await UserTask.findOne({ userId, taskKey: taskId });
      }

      // Transform task to match mobile app format with user-specific data
      const taskDetails = {
        id: task.taskId,
        title: task.title,
        description: task.description,
        category: task.category,
        progress: userTask ? userTask.progress : 0,
        maxProgress: task.maxProgress,
        reward: task.reward,
        isCompleted: userTask ? userTask.isCompleted : false,
        icon: task.icon,
        tips: task.tips,
        requirements: task.requirements,
        rewardClaimed: userTask ? userTask.rewardClaimed : false,
        isLinkTask: task.isLinkTask || false,
        linkUrl: task.linkUrl || null
      };

      res.json({
        success: true,
        data: taskDetails
      });
    } catch (error) {
      console.error('Error getting task details:', error);

      res.status(500).json({
        success: false,
        message: 'Failed to get task details',
        error: error.message
      });
    }
  }

  /**
   * Complete a task for the authenticated user
   * POST /api/tasks/:taskId/complete
   */
  async completeTask(req, res) {
    try {
      const { taskId } = req.params;
      const userId = req.user.userId;

      // Find the task
      const task = await Task.findOne({ taskId, isActive: true });
      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }

      // Find or create user task
      let userTask = await UserTask.findOne({ userId, taskKey: taskId });
      if (!userTask) {
        userTask = new UserTask({
          userId,
          taskKey: taskId,
          taskId: task._id,
          progress: 0,
          isCompleted: false,
          rewardClaimed: false
        });
      }

      // Mark task as completed if not already
      if (!userTask.isCompleted) {
        userTask.progress = task.maxProgress;
        userTask.isCompleted = true;
        userTask.completedAt = new Date();
        await userTask.save();
      }

      res.json({
        success: true,
        message: 'Task completed successfully',
        data: {
          taskId,
          isCompleted: userTask.isCompleted,
          completedAt: userTask.completedAt,
          progress: userTask.progress,
          maxProgress: task.maxProgress
        }
      });
    } catch (error) {
      console.error('Error completing task:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to complete task',
        error: error.message
      });
    }
  }

  /**
   * Claim task reward
   * POST /api/tasks/:taskId/claim
   */
  async claimReward(req, res) {
    try {
      const { taskId } = req.params;
      const userId = req.user.userId;

      // Find the task
      const task = await Task.findOne({ taskId, isActive: true });
      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }

      // Find user task
      const userTask = await UserTask.findOne({ userId, taskKey: taskId });
      if (!userTask) {
        return res.status(404).json({
          success: false,
          message: 'User task not found. Please complete the task first.'
        });
      }

      // Check if task is completed
      if (!userTask.isCompleted) {
        return res.status(400).json({
          success: false,
          message: 'Task must be completed before claiming reward'
        });
      }

      // Check if reward already claimed
      if (userTask.rewardClaimed) {
        return res.status(400).json({
          success: false,
          message: 'Reward has already been claimed for this task'
        });
      }

      // Get user's wallet
      const wallet = await mongodbService.findWalletByUserId(userId);
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'User wallet not found'
        });
      }

      // Add task reward to non-sendable balance
      const rewardAmount = parseFloat(task.reward);
      const newNonSendableBalance = wallet.nonSendableBalance + rewardAmount;
      const newTotalBalance = wallet.sendableBalance + newNonSendableBalance + wallet.pendingBalance;

      // Update wallet balance
      await mongodbService.updateWallet(wallet.id, {
        nonSendableBalance: newNonSendableBalance,
        totalBalance: newTotalBalance,
        lastActivity: new Date()
      });

      // Create transaction record for the reward
      await mongodbService.createTransaction({
        toUserId: userId,
        amount: rewardAmount,
        type: 'task_reward',
        status: 'completed',
        description: `Task reward: ${task.title}`,
        taskId: taskId
      });

      // Claim the reward
      userTask.rewardClaimed = true;
      userTask.rewardClaimedAt = new Date();
      await userTask.save();

      res.json({
        success: true,
        message: `Successfully claimed ${task.reward} CELF tokens!`,
        data: {
          taskId,
          reward: task.reward,
          rewardClaimed: true,
          rewardClaimedAt: userTask.rewardClaimedAt,
          newWalletBalance: {
            total: newTotalBalance,
            nonSendable: newNonSendableBalance,
            sendable: wallet.sendableBalance,
            pending: wallet.pendingBalance
          }
        }
      });
    } catch (error) {
      console.error('Error claiming reward:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to claim reward',
        error: error.message
      });
    }
  }

  /**
   * Get user task statistics
   * GET /api/tasks/stats
   */
  async getUserStats(req, res) {
    try {
      const userId = req.user.userId;
      const stats = await taskService.getUserTaskStats(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting user task stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get task statistics',
        error: error.message
      });
    }
  }

  /**
   * Initialize tasks for a user (usually called during registration)
   * POST /api/tasks/initialize
   */
  async initializeUserTasks(req, res) {
    try {
      const userId = req.user.userId;
      const count = await taskService.initializeUserTasks(userId);

      res.json({
        success: true,
        message: `Initialized ${count} tasks`,
        data: { initializedCount: count }
      });
    } catch (error) {
      console.error('Error initializing user tasks:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initialize tasks',
        error: error.message
      });
    }
  }

  // Admin endpoints

  /**
   * Get all tasks (admin only)
   * GET /api/admin/tasks
   */
  async getAllTasks(req, res) {
    try {
      const { page = 1, limit = 20, search, category, status } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const query = {};

      // Search filter (title or taskId)
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { taskId: { $regex: search, $options: 'i' } }
        ];
      }

      // Category filter
      if (category && category !== 'all') {
        query.category = category;
      }

      // Status filter
      if (status && status !== 'all') {
        query.isActive = status === 'active';
      }

      // Execute query with pagination
      const tasks = await Task.find(query)
        .sort({ sortOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      // Get total count
      const total = await Task.countDocuments(query);

      res.json({
        success: true,
        data: {
          tasks: tasks || [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      console.error('Error getting all tasks:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get tasks',
        error: error.message
      });
    }
  }

  /**
   * Get task by ID (admin only)
   * GET /api/admin/tasks/:id
   */
  async getTaskById(req, res) {
    try {
      const { id } = req.params;
      const task = await Task.findById(id);

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }

      res.json({
        success: true,
        data: task
      });
    } catch (error) {
      console.error('Error getting task by ID:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get task',
        error: error.message
      });
    }
  }

  /**
   * Create new task (admin only)
   * POST /api/admin/tasks
   */
  async createTask(req, res) {
    try {
      const task = new Task(req.body);
      await task.save();

      res.status(201).json({
        success: true,
        data: task,
        message: 'Task created successfully'
      });
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create task',
        error: error.message
      });
    }
  }

  /**
   * Update task (admin only)
   * PUT /api/admin/tasks/:id
   */
  async updateTask(req, res) {
    try {
      const { id } = req.params;
      const task = await Task.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }

      res.json({
        success: true,
        data: task,
        message: 'Task updated successfully'
      });
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update task',
        error: error.message
      });
    }
  }

  /**
   * Delete task (admin only)
   * DELETE /api/admin/tasks/:id
   */
  async deleteTask(req, res) {
    try {
      const { id } = req.params;
      const task = await Task.findByIdAndUpdate(id, { isActive: false }, { new: true });

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }

      res.json({
        success: true,
        message: 'Task deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete task',
        error: error.message
      });
    }
  }

  /**
   * Update user task progress (admin only)
   * PUT /api/admin/users/:userId/tasks/:taskId/progress
   */
  async updateUserProgress(req, res) {
    try {
      const { userId, taskId } = req.params;
      const { progress } = req.body;

      const result = await taskService.updateTaskProgress(
        userId,
        taskId,
        progress,
        'admin',
        { updatedBy: req.user.userId }
      );

      res.json({
        success: true,
        data: result,
        message: 'Task progress updated successfully'
      });
    } catch (error) {
      console.error('Error updating user task progress:', error);

      let statusCode = 500;
      if (error.message.includes('not found')) statusCode = 404;

      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new TaskController();
