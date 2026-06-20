'use strict';

// Set env vars before requiring modules
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';

// Mock the database module
jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

// Mock repositories
jest.mock('../../src/repositories/transaction.repository', () => ({
  create: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}));

jest.mock('../../src/repositories/wallet.repository', () => ({
  findById: jest.fn(),
  updateBalance: jest.fn(),
}));

jest.mock('../../src/repositories/budget.repository', () => ({
  findByCategoryAndPeriod: jest.fn(),
  updateSpent: jest.fn(),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const transactionRepository = require('../../src/repositories/transaction.repository');
const walletRepository = require('../../src/repositories/wallet.repository');
const budgetRepository = require('../../src/repositories/budget.repository');
const app = require('../../index');

describe('Transaction Integration - CRUD + Wallet Balance Verification', () => {
  const userId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const walletId = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
  const categoryId = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
  const transactionId = 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';

  let accessToken;

  beforeAll(() => {
    accessToken = jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no budgets for the category
    budgetRepository.findByCategoryAndPeriod.mockResolvedValue([]);
  });

  describe('Full CRUD Flow with Wallet Balance', () => {
    it('should Create → Read → Update → Delete a transaction with wallet balance adjustments', async () => {
      // --- STEP 1: CREATE an expense transaction ---
      walletRepository.findById.mockResolvedValue({
        id: walletId,
        user_id: userId,
        name: 'Main Wallet',
        balance: '1000.00',
      });
      walletRepository.updateBalance.mockResolvedValue({
        id: walletId,
        balance: '950.00',
      });

      const createdTransaction = {
        id: transactionId,
        user_id: userId,
        wallet_id: walletId,
        category_id: categoryId,
        type: 'expense',
        amount: '50.00',
        description: 'Lunch',
        date: '2024-03-15T12:00:00.000Z',
        created_at: '2024-03-15T12:00:00.000Z',
        updated_at: '2024-03-15T12:00:00.000Z',
      };
      transactionRepository.create.mockResolvedValue(createdTransaction);

      const createRes = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 50,
          type: 'expense',
          category_id: categoryId,
          wallet_id: walletId,
          date: '2024-03-15T12:00:00.000Z',
          description: 'Lunch',
        })
        .expect(201);

      expect(createRes.body.success).toBe(true);
      expect(createRes.body.transaction.id).toBe(transactionId);
      expect(createRes.body.transaction.amount).toBe('50.00');
      expect(createRes.body.transaction.type).toBe('expense');

      // Verify wallet balance was decreased
      expect(walletRepository.updateBalance).toHaveBeenCalledWith(walletId, 950);

      // --- STEP 2: READ the transaction ---
      jest.clearAllMocks();
      transactionRepository.findById.mockResolvedValue(createdTransaction);

      const getRes = await request(app)
        .get(`/api/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(getRes.body.success).toBe(true);
      expect(getRes.body.transaction.id).toBe(transactionId);
      expect(getRes.body.transaction.description).toBe('Lunch');

      // --- STEP 3: UPDATE the transaction amount ---
      jest.clearAllMocks();
      transactionRepository.findById.mockResolvedValue(createdTransaction);
      budgetRepository.findByCategoryAndPeriod.mockResolvedValue([]);

      // Reverse old: add 50 back (income equivalent)
      walletRepository.findById
        .mockResolvedValueOnce({ id: walletId, user_id: userId, balance: '950.00' })
        .mockResolvedValueOnce({ id: walletId, user_id: userId, balance: '1000.00' });
      walletRepository.updateBalance
        .mockResolvedValueOnce({ id: walletId, balance: '1000.00' })
        .mockResolvedValueOnce({ id: walletId, balance: '925.00' });

      const updatedTransaction = {
        ...createdTransaction,
        amount: '75.00',
        description: 'Dinner',
        updated_at: '2024-03-15T13:00:00.000Z',
      };
      transactionRepository.update.mockResolvedValue(updatedTransaction);

      const updateRes = await request(app)
        .put(`/api/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 75,
          description: 'Dinner',
        })
        .expect(200);

      expect(updateRes.body.success).toBe(true);
      expect(updateRes.body.transaction.amount).toBe('75.00');
      expect(updateRes.body.transaction.description).toBe('Dinner');

      // --- STEP 4: DELETE the transaction ---
      jest.clearAllMocks();
      transactionRepository.findById.mockResolvedValue(updatedTransaction);
      budgetRepository.findByCategoryAndPeriod.mockResolvedValue([]);

      // Reverse: add back 75 (expense reversed → income)
      walletRepository.findById.mockResolvedValue({
        id: walletId,
        user_id: userId,
        balance: '925.00',
      });
      walletRepository.updateBalance.mockResolvedValue({
        id: walletId,
        balance: '1000.00',
      });
      transactionRepository.delete.mockResolvedValue(true);

      const deleteRes = await request(app)
        .delete(`/api/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(deleteRes.body.success).toBe(true);
      expect(deleteRes.body.message).toBe('Transaction deleted successfully');

      // Verify balance was restored
      expect(walletRepository.updateBalance).toHaveBeenCalledWith(walletId, 1000);
    });
  });

  describe('Transaction List with Pagination', () => {
    it('should list transactions with pagination metadata', async () => {
      const transactions = [
        { id: 'txn-1', amount: '100.00', type: 'income', date: '2024-03-15' },
        { id: 'txn-2', amount: '50.00', type: 'expense', date: '2024-03-14' },
      ];

      transactionRepository.findByUserId.mockResolvedValue({
        rows: transactions,
        total: 25,
      });

      const res = await request(app)
        .get('/api/transactions?page=1&limit=2')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.transactions).toHaveLength(2);
      expect(res.body.total).toBe(25);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(2);
    });
  });

  describe('Income Transaction - Wallet Balance Increase', () => {
    it('should increase wallet balance on income transaction creation', async () => {
      walletRepository.findById.mockResolvedValue({
        id: walletId,
        user_id: userId,
        balance: '500.00',
      });
      walletRepository.updateBalance.mockResolvedValue({
        id: walletId,
        balance: '700.00',
      });
      transactionRepository.create.mockResolvedValue({
        id: 'txn-income-1',
        user_id: userId,
        wallet_id: walletId,
        category_id: categoryId,
        type: 'income',
        amount: '200.00',
        date: '2024-03-15T12:00:00.000Z',
        created_at: '2024-03-15T12:00:00.000Z',
        updated_at: '2024-03-15T12:00:00.000Z',
      });

      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 200,
          type: 'income',
          category_id: categoryId,
          wallet_id: walletId,
          date: '2024-03-15T12:00:00.000Z',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.transaction.type).toBe('income');
      // Wallet balance: 500 + 200 = 700
      expect(walletRepository.updateBalance).toHaveBeenCalledWith(walletId, 700);
    });
  });

  describe('Transaction Validation Errors', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .send({
          amount: 50,
          type: 'expense',
          category_id: categoryId,
          wallet_id: walletId,
          date: '2024-03-15',
        })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should return 404 when transaction not found', async () => {
      transactionRepository.findById.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/transactions/nonexistent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 403 when accessing another user transaction', async () => {
      transactionRepository.findById.mockResolvedValue({
        id: transactionId,
        user_id: 'other-user-id',
        amount: '50.00',
        type: 'expense',
      });

      const res = await request(app)
        .get(`/api/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTHORIZATION_ERROR');
    });
  });
});
