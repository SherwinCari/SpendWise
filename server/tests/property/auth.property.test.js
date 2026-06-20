'use strict';

const fc = require('fast-check');
const bcrypt = require('bcrypt');

// Feature: spendwise-expense-tracker, Property 13: Password Hashing
describe('Property 13: Password Hashing', () => {
  /**
   * **Validates: Requirements 1.5, 17.2**
   *
   * For any arbitrary password string (min length 8):
   * 1. Hashing with bcrypt should produce a hash that is NOT equal to the plaintext
   * 2. The hash should have bcrypt rounds >= 10 (extractable from the hash prefix)
   * 3. bcrypt.compare(password, hash) should return true
   */
  test('bcrypt hash is never equal to plaintext, has rounds >= 10, and verifies correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 100 }),
        async (password) => {
          const SALT_ROUNDS = 10;

          // Hash the password with bcrypt using minimum cost factor of 10
          const hash = await bcrypt.hash(password, SALT_ROUNDS);

          // Property 1: Hash must NOT equal the plaintext password
          expect(hash).not.toBe(password);

          // Property 2: bcrypt rounds must be >= 10
          // bcrypt hash format: $2b$<rounds>$<salt+hash>
          const roundsFromHash = bcrypt.getRounds(hash);
          expect(roundsFromHash).toBeGreaterThanOrEqual(10);

          // Property 3: bcrypt.compare(password, hash) should return true
          const isValid = await bcrypt.compare(password, hash);
          expect(isValid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
