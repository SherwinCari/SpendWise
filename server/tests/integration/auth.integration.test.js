'use strict';

// Set env vars before requiring modules
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.BCRYPT_ROUNDS = '10';

// Mock the database module
jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

// Mock bcrypt for fast test execution
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-session'),
}));

// Mock the user repository
jest.mock('../../src/repositories/user.repository', () => ({
  findByEmail: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { query } = require('../../src/config/database');
const userRepository = require('../../src/repositories/user.repository');
const app = require('../../index');

describe('Auth Integration - Register → Login → Refresh → Logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Full Auth Flow', () => {
    const testUser = {
      id: 'user-id-123',
      name: 'John Doe',
      email: 'john@example.com',
      password_hash: '$2b$10$hashedpassword',
      created_at: '2024-01-15T10:00:00.000Z',
    };

    it('should complete Register → Login → Refresh → Logout flow', async () => {
      // --- STEP 1: Register ---
      userRepository.findByEmail.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('$2b$10$hashedpassword');
      userRepository.create.mockResolvedValue({
        id: testUser.id,
        name: testUser.name,
        email: testUser.email,
        created_at: testUser.created_at,
      });
      query.mockResolvedValue({ rows: [{ id: 'session-1' }] });

      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'securePass123',
        })
        .expect(201);

      expect(registerRes.body.success).toBe(true);
      expect(registerRes.body.accessToken).toBeDefined();
      expect(registerRes.body.refreshToken).toBeDefined();
      expect(registerRes.body.user.id).toBe(testUser.id);
      expect(registerRes.body.user.email).toBe(testUser.email);
      expect(registerRes.body.user.name).toBe(testUser.name);
      expect(registerRes.body.user.password_hash).toBeUndefined();

      // Verify access token structure
      const accessDecoded = jwt.decode(registerRes.body.accessToken);
      expect(accessDecoded.userId).toBe(testUser.id);
      expect(accessDecoded.exp).toBeDefined();

      const savedRefreshToken = registerRes.body.refreshToken;

      // --- STEP 2: Login ---
      jest.clearAllMocks();
      userRepository.findByEmail.mockResolvedValue(testUser);
      bcrypt.compare.mockResolvedValue(true);
      query.mockResolvedValue({ rows: [{ id: 'session-2' }] });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'securePass123',
        })
        .expect(200);

      expect(loginRes.body.success).toBe(true);
      expect(loginRes.body.accessToken).toBeDefined();
      expect(loginRes.body.refreshToken).toBeDefined();
      expect(loginRes.body.user.id).toBe(testUser.id);

      const loginAccessToken = loginRes.body.accessToken;
      const loginRefreshToken = loginRes.body.refreshToken;

      // --- STEP 3: Refresh Token ---
      jest.clearAllMocks();
      // Mock: find session, delete old, create new
      query.mockResolvedValueOnce({
        rows: [{
          id: 'session-2',
          user_id: testUser.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }],
      });
      query.mockResolvedValueOnce({ rows: [] }); // delete old session
      query.mockResolvedValueOnce({ rows: [{ id: 'session-3' }] }); // create new session

      const refreshRes = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: loginRefreshToken })
        .expect(200);

      expect(refreshRes.body.success).toBe(true);
      expect(refreshRes.body.accessToken).toBeDefined();
      expect(refreshRes.body.refreshToken).toBeDefined();
      // New tokens should be valid JWTs with correct userId
      const refreshedAccessDecoded = jwt.decode(refreshRes.body.accessToken);
      expect(refreshedAccessDecoded.userId).toBe(testUser.id);

      const newAccessToken = refreshRes.body.accessToken;
      const newRefreshToken = refreshRes.body.refreshToken;

      // --- STEP 4: Logout ---
      jest.clearAllMocks();
      query.mockResolvedValue({ rows: [], rowCount: 1 });

      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .send({ refreshToken: newRefreshToken })
        .expect(200);

      expect(logoutRes.body.success).toBe(true);
      expect(logoutRes.body.message).toBe('Logged out successfully');

      // Verify DELETE query was called for the session
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM sessions'),
        [newRefreshToken]
      );
    });
  });

  describe('Registration Validation', () => {
    it('should reject registration with missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject registration with invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test',
          email: 'not-an-email',
          password: 'password123',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject registration with short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test',
          email: 'test@example.com',
          password: 'short',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject registration with duplicate email', async () => {
      userRepository.findByEmail.mockResolvedValue({ id: 'existing-user' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'securePass123',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DUPLICATE_ERROR');
    });
  });

  describe('Login Validation', () => {
    it('should return 401 with generic message for invalid credentials', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
      expect(res.body.error.message).toBe('Invalid credentials');
    });

    it('should return 401 for wrong password with same generic message', async () => {
      userRepository.findByEmail.mockResolvedValue({
        id: 'user-id-1',
        email: 'test@example.com',
        password_hash: '$2b$10$hash',
      });
      bcrypt.compare.mockResolvedValue(false);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
      expect(res.body.error.message).toBe('Invalid credentials');
    });
  });

  describe('Refresh Token Errors', () => {
    it('should return 400 when refresh token is not provided', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 for invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token-string' })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    });
  });

  describe('Logout Errors', () => {
    it('should return 401 when no access token provided for logout', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: 'some-token' })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should return 400 when refresh token is missing in logout body', async () => {
      const accessToken = jwt.sign(
        { userId: 'user-id-1' },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
      );

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
