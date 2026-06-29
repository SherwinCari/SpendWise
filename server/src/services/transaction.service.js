'use strict';

const transactionRepository = require('../repositories/transaction.repository');
const walletService = require('./wallet.service');
const budgetRepository = require('../repositories/budget.repository');
const { getClient, query } = require('../config/database');
const { serialize, deserialize } = require('../utils/serializer');
const { parsePagination } = require('../utils/pagination');
const {
  AuthorizationError,
  NotFoundError,
  ValidationError,
  InsufficientFundsError,
} = require('../utils/errors');

/**
 * Create a new transaction.
 * Executes atomically within a DB transaction:
 * 1. Locks wallet row with SELECT FOR UPDATE
 * 2. Validates sufficient funds for expenses
 * 3. Adjusts wallet balance
 * 4. Creates the transaction record
 * 5. Updates budget tracking if expense
 *
 * @param {string} userId - The authenticated user's ID
 * @param {object} fields - Transaction fields
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

  // Execute atomically
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Lock wallet row to prevent concurrent balance modifications
    const walletResult = await client.query(
      'SELECT id, balance FROM wallets WHERE id = $1 FOR UPDATE',
      [walletId]
    );
    const wallet = walletResult.rows[0];
    if (!wallet) {
      throw new NotFoundError('Wallet not found');
    }

    const currentBalance = parseFloat(wallet.balance);
    let newBalance;

    if (type === 'income') {
      newBalance = currentBalance + parsedAmount;
    } else {
      newBalance = currentBalance - parsedAmount;
      if (newBalance < 0) {
        throw new InsufficientFundsError('Insufficient funds: wallet balance cannot be negative');
      }
    }

    // Update wallet balance
    await client.query('UPDATE wallets SET balance = $1 WHERE id = $2', [newBalance, walletId]);

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

    await client.query('COMMIT');

    // Update budget tracking outside transaction (non-critical)
    if (type === 'expense') {
      _updateBudgetTrackingOnCreate(userId, categoryId, parsedAmount).catch(() => {});
    }

    return transaction;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
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
 * Handles wallet balance recalculation and budget tracking adjustments atomically.
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
  const newType = updates.type !== undefined ? updates.type : oldType;
  const newCategoryId = updates.categoryId !== undefined ? updates.categoryId : oldCategoryId;
  const newWalletId = updates.walletId !== undefined ? updates.walletId : oldWalletId;

  // Recalculate wallet balance if amount, type, or wallet changed
  const amountChanged = newAmount !== oldAmount;
  const typeChanged = newType !== oldType;
  const walletChanged = newWalletId !== oldWalletId;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    if (amountChanged || typeChanged || walletChanged) {
      // Lock both wallets (old and new) to prevent concurrent modifications
      const walletIds = [oldWalletId];
      if (walletChanged) walletIds.push(newWalletId);

      // Lock in consistent order to prevent deadlocks
      const sortedIds = [...new Set(walletIds)].sort();
      for (const wId of sortedIds) {
        await client.query('SELECT id FROM wallets WHERE id = $1 FOR UPDATE', [wId]);
      }

      // Reverse old impact on old wallet
      const oldWalletResult = await client.query('SELECT balance FROM wallets WHERE id = $1', [oldWalletId]);
      let oldWalletBalance = parseFloat(oldWalletResult.rows[0].balance);
      if (oldType === 'income') {
        oldWalletBalance -= oldAmount;
      } else {
        oldWalletBalance += oldAmount;
      }
      await client.query('UPDATE wallets SET balance = $1 WHERE id = $2', [oldWalletBalance, oldWalletId]);

      // Apply new impact on new (or same) wallet
      let targetBalance;
      if (walletChanged) {
        const newWalletResult = await client.query('SELECT balance FROM wallets WHERE id = $1', [newWalletId]);
        targetBalance = parseFloat(newWalletResult.rows[0].balance);
      } else {
        targetBalance = oldWalletBalance;
      }

      if (newType === 'income') {
        targetBalance += newAmount;
      } else {
        targetBalance -= newAmount;
        if (targetBalance < 0) {
          throw new InsufficientFundsError('Insufficient funds: wallet balance cannot be negative');
        }
      }
      await client.query('UPDATE wallets SET balance = $1 WHERE id = $2', [targetBalance, newWalletId]);
    }

    // Perform the update
    const updated = await transactionRepository.update(transactionId, updates);

    await client.query('COMMIT');

    // Budget tracking adjustments (non-critical, outside transaction)
    const categoryChanged = newCategoryId !== oldCategoryId;
    if (categoryChanged) {
      if (oldType === 'expense') {
        _updateBudgetTrackingOnDelete(userId, oldCategoryId, oldAmount).catch(() => {});
      }
      if (newType === 'expense') {
        _updateBudgetTrackingOnCreate(userId, newCategoryId, newAmount).catch(() => {});
      }
    } else if ((amountChanged || typeChanged) && !categoryChanged) {
      if (oldType === 'expense') {
        _updateBudgetTrackingOnDelete(userId, oldCategoryId, oldAmount).catch(() => {});
      }
      if (newType === 'expense') {
        _updateBudgetTrackingOnCreate(userId, newCategoryId, newAmount).catch(() => {});
      }
    }

    return updated;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Delete a transaction.
 * Reverses wallet balance impact atomically and updates budget tracking.
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

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Lock wallet row
    const walletResult = await client.query(
      'SELECT balance FROM wallets WHERE id = $1 FOR UPDATE',
      [walletId]
    );
    let balance = parseFloat(walletResult.rows[0].balance);

    // Reverse: expense → add back, income → subtract
    if (type === 'income') {
      balance -= amount;
    } else {
      balance += amount;
    }

    await client.query('UPDATE wallets SET balance = $1 WHERE id = $2', [balance, walletId]);

    // Delete the transaction record
    const deleted = await transactionRepository.delete(transactionId);

    await client.query('COMMIT');

    // If was expense, reverse budget tracking (non-critical)
    if (type === 'expense') {
      _updateBudgetTrackingOnDelete(userId, categoryId, amount).catch(() => {});
    }

    return deleted;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
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
