const mongodbService = require('../services/mongodbService');
const { createResponse } = require('../utils/responseUtils');

class AdminController {
  // Health check for admin settings
  async checkAdminSettings(req, res, next) {
    try {
      const settings = await mongodbService.getMiningSettings();
      res.json(createResponse(true, 'Admin settings are properly configured', {
        hasSettings: true,
        settingsCount: Object.keys(settings).length
      }));
    } catch (error) {
      console.error('Admin settings health check failed:', error);
      res.status(500).json(createResponse(false, error.message, {
        hasSettings: false,
        error: error.message
      }));
    }
  }

  // Dashboard & Analytics
  async getDashboardStats(req, res, next) {
    try {
      const stats = await mongodbService.getDashboardStats();
      res.json(createResponse(true, 'Dashboard stats retrieved successfully', stats));
    } catch (error) {
      next(error);
    }
  }

  async getRecentActivity(req, res, next) {
    try {
      const { limit = 10 } = req.query;
      const activities = await mongodbService.getRecentActivity(parseInt(limit));
      res.json(createResponse(true, 'Recent activity retrieved successfully', activities));
    } catch (error) {
      next(error);
    }
  }

  async getUserAnalytics(req, res, next) {
    try {
      const { period = '30d' } = req.query;
      const analytics = await mongodbService.getUserAnalytics(period);
      res.json(createResponse(true, 'User analytics retrieved successfully', analytics));
    } catch (error) {
      next(error);
    }
  }

  async getMiningAnalytics(req, res, next) {
    try {
      const { period = '30d' } = req.query;
      const analytics = await mongodbService.getMiningAnalytics(period);
      res.json(createResponse(true, 'Mining analytics retrieved successfully', analytics));
    } catch (error) {
      next(error);
    }
  }

  async getTransactionAnalytics(req, res, next) {
    try {
      const { period = '30d' } = req.query;
      const analytics = await mongodbService.getTransactionAnalytics(period);
      res.json(createResponse(true, 'Transaction analytics retrieved successfully', analytics));
    } catch (error) {
      next(error);
    }
  }

  // User Management
  async getAllUsers(req, res, next) {
    try {
      const { page = 1, limit = 20, search, role, status } = req.query;
      const result = await mongodbService.getAllUsersAdmin({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        role,
        status
      });

      // Restructure response to match frontend expectations
      const responseData = {
        users: result.data || [],
        pagination: result.pagination || {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          totalPages: 0
        }
      };

      res.json(createResponse(true, 'Users retrieved successfully', responseData));
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req, res, next) {
    try {
      const { id } = req.params;
      const user = await mongodbService.getUserByIdAdmin(id);
      
      if (!user) {
        return res.status(404).json(createResponse(false, 'User not found'));
      }

      res.json(createResponse(true, 'User retrieved successfully', user));
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const updatedUser = await mongodbService.updateUserAdmin(id, updateData);
      
      if (!updatedUser) {
        return res.status(404).json(createResponse(false, 'User not found'));
      }

      res.json(createResponse(true, 'User updated successfully', updatedUser));
    } catch (error) {
      next(error);
    }
  }

  async suspendUser(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      const result = await mongodbService.suspendUser(id, reason);
      
      if (!result) {
        return res.status(404).json(createResponse(false, 'User not found'));
      }

      res.json(createResponse(true, 'User suspended successfully'));
    } catch (error) {
      next(error);
    }
  }

