// services/paymentAddressWebhook.js
const PaymentAddress = require('../models/paymentAdress');
const User = require('../models/user');
const { v4: uuidv4 } = require('uuid');
const { sendWebhookWithRetry } = require('../common/sendWebhookWithRetry');

// ── IN-MEMORY CACHE (survives process lifetime) ──
const webhookCache = new Map(); // key: addressId → webhookPayload
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

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
      destination_tag,
      created_at,
    } = data;

    const now = Date.now();

    try {
      // ── 1. CHECK IN-MEMORY CACHE ──
      const cached = webhookCache.get(addressId);
      if (cached && cached.expires > now) {
        console.log(`[Webhook] Already processed: ${addressId} → resending cached`);
        await this._sendWebhook(cached.payload);
        return;
      }

      // Clean expired entries (optional, runs every call)
      for (const [key, entry] of webhookCache.entries()) {
        if (entry.expires <= now) {
          webhookCache.delete(key);
        }
      }

      // ── 2. FIND LOCAL USER ──
      const localUser = await User.findOne({ quidaxAccountId: quidaxUser.id });
      if (!localUser) {
        console.warn(`[Webhook] User not found: ${quidaxUser.id}`);
        return;
      }

      // ── 3. UPSERT PAYMENT ADDRESS (idempotent)
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
          destination_tag: destination_tag || null,
          createdAt: new Date(created_at),
        });
        await paymentAddress.save();
        console.log(`[Webhook] Saved: ${address} (${currency})`);
      } else {
        console.log(`[Webhook] Already exists: ${address} (${currency})`);
      }

      // ── 4. BUILD PAYLOAD ONCE ──
      const webhookPayload = {
        event: 'wallet.address.generated',
        data: {
          id: addressId,
          currency,
          address,
          network,
          user: { id: quidaxUser.id },
          destination_tag: destination_tag || null,
          created_at: new Date(created_at).toISOString(),
        },
      };

      // ── 5. CACHE IN MEMORY ──
      webhookCache.set(addressId, {
        payload: webhookPayload,
        expires: now + CACHE_TTL_MS,
      });

      // ── 6. SEND WITH RETRY ──
      const webhookUrl = process.env.WALLET_WEBHOOK_URL;
      if (!webhookUrl) {
        console.error('[Webhook] WALLET_WEBHOOK_URL not set');
        return;
      }

      await this._sendWebhook(webhookPayload, webhookUrl);
      console.log(`[Webhook] Sent → ${webhookUrl}`);
    } catch (err) {
      console.error('[Webhook] Handler error:', err);
      throw err;
    }
  }

  // ── Helper: Send webhook (used for first send and retries) ──
  static async _sendWebhook(payload, url = process.env.WALLET_WEBHOOK_URL) {
    await sendWebhookWithRetry(
      url,
      payload,
      'PaymentAddress',
      payload.data.id,
      payload.data.id
    ).catch((err) => {
      console.error('[Webhook] Final retry failed:', err);
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