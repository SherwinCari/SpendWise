'use strict';

const { serialize, deserialize } = require('../../src/utils/serializer');

const validTransaction = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  userId: '550e8400-e29b-41d4-a716-446655440001',
  walletId: '550e8400-e29b-41d4-a716-446655440002',
  categoryId: '550e8400-e29b-41d4-a716-446655440003',
  type: 'expense',
  amount: '125.50',
  description: 'Grocery shopping',
  date: '2024-01-15T10:30:00.000Z',
  createdAt: '2024-01-15T10:30:00.000Z',
  updatedAt: '2024-01-15T10:30:00.000Z',
};

describe('serialize', () => {
  test('converts a transaction object to a JSON string', () => {
    const result = serialize(validTransaction);
    expect(typeof result).toBe('string');
    const parsed = JSON.parse(result);
    expect(parsed.id).toBe(validTransaction.id);
    expect(parsed.amount).toBe('125.50');
  });

  test('preserves amount as string for precision', () => {
    const txn = { ...validTransaction, amount: '99999999.99' };
    const result = serialize(txn);
    const parsed = JSON.parse(result);
    expect(parsed.amount).toBe('99999999.99');
  });

  test('handles numeric amount by converting to string', () => {
    const txn = { ...validTransaction, amount: 125.5 };
    const result = serialize(txn);
    const parsed = JSON.parse(result);
    expect(parsed.amount).toBe('125.5');
  });

  test('sets description to null when undefined', () => {
    const txn = { ...validTransaction };
    delete txn.description;
    const result = serialize(txn);
    const parsed = JSON.parse(result);
    expect(parsed.description).toBeNull();
  });

  test('preserves null description', () => {
    const txn = { ...validTransaction, description: null };
    const result = serialize(txn);
    const parsed = JSON.parse(result);
    expect(parsed.description).toBeNull();
  });
});

describe('deserialize', () => {
  describe('syntax errors (PARSE_ERROR)', () => {
    test('returns PARSE_ERROR for malformed JSON', () => {
      const result = deserialize('not json at all');
      expect(result.success).toBe(false);
      expect(result.error.type).toBe('PARSE_ERROR');
      expect(result.error.message).toContain('Invalid JSON');
    });

    test('includes position info when available', () => {
      const result = deserialize('{"id": }');
      expect(result.success).toBe(false);
      expect(result.error.type).toBe('PARSE_ERROR');
      expect(result.error.position).not.toBeUndefined();
    });

    test('returns PARSE_ERROR for empty string', () => {
      const result = deserialize('');
      expect(result.success).toBe(false);
      expect(result.error.type).toBe('PARSE_ERROR');
    });

    test('returns PARSE_ERROR for incomplete JSON', () => {
      const result = deserialize('{"id": "123"');
      expect(result.success).toBe(false);
      expect(result.error.type).toBe('PARSE_ERROR');
    });
  });

  describe('validation errors (VALIDATION_ERROR)', () => {
    test('returns VALIDATION_ERROR when root is not an object', () => {
      const result = deserialize('"just a string"');
      expect(result.success).toBe(false);
      expect(result.error.type).toBe('VALIDATION_ERROR');
      expect(result.error.errors[0].field).toBe('root');
    });

    test('returns VALIDATION_ERROR for array input', () => {
      const result = deserialize('[]');
      expect(result.success).toBe(false);
      expect(result.error.type).toBe('VALIDATION_ERROR');
      expect(result.error.errors[0].field).toBe('root');
    });

    test('returns VALIDATION_ERROR for missing required fields', () => {
      const result = deserialize('{}');
      expect(result.success).toBe(false);
      expect(result.error.type).toBe('VALIDATION_ERROR');
      expect(result.error.errors.length).toBeGreaterThan(0);
      expect(result.error.errors.some(e => e.field === 'id')).toBe(true);
    });

    test('returns VALIDATION_ERROR for invalid type field', () => {
      const txn = { ...validTransaction, type: 'transfer' };
      const json = JSON.stringify(txn);
      const result = deserialize(json);
      expect(result.success).toBe(false);
      expect(result.error.type).toBe('VALIDATION_ERROR');
      expect(result.error.errors.some(e => e.field === 'type')).toBe(true);
    });

    test('returns VALIDATION_ERROR for non-numeric amount', () => {
      const txn = { ...validTransaction, amount: 'not-a-number' };
      const json = JSON.stringify(txn);
      const result = deserialize(json);
      expect(result.success).toBe(false);
      expect(result.error.type).toBe('VALIDATION_ERROR');
      expect(result.error.errors.some(e => e.field === 'amount')).toBe(true);
    });

    test('returns VALIDATION_ERROR when amount is not a string', () => {
      const txn = { ...validTransaction, amount: 125.5 };
      const json = JSON.stringify(txn);
      const result = deserialize(json);
      expect(result.success).toBe(false);
      expect(result.error.type).toBe('VALIDATION_ERROR');
      expect(result.error.errors.some(e => e.field === 'amount')).toBe(true);
    });
  });

  describe('successful deserialization', () => {
    test('returns success with valid transaction data', () => {
      const json = JSON.stringify(validTransaction);
      const result = deserialize(json);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validTransaction);
    });

    test('handles null description correctly', () => {
      const txn = { ...validTransaction, description: null };
      const json = JSON.stringify(txn);
      const result = deserialize(json);
      expect(result.success).toBe(true);
      expect(result.data.description).toBeNull();
    });

    test('handles income type correctly', () => {
      const txn = { ...validTransaction, type: 'income' };
      const json = JSON.stringify(txn);
      const result = deserialize(json);
      expect(result.success).toBe(true);
      expect(result.data.type).toBe('income');
    });
  });

  describe('round-trip property', () => {
    test('deserialize(serialize(txn)) equals the original txn', () => {
      const result = deserialize(serialize(validTransaction));
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validTransaction);
    });

    test('round-trip preserves null description', () => {
      const txn = { ...validTransaction, description: null };
      const result = deserialize(serialize(txn));
      expect(result.success).toBe(true);
      expect(result.data).toEqual(txn);
    });
  });
});
