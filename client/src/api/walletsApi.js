import apiClient from './client';

/**
 * Create a new wallet.
 * @param {object} data - Wallet data (name, currency, initialBalance, etc.)
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const create = (data) => {
  return apiClient.post('/wallets', data);
};

/**
 * List all wallets for the authenticated user.
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const list = () => {
  return apiClient.get('/wallets');
};

/**
 * Update an existing wallet.
 * @param {string} id - Wallet UUID
 * @param {object} data - Fields to update
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const update = (id, data) => {
  return apiClient.put(`/wallets/${id}`, data);
};

/**
 * Delete a wallet.
 * @param {string} id - Wallet UUID
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const remove = (id) => {
  return apiClient.delete(`/wallets/${id}`);
};

/**
 * Transfer funds between wallets.
 * @param {object} data - Transfer data (fromWalletId, toWalletId, amount)
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const transfer = (data) => {
  return apiClient.post('/wallets/transfer', data);
};

// Also export as `delete` alias
export { remove as delete$ };
