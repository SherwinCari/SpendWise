const { validate } = require('../../src/middleware/validate');
const { registerSchema, loginSchema } = require('../../src/validators/auth.validator');
const { createTransactionSchema, updateTransactionSchema } = require('../../src/validators/transaction.validator');
const { createWalletSchema, transferSchema } = require('../../src/validators/wallet.validator');
const { createBudgetSchema } = require('../../src/validators/budget.validator');
const { createCategorySchema, updateCategorySchema } = require('../../src/validators/category.validator');

// Helper to create mock req/res/next
function createMocks(body = {}) {
  const req = { body };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
}

describe('validate middleware', () => {
  it('calls next() when body is valid', () => {
    const { req, res, next } = createMocks({ name: 'John', email: 'john@example.com', password: 'password123' });
    const middleware = validate(registerSchema);
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 400 with VALIDATION_ERROR on invalid body', () => {
    const { req, res, next } = createMocks({});
    const middleware = validate(registerSchema);
    middleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.objectContaining({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: expect.any(Array),
      }),
    }));
  });

  it('returns field-level details for each validation error', () => {
    const { req, res, next } = createMocks({ email: 'not-valid' });
    const middleware = validate(registerSchema);
    middleware(req, res, next);
    const response = res.json.mock.calls[0][0];
    const fields = response.error.details.map((d) => d.field);
    expect(fields).toContain('name');
    expect(fields).toContain('email');
    expect(fields).toContain('password');
    response.error.details.forEach((detail) => {
      expect(detail).toHaveProperty('field');
      expect(detail).toHaveProperty('message');
    });
  });
});

