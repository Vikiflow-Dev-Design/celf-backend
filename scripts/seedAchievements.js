const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const { Task } = require('../src/models');

// Task data for mobile app
const tasksData = [
  {
    taskId: '1',
    title: 'First Mining Session',
    description: 'Complete your first mining session to get started',
    category: 'mining',
    maxProgress: 1,
    reward: 10,
    icon: 'diamond',
    tips: [
      'Tap the mining button to start your first session',
      'Mining sessions help you earn CELF tokens',
      'Check back regularly to maximize earnings'
    ],
    requirements: [
      'Start and complete one mining session',
      'Session can be any duration',
      'Must be logged into the app'
    ],
    conditions: {
      miningSessionsRequired: 1
    },
    sortOrder: 1
  },
  {
    taskId: '2',
    title: 'Daily Miner',
    description: 'Complete 5 mining sessions',
    category: 'mining',
    maxProgress: 5,
    reward: 25,
    icon: 'flash',
    tips: [
      'Consistency is key to mining success',
      'Set reminders to mine regularly',
      'Each session brings you closer to the goal',
      'Mining rewards compound over time'
    ],
    requirements: [
      'Complete 5 separate mining sessions',
      'Sessions must be successful',
      'Can be completed over any time period',
      'Progress is tracked automatically'
    ],
    conditions: {
      miningSessionsRequired: 5
    },
    sortOrder: 2
  },
  {
    taskId: '3',
    title: 'Share the Love',
    description: 'Refer your first friend to CELF',
    category: 'social',
    maxProgress: 1,
    reward: 20,
    icon: 'people',
    tips: [
      'Share your referral code with friends',
      'Explain the benefits of CELF mining',
      'Help friends get started with their first session',
      'Referral rewards benefit both parties'
    ],
    requirements: [
      'Successfully refer 1 friend',
      'Friend must register using your referral code',
      'Friend must complete at least one mining session',
      'Referral must be unique user'
    ],
    conditions: {
      referralsRequired: 1
    },
    sortOrder: 3
  },
  {
    taskId: '4',
    title: 'First Transaction',
    description: 'Make your first token transaction',
    category: 'wallet',
    maxProgress: 1,
    reward: 15,
    icon: 'card',
    tips: [
      'Send or receive tokens to unlock this task',
      'Double-check the recipient address',
      'Start with small amounts for testing',
      'Transaction fees are minimal'
    ],
    requirements: [
      'Complete 1 transaction',
      'Valid recipient address',
      'Sufficient balance for transaction and fees',
      'Complete transaction successfully'
    ],
    conditions: {
      transactionsRequired: 1
    },
    sortOrder: 4
  },
  {
    taskId: '5',
    title: 'Getting Started',
    description: 'Earn your first 10 CELF tokens',
    category: 'milestone',
    maxProgress: 10,
    reward: 20,
    icon: 'star',
    tips: [
      'Mine tokens or complete tasks to reach this milestone',
      'Check your wallet balance regularly',
      'Complete other tasks for bonus tokens',
      'Every token counts towards this goal'
    ],
    requirements: [
      'Earn 10 CELF tokens total',
      'Includes all token sources (mining, referrals, etc.)',
      'Tokens must be in your wallet',
      'Progress tracked automatically'
    ],
    conditions: {
      totalTokensRequired: 10
    },
    sortOrder: 5
  },
  {
    taskId: '6',
    title: 'Community Builder',
    description: 'Refer 3 friends to CELF',
    category: 'social',
    maxProgress: 3,
    reward: 75,
    icon: 'share',
    tips: [
      'Build your network by inviting more friends',
      'Share success stories and tips',
      'Help newcomers understand the platform',
      'Referral rewards benefit both parties'
    ],
    requirements: [
      'Successfully refer 3 friends',
      'Friends must register using your referral code',
      'Friends must complete at least one mining session',
      'Referrals must be unique users'
    ],
    conditions: {
      referralsRequired: 3
    },
    sortOrder: 6
  },
  {
    taskId: '7',
    title: 'Token Holder',
    description: 'Hold 50 CELF tokens in your wallet',
    category: 'wallet',
    maxProgress: 50,
    reward: 30,
    icon: 'wallet',
    tips: [
      'Accumulate tokens through mining and transactions',
      'Keep tokens in your wallet to maintain balance',
      'Check your wallet balance regularly',
      'Complete other tasks to earn more tokens'
    ],
    requirements: [
      'Hold 50 CELF tokens in wallet',
      'Balance must be maintained when task completes',
      'Includes all token sources',
      'Progress tracked automatically'
    ],
    conditions: {
      balanceRequired: 50
    },
    sortOrder: 7
  },
  {
    taskId: '8',
    title: 'Token Collector',
    description: 'Earn 100 CELF tokens total',
    category: 'milestone',
    maxProgress: 100,
    reward: 50,
    icon: 'diamond',
    tips: [
      'Keep mining and completing tasks to reach this milestone',
      'Track your total earnings progress',
      'Complete other tasks for bonus tokens',
      'Consistency is key to reaching this goal'
    ],
    requirements: [
      'Earn 100 CELF tokens total',
      'Includes all token sources (mining, referrals, etc.)',
      'Progress tracked automatically',
      'Tokens must be earned, not just held'
    ],
    conditions: {
      totalTokensRequired: 100
    },
    sortOrder: 8
  }
];

async function seedTasks() {
  try {
    console.log('🌱 Starting task seeding process...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Clear existing tasks
    const deleteResult = await Task.deleteMany({});
    console.log(`🗑️  Cleared ${deleteResult.deletedCount} existing tasks`);

    // Insert new tasks
    const insertedTasks = await Task.insertMany(tasksData);
    console.log(`✅ Successfully seeded ${insertedTasks.length} tasks`);

    // Display seeded tasks
    console.log('\n📋 Seeded Tasks:');
    insertedTasks.forEach(task => {
      console.log(`   ${task.taskId}: ${task.title} (${task.category})`);
    });

    console.log('\n🎉 Task seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding tasks:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the seeding function
if (require.main === module) {
  seedTasks();
}

module.exports = { seedTasks, tasksData };
