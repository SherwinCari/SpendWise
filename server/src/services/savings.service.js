'use strict';

/**
 * Savings Goals Service (Feature #22)
 * 
 * SQL to create table (run manually on Neon):
 * 
 * CREATE TABLE IF NOT EXISTS savings_goals (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 *   name VARCHAR(100) NOT NULL,
 *   target_amount DECIMAL(12,2) NOT NULL,
 *   current_amount DECIMAL(12,2) DEFAULT 0,
 *   deadline DATE,
 *   created_at TIMESTAMP DEFAULT NOW(),
 *   updated_at TIMESTAMP DEFAULT NOW()
 * );
 */

const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

/**
 * Create a new savings goal.
 */
async function create(userId, data) {
  const id = uuidv4();
  const { name, targetAmount, deadline } = data;

  const result = await query(
    `INSERT INTO savings_goals (id, user_id, name, target_amount, current_amount, deadline)
     VALUES ($1, $2, $3, $4, 0, $5)
     RETURNING *`,
    [id, userId, name, targetAmount, deadline || null]
  );

  return result.rows[0];
}

/**
 * List all savings goals for a user.
 */
async function list(userId) {
  const result = await query(
    `SELECT * FROM savings_goals WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Get a single savings goal.
 */
async function getById(userId, id) {
  const result = await query(
    `SELECT * FROM savings_goals WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );

  if (!result.rows[0]) {
    const err = new Error('Savings goal not found');
    err.statusCode = 404;
    throw err;
  }

  return result.rows[0];
}

/**
 * Update a savings goal.
 */
async function update(userId, id, data) {
  const fields = [];
  const values = [];
  let paramIdx = 1;

  if (data.name !== undefined) { fields.push(`name = $${paramIdx++}`); values.push(data.name); }
  if (data.targetAmount !== undefined) { fields.push(`target_amount = $${paramIdx++}`); values.push(data.targetAmount); }
  if (data.deadline !== undefined) { fields.push(`deadline = $${paramIdx++}`); values.push(data.deadline); }

  if (fields.length === 0) return getById(userId, id);

  fields.push(`updated_at = NOW()`);
  values.push(id, userId);

  const result = await query(
    `UPDATE savings_goals SET ${fields.join(', ')} WHERE id = $${paramIdx} AND user_id = $${paramIdx + 1} RETURNING *`,
    values
  );

  if (!result.rows[0]) {
    const err = new Error('Savings goal not found');
    err.statusCode = 404;
    throw err;
  }

  return result.rows[0];
}

/**
 * Delete a savings goal.
 */
async function remove(userId, id) {
  const result = await query(
    `DELETE FROM savings_goals WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId]
  );

  if (!result.rows[0]) {
    const err = new Error('Savings goal not found');
    err.statusCode = 404;
    throw err;
  }

  return { message: 'Savings goal deleted' };
}

/**
 * Deposit amount into a savings goal.
 */
async function deposit(userId, id, amount) {
  if (!amount || amount <= 0) {
    const err = new Error('Amount must be positive');
    err.statusCode = 400;
    throw err;
  }

  const result = await query(
    `UPDATE savings_goals SET current_amount = current_amount + $1, updated_at = NOW()
     WHERE id = $2 AND user_id = $3 RETURNING *`,
    [amount, id, userId]
  );

  if (!result.rows[0]) {
    const err = new Error('Savings goal not found');
    err.statusCode = 404;
    throw err;
  }

  const goal = result.rows[0];
  const isGoalMet = parseFloat(goal.current_amount) >= parseFloat(goal.target_amount);

  return { goal, isGoalMet };
}

/**
 * Withdraw amount from a savings goal.
 */
async function withdraw(userId, id, amount) {
  if (!amount || amount <= 0) {
    const err = new Error('Amount must be positive');
    err.statusCode = 400;
    throw err;
  }

  // Check current amount
  const current = await getById(userId, id);
  if (parseFloat(current.current_amount) < amount) {
    const err = new Error('Insufficient savings balance');
    err.statusCode = 400;
    throw err;
  }

  const result = await query(
    `UPDATE savings_goals SET current_amount = current_amount - $1, updated_at = NOW()
     WHERE id = $2 AND user_id = $3 RETURNING *`,
    [amount, id, userId]
  );

  return { goal: result.rows[0] };
}

module.exports = {
  create,
  list,
  getById,
  update,
  remove,
  deposit,
  withdraw,
};
