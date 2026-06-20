'use strict';

const budgetRepository = require('../repositories/budget.repository');
const { query } = require('../config/database');
const {
  AuthorizationError,
  DuplicateError,
  NotFoundError,
  ValidationError,
} = require('../utils/errors');

/**
 * Create a new budget for the authenticated user.
 * Checks for duplicate (same category + period), then creates budget and budget_tracking.
 * @param {string} userId - The authenticated user's ID
 * @param {object} data - Budget data
 * @param {string} data.categoryId - Category ID to set budget for
 * @param {number|string} data.amountLimit - Spending limit
 * @param {string} data.period - 'weekly' or 'monthly'
 * @param {string} data.startDate - Budget start date (ISO date string)
 * @returns {Promise<object>} The created budget with tracking
 */
async function create(userId, { categoryId, amountLimit, period, startDate }) {
  // Validate period enum
  if (!['weekly', 'monthly'].includes(period)) {
    throw new ValidationError('Invalid period. Must be "weekly" or "monthly"');
  }

  // Check for duplicate budget (same user + category + period)
  const existing = await budgetRepository.findDuplicate(userId, categoryId, period);
  if (existing) {
    throw new DuplicateError('A budget already exists for this category and period');
  }

  // Create the budget record
  const budget = await budgetRepository.create({
    userId,
    categoryId,
    amountLimit,
    period,
    startDate,
  });

  // Create the associated budget_tracking record with spent = 0
  const tracking = await budgetRepository.createTracking(budget.id, userId);

  return { ...budget, spent: tracking.spent };
}

/**
 * List all budgets for a user with progress information.
 * Each budget includes spent, limit, percentage, and remaining.
 * @param {string} userId - The authenticated user's ID
 * @returns {Promise<object[]>} Array of budgets with progress data
 */
async function list(userId) {
  const budgets = await budgetRepository.findByUserId(userId);

  return budgets.map((budget) => {
    const spent = parseFloat(budget.spent) || 0;
    const limit = parseFloat(budget.amount_limit);
    const percentage = limit > 0 ? (spent / limit) * 100 : 0;
    const remaining = limit - spent;

    return {
      ...budget,
      spent,
      amountLimit: limit,
      percentage: Math.round(percentage * 100) / 100,
      remaining,
      categoryName: budget.category_name || null,
      categoryIcon: budget.category_icon || null,
      categoryColor: budget.category_color || null,
    };
  });
}

/**
 * Update a budget's amount_limit with ownership verification.
 * @param {string} userId - The authenticated user's ID
 * @param {string} budgetId - The budget ID to update
 * @param {object} data - Update data
 * @param {number|string} data.amountLimit - New spending limit
 * @returns {Promise<object>} The updated budget
 */
async function update(userId, budgetId, { amountLimit }) {
  const budget = await budgetRepository.findById(budgetId);

  if (!budget) {
    throw new NotFoundError('Budget not found');
  }

  if (budget.user_id !== userId) {
    throw new AuthorizationError('You do not have permission to update this budget');
  }

  const updated = await budgetRepository.update(budgetId, amountLimit);
  return updated;
}

/**
 * Delete a budget and its associated budget_tracking.
 * Verifies ownership before deletion.
 * @param {string} userId - The authenticated user's ID
 * @param {string} budgetId - The budget ID to delete
 * @returns {Promise<void>}
 */
async function deleteBudget(userId, budgetId) {
  const budget = await budgetRepository.findById(budgetId);

  if (!budget) {
    throw new NotFoundError('Budget not found');
  }

  if (budget.user_id !== userId) {
    throw new AuthorizationError('You do not have permission to delete this budget');
  }

  // Delete budget (budget_tracking cascades via ON DELETE CASCADE)
  await budgetRepository.delete(budgetId);
}

/**
 * Update the spent amount on budget_tracking for a category.
 * Finds all budgets matching the category and updates their tracking.
 * @param {string} userId - The authenticated user's ID
 * @param {string} categoryId - The category ID
 * @param {number|string} amount - Amount to add or subtract
 * @param {'add'|'subtract'} operation - Whether to add or subtract from spent
 * @returns {Promise<void>}
 */
async function updateSpent(userId, categoryId, amount, operation) {
  // Find all budgets for this category belonging to the user
  const budgets = await budgetRepository.findByCategoryAndPeriod(userId, categoryId);

  // Update spent on each matching budget's tracking
  for (const budget of budgets) {
    await budgetRepository.updateSpent(budget.id, amount, operation);
  }
}

/**
 * Recalculate the spent amount for all budgets of a given category.
 * Sums all expense transactions for the user+category in the budget period.
 * @param {string} userId - The authenticated user's ID
 * @param {string} categoryId - The category ID to recalculate
 * @returns {Promise<void>}
 */
async function recalculateSpent(userId, categoryId) {
  // Find all budgets for this category
  const budgets = await budgetRepository.findByCategoryAndPeriod(userId, categoryId);

  for (const budget of budgets) {
    // Calculate the sum of expense transactions for this category in the budget period
    const result = await query(
      `SELECT COALESCE(SUM(amount), 0) AS total_spent
       FROM transactions
       WHERE user_id = $1
         AND category_id = $2
         AND type = 'expense'
         AND date >= $3
         AND ($4::date IS NULL OR date <= $4)`,
      [userId, categoryId, budget.start_date, budget.end_date || null]
    );

    const totalSpent = parseFloat(result.rows[0].total_spent);

    // Directly set the spent amount on budget_tracking
    await query(
      `UPDATE budget_tracking SET spent = $1, updated_at = NOW() WHERE budget_id = $2`,
      [totalSpent, budget.id]
    );
  }
}

/**
 * Get progress for a specific budget.
 * Returns spent, limit, percentage, and remaining.
 * @param {string} budgetId - The budget ID
 * @returns {Promise<object>} Progress object { spent, limit, percentage, remaining }
 */
async function getProgress(budgetId) {
  const budget = await budgetRepository.findById(budgetId);

  if (!budget) {
    throw new NotFoundError('Budget not found');
  }

  const spent = parseFloat(budget.spent) || 0;
  const limit = parseFloat(budget.amount_limit);
  const percentage = limit > 0 ? (spent / limit) * 100 : 0;
  const remaining = limit - spent;

  return {
    spent,
    limit,
    percentage: Math.round(percentage * 100) / 100,
    remaining,
  };
}

module.exports = {
  create,
  list,
  update,
  delete: deleteBudget,
  updateSpent,
  recalculateSpent,
  getProgress,
};
