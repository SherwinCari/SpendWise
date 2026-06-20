'use strict';

const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const analyticsService = require('../services/analytics.service');

const router = Router();

/**
 * GET /api/analytics/monthly-summary
 * Returns total income, total expenses, and net balance for a given month.
 * Query params: year (number), month (number 1-12)
 * Requires authentication.
 */
router.get('/monthly-summary', authenticate, async (req, res, next) => {
  try {
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'year and month query parameters are required',
        },
      });
    }

    const parsedYear = parseInt(year, 10);
    const parsedMonth = parseInt(month, 10);

    if (isNaN(parsedYear) || isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'year must be a valid number and month must be between 1 and 12',
        },
      });
    }

    const data = await analyticsService.getMonthlySummary(req.userId, parsedYear, parsedMonth);

    res.status(200).json({
      success: true,
      ...data,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/category-breakdown
 * Returns spending totals per category for a given date range.
 * Query params: startDate (ISO/YYYY-MM-DD), endDate (ISO/YYYY-MM-DD)
 * Requires authentication.
 */
router.get('/category-breakdown', authenticate, async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'startDate and endDate query parameters are required',
        },
      });
    }

    const data = await analyticsService.getCategoryBreakdown(req.userId, startDate, endDate);

    res.status(200).json({
      success: true,
      breakdown: data,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/trends
 * Returns monthly expense totals for the last 6 months.
 * Requires authentication.
 */
router.get('/trends', authenticate, async (req, res, next) => {
  try {
    const data = await analyticsService.getSpendingTrends(req.userId);

    res.status(200).json({
      success: true,
      trends: data,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
