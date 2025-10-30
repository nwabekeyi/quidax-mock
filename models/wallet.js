const mongoose = require('mongoose');

const WalletSchema = new mongoose.Schema({
  quidaxWalletId: { type: String },
  currency: { type: String, required: true },
  address: { type: String },
  network: { type: String },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Wallet', WalletSchema);
