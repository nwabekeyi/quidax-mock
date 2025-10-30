// const Wallet = require('../models/wallet');
// const { v4: uuidv4 } = require('uuid');
// const crypto = require('crypto');
// const userService = require('./user');
// const axios = require('axios');

// /**
//  * Generate wallet for a user (mock)
//  */
// async function createWallet(req, res) {
//   try {
//     const userId = req.params.userId || 'me';
//     const user = await userService.getUser(userId);

//     if (!user) {
//       return res.status(404).json({ status: "error", message: "User not found", data: {} });
//     }

//     const wallet = new Wallet({
//       currency: "usdt",
//       address: crypto.randomBytes(16).toString('hex').toUpperCase(),
//       network: "trc20",
//       user: user._id
//     });
//     await wallet.save();

//     const webhookPayload = {
//       event: "wallet.address.generated",
//       data: {
//         id: uuidv4(),
//         reference: null,
//         currency: wallet.currency,
//         address: wallet.address,
//         network: wallet.network,
//         user: {
//           id: user.quidaxId,
//           sn: user.reference,
//           email: user.email,
//           reference: null,
//           first_name: user.firstName,
//           last_name: user.lastName,
//           created_at: user.createdAt.toISOString(),
//           updated_at: new Date().toISOString()
//         },
//         created_at: wallet.createdAt.toISOString(),
//         updated_at: new Date().toISOString()
//       }
//     };

//     // Send webhook if URL provided
//     if (process.env.WALLET_WEBHOOK_URL) {
//       axios.post(process.env.WALLET_WEBHOOK_URL, webhookPayload)
//         .then(() => console.log(`Webhook sent for user ${userId}`))
//         .catch(err => console.error(`Webhook failed: ${err.message}`));
//     }

//     return res.status(201).json(webhookPayload);

//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ status: "error", message: "Internal server error", data: {} });
//   }
// }

// module.exports = { createWallet };

const Wallet = require('../models/wallet');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const userService = require('./user');

/**
 * Generate wallet for a user (mock)
 */
async function createWallet(req, res) {
  try {
    const userId = req.params.userId || 'me';
    const user = await userService.getUser(userId);

    if (!user) {
      return res.status(404).json({ status: "error", message: "User not found", data: {} });
    }

    const wallet = new Wallet({
      currency: "usdt",
      address: crypto.randomBytes(16).toString('hex').toUpperCase(),
      network: "trc20",
      user: user._id
    });
    await wallet.save();

    // Construct normal JSON response
    const responsePayload = {
      status: "success",
      message: "Wallet created successfully",
      data: {
        id: uuidv4(),
        currency: wallet.currency,
        address: wallet.address,
        network: wallet.network,
        user: {
          id: user.quidaxId,
          sn: user.reference,
          email: user.email,
          reference: null,
          first_name: user.firstName,
          last_name: user.lastName,
          created_at: user.createdAt.toISOString(),
          updated_at: new Date().toISOString()
        },
        created_at: wallet.createdAt.toISOString(),
        updated_at: new Date().toISOString()
      }
    };

    return res.status(201).json(responsePayload);

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
      data: {}
    });
  }
}

module.exports = { createWallet };

