'use strict';

const transactionRepository = require('../repositories/transaction.repository');
const walletService = require('./wallet.service');
const budgetRepository = require('../repositories/budget.repository');
const { getClient } = require('../config/database');
const { serialize, deserialize } = require('../utils/serializer');
const { parsePagination } = require('../utils/pagination');
const {
  AuthorizationError,
  NotFoundError,
  ValidationError,
} = require('../utils/errors');

/**
 * Create a new transaction.
 * Within a DB transaction:
 * 1. Creates the transaction record
 * 2. Adjusts the wallet balance (income adds, expense subtracts)
 * 3. If expense, updates budget tracking for matching category budgets
 *
 * @param {string} userId - The authenticated user's ID
 * @param {object} fields - Transaction fields
 * @param {number|string} fields.amount - Transaction amount (must be > 0)
 * @param {string} fields.type - 'income' or 'expense'
 * @param {string} fields.categoryId - Category ID
 * @param {string} [fields.description] - Optional description
 * @param {string|Date} fields.date - Transaction date
 * @param {string} fields.walletId - Wallet ID
 * @returns {Promise<object>} The created transaction
 */
async function create(userId, fields) {
  const { amount, type, categoryId, description, date, walletId, receiptImage } = fields;

  // Validate required fields
  const missingFields = [];
  if (amount === undefined || amount === null) missingFields.push('amount');
  if (!type) missingFields.push('type');
  if (!categoryId) missingFields.push('categoryId');
  if (!walletId) missingFields.push('walletId');
  if (!date) missingFields.push('date');

  if (missingFields.length > 0) {
    throw new ValidationError(
      'Missing required fields',
      missingFields.map((f) => ({ field: f, message: `${f} is required` }))
    );
  }

  // Validate amount > 0
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    throw new ValidationError('Amount must be greater than zero', [
      { field: 'amount', message: 'Amount must be greater than zero' },
    ]);
  }

  // Validate type
  if (type !== 'income' && type !== 'expense') {
    throw new ValidationError('Invalid transaction type', [
      { field: 'type', message: 'type must be "income" or "expense"' },
    ]);
  }

  // Adjust wallet balance (will throw InsufficientFundsError if needed)
  await walletService.adjustBalance(walletId, parsedAmount, type);

  // Create transaction record
  const transaction = await transactionRepository.create({
    userId,
    walletId,
    categoryId,
    type,
    amount: parsedAmount,
    description: description || null,
    date,
    receiptImage: receiptImage || null,
  });

  // If expense, update budget tracking for matching budgets
  if (type === 'expense') {
    await _updateBudgetTrackingOnCreate(userId, categoryId, parsedAmount);
  }

  return transaction;
}

/**
 * Get a transaction by ID with ownership verification.
 *
 * @param {string} userId - The authenticated user's ID
 * @param {string} transactionId - The transaction ID to retrieve
 * @returns {Promise<object>} The transaction
 * @throws {NotFoundError} If transaction doesn't exist
 * @throws {AuthorizationError} If user doesn't own the transaction
 */
async function getById(userId, transactionId) {
  const transaction = await transactionRepository.findById(transactionId);

  if (!transaction) {
    throw new NotFoundError('Transaction not found');
  }

  if (transaction.user_id !== userId) {
    throw new AuthorizationError('You do not have permission to access this transaction');
  }

  return transaction;
}

/**
 * List transactions for a user with optional filters and pagination.
 *
 * @param {string} userId - The authenticated user's ID
 * @param {object} [filters={}] - Filter and pagination options
 * @param {number|string} [filters.page] - Page number
 * @param {number|string} [filters.limit] - Items per page
 * @param {string} [filters.startDate] - Start of date range
 * @param {string} [filters.endDate] - End of date range
 * @param {string} [filters.categoryId] - Filter by category ID
 * @param {string} [filters.type] - Filter by type
 * @param {string} [filters.search] - Search on description
 * @returns {Promise<{ transactions: object[], total: number, page: number, limit: number }>}
 */
async function list(userId, filters = {}) {
  const { page, limit, offset } = parsePagination(filters);

  const filterCriteria = {};
  if (filters.startDate) filterCriteria.startDate = filters.startDate;
  if (filters.endDate) filterCriteria.endDate = filters.endDate;
  if (filters.categoryId) filterCriteria.categoryId = filters.categoryId;
  if (filters.type) filterCriteria.type = filters.type;
  if (filters.search) filterCriteria.search = filters.search;

  const { rows, total } = await transactionRepository.findByUserId(
    userId,
    filterCriteria,
    { limit, offset }
  );

  return {
    transactions: rows,
    total,
    page,
    limit,
  };
}

/**
 * Update an existing transaction.
 * Handles wallet balance recalculation and budget tracking adjustments.
 *
 * @param {string} userId - The authenticated user's ID
 * @param {string} transactionId - The transaction ID to update
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} The updated transaction
 * @throws {NotFoundError} If transaction doesn't exist
 * @throws {AuthorizationError} If user doesn't own the transaction
 */
