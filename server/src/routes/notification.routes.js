'use strict';

const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const notificationService = require('../services/notification.service');

const router = Router();

/**
 * GET /api/notifications
 * List all notifications for the authenticated user, sorted by created_at DESC.
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const notifications = await notificationService.list(req.userId);
    res.json({ success: true, data: notifications });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark a notification as read for the authenticated user.
 */
router.put('/:id/read', authenticate, async (req, res, next) => {
  try {
    const notification = await notificationService.markAsRead(req.userId, req.params.id);
    res.json({ success: true, data: notification });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
