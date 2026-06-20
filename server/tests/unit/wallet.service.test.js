'use strict';

jest.mock('../../src/repositories/wallet.repository', () => ({
  create: jest.fn(),
  findByUserId: jest.fn(),
  findById: jest.fn(),
  updateName: jest.fn(),
  updateBalance: jest.fn(),
  delete: jest.fn(),
  hasTransactions: jest.fn(),
}));

jest.mock('../../src/config/database', () => ({
  getClient: jest.fn(),
}));

const walletRepository = require('../../src/repositories/wallet.repository');
const { getClient } = require('../../src/config/database');
const walletService = require('../../src/services/wallet.service');
const {
  ConflictError,
  InsufficientFundsError,
  ValidationError,
  NotFoundError,
} = require('../../src/utils/errors');

describe('Wallet Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('delete', () => {
    // Req 10.4: Deletion rejected when wallet has transactions
    it('should reject deletion when wallet has associated transactions', async () => {
      const mockWallet = { id: 'wallet-1', user_id: 'user-1', balance: '0.00' };
      walletRepository.findById.mockResolvedValue(mockWallet);
      walletRepository.hasTransactions.mockResolvedValue(true);

      await expect(
        walletService.delete('user-1', 'wallet-1')
      ).rejects.toThrow(ConflictError);

      expect(walletRepository.hasTransactions).toHaveBeenCalledWith('wallet-1');
      expect(walletRepository.delete).not.toHaveBeenCalled();
    });

    // Req 10.4: Deletion rejected when wallet has non-zero balance
    it('should reject deletion when wallet has non-zero balance', async () => {
      const mockWallet = { id: 'wallet-1', user_id: 'user-1', balance: '150.00' };
      walletRepository.findById.mockResolvedValue(mockWallet);
      walletRepository.hasTransactions.mockResolvedValue(false);

      await expect(
        walletService.delete('user-1', 'wallet-1')
      ).rejects.toThrow(ConflictError);

      expect(walletRepository.delete).not.toHaveBeenCalled();
    });

    it('should successfully delete wallet with zero balance and no transactions', async () => {
      const mockWallet = { id: 'wallet-1', user_id: 'user-1', balance: '0.00' };
      walletRepository.findById.mockResolvedValue(mockWallet);
      walletRepository.hasTransactions.mockResolvedValue(false);
      walletRepository.delete.mockResolvedValue(true);

      await walletService.delete('user-1', 'wallet-1');

      expect(walletRepository.delete).toHaveBeenCalledWith('wallet-1');
    });

    it('should throw NotFoundError when wallet does not exist', async () => {
      walletRepository.findById.mockResolvedValue(null);

      await expect(
        walletService.delete('user-1', 'nonexistent')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('transfer', () => {
    const mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    beforeEach(() => {
      getClient.mockResolvedValue(mockClient);
      mockClient.query.mockResolvedValue({ rows: [] });
    });

    // Req 10.5: Transfer rejects insufficient funds
    it('should reject transfer when source has insufficient funds', async () => {
      const sourceWallet = { id: 'wallet-1', user_id: 'user-1', balance: '50.00' };
      const destWallet = { id: 'wallet-2', user_id: 'user-1', balance: '100.00' };
      walletRepository.findById
        .mockResolvedValueOnce(sourceWallet)
        .mockResolvedValueOnce(destWallet);

      await expect(
        walletService.transfer('user-1', {
          sourceWalletId: 'wallet-1',
          destinationWalletId: 'wallet-2',
          amount: 75,
        })
      ).rejects.toThrow(InsufficientFundsError);

      expect(mockClient.query).not.toHaveBeenCalled();
    });

    // Transfer rejects same source and destination wallet
    it('should reject transfer when source and destination are the same wallet', async () => {
      await expect(
        walletService.transfer('user-1', {
          sourceWalletId: 'wallet-1',
          destinationWalletId: 'wallet-1',
          amount: 50,
        })
      ).rejects.toThrow(ValidationError);

      expect(walletRepository.findById).not.toHaveBeenCalled();
    });

    it('should reject transfer with zero amount', async () => {
      await expect(
        walletService.transfer('user-1', {
          sourceWalletId: 'wallet-1',
          destinationWalletId: 'wallet-2',
          amount: 0,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should reject transfer with negative amount', async () => {
      await expect(
        walletService.transfer('user-1', {
          sourceWalletId: 'wallet-1',
          destinationWalletId: 'wallet-2',
          amount: -10,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should execute successful transfer and return updated balances', async () => {
      const sourceWallet = { id: 'wallet-1', user_id: 'user-1', balance: '200.00' };
      const destWallet = { id: 'wallet-2', user_id: 'user-1', balance: '100.00' };
      walletRepository.findById
        .mockResolvedValueOnce(sourceWallet)
        .mockResolvedValueOnce(destWallet);

      const result = await walletService.transfer('user-1', {
        sourceWalletId: 'wallet-1',
        destinationWalletId: 'wallet-2',
        amount: 75,
      });

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(result.sourceWallet.balance).toBe(125);
      expect(result.destinationWallet.balance).toBe(175);
      expect(result.amount).toBe(75);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback transaction on database error', async () => {
      const sourceWallet = { id: 'wallet-1', user_id: 'user-1', balance: '200.00' };
      const destWallet = { id: 'wallet-2', user_id: 'user-1', balance: '100.00' };
      walletRepository.findById
        .mockResolvedValueOnce(sourceWallet)
        .mockResolvedValueOnce(destWallet);

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('DB error')); // UPDATE fails

      await expect(
        walletService.transfer('user-1', {
          sourceWalletId: 'wallet-1',
          destinationWalletId: 'wallet-2',
          amount: 50,
        })
      ).rejects.toThrow('DB error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
