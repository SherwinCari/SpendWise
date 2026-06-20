import apiClient from './client';

/**
 * Create a new category.
 * @param {object} data - Category data (name, icon, color, type)
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const create = (data) => {
  return apiClient.post('/categories', data);
};

/**
 * List all categories for the authenticated user.
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const list = () => {
  return apiClient.get('/categories');
};

/**
 * Update an existing category.
 * @param {string} id - Category UUID
 * @param {object} data - Fields to update
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const update = (id, data) => {
  return apiClient.put(`/categories/${id}`, data);
};

/**
 * Delete a category.
 * @param {string} id - Category UUID
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const remove = (id) => {
  return apiClient.delete(`/categories/${id}`);
};

// Also export as `delete` alias
export { remove as delete$ };
