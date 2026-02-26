const mongodbService = require('../services/mongodbService');
const { createResponse } = require('../utils/responseUtils');

class ScholarshipController {
  async getScholarshipPrograms(req, res, next) {
    try {
      const mockPrograms = [
        {
          id: '1',
          name: 'CELF Academic Excellence Scholarship',
          description: 'Supporting outstanding students in blockchain and cryptocurrency studies',
          awardAmount: 5000,
          numberOfAwards: 10,
          applicationDeadline: '2024-06-30T23:59:59Z',
          eligibilityCriteria: ['Minimum 1000 CELF tokens', 'GPA 3.5+', 'Enrolled in relevant program'],
          isActive: true
        },
        {
          id: '2',
          name: 'CELF Innovation Grant',
          description: 'For students working on innovative blockchain projects',
          awardAmount: 3000,
          numberOfAwards: 5,
          applicationDeadline: '2024-08-15T23:59:59Z',
          eligibilityCriteria: ['Minimum 500 CELF tokens', 'Active project portfolio', 'Technical background'],
          isActive: true
        }
      ];

      res.json(createResponse(true, 'Scholarship programs retrieved successfully', { programs: mockPrograms }));
    } catch (error) {
      next(error);
    }
  }

  async getScholarshipProgramById(req, res, next) {
    try {
      const { id } = req.params;

      const mockProgram = {
        id,
        name: 'CELF Academic Excellence Scholarship',
        description: 'Supporting outstanding students in blockchain and cryptocurrency studies',
        awardAmount: 5000,
        numberOfAwards: 10,
        applicationDeadline: '2024-06-30T23:59:59Z',
        eligibilityCriteria: [
          'Minimum 1000 CELF tokens in wallet',
          'Minimum GPA of 3.5',
          'Enrolled in computer science, finance, or related program',
          'Demonstrate financial need'
        ],
        requiredDocuments: ['Transcript', 'ID', 'Enrollment verification', 'Financial documents'],
        selectionCriteria: 'Academic merit, financial need, essay quality, references',
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z'
      };

      res.json(createResponse(true, 'Scholarship program retrieved successfully', { program: mockProgram }));
    } catch (error) {
      next(error);
    }
  }

  async getApplicationRequirements(req, res, next) {
    try {
      const mockRequirements = {
        minimumTokenBalance: 1000,
        requiredDocuments: [
          { type: 'id', name: 'Government-issued ID', required: true },
          { type: 'transcript', name: 'Official transcript', required: true },
          { type: 'enrollment', name: 'Enrollment verification', required: true },
          { type: 'financial', name: 'Financial need documentation', required: false }
        ],
        essayRequirements: {
          personalStatement: { minWords: 200, maxWords: 2000 },
          whyCELF: { minWords: 100, maxWords: 1000 }
        },
        referenceRequirements: {
          minimum: 2,
          maximum: 3,
          types: ['Academic', 'Professional', 'Personal']
        }
      };

      res.json(createResponse(true, 'Application requirements retrieved successfully', { requirements: mockRequirements }));
    } catch (error) {
      next(error);
    }
  }

  async submitApplication(req, res, next) {
    try {
      const applicationData = req.body;

      const mockApplication = {
        id: 'mock-scholarship-application-id',
        ...applicationData,
        status: 'submitted',
        submittedAt: new Date().toISOString(),
        applicationNumber: `CELF-${Date.now()}`
      };

      res.status(201).json(createResponse(true, 'Scholarship application submitted successfully', { application: mockApplication }));
    } catch (error) {
      next(error);
    }
  }

  async uploadDocument(req, res, next) {
    try {
      const { applicationId, documentType, fileName, fileSize, mimeType } = req.body;

      const mockDocument = {
        id: 'mock-document-id',
        applicationId,
        documentType,
        fileName,
        fileSize,
        mimeType,
        uploadedAt: new Date().toISOString(),
        status: 'uploaded'
      };

      res.status(201).json(createResponse(true, 'Document uploaded successfully', { document: mockDocument }));
    } catch (error) {
      next(error);
    }
  }

