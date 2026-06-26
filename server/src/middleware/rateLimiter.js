'use strict';

/**
 * Rate Limiter Middleware for Auth Endpoints
 * Limits to 5 attempts per minute per IP on login/register.
 * Returns 429 with friendly message when exceeded.
 */

// Simple in-memory rate limiter (no external dependency needed)
const attempts = new Map();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_ATTEMPTS = 5;

/**
 * Clean up expired entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of attempts.entries()) {
    if (now - data.windowStart > WINDOW_MS) {
      attempts.delete(key);
    }
  }
}, 60 * 1000);

/**
 * Rate limiter middleware factory
 * @param {object} options
 * @param {number} [options.windowMs] - Time window in milliseconds (default: 60000)
 * @param {number} [options.max] - Maximum attempts in window (default: 5)
 * @returns {function} Express middleware
 */
function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || WINDOW_MS;
  const max = options.max || MAX_ATTEMPTS;

  return (req, res, next) => {
    const key = `${req.ip}:${req.originalUrl}`;
    const now = Date.now();

    const record = attempts.get(key);

    if (!record) {
      attempts.set(key, { count: 1, windowStart: now });
      return next();
    }

    // Reset window if expired
    if (now - record.windowStart > windowMs) {
      attempts.set(key, { count: 1, windowStart: now });
      return next();
    }

    // Increment count
    record.count += 1;

    if (record.count > max) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many attempts. Please try again later.',
        },
      });
    }

    next();
  };
}

const authRateLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 5 });

module.exports = { createRateLimiter, authRateLimiter };
