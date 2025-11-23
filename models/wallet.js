// models/wallet.js
const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  quidaxWalletId: { type: String, required: true, unique: true }, // Quidax wallet ID
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  currency: { type: String, required: true },  // USDT, BTC, NGN, etc.
  balance: { type: Number, default: 0 },
  locked: { type: Number, default: 0 },
  staked: { type: Number, default: 0 },
  reference_currency: { type: String, default: 'usd' },
  is_crypto: { type: Boolean, default: true },
  blockchain_enabled: { type: Boolean, default: true },
  default_network: { type: String, default: null },  // e.g., 'erc20' or 'trc20'
}, { timestamps: true });


module.exports = mongoose.model('Wallet', walletSchema);
