'use strict';

const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  createTransactionSchema,
  updateTransactionSchema,
} = require('../validators/transaction.validator');
const transactionService = require('../services/transaction.service');

const router = Router();

/**
 * POST /api/transactions
 * Create a new transaction.
 * Requires authentication and body validation.
 */
router.post('/', authenticate, validate(createTransactionSchema), async (req, res, next) => {
  try {
    const { amount, type, category_id, wallet_id, date, description } = req.body;

    const transaction = await transactionService.create(req.userId, {
      amount,
      type,
      categoryId: category_id,
      walletId: wallet_id,
      date,
      description,
    });

    res.status(201).json({
      success: true,
      transaction,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/transactions
 * List transactions with optional filters and pagination.
 * Query params: page, limit, startDate, endDate, categoryId, type, search
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page, limit, startDate, endDate, categoryId, type, search } = req.query;

    const result = await transactionService.list(req.userId, {
      page,
      limit,
      startDate,
      endDate,
      categoryId,
      type,
      search,
    });

    res.json({
      success: true,
      transactions: result.transactions,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/transactions/:id
 * Get a single transaction by ID.
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const transaction = await transactionService.getById(req.userId, req.params.id);

    res.json({
      success: true,
      transaction,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/transactions/:id
 * Update an existing transaction.
 * Requires authentication and body validation.
 */
router.put('/:id', authenticate, validate(updateTransactionSchema), async (req, res, next) => {
  try {
    const { amount, type, category_id, wallet_id, date, description } = req.body;

    const updates = {};
    if (amount !== undefined) updates.amount = amount;
    if (type !== undefined) updates.type = type;
    if (category_id !== undefined) updates.categoryId = category_id;
    if (wallet_id !== undefined) updates.walletId = wallet_id;
    if (date !== undefined) updates.date = date;
    if (description !== undefined) updates.description = description;

    const transaction = await transactionService.update(req.userId, req.params.id, updates);

    res.json({
      success: true,
      transaction,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/transactions/:id
 * Delete a transaction.
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await transactionService.delete(req.userId, req.params.id);

    res.json({
      success: true,
      message: 'Transaction deleted successfully',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
