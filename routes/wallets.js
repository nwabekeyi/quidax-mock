// routes/wallet.js
const express = require('express');
const router = express.Router();
const walletService = require('../services/wallet');

// // Create wallet
// router.post('/:userId/wallets', walletService.createWallet);

// Get all wallets for user
router.get('/:userId/wallets', walletService.getWallets);

module.exports = router;
