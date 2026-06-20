'use strict';

const { query } = require('../config/database');

/**
 * Get monthly summary of income, expenses, and net balance for a user.
 * Returns zero values if no transactions exist for the specified period.
 * @param {string} userId - The authenticated user's ID
 * @param {number} year - The year to summarize
 * @param {number} month - The month to summarize (1-12)
 * @returns {Promise<object>} { year, month, totalIncome, totalExpenses, netBalance }
 */
async function getMonthlySummary(userId, year, month) {
  const sql = `
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expenses
    FROM transactions
    WHERE user_id = $1
      AND EXTRACT(YEAR FROM date) = $2
      AND EXTRACT(MONTH FROM date) = $3
  `;

  const result = await query(sql, [userId, year, month]);
  const row = result.rows[0];

  const totalIncome = parseFloat(row.total_income);
  const totalExpenses = parseFloat(row.total_expenses);
  const netBalance = totalIncome - totalExpenses;

  return {
    year,
    month,
    totalIncome: totalIncome.toFixed(2),
    totalExpenses: totalExpenses.toFixed(2),
    netBalance: netBalance.toFixed(2),
  };
}

/**
 * Get spending breakdown by category for a given date range.
 * Only includes expense transactions.
 * @param {string} userId - The authenticated user's ID
 * @param {string} startDate - Start date (ISO format or YYYY-MM-DD)
 * @param {string} endDate - End date (ISO format or YYYY-MM-DD)
 * @returns {Promise<object[]>} Array of { categoryId, categoryName, categoryColor, categoryIcon, total }
 */
async function getCategoryBreakdown(userId, startDate, endDate) {
  const sql = `
    SELECT
      t.category_id,
      c.name AS category_name,
      c.color AS category_color,
      c.icon AS category_icon,
      COALESCE(SUM(t.amount), 0) AS total
    FROM transactions t
    JOIN categories c ON c.id = t.category_id
    WHERE t.user_id = $1
      AND t.type = 'expense'
      AND t.date >= $2
      AND t.date <= $3
    GROUP BY t.category_id, c.name, c.color, c.icon
    ORDER BY total DESC
  `;

  const result = await query(sql, [userId, startDate, endDate]);

  return result.rows.map((row) => ({
    categoryId: row.category_id,
    categoryName: row.category_name,
    categoryColor: row.category_color,
    categoryIcon: row.category_icon,
    total: parseFloat(row.total).toFixed(2),
  }));
}

/**
 * Get monthly expense totals for the last 6 months.
 * Fills in missing months with zero totals.
 * @param {string} userId - The authenticated user's ID
 * @returns {Promise<object[]>} Array of { year, month, total } for last 6 months
 */
async function getSpendingTrends(userId) {
  const sql = `
    SELECT
      EXTRACT(YEAR FROM date)::int AS year,
      EXTRACT(MONTH FROM date)::int AS month,
      COALESCE(SUM(amount), 0) AS total
    FROM transactions
    WHERE user_id = $1
      AND type = 'expense'
      AND date >= (NOW() - INTERVAL '6 months')
    GROUP BY EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date)
    ORDER BY year ASC, month ASC
  `;

  const result = await query(sql, [userId]);

  // Build a map of existing data
  const dataMap = {};
  for (const row of result.rows) {
    const key = `${row.year}-${row.month}`;
    dataMap[key] = parseFloat(row.total);
  }

  // Generate last 6 months and fill in zeros for missing months
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const key = `${year}-${month}`;
    months.push({
      year,
      month,
      total: (dataMap[key] || 0).toFixed(2),
    });
  }

  return months;
}

module.exports = {
  getMonthlySummary,
  getCategoryBreakdown,
  getSpendingTrends,
};
