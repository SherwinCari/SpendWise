'use strict';

const notificationRepository = require('../repositories/notification.repository');
const budgetRepository = require('../repositories/budget.repository');
const { NotFoundError, AuthorizationError } = require('../utils/errors');

/**
 * Budget threshold definitions for notifications.
 * Each threshold specifies the percentage, notification type, and title.
 */
const THRESHOLDS = [
  { pct: 50, type: 'budget_warning', title: 'Budget Warning' },
  { pct: 75, type: 'budget_caution', title: 'Budget Caution' },
  { pct: 100, type: 'budget_critical', title: 'Budget Exceeded' },
];

/**
 * Create a new notification for a user.
 * @param {string} userId - The user who will receive the notification
 * @param {object} params - Notification parameters
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message body
 * @param {string} params.type - Notification type
 * @returns {Promise<object>} The created notification
 */
async function create(userId, { title, message, type }) {
  return notificationRepository.create(userId, title, message, type);
}

/**
 * List all notifications for a user, sorted by created_at DESC.
 * @param {string} userId - The user's ID
 * @returns {Promise<object[]>} Array of notifications sorted newest first
 */
async function list(userId) {
  return notificationRepository.findByUserId(userId);
}

/**
 * Mark a notification as read after verifying ownership.
 * @param {string} userId - The requesting user's ID
 * @param {string} notificationId - The notification ID to mark as read
 * @returns {Promise<object>} The updated notification
 * @throws {NotFoundError} If the notification doesn't exist
 * @throws {AuthorizationError} If the notification doesn't belong to the user
 */
async function markAsRead(userId, notificationId) {
  // Fetch all user notifications and check if this one belongs to them
  const notifications = await notificationRepository.findByUserId(userId);
  const notification = notifications.find((n) => n.id === notificationId);

  if (!notification) {
    // Check if the notification exists at all (for a different user) or doesn't exist
    // Since we can't query by ID directly without a dedicated repo method,
    // we treat absence from the user's list as either not found or not owned.
    throw new NotFoundError('Notification not found');
  }

  return notificationRepository.markAsRead(notificationId);
}

/**
 * Check budget thresholds and create notifications for any newly crossed thresholds.
 * Ensures idempotence: the same threshold notification is never sent twice for the same budget.
 *
 * @param {string} userId - The user's ID
 * @param {string} budgetId - The budget ID to check thresholds for
 * @returns {Promise<object[]>} Array of newly created notifications (may be empty)
 */
async function checkBudgetThresholds(userId, budgetId) {
  // 1. Get budget by ID (includes spent from tracking JOIN)
  const budget = await budgetRepository.findById(budgetId);

  if (!budget) {
    throw new NotFoundError('Budget not found');
  }

  // 2. Calculate percentage = (spent / amount_limit) × 100
  const spent = parseFloat(budget.spent) || 0;
  const amountLimit = parseFloat(budget.amount_limit);

  if (amountLimit <= 0) {
    return [];
  }

  const percentage = (spent / amountLimit) * 100;

  // 3. For each threshold where percentage >= pct, check if already sent
  const createdNotifications = [];

  for (const threshold of THRESHOLDS) {
    if (percentage >= threshold.pct) {
      // Check if notification already exists for this threshold + budget
      const existing = await notificationRepository.findExistingThreshold(
        userId,
        budgetId,
        threshold.type
      );

      if (!existing) {
        // Create the notification with budget details in the message
        const message = `Your budget has reached ${threshold.pct}% of the limit. Spent: $${spent.toFixed(2)} / $${amountLimit.toFixed(2)}. Budget ID: ${budgetId}`;

        const notification = await notificationRepository.create(
          userId,
          threshold.title,
          message,
          threshold.type
        );

        createdNotifications.push(notification);
      }
    }
  }

  return createdNotifications;
}

module.exports = {
  create,
  list,
  markAsRead,
  checkBudgetThresholds,
};
