'use strict';

const walletRepository = require('../repositories/wallet.repository');
const { getClient } = require('../config/database');
const {
  AuthorizationError,
  ConflictError,
  InsufficientFundsError,
  ValidationError,
  NotFoundError,
} = require('../utils/errors');

/**
 * Create a new wallet for the authenticated user.
 * @param {string} userId - The authenticated user's ID
 * @param {object} data - Wallet data
 * @param {string} data.name - Wallet name
 * @param {number|string} data.balance - Initial balance (defaults to 0)
 * @returns {Promise<object>} The created wallet
 */
async function create(userId, { name, balance = 0 }) {
  const wallet = await walletRepository.create(userId, name, balance);
  return wallet;
}

/**
 * List all wallets belonging to the authenticated user.
 * @param {string} userId - The authenticated user's ID
 * @returns {Promise<object[]>} Array of wallet objects with current balances
 */
async function list(userId) {
  const wallets = await walletRepository.findByUserId(userId);
  return wallets;
}

/**
 * Update wallet name with ownership verification.
 * @param {string} userId - The authenticated user's ID
 * @param {string} walletId - The wallet to update
 * @param {object} data - Update data
 * @param {string} data.name - New wallet name
 * @returns {Promise<object>} The updated wallet
 */
async function update(userId, walletId, { name }) {
  const wallet = await walletRepository.findById(walletId);

  if (!wallet) {
    throw new NotFoundError('Wallet not found');
  }

  if (wallet.user_id !== userId) {
    throw new AuthorizationError('You do not have permission to update this wallet');
  }

  const updated = await walletRepository.updateName(walletId, name);
  return updated;
}

/**
 * Delete a wallet with ownership verification.
 * Rejects deletion if wallet has associated transactions or non-zero balance.
 * @param {string} userId - The authenticated user's ID
 * @param {string} walletId - The wallet to delete
 * @returns {Promise<void>}
 */
async function deleteWallet(userId, walletId) {
  const wallet = await walletRepository.findById(walletId);

  if (!wallet) {
    throw new NotFoundError('Wallet not found');
  }

  if (wallet.user_id !== userId) {
    throw new AuthorizationError('You do not have permission to delete this wallet');
  }

  // Check for associated transactions
  const hasTxns = await walletRepository.hasTransactions(walletId);
  if (hasTxns) {
    throw new ConflictError('Cannot delete wallet with associated transactions');
  }

  // Check for non-zero balance
  const balance = parseFloat(wallet.balance);
  if (balance !== 0) {
    throw new ConflictError('Cannot delete wallet with non-zero balance');
  }

  await walletRepository.delete(walletId);
}

/**
 * Transfer funds between two wallets owned by the same user.
 * Validates: same-wallet rejection, amount > 0, sufficient funds.
 * Executes atomically using a database transaction.
 * @param {string} userId - The authenticated user's ID
 * @param {object} data - Transfer data
 * @param {string} data.sourceWalletId - Source wallet ID
 * @param {string} data.destinationWalletId - Destination wallet ID
 * @param {number|string} data.amount - Transfer amount
 * @returns {Promise<object>} Transfer result with updated wallet balances
 */
async function transfer(userId, { sourceWalletId, destinationWalletId, amount }) {
  const transferAmount = parseFloat(amount);

  // Validate amount > 0
  if (transferAmount <= 0) {
    throw new ValidationError('Transfer amount must be greater than zero');
  }

  // Validate source !== destination
  if (sourceWalletId === destinationWalletId) {
    throw new ValidationError('Cannot transfer to the same wallet');
  }

  // Fetch source wallet and verify ownership
  const sourceWallet = await walletRepository.findById(sourceWalletId);
  if (!sourceWallet) {
    throw new NotFoundError('Source wallet not found');
  }
  if (sourceWallet.user_id !== userId) {
    throw new AuthorizationError('You do not have permission to access this wallet');
  }

  // Fetch destination wallet and verify ownership
  const destWallet = await walletRepository.findById(destinationWalletId);
  if (!destWallet) {
    throw new NotFoundError('Destination wallet not found');
  }
  if (destWallet.user_id !== userId) {
    throw new AuthorizationError('You do not have permission to access this wallet');
  }

  // Check sufficient funds
  const sourceBalance = parseFloat(sourceWallet.balance);
  if (transferAmount > sourceBalance) {
    throw new InsufficientFundsError('Insufficient funds in source wallet');
  }

  // Execute atomic transfer using DB transaction
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const newSourceBalance = sourceBalance - transferAmount;
    const newDestBalance = parseFloat(destWallet.balance) + transferAmount;

    await client.query(
      'UPDATE wallets SET balance = $1 WHERE id = $2',
      [newSourceBalance, sourceWalletId]
    );

    await client.query(
      'UPDATE wallets SET balance = $1 WHERE id = $2',
      [newDestBalance, destinationWalletId]
    );

    await client.query('COMMIT');

    return {
      sourceWallet: { id: sourceWalletId, balance: newSourceBalance },
      destinationWallet: { id: destinationWalletId, balance: newDestBalance },
      amount: transferAmount,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Adjust wallet balance for a transaction (internal use).
 * For income: adds amount to balance.
 * For expense: subtracts amount from balance, rejects if result would be negative.
 * @param {string} walletId - The wallet ID to adjust
 * @param {number|string} amount - The transaction amount
 * @param {string} type - Transaction type: 'income' or 'expense'
 * @returns {Promise<object>} The updated wallet
 */
async function adjustBalance(walletId, amount, type) {
  const wallet = await walletRepository.findById(walletId);

  if (!wallet) {
    throw new NotFoundError('Wallet not found');
  }

  const currentBalance = parseFloat(wallet.balance);
  const adjustmentAmount = parseFloat(amount);
  let newBalance;

  if (type === 'income') {
    newBalance = currentBalance + adjustmentAmount;
  } else if (type === 'expense') {
    newBalance = currentBalance - adjustmentAmount;
    if (newBalance < 0) {
      throw new InsufficientFundsError('Insufficient funds: wallet balance cannot be negative');
    }
  } else {
    throw new ValidationError('Invalid transaction type. Must be "income" or "expense"');
  }

  const updated = await walletRepository.updateBalance(walletId, newBalance);
  return updated;
}

module.exports = {
  create,
  list,
  update,
  delete: deleteWallet,
  transfer,
  adjustBalance,
};
