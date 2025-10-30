
// common/sendWebhookWithRetry.js
const axios = require('axios');
const WebhookEvent = require('../models/webhookEvent');

const RETRY_INTERVALS = [
    0,              // immediate
    60 * 1000,      // 1 minute
    30 * 60 * 1000, // 30 minutes
    60 * 60 * 1000, // 1 hour
    24 * 60 * 60 * 1000 // 24 hours
  ];

/**
 * Queues a webhook event with retry logic.
 * Only HTTP 200 = success.
 *
 * @param {string} url
 * @param {object} payload
 * @param {string} resourceType - e.g., 'Wallet'
 * @param {string} resourceId   - Mongoose _id of the resource
 * @param {string} [eventId]    - Optional idempotency key
 */
async function sendWebhookWithRetry(url, payload, resourceType, resourceId, eventId) {
  // Create the event record first
  const webhookEvent = await WebhookEvent.create({
    url,
    payload,
    resourceType,
    resourceId,
    eventId: eventId || undefined,
    status: 'pending',
    attempts: 0,
  });

  // Start retry chain
  _attempt(webhookEvent._id);
}

async function _attempt(webhookEventId) {
  const event = await WebhookEvent.findById(webhookEventId);
  if (!event) return;

  try {
    console.log(`[Webhook] Attempt ${event.attempts + 1} → ${event.url}`);
    const response = await axios.post(event.url, event.payload, { timeout: 5000 });

    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}`);
    }

    // SUCCESS
    await WebhookEvent.findByIdAndUpdate(event._id, {
      status: 'acknowledged',
      attempts: event.attempts + 1,
      acknowledgedAt: new Date(),
      $unset: { lastError: '' },
    });

    console.log(`[Webhook] ACKNOWLEDGED – event ${event._id}`);

  } catch (error) {
    const isLastAttempt = event.attempts + 1 >= RETRY_INTERVALS.length;

    const update = {
      $inc: { attempts: 1 },
      lastError: error.message,
      lastAttemptAt: new Date(),
    };

    if (isLastAttempt) {
      update.status = 'failed';
      update.failedAt = new Date();
    }

    await WebhookEvent.findByIdAndUpdate(event._id, update);

    console.error(`[Webhook] Attempt ${event.attempts + 1} FAILED: ${error.message}`);

    if (isLastAttempt) {
      return console.error(`[Webhook] MAX RETRIES – event ${event._id}`);
    }

    const nextDelay = RETRY_INTERVALS[event.attempts + 1];
    console.log(`[Webhook] Retrying in ${nextDelay / 1000}s...`);

    setTimeout(() => {
      _attempt(event._id);
    }, nextDelay);
  }
}

module.exports = { sendWebhookWithRetry };