  async getApplicationStatus(req, res, next) {
    try {
      const { email } = req.params;

      const mockStatus = {
        email,
        applications: [
          {
            id: '1',
            applicationNumber: 'CELF-1234567890',
            programName: 'CELF Academic Excellence Scholarship',
            status: 'under_review',
            submittedAt: new Date(Date.now() - 86400000).toISOString(),
            lastUpdated: new Date(Date.now() - 43200000).toISOString()
          }
        ]
      };

      res.json(createResponse(true, 'Application status retrieved successfully', mockStatus));
    } catch (error) {
      next(error);
    }
  }

  async getApplicationStatusById(req, res, next) {
    try {
      const { id } = req.params;

      const mockStatus = {
        id,
        applicationNumber: 'CELF-1234567890',
        status: 'under_review',
        submittedAt: new Date(Date.now() - 86400000).toISOString(),
        lastUpdated: new Date(Date.now() - 43200000).toISOString(),
        timeline: [
          { status: 'submitted', date: new Date(Date.now() - 86400000).toISOString() },
          { status: 'under_review', date: new Date(Date.now() - 43200000).toISOString() }
        ]
      };

      res.json(createResponse(true, 'Application status retrieved successfully', mockStatus));
    } catch (error) {
      next(error);
    }
  }

  async getMyApplications(req, res, next) {
    try {
      const mockApplications = [
        {
          id: '1',
          applicationNumber: 'CELF-1234567890',
          programName: 'CELF Academic Excellence Scholarship',
          status: 'under_review',
          submittedAt: new Date(Date.now() - 86400000).toISOString(),
          awardAmount: 5000
        }
      ];

      res.json(createResponse(true, 'Applications retrieved successfully', { applications: mockApplications }));
    } catch (error) {
      next(error);
    }
  }

  async getMyApplicationById(req, res, next) {
    try {
      const { id } = req.params;

      const mockApplication = {
        id,
        applicationNumber: 'CELF-1234567890',
        programName: 'CELF Academic Excellence Scholarship',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        status: 'under_review',
        submittedAt: new Date(Date.now() - 86400000).toISOString(),
        documents: [
          { type: 'id', status: 'verified' },
          { type: 'transcript', status: 'verified' },
          { type: 'enrollment', status: 'pending' }
        ]
      };

      res.json(createResponse(true, 'Application retrieved successfully', { application: mockApplication }));
    } catch (error) {
      next(error);
    }
  }

