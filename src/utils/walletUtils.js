/**
 * Wallet Utilities
 * Functions for wallet address generation and management
 */

const crypto = require('crypto');

/**
 * Generate a secure wallet address using hybrid approach
 * Combines user data with cryptographic randomness for security and uniqueness
 * 
 * @param {string} userId - User's unique identifier
 * @param {string} email - User's email address
 * @returns {string} Generated wallet address with 'celf' prefix
 */
function generateWalletAddress(userId, email) {
  try {
    const prefix = 'celf';
    const timestamp = Date.now();
    const random = crypto.randomBytes(16).toString('hex');
    
    // Combine multiple entropy sources for security
    const combinedData = userId + email + timestamp + random;
    
    // Generate secure hash
    const hash = crypto.createHash('sha256')
      .update(combinedData)
      .digest('hex')
      .substring(0, 40); // Take first 40 characters for address
    
    const address = prefix + hash;
    
    console.log(`🔐 Generated wallet address for user ${userId}: ${address.substring(0, 20)}...`);
    
    return address;
    
  } catch (error) {
    console.error('❌ Error generating wallet address:', error);
    throw new Error('Failed to generate wallet address');
  }
}

/**
 * Validate wallet address format
 * 
 * @param {string} address - Wallet address to validate
 * @returns {boolean} True if valid format
 */
function isValidWalletAddress(address) {
  if (!address || typeof address !== 'string') {
    return false;
  }
  
  // Check format: 'celf' + 40 hex characters = 44 total length
  const addressRegex = /^celf[a-f0-9]{40}$/i;
  return addressRegex.test(address);
}

/**
 * Generate a short display version of wallet address
 * 
 * @param {string} address - Full wallet address
 * @returns {string} Shortened address for display (e.g., "celf1234...5678")
 */
function getDisplayAddress(address) {
  if (!address || !isValidWalletAddress(address)) {
    return 'Invalid Address';
  }
  
  return `${address.substring(0, 8)}...${address.substring(-8)}`;
}

/**
 * Generate multiple addresses for a user (for future multi-address support)
 * 
 * @param {string} userId - User's unique identifier
 * @param {string} email - User's email address
 * @param {number} count - Number of addresses to generate
 * @returns {Array} Array of generated addresses
 */
function generateMultipleAddresses(userId, email, count = 1) {
  const addresses = [];
  
  for (let i = 0; i < count; i++) {
    // Add index to ensure uniqueness when generating multiple addresses
    const indexedUserId = `${userId}_${i}`;
    addresses.push(generateWalletAddress(indexedUserId, email));
  }
  
  return addresses;
}

/**
 * Create wallet data structure for new user
 * 
 * @param {string} userId - User's unique identifier
 * @param {string} email - User's email address
 * @param {string} label - Label for the primary address
 * @returns {Object} Wallet data structure
 */
function createWalletData(userId, email, label = 'Primary Wallet') {
  const primaryAddress = generateWalletAddress(userId, email);
  
  return {
    userId,
    currentAddress: primaryAddress,
    addresses: [{
      address: primaryAddress,
      label,
      isDefault: true,
      createdAt: new Date()
    }],
    sendableBalance: 0,
    nonSendableBalance: 0,
    pendingBalance: 0,
    totalBalance: 0,
    totalSent: 0,
    totalReceived: 0,
    lastActivity: new Date()
  };
}

module.exports = {
  generateWalletAddress,
  isValidWalletAddress,
  getDisplayAddress,
  generateMultipleAddresses,
  createWalletData
};
