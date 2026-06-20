'use strict';

jest.mock('../../src/repositories/budget.repository', () => ({
  create: jest.fn(),
  findByUserId: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findDuplicate: jest.fn(),
  findByCategoryAndPeriod: jest.fn(),
  createTracking: jest.fn(),
  updateSpent: jest.fn(),
  getTracking: jest.fn(),
  deleteTracking: jest.fn(),
}));

jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
}));

const budgetRepository = require('../../src/repositories/budget.repository');
const budgetService = require('../../src/services/budget.service');
const { NotFoundError, AuthorizationError } = require('../../src/utils/errors');

describe('Budget Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProgress', () => {
    // Req 8.5: Progress calculation at 0% (no spending)
    it('should calculate 0% progress when no money spent', async () => {
      budgetRepository.findById.mockResolvedValue({
        id: 'budget-1',
        user_id: 'user-1',
        amount_limit: '1000.00',
        spent: '0.00',
      });

      const result = await budgetService.getProgress('budget-1');

      expect(result.percentage).toBe(0);
      expect(result.spent).toBe(0);
      expect(result.limit).toBe(1000);
      expect(result.remaining).toBe(1000);
    });

    // Req 8.5: Progress calculation at 50% threshold
    it('should calculate 50% progress when half the budget is spent', async () => {
      budgetRepository.findById.mockResolvedValue({
        id: 'budget-1',
        user_id: 'user-1',
        amount_limit: '200.00',
        spent: '100.00',
      });

      const result = await budgetService.getProgress('budget-1');

      expect(result.percentage).toBe(50);
      expect(result.spent).toBe(100);
      expect(result.limit).toBe(200);
      expect(result.remaining).toBe(100);
    });

    // Req 8.5: Progress calculation at 75% threshold
    it('should calculate 75% progress at three-quarter spending', async () => {
      budgetRepository.findById.mockResolvedValue({
        id: 'budget-1',
        user_id: 'user-1',
        amount_limit: '400.00',
        spent: '300.00',
      });

      const result = await budgetService.getProgress('budget-1');

      expect(result.percentage).toBe(75);
      expect(result.spent).toBe(300);
      expect(result.limit).toBe(400);
      expect(result.remaining).toBe(100);
    });

    // Req 8.5: Progress calculation at 100% (fully consumed)
    it('should calculate 100% progress when budget is fully consumed', async () => {
      budgetRepository.findById.mockResolvedValue({
        id: 'budget-1',
        user_id: 'user-1',
        amount_limit: '500.00',
        spent: '500.00',
      });

      const result = await budgetService.getProgress('budget-1');

      expect(result.percentage).toBe(100);
      expect(result.spent).toBe(500);
      expect(result.limit).toBe(500);
      expect(result.remaining).toBe(0);
    });

    it('should throw NotFoundError when budget does not exist', async () => {
      budgetRepository.findById.mockResolvedValue(null);

      await expect(
        budgetService.getProgress('nonexistent')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    // Req 8.4: Delete cascades to budget_tracking deletion
    it('should delete budget (budget_tracking cascades via ON DELETE CASCADE)', async () => {
      const mockBudget = { id: 'budget-1', user_id: 'user-1', amount_limit: '500.00' };
      budgetRepository.findById.mockResolvedValue(mockBudget);
      budgetRepository.delete.mockResolvedValue(true);

      await budgetService.delete('user-1', 'budget-1');

      expect(budgetRepository.delete).toHaveBeenCalledWith('budget-1');
    });

    it('should throw NotFoundError when budget does not exist', async () => {
      budgetRepository.findById.mockResolvedValue(null);

      await expect(
        budgetService.delete('user-1', 'nonexistent')
      ).rejects.toThrow(NotFoundError);

      expect(budgetRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw AuthorizationError when user does not own the budget', async () => {
      const mockBudget = { id: 'budget-1', user_id: 'other-user', amount_limit: '500.00' };
      budgetRepository.findById.mockResolvedValue(mockBudget);

      await expect(
        budgetService.delete('user-1', 'budget-1')
      ).rejects.toThrow(AuthorizationError);

      expect(budgetRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    // Req 8.3: Update recalculates progress percentage
    it('should update amountLimit and allow progress recalculation', async () => {
      const mockBudget = { id: 'budget-1', user_id: 'user-1', amount_limit: '500.00', spent: '250.00' };
      const updatedBudget = { ...mockBudget, amount_limit: '1000.00' };
      budgetRepository.findById.mockResolvedValue(mockBudget);
      budgetRepository.update.mockResolvedValue(updatedBudget);

      const result = await budgetService.update('user-1', 'budget-1', { amountLimit: 1000 });

      expect(budgetRepository.update).toHaveBeenCalledWith('budget-1', 1000);
      expect(result.amount_limit).toBe('1000.00');
    });

    it('should throw NotFoundError when budget does not exist', async () => {
      budgetRepository.findById.mockResolvedValue(null);

      await expect(
        budgetService.update('user-1', 'nonexistent', { amountLimit: 1000 })
      ).rejects.toThrow(NotFoundError);

      expect(budgetRepository.update).not.toHaveBeenCalled();
    });

    it('should throw AuthorizationError when user does not own the budget', async () => {
      const mockBudget = { id: 'budget-1', user_id: 'other-user', amount_limit: '500.00' };
      budgetRepository.findById.mockResolvedValue(mockBudget);

      await expect(
        budgetService.update('user-1', 'budget-1', { amountLimit: 1000 })
      ).rejects.toThrow(AuthorizationError);

      expect(budgetRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('should return budgets with calculated progress at various spending levels', async () => {
      const budgets = [
        { id: 'b1', user_id: 'user-1', amount_limit: '100.00', spent: '0.00' },
        { id: 'b2', user_id: 'user-1', amount_limit: '200.00', spent: '100.00' },
        { id: 'b3', user_id: 'user-1', amount_limit: '400.00', spent: '300.00' },
        { id: 'b4', user_id: 'user-1', amount_limit: '500.00', spent: '500.00' },
      ];
      budgetRepository.findByUserId.mockResolvedValue(budgets);

      const result = await budgetService.list('user-1');

      expect(result[0].percentage).toBe(0);     // 0%
      expect(result[1].percentage).toBe(50);    // 50%
      expect(result[2].percentage).toBe(75);    // 75%
      expect(result[3].percentage).toBe(100);   // 100%

      expect(result[0].remaining).toBe(100);
      expect(result[1].remaining).toBe(100);
      expect(result[2].remaining).toBe(100);
      expect(result[3].remaining).toBe(0);
    });

    it('should handle null spent values (no tracking)', async () => {
      const budgets = [
        { id: 'b1', user_id: 'user-1', amount_limit: '500.00', spent: null },
      ];
      budgetRepository.findByUserId.mockResolvedValue(budgets);

      const result = await budgetService.list('user-1');

      expect(result[0].percentage).toBe(0);
      expect(result[0].spent).toBe(0);
      expect(result[0].remaining).toBe(500);
    });
  });
});
