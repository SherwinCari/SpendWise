'use strict';

const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const remindersService = require('../services/reminders.service');

const router = Router();

/**
 * POST /api/reminders
 * Create a new bill reminder.
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { title, amount, due_date, recurrence } = req.body;

    if (!title || !due_date) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'title and due_date are required' },
      });
    }

    const result = await remindersService.create(req.userId, {
      title,
      amount,
      dueDate: due_date,
      recurrence,
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reminders
 * List all reminders for the authenticated user.
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const items = await remindersService.list(req.userId);
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reminders/:id
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const item = await remindersService.getById(req.userId, req.params.id);
    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/reminders/:id
 * Update a reminder.
 */
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const data = {};
    if (req.body.title !== undefined) data.title = req.body.title;
    if (req.body.amount !== undefined) data.amount = req.body.amount;
    if (req.body.due_date !== undefined) data.dueDate = req.body.due_date;
    if (req.body.recurrence !== undefined) data.recurrence = req.body.recurrence;
    if (req.body.is_paid !== undefined) data.isPaid = req.body.is_paid;

    const result = await remindersService.update(req.userId, req.params.id, data);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/reminders/:id/paid
 * Mark a reminder as paid.
 */
router.put('/:id/paid', authenticate, async (req, res, next) => {
  try {
    const result = await remindersService.markPaid(req.userId, req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/reminders/:id
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await remindersService.remove(req.userId, req.params.id);
    res.json({ success: true, message: result.message });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
