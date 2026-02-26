/**
 * Profile Service
 * Handles user profile operations
 */

const { User, Wallet } = require('../models');

class ProfileService {
  /**
   * Get user profile data
   */
  async getUserProfile(userId) {
    try {
      console.log('🔍 Looking for user with ID:', userId);
      const user = await User.findById(userId).select('-password -__v');

      if (!user) {
        console.log('❌ User not found in database for ID:', userId);
        throw new Error('User not found');
      }

      // Fetch user's wallet to get address
      const wallet = await Wallet.findOne({ userId });
      const walletAddress = wallet ? wallet.currentAddress : '';

      console.log('✅ User found:', user.email);

      // Transform user data to match mobile app format
      const profileData = {
        // Basic info
        profilePicture: user.profile?.profilePicture || null,
        username: user.profile?.username || user.email?.split('@')[0] || 'user',
        displayName: user.profile?.displayName || `${user.firstName || 'User'} ${user.lastName || ''}`.trim(),
        bio: user.profile?.bio || 'CELF mining enthusiast and crypto investor.',
        email: user.email,
        phone: user.profile?.phone || '',
        country: user.profile?.country || '',
        walletAddress: walletAddress,
        joinDate: user.createdAt ? user.createdAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        
        // Stats (computed fields)
        totalMined: user.profile?.totalMined || 0,
        referrals: user.profile?.referralsCount || 0,
        achievements: user.profile?.achievementsCount || 0,
        
        // Metadata
        isProfileComplete: user.profile?.isProfileComplete || false,
        profileCompletedAt: user.profile?.profileCompletedAt,
        
        // User account info
        userId: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      return profileData;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId, updateData) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      // Validate username uniqueness if being updated
      if (updateData.username && updateData.username !== user.profile?.username) {
        const existingUser = await User.findOne({ 
          'profile.username': updateData.username,
          _id: { $ne: userId }
        });
        
        if (existingUser) {
          throw new Error('Username already taken');
        }
      }

      // Prepare profile update data
      const profileUpdate = {};
      
      // Update allowed profile fields
      const allowedFields = [
        'username', 'displayName', 'bio', 'profilePicture', 
        'phone', 'country'
      ];
      
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          profileUpdate[`profile.${field}`] = updateData[field];
        }
      });

      // Update basic user fields if provided
      if (updateData.firstName !== undefined) {
        profileUpdate.firstName = updateData.firstName;
      }
      if (updateData.lastName !== undefined) {
        profileUpdate.lastName = updateData.lastName;
      }

      // Check if profile is now complete
      const isComplete = this.checkProfileCompletion({
        ...user.profile,
        ...updateData
      });

      if (isComplete && !user.profile?.isProfileComplete) {
        profileUpdate['profile.isProfileComplete'] = true;
        profileUpdate['profile.profileCompletedAt'] = new Date();
      }

      // Update user
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: profileUpdate },
        { new: true, runValidators: true }
      ).select('-password -__v');

      // Return updated profile data
      return this.getUserProfile(userId);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Update profile stats (for internal use)
   */
  async updateProfileStats(userId, stats) {
    try {
      const updateData = {};
      
      if (stats.totalMined !== undefined) {
        updateData['profile.totalMined'] = stats.totalMined;
      }
      if (stats.referralsCount !== undefined) {
        updateData['profile.referralsCount'] = stats.referralsCount;
      }
      if (stats.achievementsCount !== undefined) {
        updateData['profile.achievementsCount'] = stats.achievementsCount;
      }

      await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true }
      );

      return true;
    } catch (error) {
      console.error('Error updating profile stats:', error);
      throw error;
    }
  }

  /**
   * Upload profile picture
   */
  async uploadProfilePicture(userId, imageUrl) {
    try {
      await User.findByIdAndUpdate(
        userId,
        { $set: { 'profile.profilePicture': imageUrl } },
        { new: true }
      );

      return { profilePicture: imageUrl };
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      throw error;
    }
  }

  /**
   * Check if profile is complete
   */
  checkProfileCompletion(profile) {
    const requiredFields = ['username', 'displayName', 'bio'];
    return requiredFields.every(field => profile[field] && profile[field].trim().length > 0);
  }

  /**
   * Get profile completion status
   */
  async getProfileCompletion(userId) {
    try {
      const user = await User.findById(userId).select('profile');
      
      if (!user) {
        throw new Error('User not found');
      }

      const profile = user.profile || {};
      const requiredFields = [
        { field: 'username', label: 'Username', completed: !!profile.username },
        { field: 'displayName', label: 'Display Name', completed: !!profile.displayName },
        { field: 'bio', label: 'Bio', completed: !!profile.bio },
        { field: 'profilePicture', label: 'Profile Picture', completed: !!profile.profilePicture },
        { field: 'phone', label: 'Phone Number', completed: !!profile.phone },
        { field: 'country', label: 'Country', completed: !!profile.country }
      ];

      const completedCount = requiredFields.filter(item => item.completed).length;
      const totalCount = requiredFields.length;
      const completionPercentage = Math.round((completedCount / totalCount) * 100);

      return {
        isComplete: profile.isProfileComplete || false,
        completionPercentage,
        completedCount,
        totalCount,
        fields: requiredFields,
        completedAt: profile.profileCompletedAt
      };
    } catch (error) {
      console.error('Error getting profile completion:', error);
      throw error;
    }
  }

  /**
   * Search users by username or display name
   */
  async searchUsers(query, limit = 10) {
    try {
      const searchRegex = new RegExp(query, 'i');
      
      const users = await User.find({
        $or: [
          { 'profile.username': searchRegex },
          { 'profile.displayName': searchRegex },
          { firstName: searchRegex },
          { lastName: searchRegex }
        ],
        isActive: true
      })
      .select('profile.username profile.displayName profile.profilePicture firstName lastName')
      .limit(limit);

      return users.map(user => ({
        userId: user._id,
        username: user.profile?.username || user.email?.split('@')[0],
        displayName: user.profile?.displayName || `${user.firstName} ${user.lastName}`.trim(),
        profilePicture: user.profile?.profilePicture
      }));
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }
}

module.exports = new ProfileService();
