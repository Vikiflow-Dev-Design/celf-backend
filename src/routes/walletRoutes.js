const express = require('express');
const router = express.Router();

const walletController = require('../controllers/walletController');
const { authenticate } = require('../middleware/authMiddleware');
const { validate, validateQuery, validateParams } = require('../middleware/validationMiddleware');
const {
  sendTokensSchema,
  sendTokensByEmailSchema,
  exchangeTokensSchema,
  addAddressSchema,
  miningRewardSchema,
  walletPreferencesSchema,
  transactionIdParamSchema,
} = require('../validators/walletValidator');

// Wallet balance and info routes
router.get('/balance', authenticate, walletController.getBalance);
router.get('/balance/breakdown', authenticate, walletController.getBalanceBreakdown);
router.get('/addresses', authenticate, walletController.getAddresses);
router.post('/addresses', authenticate, validate(addAddressSchema), walletController.addAddress);
router.put('/addresses/:address/default', authenticate, walletController.setDefaultAddress);

// Transaction routes
router.get('/transactions', authenticate, walletController.getTransactions);
router.get('/transactions/:id', authenticate, validateParams(transactionIdParamSchema), walletController.getTransactionById);
router.get('/recent-recipients', authenticate, walletController.getRecentRecipients);
router.post('/send', authenticate, validate(sendTokensSchema), walletController.sendTokens);
router.post('/send-by-email', authenticate, validate(sendTokensByEmailSchema), walletController.sendTokensByEmail);

// Token exchange routes
router.post('/exchange', authenticate, validate(exchangeTokensSchema), walletController.exchangeTokens);
router.get('/exchange/rates', authenticate, walletController.getExchangeRates);

// Mining rewards (called by mining service)
router.post('/mining-reward', authenticate, validate(miningRewardSchema), walletController.addMiningReward);

// Wallet statistics
router.get('/stats', authenticate, walletController.getWalletStats);

// Currency and display preferences
router.get('/preferences', authenticate, walletController.getPreferences);
router.put('/preferences', authenticate, validate(walletPreferencesSchema), walletController.updatePreferences);

module.exports = router;
