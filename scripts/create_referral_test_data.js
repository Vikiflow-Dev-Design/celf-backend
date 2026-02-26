/**
 * Create Referral Test Data Script
 * Creates a test user with 2 referees to test the referral functionality
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models and services
const User = require('../src/models/User');
const Wallet = require('../src/models/Wallet');
const Transaction = require('../src/models/Transaction');
const Referral = require('../src/models/Referral');
const ReferralService = require('../src/services/referralService');
const mongodbService = require('../src/services/mongodbService');

// Test user data
const TEST_USER = {
  email: 'referral.tester@celf.app',
  password: 'TestPass123!',
  firstName: 'Referral',
  lastName: 'Tester',
  role: 'user'
};

const REFEREE_USERS = [
  {
    email: 'referee1@celf.app',
    password: 'TestPass123!',
    firstName: 'Alice',
    lastName: 'Johnson',
    role: 'user'
  },
  {
    email: 'referee2@celf.app',
    password: 'TestPass123!',
    firstName: 'Bob',
    lastName: 'Smith',
    role: 'user'
  }
];

async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function cleanupExistingData() {
  console.log('\n🧹 Cleaning up existing test data...');
  
  // Find and delete existing test users and their data
  const testEmails = [TEST_USER.email, ...REFEREE_USERS.map(u => u.email)];
  
  for (const email of testEmails) {
    const user = await User.findOne({ email });
    if (user) {
      console.log(`🗑️  Deleting existing user: ${email}`);
      
      // Delete user's wallet
      await Wallet.deleteMany({ userId: user._id });
      
      // Delete user's transactions
      await Transaction.deleteMany({ 
        $or: [{ fromUserId: user._id }, { toUserId: user._id }] 
      });
      
      // Delete referrals where user is referrer or referee
      await Referral.deleteMany({ 
        $or: [{ referrerId: user._id }, { refereeId: user._id }] 
      });
      
      // Delete the user
      await User.deleteOne({ _id: user._id });
    }
  }
  
  console.log('✅ Cleanup completed');
}

function createWalletData(userId, email, name) {
  const address = `celf_${userId.toString().slice(-8)}_${Date.now()}`;
  return {
    userId,
    sendableBalance: 0,
    nonSendableBalance: 10, // Welcome bonus
    totalBalance: 10,
    pendingBalance: 0,
    addresses: [{
      address: address,
      label: 'Primary Address',
      isDefault: true
    }],
    currentAddress: address,
    lastActivity: new Date(),
    metadata: {
      createdVia: 'registration',
      userEmail: email
    }
  };
}

async function createTestUser() {
  console.log('\n👤 Creating main test user...');

  // Hash password
  const hashedPassword = await bcrypt.hash(TEST_USER.password, 12);

  // Create user directly with User model
  const userData = {
    ...TEST_USER,
    password: hashedPassword
  };

  const user = new User(userData);
  await user.save();
  console.log(`✅ Created user: ${user.email} (ID: ${user._id})`);

  // Generate referral code
  const referralCode = await ReferralService.createReferralCodeForUser(user._id);
  console.log(`🔗 Generated referral code: ${referralCode}`);

  // Create wallet with welcome bonus
  const walletData = createWalletData(user._id, user.email, 'Primary Wallet');
  const wallet = new Wallet(walletData);
  await wallet.save();
  console.log(`💰 Created wallet with ${wallet.totalBalance} CELF`);

  // Create welcome transaction
  const welcomeTransaction = new Transaction({
    toUserId: user._id,
    amount: 10,
    type: 'bonus',
    status: 'completed',
    description: 'Welcome bonus for new user',
    fee: 0,
    metadata: {
      source: 'registration',
      automated: true
    }
  });
  await welcomeTransaction.save();
  console.log(`📝 Created welcome bonus transaction`);

  return { user, referralCode };
}

async function createRefereeUser(refereeData, referralCode, referrerUser) {
  console.log(`\n👥 Creating referee: ${refereeData.email}...`);

  // Hash password
  const hashedPassword = await bcrypt.hash(refereeData.password, 12);

  // Create user directly with User model
  const userData = {
    ...refereeData,
    password: hashedPassword,
    referredBy: referrerUser._id
  };

  const user = new User(userData);
  await user.save();
  console.log(`✅ Created referee: ${user.email} (ID: ${user._id})`);

  // Generate referral code for the referee too
  await ReferralService.createReferralCodeForUser(user._id);

  // Create wallet with welcome bonus
  const walletData = createWalletData(user._id, user.email, 'Primary Wallet');
  const wallet = new Wallet(walletData);
  await wallet.save();
  console.log(`💰 Created wallet with ${wallet.totalBalance} CELF`);

  // Create welcome transaction
  const welcomeTransaction = new Transaction({
    toUserId: user._id,
    amount: 10,
    type: 'bonus',
    status: 'completed',
    description: 'Welcome bonus for new user',
    fee: 0,
    metadata: {
      source: 'registration',
      automated: true
    }
  });
  await welcomeTransaction.save();

  // Process referral
  console.log(`🔗 Processing referral with code: ${referralCode}`);
  const referral = await ReferralService.processReferralSignup(user._id, referralCode, {
    source: 'mobile_app',
    ipAddress: '127.0.0.1',
    userAgent: 'Test Script'
  });

  if (referral) {
    // Give referral rewards
    await ReferralService.giveReferralRewards(referral._id);
    console.log(`✅ Referral processed! Referee gets ${referral.refereeReward.amount} CELF bonus`);
    console.log(`✅ Referrer gets ${referral.referrerReward.amount} CELF bonus`);
  } else {
    console.log(`❌ Failed to process referral`);
  }

  return user;
}

async function displayResults(mainUser, referees) {
  console.log('\n🎉 REFERRAL TEST DATA CREATED SUCCESSFULLY!');
  console.log('=' .repeat(60));
  
  // Get updated user data
  const updatedMainUser = await User.findById(mainUser._id);
  const mainUserWallet = await Wallet.findOne({ userId: mainUser._id });
  
  console.log('\n👤 MAIN TEST USER (Referrer):');
  console.log(`📧 Email: ${updatedMainUser.email}`);
  console.log(`🔑 Password: ${TEST_USER.password}`);
  console.log(`🔗 Referral Code: ${updatedMainUser.referralCode}`);
  console.log(`💰 Total Balance: ${mainUserWallet.totalBalance} CELF`);
  console.log(`📊 Referral Stats:`);
  console.log(`   - Total Referrals: ${updatedMainUser.referralStats.totalReferrals}`);
  console.log(`   - Successful Referrals: ${updatedMainUser.referralStats.successfulReferrals}`);
  console.log(`   - Total Earned: ${updatedMainUser.referralStats.totalEarned} CELF`);
  
  console.log('\n👥 REFEREE USERS:');
  for (let i = 0; i < referees.length; i++) {
    const referee = referees[i];
    const refereeWallet = await Wallet.findOne({ userId: referee._id });
    console.log(`\n${i + 1}. ${referee.firstName} ${referee.lastName}`);
    console.log(`   📧 Email: ${referee.email}`);
    console.log(`   🔑 Password: ${REFEREE_USERS[i].password}`);
    console.log(`   💰 Total Balance: ${refereeWallet.totalBalance} CELF`);
  }
  
  // Get referral records
  const referrals = await Referral.find({ referrerId: mainUser._id })
    .populate('refereeId', 'firstName lastName email');
  
  console.log('\n🔗 REFERRAL RECORDS:');
  referrals.forEach((ref, index) => {
    console.log(`\n${index + 1}. Referral ID: ${ref._id}`);
    console.log(`   Referee: ${ref.refereeId.firstName} ${ref.refereeId.lastName} (${ref.refereeId.email})`);
    console.log(`   Status: ${ref.status}`);
    console.log(`   Referrer Reward: ${ref.referrerReward.amount} CELF (Given: ${ref.referrerReward.given})`);
    console.log(`   Referee Reward: ${ref.refereeReward.amount} CELF (Given: ${ref.refereeReward.given})`);
    console.log(`   Date: ${ref.createdAt}`);
  });
  
  console.log('\n📱 HOW TO TEST:');
  console.log('1. Open your CELF mobile app');
  console.log('2. Login with the main test user credentials:');
  console.log(`   📧 Email: ${updatedMainUser.email}`);
  console.log(`   🔑 Password: ${TEST_USER.password}`);
  console.log('3. Navigate to the Referrals screen');
  console.log('4. You should see:');
  console.log(`   - Your referral code: ${updatedMainUser.referralCode}`);
  console.log(`   - 2 successful referrals`);
  console.log(`   - Total earnings: ${updatedMainUser.referralStats.totalEarned} CELF from referrals`);
  console.log(`   - Total balance: ${mainUserWallet.totalBalance} CELF (10 welcome + ${updatedMainUser.referralStats.totalEarned} referral rewards)`);
  
  console.log('\n✅ Test data creation completed!');
}

async function main() {
  try {
    console.log('🚀 Starting Referral Test Data Creation...');
    
    await connectToDatabase();
    await cleanupExistingData();
    
    // Create main test user
    const { user: mainUser, referralCode } = await createTestUser();
    
    // Create referee users
    const referees = [];
    for (const refereeData of REFEREE_USERS) {
      const referee = await createRefereeUser(refereeData, referralCode, mainUser);
      referees.push(referee);
    }
    
    // Display results
    await displayResults(mainUser, referees);
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
main();
