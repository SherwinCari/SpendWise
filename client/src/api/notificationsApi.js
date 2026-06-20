import apiClient from './client';

/**
 * List all notifications for the authenticated user.
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const list = () => {
  return apiClient.get('/notifications');
};

/**
 * Mark a notification as read.
 * @param {string} id - Notification UUID
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const markAsRead = (id) => {
  return apiClient.put(`/notifications/${id}/read`);
};
