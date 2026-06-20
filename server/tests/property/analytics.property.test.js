'use strict';

const fc = require('fast-check');

// Mock the database before requiring the service
jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

const { query } = require('../../src/config/database');
const analyticsService = require('../../src/services/analytics.service');

// Feature: spendwise-expense-tracker, Property 16: Analytics Aggregation Correctness
describe('Property 16: Analytics Aggregation Correctness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * **Validates: Requirements 13.1, 13.2**
   *
   * For any user and time period, the monthly summary total_income SHALL equal
   * the sum of all income transaction amounts in that period, total_expenses SHALL
   * equal the sum of all expense transaction amounts, and net_balance SHALL equal
   * total_income minus total_expenses.
   */
  test('getMonthlySummary correctly aggregates income, expenses, and computes net balance', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a set of transactions with random amounts and types
        fc.array(
          fc.record({
            type: fc.constantFrom('income', 'expense'),
            // Generate amounts as integers (cents) to avoid floating point issues, then convert
            amount: fc.integer({ min: 1, max: 99999999 }).map((n) => n / 100),
          }),
          { minLength: 0, maxLength: 50 }
        ),
        async (transactions) => {
          const userId = 'user-test-123';
          const year = 2024;
          const month = 6;

          // Compute expected totals from the generated transactions
          const expectedIncome = transactions
            .filter((t) => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

          const expectedExpenses = transactions
            .filter((t) => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

          const expectedNet = expectedIncome - expectedExpenses;

          // Mock the database query to return pre-aggregated results
          // (simulating what PostgreSQL SUM + CASE WHEN would return)
          query.mockResolvedValue({
            rows: [
              {
                total_income: expectedIncome.toString(),
                total_expenses: expectedExpenses.toString(),
              },
            ],
          });

          const result = await analyticsService.getMonthlySummary(userId, year, month);

          // Verify total_income equals sum of all income transactions
          expect(parseFloat(result.totalIncome)).toBeCloseTo(expectedIncome, 2);

          // Verify total_expenses equals sum of all expense transactions
          expect(parseFloat(result.totalExpenses)).toBeCloseTo(expectedExpenses, 2);

          // Verify net_balance equals total_income - total_expenses
          expect(parseFloat(result.netBalance)).toBeCloseTo(expectedNet, 2);

          // Verify the relationship: net = income - expenses
          expect(parseFloat(result.netBalance)).toBeCloseTo(
            parseFloat(result.totalIncome) - parseFloat(result.totalExpenses),
            2
          );

          // Verify year and month are passed through
          expect(result.year).toBe(year);
          expect(result.month).toBe(month);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 13.1, 13.2**
   *
   * When there are no transactions for a period (empty set),
   * total_income, total_expenses, and net_balance should all be "0.00".
   */
  test('getMonthlySummary returns zero values for empty transaction sets', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2000, max: 2030 }),
        fc.integer({ min: 1, max: 12 }),
        async (year, month) => {
          const userId = 'user-empty-period';

          // Mock empty period (COALESCE returns 0)
          query.mockResolvedValue({
            rows: [
              {
                total_income: '0',
                total_expenses: '0',
              },
            ],
          });

          const result = await analyticsService.getMonthlySummary(userId, year, month);

          expect(parseFloat(result.totalIncome)).toBe(0);
          expect(parseFloat(result.totalExpenses)).toBe(0);
          expect(parseFloat(result.netBalance)).toBe(0);
          expect(result.totalIncome).toBe('0.00');
          expect(result.totalExpenses).toBe('0.00');
          expect(result.netBalance).toBe('0.00');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 13.1, 13.2**
   *
   * For any set of only income transactions, total_expenses should be 0
   * and net_balance should equal total_income.
   */
  test('getMonthlySummary with only income transactions: net equals total income', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate income-only amounts
        fc.array(
          fc.integer({ min: 1, max: 99999999 }).map((n) => n / 100),
          { minLength: 1, maxLength: 30 }
        ),
        async (incomeAmounts) => {
          const totalIncome = incomeAmounts.reduce((sum, a) => sum + a, 0);

          query.mockResolvedValue({
            rows: [
              {
                total_income: totalIncome.toString(),
                total_expenses: '0',
              },
            ],
          });

          const result = await analyticsService.getMonthlySummary('user-1', 2024, 3);

          // net_balance should equal total_income when no expenses
          expect(parseFloat(result.netBalance)).toBeCloseTo(totalIncome, 2);
          expect(parseFloat(result.totalExpenses)).toBe(0);
          expect(parseFloat(result.netBalance)).toBeCloseTo(
            parseFloat(result.totalIncome),
            2
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 13.1, 13.2**
   *
   * For any set of only expense transactions, total_income should be 0
   * and net_balance should be negative (equal to -total_expenses).
   */
  test('getMonthlySummary with only expense transactions: net equals negative expenses', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate expense-only amounts
        fc.array(
          fc.integer({ min: 1, max: 99999999 }).map((n) => n / 100),
          { minLength: 1, maxLength: 30 }
        ),
        async (expenseAmounts) => {
          const totalExpenses = expenseAmounts.reduce((sum, a) => sum + a, 0);

          query.mockResolvedValue({
            rows: [
              {
                total_income: '0',
                total_expenses: totalExpenses.toString(),
              },
            ],
          });

          const result = await analyticsService.getMonthlySummary('user-1', 2024, 7);

          // net_balance should equal -total_expenses when no income
          expect(parseFloat(result.netBalance)).toBeCloseTo(-totalExpenses, 2);
          expect(parseFloat(result.totalIncome)).toBe(0);
          expect(parseFloat(result.netBalance)).toBeCloseTo(
            -parseFloat(result.totalExpenses),
            2
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
