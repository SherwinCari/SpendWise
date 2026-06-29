'use strict';

const { Router } = require('express');
const authService = require('../services/auth.service');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { registerSchema, loginSchema } = require('../validators/auth.validator');
const { authRateLimiter } = require('../middleware/rateLimiter');
const emailService = require('../services/email.service');
const { query } = require('../config/database');
const bcrypt = require('bcrypt');

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user account.
 * Rate limited: 5 attempts per minute per IP.
 */
router.post('/register', authRateLimiter, validate(registerSchema), async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const result = await authService.register(name, email, password);

    res.status(201).json({
      success: true,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Authenticate a user with email and password.
 * Rate limited: 5 attempts per minute per IP.
 */
router.post('/login', authRateLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    res.status(200).json({
      success: true,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/forgot-password
 * Request a password reset OTP code.
 * Rate limited to prevent abuse.
 */
router.post('/forgot-password', authRateLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email is required' },
      });
    }

    const result = await authService.forgotPassword(email.trim().toLowerCase());

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/reset-password
 * Verify OTP code and set new password.
 */
router.post('/reset-password', authRateLimiter, async (req, res, next) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email, code, and newPassword are required' },
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters' },
      });
    }

    const result = await authService.resetPassword(email.trim().toLowerCase(), code, newPassword);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/refresh
 * Refresh an access token using a valid refresh token.
 * Expects { refreshToken } in the request body.
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Refresh token is required',
        },
      });
    }

    const result = await authService.refreshToken(refreshToken);

    res.status(200).json({
      success: true,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout
 * Invalidate the session associated with the refresh token.
 * Requires authentication (Bearer token in Authorization header).
 * Expects { refreshToken } in the request body.
 */
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Refresh token is required',
        },
      });
    }

    await authService.logout(refreshToken);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/auth/account
 * Soft-delete the authenticated user's account.
 * Sets deleted_at timestamp — account will be permanently removed after 30 days.
 * Requires authentication.
 */
router.delete('/account', authenticate, async (req, res, next) => {
  try {
    const result = await authService.deleteAccount(req.userId);

    res.status(200).json({
      success: true,
      message: result.message,
      deletedAt: result.deletedAt,
    });
  } catch (err) {
    next(err);
  }
});

// In-memory store for password change codes
const passwordChangeCodes = new Map();

// In-memory store for password change daily limits (2 per user per day)
const passwordChangeLimits = new Map();

/**
 * Check if a user has exceeded daily password change limit (2 per day).
 * @param {string} userId
 * @returns {{ allowed: boolean, remaining: number }}
 */
function checkPasswordChangeLimit(userId) {
  const record = passwordChangeLimits.get(userId);
  const now = Date.now();

  if (!record || now > record.resetsAt) {
    return { allowed: true, remaining: 2 };
  }

  if (record.count >= 2) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: 2 - record.count };
}

/**
 * Record a password change attempt for the user.
 * @param {string} userId
 */
function recordPasswordChange(userId) {
  const now = Date.now();
  const record = passwordChangeLimits.get(userId);

  // Reset if expired
  if (!record || now > record.resetsAt) {
    const resetsAt = now + 24 * 60 * 60 * 1000; // 24 hours from now
    passwordChangeLimits.set(userId, { count: 1, resetsAt });
    return;
  }

  record.count += 1;
  passwordChangeLimits.set(userId, record);
}

// Clean up expired password change limits every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of passwordChangeLimits.entries()) {
    if (now > data.resetsAt) {
      passwordChangeLimits.delete(key);
    }
  }
}, 60 * 60 * 1000);

/**
 * POST /api/auth/request-password-change
 * Authenticated user requests a password change.
 * Generates a 6-digit code, stores with 10min expiry, emails it.
 */
router.post('/request-password-change', authenticate, authRateLimiter, async (req, res, next) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'New password must be at least 8 characters' },
      });
    }

    // Check daily password change limit (2 per day)
    const limitCheck = checkPasswordChangeLimit(req.userId);
    if (!limitCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'PASSWORD_CHANGE_LIMIT',
          message: 'You can only change your password 2 times per day. Please try again tomorrow.',
        },
      });
    }

    // Get user email
    const userResult = await query('SELECT email FROM users WHERE id = $1', [req.userId]);
    const user = userResult.rows[0];
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Hash the new password now so we never store plaintext in memory
    const rounds = Math.max(parseInt(process.env.BCRYPT_ROUNDS, 10) || 10, 10);
    const newPasswordHash = await bcrypt.hash(newPassword, rounds);

    // Store code and hashed password in memory
    passwordChangeCodes.set(req.userId, { code, expiresAt, newPasswordHash });

    // Send email
    try {
      await emailService.sendPasswordChangeCode(user.email, code);
    } catch (emailErr) {
      console.error('[EMAIL] Failed to send password change code:', emailErr.message);
      // Still log the code for development fallback
      console.log(`[PASSWORD CHANGE] Code for ${user.email}: ${code}`);
    }

    res.status(200).json({
      success: true,
      message: 'Verification code sent to your email.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/confirm-password-change
 * Verify the 6-digit code and update the password.
 */
router.post('/confirm-password-change', authenticate, authRateLimiter, async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Verification code is required' },
      });
    }

    const record = passwordChangeCodes.get(req.userId);
    if (!record) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_CODE', message: 'No pending password change request. Please request a new code.' },
      });
    }

    if (Date.now() > record.expiresAt) {
      passwordChangeCodes.delete(req.userId);
      return res.status(400).json({
        success: false,
        error: { code: 'CODE_EXPIRED', message: 'Verification code has expired. Please request a new one.' },
      });
    }

    if (record.code !== code) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_CODE', message: 'Incorrect verification code.' },
      });
    }

    // Use the pre-hashed password (hashed at request time, never stored as plaintext)
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [record.newPasswordHash, req.userId]);

    // Record this password change against the daily limit
    recordPasswordChange(req.userId);

    // Clean up
    passwordChangeCodes.delete(req.userId);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
