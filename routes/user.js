const express = require('express');
const router = express.Router();
const userService = require('../services/user');

// POST /users → Create subaccount
router.post('/', async (req, res) => {
  await userService.createUser(req, res);
});

module.exports = router;
