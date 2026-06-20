'use strict';

/**
 * Required fields for a valid transaction object.
 */
const REQUIRED_FIELDS = [
  'id',
  'userId',
  'walletId',
  'categoryId',
  'type',
  'amount',
  'date',
  'createdAt',
  'updatedAt',
];

const VALID_TYPES = ['income', 'expense'];

/**
 * Serialize a transaction object to a JSON string.
 * The amount field is stored as a string to preserve numeric precision.
 *
 * @param {object} transaction - A valid transaction object
 * @returns {string} JSON string representation
 */
function serialize(transaction) {
  const serialized = {
    id: transaction.id,
    userId: transaction.userId,
    walletId: transaction.walletId,
    categoryId: transaction.categoryId,
    type: transaction.type,
    amount: String(transaction.amount),
    description: transaction.description !== undefined ? transaction.description : null,
    date: transaction.date,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
  };

  return JSON.stringify(serialized);
}

/**
 * Deserialize a JSON string into a validated transaction object.
 *
 * Returns an object with either:
 *   { success: true, data: transaction }
 *   { success: false, error: { type: 'PARSE_ERROR', message, position } }
 *   { success: false, error: { type: 'VALIDATION_ERROR', errors: [...] } }
 *
 * @param {string} jsonString - The JSON string to parse
 * @returns {object} Result with success flag and data or error details
 */
function deserialize(jsonString) {
  // Step 1: Parse JSON (syntax check)
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    // Extract position info from the JSON.parse error message
    const positionMatch = err.message.match(/position\s+(\d+)/i);
    const position = positionMatch ? parseInt(positionMatch[1], 10) : null;

    return {
      success: false,
      error: {
        type: 'PARSE_ERROR',
        message: `Invalid JSON: ${err.message}`,
        position: position,
      },
    };
  }

  // Step 2: Validate semantics (field presence and types)
  const errors = [];

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {
      success: false,
      error: {
        type: 'VALIDATION_ERROR',
        errors: [{ field: 'root', message: 'Expected a JSON object' }],
      },
    };
  }

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    if (parsed[field] === undefined || parsed[field] === null) {
      errors.push({ field, message: `Missing required field: ${field}` });
    }
  }

  // If required fields are missing, return early
  if (errors.length > 0) {
    return {
      success: false,
      error: {
        type: 'VALIDATION_ERROR',
        errors,
      },
    };
  }

  // Validate field types
  if (typeof parsed.id !== 'string') {
    errors.push({ field: 'id', message: 'id must be a string' });
  }

  if (typeof parsed.userId !== 'string') {
    errors.push({ field: 'userId', message: 'userId must be a string' });
  }

  if (typeof parsed.walletId !== 'string') {
    errors.push({ field: 'walletId', message: 'walletId must be a string' });
  }

  if (typeof parsed.categoryId !== 'string') {
    errors.push({ field: 'categoryId', message: 'categoryId must be a string' });
  }

  if (!VALID_TYPES.includes(parsed.type)) {
    errors.push({ field: 'type', message: 'type must be "income" or "expense"' });
  }

  if (typeof parsed.amount !== 'string') {
    errors.push({ field: 'amount', message: 'amount must be a string (numeric)' });
  } else if (isNaN(Number(parsed.amount))) {
    errors.push({ field: 'amount', message: 'amount must be a valid numeric string' });
  }

  if (parsed.description !== null && typeof parsed.description !== 'string') {
    errors.push({ field: 'description', message: 'description must be a string or null' });
  }

  if (typeof parsed.date !== 'string') {
    errors.push({ field: 'date', message: 'date must be a string' });
  }

  if (typeof parsed.createdAt !== 'string') {
    errors.push({ field: 'createdAt', message: 'createdAt must be a string' });
  }

  if (typeof parsed.updatedAt !== 'string') {
    errors.push({ field: 'updatedAt', message: 'updatedAt must be a string' });
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: {
        type: 'VALIDATION_ERROR',
        errors,
      },
    };
  }

  // Build validated transaction object
  const transaction = {
    id: parsed.id,
    userId: parsed.userId,
    walletId: parsed.walletId,
    categoryId: parsed.categoryId,
    type: parsed.type,
    amount: parsed.amount,
    description: parsed.description !== undefined ? parsed.description : null,
    date: parsed.date,
    createdAt: parsed.createdAt,
    updatedAt: parsed.updatedAt,
  };

  return { success: true, data: transaction };
}

module.exports = { serialize, deserialize, REQUIRED_FIELDS, VALID_TYPES };
