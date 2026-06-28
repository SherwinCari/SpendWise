'use strict';

/**
 * Rate Limiter + Account Lockout Middleware
 * 
 * Two layers of protection:
 * 1. IP-based rate limiting: 10 requests per minute per IP on auth endpoints
 * 2. Email-based account lockout: 5 failed login attempts → locked for 10 minutes
 */

// In-memory stores
const ipAttempts = new Map();
const emailLockouts = new Map();

const IP_WINDOW_MS = 60 * 1000; // 1 minute window for IP rate limiting
const IP_MAX_ATTEMPTS = 10; // 10 requests per minute per IP
const LOCKOUT_MAX_ATTEMPTS = 5; // 5 failed logins per email
const LOCKOUT_DURATION_MS = 10 * 60 * 1000; // 10 minutes lockout

// Clean up expired entries every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of ipAttempts.entries()) {
    if (now - data.windowStart > IP_WINDOW_MS) {
      ipAttempts.delete(key);
    }
  }
  for (const [key, data] of emailLockouts.entries()) {
    if (data.lockedUntil && now > data.lockedUntil) {
      emailLockouts.delete(key);
    }
  }
}, 2 * 60 * 1000);

/**
 * IP-based rate limiter for auth endpoints.
 * Blocks after 10 requests per minute from the same IP.
 */
function authRateLimiter(req, res, next) {
  const key = `${req.ip}:${req.originalUrl}`;
  const now = Date.now();
  const record = ipAttempts.get(key);

  if (!record || now - record.windowStart > IP_WINDOW_MS) {
    ipAttempts.set(key, { count: 1, windowStart: now });
    return next();
  }

  record.count += 1;

  if (record.count > IP_MAX_ATTEMPTS) {
    return res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many attempts. Please try again in a minute.',
      },
    });
  }

  next();
}

/**
 * Check if an email is currently locked out.
 * @param {string} email
 * @returns {{ locked: boolean, minutesRemaining?: number }}
 */
function isAccountLocked(email) {
  const record = emailLockouts.get(email.toLowerCase());
  if (!record || !record.lockedUntil) return { locked: false };

  const now = Date.now();
  if (now < record.lockedUntil) {
    const minutesRemaining = Math.ceil((record.lockedUntil - now) / 60000);
    return { locked: true, minutesRemaining };
  }

  // Lockout expired — clear it
  emailLockouts.delete(email.toLowerCase());
  return { locked: false };
}

/**
 * Record a failed login attempt for an email.
 * Locks the account after 5 failures for 10 minutes.
 * @param {string} email
 * @returns {{ locked: boolean, attemptsRemaining?: number }}
 */
function recordFailedAttempt(email) {
  const key = email.toLowerCase();
  const record = emailLockouts.get(key) || { count: 0, lockedUntil: null };

  record.count += 1;

  if (record.count >= LOCKOUT_MAX_ATTEMPTS) {
    record.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    emailLockouts.set(key, record);
    return { locked: true, attemptsRemaining: 0 };
  }

  emailLockouts.set(key, record);
  return { locked: false, attemptsRemaining: LOCKOUT_MAX_ATTEMPTS - record.count };
}

/**
 * Clear failed attempts for an email (call on successful login).
 * @param {string} email
 */
function clearFailedAttempts(email) {
  emailLockouts.delete(email.toLowerCase());
}

module.exports = {
  authRateLimiter,
  isAccountLocked,
  recordFailedAttempt,
  clearFailedAttempts,
};
