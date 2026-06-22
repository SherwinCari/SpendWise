'use strict';

const { Router } = require('express');
const authService = require('../services/auth.service');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { registerSchema, loginSchema } = require('../validators/auth.validator');

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user account.
 * Validates body with registerSchema, then calls auth.service.register.
 */
router.post('/register', validate(registerSchema), async (req, res, next) => {
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
 * Validates body with loginSchema, then calls auth.service.login.
 */
router.post('/login', validate(loginSchema), async (req, res, next) => {
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

module.exports = router;
