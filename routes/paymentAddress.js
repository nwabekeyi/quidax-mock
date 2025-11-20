// routes/paymentAddress.js
const express = require('express');
const router = express.Router();
const PaymentAddressService = require('../services/paymentAddress');

// GET /users/:userId/wallets/:currency/address
router.get('/:userId/wallets/:currency/address', async (req, res) => {
  const { userId, currency } = req.params;

  const result = await PaymentAddressService.getPaymentAddress(userId, currency);

  if (!result.success) {
    return res.status(result.status).send(`Cannot GET /users/${userId}/wallets/${currency}/address`);
  }

  res.json({
    status: 'success',
    data: result.data,
  });
});

module.exports = router;