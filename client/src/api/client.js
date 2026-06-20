import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'spendwise_access_token';
const REFRESH_TOKEN_KEY = 'spendwise_refresh_token';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

// Callback that auth context can register to handle forced logout
let onSessionExpired = null;

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue = [];

/**
 * Process queued requests after token refresh completes.
 */
const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Configured Axios instance for SpendWise API.
 */
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor — attaches access token from SecureStore.
 */
apiClient.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response interceptor — catches 401 errors, attempts token refresh, retries request.
 * Also provides user-friendly messages for network errors.
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle network errors (no response from server)
    if (!error.response) {
      // Modify the error message to be user-friendly
      if (error.message === 'Network Error') {
        error.userMessage = 'No internet connection. Please check your network and try again.';
      } else if (error.code === 'ECONNABORTED') {
        error.userMessage = 'Request timed out. Please try again.';
      } else {
        error.userMessage = 'Unable to reach the server. Please try again later.';
      }
      return Promise.reject(error);
    }

    const originalRequest = error.config;

    // Only attempt refresh for 401 errors that haven't already been retried
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Don't attempt refresh for auth endpoints (login, register, refresh itself)
    const isAuthEndpoint =
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/refresh');

    if (isAuthEndpoint) {
      return Promise.reject(error);
    }

    // If already refreshing, queue this request to retry after refresh completes
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Call the refresh endpoint
      const response = await axios.post(`${BASE_URL}/auth/refresh`, {
        refreshToken,
      });

      const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
        response.data;

      // Store new tokens
      await setTokens(newAccessToken, newRefreshToken);

      // Update the authorization header for the original request
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      // Process queued requests with the new token
      processQueue(null, newAccessToken);

      // Retry the original request
      return apiClient(originalRequest);
    } catch (refreshError) {
      // Refresh failed — clear tokens and notify auth context
      processQueue(refreshError, null);
      await clearTokens();

      if (onSessionExpired) {
        onSessionExpired();
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

/**
 * Store access and refresh tokens in SecureStore.
 * @param {string} accessToken
 * @param {string} refreshToken
 */
export const setTokens = async (accessToken, refreshToken) => {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
};

/**
 * Clear stored tokens from SecureStore.
 */
export const clearTokens = async () => {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
};

/**
 * Register a callback to be invoked when session expires (refresh fails).
 * The auth context uses this to redirect the user to the login screen.
 * @param {Function} callback
 */
export const setSessionExpiredHandler = (callback) => {
  onSessionExpired = callback;
};

/**
 * Get the current access token (useful for checking auth state).
 * @returns {Promise<string|null>}
 */
export const getAccessToken = async () => {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
};

/**
 * Get the current refresh token.
 * @returns {Promise<string|null>}
 */
export const getRefreshToken = async () => {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
};

export default apiClient;
