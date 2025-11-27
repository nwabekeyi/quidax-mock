// models/deposit.js
const mongoose = require('mongoose');

const DepositSchema = new mongoose.Schema({
  quidaxDepositId: { type: String, required: true, unique: true }, // data.id
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  wallet: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: true },
  paymentAddress: { type: mongoose.Schema.Types.ObjectId, ref: 'payment paymentAddress' },

  currency: { type: String, required: true },
  network: String,
  amount: { type: String, required: true }, // keep as string like Quidax
  fee: { type: String, default: '0' },
  txid: { type: String, required: true, unique: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'successful', 'on_hold', 'failed_aml', 'rejected'],
    default: 'pending'
  },
  confirmations: { type: Number, default: 0 },
  requiredConfirmations: { type: Number, default: 1 },

  quidaxPayload: { type: Object }, // full raw payload for audit

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Deposit', DepositSchema);