import React, { createContext, useContext, useState, useCallback } from 'react';
import * as transactionsApi from '../api/transactionsApi';
import { useWallets } from './WalletContext';
import { useBudgets } from './BudgetContext';

const TransactionContext = createContext(null);

export const useTransactions = () => {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransactions must be used within a TransactionProvider');
  }
  return context;
};

const DEFAULT_FILTERS = {
  page: 1,
  limit: 20,
  startDate: null,
  endDate: null,
  categoryId: null,
  type: null,
  search: '',
};

/**
 * Transform camelCase transaction fields to snake_case for the server API.
 * The server expects category_id and wallet_id (snake_case),
 * while the client form uses categoryId and walletId (camelCase).
 */
function toApiPayload(data) {
  const payload = {};
  if (data.amount !== undefined) payload.amount = data.amount;
  if (data.type !== undefined) payload.type = data.type;
  if (data.categoryId !== undefined) payload.category_id = data.categoryId;
  if (data.walletId !== undefined) payload.wallet_id = data.walletId;
  if (data.date !== undefined) payload.date = data.date;
  if (data.description !== undefined) payload.description = data.description;
  // Also pass through any fields already in snake_case
  if (data.category_id !== undefined) payload.category_id = data.category_id;
  if (data.wallet_id !== undefined) payload.wallet_id = data.wallet_id;
  return payload;
}

export function TransactionProvider({ children }) {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Access wallet and budget contexts for refreshing after mutations
  const { fetchWallets } = useWallets();
  const { fetchBudgets } = useBudgets();

  const fetchTransactions = useCallback(async (customFilters) => {
    setLoading(true);
    setError(null);
    try {
      const activeFilters = customFilters || filters;
      // Build query params, excluding null/empty values
      const params = {};
      if (activeFilters.page) params.page = activeFilters.page;
      if (activeFilters.limit) params.limit = activeFilters.limit;
      if (activeFilters.startDate) params.startDate = activeFilters.startDate;
      if (activeFilters.endDate) params.endDate = activeFilters.endDate;
      if (activeFilters.categoryId) params.categoryId = activeFilters.categoryId;
      if (activeFilters.type) params.type = activeFilters.type;
      if (activeFilters.search) params.search = activeFilters.search;

      const response = await transactionsApi.list(params);
      const data = response.data?.transactions || response.data || [];
      const totalCount = response.data?.total || data.length;

      setTransactions(data);
      setTotal(totalCount);
      return { transactions: data, total: totalCount };
    } catch (err) {
      const message =
        err.response?.data?.error?.message || 'Failed to fetch transactions.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const createTransaction = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const payload = toApiPayload(data);
      const response = await transactionsApi.create(payload);
      const newTransaction = response.data?.transaction || response.data;
      setTransactions((prev) => [newTransaction, ...prev]);
      setTotal((prev) => prev + 1);

      // Refresh wallet balances since creating a transaction changes balances
      fetchWallets().catch(() => {});
      // Refresh budgets if this is an expense (budget tracking may have changed)
      if (data.type === 'expense') {
        fetchBudgets().catch(() => {});
      }

      return newTransaction;
    } catch (err) {
      const message =
        err.response?.data?.error?.message || 'Failed to create transaction.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchWallets, fetchBudgets]);

  const updateTransaction = useCallback(async (id, data) => {
    setLoading(true);
    setError(null);
    try {
      const payload = toApiPayload(data);
      const response = await transactionsApi.update(id, payload);
      const updated = response.data?.transaction || response.data;
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updated } : t))
      );

      // Refresh wallet balances since updating amount/type/wallet affects balances
      fetchWallets().catch(() => {});
      // Refresh budgets (category or amount may have changed)
      fetchBudgets().catch(() => {});

      return updated;
    } catch (err) {
      const message =
        err.response?.data?.error?.message || 'Failed to update transaction.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchWallets, fetchBudgets]);

  const deleteTransaction = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      await transactionsApi.remove(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      setTotal((prev) => prev - 1);

      // Refresh wallet balances since deletion reverses the balance change
      fetchWallets().catch(() => {});
      // Refresh budgets since deletion reverses budget tracking
      fetchBudgets().catch(() => {});
    } catch (err) {
      const message =
        err.response?.data?.error?.message || 'Failed to delete transaction.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchWallets, fetchBudgets]);

  const updateFilters = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = {
    transactions,
    total,
    filters,
    loading,
    error,
    fetchTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    updateFilters,
    resetFilters,
    clearError,
  };

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
}

export default TransactionContext;
