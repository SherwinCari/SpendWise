'use strict';

const jwt = require('jsonwebtoken');

// Set env vars before requiring modules
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.BCRYPT_ROUNDS = '10';

// Mock dependencies
jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../../src/repositories/user.repository', () => ({
  findByEmail: jest.fn(),
  create: jest.fn(),
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234'),
}));

const bcrypt = require('bcrypt');
const { query } = require('../../src/config/database');
const userRepository = require('../../src/repositories/user.repository');
const { DuplicateError, AuthenticationError } = require('../../src/utils/errors');
const authService = require('../../src/services/auth.service');

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Token Expiry Timing', () => {
    it('should generate access token with 15-minute expiry on register', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashed-password');
      userRepository.create.mockResolvedValue({
        id: 'user-id-1',
        name: 'Test User',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00.000Z',
      });
      query.mockResolvedValue({ rows: [{ id: 'session-1' }] });

      const result = await authService.register('Test User', 'test@example.com', 'password123');

      const decoded = jwt.decode(result.accessToken);
      const expectedExp = Math.floor(Date.now() / 1000) + 15 * 60;
      // Token exp should be within 5 seconds of expected (15min from now)
      expect(decoded.exp).toBeGreaterThan(expectedExp - 5);
      expect(decoded.exp).toBeLessThanOrEqual(expectedExp + 5);
    });

    it('should generate refresh token with 7-day expiry on register', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashed-password');
      userRepository.create.mockResolvedValue({
        id: 'user-id-1',
        name: 'Test User',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00.000Z',
      });
      query.mockResolvedValue({ rows: [{ id: 'session-1' }] });

      const result = await authService.register('Test User', 'test@example.com', 'password123');

      const decoded = jwt.decode(result.refreshToken);
      const expectedExp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
      // Token exp should be within 5 seconds of expected (7 days from now)
      expect(decoded.exp).toBeGreaterThan(expectedExp - 5);
      expect(decoded.exp).toBeLessThanOrEqual(expectedExp + 5);
    });

    it('should generate access token with 15-minute expiry on login', async () => {
      userRepository.findByEmail.mockResolvedValue({
        id: 'user-id-1',
        name: 'Test User',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        created_at: '2024-01-01T00:00:00.000Z',
      });
      bcrypt.compare.mockResolvedValue(true);
      query.mockResolvedValue({ rows: [{ id: 'session-1' }] });

      const result = await authService.login('test@example.com', 'password123');

      const decoded = jwt.decode(result.accessToken);
      const expectedExp = Math.floor(Date.now() / 1000) + 15 * 60;
      expect(decoded.exp).toBeGreaterThan(expectedExp - 5);
      expect(decoded.exp).toBeLessThanOrEqual(expectedExp + 5);
    });

    it('should generate refresh token with 7-day expiry on login', async () => {
      userRepository.findByEmail.mockResolvedValue({
        id: 'user-id-1',
        name: 'Test User',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        created_at: '2024-01-01T00:00:00.000Z',
      });
      bcrypt.compare.mockResolvedValue(true);
      query.mockResolvedValue({ rows: [{ id: 'session-1' }] });

      const result = await authService.login('test@example.com', 'password123');

      const decoded = jwt.decode(result.refreshToken);
      const expectedExp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
      expect(decoded.exp).toBeGreaterThan(expectedExp - 5);
      expect(decoded.exp).toBeLessThanOrEqual(expectedExp + 5);
    });
  });

  describe('Session Creation on Register', () => {
    it('should create a session record with refresh token after registration', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashed-password');
      userRepository.create.mockResolvedValue({
        id: 'user-id-1',
        name: 'Test User',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00.000Z',
      });
      query.mockResolvedValue({ rows: [{ id: 'session-1', user_id: 'user-id-1' }] });

      await authService.register('Test User', 'test@example.com', 'password123');

      // Verify query was called to insert a session
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sessions'),
        expect.arrayContaining(['mock-uuid-1234', 'user-id-1'])
      );
    });

    it('should store the refresh token in the session', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashed-password');
      userRepository.create.mockResolvedValue({
        id: 'user-id-1',
        name: 'Test User',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00.000Z',
      });
      query.mockResolvedValue({ rows: [{ id: 'session-1' }] });

      const result = await authService.register('Test User', 'test@example.com', 'password123');

      // The session INSERT should contain the refresh token
      const insertCall = query.mock.calls.find(call =>
        call[0].includes('INSERT INTO sessions')
      );
      expect(insertCall).toBeDefined();
      // The third parameter (index 2) is the refresh token
      expect(insertCall[1][2]).toBe(result.refreshToken);
    });

    it('should set session expiry to 7 days from now', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashed-password');
      userRepository.create.mockResolvedValue({
        id: 'user-id-1',
        name: 'Test User',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00.000Z',
      });
      query.mockResolvedValue({ rows: [{ id: 'session-1' }] });

      const beforeTime = new Date();
      await authService.register('Test User', 'test@example.com', 'password123');
      const afterTime = new Date();

      const insertCall = query.mock.calls.find(call =>
        call[0].includes('INSERT INTO sessions')
      );
      // The fourth parameter (index 3) is the expires_at ISO string
      const expiresAt = new Date(insertCall[1][3]);
      const expectedMin = new Date(beforeTime);
      expectedMin.setDate(expectedMin.getDate() + 7);
      const expectedMax = new Date(afterTime);
      expectedMax.setDate(expectedMax.getDate() + 7);

      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime() - 1000);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMax.getTime() + 1000);
    });
  });

  describe('Logout Invalidation', () => {
    it('should delete the session associated with the refresh token', async () => {
      query.mockResolvedValue({ rows: [], rowCount: 1 });

      await authService.logout('some-refresh-token');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM sessions WHERE refresh_token'),
        ['some-refresh-token']
      );
    });

    it('should not throw even if session does not exist', async () => {
      query.mockResolvedValue({ rows: [], rowCount: 0 });

      await expect(authService.logout('nonexistent-token')).resolves.toBeUndefined();
    });
  });

  describe('Generic Error Message on Bad Credentials', () => {
    it('should throw generic "Invalid credentials" when email not found', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.login('wrong@example.com', 'password123'))
        .rejects.toThrow(AuthenticationError);
      await expect(authService.login('wrong@example.com', 'password123'))
        .rejects.toThrow('Invalid credentials');
    });

    it('should throw generic "Invalid credentials" when password is wrong', async () => {
      userRepository.findByEmail.mockResolvedValue({
        id: 'user-id-1',
        name: 'Test User',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        created_at: '2024-01-01T00:00:00.000Z',
      });
      bcrypt.compare.mockResolvedValue(false);

      await expect(authService.login('test@example.com', 'wrongpassword'))
        .rejects.toThrow(AuthenticationError);
      await expect(authService.login('test@example.com', 'wrongpassword'))
        .rejects.toThrow('Invalid credentials');
    });

    it('should use the same error message for both email and password failures', async () => {
      // Test email not found case
      userRepository.findByEmail.mockResolvedValue(null);
      let emailError;
      try {
        await authService.login('wrong@example.com', 'password123');
      } catch (e) {
        emailError = e;
      }

      // Test wrong password case
      userRepository.findByEmail.mockResolvedValue({
        id: 'user-id-1',
        name: 'Test User',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        created_at: '2024-01-01T00:00:00.000Z',
      });
      bcrypt.compare.mockResolvedValue(false);
      let passwordError;
      try {
        await authService.login('test@example.com', 'wrongpassword');
      } catch (e) {
        passwordError = e;
      }

      // Both should produce identical error messages (no user enumeration)
      expect(emailError.message).toBe(passwordError.message);
      expect(emailError.code).toBe(passwordError.code);
    });
  });

  describe('Password Hashing During Registration', () => {
    it('should hash password with bcrypt before storing', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('$2b$10$hashedpassword');
      userRepository.create.mockResolvedValue({
        id: 'user-id-1',
        name: 'Test User',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00.000Z',
      });
      query.mockResolvedValue({ rows: [{ id: 'session-1' }] });

      await authService.register('Test User', 'test@example.com', 'password123');

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    });

    it('should use minimum cost factor of 10 even if env var is lower', async () => {
      const originalBcryptRounds = process.env.BCRYPT_ROUNDS;
      process.env.BCRYPT_ROUNDS = '5'; // Set lower than minimum

      // Clear module cache to pick up new env var
      jest.resetModules();
      jest.mock('../../src/config/database', () => ({ query: jest.fn() }));
      jest.mock('../../src/repositories/user.repository', () => ({
        findByEmail: jest.fn(),
        create: jest.fn(),
      }));
      jest.mock('bcrypt', () => ({ hash: jest.fn(), compare: jest.fn() }));
      jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid-1234') }));

      const bcryptReloaded = require('bcrypt');
      const userRepoReloaded = require('../../src/repositories/user.repository');
      const { query: queryReloaded } = require('../../src/config/database');
      const authServiceReloaded = require('../../src/services/auth.service');

      userRepoReloaded.findByEmail.mockResolvedValue(null);
      bcryptReloaded.hash.mockResolvedValue('$2b$10$hashedpassword');
      userRepoReloaded.create.mockResolvedValue({
        id: 'user-id-1',
        name: 'Test User',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00.000Z',
      });
      queryReloaded.mockResolvedValue({ rows: [{ id: 'session-1' }] });

      await authServiceReloaded.register('Test User', 'test@example.com', 'password123');

      // Should still use 10 as the minimum, not 5
      expect(bcryptReloaded.hash).toHaveBeenCalledWith('password123', 10);

      process.env.BCRYPT_ROUNDS = originalBcryptRounds;
    });

    it('should pass hashed password to user repository create', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('$2b$10$securely-hashed');
      userRepository.create.mockResolvedValue({
        id: 'user-id-1',
        name: 'Test User',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00.000Z',
      });
      query.mockResolvedValue({ rows: [{ id: 'session-1' }] });

      await authService.register('Test User', 'test@example.com', 'password123');

      expect(userRepository.create).toHaveBeenCalledWith(
        'Test User',
        'test@example.com',
        '$2b$10$securely-hashed'
      );
    });
  });

  describe('Refresh Token Rotation', () => {
    it('should delete old session and create new one on token refresh', async () => {
      // Create a token issued 1 minute ago so new token will have different iat
      const validRefreshToken = jwt.sign(
        { userId: 'user-id-1', iat: Math.floor(Date.now() / 1000) - 60 },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      // First query: find session
      query.mockResolvedValueOnce({
        rows: [{
          id: 'session-old',
          user_id: 'user-id-1',
          expires_at: new Date(Date.now() + 86400000).toISOString(),
        }],
      });
      // Second query: delete old session
      query.mockResolvedValueOnce({ rows: [] });
      // Third query: create new session
      query.mockResolvedValueOnce({ rows: [{ id: 'session-new' }] });

      const result = await authService.refreshToken(validRefreshToken);

      // Should have deleted old session
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM sessions WHERE id'),
        ['session-old']
      );
      // Should have created a new session
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sessions'),
        expect.any(Array)
      );
      // Should return new tokens
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      // New token should differ from the old one (different iat)
      expect(result.refreshToken).not.toBe(validRefreshToken);
    });

    it('should throw AuthenticationError for invalid refresh token', async () => {
      await expect(authService.refreshToken('invalid-token'))
        .rejects.toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError if session not found in database', async () => {
      const validRefreshToken = jwt.sign(
        { userId: 'user-id-1' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      query.mockResolvedValueOnce({ rows: [] }); // No session found

      await expect(authService.refreshToken(validRefreshToken))
        .rejects.toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError if session is expired', async () => {
      const validRefreshToken = jwt.sign(
        { userId: 'user-id-1' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      // Return an expired session
      query.mockResolvedValueOnce({
        rows: [{
          id: 'session-expired',
          user_id: 'user-id-1',
          expires_at: new Date(Date.now() - 86400000).toISOString(), // expired yesterday
        }],
      });
      // Delete expired session
      query.mockResolvedValueOnce({ rows: [] });

      await expect(authService.refreshToken(validRefreshToken))
        .rejects.toThrow(AuthenticationError);
    });
  });

  describe('Duplicate Email on Register', () => {
    it('should throw DuplicateError when email already exists', async () => {
      userRepository.findByEmail.mockResolvedValue({
        id: 'existing-user',
        email: 'test@example.com',
      });

      await expect(authService.register('Test User', 'test@example.com', 'password123'))
        .rejects.toThrow(DuplicateError);
      await expect(authService.register('Test User', 'test@example.com', 'password123'))
        .rejects.toThrow('A user with this email already exists');
    });
  });

  describe('Return Values', () => {
    it('should return user info without password hash on register', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashed-password');
      userRepository.create.mockResolvedValue({
        id: 'user-id-1',
        name: 'Test User',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00.000Z',
      });
      query.mockResolvedValue({ rows: [{ id: 'session-1' }] });

      const result = await authService.register('Test User', 'test@example.com', 'password123');

      expect(result.user).toEqual({
        id: 'user-id-1',
        name: 'Test User',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00.000Z',
      });
      expect(result.user.password_hash).toBeUndefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should return user info without password hash on login', async () => {
      userRepository.findByEmail.mockResolvedValue({
        id: 'user-id-1',
        name: 'Test User',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        created_at: '2024-01-01T00:00:00.000Z',
      });
      bcrypt.compare.mockResolvedValue(true);
      query.mockResolvedValue({ rows: [{ id: 'session-1' }] });

      const result = await authService.login('test@example.com', 'password123');

      expect(result.user).toEqual({
        id: 'user-id-1',
        name: 'Test User',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00.000Z',
      });
      expect(result.user.password_hash).toBeUndefined();
    });
  });
});
