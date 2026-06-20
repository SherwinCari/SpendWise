'use strict';

jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

const { query } = require('../../src/config/database');
const userRepository = require('../../src/repositories/user.repository');

describe('User Repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should insert a user with parameterized query and return the created row', async () => {
      const mockRow = {
        id: 'test-uuid-1234',
        name: 'John Doe',
        email: 'john@example.com',
        created_at: new Date('2024-01-01'),
      };
      query.mockResolvedValue({ rows: [mockRow] });

      const result = await userRepository.create('John Doe', 'john@example.com', 'hashed_pw');

      expect(query).toHaveBeenCalledTimes(1);
      const [sql, params] = query.mock.calls[0];
      expect(sql).toContain('INSERT INTO users');
      expect(sql).toContain('$1');
      expect(sql).toContain('$2');
      expect(sql).toContain('$3');
      expect(sql).toContain('$4');
      expect(params).toEqual(['test-uuid-1234', 'John Doe', 'john@example.com', 'hashed_pw']);
      expect(result).toEqual(mockRow);
    });

    it('should generate a UUID for the new user', async () => {
      query.mockResolvedValue({ rows: [{ id: 'test-uuid-1234' }] });

      await userRepository.create('Jane', 'jane@example.com', 'hash');

      const params = query.mock.calls[0][1];
      expect(params[0]).toBe('test-uuid-1234');
    });

    it('should not return the password_hash in the result', async () => {
      const mockRow = {
        id: 'test-uuid-1234',
        name: 'John',
        email: 'john@example.com',
        created_at: new Date(),
      };
      query.mockResolvedValue({ rows: [mockRow] });

      const result = await userRepository.create('John', 'john@example.com', 'hash');

      expect(result).not.toHaveProperty('password_hash');
    });
  });

  describe('findByEmail', () => {
    it('should query by email using parameterized query and return the user', async () => {
      const mockRow = {
        id: 'abc-123',
        name: 'Alice',
        email: 'alice@example.com',
        password_hash: 'bcrypt_hash',
        created_at: new Date(),
      };
      query.mockResolvedValue({ rows: [mockRow] });

      const result = await userRepository.findByEmail('alice@example.com');

      expect(query).toHaveBeenCalledTimes(1);
      const [sql, params] = query.mock.calls[0];
      expect(sql).toContain('WHERE email = $1');
      expect(params).toEqual(['alice@example.com']);
      expect(result).toEqual(mockRow);
    });

    it('should return null when no user is found', async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await userRepository.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });

    it('should include password_hash in the result for credential verification', async () => {
      const mockRow = {
        id: 'abc-123',
        name: 'Bob',
        email: 'bob@example.com',
        password_hash: 'hashed_value',
        created_at: new Date(),
      };
      query.mockResolvedValue({ rows: [mockRow] });

      const result = await userRepository.findByEmail('bob@example.com');

      expect(result).toHaveProperty('password_hash', 'hashed_value');
    });
  });

  describe('findById', () => {
    it('should query by id using parameterized query and return the user', async () => {
      const mockRow = {
        id: 'user-id-456',
        name: 'Charlie',
        email: 'charlie@example.com',
        password_hash: 'hash',
        created_at: new Date(),
      };
      query.mockResolvedValue({ rows: [mockRow] });

      const result = await userRepository.findById('user-id-456');

      expect(query).toHaveBeenCalledTimes(1);
      const [sql, params] = query.mock.calls[0];
      expect(sql).toContain('WHERE id = $1');
      expect(params).toEqual(['user-id-456']);
      expect(result).toEqual(mockRow);
    });

    it('should return null when no user is found', async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await userRepository.findById('nonexistent-id');

      expect(result).toBeNull();
    });
  });
});
