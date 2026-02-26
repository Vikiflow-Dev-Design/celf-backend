/**
 * Initialize User Tasks
 * Initialize tasks for existing users
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('./src/models');
const taskService = require('./src/services/taskService');

async function initializeUserTasks() {
  try {
    console.log('🔧 Initializing user tasks...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all users
    const users = await User.find();
    console.log(`👥 Found ${users.length} users`);

    // Initialize tasks for each user
    for (const user of users) {
      console.log(`\n🔄 Initializing tasks for: ${user.email}`);
      
      try {
        const count = await taskService.initializeUserTasks(user._id);
        console.log(`✅ Initialized ${count} tasks for ${user.email}`);
        
        // Test the tasks
        const userTasks = await taskService.getUserTasks(user._id);
        console.log(`📊 User now has ${userTasks.length} task records`);
        
      } catch (error) {
        console.error(`❌ Error initializing for ${user.email}:`, error.message);
      }
    }

    console.log('\n🎉 User task initialization completed!');
    
  } catch (error) {
    console.error('❌ Initialization error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run initialization
if (require.main === module) {
  initializeUserTasks();
}

module.exports = { initializeUserTasks };
