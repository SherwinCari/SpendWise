'use strict';

const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

// ============================================================
// BUDGET METHODS
// ============================================================

/**
 * Create a new budget record.
 * @param {object} fields - Budget fields
 * @param {string} fields.userId - Owner user ID
 * @param {string} fields.categoryId - Category ID for this budget
 * @param {number|string} fields.amountLimit - Spending limit
 * @param {string} fields.period - 'weekly' or 'monthly'
 * @param {string} fields.startDate - Budget start date (ISO date string)
 * @param {string|null} [fields.endDate] - Budget end date (optional)
 * @returns {Promise<object>} The created budget row
 */
async function create(fields) {
  const { userId, categoryId, amountLimit, period, startDate, endDate = null } = fields;
  const id = uuidv4();
  const result = await query(
    `INSERT INTO budgets (id, user_id, category_id, amount_limit, period, start_date, end_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [id, userId, categoryId, amountLimit, period, startDate, endDate]
  );
  return result.rows[0];
}

/**
 * Find all budgets belonging to a user.
 * Joins with categories to include category name, and budget_tracking for spent data.
 * @param {string} userId - Owner user ID
 * @returns {Promise<object[]>} Array of budget rows with category info and tracking
 */
async function findByUserId(userId) {
  const result = await query(
    `SELECT b.*, bt.spent, bt.updated_at AS tracking_updated_at,
            c.name AS category_name, c.icon AS category_icon, c.color AS category_color
     FROM budgets b
     LEFT JOIN budget_tracking bt ON bt.budget_id = b.id
     LEFT JOIN categories c ON c.id = b.category_id
     WHERE b.user_id = $1
     ORDER BY b.created_at DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Find a budget by its ID.
 * @param {string} id - Budget ID
 * @returns {Promise<object|null>} The budget row or null
 */
async function findById(id) {
  const result = await query(
    `SELECT b.*, bt.spent, bt.updated_at AS tracking_updated_at
     FROM budgets b
     LEFT JOIN budget_tracking bt ON bt.budget_id = b.id
     WHERE b.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Update the amount_limit of a budget.
 * @param {string} id - Budget ID
 * @param {number|string} amountLimit - New spending limit
 * @returns {Promise<object|null>} The updated budget row or null
 */
async function update(id, amountLimit) {
  const result = await query(
    `UPDATE budgets SET amount_limit = $1 WHERE id = $2 RETURNING *`,
    [amountLimit, id]
  );
  return result.rows[0] || null;
}

/**
 * Delete a budget by its ID.
 * The associated budget_tracking record is removed automatically via ON DELETE CASCADE.
 * @param {string} id - Budget ID
 * @returns {Promise<boolean>} True if a row was deleted
 */
async function deleteBudget(id) {
  const result = await query(
    `DELETE FROM budgets WHERE id = $1`,
    [id]
  );
  return result.rowCount > 0;
}

/**
 * Check if a duplicate budget exists for the same user, category, and period.
 * @param {string} userId - Owner user ID
 * @param {string} categoryId - Category ID
 * @param {string} period - 'weekly' or 'monthly'
 * @returns {Promise<object|null>} The existing budget row or null
 */
async function findDuplicate(userId, categoryId, period) {
  const result = await query(
    `SELECT * FROM budgets
     WHERE user_id = $1 AND category_id = $2 AND period = $3`,
    [userId, categoryId, period]
  );
  return result.rows[0] || null;
}

/**
 * Find budgets for a given user, category, and period (active budgets for spending tracking).
 * @param {string} userId - Owner user ID
 * @param {string} categoryId - Category ID
 * @returns {Promise<object[]>} Array of matching budget rows with tracking info
 */
async function findByCategoryAndPeriod(userId, categoryId) {
  const result = await query(
    `SELECT b.*, bt.spent, bt.id AS tracking_id
     FROM budgets b
     LEFT JOIN budget_tracking bt ON bt.budget_id = b.id
     WHERE b.user_id = $1 AND b.category_id = $2`,
    [userId, categoryId]
  );
  return result.rows;
}

// ============================================================
// BUDGET TRACKING METHODS
// ============================================================

/**
 * Create a budget_tracking record for a budget.
 * @param {string} budgetId - Associated budget ID
 * @param {string} userId - Owner user ID
 * @returns {Promise<object>} The created budget_tracking row
 */
async function createTracking(budgetId, userId) {
  const id = uuidv4();
  const result = await query(
    `INSERT INTO budget_tracking (id, user_id, budget_id, spent, updated_at)
     VALUES ($1, $2, $3, 0, NOW())
     RETURNING *`,
    [id, userId, budgetId]
  );
  return result.rows[0];
}

/**
 * Atomically update the spent amount in budget_tracking.
 * @param {string} budgetId - Associated budget ID
 * @param {number|string} amount - Amount to add or subtract
 * @param {'add'|'subtract'} operation - Whether to add or subtract
 * @returns {Promise<object|null>} The updated budget_tracking row or null
 */
async function updateSpent(budgetId, amount, operation) {
  const operator = operation === 'add' ? '+' : '-';
  const result = await query(
    `UPDATE budget_tracking
     SET spent = spent ${operator} $1, updated_at = NOW()
     WHERE budget_id = $2
     RETURNING *`,
    [amount, budgetId]
  );
  return result.rows[0] || null;
}

/**
 * Get the budget_tracking record for a budget.
 * @param {string} budgetId - Associated budget ID
 * @returns {Promise<object|null>} The budget_tracking row or null
 */
async function getTracking(budgetId) {
  const result = await query(
    `SELECT * FROM budget_tracking WHERE budget_id = $1`,
    [budgetId]
  );
  return result.rows[0] || null;
}

/**
 * Delete the budget_tracking record for a budget.
 * @param {string} budgetId - Associated budget ID
 * @returns {Promise<boolean>} True if a row was deleted
 */
async function deleteTracking(budgetId) {
  const result = await query(
    `DELETE FROM budget_tracking WHERE budget_id = $1`,
    [budgetId]
  );
  return result.rowCount > 0;
}

module.exports = {
  // Budget methods
  create,
  findByUserId,
  findById,
  update,
  delete: deleteBudget,
  findDuplicate,
  findByCategoryAndPeriod,
  // Budget tracking methods
  createTracking,
  updateSpent,
  getTracking,
  deleteTracking,
};
