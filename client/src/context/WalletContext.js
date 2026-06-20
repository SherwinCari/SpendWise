import React, { createContext, useContext, useState, useCallback } from 'react';
import * as walletsApi from '../api/walletsApi';

const WalletContext = createContext(null);

export const useWallets = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallets must be used within a WalletProvider');
  }
  return context;
};

export function WalletProvider({ children }) {
  const [wallets, setWallets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchWallets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await walletsApi.list();
      const data = response.data?.wallets || response.data || [];
      setWallets(data);
      return data;
    } catch (err) {
      const message =
        err.response?.data?.error?.message || 'Failed to fetch wallets.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createWallet = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await walletsApi.create(data);
      const newWallet = response.data?.wallet || response.data;
      setWallets((prev) => [...prev, newWallet]);
      return newWallet;
    } catch (err) {
      const message =
        err.response?.data?.error?.message || 'Failed to create wallet.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateWallet = useCallback(async (id, data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await walletsApi.update(id, data);
      const updated = response.data?.wallet || response.data;
      setWallets((prev) =>
        prev.map((w) => (w.id === id ? { ...w, ...updated } : w))
      );
      if (selectedWallet?.id === id) {
        setSelectedWallet((prev) => ({ ...prev, ...updated }));
      }
      return updated;
    } catch (err) {
      const message =
        err.response?.data?.error?.message || 'Failed to update wallet.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [selectedWallet]);

  const deleteWallet = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      await walletsApi.remove(id);
      setWallets((prev) => prev.filter((w) => w.id !== id));
      if (selectedWallet?.id === id) {
        setSelectedWallet(null);
      }
    } catch (err) {
      const message =
        err.response?.data?.error?.message || 'Failed to delete wallet.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [selectedWallet]);

  const transferFunds = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await walletsApi.transfer(data);
      // Refresh wallets to reflect updated balances
      await fetchWallets();
      return response.data;
    } catch (err) {
      const message =
        err.response?.data?.error?.message || 'Transfer failed.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchWallets]);

  const selectWallet = useCallback((wallet) => {
    setSelectedWallet(wallet);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = {
    wallets,
    selectedWallet,
    loading,
    error,
    fetchWallets,
    createWallet,
    updateWallet,
    deleteWallet,
    transferFunds,
    selectWallet,
    clearError,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export default WalletContext;
