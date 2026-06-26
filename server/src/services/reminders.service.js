'use strict';

/**
 * Bill Reminders Service (Feature #20)
 * 
 * SQL to create table (run manually on Neon):
 * 
 * CREATE TABLE IF NOT EXISTS reminders (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 *   title VARCHAR(100) NOT NULL,
 *   amount DECIMAL(12,2),
 *   due_date DATE NOT NULL,
 *   recurrence VARCHAR(20) CHECK (recurrence IN ('none', 'weekly', 'monthly', 'yearly')),
 *   is_paid BOOLEAN DEFAULT false,
 *   created_at TIMESTAMP DEFAULT NOW()
 * );
 */

const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

/**
 * Create a new bill reminder.
 */
async function create(userId, data) {
  const id = uuidv4();
  const { title, amount, dueDate, recurrence } = data;

  const result = await query(
    `INSERT INTO reminders (id, user_id, title, amount, due_date, recurrence)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [id, userId, title, amount || null, dueDate, recurrence || 'none']
  );

  return result.rows[0];
}

/**
 * List all reminders for a user, sorted by due_date.
 */
async function list(userId) {
  const result = await query(
    `SELECT * FROM reminders WHERE user_id = $1 ORDER BY due_date ASC`,
    [userId]
  );
  return result.rows;
}

/**
 * Get a single reminder.
 */
async function getById(userId, id) {
  const result = await query(
    `SELECT * FROM reminders WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );

  if (!result.rows[0]) {
    const err = new Error('Reminder not found');
    err.statusCode = 404;
    throw err;
  }

  return result.rows[0];
}

/**
 * Update a reminder.
 */
async function update(userId, id, data) {
  const fields = [];
  const values = [];
  let paramIdx = 1;

  if (data.title !== undefined) { fields.push(`title = $${paramIdx++}`); values.push(data.title); }
  if (data.amount !== undefined) { fields.push(`amount = $${paramIdx++}`); values.push(data.amount); }
  if (data.dueDate !== undefined) { fields.push(`due_date = $${paramIdx++}`); values.push(data.dueDate); }
  if (data.recurrence !== undefined) { fields.push(`recurrence = $${paramIdx++}`); values.push(data.recurrence); }
  if (data.isPaid !== undefined) { fields.push(`is_paid = $${paramIdx++}`); values.push(data.isPaid); }

  if (fields.length === 0) return getById(userId, id);

  values.push(id, userId);

  const result = await query(
    `UPDATE reminders SET ${fields.join(', ')} WHERE id = $${paramIdx} AND user_id = $${paramIdx + 1} RETURNING *`,
    values
  );

  if (!result.rows[0]) {
    const err = new Error('Reminder not found');
    err.statusCode = 404;
    throw err;
  }

  return result.rows[0];
}

/**
 * Mark a reminder as paid.
 */
async function markPaid(userId, id) {
  return update(userId, id, { isPaid: true });
}

/**
 * Delete a reminder.
 */
async function remove(userId, id) {
  const result = await query(
    `DELETE FROM reminders WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId]
  );

  if (!result.rows[0]) {
    const err = new Error('Reminder not found');
    err.statusCode = 404;
    throw err;
  }

  return { message: 'Reminder deleted' };
}

module.exports = {
  create,
  list,
  getById,
  update,
  markPaid,
  remove,
};
