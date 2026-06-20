const jwt = require('jsonwebtoken');

// Use a consistent test secret
const TEST_SECRET = 'test-access-secret';

// Mock the jwt config module — jest.mock is automatically hoisted
jest.mock('../../src/config/jwt', () => {
  const mockVerifyToken = jest.fn();
  return {
    jwtConfig: { accessSecret: 'test-access-secret' },
    verifyToken: mockVerifyToken,
  };
});

const { verifyToken } = require('../../src/config/jwt');
const { authenticate } = require('../../src/middleware/auth');

function mockReq(authHeader) {
  return {
    headers: {
      authorization: authHeader,
    },
  };
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('authenticate middleware', () => {
  let next;

  beforeEach(() => {
    next = jest.fn();
    verifyToken.mockReset();
  });

  it('should return 401 when no Authorization header is present', () => {
    const req = { headers: {} };
    const res = mockRes();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Invalid or expired token',
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when Authorization header does not start with Bearer', () => {
    const req = mockReq('Basic some-token');
    const res = mockRes();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Invalid or expired token',
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when token is empty after Bearer', () => {
    const req = mockReq('Bearer ');
    const res = mockRes();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Invalid or expired token',
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when token verification fails (invalid token)', () => {
    verifyToken.mockImplementation(() => {
      throw new Error('invalid signature');
    });

    const req = mockReq('Bearer invalid-token');
    const res = mockRes();

    authenticate(req, res, next);

    expect(verifyToken).toHaveBeenCalledWith('invalid-token', TEST_SECRET);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Invalid or expired token',
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when token is expired', () => {
    verifyToken.mockImplementation(() => {
      const err = new Error('jwt expired');
      err.name = 'TokenExpiredError';
      throw err;
    });

    const req = mockReq('Bearer expired-token');
    const res = mockRes();

    authenticate(req, res, next);

    expect(verifyToken).toHaveBeenCalledWith('expired-token', TEST_SECRET);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Invalid or expired token',
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should attach userId to req and call next() on valid token', () => {
    const userId = 'user-123-uuid';
    verifyToken.mockReturnValue({ userId });

    const req = mockReq('Bearer valid-token');
    const res = mockRes();

    authenticate(req, res, next);

    expect(verifyToken).toHaveBeenCalledWith('valid-token', TEST_SECRET);
    expect(req.userId).toBe(userId);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
