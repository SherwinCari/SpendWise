import React, { createContext, useContext, useState, useCallback } from 'react';
import * as budgetsApi from '../api/budgetsApi';

const BudgetContext = createContext(null);

export const useBudgets = () => {
  const context = useContext(BudgetContext);
  if (!context) {
    throw new Error('useBudgets must be used within a BudgetProvider');
  }
  return context;
};

export function BudgetProvider({ children }) {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await budgetsApi.list();
      const data = response.data?.data || response.data?.budgets || response.data || [];
      setBudgets(Array.isArray(data) ? data : []);
      return data;
    } catch (err) {
      const message =
        err.response?.data?.error?.message || 'Failed to fetch budgets.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createBudget = useCallback(async (budgetData) => {
    setLoading(true);
    setError(null);
    try {
      // Server expects snake_case field names
      const payload = {
        category_id: budgetData.categoryId || budgetData.category_id,
        amount_limit: budgetData.amountLimit || budgetData.amount_limit,
        period: budgetData.period,
        start_date: budgetData.startDate || budgetData.start_date,
      };
      const response = await budgetsApi.create(payload);
      const newBudget = response.data?.data || response.data?.budget || response.data;
      setBudgets((prev) => [...prev, newBudget]);
      return newBudget;
    } catch (err) {
      const message =
        err.response?.data?.error?.message || 'Failed to create budget.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateBudget = useCallback(async (id, data) => {
    setLoading(true);
    setError(null);
    try {
      // Server expects snake_case field names
      const payload = {
        amount_limit: data.amountLimit || data.amount_limit,
      };
      const response = await budgetsApi.update(id, payload);
      const updated = response.data?.data || response.data?.budget || response.data;
      setBudgets((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...updated } : b))
      );
      return updated;
    } catch (err) {
      const message =
        err.response?.data?.error?.message || 'Failed to update budget.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteBudget = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      await budgetsApi.remove(id);
      setBudgets((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      const message =
        err.response?.data?.error?.message || 'Failed to delete budget.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = {
    budgets,
    loading,
    error,
    fetchBudgets,
    createBudget,
    updateBudget,
    deleteBudget,
    clearError,
  };

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export default BudgetContext;
