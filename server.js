require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const userRoutes = require('./routes/user');
const walletRoutes = require('./routes/wallet');
const { authMiddleware } = require('./middlewares/auth');
const { corsMiddleware } = require('./middlewares/cors');

const app = express();
app.use(express.json());
app.use(corsMiddleware);
app.use(authMiddleware);

app.use('/users', userRoutes);
app.use('/users', walletRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
