// common/webhookHandler.js
const webhookAttempts = new Map();

/**
 * Reusable webhook handler wrapper
 * Ensures 200 OK response for Quidax
 * and counts retries for visibility
 *
 * @param {Function} handler - async (req, payload, attemptCount)
 */
function createWebhookHandler(handler) {
  return async (req, res) => {
    try {
      const payload = req.body;
      const eventId = payload?.data?.id || payload?.id || 'unknown';
      const eventType = payload?.event || 'unknown.event';
      const key = `${eventType}:${eventId}`;

      // Track number of attempts per event
      const attemptCount = (webhookAttempts.get(key) || 0) + 1;
      webhookAttempts.set(key, attemptCount);

      console.log(`📥 Webhook received: ${eventType} (Attempt ${attemptCount})`);
      console.log(JSON.stringify(payload, null, 2));

      // Custom handler logic
      await handler(req, payload, attemptCount);

      // ✅ Always respond 200 OK as required by Quidax
      return res.status(200).json({
        status: 'ok',
        event: eventType,
        attempts: attemptCount,
      });
    } catch (err) {
      console.error(`❌ Webhook handler error: ${err.message}`);
      // Still respond 200 to stop endless retries from Quidax
      return res.status(200).json({ status: 'ok', error: err.message });
    }
  };
}

module.exports = { createWebhookHandler };
