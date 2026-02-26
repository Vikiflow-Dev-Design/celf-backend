// Test setup file
require('dotenv').config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Global test configuration
global.console = {
  ...console,
  // Uncomment to suppress console.log during tests
  // log: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn()
};

// Setup test database connection if needed
beforeAll(async () => {
  // Initialize test database connection
  // await connectTestDatabase();
});

afterAll(async () => {
  // Clean up test database connection
  // await disconnectTestDatabase();
});

// Clean up after each test
afterEach(async () => {
  // Clean up test data
  // await cleanupTestData();
});
