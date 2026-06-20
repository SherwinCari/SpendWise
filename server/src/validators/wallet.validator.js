const Joi = require('joi');

const createWalletSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'string.empty': 'Wallet name is required',
    'any.required': 'Wallet name is required',
  }),
  balance: Joi.number().min(0).default(0).messages({
    'number.min': 'Balance must be zero or greater',
    'number.base': 'Balance must be a number',
  }),
});

const transferSchema = Joi.object({
  sourceWalletId: Joi.string().uuid().required().messages({
    'string.guid': 'Source wallet ID must be a valid UUID',
    'string.empty': 'Source wallet ID is required',
    'any.required': 'Source wallet ID is required',
  }),
  destinationWalletId: Joi.string().uuid().required().messages({
    'string.guid': 'Destination wallet ID must be a valid UUID',
    'string.empty': 'Destination wallet ID is required',
    'any.required': 'Destination wallet ID is required',
  }),
  amount: Joi.number().greater(0).required().messages({
    'number.greater': 'Transfer amount must be greater than zero',
    'number.base': 'Amount must be a number',
    'any.required': 'Amount is required',
  }),
});

module.exports = { createWalletSchema, transferSchema };
