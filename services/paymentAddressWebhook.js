// services/paymentAddressWebhook.js
const PaymentAddress = require('../models/paymentAdress');
const Wallet = require('../models/wallet');
const User = require('../models/user');
const WebhookEvent = require('../models/webhookEvent');
const { sendWebhookWithRetry } = require('../common/sendWebhookWithRetry');

const webhookCache = new Map();
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Tokens that use destination tag
const TAGGED_TOKENS = new Set(['xrp', 'xlm']);

// YOUR SOURCE OF TRUTH — WE DECIDE THE NETWORKS
const CURRENCY_NETWORKS = {
  btc: ['btc'],
  eth: ['erc20'],
  usdt: ['trc20', 'erc20', 'bep20'],     // ← YOU SUPPORT THESE
  usdc: ['erc20', 'trc20'],
  bnb: ['bep20'],
  doge: ['doge'],
  trx: ['trx'],
  sol: ['sol'],
  link: ['erc20'],
  xrp: [],      // ← uses tag, no network
  ngn: [],      // ← fiat
  usd: [],      // ← fiat
};

// REAL-LOOKING ADDRESS GENERATOR
const generateAddress = (network, currency) => {
  const rand = () => Math.random().toString(36).substring(2);
  const hex = () => Math.random().toString(16).substring(2);

  switch (network) {
    case 'trc20':
    case 'trx':
      return `T${rand().toUpperCase().substring(0, 33)}`;
    case 'erc20':
    case 'bep20':
      return `0x${hex().substring(0, 40)}`;
    case 'btc':
      return `bc1q${rand().substring(0, 39)}`;
    case 'sol':
      return `${rand()}${rand()}`.substring(0, 44);
    case 'doge':
      return `D${rand().toUpperCase().substring(0, 33)}`;
    default:
      return address; // fallback
  }
};

class PaymentAddressService {
  static async handleWalletAddressGenerated(payload) {
    const safeISO = (d) => (d ? new Date(d).toISOString() : new Date().toISOString());

    const { event, data } = payload;
    if (event !== 'wallet.address.generated') return;

    const {
      id: addressId,
      currency,
      address: quidaxAddress,
      user: quidaxUser,
      destination_tag: rawTag,
    } = data;

    const now = Date.now();

    try {
      // 1. Prevent duplicate processing
      if (webhookCache.has(addressId)) {
        console.log(`[Webhook] Already processed: ${addressId}`);
        return;
      }

      // 2. Find local user
      const localUser = await User.findOne({ quidaxAccountId: quidaxUser.id });
      if (!localUser) {
        console.warn(`[Webhook] User not found: ${quidaxUser.id}`);
        return;
      }

      const currencyLower = currency.toLowerCase();
      const requiresTag = TAGGED_TOKENS.has(currencyLower);
      const networks = CURRENCY_NETWORKS[currencyLower] || [];

      // 3. Find wallet
      const wallet = await Wallet.findOne({
        user: localUser._id,
        currency: currencyLower,
      });
      if (!wallet) {
        console.error(`[Webhook] Wallet not found: ${currencyLower}`);
        return;
      }

      // 4. Create ONE payment address per network we support
      for (const network of networks) {
        const fakeAddress = generateAddress(network, currencyLower);

        const entry = {
          wallet: wallet._id,
          user: localUser._id,
          currency: currencyLower,
          network,
          deposit_address: fakeAddress,
          destination_tag: null,
          active: true,
        };

        let paymentAddress = await PaymentAddress.findOne({
          wallet: wallet._id,
          currency: currencyLower,
          network,
        });

        if (!paymentAddress) {
          paymentAddress = new PaymentAddress(entry);
          await paymentAddress.save();
          console.log(`[Webhook] Created: ${currencyLower} → ${network} → ${fakeAddress}`);
        }

        // 5. Build webhook payload (one per network)

        const webhookPayload = {
          event: 'wallet.address.generated',
          data: {
            id: `${addressId}-${network}`, // unique per network
            reference: wallet.reference || null,
            currency: currencyLower,
            address: paymentAddress.deposit_address,
            network: paymentAddress.network,
            destination_tag: null,
            total_payments: 0,
            user: {
              id: localUser.quidaxAccountId,
              sn: localUser.quidaxSnId || null,
              email: localUser.email,
              reference: localUser.reference || null,
              first_name: localUser.first_name || '',
              last_name: localUser.last_name || '',
              display_name: localUser.display_name || null,
              created_at: safeISO(localUser.createdAt),
              updated_at: safeISO(localUser.updatedAt),
            },
            created_at: safeISO(paymentAddress.createdAt),
            updated_at: safeISO(paymentAddress.updatedAt),
          },
        };

        // 6. Save event + send
        const eventKey = `${addressId}-${network}`;
        await WebhookEvent.updateOne(
          { eventId: eventKey },
          {
            $set: {
              url: process.env.WALLET_WEBHOOK_URL,
              payload: webhookPayload,
              resourceType: 'PaymentAddress',
              resourceId: paymentAddress._id,
              status: 'pending',
              attempts: 0,
            },
          },
          { upsert: true }
        );

        webhookCache.set(eventKey, {
          payload: webhookPayload,
          expires: now + CACHE_TTL_MS,
        });

        if (process.env.WALLET_WEBHOOK_URL) {
          this._sendWebhook(webhookPayload);
        }
      }

      // Handle tagged tokens (XRP)
      if (requiresTag) {
        const entry = {
          wallet: wallet._id,
          user: localUser._id,
          currency: currencyLower,
          network: null,
          deposit_address: quidaxAddress,
          destination_tag: rawTag || Math.floor(Math.random() * 1e9).toString(),
          active: true,
        };

        let paymentAddress = await PaymentAddress.findOne({
          wallet: wallet._id,
          currency: currencyLower,
          network: null,
        });

        if (!paymentAddress) {
          paymentAddress = new PaymentAddress(entry);
          await paymentAddress.save();
        }

        const webhookPayload = {
          event: 'wallet.address.generated',
          data: {
            id: addressId,
            currency: currencyLower,
            address: paymentAddress.deposit_address,
            network: null,
            destination_tag: paymentAddress.destination_tag,
            user: { /* same as above */ },
            created_at: safeISO(paymentAddress.createdAt),
            updated_at: safeISO(paymentAddress.updatedAt),
          },
        };

        // ... same webhook logic
      }

      // Mark main event as processed
      webhookCache.set(addressId, { expires: now + CACHE_TTL_MS });

    } catch (err) {
      console.error('[Webhook] Handler error:', err);
    }
  }

  static async _sendWebhook(payload) {
    if (!process.env.WALLET_WEBHOOK_URL) return;
  
    const eventId = payload.data.id;
  
    // get the stored event by eventId
    const webhookEvent = await WebhookEvent.findOne({ eventId });
    if (!webhookEvent) {
      console.error(`[Webhook] No event found for eventId=${eventId}`);
      return;
    }
  
    // Now use REAL mongoId, not payload.data.id
    sendWebhookWithRetry(
      process.env.WALLET_WEBHOOK_URL,
      payload,
      'PaymentAddress',
      webhookEvent._id.toString(),   // ← FIX
      eventId
    ).catch(console.error);
  }
  
}

module.exports = PaymentAddressService;