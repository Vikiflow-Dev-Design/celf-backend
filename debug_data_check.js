// Debug script to check User Tasks and Mining Sessions
const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/celf';

function log(msg) {
    fs.appendFileSync('debug_output.txt', msg + '\n');
}

async function checkData() {
    fs.writeFileSync('debug_output.txt', ''); // Clear file
    try {
        await mongoose.connect(uri);
        log('Connected to MongoDB');

        // 1. Find the user (Victor)
        const User = require('./src/models/User');
        const user = await User.findOne({ email: { $regex: 'victor', $options: 'i' } });

        if (!user) {
            log('User not found.');
            return;
        }

        log(`Checking data for user: ${user.email} (${user._id})`);

        // 2. Check UserTasks
        const UserTask = require('./src/models/UserTask');
        const tasks = await UserTask.find({ userId: user._id });

        log(`\nUser Tasks (Total: ${tasks.length})`);
        tasks.forEach(t => {
            log(`- Task: ${t.taskKey}, Completed: ${t.isCompleted}, Claimed: ${t.rewardClaimed}`);
        });

        // 3. Check Transactions (Recent Activity)
        const Transaction = require('./src/models/Transaction');
        const transactions = await Transaction.find({
            $and: [
                { $or: [{ fromUserId: user._id }, { toUserId: user._id }] },
                { description: { $regex: 'Discord', $options: 'i' } }
            ]
        }).sort({ createdAt: -1 }).limit(10);

        log(`\nRecent Transactions (Count: ${transactions.length})`);
        transactions.forEach(t => {
            log(`- ${t.type}: ${t.amount} CELF (${t.description}) - ${t.createdAt}`);
        });

    } catch (error) {
        log('Error: ' + error);
    } finally {
        await mongoose.disconnect();
    }
}

checkData();
