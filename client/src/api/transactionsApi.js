import apiClient from './client';

/**
 * Create a new transaction.
 * @param {object} data - Transaction data (amount, type, categoryId, walletId, date, note, etc.)
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const create = (data) => {
  return apiClient.post('/transactions', data);
};

/**
 * List transactions with optional filters.
 * @param {object} [filters] - Query parameters (walletId, categoryId, type, startDate, endDate, page, limit)
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const list = (filters) => {
  return apiClient.get('/transactions', { params: filters });
};

/**
 * Get a single transaction by ID.
 * @param {string} id - Transaction UUID
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const getById = (id) => {
  return apiClient.get(`/transactions/${id}`);
};

/**
 * Update an existing transaction.
 * @param {string} id - Transaction UUID
 * @param {object} data - Fields to update
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const update = (id, data) => {
  return apiClient.put(`/transactions/${id}`, data);
};

/**
 * Delete a transaction.
 * @param {string} id - Transaction UUID
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const remove = (id) => {
  return apiClient.delete(`/transactions/${id}`);
};

// Also export as `delete` for spec compliance (aliased since `delete` is a reserved word)
export { remove as delete$ };
