const mongoose = require('mongoose');
const config = require('./config');

class Database {
  constructor() {
    this.connection = null;
    this.isConnected = false;
  }

  /**
   * Initialize MongoDB connection with retry logic
   */
  async connect(retryCount = 0, maxRetries = 3) {
    try {
      const { uri, options } = config.mongodb;

      if (!uri) {
        throw new Error('Missing MongoDB configuration. Please check your MONGODB_URI environment variable.');
      }

      // Connect to MongoDB
      this.connection = await mongoose.connect(uri, {
        ...options,
        // Connection options for better performance and reliability
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false
        // Note: bufferMaxEntries is deprecated and not supported in newer MongoDB versions
      });

      this.isConnected = true;
      console.log(`🗄️  Connected to MongoDB: ${uri.replace(/\/\/.*@/, '//***:***@')}`);

      // Test the connection
      await this.testConnection();

      return this.connection;
    } catch (error) {
      console.error(`❌ MongoDB connection error (attempt ${retryCount + 1}/${maxRetries + 1}):`, error.message);
      this.isConnected = false;

      if (retryCount < maxRetries) {
        console.log(`🔄 Retrying MongoDB connection in 3 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        return this.connect(retryCount + 1, maxRetries);
      } else {
        console.warn('⚠️  MongoDB connection failed after all retries. Server will start without database connection.');
        console.warn('⚠️  Please check your MongoDB Atlas IP whitelist and network connection.');
        return null; // Allow server to start without DB connection
      }
    }
  }

  /**
   * Test MongoDB connection
   */
  async testConnection() {
    try {
      // Test connection by pinging the database
      await mongoose.connection.db.admin().ping();
      console.log('✅ MongoDB connection test successful');
    } catch (error) {
      console.error('⚠️  MongoDB connection test failed:', error.message);
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB (cleanup)
   */
  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.disconnect();
        this.connection = null;
        this.isConnected = false;
        console.log('🗄️  Disconnected from MongoDB');
      }
    } catch (error) {
      console.error('❌ MongoDB disconnection error:', error);
      throw error;
    }
  }

  /**
   * Get MongoDB connection (for general operations)
   */
  getClient() {
    if (!this.connection || !this.isConnected) {
      throw new Error('MongoDB client not initialized. Call connect() first.');
    }
    return this.connection;
  }

  /**
   * Get MongoDB connection (admin operations use same connection)
   */
  getAdminClient() {
    return this.getClient();
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      state: this.isConnected ? 'connected' : 'disconnected',
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    };
  }

  /**
   * Setup process event handlers for graceful shutdown
   */
  setupEventHandlers() {
    // MongoDB connection events
    mongoose.connection.on('connected', () => {
      console.log('🗄️  MongoDB connected');
      this.isConnected = true;
    });

    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
      this.isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🗄️  MongoDB disconnected');
      this.isConnected = false;
    });

    // Application termination
    process.on('SIGINT', async () => {
      console.log('🔄 Gracefully shutting down...');
      await this.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('🔄 Gracefully shutting down...');
      await this.disconnect();
      process.exit(0);
    });
  }

  /**
   * Health check for MongoDB connection
   */
  async healthCheck() {
    try {
      const status = this.getConnectionStatus();

      if (status.state !== 'connected') {
        throw new Error(`MongoDB not connected. Current state: ${status.state}`);
      }

      // Perform a simple ping to test connection
      await mongoose.connection.db.admin().ping();

      return {
        status: 'healthy',
        connection: status,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        connection: this.getConnectionStatus(),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get database statistics
   */
  async getStats() {
    try {
      if (!this.isConnected) {
        throw new Error('MongoDB not connected');
      }

      const db = mongoose.connection.db;
      const admin = db.admin();

      // Get database stats
      const dbStats = await db.stats();

      // Get collection stats
      const collections = await db.listCollections().toArray();
      const collectionStats = [];

      for (const collection of collections) {
        try {
          const stats = await db.collection(collection.name).stats();
          collectionStats.push({
            name: collection.name,
            count: stats.count,
            size: stats.size,
            avgObjSize: stats.avgObjSize,
            storageSize: stats.storageSize,
            indexes: stats.nindexes
          });
        } catch (error) {
          // Some collections might not support stats
          collectionStats.push({
            name: collection.name,
            error: error.message
          });
        }
      }

      return {
        database: {
          name: dbStats.db,
          collections: dbStats.collections,
          objects: dbStats.objects,
          avgObjSize: dbStats.avgObjSize,
          dataSize: dbStats.dataSize,
          storageSize: dbStats.storageSize,
          indexes: dbStats.indexes,
          indexSize: dbStats.indexSize
        },
        collections: collectionStats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting MongoDB stats:', error);
      return {
        message: 'MongoDB stats not available',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Create singleton instance
const database = new Database();

module.exports = database;
