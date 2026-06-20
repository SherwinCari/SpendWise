import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authApi from '../api/authApi';
import {
  setTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setSessionExpiredHandler,
} from '../api/client';

const AuthContext = createContext(null);

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
  const handleSessionExpired = useCallback(() => {
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
          setIsAuthenticated(true);
          // User details will be populated on next API call or we keep minimal state
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
      setUser(null);
      setIsAuthenticated(false);
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
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
