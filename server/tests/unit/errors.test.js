const {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  DuplicateError,
  ConflictError,
  InsufficientFundsError,
} = require('../../src/utils/errors');
const { errorHandler } = require('../../src/middleware/errorHandler');

describe('Custom Error Classes', () => {
  describe('AppError', () => {
    it('should set message, statusCode, code, and details', () => {
      const err = new AppError('Something broke', 500, 'TEST_ERROR', [{ field: 'x' }]);
      expect(err.message).toBe('Something broke');
      expect(err.statusCode).toBe(500);
      expect(err.code).toBe('TEST_ERROR');
      expect(err.details).toEqual([{ field: 'x' }]);
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe('AppError');
    });

    it('should default details to null', () => {
      const err = new AppError('msg', 400, 'CODE');
      expect(err.details).toBeNull();
    });
  });

  describe('ValidationError', () => {
    it('should have status 400 and VALIDATION_ERROR code', () => {
      const details = [{ field: 'email', message: 'Invalid email' }];
      const err = new ValidationError('Validation failed', details);
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.details).toEqual(details);
      expect(err).toBeInstanceOf(AppError);
    });

    it('should use default message and empty details', () => {
      const err = new ValidationError();
      expect(err.message).toBe('Validation failed');
      expect(err.details).toEqual([]);
    });
  });

  describe('AuthenticationError', () => {
    it('should have status 401 and AUTHENTICATION_ERROR code', () => {
      const err = new AuthenticationError();
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('AUTHENTICATION_ERROR');
      expect(err.message).toBe('Invalid or expired token');
    });
  });

  describe('AuthorizationError', () => {
    it('should have status 403 and AUTHORIZATION_ERROR code', () => {
      const err = new AuthorizationError();
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('AUTHORIZATION_ERROR');
    });
  });

  describe('NotFoundError', () => {
    it('should have status 404 and NOT_FOUND code', () => {
      const err = new NotFoundError('Wallet not found');
      expect(err.statusCode).toBe(404);
      expect(err.code).toBe('NOT_FOUND');
      expect(err.message).toBe('Wallet not found');
    });
  });

  describe('DuplicateError', () => {
    it('should have status 400 and DUPLICATE_ERROR code', () => {
      const err = new DuplicateError('Email already in use');
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('DUPLICATE_ERROR');
      expect(err.message).toBe('Email already in use');
    });
  });

  describe('ConflictError', () => {
    it('should have status 409 and CONFLICT code', () => {
      const err = new ConflictError('Wallet has transactions');
      expect(err.statusCode).toBe(409);
      expect(err.code).toBe('CONFLICT');
      expect(err.message).toBe('Wallet has transactions');
    });
  });

  describe('InsufficientFundsError', () => {
    it('should have status 400 and INSUFFICIENT_FUNDS code', () => {
      const err = new InsufficientFundsError();
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('INSUFFICIENT_FUNDS');
      expect(err.message).toBe('Insufficient funds for this operation');
    });
  });
});

describe('errorHandler middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  it('should handle AppError with structured JSON and correct status', () => {
    const err = new ValidationError('Bad input', [{ field: 'amount', message: 'Required' }]);

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Bad input',
        details: [{ field: 'amount', message: 'Required' }],
      },
    });
  });

  it('should not include details field when details is null', () => {
    const err = new NotFoundError('Not found');

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    const response = mockRes.json.mock.calls[0][0];
    expect(response.error).not.toHaveProperty('details');
  });

  it('should handle unexpected errors with 500 and generic message', () => {
    const err = new Error('Database connection failed');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should handle AuthorizationError correctly', () => {
    const err = new AuthorizationError('Access denied');

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'AUTHORIZATION_ERROR',
        message: 'Access denied',
      },
    });
  });

  it('should handle InsufficientFundsError correctly', () => {
    const err = new InsufficientFundsError('Not enough balance');

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INSUFFICIENT_FUNDS',
        message: 'Not enough balance',
      },
    });
  });
});
