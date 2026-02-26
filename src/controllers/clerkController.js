const mongodbService = require('../services/mongodbService');
const { createResponse } = require('../utils/responseUtils');

class ClerkController {
  async handleUserWebhook(req, res, next) {
    try {
      const { type, data } = req.body;

      switch (type) {
        case 'user.created':
          await this.handleUserCreated(data);
          break;
        case 'user.updated':
          await this.handleUserUpdated(data);
          break;
        case 'user.deleted':
          await this.handleUserDeleted(data);
          break;
        default:
          console.log(`Unhandled user webhook type: ${type}`);
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Error handling user webhook:', error);
      next(error);
    }
  }

  async handleSessionWebhook(req, res, next) {
    try {
      const { type, data } = req.body;

      switch (type) {
        case 'session.created':
          await this.handleSessionCreated(data);
          break;
        case 'session.ended':
          await this.handleSessionEnded(data);
          break;
        default:
          console.log(`Unhandled session webhook type: ${type}`);
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Error handling session webhook:', error);
      next(error);
    }
  }

  async handleUserCreated(userData) {
    try {
      const { id: clerkUserId, email_addresses, first_name, last_name, profile_image_url } = userData;

      const primaryEmail = email_addresses.find(email => email.id === userData.primary_email_address_id);

      if (!primaryEmail) {
        throw new Error('No primary email found for user');
      }

      // Create user in our database
      const user = await mongodbService.createUser({
        clerk_userId: clerkUserId,
        email: primaryEmail.email_address,
        firstName: first_name || '',
        lastName: last_name || '',
        profileImageUrl: profile_image_url,
        is_email_verified: primaryEmail.verification?.status === 'verified',
        auth_provider: 'clerk'
      });

      // Get welcome bonus from settings
      const settings = await mongodbService.getMiningSettings();
      const welcomeBonus = settings.welcomeBonus !== undefined ? settings.welcomeBonus : 10;
      
      // Create wallet for the user with welcome bonus
      const walletAddress = `celf${Math.random().toString(36).substr(2, 40)}`;
      const wallet = await mongodbService.createWallet({
        userId: user.id,
        currentAddress: walletAddress,
        addresses: JSON.stringify([{
          address: walletAddress,
          label: 'Main Wallet',
          isDefault: true
        }]),
        sendableBalance: 0,
        nonSendableBalance: welcomeBonus, 
        pendingBalance: 0
      });

      // Create a transaction record for the welcome bonus
      if (welcomeBonus > 0) {
        const Transaction = require('../models/Transaction');
        const welcomeTransaction = new Transaction({
          toUserId: user.id,
          amount: welcomeBonus,
          type: 'bonus',
          status: 'completed',
          description: `Welcome bonus - ${welcomeBonus} CELF tokens`
        });
        await welcomeTransaction.save();
      }

      console.log(`User created: ${user.email} with wallet: ${wallet.currentAddress}`);
    } catch (error) {
      console.error('Error creating user from Clerk webhook:', error);
      throw error;
    }
  }

  async handleUserUpdated(userData) {
    try {
      const { id: clerkUserId, email_addresses, first_name, last_name, profile_image_url } = userData;
      
      const user = await User.findOne({ clerkUserId });
      if (!user) {
        console.log(`User not found for Clerk ID: ${clerkUserId}`);
        return;
      }

      const primaryEmail = email_addresses.find(email => email.id === userData.primary_email_address_id);
      
      if (primaryEmail) {
        user.email = primaryEmail.email_address;
        user.isEmailVerified = primaryEmail.verification?.status === 'verified';
      }

      user.firstName = first_name || user.firstName;
      user.lastName = last_name || user.lastName;
      user.profileImageUrl = profile_image_url || user.profileImageUrl;

      await user.save();

      console.log(`User updated: ${user.email}`);
    } catch (error) {
      console.error('Error updating user from Clerk webhook:', error);
      throw error;
    }
  }

  async handleUserDeleted(userData) {
    try {
      const { id: clerkUserId } = userData;
      
      const user = await User.findOne({ clerkUserId });
      if (!user) {
        console.log(`User not found for deletion: ${clerkUserId}`);
        return;
      }

      // Delete user's wallet
      await Wallet.deleteOne({ userId: user._id });

      // Delete user
      await User.deleteOne({ clerkUserId });

      console.log(`User deleted: ${clerkUserId}`);
    } catch (error) {
      console.error('Error deleting user from Clerk webhook:', error);
      throw error;
    }
  }

  async handleSessionCreated(sessionData) {
    try {
      const { userId: clerkUserId } = sessionData;
      
      const user = await User.findOne({ clerkUserId });
      if (user) {
        user.lastLogin = new Date();
        await user.save();
      }
    } catch (error) {
      console.error('Error handling session created:', error);
    }
  }

  async handleSessionEnded(sessionData) {
    try {
      // Handle session end if needed
      console.log('Session ended for user:', sessionData.userId);
    } catch (error) {
      console.error('Error handling session ended:', error);
    }
  }

  async syncUser(req, res, next) {
    try {
      const { clerkUserId, email, firstName, lastName } = req.body;

      let user = await User.findOne({ clerkUserId });
      
      if (!user) {
        // Create new user
        user = new User({
          clerkUserId,
          email,
          firstName: firstName || '',
          lastName: lastName || '',
          authProvider: 'clerk',
          isEmailVerified: true
        });

        await user.save();

        // Get welcome bonus from settings
        const settings = await mongodbService.getMiningSettings();
        const welcomeBonus = settings.welcomeBonus !== undefined ? settings.welcomeBonus : 10;

        // Create wallet with welcome bonus
        const wallet = new Wallet({
          userId: user._id,
          addresses: [{
            address: `celf${Math.random().toString(36).substr(2, 40)}`,
            label: 'Main Wallet',
            isDefault: true
          }],
          sendableBalance: 0,
          nonSendableBalance: welcomeBonus,
          pendingBalance: 0
        });

        wallet.currentAddress = wallet.addresses[0].address;
        wallet.totalBalance = wallet.sendableBalance + wallet.nonSendableBalance + wallet.pendingBalance;

        await wallet.save();

        // Create a transaction record for the welcome bonus
        if (welcomeBonus > 0) {
          const Transaction = require('../models/Transaction');
          const welcomeTransaction = new Transaction({
            toUserId: user._id,
            amount: welcomeBonus,
            type: 'bonus',
            status: 'completed',
            description: `Welcome bonus - ${welcomeBonus} CELF tokens`
          });
          await welcomeTransaction.save();
        }
      } else {
        // Update existing user
        user.email = email;
        user.firstName = firstName || user.firstName;
        user.lastName = lastName || user.lastName;
        await user.save();
      }

      res.json(createResponse(true, 'User synchronized successfully', { user }));
    } catch (error) {
      next(error);
    }
  }

  async getUserByClerkId(req, res, next) {
    try {
      const { clerkUserId } = req.params;

      const user = await User.findOne({ clerkUserId });
      if (!user) {
        return res.status(404).json(createResponse(false, 'User not found'));
      }

      res.json(createResponse(true, 'User retrieved successfully', { user }));
    } catch (error) {
      next(error);
    }
  }

  async updateUserFromClerk(req, res, next) {
    try {
      const { clerkUserId } = req.params;
      const { email, firstName, lastName, profileImageUrl } = req.body;

      const user = await User.findOne({ clerkUserId });
      if (!user) {
        return res.status(404).json(createResponse(false, 'User not found'));
      }

      if (email) user.email = email;
      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (profileImageUrl) user.profileImageUrl = profileImageUrl;

      await user.save();

      res.json(createResponse(true, 'User updated successfully', { user }));
    } catch (error) {
      next(error);
    }
  }

  // Helper method for webhook signature verification (to be implemented)
  verifyWebhookSignature(signature, timestamp, payload) {
    // TODO: Implement Clerk webhook signature verification
    // This should use Clerk's webhook secret to verify the signature
    return true; // For now, always return true in development
  }
}

module.exports = new ClerkController();
