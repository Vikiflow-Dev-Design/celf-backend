const express = require('express');
const router = express.Router();
const donationController = require('../controllers/donationController');

// Admin/List donations (simple, unprotected)
router.get('/', donationController.list);

// Initialize a donation (returns Paystack authorization URL)
router.post('/initialize', donationController.initialize);

// Verify a donation by reference
router.get('/verify/:reference', donationController.verify);

// Paystack webhook endpoint
router.post('/webhook', donationController.webhook);

module.exports = router;