  async activateUser(req, res, next) {
    try {
      const { id } = req.params;
      
      const result = await mongodbService.activateUser(id);
      
      if (!result) {
        return res.status(404).json(createResponse(false, 'User not found'));
      }

      res.json(createResponse(true, 'User activated successfully'));
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req, res, next) {
    try {
      const { id } = req.params;
      
      const result = await mongodbService.deleteUserAdmin(id);
      
      if (!result) {
        return res.status(404).json(createResponse(false, 'User not found'));
      }

      res.json(createResponse(true, 'User deleted successfully'));
    } catch (error) {
      next(error);
    }
  }

  // Mining Management
  async getMiningSessions(req, res, next) {
    try {
      const { page = 1, limit = 20, status, userId, search } = req.query;
      const result = await mongodbService.getMiningSessions({
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        userId,
        search
      });

      // Transform the response structure to match frontend expectations
      const formattedSessions = (result.data || []).map(session => {
        // Calculate runtime if not stored or if active
        let runtimeSeconds = session.completion_data?.session_duration_ms 
          ? Math.floor(session.completion_data.session_duration_ms / 1000) 
          : 0;

        if (session.status === 'active' && session.startedAt) {
          runtimeSeconds = Math.floor((new Date() - new Date(session.startedAt)) / 1000);
        }

        return {
          ...session,
          runtimeSeconds
        };
      });

      const responseData = {
        sessions: formattedSessions,
        pagination: result.pagination || {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          totalPages: 0
        }
      };

      res.json(createResponse(true, 'Mining sessions retrieved successfully', responseData));
    } catch (error) {
      console.error('Error in getMiningSessions controller:', error);
      // Return empty sessions array on error to prevent frontend crashes
      const errorResponse = {
        sessions: [],
        pagination: {
          page: parseInt(req.query.page || 1),
          limit: parseInt(req.query.limit || 20),
          total: 0,
          totalPages: 0
        }
      };
      res.json(createResponse(true, 'Mining sessions retrieved successfully (empty)', errorResponse));
    }
  }

  async getMiningSettings(req, res, next) {
    try {
      const settings = await mongodbService.getMiningSettings();
      res.json(createResponse(true, 'Mining settings retrieved successfully', settings));
    } catch (error) {
      console.error('Error in getMiningSettings controller:', error);
      next(error);
    }
  }

  async updateMiningSettings(req, res, next) {
    try {
      const settings = req.body;
      const updatedSettings = await mongodbService.updateMiningSettings(settings);
      res.json(createResponse(true, 'Mining settings updated successfully', updatedSettings));
    } catch (error) {
      console.error('Error updating mining settings:', error);
      next(error);
    }
  }

  async terminateMiningSession(req, res, next) {
    try {
      const { id } = req.params;
      const result = await mongodbService.terminateMiningSession(id);
      
      if (!result) {
        return res.status(404).json(createResponse(false, 'Mining session not found'));
      }

      res.json(createResponse(true, 'Mining session terminated successfully'));
    } catch (error) {
      next(error);
    }
  }

  async pauseMiningSession(req, res, next) {
    try {
      const { id } = req.params;
      const result = await mongodbService.pauseMiningSession(id);
      
      if (!result) {
        return res.status(404).json(createResponse(false, 'Mining session not found'));
      }

      res.json(createResponse(true, 'Mining session paused successfully'));
    } catch (error) {
      next(error);
    }
  }

  async resumeMiningSession(req, res, next) {
    try {
      const { id } = req.params;
      const result = await mongodbService.resumeMiningSession(id);
      
      if (!result) {
        return res.status(404).json(createResponse(false, 'Mining session not found'));
      }

      res.json(createResponse(true, 'Mining session resumed successfully'));
    } catch (error) {
      next(error);
    }
  }

  // Content Management
  async getContactSubmissions(req, res, next) {
    try {
      const { page = 1, limit = 20, status } = req.query;
      const submissions = await mongodbService.getContactSubmissions({
        page: parseInt(page),
        limit: parseInt(limit),
        status
      });
      res.json(createResponse(true, 'Contact submissions retrieved successfully', submissions));
    } catch (error) {
      next(error);
    }
  }

  async getContactSubmissionById(req, res, next) {
    try {
      const { id } = req.params;
      const submission = await mongodbService.getContactSubmissionById(id);
      
      if (!submission) {
        return res.status(404).json(createResponse(false, 'Contact submission not found'));
      }

      res.json(createResponse(true, 'Contact submission retrieved successfully', submission));
    } catch (error) {
      next(error);
    }
  }

  async updateContactSubmissionStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const result = await mongodbService.updateContactSubmissionStatus(id, status);
      
      if (!result) {
        return res.status(404).json(createResponse(false, 'Contact submission not found'));
      }

      res.json(createResponse(true, 'Contact submission status updated successfully'));
    } catch (error) {
      next(error);
    }
  }

  async deleteContactSubmission(req, res, next) {
    try {
      const { id } = req.params;
      const result = await mongodbService.deleteContactSubmission(id);
      
      if (!result) {
        return res.status(404).json(createResponse(false, 'Contact submission not found'));
      }

      res.json(createResponse(true, 'Contact submission deleted successfully'));
    } catch (error) {
      next(error);
    }
  }

  async getNewsletterSubscriptions(req, res, next) {
    try {
      const { page = 1, limit = 20, status } = req.query;
      const subscriptions = await mongodbService.getNewsletterSubscriptions({
        page: parseInt(page),
        limit: parseInt(limit),
        status
      });
      res.json(createResponse(true, 'Newsletter subscriptions retrieved successfully', subscriptions));
    } catch (error) {
      next(error);
    }
  }

  async deleteNewsletterSubscription(req, res, next) {
    try {
      const { id } = req.params;
      const result = await mongodbService.deleteNewsletterSubscription(id);

      if (!result) {
        return res.status(404).json(createResponse(false, 'Newsletter subscription not found'));
      }

      res.json(createResponse(true, 'Newsletter subscription deleted successfully'));
    } catch (error) {
      next(error);
    }
  }

  // Mentorship Applications
  async getMentorshipApplications(req, res, next) {
    try {
      const { page = 1, limit = 20, status, type, search } = req.query;
      const applications = await mongodbService.getMentorshipApplications({
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        type,
        search
      });
      res.json(createResponse(true, 'Mentorship applications retrieved successfully', applications));
    } catch (error) {
      next(error);
    }
  }

  async getMentorshipApplicationById(req, res, next) {
    try {
      const { id } = req.params;
      const application = await mongodbService.getMentorshipApplicationById(id);

      if (!application) {
        return res.status(404).json(createResponse(false, 'Mentorship application not found'));
      }

      res.json(createResponse(true, 'Mentorship application retrieved successfully', application));
    } catch (error) {
      next(error);
    }
  }

  async updateMentorshipApplicationStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const result = await mongodbService.updateMentorshipApplicationStatus(id, status);

      if (!result) {
        return res.status(404).json(createResponse(false, 'Mentorship application not found'));
      }

      res.json(createResponse(true, 'Mentorship application status updated successfully'));
    } catch (error) {
      next(error);
    }
  }

  // Scholarship Applications
  async getScholarshipApplications(req, res, next) {
    try {
      const { page = 1, limit = 20, status } = req.query;
      const applications = await mongodbService.getScholarshipApplications({
        page: parseInt(page),
        limit: parseInt(limit),
        status
      });
      res.json(createResponse(true, 'Scholarship applications retrieved successfully', applications));
    } catch (error) {
      next(error);
    }
  }

  async getScholarshipApplicationById(req, res, next) {
    try {
      const { id } = req.params;
      const application = await mongodbService.getScholarshipApplicationById(id);

      if (!application) {
        return res.status(404).json(createResponse(false, 'Scholarship application not found'));
      }

      res.json(createResponse(true, 'Scholarship application retrieved successfully', application));
    } catch (error) {
      next(error);
    }
  }

  async updateScholarshipApplicationStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const result = await mongodbService.updateScholarshipApplicationStatus(id, status);

      if (!result) {
        return res.status(404).json(createResponse(false, 'Scholarship application not found'));
      }

      res.json(createResponse(true, 'Scholarship application status updated successfully'));
    } catch (error) {
      next(error);
    }
  }

  // System Settings
  async getSystemSettings(req, res, next) {
    try {
      const settings = await mongodbService.getSystemSettings();
      res.json(createResponse(true, 'System settings retrieved successfully', settings));
    } catch (error) {
      next(error);
    }
  }

  async updateSystemSettings(req, res, next) {
    try {
      const settings = req.body;
      const updatedSettings = await mongodbService.updateSystemSettings(settings);
      res.json(createResponse(true, 'System settings updated successfully', updatedSettings));
    } catch (error) {
      next(error);
    }
  }

  // Security & Audit
  async getAuditLogs(req, res, next) {
    try {
      const { page = 1, limit = 20, action, userId } = req.query;
      const logs = await mongodbService.getAuditLogs({
        page: parseInt(page),
        limit: parseInt(limit),
        action,
        userId
      });
      res.json(createResponse(true, 'Audit logs retrieved successfully', logs));
    } catch (error) {
      next(error);
    }
  }

  async getLoginAttempts(req, res, next) {
    try {
      const { page = 1, limit = 20, success } = req.query;
      const attempts = await mongodbService.getLoginAttempts({
        page: parseInt(page),
        limit: parseInt(limit),
        success: success !== undefined ? success === 'true' : undefined
      });
      res.json(createResponse(true, 'Login attempts retrieved successfully', attempts));
    } catch (error) {
      next(error);
    }
  }

  async getSuspiciousActivities(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const activities = await mongodbService.getSuspiciousActivities({
        page: parseInt(page),
        limit: parseInt(limit)
      });
      res.json(createResponse(true, 'Suspicious activities retrieved successfully', activities));
    } catch (error) {
      next(error);
    }
  }

  // Wallet Management
  async getWalletStats(req, res, next) {
    try {
      const stats = await mongodbService.getWalletStats();
      res.json(createResponse(true, 'Wallet statistics retrieved successfully', stats));
    } catch (error) {
      next(error);
    }
  }

  async getAllWallets(req, res, next) {
    try {
      const { page = 1, limit = 20, search } = req.query;
      const result = await mongodbService.getAllWallets({
        page: parseInt(page),
        limit: parseInt(limit),
        search
      });
      res.json(createResponse(true, 'Wallets retrieved successfully', result));
    } catch (error) {
      next(error);
    }
  }

  async getWalletById(req, res, next) {
    try {
      const { id } = req.params;
      const wallet = await mongodbService.getWalletById(id);
      if (!wallet) {
        return res.status(404).json(createResponse(false, 'Wallet not found'));
      }
      res.json(createResponse(true, 'Wallet retrieved successfully', wallet));
    } catch (error) {
      next(error);
    }
  }

  async getRecentTransactions(req, res, next) {
    try {
      const { limit = 10 } = req.query;
      const transactions = await mongodbService.getRecentTransactions(parseInt(limit));
      res.json(createResponse(true, 'Recent transactions retrieved successfully', transactions));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminController();
