// services/depositWebhook.service.js
const Deposit = require('../models/deposit');
const Wallet = require('../models/wallet');
const User = require('../models/user');
const WebhookEvent = require('../models/webhookEvent');
const { sendWebhookWithRetry } = require('../common/sendWebhookWithRetry');

const webhookCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

class DepositWebhookService {
  static async handleDepositEvent(payload) {
    const { event, data } = payload;
    if (!event.startsWith('deposit.')) return;
 
    const depositId = data.id;
    const txid = data.txid;

    // Deduplication by Quidax deposit ID
    if (webhookCache.has(depositId)) {
      console.log(`[Deposit] Already processed: ${depositId}`);
      return;
    }

    try {
      const localUser = await User.findOne({ quidaxAccountId: data.wallet.user.id });
      if (!localUser) {
        console.warn(`[Deposit] User not found: ${data.wallet.user.id}`);
        return;
      }

      const wallet = await Wallet.findOne({
        quidaxWalletId: data.wallet.id,
        user: localUser._id,
      });
      if (!wallet) {
        console.error(`[Deposit] Wallet not found: ${data.wallet.id}`);
        return;
      }

      // Find payment address (optional, for network match)
      const paymentAddress = data.payment_address?.address
        ? await require('../models/paymentAddress').findOne({
            deposit_address: data.payment_address.address,
            user: localUser._id,
          })
        : null;

      // Normalize status
      let status = 'pending';
      if (event === 'deposit.transaction.confirmation') status = 'confirmed';
      if (event === 'deposit.successful') status = 'successful';
      if (event === 'deposit.on_hold') status = 'on_hold';
      if (event === 'deposit.failed_aml') status = 'failed_aml';
      if (event === 'deposit.rejected') status = 'rejected';

      // Create or update deposit
      const deposit = await Deposit.findOneAndUpdate(
        { quidaxDepositId: depositId },
        {
          $set: {
            user: localUser._id,
            wallet: wallet._id,
            paymentAddress: paymentAddress?._id || null,
            currency: data.currency.toLowerCase(),
            network: data.payment_address?.network || null,
            amount: data.amount,
            fee: data.fee || '0',
            txid,
            status,
            confirmations: data.payment_transaction?.confirmations || 0,
            requiredConfirmations: data.payment_transaction?.required_confirmations || 1,
            quidaxPayload: payload,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true, new: true }
      );

      // ONLY credit balance on final success
      if (event === 'deposit.successful' && deposit.status === 'successful') {
        await Wallet.findByIdAndUpdate(wallet._id, {
          $inc: { balance: parseFloat(data.amount) }
        });
        console.log(`[Deposit] Credited ${data.amount} ${data.currency} to user ${localUser.email}`);
      }

      // Send outgoing webhook (your app listens to this)
      const outgoingPayload = {
        event: `deposit.${status}`,
        data: {
          id: deposit._id.toString(),
          quidaxDepositId: depositId,
          userId: localUser._id.toString(),
          email: localUser.email,
          currency: data.currency,
          amount: data.amount,
          txid,
          status,
          network: data.payment_address?.network || null,
          created_at: deposit.createdAt.toISOString(),
          confirmed_at: status === 'successful' ? new Date().toISOString() : null,
        }
      };

      // Save to outgoing queue
      const eventKey = `deposit:${depositId}`;
      await WebhookEvent.updateOne(
        { eventId: eventKey },
        {
          $set: {
            url: process.env.DEPOSIT_WEBHOOK_URL,
            payload: outgoingPayload,
            resourceType: 'Deposit',
            resourceId: deposit._id,
            status: 'pending',
            attempts: 0,
          }
        },
        { upsert: true }
      );

      webhookCache.set(depositId, { expires: Date.now() + CACHE_TTL });

      if (process.env.DEPOSIT_WEBHOOK_URL) {
        sendWebhookWithRetry(
          process.env.DEPOSIT_WEBHOOK_URL,
          outgoingPayload,
          'Deposit',
          deposit._id.toString(),
          eventKey
        ).catch(console.error);
      }

      console.log(`[Deposit] Processed ${event} → ${status} | ${data.amount} ${data.currency}`);

    } catch (err) {
      console.error('[Deposit Webhook] Error:', err);
    }
  }
}

module.exports = DepositWebhookService;