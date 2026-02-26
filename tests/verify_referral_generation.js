const database = require('../src/config/database');
const User = require('../src/models/User');
const ReferralService = require('../src/services/referralService');
const AuthController = require('../src/controllers/authController');
const mongodbService = require('../src/services/mongodbService');

// Mock response object
const mockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.data = data;
        return res;
    };
    return res;
};

// Mock request object
const mockReq = (body) => ({
    body,
    ip: '127.0.0.1',
    get: () => 'TestAgent'
});

async function runTest() {
    try {
        console.log('🔌 Connecting to database...');
        await database.connect();

        const testEmail = `test_ref_${Date.now()}@example.com`;
        const testUser = {
            email: testEmail,
            password: 'StrongPassword123!',
            firstName: 'Referral',
            lastName: 'Tester'
        };

        console.log(`👤 Registering test user: ${testEmail}`);

        const req = mockReq(testUser);
        const res = mockRes();
        const next = (err) => { throw err; };

        // Call the register controller method directly
        await AuthController.register(req, res, next);

        if (res.statusCode !== 201) {
            console.error('❌ Registration failed:', res.data);
            process.exit(1);
        }

        console.log('✅ Registration successful response:', res.data.message);

        // Verify user in database
        const user = await User.findOne({ email: testEmail });
        if (!user) {
            console.error('❌ User not found in database!');
            process.exit(1);
        }

        console.log(`🔍 Checking user ${user._id} for referral code...`);
        if (user.referralCode) {
            console.log(`✅ SUCCESS: User has referralCode: ${user.referralCode}`);
        } else {
            console.error('❌ FAILURE: User does NOT have referralCode!');
            console.log('User dump:', user.toJSON());
            process.exit(1);
        }

        // Clean up
        console.log('🧹 Cleaning up test user...');
        await User.deleteOne({ _id: user._id });
        await database.disconnect();
        console.log('✅ Test complete.');

    } catch (error) {
        console.error('❌ Test failed with error:', error);
        process.exit(1);
    }
}

runTest();
