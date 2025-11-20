// services/paymentAddress.service.js
const PaymentAddress = require('../models/paymentAdress');

class PaymentAddressService {
  /**
   * Get payment address for a user + currency
   * Used by: Mock Quidax API + future real Quidax
   */
  static async getPaymentAddress(userId, currency) {
    try {
      const paymentAddress = await PaymentAddress.findOne({
        currency: currency.toLowerCase(),
        // Optional: tie to user
        // user: userId,
      });

      if (!paymentAddress || !paymentAddress.deposit_address) {
        return {
          success: false,
          status: 404,
          message: `No address found for ${currency}`,
        };
      }

      return {
        success: true,
        status: 200,
        data: {
          id: paymentAddress.quidaxWalletId,
          address: paymentAddress.deposit_address,
          currency: paymentAddress.currency,
          network: paymentAddress.default_network,
          destination_tag: paymentAddress.destination_tag || null,
        },
      };
    } catch (err) {
      console.error('[PaymentAddressService] Error:', err);
      return {
        success: false,
        status: 500,
        message: 'Internal server error',
      };
    }
  }
}

module.exports = PaymentAddressService;