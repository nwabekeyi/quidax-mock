const PaymentAdress = require('../models/paymentAdress');
const { v4: uuidv4 } = require('uuid');
const userService = require('./user');

async function createPaymentAddress(req, res) {
  try {
    const { userId } = req.params;
    const { currency } = req.body;

    if (!currency) {
      return res.status(400).json({
        status: 'error',
        message: 'Currency is required',
        data: {},
      });
    }

    const user = await userService.getUser(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
        data: {},
      });
    }

    // Create wallet in DB
    const wallet = new Wallet({
      quidaxWalletId: uuidv4(),
      name: `${currency.toUpperCase()} Wallet`,
      currency: currency.toLowerCase(),
      user: user._id,
    });
    await wallet.save();

    const now = new Date().toISOString();

    const responseData = {
      id: wallet._id.toString(),
      name: wallet.name,
      currency: wallet.currency,
      balance: wallet.balance.toFixed(8),
      locked: wallet.locked.toFixed(8),
      staked: wallet.staked.toFixed(8),
      converted_balance: "0.00000000",
      reference_currency: wallet.reference_currency,
      is_crypto: wallet.is_crypto,
      created_at: wallet.createdAt.toISOString(),
      updated_at: now,
      blockchain_enabled: wallet.blockchain_enabled,
      default_network: wallet.default_network,
      networks: wallet.networks,
      deposit_address: wallet.deposit_address,
      destination_tag: wallet.destination_tag,
      user: {
        id: user.quidaxId,
        sn: user.reference,
        email: user.email,
        reference: user.reference || null,
        first_name: user.first_name,
        last_name: user.last_name,
        display_name: `${user.first_name} ${user.last_name}`,
        created_at: user.createdAt.toISOString(),
        updated_at: now,
      },
    };

    return res.status(201).json({
      status: 'success',
      message: 'Wallet created successfully',
      data: responseData,
    });
  } catch (err) {
    console.error('Wallet creation error:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      data: {},
    });
  }
}

module.exports = { createPaymentAddress };
