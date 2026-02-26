const mongoose = require('mongoose');
require('dotenv').config();

const uriCelf = 'mongodb://localhost:27017/celf';
const uriMining = 'mongodb://localhost:27017/celf-mining';

async function checkDB(name, uri) {
    console.log(`\n--- Checking ${name} (${uri}) ---`);
    const conn = await mongoose.createConnection(uri).asPromise();

    try {
        const User = conn.model('User', new mongoose.Schema({}, { strict: false }));
        const UserTask = conn.model('UserTask', new mongoose.Schema({}, { strict: false }));
        const Transaction = conn.model('Transaction', new mongoose.Schema({}, { strict: false }));

        const user = await User.findOne({ email: { $regex: 'victor', $options: 'i' } });

        if (!user) {
            console.log('User NOT found.');
            return;
        }
        console.log(`User found: ${user._id} (${user.email})`);

        // Check tasks
        const tasks = await UserTask.find({ userId: user._id });
        const completed = tasks.filter(t => t.isCompleted);
        console.log(`UserTasks: ${tasks.length} total, ${completed.length} completed.`);
        if (completed.length > 0) {
            completed.forEach(t => console.log(`  - Completed Task: ${t.taskKey}, Claimed: ${t.rewardClaimed}`));
        }

        // Check transactions
        const txs = await Transaction.find({ $or: [{ fromUserId: user._id }, { toUserId: user._id }] }).sort({ createdAt: -1 }).limit(5);
        console.log(`Transactions: ${txs.length} recent.`);
        txs.forEach(t => console.log(`  - ${t.type}: ${t.amount} (${t.description})`));

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await conn.close();
    }
}

async function run() {
    await checkDB('CELF', uriCelf);
    await checkDB('CELF-MINING', uriMining);
}

run();
