'use strict';

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { generateAccessToken, generateRefreshToken, verifyToken, jwtConfig } = require('../config/jwt');
const userRepository = require('../repositories/user.repository');
const { DuplicateError, AuthenticationError } = require('../utils/errors');

/**
 * Register a new user account.
 * Checks for duplicate email, hashes password, creates user, creates session,
 * and returns tokens + user info.
 *
 * @param {string} name - User's display name
 * @param {string} email - User's email address
 * @param {string} password - Plaintext password (will be hashed)
 * @returns {Promise<{accessToken: string, refreshToken: string, user: object}>}
 * @throws {DuplicateError} If email is already registered
 */
async function register(name, email, password) {
  // Check if email already exists
  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) {
    throw new DuplicateError('A user with this email already exists');
  }

  // Hash password with bcrypt (rounds from env, default 10, minimum 10)
  const rounds = Math.max(parseInt(process.env.BCRYPT_ROUNDS, 10) || 10, 10);
  const passwordHash = await bcrypt.hash(password, rounds);

  // Create user record
  const user = await userRepository.create(name, email, passwordHash);

  // Generate tokens
  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  // Create session with refresh token
  await createSession(user.id, refreshToken);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
    },
  };
}

/**
 * Authenticate a user with email and password.
 * Returns tokens + user info on success.
 *
 * @param {string} email - User's email address
 * @param {string} password - Plaintext password to verify
 * @returns {Promise<{accessToken: string, refreshToken: string, user: object}>}
 * @throws {AuthenticationError} If credentials are invalid (generic message)
 */
async function login(email, password) {
  // Find user by email
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new AuthenticationError('Invalid credentials');
  }

  // Compare password with stored hash
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    throw new AuthenticationError('Invalid credentials');
  }

  // Generate tokens
  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  // Create session
  await createSession(user.id, refreshToken);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
    },
  };
}

/**
 * Refresh an access token using a valid refresh token.
 * Validates the JWT, checks the session exists and is not expired,
 * deletes the old session, creates a new one (token rotation), and returns new tokens.
 *
 * @param {string} refreshToken - The current refresh token
 * @returns {Promise<{accessToken: string, refreshToken: string}>}
 * @throws {AuthenticationError} If refresh token is invalid, expired, or session not found
 */
async function refreshTokenFn(refreshToken) {
  // Verify the refresh token JWT signature and expiry
  let payload;
  try {
    payload = verifyToken(refreshToken, jwtConfig.refreshSecret);
  } catch (err) {
    throw new AuthenticationError('Invalid or expired refresh token');
  }

  // Find the session by refresh_token in the database
  const sessionResult = await query(
    `SELECT id, user_id, expires_at FROM sessions WHERE refresh_token = $1`,
    [refreshToken]
  );

  const session = sessionResult.rows[0];
  if (!session) {
    throw new AuthenticationError('Invalid or expired refresh token');
  }

  // Check if session has expired
  if (new Date(session.expires_at) < new Date()) {
    // Clean up expired session
    await query(`DELETE FROM sessions WHERE id = $1`, [session.id]);
    throw new AuthenticationError('Invalid or expired refresh token');
  }

  // Delete old session (token rotation)
  await query(`DELETE FROM sessions WHERE id = $1`, [session.id]);

  // Generate new tokens
  const newAccessToken = generateAccessToken(session.user_id);
  const newRefreshToken = generateRefreshToken(session.user_id);

  // Create new session with the new refresh token
  await createSession(session.user_id, newRefreshToken);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

/**
 * Logout by invalidating the session associated with the given refresh token.
 *
 * @param {string} refreshToken - The refresh token to invalidate
 * @returns {Promise<void>}
 */
async function logout(refreshToken) {
  await query(`DELETE FROM sessions WHERE refresh_token = $1`, [refreshToken]);
}

/**
 * Create a session record with a refresh token and expiration.
 * Internal helper — computes expires_at as 7 days from now.
 *
 * @param {string} userId - The user's UUID
 * @param {string} refreshToken - The signed refresh token
 * @returns {Promise<object>} The created session row
 */
async function createSession(userId, refreshToken) {
  const id = uuidv4();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  const result = await query(
    `INSERT INTO sessions (id, user_id, refresh_token, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id, refresh_token, expires_at, created_at`,
    [id, userId, refreshToken, expiresAt.toISOString()]
  );
  return result.rows[0];
}

module.exports = {
  register,
  login,
  refreshToken: refreshTokenFn,
  logout,
};
