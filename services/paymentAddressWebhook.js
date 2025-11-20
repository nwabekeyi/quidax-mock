// services/paymentAddressWebhook.js
const PaymentAddress = require('../models/paymentAdress');
const User = require('../models/user');
const { v4: uuidv4 } = require('uuid');
const { sendWebhookWithRetry } = require('../common/sendWebhookWithRetry');
const WebhookEvent = require('../models/webhookEvent');

// In-memory cache
const webhookCache = new Map();
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

class PaymentAddressService {
  static async handleWalletAddressGenerated(payload) {
    const { event, data } = payload;

    if (event !== 'wallet.address.generated') {
      console.log(`[Webhook] Ignored event: ${event}`);
      return;
    }

    const {
      id: addressId,
      currency,
      address,
      network,
      user: quidaxUser,
      destination_tag: rawTag, // ← raw from Quidax
      created_at,
    } = data;

    const now = Date.now();

    try {
      // 1. CHECK CACHE
      const cached = webhookCache.get(addressId);
      if (cached && cached.expires > now) {
        console.log(`[Webhook] Resending cached: ${addressId}`);
        await this._sendWebhook(cached.payload, cached.webhookEvent);
        return;
      }

      // Clean expired
      for (const [key, entry] of webhookCache.entries()) {
        if (entry.expires <= now) webhookCache.delete(key);
      }

      // 2. FIND USER
      const localUser = await User.findOne({ quidaxAccountId: quidaxUser.id });
      if (!localUser) {
        console.warn(`[Webhook] User not found: ${quidaxUser.id}`);
        return;
      }

      // 3. UPSERT PAYMENT ADDRESS
      let paymentAddress = await PaymentAddress.findOne({ quidaxWalletId: addressId });

      if (!paymentAddress) {
        paymentAddress = new PaymentAddress({
          quidaxWalletId: addressId,
          name: `${currency.toUpperCase()} Wallet`,
          currency: currency.toLowerCase(),
          balance: 0,
          locked: 0,
          staked: 0,
          reference_currency: 'usd',
          is_crypto: true,
          blockchain_enabled: true,
          default_network: network,
          networks: [
            {
              id: network,
              name: this._getNetworkName(network),
              deposits_enabled: true,
              withdraws_enabled: true,
            },
          ],
          user: localUser._id,
          deposit_address: address,
          destination_tag: rawTag || null,
          createdAt: new Date(created_at),
        });
        await paymentAddress.save();
        console.log(`[Webhook] Saved: ${address} (${currency})`);
      } else {
        console.log(`[Webhook] Exists: ${address} (${currency})`);
      }

      // 4. BUILD PAYLOAD WITH VALID destination_tag
      const destination_tag = rawTag !== null && rawTag !== undefined ? rawTag : '0';

      const webhookPayload = {
        event: 'wallet.address.generated',
        data: {
          id: addressId,
          currency,
          address,
          network,
          user: { id: quidaxUser.id },
          destination_tag, // ← ALWAYS a string: tag or "0"
          created_at: new Date(created_at).toISOString(),
        },
      };

      // 5. SAVE WEBHOOK EVENT
      const webhookEvent = new WebhookEvent({
        url: process.env.WALLET_WEBHOOK_URL,
        payload: webhookPayload,
        resourceType: 'PaymentAddress',
        resourceId: paymentAddress._id,
        eventId: addressId,
        status: 'pending',
        attempts: 0,
      });
      await webhookEvent.save();

      // 6. CACHE
      webhookCache.set(addressId, {
        payload: webhookPayload,
        webhookEvent,
        expires: now + CACHE_TTL_MS,
      });

      // 7. SEND
      const webhookUrl = process.env.WALLET_WEBHOOK_URL;
      if (!webhookUrl) {
        console.error('[Webhook] WALLET_WEBHOOK_URL not set');
        return;
      }

      await this._sendWebhook(webhookPayload, webhookEvent, webhookUrl);
      console.log(`[Webhook] Sent → ${webhookUrl}`);
    } catch (err) {
      console.error('[Webhook] Handler error:', err);
      throw err;
    }
  }

  static async _sendWebhook(payload, webhookEvent, url = process.env.WALLET_WEBHOOK_URL) {
    await sendWebhookWithRetry(
      url,
      payload,
      'PaymentAddress',
      webhookEvent._id.toString(),
      webhookEvent.eventId
    ).catch(async (err) => {
      console.error('[Webhook] Final retry failed:', err);
      webhookEvent.status = 'failed';
      webhookEvent.lastError = err.message;
      webhookEvent.failedAt = new Date();
      await webhookEvent.save();
    });
  }

  static _getNetworkName(network) {
    const map = {
      trc20: 'TRON (TRC20)',
      erc20: 'Ethereum (ERC20)',
      bep20: 'Binance Smart Chain (BEP20)',
    };
    return map[network?.toLowerCase()] || network?.toUpperCase();
  }
}

module.exports = PaymentAddressService;