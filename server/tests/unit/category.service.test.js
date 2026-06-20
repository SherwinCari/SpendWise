'use strict';

jest.mock('../../src/repositories/category.repository', () => ({
  create: jest.fn(),
  findByUserId: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findDuplicate: jest.fn(),
  reassignTransactions: jest.fn(),
}));

const categoryRepository = require('../../src/repositories/category.repository');
const categoryService = require('../../src/services/category.service');
const { DuplicateError, AuthorizationError, NotFoundError, ValidationError } = require('../../src/utils/errors');

describe('Category Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a category when no duplicate exists', async () => {
      const mockCategory = { id: 'cat-1', user_id: 'user-1', name: 'Food', type: 'expense', icon: '🍔', color: '#FF0000' };
      categoryRepository.findDuplicate.mockResolvedValue(null);
      categoryRepository.create.mockResolvedValue(mockCategory);

      const result = await categoryService.create('user-1', { name: 'Food', type: 'expense', icon: '🍔', color: '#FF0000' });

      expect(categoryRepository.findDuplicate).toHaveBeenCalledWith('user-1', 'Food', 'expense');
      expect(categoryRepository.create).toHaveBeenCalledWith('user-1', 'Food', 'expense', '🍔', '#FF0000');
      expect(result).toEqual(mockCategory);
    });

    it('should throw DuplicateError when category with same name+type exists', async () => {
      categoryRepository.findDuplicate.mockResolvedValue({ id: 'existing-cat', name: 'Food', type: 'expense' });

      await expect(
        categoryService.create('user-1', { name: 'Food', type: 'expense', icon: null, color: null })
      ).rejects.toThrow(DuplicateError);

      expect(categoryRepository.create).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for invalid type', async () => {
      await expect(
        categoryService.create('user-1', { name: 'Food', type: 'invalid', icon: null, color: null })
      ).rejects.toThrow(ValidationError);

      expect(categoryRepository.findDuplicate).not.toHaveBeenCalled();
      expect(categoryRepository.create).not.toHaveBeenCalled();
    });

    it('should accept "income" as a valid type', async () => {
      categoryRepository.findDuplicate.mockResolvedValue(null);
      categoryRepository.create.mockResolvedValue({ id: 'cat-2', name: 'Salary', type: 'income' });

      const result = await categoryService.create('user-1', { name: 'Salary', type: 'income', icon: null, color: null });

      expect(result.type).toBe('income');
    });
  });

  describe('list', () => {
    it('should return categories grouped by type', async () => {
      const categories = [
        { id: 'cat-1', user_id: 'user-1', name: 'Food', type: 'expense' },
        { id: 'cat-2', user_id: 'user-1', name: 'Transport', type: 'expense' },
        { id: 'cat-3', user_id: 'user-1', name: 'Salary', type: 'income' },
      ];
      categoryRepository.findByUserId.mockResolvedValue(categories);

      const result = await categoryService.list('user-1');

      expect(result).toEqual({
        income: [{ id: 'cat-3', user_id: 'user-1', name: 'Salary', type: 'income' }],
        expense: [
          { id: 'cat-1', user_id: 'user-1', name: 'Food', type: 'expense' },
          { id: 'cat-2', user_id: 'user-1', name: 'Transport', type: 'expense' },
        ],
      });
    });

    it('should return empty arrays when user has no categories', async () => {
      categoryRepository.findByUserId.mockResolvedValue([]);

      const result = await categoryService.list('user-1');

      expect(result).toEqual({ income: [], expense: [] });
    });
  });

  describe('update', () => {
    it('should update category fields with ownership check', async () => {
      const mockCategory = { id: 'cat-1', user_id: 'user-1', name: 'Food', type: 'expense', icon: '🍔', color: '#FF0000' };
      const updatedCategory = { ...mockCategory, name: 'Groceries', icon: '🛒' };
      categoryRepository.findById.mockResolvedValue(mockCategory);
      categoryRepository.findDuplicate.mockResolvedValue(null);
      categoryRepository.update.mockResolvedValue(updatedCategory);

      const result = await categoryService.update('user-1', 'cat-1', { name: 'Groceries', icon: '🛒', color: undefined });

      expect(categoryRepository.update).toHaveBeenCalledWith('cat-1', { name: 'Groceries', icon: '🛒' });
      expect(result).toEqual(updatedCategory);
    });

    it('should throw NotFoundError if category does not exist', async () => {
      categoryRepository.findById.mockResolvedValue(null);

      await expect(
        categoryService.update('user-1', 'nonexistent', { name: 'New Name' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw AuthorizationError if user does not own the category', async () => {
      categoryRepository.findById.mockResolvedValue({ id: 'cat-1', user_id: 'other-user', name: 'Food', type: 'expense' });

      await expect(
        categoryService.update('user-1', 'cat-1', { name: 'New Name' })
      ).rejects.toThrow(AuthorizationError);
    });

    it('should throw DuplicateError when updating name to an existing name+type combo', async () => {
      const mockCategory = { id: 'cat-1', user_id: 'user-1', name: 'Food', type: 'expense' };
      categoryRepository.findById.mockResolvedValue(mockCategory);
      categoryRepository.findDuplicate.mockResolvedValue({ id: 'cat-2', name: 'Groceries', type: 'expense' });

      await expect(
        categoryService.update('user-1', 'cat-1', { name: 'Groceries' })
      ).rejects.toThrow(DuplicateError);

      expect(categoryRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should reassign transactions to Uncategorized and delete category', async () => {
      const mockCategory = { id: 'cat-1', user_id: 'user-1', name: 'Food', type: 'expense' };
      const uncategorized = { id: 'uncat-1', user_id: 'user-1', name: 'Uncategorized', type: 'expense' };
      categoryRepository.findById.mockResolvedValue(mockCategory);
      categoryRepository.findDuplicate.mockResolvedValue(uncategorized);
      categoryRepository.reassignTransactions.mockResolvedValue(3);
      categoryRepository.delete.mockResolvedValue(true);

      await categoryService.delete('user-1', 'cat-1');

      expect(categoryRepository.findDuplicate).toHaveBeenCalledWith('user-1', 'Uncategorized', 'expense');
      expect(categoryRepository.reassignTransactions).toHaveBeenCalledWith('cat-1', 'uncat-1');
      expect(categoryRepository.delete).toHaveBeenCalledWith('cat-1');
    });

    it('should create Uncategorized category if it does not exist', async () => {
      const mockCategory = { id: 'cat-1', user_id: 'user-1', name: 'Food', type: 'expense' };
      const newUncategorized = { id: 'new-uncat', user_id: 'user-1', name: 'Uncategorized', type: 'expense' };
      categoryRepository.findById.mockResolvedValue(mockCategory);
      categoryRepository.findDuplicate.mockResolvedValue(null);
      categoryRepository.create.mockResolvedValue(newUncategorized);
      categoryRepository.reassignTransactions.mockResolvedValue(2);
      categoryRepository.delete.mockResolvedValue(true);

      await categoryService.delete('user-1', 'cat-1');

      expect(categoryRepository.create).toHaveBeenCalledWith('user-1', 'Uncategorized', 'expense', null, null);
      expect(categoryRepository.reassignTransactions).toHaveBeenCalledWith('cat-1', 'new-uncat');
      expect(categoryRepository.delete).toHaveBeenCalledWith('cat-1');
    });

    it('should throw NotFoundError if category does not exist', async () => {
      categoryRepository.findById.mockResolvedValue(null);

      await expect(
        categoryService.delete('user-1', 'nonexistent')
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw AuthorizationError if user does not own the category', async () => {
      categoryRepository.findById.mockResolvedValue({ id: 'cat-1', user_id: 'other-user', name: 'Food', type: 'expense' });

      await expect(
        categoryService.delete('user-1', 'cat-1')
      ).rejects.toThrow(AuthorizationError);

      expect(categoryRepository.reassignTransactions).not.toHaveBeenCalled();
      expect(categoryRepository.delete).not.toHaveBeenCalled();
    });
  });
});
