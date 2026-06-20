'use strict';

const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

/**
 * Create a new category for a user.
 * @param {string} userId - Owner user ID
 * @param {string} name - Category name
 * @param {string} type - Category type ('income' or 'expense')
 * @param {string|null} icon - Optional icon identifier
 * @param {string|null} color - Optional color hex code
 * @returns {Promise<object>} The created category row
 */
async function create(userId, name, type, icon, color) {
  const id = uuidv4();
  const result = await query(
    `INSERT INTO categories (id, user_id, name, type, icon, color)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [id, userId, name, type, icon || null, color || null]
  );
  return result.rows[0];
}

/**
 * Find all categories belonging to a user.
 * @param {string} userId - Owner user ID
 * @returns {Promise<object[]>} Array of category rows
 */
async function findByUserId(userId) {
  const result = await query(
    `SELECT * FROM categories WHERE user_id = $1 ORDER BY type ASC, name ASC`,
    [userId]
  );
  return result.rows;
}

/**
 * Find a category by its ID.
 * @param {string} id - Category ID
 * @returns {Promise<object|null>} The category row or null
 */
async function findById(id) {
  const result = await query(
    `SELECT * FROM categories WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Update a category's fields.
 * @param {string} id - Category ID
 * @param {object} fields - Fields to update (name, icon, color)
 * @returns {Promise<object|null>} The updated category row or null
 */
async function update(id, fields) {
  const allowedFields = ['name', 'icon', 'color'];
  const setClauses = [];
  const values = [];
  let paramIndex = 1;

  for (const field of allowedFields) {
    if (fields[field] !== undefined) {
      setClauses.push(`${field} = $${paramIndex}`);
      values.push(fields[field]);
      paramIndex++;
    }
  }

  if (setClauses.length === 0) {
    return findById(id);
  }

  values.push(id);
  const result = await query(
    `UPDATE categories SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

/**
 * Delete a category by its ID.
 * @param {string} id - Category ID
 * @returns {Promise<boolean>} True if a row was deleted
 */
async function deleteCategory(id) {
  const result = await query(
    `DELETE FROM categories WHERE id = $1`,
    [id]
  );
  return result.rowCount > 0;
}

/**
 * Check if a duplicate category exists for a user (same name and type).
 * @param {string} userId - Owner user ID
 * @param {string} name - Category name
 * @param {string} type - Category type ('income' or 'expense')
 * @returns {Promise<object|null>} The existing category row or null if no duplicate
 */
async function findDuplicate(userId, name, type) {
  const result = await query(
    `SELECT * FROM categories
     WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND type = $3`,
    [userId, name, type]
  );
  return result.rows[0] || null;
}

/**
 * Reassign all transactions from one category to another.
 * Used when deleting a category that has associated transactions.
 * @param {string} categoryId - The category being deleted
 * @param {string} defaultCategoryId - The target category to reassign to
 * @returns {Promise<number>} Number of transactions reassigned
 */
async function reassignTransactions(categoryId, defaultCategoryId) {
  const result = await query(
    `UPDATE transactions SET category_id = $1 WHERE category_id = $2`,
    [defaultCategoryId, categoryId]
  );
  return result.rowCount;
}

module.exports = {
  create,
  findByUserId,
  findById,
  update,
  delete: deleteCategory,
  findDuplicate,
  reassignTransactions,
};
