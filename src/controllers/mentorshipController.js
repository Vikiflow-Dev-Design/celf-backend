const mongodbService = require('../services/mongodbService');
const { createResponse } = require('../utils/responseUtils');

class MentorshipController {
  async applyAsMentor(req, res, next) {
    try {
      const applicationData = req.body;

      const payload = {
        type: 'mentor',
        firstName: applicationData.firstName,
        lastName: applicationData.lastName,
        email: (applicationData.email || '').toLowerCase(),
        phone: applicationData.phone,
        availability: applicationData.availability,
        education: applicationData.education,
        experience: applicationData.experience,
        expertise: Array.isArray(applicationData.expertise)
          ? applicationData.expertise
          : typeof applicationData.expertise === 'string'
            ? applicationData.expertise.split(',').map(s => s.trim()).filter(Boolean)
            : [],
        motivation: applicationData.motivation,
        linkedinProfile: applicationData.linkedinProfile,
        resumeUrl: applicationData.resumeUrl || applicationData.resume || undefined,
      };

      const created = await mongodbService.createMentorshipApplication(payload);

      res.status(201).json(createResponse(true, 'Mentor application submitted successfully', { application: created }));
    } catch (error) {
      next(error);
    }
  }

  async applyAsMentee(req, res, next) {
    try {
      const applicationData = req.body;

      const payload = {
        type: 'mentee',
        firstName: applicationData.firstName,
        lastName: applicationData.lastName,
        email: (applicationData.email || '').toLowerCase(),
        phone: applicationData.phone,
        availability: applicationData.availability,
        currentEducation: applicationData.currentEducation,
        goals: applicationData.goals,
        interests: Array.isArray(applicationData.interests)
          ? applicationData.interests
          : typeof applicationData.interests === 'string'
            ? applicationData.interests.split(',').map(s => s.trim()).filter(Boolean)
            : [],
        experience: applicationData.experience,
        challenges: applicationData.challenges,
      };

      const created = await mongodbService.createMentorshipApplication(payload);

      res.status(201).json(createResponse(true, 'Mentee application submitted successfully', { application: created }));
    } catch (error) {
      next(error);
    }
  }

