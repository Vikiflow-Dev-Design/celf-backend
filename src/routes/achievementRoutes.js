const express = require('express');
const { z } = require('zod');
const achievementController = require('../controllers/achievementController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validate, validateQuery, validateParams } = require('../middleware/validationMiddleware');
const {
  achievementQuerySchema,
  createAchievementSchema,
  updateAchievementSchema,
  updateProgressSchema,
} = require('../validators/achievementValidator');

const router = express.Router();

// Param schemas (inline — simple enough)
const achievementIdParamSchema = z.object({
  achievementId: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Achievement ID can only contain letters, numbers, hyphens, and underscores'),
});

const mongoIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Valid achievement ID is required'),
});

const userAndAchievementParamSchema = z.object({
  userId: z.string().regex(/^[a-f\d]{24}$/i, 'Valid user ID is required'),
  achievementId: z.string().min(1, 'Achievement ID is required').max(50),
});

// Public user routes (require authentication)
router.get('/',
  authenticate,
  validateQuery(achievementQuerySchema),
  achievementController.getUserAchievements
);

router.get('/stats',
  authenticate,
  achievementController.getUserStats
);

router.get('/:achievementId',
  authenticate,
  validateParams(achievementIdParamSchema),
  achievementController.getAchievementDetails
);

router.post('/:achievementId/claim',
  authenticate,
  validateParams(achievementIdParamSchema),
  achievementController.claimReward
);

router.post('/initialize',
  authenticate,
  achievementController.initializeUserAchievements
);

// Admin routes (require admin authorization)
router.get('/admin/all',
  authenticate,
  authorize(['admin']),
  achievementController.getAllAchievements
);

router.post('/admin/create',
  authenticate,
  authorize(['admin']),
  validate(createAchievementSchema),
  achievementController.createAchievement
);

router.put('/admin/:id',
  authenticate,
  authorize(['admin']),
  validateParams(mongoIdParamSchema),
  validate(updateAchievementSchema),
  achievementController.updateAchievement
);

router.delete('/admin/:id',
  authenticate,
  authorize(['admin']),
  validateParams(mongoIdParamSchema),
  achievementController.deleteAchievement
);

router.put('/admin/users/:userId/:achievementId/progress',
  authenticate,
  authorize(['admin']),
  validateParams(userAndAchievementParamSchema),
  validate(updateProgressSchema),
  achievementController.updateUserProgress
);

// Error handling middleware specific to achievement routes
router.use((error, req, res, next) => {
  console.error('Achievement route error:', error);

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }))
    });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Achievement with this ID already exists'
    });
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

module.exports = router;

