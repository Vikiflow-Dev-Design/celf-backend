const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const miningRoutes = require('./miningRoutes');
const walletRoutes = require('./walletRoutes');
const referralRoutes = require('./referralRoutes');
const achievementRoutes = require('./achievementRoutes');
const taskRoutes = require('./taskRoutes');
const externalLinkSessionRoutes = require('./externalLinkSessionRoutes');
const profileRoutes = require('./profileRoutes');
const contactRoutes = require('./contactRoutes');
const newsletterRoutes = require('./newsletterRoutes');
const mentorshipRoutes = require('./mentorshipRoutes');
const scholarshipRoutes = require('./scholarshipRoutes');
const adminRoutes = require('./adminRoutes');
const youtubeRoutes = require('./youtubeRoutes');
const instagramRoutes = require('./instagramRoutes');
const donationRoutes = require('./donationRoutes');

// API version and welcome message
router.get('/', (req, res) => {
  res.json({
    message: 'Welcome to CELF API',
    version: '1.0.0',
    status: 'Authentication enabled - JWT required for protected endpoints',
    authentication: {
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      refreshToken: 'POST /api/auth/refresh-token'
    },
    endpoints: {
      // Mobile app endpoints
      auth: '/api/auth',
      users: '/api/users',
      mining: '/api/mining',
      wallet: '/api/wallet',
      referrals: '/api/referrals',
      achievements: '/api/achievements',
      tasks: '/api/tasks',
      externalLinkSessions: '/api/external-link-sessions',
      profile: '/api/profile',
      // Website endpoints
      contact: '/api/contact',
      newsletter: '/api/newsletter',
      mentorship: '/api/mentorship',
      scholarship: '/api/scholarship',
      donations: '/api/donations',
      // Admin endpoints
      admin: '/api/admin',
      // Social media endpoints
      youtube: '/api/youtube',
      instagram: '/api/instagram'
    }
  });
});

// Mobile app routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/mining', miningRoutes);
router.use('/wallet', walletRoutes);
router.use('/referrals', referralRoutes); // Support mobile app (plural)
router.use('/referral', referralRoutes);  // Support website (singular)
router.use('/achievements', achievementRoutes);
router.use('/tasks', taskRoutes);
router.use('/external-link-sessions', externalLinkSessionRoutes);
router.use('/profile', profileRoutes);

// Website routes
router.use('/contact', contactRoutes);
router.use('/newsletter', newsletterRoutes);
router.use('/mentorship', mentorshipRoutes);
router.use('/scholarship', scholarshipRoutes);
router.use('/donations', donationRoutes);

// Admin routes
router.use('/admin', adminRoutes);

// Social media routes
router.use('/youtube', youtubeRoutes);
router.use('/instagram', instagramRoutes);

module.exports = router;
