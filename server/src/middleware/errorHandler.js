const { AppError } = require('../utils/errors');

/**
 * Global error-handling middleware.
 * Maps AppError instances to structured JSON responses.
 * Unexpected errors are logged and return a generic 500 response.
 */
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    const response = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    };

    if (err.details) {
      response.error.details = err.details;
    }

    return res.status(err.statusCode).json(response);
  }

  // Handle JSON parse errors from express.json()
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'PARSE_ERROR',
        message: 'Malformed JSON in request body',
      },
    });
  }

  // Unexpected error — log full stack, return generic message
  console.error('Unexpected error:', err);

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}

module.exports = { errorHandler };
