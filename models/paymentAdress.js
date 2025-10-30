const mongoose = require('mongoose');

const PaymentAddressSchema = new mongoose.Schema({
  quidaxWalletId: { type: String },
  name: { type: String },
  currency: { type: String, required: true },
  balance: { type: Number, default: 0 },
  locked: { type: Number, default: 0 },
  staked: { type: Number, default: 0 },
  reference_currency: { type: String, default: 'usd' },
  is_crypto: { type: Boolean, default: true },
  blockchain_enabled: { type: Boolean, default: true },
  default_network: { type: String, default: 'trc20' },
  networks: {
    type: Array,
    default: [
      {
        id: 'trc20',
        name: 'TRON (TRC20)',
        deposits_enabled: true,
        withdraws_enabled: true,
      },
    ],
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deposit_address: { type: String, default: null },
  destination_tag: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('paymentAddress', PaymentAddressSchema);
