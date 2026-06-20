'use strict';

const fc = require('fast-check');
const notificationService = require('../../src/services/notification.service');
const notificationRepository = require('../../src/repositories/notification.repository');

/**
 * Feature: spendwise-expense-tracker, Property 5: Budget Tracking Adjustment Invariant
 * Validates: Requirements 4.6, 5.4, 6.4
 *
 * For any expense transaction with an active budget for its category:
 * - Creating the transaction SHALL increase budget_tracking spent by the transaction amount
 * - Deleting it SHALL decrease spent by the same amount
 * - Changing its category SHALL decrease the old category's spent and increase the new category's spent
 * - The net effect of create + delete is zero
 */

// We test at the budget service level by mocking the budget repository
const budgetRepository = require('../../src/repositories/budget.repository');
const budgetService = require('../../src/services/budget.service');

// Arbitrary generator for positive amount with 2 decimal places
const amountArb = fc
  .integer({ min: 1, max: 99999999 })
  .map((n) => (n / 100).toFixed(2));

// Arbitrary generator for UUID-like strings
const uuidArb = fc.uuid();

describe('Property 5: Budget Tracking Adjustment Invariant', () => {
  let updateSpentCalls;

  beforeEach(() => {
    updateSpentCalls = [];

    // Mock findByCategoryAndPeriod to return a budget with tracking info
    jest.spyOn(budgetRepository, 'findByCategoryAndPeriod').mockImplementation(
      async (userId, categoryId) => {
        return [
          {
            id: `budget-for-${categoryId}`,
            user_id: userId,
            category_id: categoryId,
            amount_limit: '10000.00',
            period: 'monthly',
            spent: '0.00',
            tracking_id: `tracking-for-${categoryId}`,
          },
        ];
      }
    );

    // Mock updateSpent to track calls and their arguments
    jest.spyOn(budgetRepository, 'updateSpent').mockImplementation(
      async (budgetId, amount, operation) => {
        updateSpentCalls.push({ budgetId, amount, operation });
        return {
          id: `tracking-${budgetId}`,
          budget_id: budgetId,
          spent: operation === 'add' ? amount : '0.00',
          updated_at: new Date().toISOString(),
        };
      }
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creating an expense increases budget spent by the transaction amount', async () => {
    await fc.assert(
      fc.asyncProperty(uuidArb, uuidArb, amountArb, async (userId, categoryId, amount) => {
        updateSpentCalls = [];

        await budgetService.updateSpent(userId, categoryId, amount, 'add');

        // Verify updateSpent was called with 'add' operation and correct amount
        expect(updateSpentCalls.length).toBe(1);
        expect(updateSpentCalls[0].budgetId).toBe(`budget-for-${categoryId}`);
        expect(updateSpentCalls[0].amount).toBe(amount);
        expect(updateSpentCalls[0].operation).toBe('add');
      }),
      { numRuns: 100 }
    );
  });

  it('deleting an expense decreases budget spent by the transaction amount', async () => {
    await fc.assert(
      fc.asyncProperty(uuidArb, uuidArb, amountArb, async (userId, categoryId, amount) => {
        updateSpentCalls = [];

        await budgetService.updateSpent(userId, categoryId, amount, 'subtract');

        // Verify updateSpent was called with 'subtract' operation and correct amount
        expect(updateSpentCalls.length).toBe(1);
        expect(updateSpentCalls[0].budgetId).toBe(`budget-for-${categoryId}`);
        expect(updateSpentCalls[0].amount).toBe(amount);
        expect(updateSpentCalls[0].operation).toBe('subtract');
      }),
      { numRuns: 100 }
    );
  });

  it('net effect of create + delete is zero (same amount, opposite operations)', async () => {
    await fc.assert(
      fc.asyncProperty(uuidArb, uuidArb, amountArb, async (userId, categoryId, amount) => {
        updateSpentCalls = [];

        // Simulate creating an expense (add to spent)
        await budgetService.updateSpent(userId, categoryId, amount, 'add');
        // Simulate deleting that expense (subtract from spent)
        await budgetService.updateSpent(userId, categoryId, amount, 'subtract');

        // Verify two calls were made with matching amounts but opposite operations
        expect(updateSpentCalls.length).toBe(2);

        const addCall = updateSpentCalls.find((c) => c.operation === 'add');
        const subtractCall = updateSpentCalls.find((c) => c.operation === 'subtract');

        expect(addCall).toBeDefined();
        expect(subtractCall).toBeDefined();
        expect(addCall.amount).toBe(amount);
        expect(subtractCall.amount).toBe(amount);
        // Same budget targeted for both operations
        expect(addCall.budgetId).toBe(subtractCall.budgetId);
      }),
      { numRuns: 100 }
    );
  });

  it('category change decreases old category spent and increases new category spent', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        uuidArb,
        amountArb,
        async (userId, oldCategoryId, newCategoryId, amount) => {
          // Ensure categories are different
          fc.pre(oldCategoryId !== newCategoryId);

          updateSpentCalls = [];

          // Simulate category change: subtract from old, add to new
          await budgetService.updateSpent(userId, oldCategoryId, amount, 'subtract');
          await budgetService.updateSpent(userId, newCategoryId, amount, 'add');

          // Verify two calls with correct category budgets
          expect(updateSpentCalls.length).toBe(2);

          const subtractCall = updateSpentCalls.find((c) => c.operation === 'subtract');
          const addCall = updateSpentCalls.find((c) => c.operation === 'add');

          expect(subtractCall).toBeDefined();
          expect(addCall).toBeDefined();

          // Old category budget is decreased
          expect(subtractCall.budgetId).toBe(`budget-for-${oldCategoryId}`);
          expect(subtractCall.amount).toBe(amount);

          // New category budget is increased
          expect(addCall.budgetId).toBe(`budget-for-${newCategoryId}`);
          expect(addCall.amount).toBe(amount);
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Feature: spendwise-expense-tracker, Property 8: Threshold Notification Idempotence
 * Validates: Requirements 9.4
 *
 * For any budget and threshold level, the Notification_Service SHALL generate at most one
 * notification per threshold per budget per period, regardless of how many times the spent
 * amount crosses that threshold.
 *
 * Property: For any spent/limit combo that triggers threshold(s), calling checkBudgetThresholds
 * N times should only create notifications on the FIRST call. Subsequent calls should create 0
 * new notifications (because findExistingThreshold returns existing ones).
 */
describe('Property 8: Threshold Notification Idempotence', () => {
  // Arbitrary generator for positive amount_limit (1.00 to 9999.99)
  const limitArb = fc
    .integer({ min: 100, max: 999999 })
    .map((n) => (n / 100).toFixed(2));

  // Arbitrary generator for percentage (50-150% range to cover all thresholds)
  const percentageArb = fc.integer({ min: 50, max: 150 });

  // Arbitrary generator for number of repeated calls (2 to 5)
  const repeatCountArb = fc.integer({ min: 2, max: 5 });

  const uuidArb = fc.uuid();

  let sentNotifications;
  let createCallCount;

  beforeEach(() => {
    sentNotifications = new Map();
    createCallCount = 0;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calling checkBudgetThresholds N times creates notifications only on the first call', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        limitArb,
        percentageArb,
        repeatCountArb,
        async (userId, budgetId, limit, percentage, repeatCount) => {
          // Reset state for each iteration
          sentNotifications.clear();
          createCallCount = 0;

          // Calculate spent to achieve the desired percentage of the limit.
          // Use integer arithmetic to avoid floating-point rounding issues:
          // spent = ceil((percentage * limitCents) / 100) to guarantee we meet the threshold
          const amountLimit = parseFloat(limit);
          const limitCents = Math.round(amountLimit * 100);
          const spentCents = Math.ceil((percentage * limitCents) / 100);
          const spent = (spentCents / 100).toFixed(2);

          // Verify the actual percentage meets the threshold (precondition)
          const actualPercentage = (parseFloat(spent) / amountLimit) * 100;
          fc.pre(actualPercentage >= 50); // Ensure at least one threshold is triggered

          // Mock budgetRepository.findById to return budget with computed spent/limit
          budgetRepository.findById = jest.fn().mockResolvedValue({
            id: budgetId,
            user_id: userId,
            category_id: 'cat-123',
            amount_limit: limit,
            period: 'monthly',
            start_date: '2024-01-01',
            end_date: null,
            spent: spent,
          });

          // Mock findExistingThreshold: returns null if not yet sent, returns an
          // existing notification if already sent (simulates idempotence check)
          notificationRepository.findExistingThreshold = jest.fn().mockImplementation(
            async (uid, bId, type) => {
              const key = `${uid}-${bId}-${type}`;
              return sentNotifications.get(key) || null;
            }
          );

          // Mock create: tracks how many notifications are created and records them
          // so subsequent findExistingThreshold calls will find them
          notificationRepository.create = jest.fn().mockImplementation(
            async (uid, title, message, type) => {
              createCallCount++;
              const notification = {
                id: `notif-${createCallCount}`,
                user_id: uid,
                title,
                message,
                type,
                is_read: false,
                created_at: new Date().toISOString(),
              };
              const key = `${uid}-${budgetId}-${type}`;
              sentNotifications.set(key, notification);
              return notification;
            }
          );

          // First call - should create notifications for all triggered thresholds
          const firstResult = await notificationService.checkBudgetThresholds(userId, budgetId);
          const firstCallCreations = createCallCount;

          // Determine how many thresholds the actual percentage triggers
          const thresholds = [50, 75, 100];
          const triggeredThresholds = thresholds.filter((t) => actualPercentage >= t);
          expect(firstResult.length).toBe(triggeredThresholds.length);
          expect(firstCallCreations).toBe(triggeredThresholds.length);

          // Subsequent calls - should create 0 new notifications each time
          for (let i = 1; i < repeatCount; i++) {
            const subsequentResult = await notificationService.checkBudgetThresholds(userId, budgetId);
            expect(subsequentResult.length).toBe(0);
          }

          // Total creations should still equal only the first call's creations
          expect(createCallCount).toBe(firstCallCreations);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: spendwise-expense-tracker, Property 6: Budget Progress Calculation
 * Validates: Requirements 8.5
 *
 * For any budget with amount_limit L and budget_tracking spent S (where L > 0),
 * the budget progress percentage SHALL equal (S / L) × 100, rounded to 2 decimal places.
 */
describe('Property 6: Budget Progress Calculation', () => {
  // Generator for limit: positive integer from 1 to 99999999, divided by 100 for decimal values
  const limitArb = fc
    .integer({ min: 1, max: 99999999 })
    .map((n) => (n / 100).toFixed(2));

  // Generator for spent: non-negative (0 to 99999999), divided by 100 — can exceed limit for over-budget
  const spentArb = fc
    .integer({ min: 0, max: 99999999 })
    .map((n) => (n / 100).toFixed(2));

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('percentage equals (spent / limit) × 100 rounded to 2 decimal places', async () => {
    await fc.assert(
      fc.asyncProperty(uuidArb, limitArb, spentArb, async (budgetId, limit, spent) => {
        // Mock budgetRepository.findById to return a budget with the generated values
        jest.spyOn(budgetRepository, 'findById').mockImplementation(async (id) => {
          return {
            id,
            user_id: 'test-user',
            category_id: 'test-category',
            amount_limit: limit,
            period: 'monthly',
            start_date: '2024-01-01',
            end_date: null,
            spent: spent,
            tracking_updated_at: new Date().toISOString(),
          };
        });

        const result = await budgetService.getProgress(budgetId);

        // Compute expected percentage: (spent / limit) × 100, rounded to 2 decimal places
        const expectedPercentage =
          Math.round((parseFloat(spent) / parseFloat(limit)) * 100 * 100) / 100;

        expect(result.spent).toBe(parseFloat(spent));
        expect(result.limit).toBe(parseFloat(limit));
        expect(result.percentage).toBe(expectedPercentage);
        expect(result.remaining).toBeCloseTo(parseFloat(limit) - parseFloat(spent), 2);
      }),
      { numRuns: 100 }
    );
  });
});


/**
 * Feature: spendwise-expense-tracker, Property 7: Budget Threshold Notifications
 * Validates: Requirements 9.1, 9.2, 9.3
 *
 * For any budget with amount_limit L > 0 and spent S:
 * - If S/L >= 1.0 (100%): all 3 notification types (warning, caution, critical) should be created
 * - If S/L >= 0.75 but < 1.0: warning + caution should be created
 * - If S/L >= 0.5 but < 0.75: only warning should be created
 * - If S/L < 0.5: no notifications should be created
 */
describe('Property 7: Budget Threshold Notifications', () => {
  // Arbitrary for a positive budget limit (in cents, converted to 2 decimal string)
  const limitArb = fc
    .integer({ min: 100, max: 9999999 })
    .map((n) => (n / 100).toFixed(2));

  // Arbitrary for a non-negative spent amount (in cents, converted to 2 decimal string)
  const spentArb = fc
    .integer({ min: 0, max: 99999999 })
    .map((n) => (n / 100).toFixed(2));

  const uuidArb = fc.uuid();

  let createdNotifications;

  beforeEach(() => {
    createdNotifications = [];
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * Helper to set up mocks for a given budget limit and spent amount.
   * - budgetRepository.findById returns budget with the given spent/limit
   * - notificationRepository.findExistingThreshold always returns null (first-time check)
   * - notificationRepository.create tracks which notifications are created
   */
  function setupMocks(budgetId, userId, limit, spent) {
    jest.spyOn(budgetRepository, 'findById').mockImplementation(async (id) => {
      if (id === budgetId) {
        return {
          id: budgetId,
          user_id: userId,
          category_id: 'category-123',
          amount_limit: limit,
          period: 'monthly',
          spent: spent,
        };
      }
      return null;
    });

    jest.spyOn(notificationRepository, 'findExistingThreshold').mockImplementation(
      async () => null
    );

    jest.spyOn(notificationRepository, 'create').mockImplementation(
      async (uid, title, message, type) => {
        const notification = { id: `notif-${type}`, user_id: uid, title, message, type, is_read: false };
        createdNotifications.push(notification);
        return notification;
      }
    );
  }

  it('creates correct notification types based on spent/limit ratio', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        limitArb,
        spentArb,
        async (userId, budgetId, limit, spent) => {
          createdNotifications = [];
          setupMocks(budgetId, userId, limit, spent);

          const limitNum = parseFloat(limit);
          const spentNum = parseFloat(spent);
          const ratio = spentNum / limitNum;

          await notificationService.checkBudgetThresholds(userId, budgetId);

          const createdTypes = createdNotifications.map((n) => n.type);

          if (ratio >= 1.0) {
            // All 3 thresholds crossed: warning + caution + critical
            expect(createdTypes).toContain('budget_warning');
            expect(createdTypes).toContain('budget_caution');
            expect(createdTypes).toContain('budget_critical');
            expect(createdTypes.length).toBe(3);
          } else if (ratio >= 0.75) {
            // 75% and 50% crossed: warning + caution
            expect(createdTypes).toContain('budget_warning');
            expect(createdTypes).toContain('budget_caution');
            expect(createdTypes).not.toContain('budget_critical');
            expect(createdTypes.length).toBe(2);
          } else if (ratio >= 0.5) {
            // Only 50% crossed: just warning
            expect(createdTypes).toContain('budget_warning');
            expect(createdTypes).not.toContain('budget_caution');
            expect(createdTypes).not.toContain('budget_critical');
            expect(createdTypes.length).toBe(1);
          } else {
            // Below 50%: no notifications
            expect(createdTypes.length).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