describe('auth.validator', () => {
  describe('registerSchema', () => {
    it('accepts valid registration data', () => {
      const { req, res, next } = createMocks({ name: 'Jane', email: 'jane@test.com', password: 'secure123' });
      validate(registerSchema)(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('rejects missing name', () => {
      const { req, res, next } = createMocks({ email: 'jane@test.com', password: 'secure123' });
      validate(registerSchema)(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('rejects invalid email', () => {
      const { req, res, next } = createMocks({ name: 'Jane', email: 'invalid', password: 'secure123' });
      validate(registerSchema)(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('rejects password shorter than 8 chars', () => {
      const { req, res, next } = createMocks({ name: 'Jane', email: 'jane@test.com', password: 'short' });
      validate(registerSchema)(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('loginSchema', () => {
    it('accepts valid login data', () => {
      const { req, res, next } = createMocks({ email: 'jane@test.com', password: 'secure123' });
      validate(loginSchema)(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('rejects missing email', () => {
      const { req, res, next } = createMocks({ password: 'secure123' });
      validate(loginSchema)(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('rejects missing password', () => {
      const { req, res, next } = createMocks({ email: 'jane@test.com' });
      validate(loginSchema)(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});

describe('transaction.validator', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';

  describe('createTransactionSchema', () => {
    it('accepts valid transaction data', () => {
      const { req, res, next } = createMocks({
        amount: 100.50,
        type: 'expense',
        category_id: validUuid,
        wallet_id: validUuid,
        date: '2024-01-15',
      });
      validate(createTransactionSchema)(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('rejects amount <= 0', () => {
      const { req, res, next } = createMocks({
        amount: 0,
        type: 'expense',
        category_id: validUuid,
        wallet_id: validUuid,
        date: '2024-01-15',
      });
      validate(createTransactionSchema)(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('rejects invalid type', () => {
      const { req, res, next } = createMocks({
        amount: 50,
        type: 'transfer',
        category_id: validUuid,
        wallet_id: validUuid,
        date: '2024-01-15',
      });
      validate(createTransactionSchema)(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('rejects non-UUID category_id', () => {
      const { req, res, next } = createMocks({
        amount: 50,
        type: 'income',
        category_id: 'not-a-uuid',
        wallet_id: validUuid,
        date: '2024-01-15',
      });
      validate(createTransactionSchema)(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('allows optional description', () => {
      const { req, res, next } = createMocks({
        amount: 50,
        type: 'income',
        category_id: validUuid,
        wallet_id: validUuid,
        date: '2024-01-15',
        description: 'Freelance payment',
      });
      validate(createTransactionSchema)(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('updateTransactionSchema', () => {
    it('accepts partial update data', () => {
      const { req, res, next } = createMocks({ amount: 200 });
      validate(updateTransactionSchema)(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('still validates rules on provided fields', () => {
      const { req, res, next } = createMocks({ amount: -5 });
      validate(updateTransactionSchema)(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});

describe('wallet.validator', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';

  describe('createWalletSchema', () => {
    it('accepts valid wallet with name only (balance defaults to 0)', () => {
      const { req, res, next } = createMocks({ name: 'Cash' });
      validate(createWalletSchema)(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('accepts valid wallet with balance', () => {
      const { req, res, next } = createMocks({ name: 'Bank', balance: 1000 });
      validate(createWalletSchema)(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('rejects negative balance', () => {
      const { req, res, next } = createMocks({ name: 'Bank', balance: -100 });
      validate(createWalletSchema)(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('rejects missing name', () => {
      const { req, res, next } = createMocks({ balance: 500 });
      validate(createWalletSchema)(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('transferSchema', () => {
    it('accepts valid transfer', () => {
      const { req, res, next } = createMocks({
        sourceWalletId: validUuid,
        destinationWalletId: '660e8400-e29b-41d4-a716-446655440000',
        amount: 250,
      });
      validate(transferSchema)(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('rejects amount <= 0', () => {
      const { req, res, next } = createMocks({
        sourceWalletId: validUuid,
        destinationWalletId: '660e8400-e29b-41d4-a716-446655440000',
        amount: 0,
      });
      validate(transferSchema)(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('rejects non-UUID wallet IDs', () => {
      const { req, res, next } = createMocks({
        sourceWalletId: 'abc',
        destinationWalletId: 'xyz',
        amount: 100,
      });
      validate(transferSchema)(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});

describe('budget.validator', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';

  describe('createBudgetSchema', () => {
    it('accepts valid budget data', () => {
      const { req, res, next } = createMocks({
        category_id: validUuid,
        amount_limit: 500,
        period: 'monthly',
        start_date: '2024-01-01',
      });
      validate(createBudgetSchema)(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('rejects amount_limit <= 0', () => {
      const { req, res, next } = createMocks({
        category_id: validUuid,
        amount_limit: 0,
        period: 'monthly',
        start_date: '2024-01-01',
      });
      validate(createBudgetSchema)(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('rejects invalid period', () => {
      const { req, res, next } = createMocks({
        category_id: validUuid,
        amount_limit: 500,
        period: 'daily',
        start_date: '2024-01-01',
      });
      validate(createBudgetSchema)(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('rejects missing start_date', () => {
      const { req, res, next } = createMocks({
        category_id: validUuid,
        amount_limit: 500,
        period: 'weekly',
      });
      validate(createBudgetSchema)(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});

describe('category.validator', () => {
  describe('createCategorySchema', () => {
    it('accepts valid category data', () => {
      const { req, res, next } = createMocks({ name: 'Food', type: 'expense' });
      validate(createCategorySchema)(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('accepts category with optional icon and color', () => {
      const { req, res, next } = createMocks({ name: 'Salary', type: 'income', icon: 'wallet', color: '#10B981' });
      validate(createCategorySchema)(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('rejects invalid type', () => {
      const { req, res, next } = createMocks({ name: 'Other', type: 'savings' });
      validate(createCategorySchema)(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('rejects missing name', () => {
      const { req, res, next } = createMocks({ type: 'expense' });
      validate(createCategorySchema)(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('updateCategorySchema', () => {
    it('accepts partial update with name only', () => {
      const { req, res, next } = createMocks({ name: 'Groceries' });
      validate(updateCategorySchema)(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('accepts update with icon and color', () => {
      const { req, res, next } = createMocks({ icon: 'cart', color: '#EF4444' });
      validate(updateCategorySchema)(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('accepts empty body (no required fields)', () => {
      const { req, res, next } = createMocks({});
      validate(updateCategorySchema)(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });
});
