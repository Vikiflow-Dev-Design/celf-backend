const database = require('../config/database');
const models = require('../models');

class MongoDBService {
  constructor() {
    this.models = models;
  }

  /**
   * Initialize the service
   */
  init() {
    // MongoDB connection is handled by the database config
    // Models are already imported
  }

  /**
   * Get MongoDB connection
   */
  getClient() {
    try {
      return database.getClient();
    } catch (error) {
      console.warn('MongoDB client not available:', error.message);
      return null;
    }
  }

  /**
   * Get admin client (same as regular client for MongoDB)
   */
  getAdminClient() {
    try {
      return database.getAdminClient();
    } catch (error) {
      console.warn('MongoDB admin client not available:', error.message);
      return null;
    }
  }

  /**
   * Check if database is connected
   */
  isConnected() {
    // Check both the database module state and mongoose connection state
    const mongoose = require('mongoose');
    const mongooseConnected = mongoose.connection.readyState === 1; // 1 = connected
    const databaseConnected = database.isConnected;

    return mongooseConnected || databaseConnected;
  }

  /**
   * Get default mining settings when database is not available
   */
  getDefaultMiningSettings() {
    return {
      miningRatePerSecond: 0.000278, // 1 CELF/hour = 0.000278 CELF/second
      miningIntervalMs: 1000, // Mine every 1 second
      maxSessionTime: 3600,
      maintenanceMode: false,
      referralBonus: 0.1,
      welcomeBonus: 50,
      autoClaim: true,
      notificationEnabled: true
    };
  }

  // ==========================================
  // GENERIC CRUD OPERATIONS
  // ==========================================

  /**
   * Generic create operation
   */
  async create(modelName, data) {
    try {
      const Model = this.models[modelName];
      if (!Model) {
        throw new Error(`Model ${modelName} not found`);
      }

      const document = new Model(data);
      const result = await document.save();
      return result.toJSON();
    } catch (error) {
      throw new Error(`Error creating ${modelName}: ${error.message}`);
    }
  }

  /**
   * Generic find by ID operation
   */
  async findById(modelName, id) {
    try {
      const Model = this.models[modelName];
      if (!Model) {
        throw new Error(`Model ${modelName} not found`);
      }

      const result = await Model.findById(id);
      return result ? result.toJSON() : null;
    } catch (error) {
      throw new Error(`Error finding ${modelName} by ID: ${error.message}`);
    }
  }

  /**
   * Generic find operation with filters and options
   */
  async find(modelName, filters = {}, options = {}) {
    try {
      const Model = this.models[modelName];
      if (!Model) {
        throw new Error(`Model ${modelName} not found`);
      }

      let query = Model.find(filters);

      // Apply sorting
      if (options.orderBy) {
        const sortOrder = options.orderBy.ascending ? 1 : -1;
        query = query.sort({ [options.orderBy.column]: sortOrder });
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.skip(options.offset);
      }

      // Apply population if specified
      if (options.populate) {
        if (Array.isArray(options.populate)) {
          options.populate.forEach(pop => {
            query = query.populate(pop);
          });
        } else {
          query = query.populate(options.populate);
        }
      }

      const results = await query.exec();
      return Array.isArray(results) ? results.map(doc => doc.toJSON()) : [];
    } catch (error) {
      console.error(`Error finding ${modelName}:`, error);
      return []; // Return empty array on error to prevent crashes
    }
  }

