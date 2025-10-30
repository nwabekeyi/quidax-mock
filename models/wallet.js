// models/wallet.js
const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  quidaxWalletId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  currency: { type: String, required: true },
  balance: { type: Number, default: 0 },
  locked: { type: Number, default: 0 },
  staked: { type: Number, default: 0 },
  reference_currency: { type: String, default: 'usd' },
  is_crypto: { type: Boolean, default: true },
  blockchain_enabled: { type: Boolean, default: true },
  default_network: { type: String, default: 'mainnet' },
  networks: { type: Array, default: [] },
  deposit_address: { type: String, default: '' },
  destination_tag: { type: String, default: '' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Wallet', walletSchema);
