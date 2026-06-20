'use strict';

const fc = require('fast-check');
const { createCategorySchema } = require('../../src/validators/category.validator');
const { createBudgetSchema } = require('../../src/validators/budget.validator');

// Mock the wallet repository and database before requiring the service
jest.mock('../../src/repositories/wallet.repository', () => ({
  findById: jest.fn(),
  updateBalance: jest.fn(),
  create: jest.fn(),
  findByUserId: jest.fn(),
  updateName: jest.fn(),
  delete: jest.fn(),
  hasTransactions: jest.fn(),
}));
jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

// Mock repositories for duplicate detection tests
jest.mock('../../src/repositories/user.repository', () => ({
  findByEmail: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
}));
jest.mock('../../src/repositories/category.repository', () => ({
  findDuplicate: jest.fn(),
  create: jest.fn(),
  findByUserId: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  reassignTransactions: jest.fn(),
}));
jest.mock('../../src/repositories/budget.repository', () => ({
  findDuplicate: jest.fn(),
  create: jest.fn(),
  createTracking: jest.fn(),
  findByUserId: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByCategoryAndPeriod: jest.fn(),
  updateSpent: jest.fn(),
  getTracking: jest.fn(),
  deleteTracking: jest.fn(),
}));
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$10$hashedpassword'),
  compare: jest.fn(),
}));

const walletRepository = require('../../src/repositories/wallet.repository');
const { getClient } = require('../../src/config/database');
const walletService = require('../../src/services/wallet.service');
const { InsufficientFundsError, ValidationError, DuplicateError } = require('../../src/utils/errors');

// Services and repositories for duplicate detection tests
const userRepository = require('../../src/repositories/user.repository');
const categoryRepository = require('../../src/repositories/category.repository');
const budgetRepository = require('../../src/repositories/budget.repository');
const authService = require('../../src/services/auth.service');
const categoryService = require('../../src/services/category.service');
const budgetService = require('../../src/services/budget.service');

