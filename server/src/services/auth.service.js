'use strict';

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { generateAccessToken, generateRefreshToken, verifyToken, jwtConfig } = require('../config/jwt');
const userRepository = require('../repositories/user.repository');
const { DuplicateError, AuthenticationError } = require('../utils/errors');

// ─── Account Lockout (Feature #7) ───────────────────────────────────────────
// Track failed login attempts per email in memory
const failedAttempts = new Map();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Check if an account is currently locked.
 * @param {string} email
 * @returns {{locked: boolean, minutesRemaining: number}}
 */
function checkAccountLock(email) {
  const record = failedAttempts.get(email);
  if (!record || record.attempts < MAX_FAILED_ATTEMPTS) {
    return { locked: false, minutesRemaining: 0 };
  }
  const elapsed = Date.now() - record.lockedAt;
  if (elapsed >= LOCKOUT_DURATION_MS) {
    // Auto-unlock
    failedAttempts.delete(email);
    return { locked: false, minutesRemaining: 0 };
  }
  const minutesRemaining = Math.ceil((LOCKOUT_DURATION_MS - elapsed) / 60000);
  return { locked: true, minutesRemaining };
}

/**
 * Record a failed login attempt.
 * @param {string} email
 */
function recordFailedAttempt(email) {
  const record = failedAttempts.get(email) || { attempts: 0, lockedAt: null };
  record.attempts += 1;
  if (record.attempts >= MAX_FAILED_ATTEMPTS) {
    record.lockedAt = Date.now();
  }
  failedAttempts.set(email, record);
}

/**
 * Clear failed attempts after successful login.
 * @param {string} email
 */
function clearFailedAttempts(email) {
  failedAttempts.delete(email);
}

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

  // Seed default categories for the new user
  await seedDefaultCategories(user.id);

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
  // Check account lockout (Feature #7)
  const lockStatus = checkAccountLock(email);
  if (lockStatus.locked) {
    throw new AuthenticationError(
      `Account locked. Try again in ${lockStatus.minutesRemaining} minute${lockStatus.minutesRemaining > 1 ? 's' : ''}.`
    );
  }

  // Find user by email
  const user = await userRepository.findByEmail(email);
  if (!user) {
    recordFailedAttempt(email);
    throw new AuthenticationError('Invalid credentials');
  }

  // Check if account is deleted
  if (user.deleted_at) {
    throw new AuthenticationError('This account has been deleted');
  }

  // Compare password with stored hash
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    recordFailedAttempt(email);
    throw new AuthenticationError('Invalid credentials');
  }

  // Clear failed attempts on successful login
  clearFailedAttempts(email);

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
 * Soft-delete a user account by setting deleted_at timestamp.
 * The account will be permanently deleted after 30 days.
 * Also invalidates all sessions for the user.
 *
 * @param {string} userId - The user's UUID
 * @returns {Promise<{message: string, deletedAt: string}>}
 */
async function deleteAccount(userId) {
  // Set deleted_at to now
  const result = await query(
    `UPDATE users SET deleted_at = NOW() WHERE id = $1 RETURNING deleted_at`,
    [userId]
  );

  if (!result.rows[0]) {
    throw new AuthenticationError('User not found');
  }

  // Invalidate all sessions for this user
  await query(`DELETE FROM sessions WHERE user_id = $1`, [userId]);

  return {
    message: 'Account scheduled for deletion. It will be permanently removed in 30 days.',
    deletedAt: result.rows[0].deleted_at,
  };
}

/**
 * Seed default categories for a newly registered user.
 * Creates common expense and income categories so users have a starting point.
 *
 * @param {string} userId - The new user's UUID
 */
