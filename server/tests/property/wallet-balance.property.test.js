'use strict';

const fc = require('fast-check');

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

const walletRepository = require('../../src/repositories/wallet.repository');
const walletService = require('../../src/services/wallet.service');

// Feature: spendwise-expense-tracker, Property 3: Wallet Balance Adjustment Invariant
describe('Property 3: Wallet Balance Adjustment Invariant', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * **Validates: Requirements 4.2, 4.3**
   *
   * For any transaction of a given amount and type, adjustBalance SHALL adjust
   * the wallet balance by exactly that amount (decrease for expense, increase for income).
   */
  test('adjustBalance adjusts wallet balance correctly for income transactions', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate initial balance: positive number with 2 decimal places
        fc.integer({ min: 1, max: 1000000 }).map((n) => n / 100),
        // Generate transaction amount: positive number
        fc.integer({ min: 1, max: 1000000 }).map((n) => n / 100),
        async (initialBalance, amount) => {
          const walletId = 'wallet-001';

          // Mock findById to return a wallet with the known initial balance
          walletRepository.findById.mockResolvedValue({
            id: walletId,
            user_id: 'user-001',
            name: 'Test Wallet',
            balance: initialBalance.toString(),
          });

          // Capture the new balance passed to updateBalance
          let capturedBalance = null;
          walletRepository.updateBalance.mockImplementation((id, newBalance) => {
            capturedBalance = newBalance;
            return Promise.resolve({
              id,
              user_id: 'user-001',
              name: 'Test Wallet',
              balance: newBalance.toString(),
            });
          });

          await walletService.adjustBalance(walletId, amount, 'income');

          // For income: new balance = initialBalance + amount
          const expectedBalance = initialBalance + amount;
          expect(capturedBalance).toBeCloseTo(expectedBalance, 10);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 4.2, 4.3**
   */
  test('adjustBalance adjusts wallet balance correctly for expense transactions', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate initial balance: positive number with 2 decimal places
        fc.integer({ min: 1, max: 1000000 }).map((n) => n / 100),
        // Generate transaction amount: positive, will be constrained to <= initialBalance
        fc.integer({ min: 1, max: 1000000 }).map((n) => n / 100),
        async (initialBalance, rawAmount) => {
          // Ensure amount <= initialBalance to avoid InsufficientFundsError
          const amount = Math.min(rawAmount, initialBalance);
          const walletId = 'wallet-001';

          // Mock findById to return a wallet with the known initial balance
          walletRepository.findById.mockResolvedValue({
            id: walletId,
            user_id: 'user-001',
            name: 'Test Wallet',
            balance: initialBalance.toString(),
          });

          // Capture the new balance passed to updateBalance
          let capturedBalance = null;
          walletRepository.updateBalance.mockImplementation((id, newBalance) => {
            capturedBalance = newBalance;
            return Promise.resolve({
              id,
              user_id: 'user-001',
              name: 'Test Wallet',
              balance: newBalance.toString(),
            });
          });

          await walletService.adjustBalance(walletId, amount, 'expense');

          // For expense: new balance = initialBalance - amount
          const expectedBalance = initialBalance - amount;
          expect(capturedBalance).toBeCloseTo(expectedBalance, 10);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 5.2, 6.1, 6.2**
   *
   * Creating a transaction adjusts the balance, and deleting/reversing the transaction
   * (calling adjustBalance with the opposite type) restores the original balance.
   */
  test('adjustBalance is reversible: applying then reversing restores original balance', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate initial balance: positive number with 2 decimal places
        fc.integer({ min: 100, max: 1000000 }).map((n) => n / 100),
        // Generate transaction amount
        fc.integer({ min: 1, max: 1000000 }).map((n) => n / 100),
        // Generate transaction type
        fc.constantFrom('income', 'expense'),
        async (initialBalance, rawAmount, type) => {
          // For expense, ensure amount <= initialBalance
          const amount = type === 'expense'
            ? Math.min(rawAmount, initialBalance)
            : rawAmount;

          const walletId = 'wallet-001';
          let currentBalance = initialBalance;

          // Mock findById to always return current balance state
          walletRepository.findById.mockImplementation(() => {
            return Promise.resolve({
              id: walletId,
              user_id: 'user-001',
              name: 'Test Wallet',
              balance: currentBalance.toString(),
            });
          });

          // Mock updateBalance to track balance changes
          walletRepository.updateBalance.mockImplementation((id, newBalance) => {
            currentBalance = newBalance;
            return Promise.resolve({
              id,
              user_id: 'user-001',
              name: 'Test Wallet',
              balance: newBalance.toString(),
            });
          });

          // Step 1: Apply the transaction (create)
          await walletService.adjustBalance(walletId, amount, type);

          // Step 2: Reverse the transaction (delete) - use opposite type
          const reverseType = type === 'income' ? 'expense' : 'income';
          await walletService.adjustBalance(walletId, amount, reverseType);

          // After reversal, balance should be restored to the initial value
          expect(currentBalance).toBeCloseTo(initialBalance, 10);
        }
      ),
      { numRuns: 100 }
    );
  });
});


