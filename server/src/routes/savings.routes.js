'use strict';

const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const savingsService = require('../services/savings.service');

const router = Router();

/**
 * POST /api/savings
 * Create a new savings goal.
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { name, target_amount, deadline } = req.body;

    if (!name || !target_amount) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'name and target_amount are required' },
      });
    }

    const result = await savingsService.create(req.userId, {
      name,
      targetAmount: target_amount,
      deadline,
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/savings
 * List all savings goals.
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const items = await savingsService.list(req.userId);
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/savings/:id
 * Get a single savings goal.
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const item = await savingsService.getById(req.userId, req.params.id);
    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/savings/:id
 * Update a savings goal.
 */
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const data = {};
    if (req.body.name !== undefined) data.name = req.body.name;
    if (req.body.target_amount !== undefined) data.targetAmount = req.body.target_amount;
    if (req.body.deadline !== undefined) data.deadline = req.body.deadline;

    const result = await savingsService.update(req.userId, req.params.id, data);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/savings/:id
 * Delete a savings goal.
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await savingsService.remove(req.userId, req.params.id);
    res.json({ success: true, message: result.message });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/savings/:id/deposit
 * Deposit money into a savings goal.
 */
router.post('/:id/deposit', authenticate, async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (!amount) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'amount is required' },
      });
    }

    const result = await savingsService.deposit(req.userId, req.params.id, parseFloat(amount));
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/savings/:id/withdraw
 * Withdraw money from a savings goal.
 */
router.post('/:id/withdraw', authenticate, async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (!amount) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'amount is required' },
      });
    }

    const result = await savingsService.withdraw(req.userId, req.params.id, parseFloat(amount));
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
