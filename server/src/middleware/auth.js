const { verifyToken, jwtConfig } = require('../config/jwt');

/**
 * Authentication middleware.
 * Extracts JWT from the Authorization header (Bearer scheme),
 * verifies signature and expiry, and attaches req.userId on success.
 * Returns 401 with AUTHENTICATION_ERROR on failure.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Invalid or expired token',
      },
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Invalid or expired token',
      },
    });
  }

  try {
    const decoded = verifyToken(token, jwtConfig.accessSecret);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Invalid or expired token',
      },
    });
  }
}

module.exports = { authenticate };