  async updateMyApplication(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const mockApplication = {
        id,
        ...updateData,
        updatedAt: new Date().toISOString()
      };

      res.json(createResponse(true, 'Application updated successfully', { application: mockApplication }));
    } catch (error) {
      next(error);
    }
  }

  async getMyApplicationDocuments(req, res, next) {
    try {
      const { id } = req.params;

      const mockDocuments = [
        {
          id: '1',
          applicationId: id,
          type: 'id',
          fileName: 'drivers_license.pdf',
          status: 'verified',
          uploadedAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: '2',
          applicationId: id,
          type: 'transcript',
          fileName: 'official_transcript.pdf',
          status: 'verified',
          uploadedAt: new Date(Date.now() - 86400000).toISOString()
        }
      ];

      res.json(createResponse(true, 'Documents retrieved successfully', { documents: mockDocuments }));
    } catch (error) {
      next(error);
    }
  }

  async deleteDocument(req, res, next) {
    try {
      const { documentId } = req.params;

      res.json(createResponse(true, 'Document deleted successfully', { documentId }));
    } catch (error) {
      next(error);
    }
  }

  async getMyAwards(req, res, next) {
    try {
      const mockAwards = [
        {
          id: '1',
          programName: 'CELF Academic Excellence Scholarship',
          amount: 5000,
          status: 'active',
          awardedAt: new Date(Date.now() - 2592000000).toISOString(), // 30 days ago
          disbursements: [
            { amount: 2500, scheduledDate: '2024-08-15', status: 'completed' },
            { amount: 2500, scheduledDate: '2024-12-15', status: 'scheduled' }
          ]
        }
      ];

      res.json(createResponse(true, 'Awards retrieved successfully', { awards: mockAwards }));
    } catch (error) {
      next(error);
    }
  }

  async getMyDisbursements(req, res, next) {
    try {
      const { id } = req.params;

      const mockDisbursements = [
        {
          id: '1',
          awardId: id,
          amount: 2500,
          scheduledDate: '2024-08-15',
          disbursedDate: '2024-08-15',
          method: 'bank_transfer',
          status: 'completed',
          transactionReference: 'TXN-123456789'
        },
        {
          id: '2',
          awardId: id,
          amount: 2500,
          scheduledDate: '2024-12-15',
          method: 'bank_transfer',
          status: 'scheduled'
        }
      ];

      res.json(createResponse(true, 'Disbursements retrieved successfully', { disbursements: mockDisbursements }));
    } catch (error) {
      next(error);
    }
  }

  // Admin methods would go here with similar mock implementations
  async getAllApplications(req, res, next) {
    try {
      const mockApplications = [
        {
          id: '1',
          applicationNumber: 'CELF-1234567890',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          programName: 'CELF Academic Excellence Scholarship',
          status: 'under_review',
          submittedAt: new Date(Date.now() - 86400000).toISOString(),
          score: null
        },
        {
          id: '2',
          applicationNumber: 'CELF-0987654321',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          programName: 'CELF Innovation Grant',
          status: 'approved',
          submittedAt: new Date(Date.now() - 172800000).toISOString(),
          score: 85.5
        }
      ];

      res.json(createResponse(true, 'All applications retrieved successfully', {
        applications: mockApplications,
        pagination: { page: 1, limit: 10, total: 2, pages: 1 }
      }));
    } catch (error) {
      next(error);
    }
  }

  async getApplicationById(req, res, next) {
    try {
      const { id } = req.params;

      const mockApplication = {
        id,
        applicationNumber: 'CELF-1234567890',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        programName: 'CELF Academic Excellence Scholarship',
        status: 'under_review',
        submittedAt: new Date(Date.now() - 86400000).toISOString(),
        personalStatement: 'I am passionate about blockchain technology...',
        whyCELF: 'CELF represents the future of decentralized finance...',
        score: null,
        reviewNotes: null
      };

      res.json(createResponse(true, 'Application retrieved successfully', { application: mockApplication }));
    } catch (error) {
      next(error);
    }
  }

  async updateApplicationStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, reviewNotes } = req.body;

      const mockApplication = {
        id,
        status,
        reviewNotes,
        reviewedAt: new Date().toISOString()
      };

      res.json(createResponse(true, 'Application status updated successfully', { application: mockApplication }));
    } catch (error) {
      next(error);
    }
  }

  async scoreApplication(req, res, next) {
    try {
      const { id } = req.params;
      const { criteria, totalScore, comments, recommendation } = req.body;

      const mockScore = {
        applicationId: id,
        criteria,
        totalScore,
        comments,
        recommendation,
        scoredAt: new Date().toISOString()
      };

      res.json(createResponse(true, 'Application scored successfully', { score: mockScore }));
    } catch (error) {
      next(error);
    }
  }

  async createAward(req, res, next) {
    try {
      const awardData = req.body;

      const mockAward = {
        id: 'mock-award-id',
        ...awardData,
        status: 'active',
        awardedAt: new Date().toISOString()
      };

      res.status(201).json(createResponse(true, 'Award created successfully', { award: mockAward }));
    } catch (error) {
      next(error);
    }
  }

  async getAllAwards(req, res, next) {
    try {
      const mockAwards = [
        {
          id: '1',
          applicationId: '1',
          studentName: 'John Doe',
          programName: 'CELF Academic Excellence Scholarship',
          amount: 5000,
          status: 'active',
          awardedAt: new Date(Date.now() - 2592000000).toISOString()
        }
      ];

      res.json(createResponse(true, 'Awards retrieved successfully', {
        awards: mockAwards,
        pagination: { page: 1, limit: 10, total: 1, pages: 1 }
      }));
    } catch (error) {
      next(error);
    }
  }

  async getAwardById(req, res, next) {
    try {
      const { id } = req.params;

      const mockAward = {
        id,
        applicationId: '1',
        studentName: 'John Doe',
        programName: 'CELF Academic Excellence Scholarship',
        amount: 5000,
        status: 'active',
        disbursementSchedule: [
          { amount: 2500, date: '2024-08-15' },
          { amount: 2500, date: '2024-12-15' }
        ],
        awardedAt: new Date(Date.now() - 2592000000).toISOString()
      };

      res.json(createResponse(true, 'Award retrieved successfully', { award: mockAward }));
    } catch (error) {
      next(error);
    }
  }

  async updateAwardStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const mockAward = {
        id,
        status,
        updatedAt: new Date().toISOString()
      };

      res.json(createResponse(true, 'Award status updated successfully', { award: mockAward }));
    } catch (error) {
      next(error);
    }
  }

  async createDisbursement(req, res, next) {
    try {
      const disbursementData = req.body;

      const mockDisbursement = {
        id: 'mock-disbursement-id',
        ...disbursementData,
        status: 'scheduled',
        createdAt: new Date().toISOString()
      };

      res.status(201).json(createResponse(true, 'Disbursement created successfully', { disbursement: mockDisbursement }));
    } catch (error) {
      next(error);
    }
  }

  async getAllDisbursements(req, res, next) {
    try {
      const mockDisbursements = [
        {
          id: '1',
          awardId: '1',
          studentName: 'John Doe',
          amount: 2500,
          scheduledDate: '2024-08-15',
          method: 'bank_transfer',
          status: 'completed'
        },
        {
          id: '2',
          awardId: '1',
          studentName: 'John Doe',
          amount: 2500,
          scheduledDate: '2024-12-15',
          method: 'bank_transfer',
          status: 'scheduled'
        }
      ];

      res.json(createResponse(true, 'Disbursements retrieved successfully', {
        disbursements: mockDisbursements,
        pagination: { page: 1, limit: 10, total: 2, pages: 1 }
      }));
    } catch (error) {
      next(error);
    }
  }

  async updateDisbursementStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const mockDisbursement = {
        id,
        status,
        updatedAt: new Date().toISOString()
      };

      res.json(createResponse(true, 'Disbursement status updated successfully', { disbursement: mockDisbursement }));
    } catch (error) {
      next(error);
    }
  }

  async createScholarshipProgram(req, res, next) {
    try {
      const programData = req.body;

      const mockProgram = {
        id: 'mock-program-id',
        ...programData,
        isActive: true,
        createdAt: new Date().toISOString()
      };

      res.status(201).json(createResponse(true, 'Scholarship program created successfully', { program: mockProgram }));
    } catch (error) {
      next(error);
    }
  }

  async updateScholarshipProgram(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const mockProgram = {
        id,
        ...updateData,
        updatedAt: new Date().toISOString()
      };

      res.json(createResponse(true, 'Scholarship program updated successfully', { program: mockProgram }));
    } catch (error) {
      next(error);
    }
  }

  async getApplicationAnalytics(req, res, next) {
    try {
      const mockAnalytics = {
        totalApplications: 150,
        byStatus: {
          submitted: 45,
          under_review: 32,
          approved: 28,
          rejected: 35,
          waitlisted: 10
        },
        byProgram: {
          'CELF Academic Excellence': 85,
          'CELF Innovation Grant': 65
        },
        averageScore: 78.5,
        approvalRate: 18.7
      };

      res.json(createResponse(true, 'Application analytics retrieved successfully', { analytics: mockAnalytics }));
    } catch (error) {
      next(error);
    }
  }

  async getAwardAnalytics(req, res, next) {
    try {
      const mockAnalytics = {
        totalAwards: 28,
        totalAmount: 140000,
        averageAward: 5000,
        byProgram: {
          'CELF Academic Excellence': { count: 18, amount: 90000 },
          'CELF Innovation Grant': { count: 10, amount: 50000 }
        },
        activeAwards: 25,
        completedAwards: 3
      };

      res.json(createResponse(true, 'Award analytics retrieved successfully', { analytics: mockAnalytics }));
    } catch (error) {
      next(error);
    }
  }

  async getDisbursementAnalytics(req, res, next) {
    try {
      const mockAnalytics = {
        totalDisbursements: 56,
        totalDisbursed: 85000,
        pendingDisbursements: 15,
        pendingAmount: 55000,
        byMethod: {
          bank_transfer: 45,
          check: 8,
          digital_wallet: 3
        },
        monthlyDisbursements: [
          { month: '2024-01', amount: 15000 },
          { month: '2024-02', amount: 20000 },
          { month: '2024-03', amount: 25000 }
        ]
      };

      res.json(createResponse(true, 'Disbursement analytics retrieved successfully', { analytics: mockAnalytics }));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ScholarshipController();
