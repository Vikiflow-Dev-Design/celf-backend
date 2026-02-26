/**
 * Profile Routes
 * API routes for user profile management
 */

const express = require('express');
const profileController = require('../controllers/profileController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validate, validateQuery, validateParams } = require('../middleware/validationMiddleware');
const {
  updateProfileSchema,
  uploadPictureSchema,
  userIdParamSchema,
  searchQuerySchema,
  updateStatsSchema,
} = require('../validators/profileValidator');

const router = express.Router();

// Public user routes (require authentication)
router.get('/',
  authenticate,
  profileController.getProfile
);

router.put('/',
  authenticate,
  validate(updateProfileSchema),
  profileController.updateProfile
);

router.post('/picture',
  authenticate,
  validate(uploadPictureSchema),
  profileController.uploadProfilePicture
);

router.get('/completion',
  authenticate,
  profileController.getProfileCompletion
);

router.get('/search',
  authenticate,
  validateQuery(searchQuerySchema),
  profileController.searchUsers
);

router.get('/user/:userId',
  authenticate,
  validateParams(userIdParamSchema),
  profileController.getUserProfile
);

// Admin routes (require admin authorization)
router.put('/admin/:userId/stats',
  authenticate,
  authorize(['admin']),
  validateParams(userIdParamSchema),
  validate(updateStatsSchema),
  profileController.updateUserStats
);

module.exports = router;
