// common/sendWebhookWithRetry.js
const axios = require('axios');
const WebhookEvent = require('../models/webhookEvent');

async function sendWebhookWithRetry(url, payload, type, mongoId, eventId) {
  const maxRetries = 5;
  let webhookEvent = await WebhookEvent.findById(mongoId);

  for (let i = 0; i <= maxRetries; i++) {
    try {
      await axios.post(url, payload, { timeout: 10000 });
      webhookEvent.status = 'acknowledged';
      webhookEvent.acknowledgedAt = new Date();
      await webhookEvent.save();
      console.log(`[Retry] Success: ${type} ${eventId}`);
      return;
    } catch (err) {
      webhookEvent.attempts = i + 1;
      webhookEvent.lastAttemptAt = new Date();
      webhookEvent.lastError = err.message;
      await webhookEvent.save();

      if (i === maxRetries) {
        webhookEvent.status = 'failed';
        webhookEvent.failedAt = new Date();
        await webhookEvent.save();
        throw err;
      }
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

module.exports = { sendWebhookWithRetry };