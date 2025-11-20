require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const userRoutes = require('./routes/user');
const walletRoutes = require('./routes/wallets');
const paymentAddressWebhook = require('./routes/paymentAddressWebhook')
const { authMiddleware } = require('./middlewares/auth');
const { corsMiddleware } = require('./middlewares/cors');
const paymentAddress = require('./routes/paymentAddress');
const MarketTickerService = require('./services/marketTicker.service');
const marketTickers = require('./routes/marketTickers');
// Call immediately at startup
MarketTickerService.fetchAndStoreTickers();

// Repeat every 1 minute
setInterval(() => {
  MarketTickerService.fetchAndStoreTickers();
}, 60 * 1000);

const app = express();

// Middleware
app.use(express.json());
app.use(corsMiddleware);

// Log incoming requests
app.use(morgan('dev'));  // You can also use 'combined' for Apache-style logs
app.use('/markets', marketTickers);

app.use(authMiddleware);

// Routes
app.use('/users', userRoutes);
app.use('/users', walletRoutes);
app.use('/users', paymentAddressWebhook);
app.use('/users', paymentAddress);


// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB error:', err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