async function seedDefaultCategories(userId) {
  const defaultCategories = [
    // Expense categories
    { name: 'Food & Dining', type: 'expense', icon: 'food', color: '#EF4444' },
    { name: 'Transportation', type: 'expense', icon: 'car', color: '#F97316' },
    { name: 'Shopping', type: 'expense', icon: 'cart', color: '#8B5CF6' },
    { name: 'Bills & Utilities', type: 'expense', icon: 'flash', color: '#F59E0B' },
    { name: 'Entertainment', type: 'expense', icon: 'movie', color: '#EC4899' },
    { name: 'Health', type: 'expense', icon: 'medical-bag', color: '#10B981' },
    { name: 'Education', type: 'expense', icon: 'school', color: '#3B82F6' },
    { name: 'Personal Care', type: 'expense', icon: 'heart', color: '#14B8A6' },
    { name: 'Groceries', type: 'expense', icon: 'basket', color: '#22C55E' },
    { name: 'Other Expense', type: 'expense', icon: 'tag', color: '#64748B' },
    // Income categories
    { name: 'Salary', type: 'income', icon: 'cash', color: '#10B981' },
    { name: 'Freelance', type: 'income', icon: 'laptop', color: '#0D9488' },
    { name: 'Business', type: 'income', icon: 'briefcase', color: '#3B82F6' },
    { name: 'Investments', type: 'income', icon: 'chart-line', color: '#6366F1' },
    { name: 'Gifts', type: 'income', icon: 'gift', color: '#EC4899' },
    { name: 'Other Income', type: 'income', icon: 'tag', color: '#64748B' },
  ];

  // Insert all default categories in a single batch
  const values = defaultCategories.map((cat, i) => {
    const offset = i * 6;
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`;
  }).join(', ');

  const params = defaultCategories.flatMap((cat) => [
    uuidv4(), userId, cat.name, cat.type, cat.icon, cat.color,
  ]);

  await query(
    `INSERT INTO categories (id, user_id, name, type, icon, color) VALUES ${values}`,
    params
  );
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
  deleteAccount,
  forgotPassword,
  resetPassword,
};

// ─── Password Reset (Feature #4) ────────────────────────────────────────────
// SQL to add columns (run manually on Neon):
// ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(6);
// ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP;

/**
 * Generate a 6-digit OTP code for password reset.
 * Stores in DB with 15 minute expiry.
 * Logs OTP to console (email service can be added later).
 *
 * @param {string} email - User's email address
 * @returns {Promise<{message: string}>}
 */
async function forgotPassword(email) {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    // Don't reveal if email exists — return success either way
    return { message: 'If this email is registered, a reset code has been sent.' };
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await query(
    `UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3`,
    [otp, expires.toISOString(), user.id]
  );

  // Log OTP to console (replace with email service later)
  console.log(`[PASSWORD RESET] OTP for ${email}: ${otp} (expires: ${expires.toISOString()})`);

  return { message: 'If this email is registered, a reset code has been sent.' };
}

/**
 * Verify OTP code and reset password.
 *
 * @param {string} email - User's email
 * @param {string} code - 6-digit OTP code
 * @param {string} newPassword - New password to set
 * @returns {Promise<{message: string}>}
 * @throws {AuthenticationError} If code is invalid or expired
 */
async function resetPassword(email, code, newPassword) {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new AuthenticationError('Invalid or expired reset code');
  }

  // Verify code matches and hasn't expired
  const result = await query(
    `SELECT password_reset_token, password_reset_expires FROM users WHERE id = $1`,
    [user.id]
  );

  const row = result.rows[0];
  if (!row || !row.password_reset_token) {
    throw new AuthenticationError('Invalid or expired reset code');
  }

  if (row.password_reset_token !== code) {
    throw new AuthenticationError('Invalid or expired reset code');
  }

  if (new Date(row.password_reset_expires) < new Date()) {
    throw new AuthenticationError('Invalid or expired reset code');
  }

  // Hash new password
  const rounds = Math.max(parseInt(process.env.BCRYPT_ROUNDS, 10) || 10, 10);
  const passwordHash = await bcrypt.hash(newPassword, rounds);

  // Update password and clear reset token
  await query(
    `UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2`,
    [passwordHash, user.id]
  );

  // Invalidate all sessions for security
  await query(`DELETE FROM sessions WHERE user_id = $1`, [user.id]);

  return { message: 'Password reset successfully. Please log in with your new password.' };
}
