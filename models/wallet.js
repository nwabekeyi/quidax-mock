const mongoose = require('mongoose');

const WalletSchema = new mongoose.Schema({
  currency: { type: String, required: true },
  address: { type: String, required: true },
  network: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Wallet', WalletSchema);
