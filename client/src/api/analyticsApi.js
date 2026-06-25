import apiClient from './client';

/**
 * Get monthly income/expense summary.
 * @param {number} year - The year (e.g. 2024)
 * @param {number} month - The month (1-12)
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const getMonthlySummary = (year, month) => {
  return apiClient.get('/analytics/monthly-summary', {
    params: { year, month },
  });
};

/**
 * Get spending breakdown by category for a date range.
 * @param {string} startDate - Start date (ISO string or YYYY-MM-DD)
 * @param {string} endDate - End date (ISO string or YYYY-MM-DD)
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const getCategoryBreakdown = (startDate, endDate) => {
  return apiClient.get('/analytics/category-breakdown', {
    params: { startDate, endDate },
  });
};

/**
 * Get spending trends over time.
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const getSpendingTrends = () => {
  return apiClient.get('/analytics/trends');
};

/**
 * Get AI-powered insights (Feature #26).
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const getInsights = () => {
  return apiClient.get('/analytics/insights');
};
