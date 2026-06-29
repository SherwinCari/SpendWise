const Joi = require('joi');

const createTransactionSchema = Joi.object({
  amount: Joi.number().greater(0).required().messages({
    'number.greater': 'Amount must be greater than zero',
    'number.base': 'Amount must be a number',
    'any.required': 'Amount is required',
  }),
  type: Joi.string().valid('income', 'expense').required().messages({
    'any.only': 'Type must be either "income" or "expense"',
    'string.empty': 'Type is required',
    'any.required': 'Type is required',
  }),
  category_id: Joi.string().uuid().required().messages({
    'string.guid': 'Category ID must be a valid UUID',
    'string.empty': 'Category ID is required',
    'any.required': 'Category ID is required',
  }),
  wallet_id: Joi.string().uuid().required().messages({
    'string.guid': 'Wallet ID must be a valid UUID',
    'string.empty': 'Wallet ID is required',
    'any.required': 'Wallet ID is required',
  }),
  date: Joi.date().iso().required().messages({
    'date.format': 'Date must be a valid ISO date',
    'date.base': 'Date must be a valid ISO date',
    'any.required': 'Date is required',
  }),
  description: Joi.string().allow('', null).optional(),
  receipt_image: Joi.string().allow('', null).optional(),
});

const updateTransactionSchema = Joi.object({
  amount: Joi.number().greater(0).optional().messages({
    'number.greater': 'Amount must be greater than zero',
    'number.base': 'Amount must be a number',
  }),
  type: Joi.string().valid('income', 'expense').optional().messages({
    'any.only': 'Type must be either "income" or "expense"',
  }),
  category_id: Joi.string().uuid().optional().messages({
    'string.guid': 'Category ID must be a valid UUID',
  }),
  wallet_id: Joi.string().uuid().optional().messages({
    'string.guid': 'Wallet ID must be a valid UUID',
  }),
  date: Joi.date().iso().optional().messages({
    'date.format': 'Date must be a valid ISO date',
    'date.base': 'Date must be a valid ISO date',
  }),
  description: Joi.string().allow('', null).optional(),
  receipt_image: Joi.string().allow('', null).optional(),
});

module.exports = { createTransactionSchema, updateTransactionSchema };
