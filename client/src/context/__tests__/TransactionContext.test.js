/**
 * Integration test: Transaction CRUD flow end-to-end
 *
 * Verifies:
 * 1. createTransaction → transforms camelCase to snake_case → calls API POST /transactions → refreshes WalletContext + BudgetContext
 * 2. fetchTransactions → passes filter params correctly to GET /transactions with pagination
 * 3. updateTransaction → transforms fields → calls API PUT → refreshes wallets + budgets
 * 4. deleteTransaction → calls API DELETE → refreshes wallets + budgets (balance reversal)
 *
 * Requirements: 4.1, 4.2, 4.3, 5.1, 5.2, 6.1, 6.2, 7.1
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { TransactionProvider, useTransactions } from '../TransactionContext';
import { WalletProvider } from '../WalletContext';
import { BudgetProvider } from '../BudgetContext';

// Mock the API modules
jest.mock('../../api/transactionsApi');
jest.mock('../../api/walletsApi');
jest.mock('../../api/budgetsApi');

const transactionsApi = require('../../api/transactionsApi');
const walletsApi = require('../../api/walletsApi');
const budgetsApi = require('../../api/budgetsApi');

// Wrapper that provides WalletContext + BudgetContext (as in AppProvider)
function Wrapper({ children }) {
  return (
    <WalletProvider>
      <BudgetProvider>
        <TransactionProvider>{children}</TransactionProvider>
      </BudgetProvider>
    </WalletProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();

  // Default mock for fetchWallets (called during wallet refresh)
  walletsApi.list.mockResolvedValue({ data: { wallets: [] } });
  // Default mock for fetchBudgets (called during budget refresh)
  budgetsApi.list.mockResolvedValue({ data: { budgets: [] } });
});

describe('TransactionContext CRUD flow', () => {
  describe('createTransaction', () => {
    it('transforms camelCase fields to snake_case for the API', async () => {
      const mockTransaction = {
        id: 'txn-1',
        user_id: 'user-1',
        wallet_id: 'wallet-1',
        category_id: 'cat-1',
        type: 'expense',
        amount: '150.00',
        description: 'Groceries',
        date: '2024-01-15',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      };

      transactionsApi.create.mockResolvedValue({
        data: { success: true, transaction: mockTransaction },
      });

      const { result } = renderHook(() => useTransactions(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.createTransaction({
          type: 'expense',
          amount: 150,
          categoryId: 'cat-1',
          walletId: 'wallet-1',
          date: '2024-01-15',
          description: 'Groceries',
        });
      });

      // Verify the API was called with snake_case field names
      expect(transactionsApi.create).toHaveBeenCalledWith({
        type: 'expense',
        amount: 150,
        category_id: 'cat-1',
        wallet_id: 'wallet-1',
        date: '2024-01-15',
        description: 'Groceries',
      });
    });

    it('refreshes wallet balances after creating a transaction', async () => {
      transactionsApi.create.mockResolvedValue({
        data: { success: true, transaction: { id: 'txn-1', type: 'expense', amount: '50.00' } },
      });

      const { result } = renderHook(() => useTransactions(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.createTransaction({
          type: 'expense',
          amount: 50,
          categoryId: 'cat-1',
          walletId: 'wallet-1',
          date: '2024-01-15',
        });
      });

      // Wallet list should have been called (refresh after create)
      expect(walletsApi.list).toHaveBeenCalled();
    });

    it('refreshes budgets after creating an expense transaction', async () => {
      transactionsApi.create.mockResolvedValue({
        data: { success: true, transaction: { id: 'txn-1', type: 'expense', amount: '75.00' } },
      });

      const { result } = renderHook(() => useTransactions(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.createTransaction({
          type: 'expense',
          amount: 75,
          categoryId: 'cat-1',
          walletId: 'wallet-1',
          date: '2024-01-15',
        });
      });

      // Budget list should have been called (expense affects budget tracking)
      expect(budgetsApi.list).toHaveBeenCalled();
    });

    it('adds the new transaction to state', async () => {
      const mockTransaction = { id: 'txn-new', type: 'income', amount: '200.00' };
      transactionsApi.create.mockResolvedValue({
        data: { success: true, transaction: mockTransaction },
      });

      const { result } = renderHook(() => useTransactions(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.createTransaction({
          type: 'income',
          amount: 200,
          categoryId: 'cat-2',
          walletId: 'wallet-1',
          date: '2024-01-15',
        });
      });

      expect(result.current.transactions).toContainEqual(mockTransaction);
      expect(result.current.total).toBe(1);
    });
  });

  describe('fetchTransactions', () => {
    it('passes pagination and filter params to the API', async () => {
      transactionsApi.list.mockResolvedValue({
        data: {
          success: true,
          transactions: [{ id: 'txn-1' }, { id: 'txn-2' }],
          total: 2,
        },
      });

      const { result } = renderHook(() => useTransactions(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.fetchTransactions({
          page: 2,
          limit: 10,
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          categoryId: 'cat-1',
          type: 'expense',
          search: 'grocery',
        });
      });

      expect(transactionsApi.list).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        categoryId: 'cat-1',
        type: 'expense',
        search: 'grocery',
      });
    });

    it('excludes null/empty filter values from API params', async () => {
      transactionsApi.list.mockResolvedValue({
        data: { success: true, transactions: [], total: 0 },
      });

      const { result } = renderHook(() => useTransactions(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.fetchTransactions({
          page: 1,
          limit: 20,
          startDate: null,
          endDate: null,
          categoryId: null,
          type: null,
          search: '',
        });
      });

      expect(transactionsApi.list).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
      });
    });

    it('updates state with fetched transactions and total', async () => {
      const mockTransactions = [
        { id: 'txn-1', amount: '100.00' },
        { id: 'txn-2', amount: '200.00' },
      ];
      transactionsApi.list.mockResolvedValue({
        data: { success: true, transactions: mockTransactions, total: 50 },
      });

      const { result } = renderHook(() => useTransactions(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.fetchTransactions({ page: 1, limit: 20 });
      });

      expect(result.current.transactions).toEqual(mockTransactions);
      expect(result.current.total).toBe(50);
    });
  });

  describe('updateTransaction', () => {
    it('transforms camelCase fields to snake_case for the API', async () => {
      const mockUpdated = { id: 'txn-1', amount: '300.00', type: 'income' };
      transactionsApi.update.mockResolvedValue({
        data: { success: true, transaction: mockUpdated },
      });

      const { result } = renderHook(() => useTransactions(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.updateTransaction('txn-1', {
          amount: 300,
          type: 'income',
          categoryId: 'cat-2',
          walletId: 'wallet-2',
          date: '2024-02-01',
          description: 'Updated',
        });
      });

      expect(transactionsApi.update).toHaveBeenCalledWith('txn-1', {
        amount: 300,
        type: 'income',
        category_id: 'cat-2',
        wallet_id: 'wallet-2',
        date: '2024-02-01',
        description: 'Updated',
      });
    });

    it('refreshes wallets and budgets after update', async () => {
      transactionsApi.update.mockResolvedValue({
        data: { success: true, transaction: { id: 'txn-1', amount: '300.00' } },
      });

      const { result } = renderHook(() => useTransactions(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.updateTransaction('txn-1', {
          amount: 300,
          categoryId: 'cat-2',
        });
      });

      expect(walletsApi.list).toHaveBeenCalled();
      expect(budgetsApi.list).toHaveBeenCalled();
    });

    it('updates the transaction in state', async () => {
      const mockUpdated = { id: 'txn-1', amount: '300.00', type: 'income' };
      transactionsApi.create.mockResolvedValue({
        data: { success: true, transaction: { id: 'txn-1', amount: '100.00', type: 'expense' } },
      });
      transactionsApi.update.mockResolvedValue({
        data: { success: true, transaction: mockUpdated },
      });

      const { result } = renderHook(() => useTransactions(), { wrapper: Wrapper });

      // First create a transaction to have it in state
      await act(async () => {
        await result.current.createTransaction({
          type: 'expense',
          amount: 100,
          categoryId: 'cat-1',
          walletId: 'wallet-1',
          date: '2024-01-15',
        });
      });

      // Then update it
      await act(async () => {
        await result.current.updateTransaction('txn-1', {
          amount: 300,
          type: 'income',
        });
      });

      const txn = result.current.transactions.find((t) => t.id === 'txn-1');
      expect(txn.amount).toBe('300.00');
      expect(txn.type).toBe('income');
    });
  });

  describe('deleteTransaction', () => {
    it('calls the API DELETE endpoint', async () => {
      transactionsApi.remove.mockResolvedValue({ data: { success: true } });
      transactionsApi.create.mockResolvedValue({
        data: { success: true, transaction: { id: 'txn-1', type: 'expense', amount: '100.00' } },
      });

      const { result } = renderHook(() => useTransactions(), { wrapper: Wrapper });

      // Create a transaction first
      await act(async () => {
        await result.current.createTransaction({
          type: 'expense',
          amount: 100,
          categoryId: 'cat-1',
          walletId: 'wallet-1',
          date: '2024-01-15',
        });
      });

      await act(async () => {
        await result.current.deleteTransaction('txn-1');
      });

      expect(transactionsApi.remove).toHaveBeenCalledWith('txn-1');
    });

    it('refreshes wallet balances after deletion (balance reversal)', async () => {
      transactionsApi.remove.mockResolvedValue({ data: { success: true } });

      const { result } = renderHook(() => useTransactions(), { wrapper: Wrapper });

      // Reset the mock counters
      walletsApi.list.mockClear();

      await act(async () => {
        await result.current.deleteTransaction('txn-1');
      });

      // Wallet refresh should be triggered for balance reversal
      expect(walletsApi.list).toHaveBeenCalled();
    });

    it('refreshes budgets after deletion (budget tracking reversal)', async () => {
      transactionsApi.remove.mockResolvedValue({ data: { success: true } });

      const { result } = renderHook(() => useTransactions(), { wrapper: Wrapper });

      budgetsApi.list.mockClear();

      await act(async () => {
        await result.current.deleteTransaction('txn-1');
      });

      // Budget refresh should be triggered for tracking reversal
      expect(budgetsApi.list).toHaveBeenCalled();
    });

    it('removes the transaction from state and decrements total', async () => {
      transactionsApi.create.mockResolvedValue({
        data: { success: true, transaction: { id: 'txn-1', type: 'expense', amount: '100.00' } },
      });
      transactionsApi.remove.mockResolvedValue({ data: { success: true } });

      const { result } = renderHook(() => useTransactions(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.createTransaction({
          type: 'expense',
          amount: 100,
          categoryId: 'cat-1',
          walletId: 'wallet-1',
          date: '2024-01-15',
        });
      });

      expect(result.current.transactions).toHaveLength(1);
      expect(result.current.total).toBe(1);

      await act(async () => {
        await result.current.deleteTransaction('txn-1');
      });

      expect(result.current.transactions).toHaveLength(0);
      expect(result.current.total).toBe(0);
    });
  });
});