// Feature: spendwise-expense-tracker, Property 4: Wallet Transfer Conservation
const { getClient } = require('../../src/config/database');

describe('Property 4: Wallet Transfer Conservation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * **Validates: Requirements 11.1**
   *
   * For any valid transfer of amount A between a source wallet and destination wallet,
   * the source balance SHALL decrease by A, the destination balance SHALL increase by A,
   * and the total sum of all wallet balances SHALL remain unchanged.
   */
  test('transfer preserves total sum of wallet balances', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate source balance: positive, between 0.01 and 999999.99
        fc.integer({ min: 1, max: 99999999 }).map((n) => parseFloat((n / 100).toFixed(2))),
        // Generate destination balance: non-negative, between 0 and 999999.99
        fc.integer({ min: 0, max: 99999999 }).map((n) => parseFloat((n / 100).toFixed(2))),
        // Generate transfer percentage (1-100% of source balance)
        fc.integer({ min: 1, max: 100 }),
        async (sourceBalance, destBalance, percentOfSource) => {
          // Transfer amount is a percentage of source balance
          const transferAmount = parseFloat(
            ((sourceBalance * percentOfSource) / 100).toFixed(2)
          );

          // Skip edge case where rounding produces 0 or exceeds source
          if (transferAmount <= 0 || transferAmount > sourceBalance) return;

          const userId = 'user-1';
          const sourceWalletId = 'wallet-source';
          const destinationWalletId = 'wallet-dest';

          const sourceWallet = {
            id: sourceWalletId,
            user_id: userId,
            name: 'Source',
            balance: sourceBalance.toString(),
          };

          const destWallet = {
            id: destinationWalletId,
            user_id: userId,
            name: 'Destination',
            balance: destBalance.toString(),
          };

          // Track the UPDATE queries to capture new balances
          const updatedBalances = {};
          const mockClient = {
            query: jest.fn().mockImplementation((sql, params) => {
              if (!params) {
                return Promise.resolve();
              }
              // Capture UPDATE wallet balance queries
              if (sql && sql.includes('UPDATE wallets SET balance') && params.length >= 2) {
                updatedBalances[params[1]] = parseFloat(params[0]);
              }
              return Promise.resolve({ rows: [], rowCount: 1 });
            }),
            release: jest.fn(),
          };

          walletRepository.findById.mockImplementation((id) => {
            if (id === sourceWalletId) return Promise.resolve(sourceWallet);
            if (id === destinationWalletId) return Promise.resolve(destWallet);
            return Promise.resolve(null);
          });

          getClient.mockResolvedValue(mockClient);

          // Execute transfer
          await walletService.transfer(userId, {
            sourceWalletId,
            destinationWalletId,
            amount: transferAmount,
          });

          // Verify source decreased by exactly A
          const newSourceBalance = updatedBalances[sourceWalletId];
          const newDestBalance = updatedBalances[destinationWalletId];

          const expectedSourceBalance = sourceBalance - transferAmount;
          const expectedDestBalance = destBalance + transferAmount;

          expect(newSourceBalance).toBeCloseTo(expectedSourceBalance, 2);
          expect(newDestBalance).toBeCloseTo(expectedDestBalance, 2);

          // Verify total sum unchanged (conservation property)
          const totalBefore = sourceBalance + destBalance;
          const totalAfter = newSourceBalance + newDestBalance;
          expect(totalAfter).toBeCloseTo(totalBefore, 2);
        }
      ),
      { numRuns: 100 }
    );
  });
});


