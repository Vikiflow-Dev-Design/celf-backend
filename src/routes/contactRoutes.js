const express = require('express');
const router = express.Router();

const contactController = require('../controllers/contactController');
const { validate } = require('../middleware/validationMiddleware');
const {
  contactFormSchema,
  supportTicketSchema,
  updateTicketStatusSchema,
  addTicketResponseSchema,
} = require('../validators/contactValidator');

// Contact form submission
router.post('/form', validate(contactFormSchema), contactController.submitContactForm);

// Support ticket creation
router.post('/support', validate(supportTicketSchema), contactController.createSupportTicket);

// Get contact form submissions (admin only)
router.get('/submissions', contactController.getContactSubmissions);

// Get support tickets
router.get('/support/tickets', contactController.getSupportTickets);
router.get('/support/tickets/:id', contactController.getSupportTicketById);

// Update support ticket status (admin only)
router.put('/support/tickets/:id/status', validate(updateTicketStatusSchema), contactController.updateSupportTicketStatus);

// Add response to support ticket
router.post('/support/tickets/:id/responses', validate(addTicketResponseSchema), contactController.addSupportTicketResponse);

module.exports = router;
