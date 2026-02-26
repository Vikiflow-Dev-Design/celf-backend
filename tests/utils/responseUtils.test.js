const {
  createResponse,
  createPaginatedResponse,
  createErrorResponse,
  createSuccessResponse
} = require('../../src/utils/responseUtils');

describe('Response Utils', () => {
  describe('createResponse', () => {
    it('should create a basic response', () => {
      const response = createResponse(true, 'Success');
      
      expect(response).toHaveProperty('success', true);
      expect(response).toHaveProperty('message', 'Success');
      expect(response).toHaveProperty('timestamp');
      expect(new Date(response.timestamp)).toBeInstanceOf(Date);
    });

    it('should create a response with data', () => {
      const data = { id: 1, name: 'Test' };
      const response = createResponse(true, 'Success', data);
      
      expect(response).toHaveProperty('data', data);
    });

    it('should create a response with meta', () => {
      const meta = { total: 10 };
      const response = createResponse(true, 'Success', null, meta);
      
      expect(response).toHaveProperty('meta', meta);
    });
  });

  describe('createPaginatedResponse', () => {
    it('should create a paginated response', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const pagination = { page: 1, limit: 10, total: 2 };
      const response = createPaginatedResponse(true, 'Success', data, pagination);
      
      expect(response).toHaveProperty('success', true);
      expect(response).toHaveProperty('data', data);
      expect(response).toHaveProperty('meta.pagination', pagination);
    });
  });

  describe('createErrorResponse', () => {
    it('should create an error response', () => {
      const response = createErrorResponse('Error occurred');
      
      expect(response).toHaveProperty('success', false);
      expect(response).toHaveProperty('message', 'Error occurred');
    });

    it('should create an error response with errors', () => {
      const errors = [{ field: 'email', message: 'Invalid email' }];
      const response = createErrorResponse('Validation failed', errors);
      
      expect(response).toHaveProperty('meta.errors', errors);
    });
  });

  describe('createSuccessResponse', () => {
    it('should create a success response', () => {
      const response = createSuccessResponse('Operation successful');
      
      expect(response).toHaveProperty('success', true);
      expect(response).toHaveProperty('message', 'Operation successful');
    });

    it('should create a success response with data', () => {
      const data = { result: 'completed' };
      const response = createSuccessResponse('Operation successful', data);
      
      expect(response).toHaveProperty('data', data);
    });
  });
});
