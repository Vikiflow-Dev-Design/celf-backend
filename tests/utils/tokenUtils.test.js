const {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  decodeToken,
  extractTokenFromHeader,
  isTokenExpired,
  getTokenExpiration
} = require('../../src/utils/tokenUtils');

// Mock config
jest.mock('../../src/config/config', () => ({
  jwt: {
    secret: 'test-secret',
    refreshSecret: 'test-refresh-secret',
    expiresIn: '1h',
    refreshExpiresIn: '7d'
  }
}));

describe('Token Utils', () => {
  const testPayload = { userId: '123', email: 'test@example.com' };

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(testPayload);
      
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate token with custom expiration', () => {
      const token = generateToken(testPayload, '30m');
      const decoded = decodeToken(token);
      
      expect(decoded).toHaveProperty('userId', testPayload.userId);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const refreshToken = generateRefreshToken(testPayload);
      
      expect(typeof refreshToken).toBe('string');
      expect(refreshToken.split('.')).toHaveLength(3);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = generateToken(testPayload);
      const decoded = verifyToken(token);
      
      expect(decoded).toHaveProperty('userId', testPayload.userId);
      expect(decoded).toHaveProperty('email', testPayload.email);
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        verifyToken('invalid-token');
      }).toThrow();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', () => {
      const refreshToken = generateRefreshToken(testPayload);
      const decoded = verifyRefreshToken(refreshToken);
      
      expect(decoded).toHaveProperty('userId', testPayload.userId);
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const token = generateToken(testPayload);
      const decoded = decodeToken(token);
      
      expect(decoded).toHaveProperty('userId', testPayload.userId);
      expect(decoded).toHaveProperty('iat');
      expect(decoded).toHaveProperty('exp');
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from Bearer header', () => {
      const token = 'test-token';
      const authHeader = `Bearer ${token}`;
      const extracted = extractTokenFromHeader(authHeader);
      
      expect(extracted).toBe(token);
    });

    it('should return null for invalid header', () => {
      expect(extractTokenFromHeader('Invalid header')).toBeNull();
      expect(extractTokenFromHeader('')).toBeNull();
      expect(extractTokenFromHeader(null)).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for valid token', () => {
      const token = generateToken(testPayload, '1h');
      
      expect(isTokenExpired(token)).toBe(false);
    });

    it('should return true for expired token', () => {
      const token = generateToken(testPayload, '0s');
      
      // Wait a bit to ensure expiration
      setTimeout(() => {
        expect(isTokenExpired(token)).toBe(true);
      }, 100);
    });

    it('should return true for invalid token', () => {
      expect(isTokenExpired('invalid-token')).toBe(true);
    });
  });

  describe('getTokenExpiration', () => {
    it('should return expiration date for valid token', () => {
      const token = generateToken(testPayload, '1h');
      const expiration = getTokenExpiration(token);
      
      expect(expiration).toBeInstanceOf(Date);
      expect(expiration.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return null for invalid token', () => {
      expect(getTokenExpiration('invalid-token')).toBeNull();
    });
  });
});
