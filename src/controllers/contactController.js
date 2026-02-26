const mongodbService = require('../services/mongodbService');
const { createResponse } = require('../utils/responseUtils');

class ContactController {
  async submitContactForm(req, res, next) {
    try {
      const { firstName, lastName, email, phone, company, inquiryType, subject, message } = req.body;

      // For now, just return success without saving to database
      const mockSubmission = {
        id: 'mock-submission-id',
        firstName,
        lastName,
        email,
        phone,
        company,
        inquiryType,
        subject,
        message,
        status: 'new',
        createdAt: new Date().toISOString()
      };

      res.status(201).json(createResponse(true, 'Contact form submitted successfully', { submission: mockSubmission }));
    } catch (error) {
      next(error);
    }
  }

  async createSupportTicket(req, res, next) {
    try {
      const { email, subject, description, priority, category, deviceInfo, attachments } = req.body;

      // For now, just return success without saving to database
      const mockTicket = {
        id: 'mock-ticket-id',
        email,
        subject,
        description,
        priority,
        category,
        status: 'open',
        deviceInfo,
        attachments,
        createdAt: new Date().toISOString()
      };

      res.status(201).json(createResponse(true, 'Support ticket created successfully', { ticket: mockTicket }));
    } catch (error) {
      next(error);
    }
  }

  async getContactSubmissions(req, res, next) {
    try {
      // Return mock contact submissions
      const mockSubmissions = [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          inquiryType: 'general',
          subject: 'Question about CELF',
          status: 'new',
          createdAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: '2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          inquiryType: 'technical',
          subject: 'Mining issue',
          status: 'in_progress',
          createdAt: new Date(Date.now() - 172800000).toISOString()
        }
      ];

      res.json(createResponse(true, 'Contact submissions retrieved successfully', {
        submissions: mockSubmissions,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          pages: 1
        }
      }));
    } catch (error) {
      next(error);
    }
  }

  async getSupportTickets(req, res, next) {
    try {
      // Return mock support tickets
      const mockTickets = [
        {
          id: '1',
          email: 'user@example.com',
          subject: 'Cannot access wallet',
          priority: 'high',
          category: 'wallet',
          status: 'open',
          createdAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: '2',
          email: 'user2@example.com',
          subject: 'Mining not working',
          priority: 'medium',
          category: 'mining',
          status: 'in_progress',
          createdAt: new Date(Date.now() - 172800000).toISOString()
        }
      ];

      res.json(createResponse(true, 'Support tickets retrieved successfully', {
        tickets: mockTickets,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          pages: 1
        }
      }));
    } catch (error) {
      next(error);
    }
  }

  async getSupportTicketById(req, res, next) {
    try {
      const { id } = req.params;

      const mockTicket = {
        id,
        email: 'user@example.com',
        subject: 'Cannot access wallet',
        description: 'I am unable to access my wallet after the recent update.',
        priority: 'high',
        category: 'wallet',
        status: 'open',
        responses: [],
        createdAt: new Date(Date.now() - 86400000).toISOString()
      };

      res.json(createResponse(true, 'Support ticket retrieved successfully', { ticket: mockTicket }));
    } catch (error) {
      next(error);
    }
  }

  async updateSupportTicketStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, response, assignedTo } = req.body;

      const mockTicket = {
        id,
        status,
        response,
        assignedTo,
        updatedAt: new Date().toISOString()
      };

      res.json(createResponse(true, 'Support ticket status updated successfully', { ticket: mockTicket }));
    } catch (error) {
      next(error);
    }
  }

  async addSupportTicketResponse(req, res, next) {
    try {
      const { id } = req.params;
      const { message, isPublic, attachments } = req.body;

      const mockResponse = {
        id: 'mock-response-id',
        ticketId: id,
        message,
        isPublic,
        attachments,
        createdAt: new Date().toISOString()
      };

      res.json(createResponse(true, 'Response added successfully', { response: mockResponse }));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ContactController();
