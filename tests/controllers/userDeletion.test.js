const request = require('supertest');
const app = require('../../src/server');
const supabaseService = require('../../src/services/supabaseService');
const { generateToken } = require('../../src/utils/tokenUtils');

// Mock supabaseService
jest.mock('../../src/services/supabaseService');

describe('User Deletion Endpoints', () => {
  let adminToken, userToken, superAdminToken;
  let mockUser, mockAdmin, mockSuperAdmin;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock users
    mockUser = {
      id: 'user-123',
      email: 'user@test.com',
      first_name: 'John',
      last_name: 'Doe',
      role: 'user',
      is_active: true
    };

    mockAdmin = {
      id: 'admin-123',
      email: 'admin@test.com',
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin',
      is_active: true
    };

    mockSuperAdmin = {
      id: 'super-admin-123',
      email: 'superadmin@test.com',
      first_name: 'Super',
      last_name: 'Admin',
      role: 'super-admin',
      is_active: true
    };

    // Generate tokens
    userToken = generateToken({ userId: mockUser.id });
    adminToken = generateToken({ userId: mockAdmin.id });
    superAdminToken = generateToken({ userId: mockSuperAdmin.id });

    // Mock supabaseService.findUserById
    supabaseService.findUserById.mockImplementation((userId) => {
      if (userId === mockUser.id) return Promise.resolve(mockUser);
      if (userId === mockAdmin.id) return Promise.resolve(mockAdmin);
      if (userId === mockSuperAdmin.id) return Promise.resolve(mockSuperAdmin);
      return Promise.resolve(null);
    });
  });

  describe('DELETE /api/users/:id - Single User Deletion', () => {
    beforeEach(() => {
      supabaseService.getUserDeletionPreview.mockResolvedValue({
        user: mockUser,
        relatedData: {
          wallet: { id: 'wallet-123', totalBalance: 100 },
          miningSessions: { count: 2, totalTokensEarned: 50 },
          transactions: { sentCount: 5, receivedCount: 3, totalCount: 8 },
          assignments: { contactSubmissions: 0, supportTickets: 0 }
        }
      });

      supabaseService.deleteUser.mockResolvedValue({
        deletedUser: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.first_name,
          lastName: mockUser.last_name
        },
        relatedDataDeleted: {
          wallet: 1,
          miningSessions: 2,
          transactionsUpdated: 8
        }
      });
    });

    it('should successfully delete a user as admin', async () => {
      const response = await request(app)
        .delete(`/api/users/${mockUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User deleted successfully');
      expect(response.body.data.deletedUser.id).toBe(mockUser.id);
      expect(supabaseService.deleteUser).toHaveBeenCalledWith(mockUser.id);
    });

    it('should prevent non-admin from deleting users', async () => {
      const response = await request(app)
        .delete(`/api/users/${mockUser.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Insufficient permissions');
    });

    it('should prevent self-deletion', async () => {
      const response = await request(app)
        .delete(`/api/users/${mockAdmin.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Cannot delete your own account');
    });

    it('should prevent admin deletion by non-super-admin', async () => {
      supabaseService.getUserDeletionPreview.mockResolvedValue({
        user: mockAdmin,
        relatedData: {}
      });

      const response = await request(app)
        .delete(`/api/users/${mockAdmin.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Cannot delete admin users');
    });

    it('should return 404 for non-existent user', async () => {
      supabaseService.getUserDeletionPreview.mockRejectedValue(new Error('User not found'));

      const response = await request(app)
        .delete('/api/users/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });
  });

  describe('GET /api/users/:id/deletion-preview - User Deletion Preview', () => {
    it('should return deletion preview for admin', async () => {
      const mockPreview = {
        user: mockUser,
        relatedData: {
          wallet: { id: 'wallet-123', totalBalance: 100 },
          miningSessions: { count: 2, totalTokensEarned: 50 },
          transactions: { sentCount: 5, receivedCount: 3, totalCount: 8 }
        }
      };

      supabaseService.getUserDeletionPreview.mockResolvedValue(mockPreview);

      const response = await request(app)
        .get(`/api/users/${mockUser.id}/deletion-preview`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(mockUser.id);
      expect(response.body.data.relatedData.wallet.totalBalance).toBe(100);
    });

    it('should prevent non-admin from viewing deletion preview', async () => {
      const response = await request(app)
        .get(`/api/users/${mockUser.id}/deletion-preview`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/users/delete-multiple - Multiple User Deletion', () => {
    const userIds = ['user-1', 'user-2', 'user-3'];

    beforeEach(() => {
      supabaseService.deleteMultipleUsers.mockResolvedValue({
        successful: [
          { deletedUser: { id: 'user-1', email: 'user1@test.com' } },
          { deletedUser: { id: 'user-2', email: 'user2@test.com' } }
        ],
        failed: [
          { userId: 'user-3', error: 'User not found' }
        ],
        summary: {
          totalRequested: 3,
          successful: 2,
          failed: 1
        }
      });
    });

    it('should successfully delete multiple users as admin', async () => {
      const response = await request(app)
        .post('/api/users/delete-multiple')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userIds })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.successful).toBe(2);
      expect(response.body.data.summary.failed).toBe(1);
    });

    it('should prevent deletion with empty user IDs array', async () => {
      const response = await request(app)
        .post('/api/users/delete-multiple')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userIds: [] })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should prevent self-deletion in multiple deletion', async () => {
      const response = await request(app)
        .post('/api/users/delete-multiple')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userIds: [mockAdmin.id, 'user-1'] })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Cannot delete your own account');
    });
  });

  describe('POST /api/users/delete-all - Delete All Users', () => {
    beforeEach(() => {
      supabaseService.deleteAllUsers.mockResolvedValue({
        message: 'Successfully deleted 5 users',
        deletedCount: 5,
        deletedUsers: [
          { id: 'user-1', email: 'user1@test.com', role: 'user' },
          { id: 'user-2', email: 'user2@test.com', role: 'user' }
        ],
        excludedAdmins: true
      });
    });

    it('should successfully delete all users as super-admin', async () => {
      const response = await request(app)
        .post('/api/users/delete-all')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ 
          confirmationToken: 'DELETE_ALL_USERS_CONFIRMED',
          excludeAdmins: true 
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deletedCount).toBe(5);
    });

    it('should prevent non-super-admin from deleting all users', async () => {
      const response = await request(app)
        .post('/api/users/delete-all')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ 
          confirmationToken: 'DELETE_ALL_USERS_CONFIRMED',
          excludeAdmins: true 
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Only super-admin can delete all users');
    });

    it('should require confirmation token', async () => {
      const response = await request(app)
        .post('/api/users/delete-all')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ excludeAdmins: true })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Confirmation token required');
    });
  });
});
