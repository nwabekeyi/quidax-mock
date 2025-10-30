const mongoose = require('mongoose');
const User = require('../models/user');
const Wallet = require('../models/wallet');
const { v4: uuidv4 } = require('uuid');

/** Supported currencies — Quidax-like */
const SUPPORTED_CURRENCIES = ['NGN', 'BTC', 'ETH', 'USDT', 'BNB', 'TRX'];

/**
 * Create a subaccount (mock) — wrapped in a transaction
 */
async function createUser(req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { email, first_name, last_name } = req.body;
    if (!email || !first_name || !last_name) {
      await session.abortTransaction();
      session.endSession();
      return res.status(422).json({
        status: 'error',
        message: 'Validation failed',
        data: {
          code: '422',
          message: "Required parameter 'email', 'firstName' or 'lastName' missing",
        },
      });
    }

    // Generate both IDs (Quidax-style)
    const quidaxAccountId = Math.floor(Math.random() * 1e9).toString();
    const quidaxSnId = `QDX-SUB-${Math.floor(Math.random() * 100000)}`;
    const reference = `REF-${uuidv4().slice(0, 8).toUpperCase()}`;

    // ─────────────────────────────────────────────
    // Step 1: Create User inside transaction
    // ─────────────────────────────────────────────
    const user = new User({
      email,
      first_name,
      last_name,
      quidaxAccountId,
      quidaxSnId,
      reference,
    });
    await user.save({ session });

    // ─────────────────────────────────────────────
    // Step 2: Create Wallets for all supported currencies
    // ─────────────────────────────────────────────
    const walletDocs = SUPPORTED_CURRENCIES.map(currency => {
      const isFiat = currency === 'NGN';
      return {
        quidaxWalletId: `qax_${Date.now()}_${currency}_${uuidv4().slice(0, 8)}`,
        name: `${currency} Wallet`,
        currency,
        balance: 0,
        locked: 0,
        staked: 0,
        reference_currency: 'usd',
        is_crypto: !isFiat,
        blockchain_enabled: !isFiat,
        default_network: isFiat ? 'bank_transfer' : 'mainnet',
        networks: isFiat
          ? []
          : [
              {
                id: `${currency.toLowerCase()}_mainnet`,
                name: 'Mainnet',
                deposits_enabled: true,
                withdraws_enabled: true,
              },
            ],
        deposit_address: isFiat ? '' : `${currency.toLowerCase()}_addr_${uuidv4().slice(0, 10)}`,
        destination_tag: '',
        user: user._id,
      };
    });

    await Wallet.insertMany(walletDocs, { session });

    // ─────────────────────────────────────────────
    // Step 3: Commit transaction
    // ─────────────────────────────────────────────
    await session.commitTransaction();
    session.endSession();

    // ─────────────────────────────────────────────
    // Step 4: Build response
    // ─────────────────────────────────────────────
    const responseWallets = walletDocs.map(w => ({
      id: w.quidaxWalletId,
      name: w.name,
      currency: w.currency,
      balance: w.balance.toFixed(1),
      locked: w.locked.toFixed(1),
      staked: w.staked.toFixed(1),
      reference_currency: w.reference_currency,
      is_crypto: w.is_crypto,
      blockchain_enabled: w.blockchain_enabled,
      default_network: w.default_network,
      networks: w.networks,
      deposit_address: w.deposit_address,
      destination_tag: w.destination_tag,
    }));

    return res.status(201).json({
      status: 'success',
      message: 'Subaccount created successfully',
      data: {
        id: quidaxAccountId,
        sn: quidaxSnId,
        reference,
        wallets: responseWallets,
        user: {
          id: user._id,
          email,
          first_name,
          last_name,
        },
        created_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Create user error:', err);
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      data: {},
    });
  }
}

/**
 * Fetch user by quidaxAccountId or 'me'
 */
async function getUser(userId) {
  if (userId === 'me') {
    return User.findOne().exec();
  }
  return User.findOne({ quidaxAccountId: userId }).exec();
}

module.exports = { createUser, getUser };
