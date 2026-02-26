/**
 * Seed Tasks Script
 * Populates the database with initial tasks
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Task = require('../src/models/Task');

// Sample tasks data
const tasksData = [];

// --- Helper Functions to Generate Tasks ---

// 1. Generate Mining Milestone Tasks
const generateMiningTasks = () => {
  const milestones = [
    { count: 1, reward: 10, title: "First Dig" },
    { count: 5, reward: 25, title: "Daily Miner" },
    { count: 10, reward: 50, title: "Dedicated Miner" },
    { count: 25, reward: 100, title: "Mining Expert" },
    { count: 50, reward: 250, title: "Mining Master" },
    { count: 100, reward: 600, title: "Century Miner" },
    { count: 250, reward: 1500, title: "Elite Miner" },
    { count: 500, reward: 3500, title: "Mining Legend" },
    { count: 1000, reward: 7500, title: "Mining God" }
  ];

  return milestones.map((m, index) => ({
    taskId: `MINING_${(index + 1).toString().padStart(3, '0')}`,
    title: m.title,
    description: `Complete ${m.count} mining sessions`,
    category: "mining",
    maxProgress: m.count,
    reward: m.reward,
    icon: "hammer",
    tips: ["Active miners earn more rewards", "Keep your streak alive"],
    requirements: [`Complete ${m.count} mining sessions`],
    trackingType: "automatic",
    conditions: { miningSessionsRequired: m.count },
    sortOrder: index + 1,
    isActive: true,
    isLinkTask: false
  }));
};

// 2. Generate Referral Milestone Tasks
const generateReferralTasks = () => {
  const milestones = [
    { count: 1, reward: 20, title: "Share the Love" },
    { count: 3, reward: 75, title: "Community Builder" },
    { count: 5, reward: 150, title: "Influencer" },
    { count: 10, reward: 350, title: "Networker" },
    { count: 25, reward: 1000, title: "Community Leader" },
    { count: 50, reward: 2500, title: "Ambassador" },
    { count: 100, reward: 6000, title: "Global Icon" }
  ];

  return milestones.map((m, index) => ({
    taskId: `REFERRAL_${(index + 1).toString().padStart(3, '0')}`,
    title: m.title,
    description: `Refer ${m.count} friends to CELF`,
    category: "referral",
    maxProgress: m.count,
    reward: m.reward,
    icon: "people",
    tips: ["Share your unique code on social media"],
    requirements: [`Refer ${m.count} friends`],
    trackingType: "automatic",
    conditions: { referralsRequired: m.count },
    sortOrder: 100 + index,
    isActive: true,
    isLinkTask: false
  }));
};

// 3. Generate Wallet/Transaction Tasks
const generateWalletTasks = () => {
  const milestones = [
    { count: 1, reward: 15, title: "First Transaction", type: 'tx' },
    { count: 10, reward: 50, title: "Frequent Trader", type: 'tx' },
    { count: 50, reward: 300, title: "Market Mover", type: 'tx' },
    { count: 100, reward: 700, title: "High Volume", type: 'tx' },
    { amount: 50, reward: 30, title: "Token Holder", type: 'hold' },
    { amount: 100, reward: 75, title: "Serious Holder", type: 'hold' },
    { amount: 500, reward: 400, title: "Whale in Training", type: 'hold' },
    { amount: 1000, reward: 1000, title: "CELF Whale", type: 'hold' }
  ];

  return milestones.map((m, index) => ({
    taskId: `WALLET_${(index + 1).toString().padStart(3, '0')}`,
    title: m.title,
    description: m.type === 'tx'
      ? `Complete ${m.count} transactions`
      : `Hold ${m.amount} CELF tokens in your wallet`,
    category: "wallet",
    maxProgress: m.type === 'tx' ? m.count : m.amount,
    reward: m.reward,
    icon: "wallet",
    tips: ["Manage your assets wisely"],
    requirements: [m.type === 'tx' ? `Complete ${m.count} transactions` : `Hold ${m.amount} CELF`],
    trackingType: "automatic",
    conditions: m.type === 'tx'
      ? { transactionsRequired: m.count }
      : { balanceRequired: m.amount },
    sortOrder: 200 + index,
    isActive: true,
    isLinkTask: false
  }));
};

// 4. Social & Education Tasks (Manual List)
const socialTasks = [
  // Official Channels
  {
    taskId: "SOCIAL_001", title: "Join Discord Community", description: "Join our official Discord server",
    reward: 15, icon: "logo-discord", linkUrl: "https://discord.gg/celf", sortOrder: 301
  },
  {
    taskId: "SOCIAL_002", title: "Follow on Twitter", description: "Follow @CELFMining on Twitter",
    reward: 15, icon: "logo-twitter", linkUrl: "https://twitter.com/CELFMining", sortOrder: 302
  },
  {
    taskId: "SOCIAL_003", title: "Join Telegram Channel", description: "Join our official Telegram announcement channel",
    reward: 15, icon: "paper-plane", linkUrl: "https://t.me/celfmining_official", sortOrder: 303
  },
  {
    taskId: "SOCIAL_004", title: "Subscribe to YouTube", description: "Subscribe to our YouTube channel for tutorials",
    reward: 20, icon: "logo-youtube", linkUrl: "https://youtube.com/@celfmining", sortOrder: 304
  },
  {
    taskId: "SOCIAL_005", title: "Follow on Instagram", description: "Follow us on Instagram",
    reward: 10, icon: "logo-instagram", linkUrl: "https://instagram.com/celfmining", sortOrder: 305
  },
  // Education
  {
    taskId: "EDU_001", title: "Read Whitepaper", description: "Read the CELF project whitepaper to understand our vision",
    reward: 50, icon: "document-text", linkUrl: "https://celf.com/whitepaper", sortOrder: 401
  },
  {
    taskId: "EDU_002", title: "Visit Website", description: "Visit our official website",
    reward: 5, icon: "globe", linkUrl: "https://celf.com", sortOrder: 402
  },
  {
    taskId: "EDU_003", title: "Learn about Mining", description: "Read our guide on how mining works",
    reward: 10, icon: "school", linkUrl: "https://celf.com/learn/mining", sortOrder: 403
  },
  {
    taskId: "EDU_004", title: "Security Best Practices", description: "Learn how to secure your wallet",
    reward: 25, icon: "shield-checkmark", linkUrl: "https://celf.com/learn/security", sortOrder: 404
  },
  // Partner / Ecosystem (Placeholders for "100 tasks" volume)
];

// Generate Partner Tasks to reach 100+ total
// Compile all tasks
tasksData.push(
  ...generateMiningTasks(),
  ...generateReferralTasks(),
  ...generateWalletTasks(),
  ...socialTasks.map((t, i) => ({
    category: "social", maxProgress: 1, requirements: [t.title], trackingType: "manual",
    tips: ["Click the link to complete"], isActive: true, isLinkTask: true, ...t
  }))
);

async function seedTasks() {
  try {
    // Debug: Check if environment variables are loaded
    console.log('🔍 Checking environment variables...');
    console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
    console.log('NODE_ENV:', process.env.NODE_ENV);

    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📊 Connected to MongoDB');

    // Clear existing tasks
    const existingCount = await Task.countDocuments();
    console.log(`📋 Found ${existingCount} existing tasks`);

    if (existingCount > 0) {
      console.log('🗑️  Clearing existing tasks...');
      const deleteResult = await Task.deleteMany({});
      console.log(`✅ Cleared ${deleteResult.deletedCount} existing tasks`);
    }

    // Insert tasks
    console.log('🌱 Seeding tasks...');
    await Task.insertMany(tasksData);
    console.log(`✅ Successfully seeded ${tasksData.length} tasks`);

    // Display seeded tasks
    const tasks = await Task.find().sort({ category: 1, sortOrder: 1 });
    console.log('\n📋 Current tasks in database:');
    tasks.forEach(task => {
      console.log(`   ${task.taskId}: ${task.title} (${task.category})`);
    });

    console.log('\n🎉 Task seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding tasks:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📊 Disconnected from MongoDB');
  }
}

// Run the seeding
if (require.main === module) {
  seedTasks();
}

module.exports = { seedTasks, tasksData };
