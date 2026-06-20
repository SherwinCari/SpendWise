'use strict';

const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createCategorySchema, updateCategorySchema } = require('../validators/category.validator');
const categoryService = require('../services/category.service');

const router = Router();

/**
 * POST /api/categories
 * Create a new category for the authenticated user.
 */
router.post('/', authenticate, validate(createCategorySchema), async (req, res, next) => {
  try {
    const { name, type, icon, color } = req.body;
    const category = await categoryService.create(req.userId, { name, type, icon, color });
    res.status(201).json({ success: true, category });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/categories
 * List all categories for the authenticated user, grouped by type.
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const categories = await categoryService.list(req.userId);
    res.status(200).json({ success: true, categories });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/categories/:id
 * Update a category's name, icon, or color.
 */
router.put('/:id', authenticate, validate(updateCategorySchema), async (req, res, next) => {
  try {
    const { name, icon, color } = req.body;
    const category = await categoryService.update(req.userId, req.params.id, { name, icon, color });
    res.status(200).json({ success: true, category });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/categories/:id
 * Delete a category (reassigns linked transactions to "Uncategorized").
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await categoryService.delete(req.userId, req.params.id);
    res.status(200).json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
