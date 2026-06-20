/**
 * Validation middleware factory.
 * Validates req.body against a Joi schema.
 * Returns 400 with VALIDATION_ERROR and field-level details on failure.
 * Calls next() on success.
 */
function validate(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details,
        },
      });
    }

    next();
  };
}

module.exports = { validate };