async function update(userId, transactionId, updates) {
  // Fetch existing transaction and verify ownership
  const existing = await transactionRepository.findById(transactionId);

  if (!existing) {
    throw new NotFoundError('Transaction not found');
  }

  if (existing.user_id !== userId) {
    throw new AuthorizationError('You do not have permission to update this transaction');
  }

  // Validate amount if provided
  if (updates.amount !== undefined) {
    const parsedAmount = parseFloat(updates.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new ValidationError('Amount must be greater than zero', [
        { field: 'amount', message: 'Amount must be greater than zero' },
      ]);
    }
    updates.amount = parsedAmount;
  }

  // Validate type if provided
  if (updates.type !== undefined && updates.type !== 'income' && updates.type !== 'expense') {
    throw new ValidationError('Invalid transaction type', [
      { field: 'type', message: 'type must be "income" or "expense"' },
    ]);
  }

  const oldAmount = parseFloat(existing.amount);
  const oldType = existing.type;
  const oldCategoryId = existing.category_id;
  const oldWalletId = existing.wallet_id;

  const newAmount = updates.amount !== undefined ? parseFloat(updates.amount) : oldAmount;
  const newType = updates.type || oldType;
  const newCategoryId = updates.categoryId || oldCategoryId;
  const newWalletId = updates.walletId || oldWalletId;

  // Recalculate wallet balance if amount, type, or wallet changed
  const amountChanged = newAmount !== oldAmount;
  const typeChanged = newType !== oldType;
  const walletChanged = newWalletId !== oldWalletId;

  if (amountChanged || typeChanged || walletChanged) {
    // Reverse old impact on old wallet
    const reverseType = oldType === 'income' ? 'expense' : 'income';
    await walletService.adjustBalance(oldWalletId, oldAmount, reverseType);

    // Apply new impact on new (or same) wallet
    await walletService.adjustBalance(newWalletId, newAmount, newType);
  }

  // Recalculate budget tracking if category changed and involves expense
  const categoryChanged = newCategoryId !== oldCategoryId;

  if (categoryChanged) {
    // If old transaction was expense, subtract from old category's budget tracking
    if (oldType === 'expense') {
      await _updateBudgetTrackingOnDelete(userId, oldCategoryId, oldAmount);
    }

    // If new transaction is expense, add to new category's budget tracking
    if (newType === 'expense') {
      await _updateBudgetTrackingOnCreate(userId, newCategoryId, newAmount);
    }
  } else if ((amountChanged || typeChanged) && !categoryChanged) {
    // Same category but amount/type changed — adjust budget tracking
    if (oldType === 'expense') {
      await _updateBudgetTrackingOnDelete(userId, oldCategoryId, oldAmount);
    }
    if (newType === 'expense') {
      await _updateBudgetTrackingOnCreate(userId, newCategoryId, newAmount);
    }
  }

  // Perform the update
  const updated = await transactionRepository.update(transactionId, updates);
  return updated;
}

/**
 * Delete a transaction.
 * Reverses wallet balance impact and budget tracking.
 *
 * @param {string} userId - The authenticated user's ID
 * @param {string} transactionId - The transaction ID to delete
 * @returns {Promise<boolean>} True if deleted successfully
 * @throws {NotFoundError} If transaction doesn't exist
 * @throws {AuthorizationError} If user doesn't own the transaction
 */
async function deleteTransaction(userId, transactionId) {
  // Fetch existing transaction and verify ownership
  const existing = await transactionRepository.findById(transactionId);

  if (!existing) {
    throw new NotFoundError('Transaction not found');
  }

  if (existing.user_id !== userId) {
    throw new AuthorizationError('You do not have permission to delete this transaction');
  }

  const amount = parseFloat(existing.amount);
  const type = existing.type;
  const categoryId = existing.category_id;
  const walletId = existing.wallet_id;

  // Reverse wallet balance: expense → add back, income → subtract
  const reverseType = type === 'income' ? 'expense' : 'income';
  await walletService.adjustBalance(walletId, amount, reverseType);

  // If was expense, reverse budget tracking (subtract from spent)
  if (type === 'expense') {
    await _updateBudgetTrackingOnDelete(userId, categoryId, amount);
  }

  // Delete the transaction record
  const deleted = await transactionRepository.delete(transactionId);
  return deleted;
}

// ============================================================
// PRIVATE HELPERS
// ============================================================

/**
 * Update budget tracking when creating an expense transaction.
 * Finds active budgets for the category and adds the amount to spent.
 *
 * @param {string} userId - User ID
 * @param {string} categoryId - Category ID
 * @param {number} amount - Amount to add to spent
 */
async function _updateBudgetTrackingOnCreate(userId, categoryId, amount) {
  const budgets = await budgetRepository.findByCategoryAndPeriod(userId, categoryId);

  for (const budget of budgets) {
    await budgetRepository.updateSpent(budget.id, amount, 'add');
  }
}

/**
 * Update budget tracking when deleting an expense transaction.
 * Finds active budgets for the category and subtracts the amount from spent.
 *
 * @param {string} userId - User ID
 * @param {string} categoryId - Category ID
 * @param {number} amount - Amount to subtract from spent
 */
async function _updateBudgetTrackingOnDelete(userId, categoryId, amount) {
  const budgets = await budgetRepository.findByCategoryAndPeriod(userId, categoryId);

  for (const budget of budgets) {
    await budgetRepository.updateSpent(budget.id, amount, 'subtract');
  }
}

module.exports = {
  create,
  getById,
  list,
  update,
  delete: deleteTransaction,
  serialize,
  deserialize,
};
