'use strict';

const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const recurringService = require('../services/recurring.service');

const router = Router();

/**
 * POST /api/recurring
 * Create a new recurring transaction.
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { amount, type, category_id, wallet_id, description, frequency, start_date, end_date } = req.body;

    if (!amount || !type || !wallet_id || !frequency || !start_date) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'amount, type, wallet_id, frequency, and start_date are required' },
      });
    }

    const result = await recurringService.create(req.userId, {
      amount,
      type,
      categoryId: category_id,
      walletId: wallet_id,
      description,
      frequency,
      startDate: start_date,
      endDate: end_date,
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/recurring
 * List all recurring transactions for the authenticated user.
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const items = await recurringService.list(req.userId);
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/recurring/:id
 * Get a single recurring transaction.
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const item = await recurringService.getById(req.userId, req.params.id);
    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/recurring/:id
 * Update a recurring transaction.
 */
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const data = {};
    const fields = ['amount', 'type', 'description', 'frequency', 'is_active'];
    const fieldMap = { category_id: 'categoryId', wallet_id: 'walletId', start_date: 'startDate', end_date: 'endDate', next_due_date: 'nextDueDate', is_active: 'isActive' };

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        // Map snake_case to camelCase
        const camelKey = field.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
        data[camelKey] = req.body[field];
      }
    }
    for (const [snake, camel] of Object.entries(fieldMap)) {
      if (req.body[snake] !== undefined) {
        data[camel] = req.body[snake];
      }
    }

    const result = await recurringService.update(req.userId, req.params.id, data);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/recurring/:id
 * Delete a recurring transaction.
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await recurringService.remove(req.userId, req.params.id);
    res.json({ success: true, message: result.message });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/recurring/execute
 * Execute all due recurring transactions (create actual transactions).
 */
router.post('/execute', authenticate, async (req, res, next) => {
  try {
    const result = await recurringService.executeDue(req.userId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
