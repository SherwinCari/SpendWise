const Joi = require('joi');

const createCategorySchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'string.empty': 'Category name is required',
    'any.required': 'Category name is required',
  }),
  type: Joi.string().valid('income', 'expense').required().messages({
    'any.only': 'Type must be either "income" or "expense"',
    'string.empty': 'Type is required',
    'any.required': 'Type is required',
  }),
  icon: Joi.string().allow('', null).optional(),
  color: Joi.string().allow('', null).optional(),
});

const updateCategorySchema = Joi.object({
  name: Joi.string().trim().optional().messages({
    'string.empty': 'Category name cannot be empty',
  }),
  icon: Joi.string().allow('', null).optional(),
  color: Joi.string().allow('', null).optional(),
});

module.exports = { createCategorySchema, updateCategorySchema };
