const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { validate } = require('../middleware/validationMiddleware');
const { authenticate } = require('../middleware/authMiddleware');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resendVerificationSchema,
} = require('../validators/authValidator');

// Debug route to test request parsing
router.post('/debug', (req, res) => {
  console.log('🐛 Debug endpoint - Request body:', JSON.stringify(req.body, null, 2));
  console.log('🐛 Debug endpoint - Headers:', JSON.stringify(req.headers, null, 2));
  res.json({
    success: true,
    message: 'Debug endpoint',
    receivedBody: req.body,
    bodyType: typeof req.body,
    bodyKeys: Object.keys(req.body || {})
  });
});

// Routes
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authenticate, authController.logout);
router.post('/refresh-token', authController.refreshToken);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/resend-verification', validate(resendVerificationSchema), authController.resendVerification);

module.exports = router;
