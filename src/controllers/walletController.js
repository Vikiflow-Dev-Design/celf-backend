const mongodbService = require('../services/mongodbService');
const achievementService = require('../services/achievementService');
const { createResponse } = require('../utils/responseUtils');
const Transaction = require('../models/Transaction');
const Wallet = require('../models/Wallet');

const { createWalletData } = require('../utils/walletUtils');

class WalletController {
  async getBalance(req, res, next) {
    try {
      const userId = req.user.userId;
      let wallet = await mongodbService.findWalletByUserId(userId);

      if (!wallet) {
        console.log(`Wallet not found for user ${userId}, creating new wallet...`);

        // Lazy creation of wallet for users who might have missed the registration hook (e.g. Better-Auth)
        const walletData = createWalletData(userId, req.user.email || 'user@celf.app', 'Primary Wallet');

        // Get welcome bonus from settings
        const settings = await mongodbService.getMiningSettings();
        const welcomeBonus = settings.welcomeBonus !== undefined ? settings.welcomeBonus : 10;

        // Add welcome bonus
        walletData.nonSendableBalance = welcomeBonus;
        walletData.totalBalance = welcomeBonus;

        try {
          wallet = await mongodbService.createWallet(walletData);

          // Create welcome transaction
          if (welcomeBonus > 0) {
            const Transaction = require('../models/Transaction');
            const welcomeTransaction = new Transaction({
              toUserId: userId,
              amount: welcomeBonus,
              type: 'bonus',
              status: 'completed',
              description: `Welcome bonus - ${welcomeBonus} CELF tokens`
            });
            await welcomeTransaction.save();
          }

          console.log(`Created new wallet for user ${userId} with welcome bonus`);
        } catch (createError) {
          console.error('Failed to auto-create wallet:', createError);
          return res.status(500).json(createResponse(false, 'Failed to initialize wallet'));
        }
      }

      res.json(createResponse(true, 'Balance retrieved successfully', {
        totalBalance: parseFloat(wallet.totalBalance),
        sendableBalance: parseFloat(wallet.sendableBalance),
        nonSendableBalance: parseFloat(wallet.nonSendableBalance),
        pendingBalance: parseFloat(wallet.pendingBalance),
        currentAddress: wallet.currentAddress,
        lastActivity: wallet.lastActivity
      }));
    } catch (error) {
      next(error);
    }
  }

  async getBalanceBreakdown(req, res, next) {
    try {
      const userId = req.user.userId;
      const wallet = await Wallet.findOne({ userId });

      if (!wallet) {
        return res.status(404).json(createResponse(false, 'Wallet not found'));
      }

      res.json(createResponse(true, 'Balance breakdown retrieved successfully', {
        sendable: wallet.sendableBalance,
        nonSendable: wallet.nonSendableBalance,
        pending: wallet.pendingBalance,
        total: wallet.totalBalance
      }));
    } catch (error) {
      next(error);
    }
  }

  async getAddresses(req, res, next) {
    try {
      const userId = req.user.userId;
      const wallet = await Wallet.findOne({ userId });

      if (!wallet) {
        return res.status(404).json(createResponse(false, 'Wallet not found'));
      }

      res.json(createResponse(true, 'Addresses retrieved successfully', {
        addresses: wallet.addresses,
        currentAddress: wallet.currentAddress
      }));
    } catch (error) {
      next(error);
    }
  }

