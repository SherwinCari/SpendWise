const jwt = require('jsonwebtoken');

// Set env vars before requiring the module
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';

const {
  jwtConfig,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} = require('../../src/config/jwt');

describe('JWT Configuration Module', () => {
  describe('jwtConfig', () => {
    it('should load access secret from environment', () => {
      expect(jwtConfig.accessSecret).toBe('test-access-secret');
    });

    it('should load refresh secret from environment', () => {
      expect(jwtConfig.refreshSecret).toBe('test-refresh-secret');
    });

    it('should have 15m default access expiry', () => {
      expect(jwtConfig.accessExpiry).toBe('15m');
    });

    it('should have 7d default refresh expiry', () => {
      expect(jwtConfig.refreshExpiry).toBe('7d');
    });
  });

  describe('generateAccessToken', () => {
    it('should return a valid JWT string', () => {
      const token = generateAccessToken('user-123');
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should embed userId in the payload', () => {
      const token = generateAccessToken('user-123');
      const decoded = jwt.decode(token);
      expect(decoded.userId).toBe('user-123');
    });

    it('should be verifiable with the access secret', () => {
      const token = generateAccessToken('user-456');
      const decoded = jwt.verify(token, 'test-access-secret');
      expect(decoded.userId).toBe('user-456');
    });

    it('should not be verifiable with the refresh secret', () => {
      const token = generateAccessToken('user-789');
      expect(() => jwt.verify(token, 'test-refresh-secret')).toThrow();
    });

    it('should include an exp claim', () => {
      const token = generateAccessToken('user-123');
      const decoded = jwt.decode(token);
      expect(decoded.exp).toBeDefined();
      // exp should be approximately 15 minutes from now
      const expectedExp = Math.floor(Date.now() / 1000) + 15 * 60;
      expect(decoded.exp).toBeCloseTo(expectedExp, -1);
    });
  });

  describe('generateRefreshToken', () => {
    it('should return a valid JWT string', () => {
      const token = generateRefreshToken('user-123');
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should embed userId in the payload', () => {
      const token = generateRefreshToken('user-123');
      const decoded = jwt.decode(token);
      expect(decoded.userId).toBe('user-123');
    });

    it('should be verifiable with the refresh secret', () => {
      const token = generateRefreshToken('user-abc');
      const decoded = jwt.verify(token, 'test-refresh-secret');
      expect(decoded.userId).toBe('user-abc');
    });

    it('should not be verifiable with the access secret', () => {
      const token = generateRefreshToken('user-abc');
      expect(() => jwt.verify(token, 'test-access-secret')).toThrow();
    });

    it('should include an exp claim for 7 days', () => {
      const token = generateRefreshToken('user-123');
      const decoded = jwt.decode(token);
      expect(decoded.exp).toBeDefined();
      // exp should be approximately 7 days from now
      const expectedExp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
      expect(decoded.exp).toBeCloseTo(expectedExp, -1);
    });
  });

  describe('verifyToken', () => {
    it('should return decoded payload for a valid token', () => {
      const token = generateAccessToken('user-verify');
      const decoded = verifyToken(token, jwtConfig.accessSecret);
      expect(decoded.userId).toBe('user-verify');
    });

    it('should throw for an invalid signature', () => {
      const token = generateAccessToken('user-123');
      expect(() => verifyToken(token, 'wrong-secret')).toThrow();
    });

    it('should throw for a malformed token', () => {
      expect(() => verifyToken('not.a.valid.token', jwtConfig.accessSecret)).toThrow();
    });

    it('should throw for an expired token', () => {
      const expiredToken = jwt.sign(
        { userId: 'user-expired' },
        jwtConfig.accessSecret,
        { expiresIn: '0s' }
      );
      // Small delay to ensure token is expired
      expect(() => verifyToken(expiredToken, jwtConfig.accessSecret)).toThrow();
    });
  });
});
