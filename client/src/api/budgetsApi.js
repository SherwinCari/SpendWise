import apiClient from './client';

/**
 * Create a new budget.
 * @param {object} data - Budget data (categoryId, amount, period, startDate, endDate, etc.)
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const create = (data) => {
  return apiClient.post('/budgets', data);
};

/**
 * List all budgets for the authenticated user.
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const list = () => {
  return apiClient.get('/budgets');
};

/**
 * Update an existing budget.
 * @param {string} id - Budget UUID
 * @param {object} data - Fields to update
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const update = (id, data) => {
  return apiClient.put(`/budgets/${id}`, data);
};

/**
 * Delete a budget.
 * @param {string} id - Budget UUID
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const remove = (id) => {
  return apiClient.delete(`/budgets/${id}`);
};

// Also export as `delete` alias
export { remove as delete$ };
