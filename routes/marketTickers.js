const express = require('express');
const router = express.Router();
const MarketTickerService = require('../services/marketTicker.service');

// GET /markets/tickers
router.get('/tickers', async (req, res) => {
  const result = await MarketTickerService.getTickers();

  if (!result.success) {
    return res.status(result.status).json({
      status: 'error',
      message: result.message
    });
  }

  res.json({
    status: 'success',
    data: result.data
  });
});

module.exports = router;
