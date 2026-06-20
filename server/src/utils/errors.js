/**
 * Custom error classes for SpendWise API.
 * All custom errors extend AppError which provides statusCode, code, and details.
 */

class AppError extends Error {
  /**
   * @param {string} message - Human-readable error description
   * @param {number} statusCode - HTTP status code
   * @param {string} code - Machine-readable error code
   * @param {Array|null} details - Optional array of field-level error details
   */
  constructor(message, statusCode, code, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  /**
   * @param {string} message - Human-readable validation error description
   * @param {Array} details - Array of field-level errors, e.g. [{ field, message }]
   */
  constructor(message = 'Validation failed', details = []) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

class AuthenticationError extends AppError {
  /**
   * @param {string} message - Human-readable authentication error description
   */
  constructor(message = 'Invalid or expired token') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  /**
   * @param {string} message - Human-readable authorization error description
   */
  constructor(message = 'You do not have permission to access this resource') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  /**
   * @param {string} message - Human-readable not found description
   */
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

class DuplicateError extends AppError {
  /**
   * @param {string} message - Human-readable duplicate error description
   */
  constructor(message = 'Resource already exists') {
    super(message, 400, 'DUPLICATE_ERROR');
  }
}

class ConflictError extends AppError {
  /**
   * @param {string} message - Human-readable conflict description
   */
  constructor(message = 'Resource state conflict') {
    super(message, 409, 'CONFLICT');
  }
}

class InsufficientFundsError extends AppError {
  /**
   * @param {string} message - Human-readable insufficient funds description
   */
  constructor(message = 'Insufficient funds for this operation') {
    super(message, 400, 'INSUFFICIENT_FUNDS');
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  DuplicateError,
  ConflictError,
  InsufficientFundsError,
};
