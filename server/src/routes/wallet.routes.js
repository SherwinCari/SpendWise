'use strict';

const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createWalletSchema, transferSchema } = require('../validators/wallet.validator');
const walletService = require('../services/wallet.service');

const router = Router();

// POST /api/wallets — Create a new wallet
router.post('/', authenticate, validate(createWalletSchema), async (req, res, next) => {
  try {
    const wallet = await walletService.create(req.userId, req.body);
    res.status(201).json({ success: true, wallet });
  } catch (err) {
    next(err);
  }
});

// GET /api/wallets — List all wallets for the authenticated user
router.get('/', authenticate, async (req, res, next) => {
  try {
    const wallets = await walletService.list(req.userId);
    res.status(200).json({ success: true, wallets });
  } catch (err) {
    next(err);
  }
});

// PUT /api/wallets/:id — Update wallet name
router.put('/:id', authenticate, validate(createWalletSchema), async (req, res, next) => {
  try {
    const wallet = await walletService.update(req.userId, req.params.id, req.body);
    res.status(200).json({ success: true, wallet });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/wallets/:id — Delete a wallet
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await walletService.delete(req.userId, req.params.id);
    res.status(200).json({ success: true, message: 'Wallet deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/wallets/transfer — Transfer funds between wallets
router.post('/transfer', authenticate, validate(transferSchema), async (req, res, next) => {
  try {
    const result = await walletService.transfer(req.userId, req.body);
    res.status(200).json({ success: true, transfer: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
