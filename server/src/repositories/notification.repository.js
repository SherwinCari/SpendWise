'use strict';

const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

/**
 * Create a new notification for a user.
 * @param {string} userId - The user who will receive the notification
 * @param {string} title - Notification title
 * @param {string} message - Notification message body
 * @param {string} type - Notification type (e.g., 'budget_warning', 'budget_caution', 'budget_critical')
 * @returns {Promise<object>} The created notification row
 */
async function create(userId, title, message, type) {
  const id = uuidv4();
  const result = await query(
    `INSERT INTO notifications (id, user_id, title, message, type)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [id, userId, title, message, type]
  );
  return result.rows[0];
}

/**
 * Find all notifications belonging to a user, ordered by created_at DESC.
 * @param {string} userId - The user's ID
 * @returns {Promise<object[]>} Array of notification rows sorted by newest first
 */
async function findByUserId(userId) {
  const result = await query(
    `SELECT * FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Mark a notification as read by setting is_read to true.
 * @param {string} id - Notification ID
 * @returns {Promise<object|null>} The updated notification row or null if not found
 */
async function markAsRead(id) {
  const result = await query(
    `UPDATE notifications SET is_read = TRUE
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Find an existing threshold notification for a specific budget to ensure idempotence.
 * Checks if a notification of the given type already exists for the user where
 * the message references the specific budget ID.
 * @param {string} userId - The user's ID
 * @param {string} budgetId - The budget ID to check against (referenced in message)
 * @param {string} type - Notification type (e.g., 'budget_warning', 'budget_caution', 'budget_critical')
 * @returns {Promise<object|null>} The existing notification row or null if none found
 */
async function findExistingThreshold(userId, budgetId, type) {
  const result = await query(
    `SELECT * FROM notifications
     WHERE user_id = $1
       AND type = $2
       AND message LIKE '%' || $3 || '%'
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, type, budgetId]
  );
  return result.rows[0] || null;
}

module.exports = {
  create,
  findByUserId,
  markAsRead,
  findExistingThreshold,
};