// Feature: spendwise-expense-tracker, Property 12: Invalid Transfer Rejection
describe('Property 12: Invalid Transfer Rejection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * **Validates: Requirements 11.2**
   *
   * For any transfer where amount exceeds the source wallet balance,
   * the Wallet_Service SHALL reject the transfer without modifying any wallet balance.
   */
  test('transfers exceeding source balance are rejected without balance modification', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate source balance: positive number between 0.01 and 9999.99
        fc.integer({ min: 1, max: 999999 }).map((n) => parseFloat((n / 100).toFixed(2))),
        // Generate excess multiplier (1.01x to 10x of source balance)
        fc.integer({ min: 101, max: 1000 }).map((n) => n / 100),
        async (sourceBalance, multiplier) => {
          // Transfer amount exceeds source balance
          const transferAmount = parseFloat((sourceBalance * multiplier).toFixed(2));

          const userId = 'user-1';
          const sourceWalletId = 'wallet-source';
          const destinationWalletId = 'wallet-dest';

          walletRepository.findById.mockImplementation((id) => {
            if (id === sourceWalletId) {
              return Promise.resolve({
                id: sourceWalletId,
                user_id: userId,
                name: 'Source Wallet',
                balance: sourceBalance.toString(),
              });
            }
            if (id === destinationWalletId) {
              return Promise.resolve({
                id: destinationWalletId,
                user_id: userId,
                name: 'Destination Wallet',
                balance: '500.00',
              });
            }
            return Promise.resolve(null);
          });

          // Transfer should be rejected
          await expect(
            walletService.transfer(userId, {
              sourceWalletId,
              destinationWalletId,
              amount: transferAmount,
            })
          ).rejects.toThrow(InsufficientFundsError);

          // Verify no balance updates were made (updateBalance never called)
          expect(walletRepository.updateBalance).not.toHaveBeenCalled();
          // Verify getClient was never called (no DB transaction started)
          expect(getClient).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 11.3**
   *
   * For any transfer where amount is ≤ 0,
   * the Wallet_Service SHALL reject the transfer without modifying any wallet balance.
   */
  test('transfers with amount <= 0 are rejected without balance modification', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate invalid amounts: zero or negative
        fc.oneof(
          fc.constant(0),
          fc.integer({ min: -1000000, max: -1 }).map((n) => n / 100)
        ),
        async (invalidAmount) => {
          const userId = 'user-1';
          const sourceWalletId = 'wallet-source';
          const destinationWalletId = 'wallet-dest';

          // Transfer should be rejected before even fetching wallets
          await expect(
            walletService.transfer(userId, {
              sourceWalletId,
              destinationWalletId,
              amount: invalidAmount,
            })
          ).rejects.toThrow(ValidationError);

          // Verify no wallet lookups or balance updates occurred
          expect(walletRepository.findById).not.toHaveBeenCalled();
          expect(walletRepository.updateBalance).not.toHaveBeenCalled();
          expect(getClient).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 11.4**
   *
   * For any transfer where source and destination wallets are the same,
   * the Wallet_Service SHALL reject the transfer without modifying any wallet balance.
   */
  test('transfers with same source and destination are rejected without balance modification', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a wallet ID (UUID-like string)
        fc.uuid(),
        // Generate a valid transfer amount (positive)
        fc.integer({ min: 1, max: 1000000 }).map((n) => parseFloat((n / 100).toFixed(2))),
        async (walletId, amount) => {
          const userId = 'user-1';

          // Transfer should be rejected (same source and destination)
          await expect(
            walletService.transfer(userId, {
              sourceWalletId: walletId,
              destinationWalletId: walletId,
              amount,
            })
          ).rejects.toThrow(ValidationError);

          // Verify no wallet lookups or balance updates occurred
          expect(walletRepository.findById).not.toHaveBeenCalled();
          expect(walletRepository.updateBalance).not.toHaveBeenCalled();
          expect(getClient).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });
});


// Feature: spendwise-expense-tracker, Property 14: Enum Field Validation
describe('Property 14: Enum Field Validation', () => {
  const VALID_CATEGORY_TYPES = ['income', 'expense'];
  const VALID_BUDGET_PERIODS = ['weekly', 'monthly'];

  /**
   * **Validates: Requirements 3.6**
   *
   * For any string value that is not in the allowed set for category type
   * ("income" or "expense"), the validation schema SHALL reject the request
   * with a validation error.
   */
  test('invalid category type values are rejected with validation error', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !VALID_CATEGORY_TYPES.includes(s)),
        (invalidType) => {
          const input = {
            name: 'Test Category',
            type: invalidType,
          };

          const { error } = createCategorySchema.validate(input, { abortEarly: false });

          // Must produce a validation error
          expect(error).toBeDefined();
          expect(error).not.toBeNull();

          // Error should relate to the 'type' field
          const typeErrors = error.details.filter(
            (detail) => detail.path.includes('type')
          );
          expect(typeErrors.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 8.6**
   *
   * For any string value that is not in the allowed set for budget period
   * ("weekly" or "monthly"), the validation schema SHALL reject the request
   * with a validation error.
   */
  test('invalid budget period values are rejected with validation error', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !VALID_BUDGET_PERIODS.includes(s)),
        (invalidPeriod) => {
          const input = {
            category_id: '550e8400-e29b-41d4-a716-446655440000',
            amount_limit: 100,
            period: invalidPeriod,
            start_date: '2024-01-01',
          };

          const { error } = createBudgetSchema.validate(input, { abortEarly: false });

          // Must produce a validation error
          expect(error).toBeDefined();
          expect(error).not.toBeNull();

          // Error should relate to the 'period' field
          const periodErrors = error.details.filter(
            (detail) => detail.path.includes('period')
          );
          expect(periodErrors.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});


// Feature: spendwise-expense-tracker, Property 17: Duplicate Detection
describe('Property 17: Duplicate Detection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * **Validates: Requirements 1.2**
   *
   * For any email that already exists in the system, attempting to register
   * with that email SHALL be rejected without creating any record.
   */
  test('duplicate email registration is rejected without data modification', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random email-like strings
        fc.tuple(
          fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'), { minLength: 1, maxLength: 20 }),
          fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'), { minLength: 2, maxLength: 10 })
        ).map(([local, domain]) => `${local}@${domain}.com`),
        // Generate random name
        fc.string({ minLength: 1, maxLength: 50 }),
        // Generate random password (>=8 chars)
        fc.string({ minLength: 8, maxLength: 30 }),
        async (email, name, password) => {
          // Mock findByEmail to return an existing user (duplicate)
          userRepository.findByEmail.mockResolvedValue({
            id: 'existing-user-id',
            name: 'Existing User',
            email: email,
            password_hash: '$2b$10$existinghash',
            created_at: new Date().toISOString(),
          });

          // Attempt to register with duplicate email should throw DuplicateError
          await expect(
            authService.register(name, email, password)
          ).rejects.toThrow(DuplicateError);

          // Verify no user was created
          expect(userRepository.create).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 3.2**
   *
   * For any category name+type combination that already exists for the same user,
   * attempting to create a duplicate category SHALL be rejected without creating any record.
   */
  test('duplicate category name+type is rejected without data modification', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random category name
        fc.string({ minLength: 1, maxLength: 50 }),
        // Generate category type (income or expense)
        fc.constantFrom('income', 'expense'),
        // Generate a random user ID
        fc.uuid(),
        async (categoryName, categoryType, userId) => {
          // Mock findDuplicate to return an existing category (duplicate)
          categoryRepository.findDuplicate.mockResolvedValue({
            id: 'existing-category-id',
            user_id: userId,
            name: categoryName,
            type: categoryType,
            icon: null,
            color: null,
            created_at: new Date().toISOString(),
          });

          // Attempt to create duplicate category should throw DuplicateError
          await expect(
            categoryService.create(userId, { name: categoryName, type: categoryType, icon: null, color: null })
          ).rejects.toThrow(DuplicateError);

          // Verify no category was created
          expect(categoryRepository.create).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 8.2**
   *
   * For any budget with the same category+period that already exists for a user,
   * attempting to create a duplicate budget SHALL be rejected without creating any record.
   */
  test('duplicate budget category+period is rejected without data modification', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a random user ID
        fc.uuid(),
        // Generate a random category ID
        fc.uuid(),
        // Generate budget period
        fc.constantFrom('weekly', 'monthly'),
        // Generate amount limit (positive)
        fc.integer({ min: 1, max: 1000000 }).map((n) => parseFloat((n / 100).toFixed(2))),
        // Generate start date
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
          .map((d) => d.toISOString().split('T')[0]),
        async (userId, categoryId, period, amountLimit, startDate) => {
          // Mock findDuplicate to return an existing budget (duplicate)
          budgetRepository.findDuplicate.mockResolvedValue({
            id: 'existing-budget-id',
            user_id: userId,
            category_id: categoryId,
            amount_limit: amountLimit.toString(),
            period: period,
            start_date: startDate,
            end_date: null,
            created_at: new Date().toISOString(),
          });

          // Attempt to create duplicate budget should throw DuplicateError
          await expect(
            budgetService.create(userId, { categoryId, amountLimit, period, startDate })
          ).rejects.toThrow(DuplicateError);

          // Verify no budget was created
          expect(budgetRepository.create).not.toHaveBeenCalled();
          // Verify no tracking was created
          expect(budgetRepository.createTracking).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });
});
