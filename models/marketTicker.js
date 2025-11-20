const mongoose = require('mongoose');

const MarketTickerSchema = new mongoose.Schema({
  _id: { type: String, default: 'quidax_tickers' }, // custom ID so only one document exists
  data: { type: Object, required: true },           // will store all tickers
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MarketTicker', MarketTickerSchema);
