const supabaseService = require('../../src/services/supabaseService');

// Mock the database module
jest.mock('../../src/config/database', () => ({
  getClient: jest.fn(),
  getAdminClient: jest.fn()
}));

describe('SupabaseService - User Deletion Methods', () => {
  let mockClient;
  let mockUser, mockWallet, mockMiningSessions, mockTransactions;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock Supabase client
    mockClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis()
    };

    // Mock data
    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      first_name: 'John',
      last_name: 'Doe',
      role: 'user',
      created_at: '2023-01-01T00:00:00Z'
    };

    mockWallet = {
      id: 'wallet-123',
      user_id: 'user-123',
      total_balance: 100.5,
      sendable_balance: 75.25
    };

    mockMiningSessions = [
      { id: 'session-1', user_id: 'user-123', tokens_earned: 25.5 },
      { id: 'session-2', user_id: 'user-123', tokens_earned: 30.0 }
    ];

    mockTransactions = [
      { id: 'tx-1', from_user_id: 'user-123', amount: 10 },
      { id: 'tx-2', to_user_id: 'user-123', amount: 15 }
    ];

    // Mock supabaseService methods
    jest.spyOn(supabaseService, 'getClient').mockReturnValue(mockClient);
    jest.spyOn(supabaseService, 'findUserById').mockResolvedValue(mockUser);
    jest.spyOn(supabaseService, 'findWalletByUserId').mockResolvedValue(mockWallet);
    jest.spyOn(supabaseService, 'find').mockImplementation((table, filter) => {
      if (table === 'mining_sessions') return Promise.resolve(mockMiningSessions);
      if (table === 'transactions') return Promise.resolve(mockTransactions);
      return Promise.resolve([]);
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      // Mock successful deletion responses
      mockClient.delete.mockResolvedValue({ error: null });
      mockClient.update.mockResolvedValue({ error: null });
    });

    it('should successfully delete a user and related data', async () => {
      const result = await supabaseService.deleteUser('user-123');

      expect(result.deletedUser.id).toBe('user-123');
      expect(result.deletedUser.email).toBe('test@example.com');
      expect(result.relatedDataDeleted.wallet).toBe(1);
      expect(result.relatedDataDeleted.miningSessions).toBe(2);
      expect(result.relatedDataDeleted.transactionsUpdated).toBe(2);

      // Verify deletion order
      expect(mockClient.from).toHaveBeenCalledWith('mining_sessions');
      expect(mockClient.from).toHaveBeenCalledWith('transactions');
      expect(mockClient.from).toHaveBeenCalledWith('wallets');
      expect(mockClient.from).toHaveBeenCalledWith('users');
    });

    it('should throw error if user not found', async () => {
      jest.spyOn(supabaseService, 'findUserById').mockResolvedValue(null);

      await expect(supabaseService.deleteUser('non-existent'))
        .rejects.toThrow('User not found');
    });

    it('should handle database errors gracefully', async () => {
      mockClient.delete.mockResolvedValue({ error: { message: 'Database error' } });

      await expect(supabaseService.deleteUser('user-123'))
        .rejects.toThrow('Failed to delete user: Error deleting user: Database error');
    });
  });

  describe('deleteMultipleUsers', () => {
    it('should successfully delete multiple users', async () => {
      jest.spyOn(supabaseService, 'deleteUser')
        .mockResolvedValueOnce({
          deletedUser: { id: 'user-1', email: 'user1@test.com' },
          relatedDataDeleted: { wallet: 1, miningSessions: 1, transactionsUpdated: 2 }
        })
        .mockResolvedValueOnce({
          deletedUser: { id: 'user-2', email: 'user2@test.com' },
          relatedDataDeleted: { wallet: 1, miningSessions: 0, transactionsUpdated: 1 }
        });

      const result = await supabaseService.deleteMultipleUsers(['user-1', 'user-2']);

      expect(result.summary.totalRequested).toBe(2);
      expect(result.summary.successful).toBe(2);
      expect(result.summary.failed).toBe(0);
      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
    });

    it('should handle partial failures', async () => {
      jest.spyOn(supabaseService, 'deleteUser')
        .mockResolvedValueOnce({
          deletedUser: { id: 'user-1', email: 'user1@test.com' },
          relatedDataDeleted: { wallet: 1, miningSessions: 1, transactionsUpdated: 2 }
        })
        .mockRejectedValueOnce(new Error('User not found'));

      const result = await supabaseService.deleteMultipleUsers(['user-1', 'user-2']);

      expect(result.summary.totalRequested).toBe(2);
      expect(result.summary.successful).toBe(1);
      expect(result.summary.failed).toBe(1);
      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].userId).toBe('user-2');
      expect(result.failed[0].error).toBe('User not found');
    });

    it('should throw error for empty user IDs array', async () => {
      await expect(supabaseService.deleteMultipleUsers([]))
        .rejects.toThrow('User IDs array is required and cannot be empty');
    });
  });

  describe('deleteAllUsers', () => {
    beforeEach(() => {
      const mockUsers = [
        { id: 'user-1', email: 'user1@test.com', role: 'user', first_name: 'User', last_name: 'One' },
        { id: 'user-2', email: 'user2@test.com', role: 'user', first_name: 'User', last_name: 'Two' }
      ];

      mockClient.select.mockResolvedValue({ data: mockUsers, error: null });
      mockClient.delete.mockResolvedValue({ error: null });
      mockClient.update.mockResolvedValue({ error: null });
    });

    it('should successfully delete all users with confirmation', async () => {
      const result = await supabaseService.deleteAllUsers({
        excludeAdmins: true,
        confirmationToken: 'DELETE_ALL_USERS_CONFIRMED'
      });

      expect(result.message).toBe('Successfully deleted 2 users');
      expect(result.deletedCount).toBe(2);
      expect(result.deletedUsers).toHaveLength(2);
      expect(result.excludedAdmins).toBe(true);
    });

    it('should require confirmation token', async () => {
      await expect(supabaseService.deleteAllUsers({ excludeAdmins: true }))
        .rejects.toThrow('Confirmation token required for bulk deletion');
    });

    it('should handle no users to delete', async () => {
      mockClient.select.mockResolvedValue({ data: [], error: null });

      const result = await supabaseService.deleteAllUsers({
        excludeAdmins: true,
        confirmationToken: 'DELETE_ALL_USERS_CONFIRMED'
      });

      expect(result.message).toBe('No users found to delete');
      expect(result.deletedCount).toBe(0);
    });
  });

  describe('getUserDeletionPreview', () => {
    it('should return comprehensive deletion preview', async () => {
      const result = await supabaseService.getUserDeletionPreview('user-123');

      expect(result.user.id).toBe('user-123');
      expect(result.user.email).toBe('test@example.com');
      expect(result.relatedData.wallet.totalBalance).toBe(100.5);
      expect(result.relatedData.miningSessions.count).toBe(2);
      expect(result.relatedData.miningSessions.totalTokensEarned).toBe(55.5);
      expect(result.relatedData.transactions.totalCount).toBe(2);
    });

    it('should handle user with no wallet', async () => {
      jest.spyOn(supabaseService, 'findWalletByUserId').mockResolvedValue(null);

      const result = await supabaseService.getUserDeletionPreview('user-123');

      expect(result.relatedData.wallet).toBeNull();
    });

    it('should throw error for non-existent user', async () => {
      jest.spyOn(supabaseService, 'findUserById').mockResolvedValue(null);

      await expect(supabaseService.getUserDeletionPreview('non-existent'))
        .rejects.toThrow('Failed to get deletion preview: User not found');
    });
  });
});
