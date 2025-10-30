// services/wallet.js
const Wallet = require('../models/wallet');
const userService = require('./user');

async function getWallets(req, res) {
  try {
    const { userId } = req.params;
    const user = await userService.getUser(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
        data: {},
      });
    }

    const wallets = await Wallet.find({ user: user._id }).lean();
    if (!wallets.length) {
      return res.status(404).json({
        status: 'error',
        message: 'No wallets found for this user',
        data: [],
      });
    }

    const data = wallets.map(w => ({
      id: w.quidaxWalletId,
      currency: w.currency.toUpperCase(),
      balance: w.balance.toFixed(8),
      is_default: w.currency.toLowerCase() === 'ngn',
      metadata: {},
    }));

    return res.status(200).json({
      status: 'success',
      message: 'Wallets retrieved successfully',
      data,
    });
  } catch (err) {
    console.error('Error fetching wallets:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      data: {},
    });
  }
}

module.exports = { getWallets };
