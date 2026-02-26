const express = require('express');
const taskController = require('../controllers/taskController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validate, validateQuery, validateParams } = require('../middleware/validationMiddleware');
const {
  createTaskSchema,
  updateTaskSchema,
  taskIdParamSchema,
  mongoIdParamSchema,
  userIdAndTaskIdParamSchema,
  taskQuerySchema,
  updateProgressSchema,
} = require('../validators/taskValidator');

const router = express.Router();

// Public user routes (require authentication)
router.get('/',
  authenticate,
  validateQuery(taskQuerySchema),
  taskController.getUserTasks
);

router.get('/stats',
  authenticate,
  taskController.getUserStats
);

router.get('/:taskId',
  authenticate,
  validateParams(taskIdParamSchema),
  taskController.getTaskDetails
);

router.post('/:taskId/complete',
  authenticate,
  validateParams(taskIdParamSchema),
  taskController.completeTask
);

router.post('/:taskId/claim',
  authenticate,
  validateParams(taskIdParamSchema),
  taskController.claimReward
);

router.post('/initialize',
  authenticate,
  taskController.initializeUserTasks
);

// Admin routes (no authentication required for now)
router.get('/admin/all',
  taskController.getAllTasks
);

router.get('/admin/:id',
  validateParams(mongoIdParamSchema),
  taskController.getTaskById
);

router.post('/admin/create',
  validate(createTaskSchema),
  taskController.createTask
);

router.put('/admin/:id',
  validateParams(mongoIdParamSchema),
  validate(updateTaskSchema),
  taskController.updateTask
);

router.delete('/admin/:id',
  validateParams(mongoIdParamSchema),
  taskController.deleteTask
);

router.put('/admin/users/:userId/:taskId/progress',
  authenticate,
  authorize(['admin']),
  validateParams(userIdAndTaskIdParamSchema),
  validate(updateProgressSchema),
  taskController.updateUserProgress
);

module.exports = router;
