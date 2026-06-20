const Joi = require('joi');

const createBudgetSchema = Joi.object({
  category_id: Joi.string().uuid().required().messages({
    'string.guid': 'Category ID must be a valid UUID',
    'string.empty': 'Category ID is required',
    'any.required': 'Category ID is required',
  }),
  amount_limit: Joi.number().greater(0).required().messages({
    'number.greater': 'Amount limit must be greater than zero',
    'number.base': 'Amount limit must be a number',
    'any.required': 'Amount limit is required',
  }),
  period: Joi.string().valid('weekly', 'monthly').required().messages({
    'any.only': 'Period must be either "weekly" or "monthly"',
    'string.empty': 'Period is required',
    'any.required': 'Period is required',
  }),
  start_date: Joi.date().iso().required().messages({
    'date.format': 'Start date must be a valid ISO date',
    'date.base': 'Start date must be a valid date',
    'any.required': 'Start date is required',
  }),
});

module.exports = { createBudgetSchema };
