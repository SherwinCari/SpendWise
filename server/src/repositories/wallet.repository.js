'use strict';

const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

/**
 * Create a new wallet for a user.
 * @param {string} userId - Owner user ID
 * @param {string} name - Wallet name
 * @param {number|string} balance - Initial balance (defaults to 0)
 * @returns {Promise<object>} The created wallet row
 */
async function create(userId, name, balance = 0) {
  const id = uuidv4();
  const result = await query(
    `INSERT INTO wallets (id, user_id, name, balance)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [id, userId, name, balance]
  );
  return result.rows[0];
}

/**
 * Find all wallets belonging to a user.
 * @param {string} userId - Owner user ID
 * @returns {Promise<object[]>} Array of wallet rows
 */
async function findByUserId(userId) {
  const result = await query(
    `SELECT * FROM wallets WHERE user_id = $1 ORDER BY created_at ASC`,
    [userId]
  );
  return result.rows;
}

/**
 * Find a wallet by its ID.
 * @param {string} id - Wallet ID
 * @returns {Promise<object|null>} The wallet row or null
 */
async function findById(id) {
  const result = await query(
    `SELECT * FROM wallets WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Update the name of a wallet.
 * @param {string} id - Wallet ID
 * @param {string} name - New wallet name
 * @returns {Promise<object|null>} The updated wallet row or null
 */
async function updateName(id, name) {
  const result = await query(
    `UPDATE wallets SET name = $1 WHERE id = $2 RETURNING *`,
    [name, id]
  );
  return result.rows[0] || null;
}

/**
 * Update the balance of a wallet.
 * @param {string} id - Wallet ID
 * @param {number|string} newBalance - New balance value
 * @returns {Promise<object|null>} The updated wallet row or null
 */
async function updateBalance(id, newBalance) {
  const result = await query(
    `UPDATE wallets SET balance = $1 WHERE id = $2 RETURNING *`,
    [newBalance, id]
  );
  return result.rows[0] || null;
}

/**
 * Delete a wallet by its ID.
 * @param {string} id - Wallet ID
 * @returns {Promise<boolean>} True if a row was deleted
 */
async function deleteWallet(id) {
  const result = await query(
    `DELETE FROM wallets WHERE id = $1`,
    [id]
  );
  return result.rowCount > 0;
}

/**
 * Check whether a wallet has any associated transactions.
 * @param {string} id - Wallet ID
 * @returns {Promise<boolean>} True if the wallet has transactions
 */
async function hasTransactions(id) {
  const result = await query(
    `SELECT EXISTS(SELECT 1 FROM transactions WHERE wallet_id = $1) AS has_transactions`,
    [id]
  );
  return result.rows[0].has_transactions;
}

module.exports = {
  create,
  findByUserId,
  findById,
  updateName,
  updateBalance,
  delete: deleteWallet,
  hasTransactions,
};