  /**
   * Generic find many with pagination
   */
  async findMany(modelName, filters = {}, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      const results = await this.find(modelName, filters, {
        ...options,
        limit,
        offset
      });

      // Get total count for pagination
      const Model = this.models[modelName];
      if (!Model) {
        throw new Error(`Model ${modelName} not found`);
      }

      const total = await Model.countDocuments(filters);

      return {
        data: Array.isArray(results) ? results : [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error(`Error in findMany for ${modelName}:`, error);
      return {
        data: [],
        pagination: {
          page: parseInt(options.page || 1),
          limit: parseInt(options.limit || 20),
          total: 0,
          totalPages: 0
        }
      };
    }
  }

  /**
   * Generic find one operation
   */
  async findOne(modelName, filters = {}) {
    try {
      const Model = this.models[modelName];
      if (!Model) {
        throw new Error(`Model ${modelName} not found`);
      }

      const result = await Model.findOne(filters);
      return result ? result.toJSON() : null;
    } catch (error) {
      throw new Error(`Error finding one ${modelName}: ${error.message}`);
    }
  }

  /**
   * Generic update operation
   */
  async update(modelName, id, data) {
    try {
      const Model = this.models[modelName];
      if (!Model) {
        throw new Error(`Model ${modelName} not found`);
      }

      const result = await Model.findByIdAndUpdate(
        id,
        { ...data, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      if (!result) {
        throw new Error(`${modelName} not found`);
      }

      return result.toJSON();
    } catch (error) {
      throw new Error(`Error updating ${modelName}: ${error.message}`);
    }
  }

  /**
   * Generic delete operation
   */
  async delete(modelName, id) {
    try {
      const Model = this.models[modelName];
      if (!Model) {
        throw new Error(`Model ${modelName} not found`);
      }

      const result = await Model.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      throw new Error(`Error deleting ${modelName}: ${error.message}`);
    }
  }

  /**
   * Generic count operation
   */
  async count(modelName, filters = {}) {
    try {
      const Model = this.models[modelName];
      if (!Model) {
        throw new Error(`Model ${modelName} not found`);
      }

      // Ensure DB connection is ready (serverless-safe)
      if (!this.isConnected()) {
        try {
          const database = require('../config/database');
          await database.connect();
        } catch (e) {
          // Swallow to proceed to waitForConnection
        }
        const connected = await this.waitForConnection(5000);
        if (!connected) {
          throw new Error('Database connection not ready');
        }
      }

      return await Model.countDocuments(filters);
    } catch (error) {
      throw new Error(`Error counting ${modelName}: ${error.message}`);
    }
  }

  // ==========================================
  // SESSION OPERATIONS
  // ==========================================

  /**
   * Find session by token (migrating to Better-Auth)
   */
  async findSessionByToken(token) {
    try {
      const mongoose = require('mongoose');

      // Wait for connection if needed
      if (mongoose.connection.readyState !== 1) {
        await this.waitForConnection();
      }

      // Access the native MongoDB collection 'session' created by Better-Auth
      // Note: Better-Auth creates 'session' collection, not 'sessions' (usually)
      // We check for both just in case, or default to 'session'
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('Database connection not established');
      }

      // Try 'session' collection first (default for Better-Auth)
      let session = await db.collection('session').findOne({ token });

      // If not found, try 'sessions' (common convention)
      if (!session) {
        session = await db.collection('sessions').findOne({ token });
      }

      if (session) {
        console.log('✅ MongoDB Service: Found session for token');
        return session;
      } else {
        console.log('❌ MongoDB Service: Session not found for token');
        return null;
      }
    } catch (error) {
      console.error('Error finding session by token:', error);
      return null; // Don't throw, just return null for auth failure
    }
  }

  // ==========================================
  // USER-SPECIFIC OPERATIONS
  // ==========================================

  /**
   * Find user by email for authentication (returns mongoose document with methods)
   */
  /**
   * Wait for MongoDB connection to be established
   */
  async waitForConnection(timeout = 10000) {
    const mongoose = require('mongoose');
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (mongoose.connection.readyState === 1) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return false;
  }

  async findUserByEmail(email) {
    try {
      // Wait for connection to be established
      const connected = await this.waitForConnection();
      if (!connected) {
        console.warn('⚠️ MongoDB connection timeout, cannot find user by email');
        throw new Error('Database connection not available. Please try again later.');
      }

      const Model = this.models.User;
      if (!Model) {
        throw new Error('User model not found');
      }

      console.log('🔍 MongoDB Service: Finding user by email for authentication:', email);

      // Return the mongoose document directly so we can use its methods
      const result = await Model.findOne({ email: email.toLowerCase() });

      if (result) {
        console.log('✅ User found - returning mongoose document with methods');
        return result; // Return mongoose document, not plain object
      } else {
        console.log('❌ User not found');
        return null;
      }
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw new Error(`Error finding user by email: ${error.message}`);
    }
  }

  /**
   * Find user by ID for Session Authentication (supports Better-Auth 'user' collection)
   */
  async findSessionUser(userId) {
    try {
      const mongoose = require('mongoose');

      if (mongoose.connection.readyState !== 1) {
        await this.waitForConnection();
      }

      const db = mongoose.connection.db;
      if (!db) return null;

      let user = null;
      let oid;

      try {
        oid = new mongoose.Types.ObjectId(userId);
      } catch (e) {
        console.error('Invalid ObjectID:', userId);
        return null;
      }

      // 1. Try 'user' collection (Better-Auth default)
      user = await db.collection('user').findOne({ _id: oid });

      if (user) {
        user.id = user._id.toString();
        // Ensure role/isActive exist
        if (!user.role) user.role = 'user';
        if (user.isActive === undefined) user.isActive = true;
        return user;
      }

      return null;
    } catch (error) {
      console.error('Error finding session user:', error);
      return null;
    }
  }

  /**
   * Search users by name or email
   */
  async searchUsers(query, limit = 10) {
    try {
      const User = this.models.User;
      if (!User) {
        throw new Error('User model not found');
      }

      console.log('🔍 MongoDB Service: Searching users with query:', query, 'limit:', limit);

      // First, let's check if we have any users at all
      const totalUsers = await User.countDocuments({ isActive: true });
      console.log('📊 Total active users in database:', totalUsers);

      if (totalUsers === 0) {
        console.log('⚠️ No users found in database, creating mock users for testing');
        // Return mock users for testing when database is empty
        const mockUsers = [
          {
            id: 'mock-1',
            _id: 'mock-1',
            email: 'victor@example.com',
            firstName: 'Victor',
            lastName: 'Ezekiel',
            currentAddress: 'celf1234567890abcdef1234567890abcdef12345678'
          },
          {
            id: 'mock-2',
            _id: 'mock-2',
            email: 'john.doe@example.com',
            firstName: 'John',
            lastName: 'Doe',
            currentAddress: 'celf9876543210fedcba9876543210fedcba87654321'
          },
          {
            id: 'mock-3',
            _id: 'mock-3',
            email: 'jane.smith@example.com',
            firstName: 'Jane',
            lastName: 'Smith',
            currentAddress: 'celfabcdef1234567890abcdef1234567890abcdef12'
          }
        ];

        // Filter mock users based on search query
        const filteredMockUsers = mockUsers.filter(user => {
          const searchLower = query.toLowerCase();
          return (
            user.firstName.toLowerCase().includes(searchLower) ||
            user.lastName.toLowerCase().includes(searchLower) ||
            user.email.toLowerCase().includes(searchLower) ||
            `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchLower)
          );
        });

        console.log('✅ Returning filtered mock users:', filteredMockUsers.length);
        return filteredMockUsers.slice(0, limit);
      }

      const searchRegex = new RegExp(query, 'i');

      const users = await User.find({
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { email: searchRegex },
          {
            $expr: {
              $regexMatch: {
                input: { $concat: ['$firstName', ' ', '$lastName'] },
                regex: query,
                options: 'i'
              }
            }
          }
        ],
        isActive: true
      })
        .populate('wallets', 'currentAddress')
        .select('id email firstName lastName')
        .limit(limit)
        .lean();

      console.log('✅ Found real users from database:', users.length);
      return users;
    } catch (error) {
      console.error('❌ Error searching users:', error);

      // Fallback to mock users if database search fails
      console.log('🔄 Falling back to mock users due to error');
      const mockUsers = [
        {
          id: 'mock-1',
          _id: 'mock-1',
          email: 'victor@example.com',
          firstName: 'Victor',
          lastName: 'Ezekiel',
          currentAddress: 'celf1234567890abcdef1234567890abcdef12345678'
        },
        {
          id: 'mock-2',
          _id: 'mock-2',
          email: 'john.doe@example.com',
          firstName: 'John',
          lastName: 'Doe',
          currentAddress: 'celf9876543210fedcba9876543210fedcba87654321'
        }
      ];

      const filteredMockUsers = mockUsers.filter(user => {
        const searchLower = query.toLowerCase();
        return (
          user.firstName.toLowerCase().includes(searchLower) ||
          user.lastName.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower)
        );
      });

      return filteredMockUsers.slice(0, limit);
    }
  }

  /**
   * Find user by wallet address
   */
  async findUserByWalletAddress(address) {
    try {
      const User = this.models.User;
      const Wallet = this.models.Wallet;

      if (!User || !Wallet) {
        throw new Error('User or Wallet model not found');
      }

      console.log('🔍 MongoDB Service: Finding user by wallet address:', address);

      // Find wallet with the address
      const wallet = await Wallet.findOne({ currentAddress: address });

      if (!wallet) {
        console.log('❌ Wallet not found for address');
        return null;
      }

      // Find user by wallet's userId
      const user = await User.findById(wallet.userId)
        .select('id email firstName lastName')
        .lean();

      if (user) {
        console.log('✅ User found for wallet address');
        return user;
      } else {
        console.log('❌ User not found for wallet');
        return null;
      }
    } catch (error) {
      console.error('❌ Error finding user by wallet address:', error);
      throw new Error(`Error finding user by wallet address: ${error.message}`);
    }
  }

  /**
   * Create user
   */
  async createUser(userData) {
    return this.create('User', userData);
  }

  /**
   * Find user by ID
   */
  async findUserById(userId) {
    return this.findById('User', userId);
  }

  /**
   * Update user
   */
  async updateUser(userId, updateData) {
    return this.update('User', userId, updateData);
  }

  /**
   * Find user by Clerk ID
   */
  async findUserByClerkId(clerkId) {
    return this.findOne('User', { clerkId });
  }

  /**
   * Find user by wallet address
   */
  async findUserByWalletAddress(address) {
    try {
      const wallet = await this.findOne('Wallet', { currentAddress: address });
      if (!wallet) {
        return null;
      }

      const user = await this.findById('User', wallet.userId);
      return user ? { ...user, wallet } : null;
    } catch (error) {
      throw new Error(`Error finding user by wallet address: ${error.message}`);
    }
  }

  /**
   * Search users by query (email, name, or wallet address)
   */
  async searchUsers(query, limit = 10) {
    try {
      const User = this.models.User;
      const Wallet = this.models.Wallet;

      if (!query || query.trim().length < 1) {
        return [];
      }

      const searchQuery = query.trim();
      const searchRegex = new RegExp(searchQuery.split(' ').join('|'), 'i');

      console.log(`🔍 MongoDB Service: Searching users with query: "${searchQuery}"`);

      // Check if query looks like a wallet address
      const isWalletAddressQuery = searchQuery.startsWith('celf') && searchQuery.length >= 8;

      let usersByWalletAddress = [];
      if (isWalletAddressQuery) {
        console.log(`🔍 MongoDB Service: Detected wallet address search: ${searchQuery}`);

        // Search by wallet address first
        const wallets = await Wallet.find({
          currentAddress: { $regex: searchQuery, $options: 'i' }
        }).limit(limit);

        if (wallets.length > 0) {
          const userIds = wallets.map(w => w.userId);
          usersByWalletAddress = await User.find({
            _id: { $in: userIds },
            isActive: true
          }).select('id email firstName lastName').lean();

          console.log(`✅ MongoDB Service: Found ${usersByWalletAddress.length} users by wallet address`);
        }
      }

      // Create comprehensive search conditions for name/email search
      const searchConditions = [
        // Email search (exact and partial)
        { email: { $regex: searchQuery, $options: 'i' } },

        // First name search (starts with and contains)
        { firstName: { $regex: `^${searchQuery}`, $options: 'i' } },
        { firstName: { $regex: searchQuery, $options: 'i' } },

        // Last name search (starts with and contains)
        { lastName: { $regex: `^${searchQuery}`, $options: 'i' } },
        { lastName: { $regex: searchQuery, $options: 'i' } },

        // Full name search (first + last)
        {
          $expr: {
            $regexMatch: {
              input: { $concat: ['$firstName', ' ', '$lastName'] },
              regex: searchQuery,
              options: 'i'
            }
          }
        },

        // Reverse full name search (last + first)
        {
          $expr: {
            $regexMatch: {
              input: { $concat: ['$lastName', ' ', '$firstName'] },
              regex: searchQuery,
              options: 'i'
            }
          }
        }
      ];

      // If query has multiple words, search each word
      if (searchQuery.includes(' ')) {
        const words = searchQuery.split(' ').filter(word => word.length > 0);
        words.forEach(word => {
          searchConditions.push(
            { firstName: { $regex: word, $options: 'i' } },
            { lastName: { $regex: word, $options: 'i' } }
          );
        });
      }

      // Search users with improved conditions (name/email search)
      const usersByNameEmail = await User.find({
        $or: searchConditions,
        isActive: true
      })
        .select('id email firstName lastName')
        .limit(limit * 2) // Get more results to sort and filter
        .lean();

      // Combine wallet address results with name/email results
      const allUsers = [...usersByWalletAddress, ...usersByNameEmail];

      // Remove duplicates and sort by relevance
      const uniqueUsers = allUsers.filter((user, index, self) =>
        index === self.findIndex(u => u.id === user.id)
      );

      console.log(`📊 MongoDB Service: Combined results - ${uniqueUsers.length} unique users found`);

      // Sort by relevance (wallet address matches first, then exact matches, then partial matches)
      const sortedUsers = uniqueUsers.sort((a, b) => {
        const aFullName = `${a.firstName} ${a.lastName}`.toLowerCase();
        const bFullName = `${b.firstName} ${b.lastName}`.toLowerCase();
        const queryLower = searchQuery.toLowerCase();

        // Wallet address matches get highest priority (if this was a wallet search)
        const aIsWalletMatch = usersByWalletAddress.some(u => u.id === a.id);
        const bIsWalletMatch = usersByWalletAddress.some(u => u.id === b.id);

        if (aIsWalletMatch && !bIsWalletMatch) return -1;
        if (bIsWalletMatch && !aIsWalletMatch) return 1;

        // Exact full name match gets next highest priority
        if (aFullName === queryLower) return -1;
        if (bFullName === queryLower) return 1;

        // First name exact match
        if (a.firstName.toLowerCase() === queryLower) return -1;
        if (b.firstName.toLowerCase() === queryLower) return 1;

        // Last name exact match
        if (a.lastName.toLowerCase() === queryLower) return -1;
        if (b.lastName.toLowerCase() === queryLower) return 1;

        // Email exact match
        if (a.email.toLowerCase() === queryLower) return -1;
        if (b.email.toLowerCase() === queryLower) return 1;

        // Starts with matches
        if (a.firstName.toLowerCase().startsWith(queryLower)) return -1;
        if (b.firstName.toLowerCase().startsWith(queryLower)) return 1;

        if (a.lastName.toLowerCase().startsWith(queryLower)) return -1;
        if (b.lastName.toLowerCase().startsWith(queryLower)) return 1;

        // Alphabetical order for remaining
        return aFullName.localeCompare(bFullName);
      });

      // Get wallet addresses for each user
      const finalUsers = sortedUsers.slice(0, limit);
      const userIds = finalUsers.map(user => user._id || user.id);

      console.log(`🔍 MongoDB Service: Looking up wallets for user IDs:`, userIds);

      const wallets = await Wallet.find({ userId: { $in: userIds } })
        .select('userId currentAddress')
        .lean();

      console.log(`💰 MongoDB Service: Found ${wallets.length} wallets:`, wallets.map(w => ({ userId: w.userId, address: w.currentAddress?.substring(0, 20) + '...' })));

      // Combine user data with wallet addresses
      const usersWithWallets = finalUsers.map(user => {
        const userId = user._id || user.id;
        const wallet = wallets.find(w => w.userId.toString() === userId.toString());

        console.log(`👤 MongoDB Service: User ${user.firstName} ${user.lastName} (${userId}) -> Wallet: ${wallet?.currentAddress?.substring(0, 20)}...`);

        return {
          ...user,
          walletAddress: wallet?.currentAddress || null
        };
      });

      return usersWithWallets;
    } catch (error) {
      throw new Error(`Error searching users: ${error.message}`);
    }
  }

  /**
   * Validate wallet address and get user info
   */
  async validateWalletAddress(address) {
    try {
      if (!address || !address.startsWith('celf')) {
        return { isValid: false, message: 'Invalid wallet address format' };
      }

      const user = await this.findUserByWalletAddress(address);

      if (!user) {
        return { isValid: false, message: 'Wallet address not found' };
      }

      return {
        isValid: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          walletAddress: address
        }
      };
    } catch (error) {
      return { isValid: false, message: 'Error validating address' };
    }
  }

  // ==========================================
  // WALLET OPERATIONS
  // ==========================================

  /**
   * Find wallet by user ID
   */
  async findWalletByUserId(userId) {
    return this.findOne('Wallet', { userId });
  }

  /**
   * Create wallet
   */
  async createWallet(walletData) {
    return this.create('Wallet', walletData);
  }

  /**
   * Update wallet
   */
  async updateWallet(walletId, updateData) {
    return this.update('Wallet', walletId, updateData);
  }

  // ==========================================
  // TRANSACTION OPERATIONS
  // ==========================================

  /**
   * Create transaction
   */
  async createTransaction(transactionData) {
    return this.create('Transaction', transactionData);
  }

  /**
   * Find transactions by user
   */
  async findTransactionsByUser(userId, options = {}) {
    const filters = {
      $or: [
        { fromUserId: userId },
        { toUserId: userId }
      ]
    };

    return this.find('Transaction', filters, {
      orderBy: { column: 'createdAt', ascending: false },
      limit: options.limit || 50,
      ...options
    });
  }

  // ==========================================
  // MINING SESSION OPERATIONS
  // ==========================================

  /**
   * Find mining sessions by user
   */
  async findMiningSessionsByUser(userId, options = {}) {
    return this.find('MiningSession', { userId }, {
      orderBy: { column: 'createdAt', ascending: false },
      ...options
    });
  }

  /**
   * Find active mining session
   */
  async findActiveMiningSession(userId) {
    return this.findOne('MiningSession', {
      userId,
      status: 'active'
    });
  }

  /**
   * Create mining session
   */
  async createMiningSession(sessionData) {
    return this.create('MiningSession', sessionData);
  }

  /**
   * Update mining session
   */
  async updateMiningSession(sessionId, updateData) {
    return this.update('MiningSession', sessionId, updateData);
  }

  // ==========================================
  // CONTACT AND SUPPORT OPERATIONS
  // ==========================================

  /**
   * Create contact submission
   */
  async createContactSubmission(submissionData) {
    return this.create('ContactSubmission', submissionData);
  }

  /**
   * Create support ticket
   */
  async createSupportTicket(ticketData) {
    return this.create('SupportTicket', ticketData);
  }

  // ==========================================
  // NEWSLETTER OPERATIONS
  // ==========================================

  /**
   * Find newsletter subscription
   */
  async findNewsletterSubscription(email) {
    return this.findOne('NewsletterSubscription', { email: email.toLowerCase() });
  }

  /**
   * Create newsletter subscription
   */
  async createNewsletterSubscription(subscriptionData) {
    return this.create('NewsletterSubscription', subscriptionData);
  }

  /**
   * Update newsletter subscription
   */
  async updateNewsletterSubscription(subscriptionId, updateData) {
    return this.update('NewsletterSubscription', subscriptionId, updateData);
  }

  // ==========================================
  // MENTORSHIP OPERATIONS
  // ==========================================

  /**
   * Create mentorship application
   */
  async createMentorshipApplication(applicationData) {
    return this.create('MentorshipApplication', applicationData);
  }

  /**
   * Find mentorship applications by email
   */
  async findMentorshipApplicationsByEmail(email) {
    return this.find('MentorshipApplication', { email: email.toLowerCase() });
  }

  // ==========================================
  // SCHOLARSHIP OPERATIONS
  // ==========================================

  /**
   * Create scholarship application
   */
  async createScholarshipApplication(applicationData) {
    return this.create('ScholarshipApplication', applicationData);
  }

  /**
   * Find scholarship applications by email
   */
  async findScholarshipApplicationsByEmail(email) {
    return this.find('ScholarshipApplication', { email: email.toLowerCase() });
  }

  // ==========================================
  // BATCH OPERATIONS
  // ==========================================

  /**
   * Batch insert
   */
  async batchInsert(modelName, dataArray) {
    try {
      const Model = this.models[modelName];
      if (!Model) {
        throw new Error(`Model ${modelName} not found`);
      }

      const results = await Model.insertMany(dataArray);
      return results.map(doc => doc.toJSON());
    } catch (error) {
      throw new Error(`Error batch inserting into ${modelName}: ${error.message}`);
    }
  }

  // ==========================================
  // AGGREGATION OPERATIONS
  // ==========================================

  /**
   * Aggregation operations
   */
  async aggregate(modelName, pipeline) {
    try {
      const Model = this.models[modelName];
      if (!Model) {
        throw new Error(`Model ${modelName} not found`);
      }

      // Ensure DB connection is ready (serverless-safe)
      if (!this.isConnected()) {
        try {
          const database = require('../config/database');
          await database.connect();
        } catch (e) {
          // Swallow to proceed to waitForConnection
        }
        const connected = await this.waitForConnection(5000);
        if (!connected) {
          throw new Error('Database connection not ready');
        }
      }

      return await Model.aggregate(pipeline);
    } catch (error) {
      throw new Error(`Error aggregating ${modelName}: ${error.message}`);
    }
  }

  // ==========================================
  // ADMIN-SPECIFIC METHODS
  // ==========================================

  /**
   * Get dashboard statistics
   */
  async getDashboardStats() {
    try {
      // Get user counts
      const totalUsers = await this.count('User');
      const activeUsers = await this.count('User', { isActive: true });

      // Get mining session counts
      const activeMining = await this.count('MobileMiningSession', { status: 'active' });

      // Get transaction counts for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTransactions = await this.count('Transaction', {
        createdAt: { $gte: today }
      });

      // Get total CELF mined using aggregation
      const miningAggregation = await this.aggregate('Transaction', [
        { $match: { type: 'mining', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const totalCelfMined = miningAggregation.length > 0 ? miningAggregation[0].total : 0;

      // Get pending applications
      const pendingMentorship = await this.count('MentorshipApplication', { status: 'pending' });
      const pendingScholarship = await this.count('ScholarshipApplication', { status: 'pending' });
      const pendingContact = await this.count('ContactSubmission', { status: 'new' });

      return {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers
        },
        mining: {
          activeSessions: activeMining,
          totalCelfMined: totalCelfMined
        },
        transactions: {
          today: todayTransactions
        },
        applications: {
          pendingMentorship: pendingMentorship,
          pendingScholarship: pendingScholarship,
          pendingContact: pendingContact
        }
      };
    } catch (error) {
      throw new Error(`Error getting dashboard stats: ${error.message}`);
    }
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(period = '30d') {
    try {
      const days = parseInt(period.replace('d', ''));
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get user registrations over time
      const userRegistrations = await this.aggregate('User', [
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      // Get user activity stats
      const activeUsers = await this.count('User', {
        isActive: true,
        lastLogin: { $gte: startDate }
      });

      const totalUsers = await this.count('User');

      return {
        totalUsers,
        activeUsers,
        registrationsByDate: userRegistrations.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        activityRate: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0
      };
    } catch (error) {
      throw new Error(`Error getting user analytics: ${error.message}`);
    }
  }

  /**
   * Get mining analytics
   */
  async getMiningAnalytics(period = '30d') {
    try {
      const days = parseInt(period.replace('d', ''));
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get mining sessions
      const sessions = await this.find('MiningSession', {
        createdAt: { $gte: startDate }
      });

      // Get mining transactions
      const miningTransactions = await this.find('Transaction', {
        type: 'mining',
        status: 'completed',
        createdAt: { $gte: startDate }
      });

      // Calculate metrics
      const totalSessions = sessions.length;
      const activeSessions = sessions.filter(s => s.status === 'active').length;
      const completedSessions = sessions.filter(s => s.status === 'completed').length;
      const totalTokensMined = miningTransactions.reduce((sum, tx) => sum + tx.amount, 0);

      // Group mining by date
      const miningByDate = {};
      miningTransactions.forEach(tx => {
        const date = tx.createdAt.toISOString().split('T')[0];
        miningByDate[date] = (miningByDate[date] || 0) + tx.amount;
      });

      return {
        totalSessions,
        activeSessions,
        completedSessions,
        totalTokensMined,
        miningByDate,
        averageTokensPerSession: totalSessions > 0 ? totalTokensMined / totalSessions : 0
      };
    } catch (error) {
      throw new Error(`Error getting mining analytics: ${error.message}`);
    }
  }

  // ==========================================
  // ADMIN SETTINGS METHODS
  // ==========================================

  /**
   * Get mining settings
   */
  async getMiningSettings() {
    try {
      if (!this.isConnected()) {
        console.warn('MongoDB not connected, returning default mining settings');
        return this.getDefaultMiningSettings();
      }

      const settings = await this.find('AdminSettings', {
        category: 'mining',
        isActive: true
      });

      // Convert to key-value object
      const settingsObj = {};
      settings.forEach(setting => {
        settingsObj[setting.settingKey] = setting.settingValue;
      });

      // Return with default values if not found
      return {
        miningRatePerSecond: settingsObj.mining_rate_per_second || 0.000278, // 1 CELF/hour default
        miningIntervalMs: settingsObj.mining_interval_ms || 1000, // 1 second default
        maxSessionTime: settingsObj.mining_max_session_time || 3600,
        maintenanceMode: settingsObj.mining_maintenance_mode || false,
        referralBonus: settingsObj.mining_referral_bonus || 0.1,
        welcomeBonus: settingsObj.mining_welcome_bonus !== undefined ? settingsObj.mining_welcome_bonus : 10,
        autoClaim: settingsObj.mining_auto_claim !== undefined ? settingsObj.mining_auto_claim : true,
        notificationEnabled: settingsObj.mining_notification_enabled || true,
        referralRewardReferrer: settingsObj.referral_reward_referrer || 10,
        referralRewardReferee: settingsObj.referral_reward_referee || 10
      };
    } catch (error) {
      console.error('Error in getMiningSettings:', error);
      // Return defaults on error
      return {
        miningRatePerSecond: 0.000278, // 1 CELF/hour default
        miningIntervalMs: 1000, // 1 second default
        maxSessionTime: 3600,
        maintenanceMode: false,
        referralBonus: 0.1,
        welcomeBonus: 10,
        autoClaim: true,
        notificationEnabled: true,
        referralRewardReferrer: 10,
        referralRewardReferee: 10
      };
    }
  }

  /**
   * Update mining settings
   */
  async updateMiningSettings(settings) {
    try {
      if (!this.isConnected()) {
        throw new Error('MongoDB not connected - cannot update settings');
      }

      const AdminSettings = this.models.AdminSettings;

      // Map settings to database keys
      const settingMappings = {
        miningRatePerSecond: 'mining_rate_per_second',
        miningIntervalMs: 'mining_interval_ms',
        maxSessionTime: 'mining_max_session_time',
        maintenanceMode: 'mining_maintenance_mode',
        referralBonus: 'mining_referral_bonus',
        welcomeBonus: 'mining_welcome_bonus',
        autoClaim: 'mining_auto_claim',
        notificationEnabled: 'mining_notification_enabled',
        referralRewardReferrer: 'referral_reward_referrer',
        referralRewardReferee: 'referral_reward_referee'
      };

      for (const [key, value] of Object.entries(settings)) {
        const settingKey = settingMappings[key];
        if (settingKey) {
          await AdminSettings.findOneAndUpdate(
            { settingKey },
            {
              settingValue: value,
              category: 'mining',
              isActive: true,
              updatedAt: new Date()
            },
            { upsert: true, new: true }
          );
        }
      }

      return await this.getMiningSettings();
    } catch (error) {
      throw new Error(`Error updating mining settings: ${error.message}`);
    }
  }

  /**
   * Get system settings
   */
  async getSystemSettings() {
    try {
      const settings = await this.find('AdminSettings', {
        category: 'system',
        isActive: true
      });

      const settingsObj = {};
      settings.forEach(setting => {
        settingsObj[setting.settingKey] = setting.settingValue;
      });

      return {
        siteName: settingsObj.system_site_name || 'CELF Platform',
        maintenanceMode: settingsObj.system_maintenance_mode || false,
        registrationEnabled: settingsObj.system_registration_enabled || true,
        miningEnabled: settingsObj.system_mining_enabled || true,
        maxUsersPerDay: settingsObj.system_max_users_per_day || 1000,
        emailNotifications: settingsObj.system_email_notifications || true
      };
    } catch (error) {
      throw new Error(`Error getting system settings: ${error.message}`);
    }
  }

  /**
   * Update system settings
   */
  async updateSystemSettings(settings) {
    try {
      const AdminSettings = this.models.AdminSettings;

      const settingMappings = {
        siteName: 'system_site_name',
        maintenanceMode: 'system_maintenance_mode',
        registrationEnabled: 'system_registration_enabled',
        miningEnabled: 'system_mining_enabled',
        maxUsersPerDay: 'system_max_users_per_day',
        emailNotifications: 'system_email_notifications'
      };

      for (const [key, value] of Object.entries(settings)) {
        const settingKey = settingMappings[key];
        if (settingKey) {
          await AdminSettings.findOneAndUpdate(
            { settingKey },
            {
              settingValue: value,
              updatedAt: new Date()
            },
            { upsert: true, new: true }
          );
        }
      }

      return {
        ...await this.getSystemSettings(),
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Error updating system settings: ${error.message}`);
    }
  }

  // ==========================================
  // ADMIN USER MANAGEMENT METHODS
  // ==========================================

  /**
   * Get all users with admin privileges
   */
  async getAllUsersAdmin({ page = 1, limit = 20, search, role, status }) {
    try {
      const filters = {};

      // Apply search filter
      if (search) {
        filters.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      // Apply role filter
      if (role) {
        filters.role = role;
      }

      // Apply status filter
      if (status !== undefined) {
        filters.isActive = status === 'active';
      }

      const offset = (page - 1) * limit;

      // Get users without wallet population for now (fix schema issue)
      const User = this.models.User;
      const users = await User.find(filters)
        .select('id email firstName lastName role isActive lastLogin createdAt updatedAt')
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit);

      const total = await User.countDocuments(filters);

      return {
        data: users.map(user => user.toJSON()),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Error getting users: ${error.message}`);
    }
  }

  /**
   * Get user by ID with admin details
   */
  async getUserByIdAdmin(userId) {
    try {
      const User = this.models.User;
      const user = await User.findById(userId)
        .lean();

      if (!user) {
        return null;
      }

      // Get additional stats
      const mobileMiningSessionsCount = await this.count('MobileMiningSession', { userId });
      const transactionsCount = await this.count('Transaction', {
        $or: [{ fromUserId: userId }, { toUserId: userId }]
      });

      // Get referral stats
      const referralsCount = await this.count('User', { referredBy: userId });

      // Get task completion stats
      const tasksCompletedCount = await this.count('UserTask', {
        userId,
        isCompleted: true
      });

      // Get wallet info separately to avoid schema issues
      const Wallet = this.models.Wallet;
      const wallets = await Wallet.find({ userId })
        .select('sendableBalance nonSendableBalance totalBalance currentAddress')
        .lean();

      // Calculate total balance from wallets
      const totalBalance = wallets.reduce((sum, wallet) => sum + (wallet.totalBalance || 0), 0);

      // Get mining total from MobileMiningSession
      const mobileMiningSessions = await this.models.MobileMiningSession.find({
        userId,
        status: 'completed'
      }).lean();

      const totalMined = mobileMiningSessions.reduce((sum, session) => sum + (session.tokensEarned || 0), 0);

      return {
        ...user,
        userId: user._id, // Explicitly include userId
        wallets: wallets || [],
        mining_sessions: [{ count: mobileMiningSessionsCount }],
        transactions: [{ count: transactionsCount }],
        referrals: [{ count: referralsCount }],
        tasks: [{ count: tasksCompletedCount }],
        balance: totalBalance,
        totalMined: totalMined,
        accountStats: {
          miningSessionsCount: mobileMiningSessionsCount,
          transactionsCount,
          referralsCount,
          tasksCompletedCount,
          totalBalance,
          totalMined
        }
      };
    } catch (error) {
      throw new Error(`Error fetching user: ${error.message}`);
    }
  }

  /**
   * Update user with admin privileges
   */
  async updateUserAdmin(userId, updateData) {
    try {
      const allowedFields = ['firstName', 'lastName', 'email', 'role', 'isActive'];
      const filteredData = {};

      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          filteredData[key] = updateData[key];
        }
      });

      filteredData.updatedAt = new Date();

      const User = this.models.User;
      const user = await User.findByIdAndUpdate(
        userId,
        filteredData,
        { new: true, runValidators: true }
      );

      if (!user) {
        return null;
      }

      return user.toJSON();
    } catch (error) {
      throw new Error(`Error updating user: ${error.message}`);
    }
  }

  /**
   * Suspend user
   */
  async suspendUser(userId, reason) {
    try {
      const User = this.models.User;
      const user = await User.findByIdAndUpdate(
        userId,
        {
          isActive: false,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!user) {
        return null;
      }

      // TODO: Add audit log entry
      return user.toJSON();
    } catch (error) {
      throw new Error(`Error suspending user: ${error.message}`);
    }
  }

  /**
   * Activate user
   */
  async activateUser(userId) {
    try {
      const User = this.models.User;
      const user = await User.findByIdAndUpdate(
        userId,
        {
          isActive: true,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!user) {
        return null;
      }

      return user.toJSON();
    } catch (error) {
      throw new Error(`Error activating user: ${error.message}`);
    }
  }

  /**
   * Delete user (admin only)
   */
  async deleteUserAdmin(userId) {
    try {
      const User = this.models.User;
      const user = await User.findByIdAndDelete(userId);

      if (!user) {
        return null;
      }

      // Also delete related data
      await this.models.Wallet.deleteMany({ userId });
      await this.models.Transaction.deleteMany({
        $or: [{ fromUserId: userId }, { toUserId: userId }]
      });
      await this.models.MiningSession.deleteMany({ userId });

      return user.toJSON();
    } catch (error) {
      throw new Error(`Error deleting user: ${error.message}`);
    }
  }

  // ==========================================
  // ADDITIONAL ADMIN METHODS
  // ==========================================

  /**
   * Get mining sessions (admin)
   */
  async getMiningSessions({ page = 1, limit = 20, status, userId, search }) {
    try {
      const filters = {};
      if (status) filters.status = status;
      if (userId) filters.userId = userId;

      if (search) {
        const User = this.models.User;
        // Escape special regex characters to prevent crashes
        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegex = new RegExp(escapedSearch, 'i');
        const users = await User.find({
          $or: [
            { firstName: searchRegex },
            { lastName: searchRegex },
            { email: searchRegex }
          ]
        }).select('_id');

        const userIds = users.map(u => u._id);
        
        if (userIds.length === 0) {
          return {
            data: [],
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: 0,
              totalPages: 0
            }
          };
        }
        
        filters.userId = { $in: userIds };
      }

      const result = await this.findMany('MobileMiningSession', filters, {
        page,
        limit,
        orderBy: { column: 'createdAt', ascending: false },
        populate: 'userId'
      });

      // Ensure we always return an array for data
      return {
        data: result.data || [],
        pagination: result.pagination || {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          totalPages: 0
        }
      };
    } catch (error) {
      console.error('Error getting mining sessions:', error);
      // Return empty array on error to prevent frontend crashes
      return {
        data: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          totalPages: 0
        }
      };
    }
  }

  /**
   * Get mining session by ID
   */
  async getMiningSessionById(id) {
    return this.findById('MiningSession', id);
  }

  /**
   * Get newsletter subscriptions
   */
  async getNewsletterSubscriptions({ page = 1, limit = 20, status }) {
    const filters = status ? { status } : {};
    return this.findMany('NewsletterSubscription', filters, { page, limit });
  }

  /**
   * Delete newsletter subscription
   */
  async deleteNewsletterSubscription(id) {
    return this.delete('NewsletterSubscription', id);
  }

  /**
   * Get mentorship applications
   */
  async getMentorshipApplications({ page = 1, limit = 20, type, status, search }) {
    const filters = {};
    if (type) filters.type = type;
    if (status) filters.status = status;
    
    if (search) {
      filters.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    return this.findMany('MentorshipApplication', filters, { page, limit });
  }

  /**
   * Get mentorship application by ID
   */
  async getMentorshipApplicationById(id) {
    return this.findById('MentorshipApplication', id);
  }

  /**
   * Update mentorship application status
   */
  async updateMentorshipApplicationStatus(id, status) {
    return this.update('MentorshipApplication', id, { status });
  }

  /**
   * Get contact submissions
   */
  async getContactSubmissions({ page = 1, limit = 20, status }) {
    const filters = status ? { status } : {};
    return this.findMany('ContactSubmission', filters, { page, limit });
  }

  /**
   * Get contact submission by ID
   */
  async getContactSubmissionById(id) {
    return this.findById('ContactSubmission', id);
  }

  /**
   * Update contact submission
   */
  async updateContactSubmission(id, updateData) {
    return this.update('ContactSubmission', id, updateData);
  }

  /**
   * Delete contact submission
   */
  async deleteContactSubmission(submissionId) {
    return this.delete('ContactSubmission', submissionId);
  }

  /**
   * Get transactions (admin)
   */
  async getTransactions({ page = 1, limit = 20, type, status, userId }) {
    try {
      const filters = {};
      if (type) filters.type = type;
      if (status) filters.status = status;
      if (userId) {
        filters.$or = [
          { fromUserId: userId },
          { toUserId: userId }
        ];
      }

      const result = await this.findMany('Transaction', filters, {
        page,
        limit,
        orderBy: { column: 'createdAt', ascending: false },
        populate: ['fromUserId', 'toUserId']
      });

      return {
        data: result.data || [],
        pagination: result.pagination || {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          totalPages: 0
        }
      };
    } catch (error) {
      console.error('Error getting transactions:', error);
      return {
        data: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          totalPages: 0
        }
      };
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(id) {
    return this.findById('Transaction', id);
  }

  /**
   * Get support tickets (admin)
   */
  async getSupportTickets({ page = 1, limit = 20, status, priority }) {
    const filters = {};
    if (status) filters.status = status;
    if (priority) filters.priority = priority;

    return this.findMany('SupportTicket', filters, {
      page,
      limit,
      orderBy: { column: 'createdAt', ascending: false }
    });
  }

  /**
   * Get support ticket by ID
   */
  async getSupportTicketById(id) {
    return this.findById('SupportTicket', id);
  }

  /**
   * Update support ticket
   */
  async updateSupportTicket(id, updateData) {
    return this.update('SupportTicket', id, updateData);
  }

  /**
   * Get recent activity (admin dashboard)
   */
  async getRecentActivity(limit = 10) {
    try {
      // Get recent transactions
      const recentTransactions = await this.find('Transaction', {}, {
        limit: Math.ceil(limit / 2),
        orderBy: { column: 'createdAt', ascending: false },
        populate: 'fromUserId toUserId'
      });

      // Get recent mining sessions
      const recentMining = await this.find('MiningSession', {}, {
        limit: Math.ceil(limit / 2),
        orderBy: { column: 'createdAt', ascending: false },
        populate: 'userId'
      });

      // Combine and sort by date
      const activities = [
        ...recentTransactions.map(tx => ({
          type: 'transaction',
          action: `${tx.type} transaction`,
          user: tx.fromUserId ? `${tx.fromUserId.firstName} ${tx.fromUserId.lastName}` : 'System',
          amount: tx.amount,
          timestamp: tx.createdAt,
          details: `${tx.type} - ${tx.amount} CELF`
        })),
        ...recentMining.map(session => ({
          type: 'mining',
          action: 'Mining session',
          user: session.userId ? `${session.userId.firstName} ${session.userId.lastName}` : 'Unknown',
          amount: session.tokensEarned || 0,
          timestamp: session.createdAt,
          details: `${session.status} - ${session.tokensEarned || 0} CELF earned`
        }))
      ];

      // Sort by timestamp and limit
      return activities
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);

    } catch (error) {
      console.error('Error getting recent activity:', error);
      return [];
    }
  }

  /**
   * Get audit logs (placeholder)
   */
  async getAuditLogs({ page = 1, limit = 20 }) {
    return {
      data: [],
      pagination: { page, limit, total: 0, totalPages: 0 }
    };
  }

  /**
   * Get transaction analytics
   */
  async getTransactionAnalytics(period = '30d') {
    try {
      const days = parseInt(period.replace('d', ''));
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const transactions = await this.find('Transaction', {
        createdAt: { $gte: startDate }
      });

      const totalTransactions = transactions.length;
      const totalVolume = transactions.reduce((sum, tx) => sum + tx.amount, 0);
      const completedTransactions = transactions.filter(tx => tx.status === 'completed').length;
      const pendingTransactions = transactions.filter(tx => tx.status === 'pending').length;

      // Group by date
      const transactionsByDate = {};
      transactions.forEach(tx => {
        const date = tx.createdAt.toISOString().split('T')[0];
        transactionsByDate[date] = (transactionsByDate[date] || 0) + 1;
      });

      return {
        totalTransactions,
        totalVolume,
        completedTransactions,
        pendingTransactions,
        transactionsByDate,
        averageTransactionValue: totalTransactions > 0 ? totalVolume / totalTransactions : 0
      };
    } catch (error) {
      throw new Error(`Error getting transaction analytics: ${error.message}`);
    }
  }

  /**
   * Mining session management methods
   */
  async terminateMiningSession(sessionId) {
    return this.update('MiningSession', sessionId, {
      status: 'terminated',
      completedAt: new Date()
    });
  }

  async pauseMiningSession(sessionId) {
    return this.update('MiningSession', sessionId, {
      status: 'paused',
      pausedAt: new Date()
    });
  }

  async resumeMiningSession(sessionId) {
    return this.update('MiningSession', sessionId, {
      status: 'active',
      pausedAt: null
    });
  }

  /**
   * Contact submission status update
   */
  async updateContactSubmissionStatus(id, status) {
    return this.update('ContactSubmission', id, { status });
  }

  /**
   * Scholarship application methods
   */
  async getScholarshipApplications({ page = 1, limit = 20, status }) {
    const filters = status ? { status } : {};
    return this.findMany('ScholarshipApplication', filters, { page, limit });
  }

  async getScholarshipApplicationById(id) {
    return this.findById('ScholarshipApplication', id);
  }

  async updateScholarshipApplicationStatus(id, status) {
    return this.update('ScholarshipApplication', id, { status });
  }

  /**
   * Security and audit methods (placeholders)
   */
  async getLoginAttempts({ page = 1, limit = 20, success }) {
    return {
      data: [],
      pagination: { page, limit, total: 0, totalPages: 0 }
    };
  }

  async getSuspiciousActivities({ page = 1, limit = 20 }) {
    return {
      data: [],
      pagination: { page, limit, total: 0, totalPages: 0 }
    };
  }

  // ==========================================
  // ADMIN WALLET OPERATIONS
  // ==========================================

  /**
   * Get wallet statistics for admin dashboard
   */
  async getWalletStats() {
    try {
      const Wallet = this.models.Wallet;
      const Transaction = this.models.Transaction;

      // Get total wallets count
      const totalWallets = await Wallet.countDocuments();

      // Get total balance across all wallets
      const totalBalanceResult = await Wallet.aggregate([
        {
          $group: {
            _id: null,
            totalBalance: { $sum: '$totalBalance' },
            totalSendable: { $sum: '$sendableBalance' },
            totalNonSendable: { $sum: '$nonSendableBalance' },
            totalPending: { $sum: '$pendingBalance' }
          }
        }
      ]);

      const balanceStats = totalBalanceResult[0] || {
        totalBalance: 0,
        totalSendable: 0,
        totalNonSendable: 0,
        totalPending: 0
      };

      // Get total sent amount
      const totalSentResult = await Transaction.aggregate([
        { $match: { type: 'send', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      // Get total received amount
      const totalReceivedResult = await Transaction.aggregate([
        { $match: { type: 'receive', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      return {
        totalWallets,
        totalBalance: balanceStats.totalBalance,
        totalSent: totalSentResult[0]?.total || 0,
        totalReceived: totalReceivedResult[0]?.total || 0,
        balanceBreakdown: {
          sendable: balanceStats.totalSendable,
          nonSendable: balanceStats.totalNonSendable,
          pending: balanceStats.totalPending
        }
      };
    } catch (error) {
      console.error('Error getting wallet stats:', error);
      throw error;
    }
  }

  /**
   * Get all wallets with pagination and search
   */
  async getAllWallets({ page = 1, limit = 20, search }) {
    try {
      const Wallet = this.models.Wallet;
      const User = this.models.User;

      let matchStage = {};

      // If search is provided, search by user email or name
      if (search) {
        const users = await User.find({
          $or: [
            { email: { $regex: search, $options: 'i' } },
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } }
          ]
        }).select('_id');

        const userIds = users.map(user => user._id);
        matchStage = { userId: { $in: userIds } };
      }

      const skip = (page - 1) * limit;

      const wallets = await Wallet.find(matchStage)
        .populate('userId', 'firstName lastName email createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Wallet.countDocuments(matchStage);

      return {
        data: wallets.map(wallet => ({
          id: wallet._id,
          userId: wallet.userId._id,
          user: {
            firstName: wallet.userId.firstName,
            lastName: wallet.userId.lastName,
            email: wallet.userId.email,
            createdAt: wallet.userId.createdAt
          },
          totalBalance: wallet.totalBalance,
          sendableBalance: wallet.sendableBalance,
          nonSendableBalance: wallet.nonSendableBalance,
          pendingBalance: wallet.pendingBalance,
          currentAddress: wallet.currentAddress,
          addressCount: wallet.addresses.length,
          lastActivity: wallet.lastActivity,
          createdAt: wallet.createdAt
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting all wallets:', error);
      throw error;
    }
  }

  /**
   * Get wallet by ID with user details
   */
  async getWalletById(walletId) {
    try {
      const Wallet = this.models.Wallet;

      const wallet = await Wallet.findById(walletId)
        .populate('userId', 'firstName lastName email createdAt isActive');

      if (!wallet) {
        return null;
      }

      return {
        id: wallet._id,
        userId: wallet.userId._id,
        user: {
          firstName: wallet.userId.firstName,
          lastName: wallet.userId.lastName,
          email: wallet.userId.email,
          createdAt: wallet.userId.createdAt,
          isActive: wallet.userId.isActive
        },
        totalBalance: wallet.totalBalance,
        sendableBalance: wallet.sendableBalance,
        nonSendableBalance: wallet.nonSendableBalance,
        pendingBalance: wallet.pendingBalance,
        addresses: wallet.addresses,
        currentAddress: wallet.currentAddress,
        preferences: wallet.preferences,
        totalSent: wallet.totalSent,
        totalReceived: wallet.totalReceived,
        lastActivity: wallet.lastActivity,
        createdAt: wallet.createdAt,
        updatedAt: wallet.updatedAt
      };
    } catch (error) {
      console.error('Error getting wallet by ID:', error);
      throw error;
    }
  }

  /**
   * Get recent transactions for admin dashboard
   */
  async getRecentTransactions(limit = 10) {
    try {
      const Transaction = this.models.Transaction;

      const transactions = await Transaction.find()
        .populate('fromUserId', 'firstName lastName email')
        .populate('toUserId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .limit(limit);

      return transactions.map(tx => ({
        id: tx._id,
        type: tx.type,
        amount: tx.amount,
        status: tx.status,
        description: tx.description,
        fromUser: tx.fromUserId ? {
          id: tx.fromUserId._id,
          firstName: tx.fromUserId.firstName,
          lastName: tx.fromUserId.lastName,
          email: tx.fromUserId.email
        } : null,
        toUser: tx.toUserId ? {
          id: tx.toUserId._id,
          firstName: tx.toUserId.firstName,
          lastName: tx.toUserId.lastName,
          email: tx.toUserId.email
        } : null,
        fee: tx.fee || 0,
        createdAt: tx.createdAt
      }));
    } catch (error) {
      console.error('Error getting recent transactions:', error);
      throw error;
    }
  }

  /**
   * Initialize default admin settings
   */
  async initializeDefaultSettings() {
    try {
      const AdminSettings = this.models.AdminSettings;
      await AdminSettings.initializeDefaults();
      return true;
    } catch (error) {
      console.error('Error initializing default settings:', error);
      return false;
    }
  }
}

// Create singleton instance
const mongodbService = new MongoDBService();

module.exports = mongodbService;
