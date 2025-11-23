const mongoose = require('mongoose');

const PaymentAddressSchema = new mongoose.Schema({
  wallet: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: true }, // link to wallet
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },   // optional duplicate reference
  currency: { type: String, required: true },
  network: { type: String, required: false, default: null },          // 'erc20', 'trc20', 'bep20', etc.
  deposit_address: { type: String, required: true }, // blockchain deposit address
  destination_tag: { type: String, default: null },  // only for XRP, XLM, BNB
  active: { type: Boolean, default: true },          // for disabling old addresses
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  depositCount: { type: Number, default: 0 },

});


module.exports = mongoose.model('paymentAddress', PaymentAddressSchema);
