// services/wallet.js
const Wallet = require('../models/wallet');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const userService = require('./user');
// const { sendWebhookWithRetry } = require('../common/sendWebhookWithRetry'); // REMOVED

/**
 * @typedef {Object} CreatePaymentAddressResponse
 * @property {string} id
 * @property {string} reference
 * @property {string} currency
 * @property {string} address
 * @property {string} network
 * @property {Object} user
 * @property {string|null} destination_tag
 * @property {string|null} total_payments
 * @property {string} created_at
 * @property {string} updated_at
 */

async function createPaymentAddress(req, res) {
  try {
    const { currency } = req.params;
    const userId = req.params.userId || 'me';
    const user = await userService.getUser(userId);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
        data: {},
      });
    }

    // Generate wallet address
    const wallet = new Wallet({
      currency: currency.toLowerCase(),
      address: crypto.randomBytes(16).toString('hex').toUpperCase(),
      network: 'trc20',
      user: user._id,
    });
    await wallet.save();

    // Build response matching CreatePaymentAddressResponse
    const responseData = {
      id: wallet._id.toString(),
      reference: `ref_${uuidv4().split('-')[0]}`, // e.g., ref_8f9a1c2d
      currency: wallet.currency,
      address: wallet.address,
      network: wallet.network,
      user: {
        id: user.quidaxId,
        sn: user.reference,
        email: user.email,
        reference: null,
        first_name: user.firstName,
        last_name: user.lastName,
        created_at: user.createdAt.toISOString(),
        updated_at: new Date().toISOString(),
      },
      destination_tag: null,
      total_payments: '0',
      created_at: wallet.createdAt.toISOString(),
      updated_at: new Date().toISOString(),
    };

    // ──────────────────────────────────────────────────────────────
    // WEBHOOK LOGIC IS DISABLED (commented out)
    // ──────────────────────────────────────────────────────────────
    /*
    const webhookPayload = {
      event: 'wallet.address.generated',
      data: responseData,
    };

    const webhookUrl = process.env.WALLET_WEBHOOK_URL;
    if (webhookUrl) {
      const eventId = `wallet-${wallet._id}-${Date.now()}`;
      sendWebhookWithRetry(webhookUrl, webhookPayload, 'Wallet', wallet._id, eventId);
    }
    */
    // ──────────────────────────────────────────────────────────────

    return res.status(201).json({
      status: 'success',
      message: 'Wallet address created successfully',
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