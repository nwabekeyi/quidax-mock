// routes/webhook.js
const express = require('express');
const router = express.Router();
const { createWebhookHandler } = require('../handler/webhookHandler');
const paymentAddressService = require('../services/paymentAddress');

router.post('/qudax-webhook', createWebhookHandler(paymentAddressService.handleWalletAddressGenerated));

module.exports = router;