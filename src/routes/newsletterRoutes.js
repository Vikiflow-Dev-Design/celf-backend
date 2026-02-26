const express = require('express');
const router = express.Router();

const newsletterController = require('../controllers/newsletterController');
const { validate } = require('../middleware/validationMiddleware');
const {
  subscriptionSchema,
  unsubscribeSchema,
  preferencesSchema,
  campaignSchema,
} = require('../validators/newsletterValidator');

// Newsletter subscription
router.post('/subscribe', validate(subscriptionSchema), newsletterController.subscribe);

// Newsletter unsubscription
router.post('/unsubscribe', validate(unsubscribeSchema), newsletterController.unsubscribe);

// Unsubscribe via token (from email link)
router.get('/unsubscribe/:token', newsletterController.unsubscribeByToken);

// Update subscription preferences
router.put('/preferences', validate(preferencesSchema), newsletterController.updatePreferences);

// Get subscription status
router.get('/status/:email', newsletterController.getSubscriptionStatus);

// Admin routes for newsletter management
router.get('/subscribers', newsletterController.getSubscribers);
router.get('/subscribers/stats', newsletterController.getSubscriberStats);
router.delete('/subscribers/:id', newsletterController.deleteSubscriber);

// Newsletter campaign management (admin only)
router.post('/campaigns', validate(campaignSchema), newsletterController.createCampaign);
router.get('/campaigns', newsletterController.getCampaigns);
router.get('/campaigns/:id', newsletterController.getCampaignById);
router.put('/campaigns/:id', newsletterController.updateCampaign);
router.post('/campaigns/:id/send', newsletterController.sendCampaign);

// Newsletter analytics
router.get('/analytics/opens/:campaignId', newsletterController.getOpenAnalytics);
router.get('/analytics/clicks/:campaignId', newsletterController.getClickAnalytics);

module.exports = router;
