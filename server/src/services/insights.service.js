'use strict';

/**
 * AI Insights Service (Feature #26)
 * Rule-based analytics — no external API required.
 * 
 * - Compares this month vs last month spending per category
 * - Detects anomalies: "You spent X% more on Y this month"
 * - Detects trends: "Z costs decreasing 3 months in a row"
 * - Suggests budgets: "Based on your spending, consider a $X budget for Y"
 */

const { query } = require('../config/database');

/**
 * Generate AI insights for a user.
 * @param {string} userId
 * @returns {Promise<Array<{type: string, message: string, category: string|null, severity: string}>>}
 */
async function generateInsights(userId) {
  const insights = [];

  const now = new Date();
  const thisMonth = now.getMonth() + 1;
  const thisYear = now.getFullYear();
  const lastMonth = thisMonth === 1 ? 12 : thisMonth - 1;
  const lastMonthYear = thisMonth === 1 ? thisYear - 1 : thisYear;

  // Get this month's spending by category
  const thisMonthData = await query(
    `SELECT c.name as category_name, c.id as category_id, SUM(t.amount) as total
     FROM transactions t
     JOIN categories c ON t.category_id = c.id
     WHERE t.user_id = $1 AND t.type = 'expense'
     AND EXTRACT(MONTH FROM t.date) = $2 AND EXTRACT(YEAR FROM t.date) = $3
     GROUP BY c.name, c.id`,
    [userId, thisMonth, thisYear]
  );

  // Get last month's spending by category
  const lastMonthData = await query(
    `SELECT c.name as category_name, c.id as category_id, SUM(t.amount) as total
     FROM transactions t
     JOIN categories c ON t.category_id = c.id
     WHERE t.user_id = $1 AND t.type = 'expense'
     AND EXTRACT(MONTH FROM t.date) = $2 AND EXTRACT(YEAR FROM t.date) = $3
     GROUP BY c.name, c.id`,
    [userId, lastMonth, lastMonthYear]
  );

  // Build lookup for last month
  const lastMonthMap = {};
  for (const row of lastMonthData.rows) {
    lastMonthMap[row.category_id] = { name: row.category_name, total: parseFloat(row.total) };
  }

  // Compare categories — detect anomalies (>30% increase)
  for (const row of thisMonthData.rows) {
    const currentTotal = parseFloat(row.total);
    const lastMonthEntry = lastMonthMap[row.category_id];

    if (lastMonthEntry && lastMonthEntry.total > 0) {
      const percentChange = ((currentTotal - lastMonthEntry.total) / lastMonthEntry.total) * 100;

      if (percentChange >= 50) {
        insights.push({
          type: 'anomaly',
          message: `You spent ${Math.round(percentChange)}% more on ${row.category_name} this month (₱${currentTotal.toFixed(0)} vs ₱${lastMonthEntry.total.toFixed(0)} last month).`,
          category: row.category_name,
          severity: 'warning',
        });
      } else if (percentChange <= -30) {
        insights.push({
          type: 'positive',
          message: `Great job! You reduced ${row.category_name} spending by ${Math.round(Math.abs(percentChange))}% this month.`,
          category: row.category_name,
          severity: 'success',
        });
      }
    } else if (!lastMonthEntry && currentTotal > 500) {
      insights.push({
        type: 'new_spending',
        message: `New spending category: You've spent ₱${currentTotal.toFixed(0)} on ${row.category_name} this month.`,
        category: row.category_name,
        severity: 'info',
      });
    }
  }

  // Detect 3-month trends
  const threeMonthTrends = await query(
    `SELECT c.name as category_name,
            EXTRACT(MONTH FROM t.date) as month,
            EXTRACT(YEAR FROM t.date) as year,
            SUM(t.amount) as total
     FROM transactions t
     JOIN categories c ON t.category_id = c.id
     WHERE t.user_id = $1 AND t.type = 'expense'
     AND t.date >= (NOW() - INTERVAL '3 months')
     GROUP BY c.name, EXTRACT(MONTH FROM t.date), EXTRACT(YEAR FROM t.date)
     ORDER BY c.name, year, month`,
    [userId]
  );

  // Group by category for trend analysis
  const categoryTrends = {};
  for (const row of threeMonthTrends.rows) {
    if (!categoryTrends[row.category_name]) {
      categoryTrends[row.category_name] = [];
    }
    categoryTrends[row.category_name].push(parseFloat(row.total));
  }

  for (const [category, totals] of Object.entries(categoryTrends)) {
    if (totals.length >= 3) {
      const isDecreasing = totals.every((val, i) => i === 0 || val < totals[i - 1]);
      const isIncreasing = totals.every((val, i) => i === 0 || val > totals[i - 1]);

      if (isDecreasing) {
        insights.push({
          type: 'trend',
          message: `${category} costs have been decreasing for 3 months in a row. Keep it up!`,
          category,
          severity: 'success',
        });
      } else if (isIncreasing) {
        insights.push({
          type: 'trend',
          message: `${category} spending has been increasing for 3 months straight. Consider setting a budget.`,
          category,
          severity: 'warning',
        });
      }
    }
  }

  // Budget suggestions (for categories without budgets that have consistent spending)
  const existingBudgets = await query(
    `SELECT category_id FROM budgets WHERE user_id = $1`,
    [userId]
  );
  const budgetedCategoryIds = new Set(existingBudgets.rows.map(r => r.category_id));

  for (const row of thisMonthData.rows) {
    if (!budgetedCategoryIds.has(row.category_id)) {
      const currentTotal = parseFloat(row.total);
      const lastMonthEntry = lastMonthMap[row.category_id];

      if (lastMonthEntry && currentTotal > 100) {
        const avgSpending = (currentTotal + lastMonthEntry.total) / 2;
        const suggestedBudget = Math.ceil(avgSpending * 1.1 / 100) * 100; // Round up to nearest 100 with 10% buffer

        insights.push({
          type: 'suggestion',
          message: `Based on your spending, consider setting a ₱${suggestedBudget} monthly budget for ${row.category_name}.`,
          category: row.category_name,
          severity: 'info',
        });
      }
    }
  }

  // Limit to top 5 most relevant insights
  return insights.slice(0, 5);
}

module.exports = { generateInsights };
