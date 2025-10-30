const express = require('express');
const router = express.Router();
const walletService = require('../services/wallet');

// POST /users/me/wallet → create wallet for main authenticated user
router.post('/me/wallet', async (req, res) => {
  req.params.userId = 'me';
  await walletService.createWallet(req, res);
});

// POST /users/:userId/wallet → create wallet for subaccount
router.post('/:userId/wallet', async (req, res) => {
  await walletService.createWallet(req, res);
});

module.exports = router;
