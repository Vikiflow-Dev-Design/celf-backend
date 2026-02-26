/**
 * Initialize User Tasks Script
 * Creates UserTask records for all existing users
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { User, Task, UserTask } = require('../src/models');

async function initializeUserTasks() {
  try {
    console.log('🔧 Initializing user tasks...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Get all tasks
    const tasks = await Task.find({ isActive: true });
    console.log(`📋 Found ${tasks.length} active tasks`);

    if (tasks.length === 0) {
      console.log('❌ No tasks found! Run seedTasks.js first.');
      return;
    }

    // Get all users
    const users = await User.find();
    console.log(`👥 Found ${users.length} users`);

    if (users.length === 0) {
      console.log('❌ No users found! Create user accounts first.');
      return;
    }

    let totalInitialized = 0;

    // Initialize tasks for each user
    for (const user of users) {
      console.log(`\n🔄 Processing user: ${user.email}`);
      
      // Check existing user tasks
      const existingUserTasks = await UserTask.find({ userId: user._id });
      console.log(`   📊 User has ${existingUserTasks.length} existing task records`);

      const userTasksToCreate = [];

      for (const task of tasks) {
        // Check if user task already exists
        const existingUserTask = await UserTask.findOne({
          userId: user._id,
          taskKey: task.taskId
        });

        if (!existingUserTask) {
          userTasksToCreate.push({
            userId: user._id,
            taskId: task._id,
            taskKey: task.taskId,
            progress: 0,
            isCompleted: false,
            rewardClaimed: false
          });
        }
      }

      if (userTasksToCreate.length > 0) {
        await UserTask.insertMany(userTasksToCreate);
        console.log(`   ✅ Created ${userTasksToCreate.length} new task records`);
        totalInitialized += userTasksToCreate.length;
      } else {
        console.log(`   ⚠️  All tasks already initialized for this user`);
      }

      // Verify user tasks
      const finalUserTasks = await UserTask.find({ userId: user._id });
      console.log(`   📊 User now has ${finalUserTasks.length} total task records`);
    }

    console.log(`\n🎉 Initialization completed! Created ${totalInitialized} user task records.`);

    // Display summary
    const totalUserTasks = await UserTask.countDocuments();
    console.log(`📊 Total UserTask records in database: ${totalUserTasks}`);

  } catch (error) {
    console.error('❌ Error initializing user tasks:', error);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the initialization
if (require.main === module) {
  initializeUserTasks();
}

module.exports = { initializeUserTasks };
