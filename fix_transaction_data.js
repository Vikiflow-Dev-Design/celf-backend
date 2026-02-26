/**
 * Fix Transaction Data
 * This script fixes incorrect transaction data in the database
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Transaction = require('./src/models/Transaction');

async function fixTransactionData() {
  try {
    console.log('🔧 Fixing Transaction Data...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false
    });

    console.log('✅ Connected to MongoDB successfully');

    // Get all users for reference
    const users = await User.find();
    const userMap = {};
    users.forEach(user => {
      userMap[user._id.toString()] = user;
    });

    console.log(`👥 Found ${users.length} users`);

    // Get all problematic transactions
    const allTransactions = await Transaction.find()
      .sort({ createdAt: -1 });

    console.log(`📊 Found ${allTransactions.length} total transactions`);

    let fixedCount = 0;
    let deletedCount = 0;

    // Strategy: Keep only one transaction per transfer, delete duplicates
    const processedPairs = new Set();

    for (const tx of allTransactions) {
      // Skip bonus transactions (they're fine)
      if (tx.type === 'bonus') {
        continue;
      }

      // Create a unique identifier for this transfer
      const transferId = [tx.fromUserId?.toString(), tx.toUserId?.toString(), tx.amount, tx.createdAt.getTime()].join('|');
      
      if (processedPairs.has(transferId)) {
        // This is a duplicate transaction, delete it
        console.log(`🗑️  Deleting duplicate transaction: ${tx.type} - ${tx.amount} CELF`);
        await Transaction.findByIdAndDelete(tx._id);
        deletedCount++;
        continue;
      }

      processedPairs.add(transferId);

      // Fix the transaction type and description based on the user perspective
      let needsUpdate = false;
      const updates = {};

      // For send/receive transactions, we'll keep them as 'send' from sender's perspective
      // and create proper descriptions
      if (tx.type === 'send') {
        const sender = userMap[tx.fromUserId?.toString()];
        const recipient = userMap[tx.toUserId?.toString()];
        
        if (sender && recipient) {
          const correctDescription = `Sent to ${recipient.firstName} ${recipient.lastName}`;
          if (tx.description !== correctDescription) {
            updates.description = correctDescription;
            needsUpdate = true;
          }
        }
      } else if (tx.type === 'receive') {
        // Convert receive transactions to send transactions from the sender's perspective
        const sender = userMap[tx.fromUserId?.toString()];
        const recipient = userMap[tx.toUserId?.toString()];
        
        if (sender && recipient) {
          updates.type = 'send';
          updates.description = `Sent to ${recipient.firstName} ${recipient.lastName}`;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await Transaction.findByIdAndUpdate(tx._id, updates);
        console.log(`✅ Fixed transaction: ${tx.type} -> ${updates.type || tx.type} - ${tx.amount} CELF`);
        fixedCount++;
      }
    }

    console.log(`\n📊 Transaction Fix Summary:`);
    console.log(`✅ Fixed: ${fixedCount} transactions`);
    console.log(`🗑️  Deleted: ${deletedCount} duplicate transactions`);

    // Verify the fix by checking each user's transactions
    console.log('\n🔍 Verifying fix for each user:');
    for (const user of users) {
      const userTransactions = await Transaction.find({
        $or: [{ fromUserId: user._id }, { toUserId: user._id }]
      }).sort({ createdAt: -1 });

      console.log(`\n👤 ${user.firstName} ${user.lastName}:`);
      console.log(`📊 ${userTransactions.length} transactions`);
      
      userTransactions.forEach((tx, index) => {
        const isUserSender = tx.fromUserId?.toString() === user._id.toString();
        const isUserRecipient = tx.toUserId?.toString() === user._id.toString();
        
        let displayType = tx.type;
        if (tx.type === 'send' && isUserRecipient) {
          displayType = 'received';
        }
        
        console.log(`  ${index + 1}. ${displayType} - ${tx.amount} CELF (${tx.description})`);
      });
    }

    console.log('\n✅ Transaction data fix completed!');
    
  } catch (error) {
    console.error('❌ Transaction data fix failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the fix
fixTransactionData().catch(console.error);
