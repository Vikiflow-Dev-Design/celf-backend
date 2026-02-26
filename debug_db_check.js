require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/celf-mining';

    try {
        await mongoose.connect(uri);
        const backendDb = mongoose.connection.db;

        // Get sessions
        const sessions = await backendDb.collection('session').find({}).toArray();
        console.log('Sessions in DB:');
        sessions.forEach(s => {
            console.log(`- Token: ${s.token}`);
            console.log(`  Expires: ${s.expiresAt}`);
            console.log(`  User: ${s.userId}`);
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

check();