// Feature: spendwise-expense-tracker, Property 15: Wallet Non-Negative Balance Constraint
describe('Property 15: Wallet Non-Negative Balance Constraint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * **Validates: Requirements 10.5, 11.2**
   *
   * For any expense transaction that would cause a wallet balance to become negative,
   * adjustBalance SHALL reject the operation without modifying the balance.
   */
  test('adjustBalance rejects expense that would make balance negative', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a wallet balance: 0.01 to 9999.99
        fc.integer({ min: 1, max: 999999 }).map((n) => parseFloat((n / 100).toFixed(2))),
        // Generate an excess amount: 0.01 to 9999.99 (will be added to balance to guarantee it exceeds)
        fc.integer({ min: 1, max: 999999 }).map((n) => parseFloat((n / 100).toFixed(2))),
        async (walletBalance, excess) => {
          const walletId = 'wallet-neg-check';
          // Expense amount that exceeds wallet balance
          const expenseAmount = walletBalance + excess;

          walletRepository.findById.mockResolvedValue({
            id: walletId,
            user_id: 'user-001',
            name: 'Test Wallet',
            balance: walletBalance.toString(),
          });

          // updateBalance should NOT be called
          walletRepository.updateBalance.mockClear();

          // The operation should throw InsufficientFundsError
          await expect(
            walletService.adjustBalance(walletId, expenseAmount, 'expense')
          ).rejects.toThrow('Insufficient funds');

          // Verify updateBalance was never called — balance unmodified
          expect(walletRepository.updateBalance).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 10.5, 11.2**
   *
   * For any transfer where the amount exceeds the source wallet balance,
   * the system SHALL reject the transfer without modifying any wallet balance.
   */
  test('transfer rejects amount exceeding source wallet balance', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate source wallet balance: 0.01 to 9999.99
        fc.integer({ min: 1, max: 999999 }).map((n) => parseFloat((n / 100).toFixed(2))),
        // Generate excess amount: 0.01 to 9999.99 (added to source balance to exceed it)
        fc.integer({ min: 1, max: 999999 }).map((n) => parseFloat((n / 100).toFixed(2))),
        // Generate destination wallet balance: 0 to 9999.99
        fc.integer({ min: 0, max: 999999 }).map((n) => parseFloat((n / 100).toFixed(2))),
        async (sourceBalance, excess, destBalance) => {
          const userId = 'user-001';
          const sourceWalletId = 'wallet-source';
          const destinationWalletId = 'wallet-dest';
          // Transfer amount exceeds source balance
          const transferAmount = sourceBalance + excess;

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
                name: 'Dest Wallet',
                balance: destBalance.toString(),
              });
            }
            return Promise.resolve(null);
          });

          // getClient should NOT be called since validation fails before DB transaction
          getClient.mockClear();

          // The transfer should be rejected
          await expect(
            walletService.transfer(userId, {
              sourceWalletId,
              destinationWalletId,
              amount: transferAmount,
            })
          ).rejects.toThrow('Insufficient funds');

          // Verify no DB transaction was initiated — balances unmodified
          expect(getClient).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });
});