  async getAvailableMentors(req, res, next) {
    try {
      const mockMentors = [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Smith',
          expertise: ['blockchain', 'cryptocurrency', 'mining'],
          experience: '5+ years in blockchain development',
          availability: { days: ['Monday', 'Wednesday', 'Friday'], hours: '18:00-20:00' },
          rating: 4.8
        },
        {
          id: '2',
          firstName: 'Sarah',
          lastName: 'Johnson',
          expertise: ['fintech', 'trading', 'investment'],
          experience: '8+ years in financial technology',
          availability: { days: ['Tuesday', 'Thursday'], hours: '19:00-21:00' },
          rating: 4.9
        }
      ];

      res.json(createResponse(true, 'Available mentors retrieved successfully', {
        mentors: mockMentors,
        pagination: { page: 1, limit: 10, total: 2, pages: 1 }
      }));
    } catch (error) {
      next(error);
    }
  }

  async getMentorById(req, res, next) {
    try {
      const { id } = req.params;

      const mockMentor = {
        id,
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@example.com',
        expertise: ['blockchain', 'cryptocurrency', 'mining'],
        experience: '5+ years in blockchain development and cryptocurrency mining',
        education: 'MS Computer Science, Stanford University',
        motivation: 'Passionate about helping others learn blockchain technology',
        availability: { days: ['Monday', 'Wednesday', 'Friday'], hours: '18:00-20:00' },
        rating: 4.8,
        totalSessions: 45,
        linkedinProfile: 'https://linkedin.com/in/johnsmith'
      };

      res.json(createResponse(true, 'Mentor details retrieved successfully', { mentor: mockMentor }));
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
            type: 'mentor',
            status: 'approved',
            submittedAt: new Date(Date.now() - 86400000).toISOString(),
            reviewedAt: new Date(Date.now() - 43200000).toISOString()
          }
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
          type: 'mentor',
          status: 'approved',
          submittedAt: new Date(Date.now() - 86400000).toISOString(),
          reviewedAt: new Date(Date.now() - 43200000).toISOString()
        }
      ];

      res.json(createResponse(true, 'Applications retrieved successfully', { applications: mockApplications }));
    } catch (error) {
      next(error);
    }
  }

  async getMyProfile(req, res, next) {
    try {
      const mockProfile = {
        id: '1',
        type: 'mentor',
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@example.com',
        expertise: ['blockchain', 'cryptocurrency'],
        totalSessions: 45,
        rating: 4.8,
        status: 'active'
      };

      res.json(createResponse(true, 'Profile retrieved successfully', { profile: mockProfile }));
    } catch (error) {
      next(error);
    }
  }

  async updateMyProfile(req, res, next) {
    try {
      const updateData = req.body;

      const mockProfile = {
        id: '1',
        ...updateData,
        updatedAt: new Date().toISOString()
      };

      res.json(createResponse(true, 'Profile updated successfully', { profile: mockProfile }));
    } catch (error) {
      next(error);
    }
  }

  async getMatches(req, res, next) {
    try {
      const mockMatches = [
        {
          id: '1',
          mentorId: '1',
          menteeId: '2',
          matchScore: 85,
          commonInterests: ['blockchain', 'mining'],
          status: 'suggested'
        }
      ];

      res.json(createResponse(true, 'Matches retrieved successfully', { matches: mockMatches }));
    } catch (error) {
      next(error);
    }
  }

  async requestConnection(req, res, next) {
    try {
      const { mentorId } = req.params;

      const mockConnection = {
        id: 'mock-connection-id',
        mentorId,
        menteeId: 'current-user-id',
        status: 'pending',
        requestedAt: new Date().toISOString()
      };

      res.status(201).json(createResponse(true, 'Connection request sent successfully', { connection: mockConnection }));
    } catch (error) {
      next(error);
    }
  }

  async updateConnectionStatus(req, res, next) {
    try {
      const { connectionId } = req.params;
      const { status } = req.body;

      const mockConnection = {
        id: connectionId,
        status,
        updatedAt: new Date().toISOString()
      };

      res.json(createResponse(true, 'Connection status updated successfully', { connection: mockConnection }));
    } catch (error) {
      next(error);
    }
  }

  async getSessions(req, res, next) {
    try {
      const mockSessions = [
        {
          id: '1',
          mentorName: 'John Smith',
          menteeName: 'Alice Johnson',
          scheduledFor: new Date(Date.now() + 86400000).toISOString(),
          duration: 60,
          topic: 'Blockchain Basics',
          status: 'scheduled'
        }
      ];

      res.json(createResponse(true, 'Sessions retrieved successfully', {
        sessions: mockSessions,
        pagination: { page: 1, limit: 10, total: 1, pages: 1 }
      }));
    } catch (error) {
      next(error);
    }
  }

  async scheduleSession(req, res, next) {
    try {
      const sessionData = req.body;

      const mockSession = {
        id: 'mock-session-id',
        ...sessionData,
        status: 'scheduled',
        createdAt: new Date().toISOString()
      };

      res.status(201).json(createResponse(true, 'Session scheduled successfully', { session: mockSession }));
    } catch (error) {
      next(error);
    }
  }

  async getSessionById(req, res, next) {
    try {
      const { id } = req.params;

      const mockSession = {
        id,
        mentorName: 'John Smith',
        menteeName: 'Alice Johnson',
        scheduledFor: new Date(Date.now() + 86400000).toISOString(),
        duration: 60,
        topic: 'Blockchain Basics',
        status: 'scheduled',
        notes: 'Prepare basic blockchain concepts'
      };

      res.json(createResponse(true, 'Session retrieved successfully', { session: mockSession }));
    } catch (error) {
      next(error);
    }
  }

  async updateSession(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const mockSession = {
        id,
        ...updateData,
        updatedAt: new Date().toISOString()
      };

      res.json(createResponse(true, 'Session updated successfully', { session: mockSession }));
    } catch (error) {
      next(error);
    }
  }

  async completeSession(req, res, next) {
    try {
      const { id } = req.params;
      const { notes, rating } = req.body;

      const mockSession = {
        id,
        status: 'completed',
        notes,
        rating,
        completedAt: new Date().toISOString()
      };

      res.json(createResponse(true, 'Session completed successfully', { session: mockSession }));
    } catch (error) {
      next(error);
    }
  }

  async getAllApplications(req, res, next) {
    try {
      const mockApplications = [
        {
          id: '1',
          type: 'mentor',
          firstName: 'John',
          lastName: 'Smith',
          email: 'john@example.com',
          status: 'pending',
          submittedAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: '2',
          type: 'mentee',
          firstName: 'Alice',
          lastName: 'Johnson',
          email: 'alice@example.com',
          status: 'approved',
          submittedAt: new Date(Date.now() - 172800000).toISOString()
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
        type: 'mentor',
        firstName: 'John',
        lastName: 'Smith',
        email: 'john@example.com',
        expertise: ['blockchain', 'cryptocurrency'],
        experience: '5+ years in blockchain development',
        status: 'pending',
        submittedAt: new Date(Date.now() - 86400000).toISOString()
      };

      res.json(createResponse(true, 'Application retrieved successfully', { application: mockApplication }));
    } catch (error) {
      next(error);
    }
  }

  async updateApplicationStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      const mockApplication = {
        id,
        status,
        reviewNotes: notes,
        reviewedAt: new Date().toISOString()
      };

      res.json(createResponse(true, 'Application status updated successfully', { application: mockApplication }));
    } catch (error) {
      next(error);
    }
  }

  async getMentorshipStats(req, res, next) {
    try {
      const mockStats = {
        totalApplications: 150,
        approvedMentors: 45,
        approvedMentees: 78,
        activeConnections: 32,
        completedSessions: 245,
        averageRating: 4.7
      };

      res.json(createResponse(true, 'Mentorship statistics retrieved successfully', { stats: mockStats }));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MentorshipController();
