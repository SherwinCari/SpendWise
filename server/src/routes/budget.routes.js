'use strict';

const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createBudgetSchema } = require('../validators/budget.validator');
const budgetService = require('../services/budget.service');
const Joi = require('joi');

const router = Router();

// Validation schema for updating a budget (only amount_limit)
const updateBudgetSchema = Joi.object({
  amount_limit: Joi.number().greater(0).required().messages({
    'number.greater': 'Amount limit must be greater than zero',
    'number.base': 'Amount limit must be a number',
    'any.required': 'Amount limit is required',
  }),
});

/**
 * POST /api/budgets
 * Create a new budget for the authenticated user.
 */
router.post('/', authenticate, validate(createBudgetSchema), async (req, res, next) => {
  try {
    const { category_id, amount_limit, period, start_date } = req.body;
    const budget = await budgetService.create(req.userId, {
      categoryId: category_id,
      amountLimit: amount_limit,
      period,
      startDate: start_date,
    });
    res.status(201).json({ success: true, data: budget });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/budgets
 * List all budgets for the authenticated user with progress.
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const budgets = await budgetService.list(req.userId);
    res.json({ success: true, data: budgets });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/budgets/:id
 * Update a budget's amount limit.
 */
router.put('/:id', authenticate, validate(updateBudgetSchema), async (req, res, next) => {
  try {
    const { amount_limit } = req.body;
    const budget = await budgetService.update(req.userId, req.params.id, {
      amountLimit: amount_limit,
    });
    res.json({ success: true, data: budget });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/budgets/:id
 * Delete a budget and its associated tracking.
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await budgetService.delete(req.userId, req.params.id);
    res.json({ success: true, message: 'Budget deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
