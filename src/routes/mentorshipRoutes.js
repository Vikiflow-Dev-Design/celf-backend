const express = require('express');
const router = express.Router();

const mentorshipController = require('../controllers/mentorshipController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const {
  mentorApplicationSchema,
  menteeApplicationSchema,
  connectionStatusSchema,
  scheduleSessionSchema,
  completeSessionSchema,
  applicationStatusSchema,
} = require('../validators/mentorshipValidator');

// Public application routes
router.post('/apply/mentor', validate(mentorApplicationSchema), mentorshipController.applyAsMentor);
router.post('/apply/mentee', validate(menteeApplicationSchema), mentorshipController.applyAsMentee);

// Get available mentors (public)
router.get('/mentors', mentorshipController.getAvailableMentors);
router.get('/mentors/:id', mentorshipController.getMentorById);

// Application status check
router.get('/application/status/:email', mentorshipController.getApplicationStatus);

// Authenticated routes
router.use(authenticate); // All routes below require authentication

// User's mentorship profile and applications
router.get('/my-applications', mentorshipController.getMyApplications);
router.get('/my-profile', mentorshipController.getMyProfile);
router.put('/my-profile', mentorshipController.updateMyProfile);

// Mentorship matching and connections
router.get('/matches', mentorshipController.getMatches);
router.post('/connect/:mentorId', mentorshipController.requestConnection);
router.put('/connections/:connectionId/status', validate(connectionStatusSchema), mentorshipController.updateConnectionStatus);

// Mentorship sessions
router.get('/sessions', mentorshipController.getSessions);
router.post('/sessions', validate(scheduleSessionSchema), mentorshipController.scheduleSession);
router.get('/sessions/:id', mentorshipController.getSessionById);
router.put('/sessions/:id', mentorshipController.updateSession);
router.post('/sessions/:id/complete', validate(completeSessionSchema), mentorshipController.completeSession);

// Admin routes
router.use(authorize(['admin', 'moderator'])); // Admin/moderator only routes

router.get('/applications', mentorshipController.getAllApplications);
router.get('/applications/:id', mentorshipController.getApplicationById);
router.put('/applications/:id/status', validate(applicationStatusSchema), mentorshipController.updateApplicationStatus);

// Mentorship program statistics
router.get('/stats', mentorshipController.getMentorshipStats);

module.exports = router;
