const express = require('express');
const router = express.Router();
const DepositWebhookService = require('../services/depositWebhook');
const { createWebhookHandler } = require('../handler/webhookHandler');

router.post(
  '/qudax-webhook',
  createWebhookHandler([DepositWebhookService.handleDepositEvent])
);

module.exports = router;
