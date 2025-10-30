const User = require('../models/user');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

/**
 * Create a subaccount (mock)
 */
async function createUser(req, res) {
  try {
    const { email, firstName, lastName } = req.body;
    if (!email || !firstName || !lastName) {
      return res.status(422).json({
        status: "error",
        message: "Validation failed",
        data: { code: "422", message: "Required parameter 'email', 'firstName' or 'lastName' missing" }
      });
    }

    const quidaxId = Math.floor(Math.random() * 1e9).toString();
    const reference = `QDX-SUB-${Math.floor(Math.random() * 100000)}`;

    const user = new User({ email, firstName, lastName, quidaxId, reference });
    await user.save();

    return res.status(201).json({
      status: "success",
      message: "Subaccount created successfully",
      data: {
        id: quidaxId,
        reference,
        user: { id: Math.floor(Math.random() * 1e6), email, first_name: firstName, last_name: lastName },
        created_at: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal server error", data: {} });
  }
}

/**
 * Fetch user by quidaxId or 'me'
 */
async function getUser(userId) {
  if (userId === 'me') {
    // Return main user, for simplicity return first user in DB
    return User.findOne().exec();
  }
  return User.findOne({ quidaxId: userId }).exec();
}

module.exports = { createUser, getUser };