  async addAddress(req, res, next) {
    try {
      const userId = req.user.userId;
      const { address, label } = req.body;

      const wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        return res.status(404).json(createResponse(false, 'Wallet not found'));
      }

      // Check if address already exists
      const existingAddress = wallet.addresses.find(addr => addr.address === address);
      if (existingAddress) {
        return res.status(400).json(createResponse(false, 'Address already exists'));
      }

      wallet.addresses.push({
        address,
        label: label || `Address ${wallet.addresses.length + 1}`,
        isDefault: wallet.addresses.length === 0
      });

      await wallet.save();

      res.status(201).json(createResponse(true, 'Address added successfully', {
        address: wallet.addresses[wallet.addresses.length - 1]
      }));
    } catch (error) {
      next(error);
    }
  }

  async setDefaultAddress(req, res, next) {
    try {
      const userId = req.user.userId;
      const { address } = req.params;

      const wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        return res.status(404).json(createResponse(false, 'Wallet not found'));
      }

      // Update default address
      wallet.addresses.forEach(addr => {
        addr.isDefault = addr.address === address;
      });

      wallet.currentAddress = address;
      await wallet.save();

      res.json(createResponse(true, 'Default address updated successfully'));
    } catch (error) {
      next(error);
    }
  }

  async getTransactions(req, res, next) {
    try {
      const userId = req.user.userId;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      console.log('🔍 WalletController: getTransactions called');
      console.log('👤 Authenticated user ID:', userId);
      console.log('📄 Pagination:', { page, limit, skip });

      const transactions = await Transaction.find({
        $or: [{ fromUserId: userId }, { toUserId: userId }]
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('fromUserId', 'firstName lastName')
        .populate('toUserId', 'firstName lastName')
        .populate({
          path: 'referralId',
          populate: {
            path: 'refereeId',
            select: 'firstName lastName email'
          }
        });

      console.log(`📊 Found ${transactions.length} transactions for user ${userId}`);
      console.log('📋 Transaction details:');
      transactions.forEach((tx, index) => {
        console.log(`  ${index + 1}. ${tx.type} - ${tx.amount} CELF`);
        console.log(`     From: ${tx.fromUserId?._id || tx.fromUserId} (${tx.fromUserId?.firstName || 'Unknown'})`);
        console.log(`     To: ${tx.toUserId?._id || tx.toUserId} (${tx.toUserId?.firstName || 'Unknown'})`);
        console.log(`     Description: ${tx.description}`);
      });

      const total = await Transaction.countDocuments({
        $or: [{ fromUserId: userId }, { toUserId: userId }]
      });

      // Transform transactions based on user perspective
      const transformedTransactions = transactions.map(tx => {
        const isUserSender = tx.fromUserId?._id?.toString() === userId.toString();
        const isUserRecipient = tx.toUserId?._id?.toString() === userId.toString();

        let displayType = tx.type;
        let displayAmount = tx.amount;
        let displayDescription = tx.description;

        // Determine display type based on user perspective
        if (tx.type === 'send' || tx.type === 'receive') {
          if (isUserSender) {
            displayType = 'send';
            displayAmount = tx.amount; // Positive amount, will be shown as negative in UI
            if (tx.toUserId) {
              displayDescription = `Sent to ${tx.toUserId.firstName} ${tx.toUserId.lastName}`;
            }
          } else if (isUserRecipient) {
            displayType = 'receive';
            displayAmount = tx.amount; // Positive amount
            if (tx.fromUserId) {
              displayDescription = `Received from ${tx.fromUserId.firstName} ${tx.fromUserId.lastName}`;
            }
          }
        }

        return {
          id: tx._id,
          type: displayType,
          amount: displayAmount,
          status: tx.status,
          description: displayDescription,
          createdAt: tx.createdAt,
          fee: tx.fee || 0,
          toAddress: tx.toAddress,
          taskId: tx.taskId || null,
          fromUser: tx.fromUserId ? {
            id: tx.fromUserId._id,
            firstName: tx.fromUserId.firstName,
            lastName: tx.fromUserId.lastName
          } : null,
          toUser: tx.toUserId ? {
            id: tx.toUserId._id,
            firstName: tx.toUserId.firstName,
            lastName: tx.toUserId.lastName
          } : null,
          referral: tx.referralId ? {
            id: tx.referralId._id,
            code: tx.referralId.referralCode,
            referee: tx.referralId.refereeId ? {
              firstName: tx.referralId.refereeId.firstName,
              lastName: tx.referralId.refereeId.lastName,
              email: tx.referralId.refereeId.email
            } : null
          } : null
        };
      });

      res.json(createResponse(true, 'Transactions retrieved successfully', {
        transactions: transformedTransactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }));
    } catch (error) {
      next(error);
    }
  }

  async getTransactionById(req, res, next) {
    try {
      const userId = req.user.userId;
      const { id } = req.params;

      const transaction = await Transaction.findOne({
        _id: id,
        $or: [{ fromUserId: userId }, { toUserId: userId }]
      })
        .populate('fromUserId', 'firstName lastName')
        .populate('toUserId', 'firstName lastName')
        .populate({
          path: 'referralId',
          populate: {
            path: 'refereeId',
            select: 'firstName lastName email'
          }
        });

      if (!transaction) {
        return res.status(404).json(createResponse(false, 'Transaction not found'));
      }

      // Transform transaction based on user perspective
      const isUserSender = transaction.fromUserId?._id?.toString() === userId.toString();
      const isUserRecipient = transaction.toUserId?._id?.toString() === userId.toString();

      let displayType = transaction.type;
      let displayDescription = transaction.description;

      // Determine display type based on user perspective
      if (transaction.type === 'send' || transaction.type === 'receive') {
        if (isUserSender) {
          displayType = 'send';
          if (transaction.toUserId) {
            displayDescription = `Sent to ${transaction.toUserId.firstName} ${transaction.toUserId.lastName}`;
          }
        } else if (isUserRecipient) {
          displayType = 'receive';
          if (transaction.fromUserId) {
            displayDescription = `Received from ${transaction.fromUserId.firstName} ${transaction.fromUserId.lastName}`;
          }
        }
      }

      const transformedTransaction = {
        id: transaction._id,
        type: displayType,
        amount: transaction.amount,
        status: transaction.status,
        description: displayDescription,
        createdAt: transaction.createdAt,
        fee: transaction.fee || 0,
        toAddress: transaction.toAddress,
        taskId: transaction.taskId || null,
        fromUser: transaction.fromUserId ? {
          id: transaction.fromUserId._id,
          firstName: transaction.fromUserId.firstName,
          lastName: transaction.fromUserId.lastName
        } : null,
        toUser: transaction.toUserId ? {
          id: transaction.toUserId._id,
          firstName: transaction.toUserId.firstName,
          lastName: transaction.toUserId.lastName
        } : null,
        referral: transaction.referralId ? {
          id: transaction.referralId._id,
          code: transaction.referralId.referralCode,
          referee: transaction.referralId.refereeId ? {
            firstName: transaction.referralId.refereeId.firstName,
            lastName: transaction.referralId.refereeId.lastName,
            email: transaction.referralId.refereeId.email
          } : null
        } : null
      };

      res.json(createResponse(true, 'Transaction retrieved successfully', { transaction: transformedTransaction }));
    } catch (error) {
      next(error);
    }
  }

  async sendTokens(req, res, next) {
    try {
      const userId = req.user.userId;
      const { toAddress, amount, description } = req.body;

      // Find sender wallet
      const senderWallet = await mongodbService.findWalletByUserId(userId);
      if (!senderWallet) {
        return res.status(404).json(createResponse(false, 'Sender wallet not found'));
      }

      // Validate sender has sufficient sendable balance
      if (amount > senderWallet.sendableBalance) {
        return res.status(400).json(createResponse(false, 'Insufficient sendable balance'));
      }

      // Find and validate recipient
      const recipient = await mongodbService.findUserByWalletAddress(toAddress);
      if (!recipient) {
        return res.status(404).json(createResponse(false, 'Recipient wallet address not found'));
      }

      const recipientWallet = recipient.wallet;
      if (!recipientWallet) {
        return res.status(404).json(createResponse(false, 'Recipient wallet not found'));
      }

      // Prevent self-sending
      if (userId === recipient.id) {
        return res.status(400).json(createResponse(false, 'Cannot send tokens to yourself'));
      }

      // Create sender transaction (debit)
      const senderTransaction = await mongodbService.createTransaction({
        fromUserId: userId,
        toUserId: recipient.id,
        toAddress,
        amount,
        type: 'send',
        status: 'completed',
        description: description || `Sent to ${recipient.firstName} ${recipient.lastName}`,
        fee: 0 // No fees as requested
      });

      // Create recipient transaction (credit)
      const recipientTransaction = await mongodbService.createTransaction({
        fromUserId: userId,
        toUserId: recipient.id,
        toAddress,
        amount,
        type: 'receive',
        status: 'completed',
        description: description || `Received from ${senderWallet.userId}`,
        fee: 0
      });

      // Update sender wallet (deduct from sendable balance)
      const newSenderSendableBalance = senderWallet.sendableBalance - amount;
      await mongodbService.updateWallet(senderWallet.id, {
        sendableBalance: newSenderSendableBalance,
        totalBalance: newSenderSendableBalance + senderWallet.nonSendableBalance + senderWallet.pendingBalance,
        totalSent: (senderWallet.totalSent || 0) + amount,
        lastActivity: new Date()
      });

      // Update recipient wallet (add to sendable balance)
      const newRecipientSendableBalance = recipientWallet.sendableBalance + amount;
      await mongodbService.updateWallet(recipientWallet.id, {
        sendableBalance: newRecipientSendableBalance,
        totalBalance: newRecipientSendableBalance + recipientWallet.nonSendableBalance + recipientWallet.pendingBalance,
        totalReceived: (recipientWallet.totalReceived || 0) + amount,
        lastActivity: new Date()
      });

      // Track achievement progress for transactions
      try {
        await achievementService.trackTransactionProgress(userId, {
          transactionId: senderTransaction.id,
          amount,
          type: 'send',
          recipientId: recipient.id
        });
      } catch (achievementError) {
        console.error('Error tracking transaction achievement progress:', achievementError);
        // Don't fail the transaction if achievement tracking fails
      }

      res.status(201).json(createResponse(true, 'Transaction completed successfully', {
        transaction: senderTransaction,
        recipient: {
          name: `${recipient.firstName} ${recipient.lastName}`,
          address: toAddress
        }
      }));
    } catch (error) {
      next(error);
    }
  }

  async sendTokensByEmail(req, res, next) {
    try {
      const userId = req.user.userId;
      const { toEmail, amount, description } = req.body;

      console.log(`🚀 WalletController: Sending ${amount} CELF to ${toEmail}...`);

      // Get sender wallet
      const senderWallet = await mongodbService.findWalletByUserId(userId);
      if (!senderWallet) {
        return res.status(404).json(createResponse(false, 'Sender wallet not found'));
      }

      // Check balance
      if (amount > senderWallet.sendableBalance) {
        return res.status(400).json(createResponse(false, 'Insufficient sendable balance'));
      }

      // Find recipient by email
      const recipient = await mongodbService.findUserByEmail(toEmail);
      if (!recipient) {
        return res.status(404).json(createResponse(false, 'Recipient not found with this email address'));
      }

      // Get recipient wallet
      const recipientWallet = await mongodbService.findWalletByUserId(recipient.id);
      if (!recipientWallet) {
        return res.status(404).json(createResponse(false, 'Recipient wallet not found'));
      }

      // Prevent self-sending
      if (userId === recipient.id) {
        return res.status(400).json(createResponse(false, 'Cannot send tokens to yourself'));
      }

      console.log(`📊 WalletController: Transfer details:`, {
        sender: userId,
        recipient: recipient.id,
        amount,
        senderBalance: senderWallet.sendableBalance
      });

      // Create single transaction record (will be displayed differently based on user perspective)
      const transaction = await mongodbService.createTransaction({
        fromUserId: userId,
        toUserId: recipient.id,
        toAddress: recipientWallet.currentAddress,
        amount,
        type: 'send', // Use 'send' as the transaction type (valid enum value)
        status: 'completed',
        description: description || `Transfer between ${req.user.email} and ${recipient.email}`,
        fee: 0
      });

      // Update sender wallet (deduct from sendable balance)
      const newSenderSendableBalance = senderWallet.sendableBalance - amount;
      await mongodbService.updateWallet(senderWallet.id, {
        sendableBalance: newSenderSendableBalance,
        totalBalance: newSenderSendableBalance + senderWallet.nonSendableBalance + senderWallet.pendingBalance,
        totalSent: (senderWallet.totalSent || 0) + amount,
        lastActivity: new Date()
      });

      // Update recipient wallet (add to sendable balance)
      const newRecipientSendableBalance = recipientWallet.sendableBalance + amount;
      await mongodbService.updateWallet(recipientWallet.id, {
        sendableBalance: newRecipientSendableBalance,
        totalBalance: newRecipientSendableBalance + recipientWallet.nonSendableBalance + recipientWallet.pendingBalance,
        totalReceived: (recipientWallet.totalReceived || 0) + amount,
        lastActivity: new Date()
      });

      // Track achievement progress for transactions
      try {
        await achievementService.trackTransactionProgress(userId, {
          transactionId: transaction.id,
          amount,
          type: 'send',
          recipientId: recipient.id
        });
      } catch (achievementError) {
        console.error('Error tracking transaction achievement progress:', achievementError);
        // Don't fail the transaction if achievement tracking fails
      }

      console.log(`✅ WalletController: Transfer completed successfully`);
      console.log(`✅ WalletController: Transaction object:`, {
        id: transaction.id,
        _id: transaction._id,
        type: transaction.type,
        amount: transaction.amount,
        status: transaction.status,
        description: transaction.description,
        keys: Object.keys(transaction)
      });

      res.status(201).json(createResponse(true, 'Transaction completed successfully', {
        transaction: transaction,
        recipient: {
          name: `${recipient.firstName} ${recipient.lastName}`,
          email: recipient.email
        }
      }));
    } catch (error) {
      console.error('❌ WalletController: Send by email failed:', error);
      next(error);
    }
  }

  async exchangeTokens(req, res, next) {
    try {
      const userId = req.user.userId;
      const { amount, fromType, toType } = req.body;

      const wallet = await mongodbService.findWalletByUserId(userId);
      if (!wallet) {
        return res.status(404).json(createResponse(false, 'Wallet not found'));
      }

      if (fromType === toType) {
        return res.status(400).json(createResponse(false, 'Cannot exchange to the same token type'));
      }

      if (fromType === 'sendable' && amount > wallet.sendableBalance) {
        return res.status(400).json(createResponse(false, 'Insufficient sendable balance'));
      }

      if (fromType === 'nonSendable' && amount > wallet.nonSendableBalance) {
        return res.status(400).json(createResponse(false, 'Insufficient non-sendable balance'));
      }

      // Calculate new balances
      let newSendableBalance = wallet.sendableBalance;
      let newNonSendableBalance = wallet.nonSendableBalance;

      if (fromType === 'sendable' && toType === 'nonSendable') {
        newSendableBalance -= amount;
        newNonSendableBalance += amount;
      } else if (fromType === 'nonSendable' && toType === 'sendable') {
        newNonSendableBalance -= amount;
        newSendableBalance += amount;
      }

      // Update wallet using mongodbService
      const updatedWallet = await mongodbService.updateWallet(wallet.id, {
        sendableBalance: newSendableBalance,
        nonSendableBalance: newNonSendableBalance,
        totalBalance: newSendableBalance + newNonSendableBalance + wallet.pendingBalance,
      });

      // Create transaction record for exchange
      const transaction = await mongodbService.createTransaction({
        fromUserId: userId,
        toUserId: userId,
        amount,
        type: 'exchange',
        status: 'completed',
        description: `Exchanged ${amount} CELF from ${fromType === 'sendable' ? 'Sendable' : 'Non-Sendable'} to ${toType === 'sendable' ? 'Sendable' : 'Non-Sendable'}`,
        fee: 0,
        exchangeDetails: {
          fromType,
          toType,
          rate: 1.0
        }
      });

      res.json(createResponse(true, 'Token exchange completed successfully', {
        newBalance: {
          sendable: updatedWallet.sendableBalance,
          nonSendable: updatedWallet.nonSendableBalance,
          total: updatedWallet.totalBalance
        },
        transaction: transaction // Return real transaction
      }));
    } catch (error) {
      next(error);
    }
  }

  async getExchangeRates(req, res, next) {
    try {
      // Mock exchange rates
      const rates = {
        CELF_USD: 0.25,
        sendableToNonSendable: 1.0,
        nonSendableToSendable: 1.0
      };

      res.json(createResponse(true, 'Exchange rates retrieved successfully', { rates }));
    } catch (error) {
      next(error);
    }
  }

  async addMiningReward(req, res, next) {
    try {
      const userId = req.user.userId;
      const { amount, sessionId } = req.body;

      const wallet = await mongodbService.findWalletByUserId(userId);
      if (!wallet) {
        return res.status(404).json(createResponse(false, 'Wallet not found'));
      }

      // Add mining reward to non-sendable balance
      const newNonSendableBalance = wallet.nonSendableBalance + amount;
      const newTotalBalance = wallet.sendableBalance + newNonSendableBalance + wallet.pendingBalance;

      await mongodbService.updateWallet(wallet.id, {
        nonSendableBalance: newNonSendableBalance,
        totalBalance: newTotalBalance,
        totalMined: (wallet.totalMined || 0) + amount,
        lastActivity: new Date()
      });

      // Create transaction record
      const transaction = await mongodbService.createTransaction({
        toUserId: userId,
        amount,
        type: 'mining',
        status: 'completed',
        description: 'Mining reward',
        sessionId
      });

      res.json(createResponse(true, 'Mining reward added successfully', {
        newBalance: newTotalBalance,
        transaction
      }));
    } catch (error) {
      next(error);
    }
  }

  async getWalletStats(req, res, next) {
    try {
      const userId = req.user.userId;

      const wallet = await mongodbService.findWalletByUserId(userId);
      if (!wallet) {
        return res.status(404).json(createResponse(false, 'Wallet not found'));
      }

      const totalTransactions = await mongodbService.count('Transaction', {
        $or: [{ fromUserId: userId }, { toUserId: userId }]
      });

      const totalSent = await mongodbService.aggregate('Transaction', [
        { $match: { fromUserId: userId, type: 'send', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const totalReceived = await mongodbService.aggregate('Transaction', [
        { $match: { toUserId: userId, type: 'receive', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const totalMined = await mongodbService.aggregate('Transaction', [
        { $match: { toUserId: userId, type: 'mining', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const stats = {
        totalBalance: wallet.totalBalance,
        totalTransactions,
        totalSent: totalSent[0]?.total || 0,
        totalReceived: totalReceived[0]?.total || 0,
        totalMined: totalMined[0]?.total || 0
      };

      res.json(createResponse(true, 'Wallet statistics retrieved successfully', { stats }));
    } catch (error) {
      next(error);
    }
  }

  async getPreferences(req, res, next) {
    try {
      const userId = req.user.userId;
      const wallet = await Wallet.findOne({ userId });

      if (!wallet) {
        return res.status(404).json(createResponse(false, 'Wallet not found'));
      }

      res.json(createResponse(true, 'Preferences retrieved successfully', {
        preferences: wallet.preferences
      }));
    } catch (error) {
      next(error);
    }
  }

  async updatePreferences(req, res, next) {
    try {
      const userId = req.user.userId;
      const { currency, notifications } = req.body;

      const wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        return res.status(404).json(createResponse(false, 'Wallet not found'));
      }

      if (currency) wallet.preferences.currency = currency;
      if (notifications !== undefined) wallet.preferences.notifications = notifications;

      await wallet.save();

      res.json(createResponse(true, 'Preferences updated successfully', {
        preferences: wallet.preferences
      }));
    } catch (error) {
      next(error);
    }
  }

  async getRecentRecipients(req, res, next) {
    try {
      const userId = req.user.userId;
      const limit = parseInt(req.query.limit) || 5;

      console.log('🔍 WalletController: getRecentRecipients called');
      console.log('👤 Authenticated user ID:', userId);
      console.log('📄 Limit:', limit);

      // Find recent transactions where the user sent tokens
      const recentTransactions = await Transaction.find({
        fromUserId: userId,
        type: 'send',
        status: 'completed'
      })
        .sort({ createdAt: -1 })
        .limit(limit * 2) // Get more to account for duplicates
        .populate('toUserId', 'firstName lastName email')
        .select('toUserId createdAt amount');

      console.log(`📊 Found ${recentTransactions.length} recent send transactions`);

      // Extract unique recipients
      const uniqueRecipients = [];
      const seenUserIds = new Set();

      for (const transaction of recentTransactions) {
        if (transaction.toUserId && !seenUserIds.has(transaction.toUserId._id.toString())) {
          seenUserIds.add(transaction.toUserId._id.toString());
          uniqueRecipients.push({
            id: transaction.toUserId._id,
            firstName: transaction.toUserId.firstName,
            lastName: transaction.toUserId.lastName,
            email: transaction.toUserId.email,
            lastTransactionDate: transaction.createdAt,
            lastTransactionAmount: transaction.amount
          });

          if (uniqueRecipients.length >= limit) {
            break;
          }
        }
      }

      console.log(`📋 Returning ${uniqueRecipients.length} unique recent recipients`);

      res.json(createResponse(true, 'Recent recipients retrieved successfully', {
        recipients: uniqueRecipients
      }));
    } catch (error) {
      console.error('❌ WalletController: getRecentRecipients error:', error);
      next(error);
    }
  }
}

module.exports = new WalletController();
