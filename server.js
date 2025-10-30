require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const userRoutes = require('./routes/user');
const walletRoutes = require('./routes/wallets');
const paymentRoutes = require('./routes/paymentAddress')
const { authMiddleware } = require('./middlewares/auth');
const { corsMiddleware } = require('./middlewares/cors');

const app = express();

// Middleware
app.use(express.json());
app.use(corsMiddleware);

// Log incoming requests
app.use(morgan('dev'));  // You can also use 'combined' for Apache-style logs

app.use(authMiddleware);

// Routes
app.use('/users', userRoutes);
app.use('/users', walletRoutes);
app.use('/users', paymentRoutes);


// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB error:', err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
