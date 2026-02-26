const bcrypt = require('bcryptjs');
const mongodbService = require('../services/mongodbService');
const { createResponse } = require('../utils/responseUtils');

class UserController {
  async getProfile(req, res, next) {
    try {
      const user = await mongodbService.findUserById(req.user.userId);

      if (!user) {
        return res.status(404).json(createResponse(false, 'User not found'));
      }

      // Don't return password
      const { password, ...userProfile } = user;

      res.json(createResponse(true, 'Profile retrieved successfully', {
        user: {
          id: userProfile.id,
          email: userProfile.email,
          firstName: userProfile.firstName,
          lastName: userProfile.lastName,
          role: userProfile.role,
          isActive: userProfile.isActive,
          createdAt: userProfile.createdAt,
          preferences: userProfile.preferences
        }
      }));
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const { firstName, lastName, email } = req.body;
      const userId = req.user.userId;

      // Check if email is being changed and if it's already taken
      if (email) {
        const existingUser = await mongodbService.findUserByEmail(email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json(createResponse(false, 'Email is already taken'));
        }
      }

      const updateData = {};
      if (firstName) updateData.first_name = firstName;
      if (lastName) updateData.last_name = lastName;
      if (email) updateData.email = email;

      const updatedUser = await mongodbService.updateUser(userId, updateData);

      res.json(createResponse(true, 'Profile updated successfully', {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.first_name,
          lastName: updatedUser.last_name,
          role: updatedUser.role
        }
      }));
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.userId;

      const user = await mongodbService.findUserById(userId);
      if (!user) {
        return res.status(404).json(createResponse(false, 'User not found'));
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json(createResponse(false, 'Current password is incorrect'));
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);
      await mongodbService.updateUser(userId, { password: hashedNewPassword });

      res.json(createResponse(true, 'Password changed successfully'));
    } catch (error) {
      next(error);
    }
  }

  async deleteAccount(req, res, next) {
    try {
      const userId = req.user.userId;

      // Get deletion preview first
      const preview = await mongodbService.getUserDeletionPreview(userId);

      // Delete the user account
      const result = await mongodbService.deleteUser(userId);

      res.json(createResponse(true, 'Account deleted successfully', {
        deletedUser: result.deletedUser,
        relatedDataDeleted: result.relatedDataDeleted,
        preview: preview.relatedData
      }));
    } catch (error) {
      next(error);
    }
  }



  async validateAddress(req, res, next) {
    try {
      const { address } = req.params;

      const validation = await mongodbService.validateWalletAddress(address);

      if (validation.isValid) {
        res.json(createResponse(true, 'Address is valid', validation.user));
      } else {
        res.status(400).json(createResponse(false, validation.message));
      }
    } catch (error) {
      next(error);
    }
  }

  async getUserByAddress(req, res, next) {
    try {
      const { address } = req.params;

      const user = await mongodbService.findUserByWalletAddress(address);

      if (!user) {
        return res.status(404).json(createResponse(false, 'User not found'));
      }

      res.json(createResponse(true, 'User found', {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        walletAddress: address
      }));
    } catch (error) {
      next(error);
    }
  }

  // Search and validation routes
  async searchUsers(req, res, next) {
    try {
      const { q: query, limit = 10 } = req.query;

      console.log('🔍 UserController: Search request received:', {
        query,
        limit,
        headers: req.headers,
        method: req.method,
        url: req.url
      });

      if (!query || query.trim().length < 2) {
        console.log('❌ Query too short:', query);
        return res.json(createResponse(true, 'Search query too short', []));
      }

      console.log('🔍 Calling mongodbService.searchUsers with:', query.trim());
      const users = await mongodbService.searchUsers(query.trim(), parseInt(limit));

      console.log('✅ Raw users from database:', users);

      // Format users for search results
      const searchResults = users.map(user => {
        console.log('📝 Processing user:', user);
        console.log('📝 User wallet address from mongodbService:', user.walletAddress);
        return {
          id: user.id || user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          walletAddress: user.walletAddress || user.wallets?.[0]?.currentAddress || user.currentAddress || null
        };
      });

      console.log('✅ Formatted search results:', searchResults);
      console.log('📤 Sending response with:', { success: true, message: 'Users found', data: searchResults });

      res.json(createResponse(true, 'Users found', searchResults));
    } catch (error) {
      console.error('❌ Search users error:', error);
      res.status(500).json(createResponse(false, 'Search failed: ' + error.message));
    }
  }

  async validateAddress(req, res, next) {
    try {
      const { address } = req.params;

      if (!address || !address.startsWith('celf')) {
        return res.status(400).json(createResponse(false, 'Invalid address format'));
      }

      const user = await mongodbService.findUserByWalletAddress(address);

      if (!user) {
        return res.status(404).json(createResponse(false, 'Address not found'));
      }

      res.json(createResponse(true, 'Address validated', {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        walletAddress: address
      }));
    } catch (error) {
      console.error('Validate address error:', error);
      next(error);
    }
  }

  // Admin routes
  async getAllUsers(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      // Mock users list (authentication disabled)
      const mockUsers = [
        {
          id: '1',
          email: 'user1@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'user',
          isActive: true,
          createdAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: '2',
          email: 'user2@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          role: 'user',
          isActive: true,
          createdAt: new Date(Date.now() - 172800000).toISOString()
        }
      ];

      res.json(createResponse(true, 'Users retrieved successfully (mock data)', {
        users: mockUsers,
        pagination: {
          page,
          limit,
          total: 2,
          pages: 1
        }
      }));
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req, res, next) {
    try {
      const { id } = req.params;

      // Mock user by ID (authentication disabled)
      const mockUser = {
        id,
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user',
        isActive: true,
        createdAt: new Date(Date.now() - 86400000).toISOString()
      };

      res.json(createResponse(true, 'User retrieved successfully (mock data)', { user: mockUser }));
    } catch (error) {
      next(error);
    }
  }

  async updateUserRole(req, res, next) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      // Mock role update (authentication disabled)
      const mockUser = {
        id,
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role,
        updatedAt: new Date().toISOString()
      };

      res.json(createResponse(true, 'User role updated successfully (mock response)', { user: mockUser }));
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req, res, next) {
    try {
      const { id } = req.params;

      // Check if user exists and get preview
      const preview = await mongodbService.getUserDeletionPreview(id);

      // Prevent deletion of admin users by non-super-admin
      if (preview.user.role === 'admin' && req.user.role !== 'super-admin') {
        return res.status(403).json(createResponse(false, 'Cannot delete admin users'));
      }

      // Prevent self-deletion
      if (id === req.user.userId) {
        return res.status(400).json(createResponse(false, 'Cannot delete your own account'));
      }

      // Delete the user
      const result = await mongodbService.deleteUser(id);

      res.json(createResponse(true, 'User deleted successfully', {
        deletedUser: result.deletedUser,
        relatedDataDeleted: result.relatedDataDeleted
      }));
    } catch (error) {
      if (error.message === 'User not found') {
        return res.status(404).json(createResponse(false, 'User not found'));
      }
      next(error);
    }
  }

  /**
   * Delete multiple users
   */
  async deleteMultipleUsers(req, res, next) {
    try {
      const { userIds } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json(createResponse(false, 'User IDs array is required and cannot be empty'));
      }

      // Validate user IDs format (basic UUID check)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const invalidIds = userIds.filter(id => !uuidRegex.test(id));
      if (invalidIds.length > 0) {
        return res.status(400).json(createResponse(false, `Invalid user IDs: ${invalidIds.join(', ')}`));
      }

      // Prevent self-deletion
      if (userIds.includes(req.user.userId)) {
        return res.status(400).json(createResponse(false, 'Cannot delete your own account'));
      }

      // Check for admin users if requester is not super-admin
      if (req.user.role !== 'super-admin') {
        const usersToCheck = await Promise.all(
          userIds.map(async (id) => {
            try {
              const user = await mongodbService.findUserById(id);
              return user;
            } catch (error) {
              return null;
            }
          })
        );

        const adminUsers = usersToCheck.filter(user => user && user.role === 'admin');
        if (adminUsers.length > 0) {
          return res.status(403).json(createResponse(false, 'Cannot delete admin users'));
        }
      }

      // Delete multiple users
      const result = await mongodbService.deleteMultipleUsers(userIds);

      res.json(createResponse(true, 'Multiple users deletion completed', {
        summary: result.summary,
        successful: result.successful,
        failed: result.failed
      }));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete all users (DANGEROUS - Super Admin only)
   */
  async deleteAllUsers(req, res, next) {
    try {
      // Extra security check - only super-admin can do this
      if (req.user.role !== 'super-admin') {
        return res.status(403).json(createResponse(false, 'Only super-admin can delete all users'));
      }

      const { confirmationToken, excludeAdmins = true } = req.body;

      if (confirmationToken !== 'DELETE_ALL_USERS_CONFIRMED') {
        return res.status(400).json(createResponse(false, 'Confirmation token required. Send "DELETE_ALL_USERS_CONFIRMED" to proceed.'));
      }

      // Delete all users
      const result = await mongodbService.deleteAllUsers({
        excludeAdmins,
        confirmationToken
      });

      res.json(createResponse(true, result.message, {
        deletedCount: result.deletedCount,
        deletedUsers: result.deletedUsers,
        excludedAdmins: result.excludedAdmins
      }));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user deletion preview
   */
  async getUserDeletionPreview(req, res, next) {
    try {
      const { id } = req.params;

      const preview = await mongodbService.getUserDeletionPreview(id);

      res.json(createResponse(true, 'User deletion preview retrieved', preview));
    } catch (error) {
      if (error.message === 'User not found') {
        return res.status(404).json(createResponse(false, 'User not found'));
      }
      next(error);
    }
  }
}

module.exports = new UserController();
