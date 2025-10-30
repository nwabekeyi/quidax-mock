const express = require('express');
const router = express.Router();
const walletService = require('../services/wallet');

// Mock create wallet address
router.post('/:userId/wallets/:currency/addresses', async (req, res) => {
  await walletService.createPaymentAddress(req, res);
});

module.exports = router;
