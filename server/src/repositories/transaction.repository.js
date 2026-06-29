'use strict';

const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

/**
 * Create a new transaction record.
 * @param {object} fields - Transaction fields
 * @param {string} fields.userId - Owner user ID
 * @param {string} fields.walletId - Associated wallet ID
 * @param {string} fields.categoryId - Associated category ID
 * @param {string} fields.type - Transaction type ('income' or 'expense')
 * @param {number|string} fields.amount - Transaction amount
 * @param {string} [fields.description] - Optional description
 * @param {string|Date} fields.date - Transaction date
 * @returns {Promise<object>} The created transaction row
 */
async function create(fields) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const result = await query(
    `INSERT INTO transactions (id, user_id, wallet_id, category_id, type, amount, description, date, receipt_image, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
     RETURNING *`,
    [
      id,
      fields.userId,
      fields.walletId,
      fields.categoryId,
      fields.type,
      fields.amount,
      fields.description || null,
      fields.date,
      fields.receiptImage || null,
      now,
    ]
  );
  return result.rows[0];
}

/**
 * Find a transaction by its ID.
 * @param {string} id - Transaction ID
 * @returns {Promise<object|null>} The transaction row or null
 */
async function findById(id) {
  const result = await query(
    `SELECT * FROM transactions WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Find transactions belonging to a user with optional filters and pagination.
 * @param {string} userId - Owner user ID
 * @param {object} [filters={}] - Filter criteria
 * @param {string} [filters.startDate] - Start of date range (inclusive)
 * @param {string} [filters.endDate] - End of date range (inclusive)
 * @param {string} [filters.categoryId] - Filter by category ID
 * @param {string} [filters.type] - Filter by type ('income' or 'expense')
 * @param {string} [filters.search] - Case-insensitive search on description
 * @param {object} [pagination={}] - Pagination options
 * @param {number} [pagination.limit=20] - Number of rows per page
 * @param {number} [pagination.offset=0] - Offset from beginning
 * @returns {Promise<{ rows: object[], total: number }>} Paginated result with total count
 */
async function findByUserId(userId, filters = {}, pagination = {}) {
  const { limit = 20, offset = 0 } = pagination;
  const conditions = ['user_id = $1'];
  const params = [userId];
  let paramIndex = 2;

  if (filters.startDate) {
    conditions.push(`date >= $${paramIndex}`);
    params.push(filters.startDate);
    paramIndex++;
  }

  if (filters.endDate) {
    conditions.push(`date <= $${paramIndex}`);
    params.push(filters.endDate);
    paramIndex++;
  }

  if (filters.categoryId) {
    conditions.push(`category_id = $${paramIndex}`);
    params.push(filters.categoryId);
    paramIndex++;
  }

  if (filters.type) {
    conditions.push(`type = $${paramIndex}`);
    params.push(filters.type);
    paramIndex++;
  }

  if (filters.search) {
    conditions.push(`description ILIKE $${paramIndex}`);
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');

  // Get total count for pagination metadata
  const countResult = await query(
    `SELECT COUNT(*) AS total FROM transactions WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total, 10);

  // Get paginated rows ordered by date DESC
  const dataParams = [...params, limit, offset];
  const dataResult = await query(
    `SELECT * FROM transactions
     WHERE ${whereClause}
     ORDER BY date DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    dataParams
  );

  return { rows: dataResult.rows, total };
}

/**
 * Update a transaction by its ID.
 * @param {string} id - Transaction ID
 * @param {object} fields - Fields to update (any of: walletId, categoryId, type, amount, description, date)
 * @returns {Promise<object|null>} The updated transaction row or null
 */
async function update(id, fields) {
  const setClauses = [];
  const params = [];
  let paramIndex = 1;

  const fieldMap = {
    walletId: 'wallet_id',
    categoryId: 'category_id',
    type: 'type',
    amount: 'amount',
    description: 'description',
    date: 'date',
    receiptImage: 'receipt_image',
  };

  for (const [jsKey, dbColumn] of Object.entries(fieldMap)) {
    if (fields[jsKey] !== undefined) {
      setClauses.push(`${dbColumn} = $${paramIndex}`);
      params.push(fields[jsKey]);
      paramIndex++;
    }
  }

  // Always update updated_at
  setClauses.push(`updated_at = $${paramIndex}`);
  params.push(new Date().toISOString());
  paramIndex++;

  // Add the ID as the last parameter
  params.push(id);

  const result = await query(
    `UPDATE transactions SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  );
  return result.rows[0] || null;
}

/**
 * Delete a transaction by its ID.
 * @param {string} id - Transaction ID
 * @returns {Promise<boolean>} True if a row was deleted
 */
async function deleteTransaction(id) {
  const result = await query(
    `DELETE FROM transactions WHERE id = $1`,
    [id]
  );
  return result.rowCount > 0;
}

module.exports = {
  create,
  findById,
  findByUserId,
  update,
  delete: deleteTransaction,
};
