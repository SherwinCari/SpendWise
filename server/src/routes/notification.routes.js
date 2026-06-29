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

/**
 * POST /api/notifications/monthly-summary
 * Generate a detailed monthly summary notification (Feature #24).
 * Includes income, expenses, net balance, and top spending categories.
 */
router.post('/monthly-summary', authenticate, async (req, res, next) => {
  try {
    const analyticsService = require('../services/analytics.service');
    const { query } = require('../config/database');
    const { v4: uuidv4 } = require('uuid');

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Get monthly totals
    const summary = await analyticsService.getMonthlySummary(req.userId, year, month);
    const totalIncome = parseFloat(summary.totalIncome || 0);
    const totalExpenses = parseFloat(summary.totalExpenses || 0);
    const net = totalIncome - totalExpenses;

    // Get top 3 spending categories for the month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    const breakdown = await analyticsService.getCategoryBreakdown(req.userId, startDate, endDate);
    const topCategories = breakdown.slice(0, 3);

    const monthName = now.toLocaleString('default', { month: 'long' });
    let message = `📊 ${monthName} ${year} Summary:\n` +
      `💰 Income: ₱${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n` +
      `💸 Expenses: ₱${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n` +
      `${net >= 0 ? '📈' : '📉'} Net: ${net >= 0 ? '+' : ''}₱${net.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    if (topCategories.length > 0) {
      message += '\n\n🏷️ Top Spending:';
      topCategories.forEach((cat, i) => {
        message += `\n${i + 1}. ${cat.categoryName}: ₱${parseFloat(cat.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      });
    }

    // Create an in-app notification
    const id = uuidv4();
    await query(
      `INSERT INTO notifications (id, user_id, type, title, message, is_read)
       VALUES ($1, $2, 'monthly_summary', $3, $4, false)`,
      [id, req.userId, `${monthName} ${year} Monthly Report`, message]
    );

    res.json({ success: true, data: { id, message } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
