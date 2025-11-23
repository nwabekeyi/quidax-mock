// routes/mock-quidax.js
const express = require('express');
const router = express.Router();
const PaymentAddressService = require('../services/paymentAddress');
const paymentCreationWebhook = require('../services/paymentAddressWebhook');
const User = require('../models/user');

// ======================================
// GET /users/:userId/wallets/:currency/address
// → Returns real address from DB (matches Quidax format)
// ======================================
router.get('/:userId/wallets/:currency/address', async (req, res) => {
  const { userId, currency } = req.params;

  try {
    const user = await User.findOne({ quidaxAccountId: userId });
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: `User not found with quidaxAccountId: ${userId}`,
      });
    }

    const result = await PaymentAddressService.getPaymentAddress(user._id, currency);

    if (!result.success) {
      return res.status(result.status).json({
        status: 'error',
        message: result.message,
      });
    }

    // This EXACTLY matches IPaymentAddress + passes isPaymentAddress()
    res.json({
      status: 'success',
      message: 'Payment address retrieved successfully',
      data: result.data,
    });
  } catch (err) {
    console.error('[Mock Quidax] GET /address error:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// ======================================
// POST /users/:userId/wallets/:currency/addresses
// → Triggers real webhook → saves real address in your DB
// ======================================
router.post('/:userId/wallets/:currency/addresses', async (req, res) => {
  const { userId, currency } = req.params;

  try {
    const user = await User.findOne({ quidaxAccountId: userId });
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: `User not found with quidaxAccountId: ${userId}`,
      });
    }

    const quidaxAddressId = `mock-addr-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const fakeAddress = `T${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`.toUpperCase();

    const payload = {
      event: 'wallet.address.generated',
      data: {
        id: quidaxAddressId,
        reference: null,
        currency: currency.toLowerCase(),
        address: fakeAddress,
        network: 'trc20',
        destination_tag: null,
        total_payments: '0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user: {
          id: userId,
          email: user.email,
          first_name: user.first_name || 'User',
          last_name: user.last_name || '',
        },
      },
    };

    // This calls your REAL webhook service → saves to real DB
    await paymentCreationWebhook.handleWalletAddressGenerated(payload);

    res.json({
      status: 'success',
      message: 'Address generation triggered and saved',
      data: payload.data,
    });
  } catch (err) {
    console.error('[Mock Quidax] POST /addresses error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;