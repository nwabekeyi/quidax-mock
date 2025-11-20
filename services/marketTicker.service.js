const axios = require('axios');
const MarketTicker = require('../models/marketTicker');

class MarketTickerService {

  // Fetch from DB for API clients
  static async getTickers() {
    try {
      const tickers = await MarketTicker.findById('quidax_tickers');
      if (!tickers) {
        return { success: false, status: 404, message: "Tickers not found" };
      }

      return {
        success: true,
        status: 200,
        data: tickers
      };

    } catch (err) {
      console.error('[MarketTickerService] DB Error:', err);
      return { success: false, status: 500, message: 'Internal Server Error' };
    }
  }

  // Fetch from Quidax API & save to DB every 1 minute
  static async fetchAndStoreTickers() {
    try {
      const response = await axios.get('https://app.quidax.io/api/v1/markets/tickers');

      await MarketTicker.findByIdAndUpdate(
        'quidax_tickers',
        {
          data: response.data, 
          lastUpdated: new Date(),
        },
        { upsert: true }
      );

      console.log('[MarketTickerService] Tickers updated');

    } catch (err) {
      console.error('[MarketTickerService] Error updating tickers:', err?.response?.data || err);
    }
  }
}

module.exports = MarketTickerService;
