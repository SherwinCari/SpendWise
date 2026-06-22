import apiClient from './client';

/**
 * Register a new user account.
 * @param {string} name - User's display name
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const register = (name, email, password) => {
  return apiClient.post('/auth/register', { name, email, password });
};

/**
 * Log in with email and password.
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const login = (email, password) => {
  return apiClient.post('/auth/login', { email, password });
};

/**
 * Refresh the access token using a refresh token.
 * @param {string} refreshToken - The current refresh token
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const refresh = (refreshToken) => {
  return apiClient.post('/auth/refresh', { refreshToken });
};

/**
 * Log out and invalidate the refresh token.
 * @param {string} refreshToken - The refresh token to invalidate
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const logout = (refreshToken) => {
  return apiClient.post('/auth/logout', { refreshToken });
};

/**
 * Delete (soft-delete) the authenticated user's account.
 * Account will be permanently removed after 30 days.
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const deleteAccount = () => {
  return apiClient.delete('/auth/account');
};
