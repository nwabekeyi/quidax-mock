// utils/createUser.js or wherever this is
const mongoose = require('mongoose');
const User = require('../models/user');
const Wallet = require('../models/wallet');
const { v4: uuidv4 } = require('uuid');

const ALLOWED_CURRENCIES = [
  'btc', 'usdt', 'usdc', 'eth', 'bnb', 'doge', 'xrp', 'sol', 'link', 'trx', 'ngn', 'usd'
];

// CORRECT NETWORK MAPPING — THIS IS THE TRUTH
const NETWORK_MAP = {
  btc: 'btc',
  eth: 'erc20',
  usdt: 'trc20',
  usdc: 'trc20',
  bnb: 'bep20',
  doge: 'doge',
  trx: 'trx',
  sol: 'sol',
  link: 'erc20',
  xrp: null,     // ← REQUIRES TAG, NO NETWORK
  ngn: null,     // ← FIAT
  usd: null,     // ← FIAT
};

async function createUser(req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { email, first_name, last_name } = req.body;

    if (!email || !first_name || !last_name) {
      await session.abortTransaction();
      return res.status(422).json({
        status: 'error',
        message: 'Missing required fields',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail }).session(session);
    if (existingUser) {
      await session.abortTransaction();
      return res.status(409).json({
        status: 'error',
        message: 'User already exists',
        data: { email: normalizedEmail },
      });
    }

    // Generate IDs
    const quidaxAccountId = Math.floor(Math.random() * 1e9).toString();
    const quidaxSnId = `QDX-SUB-${Math.floor(Math.random() * 100000)}`;
    const reference = `REF-${uuidv4().slice(0, 8).toUpperCase()}`;

    // Create user
    const user = new User({
      email: normalizedEmail,
      first_name,
      last_name,
      quidaxAccountId,
      quidaxSnId,
      reference,
    });
    await user.save({ session });

    // Create wallets with CORRECT network
    for (const currency of ALLOWED_CURRENCIES) {
      const isFiat = ['ngn', 'usd'].includes(currency);
      const network = NETWORK_MAP[currency] || 'trc20';

      const wallet = new Wallet({
        quidaxWalletId: `${quidaxAccountId}-${currency}`,
        user: user._id,
        currency,
        balance: 0,
        isCrypto: !isFiat,
        blockchain_enabled: !isFiat,
        default_network: isFiat || currency === 'xrp' ? null : network,
        name: currency.toUpperCase(),
      });

      await wallet.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      status: 'success',
      message: 'User created with wallets',
      data: {
        id: quidaxAccountId,
        sn: quidaxSnId,
        reference,
        user: {
          id: user._id.toString(),
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
        },
        created_at: user.createdAt?.toISOString() || new Date().toISOString(),
      },
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    console.error('Create user error:', err);

    if (err.code === 11000) {
      return res.status(409).json({
        status: 'error',
        message: 'Email already in use',
      });
    }

    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
}

async function getUser(userId) {
  if (userId === 'me') return User.findOne().exec();
  return User.findOne({ quidaxAccountId: userId }).exec();
}

module.exports = { createUser, getUser };