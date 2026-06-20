import React, { createContext, useContext, useState, useCallback } from 'react';
import * as categoriesApi from '../api/categoriesApi';

const CategoryContext = createContext(null);

export const useCategories = () => {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error('useCategories must be used within a CategoryProvider');
  }
  return context;
};

export function CategoryProvider({ children }) {
  const [categories, setCategories] = useState({ income: [], expense: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await categoriesApi.list();
      const data = response.data?.categories || response.data || [];

      // Group categories by type
      const grouped = { income: [], expense: [] };
      if (Array.isArray(data)) {
        data.forEach((cat) => {
          if (cat.type === 'income') {
            grouped.income.push(cat);
          } else if (cat.type === 'expense') {
            grouped.expense.push(cat);
          }
        });
      } else if (data.income || data.expense) {
        // API already returns grouped data
        grouped.income = data.income || [];
        grouped.expense = data.expense || [];
      }

      setCategories(grouped);
      return grouped;
    } catch (err) {
      const message =
        err.response?.data?.error?.message || 'Failed to fetch categories.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createCategory = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await categoriesApi.create(data);
      const newCategory = response.data?.category || response.data;
      setCategories((prev) => ({
        ...prev,
        [newCategory.type]: [...(prev[newCategory.type] || []), newCategory],
      }));
      return newCategory;
    } catch (err) {
      const message =
        err.response?.data?.error?.message || 'Failed to create category.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCategory = useCallback(async (id, data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await categoriesApi.update(id, data);
      const updated = response.data?.category || response.data;
      setCategories((prev) => {
        const result = { ...prev };
        // Update in the correct type group
        Object.keys(result).forEach((type) => {
          result[type] = result[type].map((c) =>
            c.id === id ? { ...c, ...updated } : c
          );
        });
        return result;
      });
      return updated;
    } catch (err) {
      const message =
        err.response?.data?.error?.message || 'Failed to update category.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteCategory = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      await categoriesApi.remove(id);
      setCategories((prev) => {
        const result = { ...prev };
        Object.keys(result).forEach((type) => {
          result[type] = result[type].filter((c) => c.id !== id);
        });
        return result;
      });
    } catch (err) {
      const message =
        err.response?.data?.error?.message || 'Failed to delete category.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Convenience getter: flat list of all categories
  const allCategories = [...categories.income, ...categories.expense];

  const value = {
    categories,
    allCategories,
    loading,
    error,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    clearError,
  };

  return (
    <CategoryContext.Provider value={value}>
      {children}
    </CategoryContext.Provider>
  );
}

export default CategoryContext;
