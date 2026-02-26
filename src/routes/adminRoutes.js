const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const adminController = require('../controllers/adminController');
const newsletterController = require('../controllers/newsletterController');
const socialLinksRoutes = require('./admin/socialLinksRoutes');
const {
  updateUserSchema,
  miningSettingsSchema,
  systemSettingsSchema,
  submissionStatusSchema,
  campaignSchema,
  applicationStatusSchema,
} = require('../validators/adminValidator');

// Temporarily disable authentication for demo purposes
// TODO: Re-enable authentication when admin accounts are set up
// router.use(authenticate);
// router.use(authorize(['admin', 'moderator']));

// Health check for admin settings
router.get('/health/settings', adminController.checkAdminSettings);

// Dashboard & Analytics
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/dashboard/recent-activity', adminController.getRecentActivity);
router.get('/analytics/users', adminController.getUserAnalytics);
router.get('/analytics/mining', adminController.getMiningAnalytics);
router.get('/analytics/transactions', adminController.getTransactionAnalytics);

// User Management
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', validate(updateUserSchema), adminController.updateUser);
router.post('/users/:id/suspend', adminController.suspendUser);
router.post('/users/:id/activate', adminController.activateUser);
router.delete('/users/:id', adminController.deleteUser);

// Mining Management
router.get('/mining/sessions', adminController.getMiningSessions);
router.get('/mining/settings', adminController.getMiningSettings);
router.put('/mining/settings', validate(miningSettingsSchema), adminController.updateMiningSettings);
router.post('/mining/sessions/:id/terminate', adminController.terminateMiningSession);
router.post('/mining/sessions/:id/pause', adminController.pauseMiningSession);
router.post('/mining/sessions/:id/resume', adminController.resumeMiningSession);

// Wallet Management
router.get('/wallets/stats', adminController.getWalletStats);
router.get('/wallets', adminController.getAllWallets);
router.get('/wallets/:id', adminController.getWalletById);
router.get('/wallets/transactions/recent', adminController.getRecentTransactions);

// Content Management
router.get('/content/contact-submissions', adminController.getContactSubmissions);
router.get('/content/contact-submissions/:id', adminController.getContactSubmissionById);
router.put('/content/contact-submissions/:id/status', validate(submissionStatusSchema), adminController.updateContactSubmissionStatus);
router.delete('/content/contact-submissions/:id', adminController.deleteContactSubmission);

router.get('/content/newsletter-subscriptions', newsletterController.getSubscribers);
router.delete('/content/newsletter-subscriptions/:id', newsletterController.deleteSubscriber);

router.get('/content/newsletter-campaigns', newsletterController.getCampaigns);
router.post('/content/newsletter-campaigns', validate(campaignSchema), newsletterController.createCampaign);
router.get('/content/newsletter-campaigns/:id', newsletterController.getCampaignById);
router.put('/content/newsletter-campaigns/:id', newsletterController.updateCampaign);
router.post('/content/newsletter-campaigns/:id/send', newsletterController.sendCampaign);

router.get('/content/mentorship-applications', adminController.getMentorshipApplications);
router.get('/content/mentorship-applications/:id', adminController.getMentorshipApplicationById);
router.put('/content/mentorship-applications/:id/status', validate(applicationStatusSchema), adminController.updateMentorshipApplicationStatus);

router.get('/content/scholarship-applications', adminController.getScholarshipApplications);
router.get('/content/scholarship-applications/:id', adminController.getScholarshipApplicationById);
router.put('/content/scholarship-applications/:id/status', validate(applicationStatusSchema), adminController.updateScholarshipApplicationStatus);

// System Settings
router.get('/settings', adminController.getSystemSettings);
router.put('/settings', validate(systemSettingsSchema), adminController.updateSystemSettings);

// Social Links Management
router.use('/social-links', socialLinksRoutes);

// Security & Audit
router.get('/security/audit-logs', adminController.getAuditLogs);
router.get('/security/login-attempts', adminController.getLoginAttempts);
router.get('/security/suspicious-activities', adminController.getSuspiciousActivities);

module.exports = router;
