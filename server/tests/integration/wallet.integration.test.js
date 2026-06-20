'use strict';

// Set env vars before requiring modules
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';

// Mock the database module
jest.mock('../../src/config/database', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };
  return {
    query: jest.fn(),
    getClient: jest.fn(() => Promise.resolve(mockClient)),
    __mockClient: mockClient,
  };
});

// Mock repositories
jest.mock('../../src/repositories/wallet.repository', () => ({
  create: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  updateName: jest.fn(),
  updateBalance: jest.fn(),
  delete: jest.fn(),
  hasTransactions: jest.fn(),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const walletRepository = require('../../src/repositories/wallet.repository');
const { getClient, __mockClient } = require('../../src/config/database');
const app = require('../../index');

describe('Wallet Integration - Transfer → Verify Linked Transactions', () => {
  const userId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const sourceWalletId = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
  const destWalletId = 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66';

  let accessToken;

  beforeAll(() => {
    accessToken = jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    __mockClient.query.mockResolvedValue({ rows: [] });
  });

  describe('Successful Transfer Flow', () => {
    it('should transfer funds between wallets and verify both balances updated', async () => {
      // Setup source wallet with $1000
      const sourceWallet = {
        id: sourceWalletId,
        user_id: userId,
        name: 'Checking Account',
        balance: '1000.00',
        created_at: '2024-01-01T00:00:00.000Z',
      };

      // Setup destination wallet with $500
      const destWallet = {
        id: destWalletId,
        user_id: userId,
        name: 'Savings Account',
        balance: '500.00',
        created_at: '2024-01-01T00:00:00.000Z',
      };

      walletRepository.findById
        .mockResolvedValueOnce(sourceWallet)   // Find source wallet
        .mockResolvedValueOnce(destWallet);    // Find destination wallet

      // Mock the DB transaction client
      __mockClient.query.mockResolvedValue({ rows: [] });

      const transferRes = await request(app)
        .post('/api/wallets/transfer')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          sourceWalletId: sourceWalletId,
          destinationWalletId: destWalletId,
          amount: 300,
        })
        .expect(200);

      expect(transferRes.body.success).toBe(true);
      expect(transferRes.body.transfer).toBeDefined();
      expect(transferRes.body.transfer.sourceWallet.id).toBe(sourceWalletId);
      expect(transferRes.body.transfer.sourceWallet.balance).toBe(700); // 1000 - 300
      expect(transferRes.body.transfer.destinationWallet.id).toBe(destWalletId);
      expect(transferRes.body.transfer.destinationWallet.balance).toBe(800); // 500 + 300
      expect(transferRes.body.transfer.amount).toBe(300);

      // Verify DB transaction was used (BEGIN/COMMIT)
      expect(__mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(__mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(__mockClient.release).toHaveBeenCalled();
    });

    it('should verify total balance conservation across wallets', async () => {
      const sourceBalance = 2000;
      const destBalance = 800;
      const transferAmount = 750;
      const totalBefore = sourceBalance + destBalance;

      walletRepository.findById
        .mockResolvedValueOnce({
          id: sourceWalletId,
          user_id: userId,
          name: 'Source',
          balance: sourceBalance.toString(),
        })
        .mockResolvedValueOnce({
          id: destWalletId,
          user_id: userId,
          name: 'Destination',
          balance: destBalance.toString(),
        });

      __mockClient.query.mockResolvedValue({ rows: [] });

      const res = await request(app)
        .post('/api/wallets/transfer')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          sourceWalletId: sourceWalletId,
          destinationWalletId: destWalletId,
          amount: transferAmount,
        })
        .expect(200);

      const sourceAfter = res.body.transfer.sourceWallet.balance;
      const destAfter = res.body.transfer.destinationWallet.balance;
      const totalAfter = sourceAfter + destAfter;

      // Total balance should be conserved
      expect(totalAfter).toBe(totalBefore);
      expect(sourceAfter).toBe(sourceBalance - transferAmount);
      expect(destAfter).toBe(destBalance + transferAmount);
    });
  });

  describe('Transfer Validation Errors', () => {
    it('should reject transfer to the same wallet', async () => {
      walletRepository.findById.mockResolvedValue({
        id: sourceWalletId,
        user_id: userId,
        name: 'Same Wallet',
        balance: '1000.00',
      });

      const res = await request(app)
        .post('/api/wallets/transfer')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          sourceWalletId: sourceWalletId,
          destinationWalletId: sourceWalletId,
          amount: 100,
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject transfer with insufficient funds', async () => {
      walletRepository.findById
        .mockResolvedValueOnce({
          id: sourceWalletId,
          user_id: userId,
          name: 'Source',
          balance: '100.00',
        })
        .mockResolvedValueOnce({
          id: destWalletId,
          user_id: userId,
          name: 'Destination',
          balance: '500.00',
        });

      const res = await request(app)
        .post('/api/wallets/transfer')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          sourceWalletId: sourceWalletId,
          destinationWalletId: destWalletId,
          amount: 200,
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_FUNDS');
    });

    it('should reject transfer with amount <= 0', async () => {
      const res = await request(app)
        .post('/api/wallets/transfer')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          sourceWalletId: sourceWalletId,
          destinationWalletId: destWalletId,
          amount: 0,
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject transfer without authentication', async () => {
      const res = await request(app)
        .post('/api/wallets/transfer')
        .send({
          sourceWalletId: sourceWalletId,
          destinationWalletId: destWalletId,
          amount: 100,
        })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should reject transfer when source wallet not found', async () => {
      walletRepository.findById.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/wallets/transfer')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          sourceWalletId: 'a1111111-1111-1111-1111-111111111111',
          destinationWalletId: destWalletId,
          amount: 100,
        })
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Wallet CRUD Operations', () => {
    it('should create a wallet with initial balance', async () => {
      walletRepository.create.mockResolvedValue({
        id: 'new-wallet-id',
        user_id: userId,
        name: 'Emergency Fund',
        balance: '1000.00',
        created_at: '2024-03-15T00:00:00.000Z',
      });

      const res = await request(app)
        .post('/api/wallets')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Emergency Fund',
          balance: 1000,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.wallet.name).toBe('Emergency Fund');
      expect(res.body.wallet.balance).toBe('1000.00');
    });

    it('should list all user wallets', async () => {
      walletRepository.findByUserId.mockResolvedValue([
        { id: sourceWalletId, user_id: userId, name: 'Checking', balance: '1000.00' },
        { id: destWalletId, user_id: userId, name: 'Savings', balance: '5000.00' },
      ]);

      const res = await request(app)
        .get('/api/wallets')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.wallets).toHaveLength(2);
      expect(res.body.wallets[0].name).toBe('Checking');
      expect(res.body.wallets[1].name).toBe('Savings');
    });

    it('should reject wallet deletion when wallet has transactions', async () => {
      walletRepository.findById.mockResolvedValue({
        id: sourceWalletId,
        user_id: userId,
        name: 'Checking',
        balance: '0.00',
      });
      walletRepository.hasTransactions.mockResolvedValue(true);

      const res = await request(app)
        .delete(`/api/wallets/${sourceWalletId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('should reject wallet deletion when balance is non-zero', async () => {
      walletRepository.findById.mockResolvedValue({
        id: sourceWalletId,
        user_id: userId,
        name: 'Checking',
        balance: '500.00',
      });
      walletRepository.hasTransactions.mockResolvedValue(false);

      const res = await request(app)
        .delete(`/api/wallets/${sourceWalletId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
    });
  });
});
