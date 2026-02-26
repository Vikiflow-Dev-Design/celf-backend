const express = require('express');
const router = express.Router();

const scholarshipController = require('../controllers/scholarshipController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const {
  scholarshipApplicationSchema,
  documentUploadSchema,
  updateApplicationStatusSchema,
  scoreApplicationSchema,
  createAwardSchema,
  createDisbursementSchema,
  createProgramSchema,
} = require('../validators/scholarshipValidator');

// Public routes
router.get('/programs', scholarshipController.getScholarshipPrograms);
router.get('/programs/:id', scholarshipController.getScholarshipProgramById);
router.get('/requirements', scholarshipController.getApplicationRequirements);

// Application submission
router.post('/apply', validate(scholarshipApplicationSchema), scholarshipController.submitApplication);

// Document upload
router.post('/documents/upload', validate(documentUploadSchema), scholarshipController.uploadDocument);

// Application status check
router.get('/application/status/:email', scholarshipController.getApplicationStatus);
router.get('/application/:id/status', scholarshipController.getApplicationStatusById);

// Authenticated routes
router.use(authenticate);

// User's scholarship applications
router.get('/my-applications', scholarshipController.getMyApplications);
router.get('/my-applications/:id', scholarshipController.getMyApplicationById);
router.put('/my-applications/:id', scholarshipController.updateMyApplication);

// Application documents management
router.get('/my-applications/:id/documents', scholarshipController.getMyApplicationDocuments);
router.delete('/documents/:documentId', scholarshipController.deleteDocument);

// Scholarship awards and disbursements
router.get('/my-awards', scholarshipController.getMyAwards);
router.get('/my-awards/:id/disbursements', scholarshipController.getMyDisbursements);

// Admin routes
router.use(authorize(['admin', 'scholarship_reviewer']));

// Application review and management
router.get('/applications', scholarshipController.getAllApplications);
router.get('/applications/:id', scholarshipController.getApplicationById);
router.put('/applications/:id/status', validate(updateApplicationStatusSchema), scholarshipController.updateApplicationStatus);

// Application scoring and evaluation
router.post('/applications/:id/score', validate(scoreApplicationSchema), scholarshipController.scoreApplication);

// Award management
router.post('/awards', validate(createAwardSchema), scholarshipController.createAward);
router.get('/awards', scholarshipController.getAllAwards);
router.get('/awards/:id', scholarshipController.getAwardById);
router.put('/awards/:id/status', scholarshipController.updateAwardStatus);

// Disbursement management
router.post('/disbursements', validate(createDisbursementSchema), scholarshipController.createDisbursement);
router.get('/disbursements', scholarshipController.getAllDisbursements);
router.put('/disbursements/:id/status', scholarshipController.updateDisbursementStatus);

// Scholarship program management
router.post('/programs', validate(createProgramSchema), scholarshipController.createScholarshipProgram);
router.put('/programs/:id', scholarshipController.updateScholarshipProgram);

// Analytics and reporting
router.get('/analytics/applications', scholarshipController.getApplicationAnalytics);
router.get('/analytics/awards', scholarshipController.getAwardAnalytics);
router.get('/analytics/disbursements', scholarshipController.getDisbursementAnalytics);

module.exports = router;
