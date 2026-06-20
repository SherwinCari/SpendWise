'use strict';

jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
}));

const { query } = require('../../src/config/database');
const analyticsService = require('../../src/services/analytics.service');

describe('Analytics Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMonthlySummary', () => {
    it('should return income, expenses, and net balance for the month', async () => {
      query.mockResolvedValue({
        rows: [{ total_income: '5000.00', total_expenses: '3200.50' }],
      });

      const result = await analyticsService.getMonthlySummary('user-1', 2024, 6);

      expect(result).toEqual({
        year: 2024,
        month: 6,
        totalIncome: '5000.00',
        totalExpenses: '3200.50',
        netBalance: '1799.50',
      });
      expect(query).toHaveBeenCalledWith(expect.any(String), ['user-1', 2024, 6]);
    });

    it('should return zeros when no transactions exist for the period', async () => {
      query.mockResolvedValue({
        rows: [{ total_income: '0', total_expenses: '0' }],
      });

      const result = await analyticsService.getMonthlySummary('user-1', 2024, 1);

      expect(result).toEqual({
        year: 2024,
        month: 1,
        totalIncome: '0.00',
        totalExpenses: '0.00',
        netBalance: '0.00',
      });
    });

    it('should handle negative net balance (expenses exceed income)', async () => {
      query.mockResolvedValue({
        rows: [{ total_income: '1000.00', total_expenses: '2500.00' }],
      });

      const result = await analyticsService.getMonthlySummary('user-1', 2024, 3);

      expect(result).toEqual({
        year: 2024,
        month: 3,
        totalIncome: '1000.00',
        totalExpenses: '2500.00',
        netBalance: '-1500.00',
      });
    });
  });

  describe('getCategoryBreakdown', () => {
    it('should return spending grouped by category for the period', async () => {
      query.mockResolvedValue({
        rows: [
          { category_id: 'cat-1', category_name: 'Food', category_color: '#FF0000', category_icon: '🍔', total: '1200.00' },
          { category_id: 'cat-2', category_name: 'Transport', category_color: '#0000FF', category_icon: '🚗', total: '500.50' },
        ],
      });

      const result = await analyticsService.getCategoryBreakdown('user-1', '2024-01-01', '2024-01-31');

      expect(result).toEqual([
        { categoryId: 'cat-1', categoryName: 'Food', categoryColor: '#FF0000', categoryIcon: '🍔', total: '1200.00' },
        { categoryId: 'cat-2', categoryName: 'Transport', categoryColor: '#0000FF', categoryIcon: '🚗', total: '500.50' },
      ]);
      expect(query).toHaveBeenCalledWith(expect.any(String), ['user-1', '2024-01-01', '2024-01-31']);
    });

    it('should return empty array when no expenses exist in the period', async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await analyticsService.getCategoryBreakdown('user-1', '2024-01-01', '2024-01-31');

      expect(result).toEqual([]);
    });

    it('should handle null icon and color values', async () => {
      query.mockResolvedValue({
        rows: [
          { category_id: 'cat-1', category_name: 'Misc', category_color: null, category_icon: null, total: '300.00' },
        ],
      });

      const result = await analyticsService.getCategoryBreakdown('user-1', '2024-02-01', '2024-02-28');

      expect(result).toEqual([
        { categoryId: 'cat-1', categoryName: 'Misc', categoryColor: null, categoryIcon: null, total: '300.00' },
      ]);
    });
  });

  describe('getSpendingTrends', () => {
    it('should return monthly expense totals for last 6 months with zeros for missing months', async () => {
      // Simulate only 3 months having data
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      query.mockResolvedValue({
        rows: [
          { year: currentYear, month: currentMonth, total: '1500.00' },
          { year: currentYear, month: currentMonth - 1 > 0 ? currentMonth - 1 : currentMonth - 1 + 12, total: '2000.00' },
        ],
      });

      const result = await analyticsService.getSpendingTrends('user-1');

      // Should always return exactly 6 months
      expect(result).toHaveLength(6);

      // Each entry should have year, month, and total
      result.forEach((entry) => {
        expect(entry).toHaveProperty('year');
        expect(entry).toHaveProperty('month');
        expect(entry).toHaveProperty('total');
        expect(typeof entry.year).toBe('number');
        expect(typeof entry.month).toBe('number');
        expect(entry.month).toBeGreaterThanOrEqual(1);
        expect(entry.month).toBeLessThanOrEqual(12);
      });

      // Verify months are in ascending order
      for (let i = 1; i < result.length; i++) {
        const prev = result[i - 1].year * 12 + result[i - 1].month;
        const curr = result[i].year * 12 + result[i].month;
        expect(curr).toBeGreaterThan(prev);
      }
    });

    it('should return all zeros when no expense transactions exist', async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await analyticsService.getSpendingTrends('user-1');

      expect(result).toHaveLength(6);
      result.forEach((entry) => {
        expect(entry.total).toBe('0.00');
      });
    });

    it('should fill missing months with zero totals', async () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      // Only return data for current month
      query.mockResolvedValue({
        rows: [{ year: currentYear, month: currentMonth, total: '750.25' }],
      });

      const result = await analyticsService.getSpendingTrends('user-1');

      expect(result).toHaveLength(6);

      // Last entry should be the current month with the actual total
      const lastEntry = result[result.length - 1];
      expect(lastEntry.year).toBe(currentYear);
      expect(lastEntry.month).toBe(currentMonth);
      expect(lastEntry.total).toBe('750.25');

      // All other entries should be zero
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].total).toBe('0.00');
      }
    });
  });
});
