'use strict';

const categoryRepository = require('../repositories/category.repository');
const { DuplicateError, AuthorizationError, NotFoundError, ValidationError } = require('../utils/errors');

const VALID_TYPES = ['income', 'expense'];

/**
 * Create a new category for the user.
 * Checks for duplicate (same name + type) before creating.
 * @param {string} userId
 * @param {object} data - { name, type, icon, color }
 * @returns {Promise<object>} The created category
 */
async function create(userId, { name, type, icon, color }) {
  if (!VALID_TYPES.includes(type)) {
    throw new ValidationError('Invalid category type', [
      { field: 'type', message: 'Type must be "income" or "expense"' }
    ]);
  }

  const existing = await categoryRepository.findDuplicate(userId, name, type);
  if (existing) {
    throw new DuplicateError(`Category "${name}" of type "${type}" already exists`);
  }

  const category = await categoryRepository.create(userId, name, type, icon, color);
  return category;
}

/**
 * List all categories for the user, grouped by type.
 * @param {string} userId
 * @returns {Promise<object>} { income: [...], expense: [...] }
 */
async function list(userId) {
  const categories = await categoryRepository.findByUserId(userId);

  const grouped = {
    income: [],
    expense: [],
  };

  for (const category of categories) {
    if (grouped[category.type]) {
      grouped[category.type].push(category);
    }
  }

  return grouped;
}

/**
 * Update a category's name, icon, or color.
 * Verifies ownership before applying changes.
 * @param {string} userId
 * @param {string} categoryId
 * @param {object} fields - { name, icon, color }
 * @returns {Promise<object>} The updated category
 */
async function update(userId, categoryId, { name, icon, color }) {
  const category = await categoryRepository.findById(categoryId);
  if (!category) {
    throw new NotFoundError('Category not found');
  }

  if (category.user_id !== userId) {
    throw new AuthorizationError('You do not have permission to update this category');
  }

  // If updating name, check for duplicate with same type
  if (name && name !== category.name) {
    const duplicate = await categoryRepository.findDuplicate(userId, name, category.type);
    if (duplicate && duplicate.id !== categoryId) {
      throw new DuplicateError(`Category "${name}" of type "${category.type}" already exists`);
    }
  }

  const fields = {};
  if (name !== undefined) fields.name = name;
  if (icon !== undefined) fields.icon = icon;
  if (color !== undefined) fields.color = color;

  const updated = await categoryRepository.update(categoryId, fields);
  return updated;
}

/**
 * Delete a category.
 * Verifies ownership, reassigns transactions to an "Uncategorized" category
 * of the same type, then deletes the original.
 * @param {string} userId
 * @param {string} categoryId
 * @returns {Promise<void>}
 */
async function deleteCategory(userId, categoryId) {
  const category = await categoryRepository.findById(categoryId);
  if (!category) {
    throw new NotFoundError('Category not found');
  }

  if (category.user_id !== userId) {
    throw new AuthorizationError('You do not have permission to delete this category');
  }

  // Find or create an "Uncategorized" category of the same type for this user
  let uncategorized = await categoryRepository.findDuplicate(userId, 'Uncategorized', category.type);
  if (!uncategorized) {
    uncategorized = await categoryRepository.create(userId, 'Uncategorized', category.type, null, null);
  }

  // Reassign all transactions from the deleted category to "Uncategorized"
  await categoryRepository.reassignTransactions(categoryId, uncategorized.id);

  // Delete the original category
  await categoryRepository.delete(categoryId);
}

module.exports = {
  create,
  list,
  update,
  delete: deleteCategory,
};
