const jwt = require('jsonwebtoken');

const jwtConfig = {
  accessSecret: process.env.JWT_ACCESS_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
};

/**
 * Generate a short-lived access token for the given user.
 * @param {string} userId - The user's UUID
 * @returns {string} Signed JWT access token
 */
function generateAccessToken(userId) {
  return jwt.sign({ userId }, jwtConfig.accessSecret, {
    expiresIn: jwtConfig.accessExpiry,
  });
}

/**
 * Generate a long-lived refresh token for the given user.
 * @param {string} userId - The user's UUID
 * @returns {string} Signed JWT refresh token
 */
function generateRefreshToken(userId) {
  return jwt.sign({ userId }, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiry,
  });
}

/**
 * Verify and decode a JWT token.
 * @param {string} token - The JWT string to verify
 * @param {string} secret - The secret key used to sign the token
 * @returns {object} Decoded token payload
 * @throws {JsonWebTokenError|TokenExpiredError} If token is invalid or expired
 */
function verifyToken(token, secret) {
  return jwt.verify(token, secret);
}

module.exports = {
  jwtConfig,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
};
