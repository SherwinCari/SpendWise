'use strict';

/**
 * Recurring Transactions Service (Feature #17)
 * 
 * SQL to create table (run manually on Neon):
 * 
 * CREATE TABLE IF NOT EXISTS recurring_transactions (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 *   amount DECIMAL(12,2) NOT NULL,
 *   type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
 *   category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
 *   wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
 *   description VARCHAR(255),
 *   frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'yearly')),
 *   start_date DATE NOT NULL,
 *   end_date DATE,
 *   next_due_date DATE NOT NULL,
 *   is_active BOOLEAN DEFAULT true,
 *   created_at TIMESTAMP DEFAULT NOW(),
 *   updated_at TIMESTAMP DEFAULT NOW()
 * );
 */

const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

/**
 * Create a new recurring transaction.
 */
async function create(userId, data) {
  const id = uuidv4();
  const { amount, type, categoryId, walletId, description, frequency, startDate, endDate } = data;

  const result = await query(
    `INSERT INTO recurring_transactions (id, user_id, amount, type, category_id, wallet_id, description, frequency, start_date, end_date, next_due_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $9)
     RETURNING *`,
    [id, userId, amount, type, categoryId, walletId, description || null, frequency, startDate, endDate || null]
  );

  return result.rows[0];
}

/**
 * List all recurring transactions for a user.
 */
async function list(userId) {
  const result = await query(
    `SELECT rt.*, c.name as category_name, c.icon as category_icon, c.color as category_color, w.name as wallet_name
     FROM recurring_transactions rt
     LEFT JOIN categories c ON rt.category_id = c.id
     LEFT JOIN wallets w ON rt.wallet_id = w.id
     WHERE rt.user_id = $1
     ORDER BY rt.next_due_date ASC`,
    [userId]
  );
  return result.rows;
}

/**
 * Get a single recurring transaction by ID.
 */
async function getById(userId, id) {
  const result = await query(
    `SELECT rt.*, c.name as category_name, c.icon as category_icon, c.color as category_color, w.name as wallet_name
     FROM recurring_transactions rt
     LEFT JOIN categories c ON rt.category_id = c.id
     LEFT JOIN wallets w ON rt.wallet_id = w.id
     WHERE rt.id = $1 AND rt.user_id = $2`,
    [id, userId]
  );

  if (!result.rows[0]) {
    const err = new Error('Recurring transaction not found');
    err.statusCode = 404;
    throw err;
  }

  return result.rows[0];
}

/**
 * Update a recurring transaction.
 */
async function update(userId, id, data) {
  const fields = [];
  const values = [];
  let paramIdx = 1;

  const allowedFields = ['amount', 'type', 'category_id', 'wallet_id', 'description', 'frequency', 'start_date', 'end_date', 'next_due_date', 'is_active'];
  const fieldMap = {
    amount: 'amount', type: 'type', categoryId: 'category_id', walletId: 'wallet_id',
    description: 'description', frequency: 'frequency', startDate: 'start_date',
    endDate: 'end_date', nextDueDate: 'next_due_date', isActive: 'is_active',
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    if (data[key] !== undefined) {
      fields.push(`${col} = $${paramIdx}`);
      values.push(data[key]);
      paramIdx++;
    }
  }

  if (fields.length === 0) {
    return getById(userId, id);
  }

  fields.push(`updated_at = NOW()`);
  values.push(id, userId);

  const result = await query(
    `UPDATE recurring_transactions SET ${fields.join(', ')} WHERE id = $${paramIdx} AND user_id = $${paramIdx + 1} RETURNING *`,
    values
  );

  if (!result.rows[0]) {
    const err = new Error('Recurring transaction not found');
    err.statusCode = 404;
    throw err;
  }

  return result.rows[0];
}

/**
 * Delete a recurring transaction.
 */
async function remove(userId, id) {
  const result = await query(
    `DELETE FROM recurring_transactions WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId]
  );

  if (!result.rows[0]) {
    const err = new Error('Recurring transaction not found');
    err.statusCode = 404;
    throw err;
  }

  return { message: 'Recurring transaction deleted' };
}

/**
 * Execute all due recurring transactions.
 * Creates actual transactions for any recurring items that are past due.
 * Advances next_due_date based on frequency.
 */
async function executeDue(userId) {
  const today = new Date().toISOString().split('T')[0];

  const dueItems = await query(
    `SELECT * FROM recurring_transactions
     WHERE user_id = $1 AND is_active = true AND next_due_date <= $2
     AND (end_date IS NULL OR end_date >= $2)`,
    [userId, today]
  );

  const created = [];

  for (const item of dueItems.rows) {
    // Create the transaction
    const txId = uuidv4();
    await query(
      `INSERT INTO transactions (id, user_id, amount, type, category_id, wallet_id, description, date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [txId, userId, item.amount, item.type, item.category_id, item.wallet_id,
       item.description || 'Recurring transaction', item.next_due_date]
    );

    // Update wallet balance
    if (item.type === 'income') {
      await query(`UPDATE wallets SET balance = balance + $1 WHERE id = $2`, [item.amount, item.wallet_id]);
    } else {
      await query(`UPDATE wallets SET balance = balance - $1 WHERE id = $2`, [item.amount, item.wallet_id]);
    }

    // Calculate next due date
    const nextDate = calculateNextDueDate(new Date(item.next_due_date), item.frequency);

    // Check if past end_date — deactivate if so
    const isActive = !item.end_date || nextDate <= new Date(item.end_date);

    await query(
      `UPDATE recurring_transactions SET next_due_date = $1, is_active = $2, updated_at = NOW() WHERE id = $3`,
      [nextDate.toISOString().split('T')[0], isActive, item.id]
    );

    created.push({ transactionId: txId, recurringId: item.id, amount: item.amount, type: item.type });
  }

  return { executed: created.length, transactions: created };
}

/**
 * Calculate next due date based on frequency.
 */
function calculateNextDueDate(currentDate, frequency) {
  const next = new Date(currentDate);

  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      next.setMonth(next.getMonth() + 1);
  }

  return next;
}

module.exports = {
  create,
  list,
  getById,
  update,
  remove,
  executeDue,
};
