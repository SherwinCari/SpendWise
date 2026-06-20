'use strict';

jest.mock('../../src/repositories/transaction.repository', () => ({
  create: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}));

jest.mock('../../src/services/wallet.service', () => ({
  adjustBalance: jest.fn(),
}));

jest.mock('../../src/repositories/budget.repository', () => ({
  findByCategoryAndPeriod: jest.fn(),
  updateSpent: jest.fn(),
}));

jest.mock('../../src/config/database', () => ({
  getClient: jest.fn(),
  query: jest.fn(),
}));

const transactionRepository = require('../../src/repositories/transaction.repository');
const walletService = require('../../src/services/wallet.service');
const budgetRepository = require('../../src/repositories/budget.repository');
const transactionService = require('../../src/services/transaction.service');
const {
  AuthorizationError,
  ValidationError,
  NotFoundError,
} = require('../../src/utils/errors');

describe('Transaction Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const validFields = {
      amount: 100,
      type: 'expense',
      categoryId: 'cat-1',
      description: 'Groceries',
      date: '2024-01-15T10:00:00.000Z',
      walletId: 'wallet-1',
    };

    // Requirement 4.7: updated_at set on creation
    it('should set updated_at to current time on creation', async () => {
      const now = new Date('2024-01-15T12:00:00.000Z');
      jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

      const createdTransaction = {
        id: 'txn-1',
        user_id: 'user-1',
        wallet_id: 'wallet-1',
        category_id: 'cat-1',
        type: 'expense',
        amount: '100.00',
        description: 'Groceries',
        date: '2024-01-15T10:00:00.000Z',
        created_at: '2024-01-15T12:00:00.000Z',
        updated_at: '2024-01-15T12:00:00.000Z',
      };

      walletService.adjustBalance.mockResolvedValue(undefined);
      transactionRepository.create.mockResolvedValue(createdTransaction);
      budgetRepository.findByCategoryAndPeriod.mockResolvedValue([]);

      const result = await transactionService.create('user-1', validFields);

      expect(result.updated_at).toBeDefined();
      expect(result.created_at).toEqual(result.updated_at);

      Date.now.mockRestore();
    });

    // Requirement 4.5: Missing required fields produce validation error with field-level details
    it('should throw ValidationError with field-level details when amount is missing', async () => {
      const fields = { ...validFields, amount: undefined };

      await expect(
        transactionService.create('user-1', fields)
      ).rejects.toThrow(ValidationError);

      try {
        await transactionService.create('user-1', fields);
      } catch (err) {
        expect(err.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: 'amount', message: expect.any(String) }),
          ])
        );
      }
    });

    it('should throw ValidationError with field-level details when type is missing', async () => {
      const fields = { ...validFields, type: '' };

      await expect(
        transactionService.create('user-1', fields)
      ).rejects.toThrow(ValidationError);

      try {
        await transactionService.create('user-1', fields);
      } catch (err) {
        expect(err.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: 'type', message: expect.any(String) }),
          ])
        );
      }
    });

    it('should throw ValidationError listing all missing fields when multiple are absent', async () => {
      const fields = { amount: undefined, type: '', categoryId: '', walletId: '', date: '' };

      await expect(
        transactionService.create('user-1', fields)
      ).rejects.toThrow(ValidationError);

      try {
        await transactionService.create('user-1', fields);
      } catch (err) {
        expect(err.details.length).toBeGreaterThanOrEqual(4);
        const fieldNames = err.details.map((d) => d.field);
        expect(fieldNames).toContain('type');
        expect(fieldNames).toContain('categoryId');
        expect(fieldNames).toContain('walletId');
        expect(fieldNames).toContain('date');
      }
    });

    // Wallet balance adjustment on create
    it('should call walletService.adjustBalance with expense type on create', async () => {
      walletService.adjustBalance.mockResolvedValue(undefined);
      transactionRepository.create.mockResolvedValue({
        id: 'txn-1',
        user_id: 'user-1',
        wallet_id: 'wallet-1',
        category_id: 'cat-1',
        type: 'expense',
        amount: '100.00',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      budgetRepository.findByCategoryAndPeriod.mockResolvedValue([]);

      await transactionService.create('user-1', validFields);

      expect(walletService.adjustBalance).toHaveBeenCalledWith('wallet-1', 100, 'expense');
    });

    it('should call walletService.adjustBalance with income type on create', async () => {
      const incomeFields = { ...validFields, type: 'income' };
      walletService.adjustBalance.mockResolvedValue(undefined);
      transactionRepository.create.mockResolvedValue({
        id: 'txn-2',
        user_id: 'user-1',
        wallet_id: 'wallet-1',
        category_id: 'cat-1',
        type: 'income',
        amount: '100.00',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      await transactionService.create('user-1', incomeFields);

      expect(walletService.adjustBalance).toHaveBeenCalledWith('wallet-1', 100, 'income');
    });

    // Budget tracking updated on expense creation
    it('should update budget tracking when creating an expense transaction', async () => {
      walletService.adjustBalance.mockResolvedValue(undefined);
      transactionRepository.create.mockResolvedValue({
        id: 'txn-1',
        user_id: 'user-1',
        wallet_id: 'wallet-1',
        category_id: 'cat-1',
        type: 'expense',
        amount: '50.00',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      budgetRepository.findByCategoryAndPeriod.mockResolvedValue([
        { id: 'budget-1', category_id: 'cat-1' },
      ]);
      budgetRepository.updateSpent.mockResolvedValue(undefined);

      await transactionService.create('user-1', { ...validFields, amount: 50 });

      expect(budgetRepository.findByCategoryAndPeriod).toHaveBeenCalledWith('user-1', 'cat-1');
      expect(budgetRepository.updateSpent).toHaveBeenCalledWith('budget-1', 50, 'add');
    });

    it('should NOT update budget tracking when creating an income transaction', async () => {
      walletService.adjustBalance.mockResolvedValue(undefined);
      transactionRepository.create.mockResolvedValue({
        id: 'txn-2',
        user_id: 'user-1',
        wallet_id: 'wallet-1',
        category_id: 'cat-1',
        type: 'income',
        amount: '200.00',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      await transactionService.create('user-1', { ...validFields, type: 'income', amount: 200 });

      expect(budgetRepository.findByCategoryAndPeriod).not.toHaveBeenCalled();
      expect(budgetRepository.updateSpent).not.toHaveBeenCalled();
    });
  });

  // Requirement 5.3, 6.3: Ownership check rejection
  describe('getById', () => {
    it('should return the transaction when the user owns it', async () => {
      const transaction = {
        id: 'txn-1',
        user_id: 'user-1',
        wallet_id: 'wallet-1',
        category_id: 'cat-1',
        type: 'expense',
        amount: '50.00',
      };
      transactionRepository.findById.mockResolvedValue(transaction);

      const result = await transactionService.getById('user-1', 'txn-1');

      expect(result).toEqual(transaction);
    });

    it('should throw AuthorizationError when user does not own the transaction', async () => {
      const transaction = {
        id: 'txn-1',
        user_id: 'other-user',
        wallet_id: 'wallet-1',
        category_id: 'cat-1',
        type: 'expense',
        amount: '50.00',
      };
      transactionRepository.findById.mockResolvedValue(transaction);

      await expect(
        transactionService.getById('user-1', 'txn-1')
      ).rejects.toThrow(AuthorizationError);
    });

    it('should throw NotFoundError when transaction does not exist', async () => {
      transactionRepository.findById.mockResolvedValue(null);

      await expect(
        transactionService.getById('user-1', 'nonexistent')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    const existingTransaction = {
      id: 'txn-1',
      user_id: 'user-1',
      wallet_id: 'wallet-1',
      category_id: 'cat-1',
      type: 'expense',
      amount: '100.00',
    };

    it('should throw AuthorizationError when user does not own the transaction', async () => {
      transactionRepository.findById.mockResolvedValue({
        ...existingTransaction,
        user_id: 'other-user',
      });

      await expect(
        transactionService.update('user-1', 'txn-1', { amount: 200 })
      ).rejects.toThrow(AuthorizationError);
    });

    it('should throw NotFoundError when transaction does not exist', async () => {
      transactionRepository.findById.mockResolvedValue(null);

      await expect(
        transactionService.update('user-1', 'txn-1', { amount: 200 })
      ).rejects.toThrow(NotFoundError);
    });

    it('should successfully update a transaction the user owns', async () => {
      transactionRepository.findById.mockResolvedValue(existingTransaction);
      walletService.adjustBalance.mockResolvedValue(undefined);
      budgetRepository.findByCategoryAndPeriod.mockResolvedValue([]);
      const updatedTxn = { ...existingTransaction, amount: '200.00', updated_at: new Date().toISOString() };
      transactionRepository.update.mockResolvedValue(updatedTxn);

      const result = await transactionService.update('user-1', 'txn-1', { amount: 200 });

      expect(result.amount).toBe('200.00');
    });
  });

  describe('delete', () => {
    const existingTransaction = {
      id: 'txn-1',
      user_id: 'user-1',
      wallet_id: 'wallet-1',
      category_id: 'cat-1',
      type: 'expense',
      amount: '75.00',
    };

    it('should throw AuthorizationError when user does not own the transaction', async () => {
      transactionRepository.findById.mockResolvedValue({
        ...existingTransaction,
        user_id: 'other-user',
      });

      await expect(
        transactionService.delete('user-1', 'txn-1')
      ).rejects.toThrow(AuthorizationError);
    });

    it('should throw NotFoundError when transaction does not exist', async () => {
      transactionRepository.findById.mockResolvedValue(null);

      await expect(
        transactionService.delete('user-1', 'nonexistent')
      ).rejects.toThrow(NotFoundError);
    });

    it('should reverse wallet balance and budget tracking on delete', async () => {
      transactionRepository.findById.mockResolvedValue(existingTransaction);
      walletService.adjustBalance.mockResolvedValue(undefined);
      budgetRepository.findByCategoryAndPeriod.mockResolvedValue([
        { id: 'budget-1', category_id: 'cat-1' },
      ]);
      budgetRepository.updateSpent.mockResolvedValue(undefined);
      transactionRepository.delete.mockResolvedValue(true);

      const result = await transactionService.delete('user-1', 'txn-1');

      expect(result).toBe(true);
      // Wallet balance reversed: expense deleted → income adjustment to restore
      expect(walletService.adjustBalance).toHaveBeenCalledWith('wallet-1', 75, 'income');
      // Budget tracking reversed
      expect(budgetRepository.updateSpent).toHaveBeenCalledWith('budget-1', 75, 'subtract');
    });
  });
});
