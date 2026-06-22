import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as authApi from '../api/authApi';
import {
  setTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setSessionExpiredHandler,
} from '../api/client';

const AuthContext = createContext(null);
const USER_STORAGE_KEY = '@spendwise_user';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Handle forced logout when session expires (refresh token invalid)
  const handleSessionExpired = useCallback(async () => {
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  // Register the session-expired handler with the API client
  useEffect(() => {
    setSessionExpiredHandler(handleSessionExpired);
  }, [handleSessionExpired]);

  // Check for existing token on mount to restore auth state
  useEffect(() => {
    const restoreAuth = async () => {
      try {
        const token = await getAccessToken();
        if (token) {
          // Restore user data from AsyncStorage
          const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          }
          setIsAuthenticated(true);
        }
      } catch {
        // Token check failed — user stays unauthenticated
      } finally {
        setLoading(false);
      }
    };
    restoreAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authApi.login(email, password);
      const { accessToken, refreshToken, user: userData } = response.data;
      await setTokens(accessToken, refreshToken);
      // Persist user data for app restart
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      setUser(userData);
      setIsAuthenticated(true);
      return userData;
    } catch (err) {
      const message =
        err.response?.data?.error?.message || 'Login failed. Please try again.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (name, email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authApi.register(name, email, password);
      const { accessToken, refreshToken, user: userData } = response.data;
      await setTokens(accessToken, refreshToken);
      // Persist user data for app restart
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      setUser(userData);
      setIsAuthenticated(true);
      return userData;
    } catch (err) {
      const message =
        err.response?.data?.error?.message || 'Registration failed. Please try again.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch {
      // Logout API call may fail — still clear local state
    } finally {
      await clearTokens();
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await authApi.deleteAccount();
      // Clear local state after successful deletion request
      await clearTokens();
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      setUser(null);
      setIsAuthenticated(false);
    } catch (err) {
      const message =
        err.response?.data?.error?.message || 'Failed to delete account. Please try again.';
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
    user,
    isAuthenticated,
    loading,
    error,
    login,
    register,
    logout,
    deleteAccount,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
