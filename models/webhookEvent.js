// models/WebhookEvent.js
const mongoose = require('mongoose');

const WebhookEventSchema = new mongoose.Schema({
  // The URL we are sending to
  url: { type: String, required: true },

  // The payload (saved for debugging / replay)
  payload: { type: mongoose.Schema.Types.Mixed, required: true },

  // Polymorphic reference: can be Wallet, Transaction, etc.
  resourceType: { type: String, required: true }, // e.g., 'Wallet'
  resourceId: { type: mongoose.Schema.Types.ObjectId, required: true },

  // Delivery state
  status: {
    type: String,
    enum: ['pending', 'acknowledged', 'failed'],
    default: 'pending',
  },

  attempts: { type: Number, default: 0 },
  lastError: { type: String },
  lastAttemptAt: { type: Date },
  acknowledgedAt: { type: Date },
  failedAt: { type: Date },

  // Optional: unique event ID (for idempotency)
  eventId: { type: String, unique: true, sparse: true },

}, { timestamps: true });

// Index for efficient querying
WebhookEventSchema.index({ resourceType: 1, resourceId: 1 });
WebhookEventSchema.index({ status: 1 });
WebhookEventSchema.index({ eventId: 1 });

module.exports = mongoose.model('WebhookEvent', WebhookEventSchema);