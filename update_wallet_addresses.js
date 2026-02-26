/**
 * Update Existing Users with Proper Wallet Addresses
 * This script updates existing users to have secure wallet addresses
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Wallet = require('./src/models/Wallet');
const { generateWalletAddress } = require('./src/utils/walletUtils');

async function updateWalletAddresses() {
  try {
    console.log('🔍 Updating wallet addresses for existing users...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false
    });

    console.log('✅ Connected to MongoDB successfully');

    // Get all users
    const users = await User.find();
    console.log(`👥 Found ${users.length} users to update`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      try {
        console.log(`\n🔄 Processing user: ${user.firstName} ${user.lastName} (${user.email})`);
        
        // Get user's wallet
        const wallet = await Wallet.findOne({ userId: user._id });
        
        if (!wallet) {
          console.log(`⚠️  No wallet found for user ${user.email}, skipping...`);
          skippedCount++;
          continue;
        }

        // Check if wallet already has a proper address
        const currentAddress = wallet.currentAddress;
        if (currentAddress && currentAddress.startsWith('celf') && currentAddress.length === 44) {
          console.log(`✅ User ${user.email} already has proper address: ${currentAddress.substring(0, 20)}...`);
          skippedCount++;
          continue;
        }

        // Generate new secure address
        const newAddress = generateWalletAddress(user._id.toString(), user.email);
        console.log(`🔐 Generated new address: ${newAddress.substring(0, 20)}...`);

        // Update wallet with new address
        wallet.currentAddress = newAddress;
        
        // Update addresses array
        wallet.addresses = [{
          address: newAddress,
          label: 'Primary Wallet',
          isDefault: true,
          createdAt: new Date()
        }];

        await wallet.save();
        
        console.log(`✅ Updated wallet for ${user.email}`);
        updatedCount++;
        
      } catch (error) {
        console.error(`❌ Error updating user ${user.email}:`, error.message);
      }
    }

    console.log(`\n📊 Update Summary:`);
    console.log(`✅ Updated: ${updatedCount} users`);
    console.log(`⏭️  Skipped: ${skippedCount} users (already had proper addresses)`);
    console.log(`👥 Total processed: ${users.length} users`);

    // Verify updates
    console.log('\n🔍 Verifying updates...');
    const walletsWithProperAddresses = await Wallet.find({
      currentAddress: { $regex: /^celf[a-f0-9]{40}$/i }
    });
    
    console.log(`✅ ${walletsWithProperAddresses.length} wallets now have proper addresses`);

    // Show sample addresses
    console.log('\n📋 Sample updated addresses:');
    for (let i = 0; i < Math.min(3, walletsWithProperAddresses.length); i++) {
      const wallet = walletsWithProperAddresses[i];
      const user = await User.findById(wallet.userId);
      console.log(`  ${user.firstName} ${user.lastName}: ${wallet.currentAddress.substring(0, 20)}...`);
    }

    console.log('\n✅ Wallet address update completed successfully!');
    
  } catch (error) {
    console.error('❌ Wallet address update failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the update
updateWalletAddresses().catch(console.error);
