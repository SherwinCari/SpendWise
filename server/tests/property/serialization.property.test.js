'use strict';

const fc = require('fast-check');
const { serialize, deserialize } = require('../../src/utils/serializer');

/**
 * Feature: spendwise-expense-tracker
 * Property 1: Transaction Serialization Round-Trip
 *
 * For any valid Transaction object, serializing it to JSON and then deserializing
 * the resulting JSON string back SHALL produce a Transaction object equivalent to the original.
 *
 * **Validates: Requirements 18.1, 18.2, 18.3**
 */

// Arbitrary generator for valid UUID-like strings
const uuidArb = fc.uuid();

// Arbitrary generator for ISO 8601 date strings
const isoDateArb = fc.date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') })
  .map((d) => d.toISOString());

// Arbitrary generator for positive amount with up to 2 decimal places (as string)
const amountArb = fc
  .integer({ min: 1, max: 99999999 })
  .map((n) => (n / 100).toFixed(2));

// Arbitrary generator for transaction type
const typeArb = fc.constantFrom('income', 'expense');

// Arbitrary generator for description (string or null)
const descriptionArb = fc.oneof(
  fc.constant(null),
  fc.string({ minLength: 0, maxLength: 100 })
);

// Arbitrary generator for a full valid transaction object
const transactionArb = fc.record({
  id: uuidArb,
  userId: uuidArb,
  walletId: uuidArb,
  categoryId: uuidArb,
  type: typeArb,
  amount: amountArb,
  description: descriptionArb,
  date: isoDateArb,
  createdAt: isoDateArb,
  updatedAt: isoDateArb,
});

describe('Serialization Property Tests', () => {
  /**
   * Property 1: Transaction Serialization Round-Trip
   * **Validates: Requirements 18.1, 18.2, 18.3**
   */
  describe('Property 1: Transaction Serialization Round-Trip', () => {
    it('serialize then deserialize produces equivalent transaction', () => {
      fc.assert(
        fc.property(transactionArb, (txn) => {
          const serialized = serialize(txn);
          const result = deserialize(serialized);

          expect(result.success).toBe(true);
          expect(result.data).toEqual(txn);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 2: Malformed JSON Returns Descriptive Parse Error
   * **Validates: Requirements 18.4**
   */
  describe('Property 2: Malformed JSON Returns Descriptive Parse Error', () => {
    it('should return a PARSE_ERROR with a non-empty message for any invalid JSON string, without throwing', () => {
      fc.assert(
        fc.property(
          fc.fullUnicodeString().filter((s) => {
            try {
              JSON.parse(s);
              return false; // valid JSON, skip
            } catch {
              return true; // invalid JSON, keep
            }
          }),
          (malformedJson) => {
            // Should never throw an unhandled exception
            const result = deserialize(malformedJson);

            // Must return a failure result
            expect(result.success).toBe(false);

            // Must have error object with type PARSE_ERROR
            expect(result.error).toBeDefined();
            expect(result.error.type).toBe('PARSE_ERROR');

            // Must have a non-empty descriptive message
            expect(typeof result.error.message).toBe('string');
            expect(result.error.message.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
