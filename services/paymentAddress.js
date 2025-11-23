// services/paymentAddress.service.js
const PaymentAddress = require('../models/paymentAdress');

class PaymentAddressService {
  static async getPaymentAddress(userId, currency) {
    const addressDoc = await PaymentAddress.findOne({
      user: userId,
      currency: currency.toLowerCase(),
      active: true,
    }).sort({ createdAt: -1 });

    if (!addressDoc) {
      return {
        success: false,
        status: 404,
        message: `No active deposit address found for ${currency}`,
      };
    }

    return {
      success: true,
      status: 200,
      data: {
        id: addressDoc._id.toString(),
        reference: null,
        address: addressDoc.deposit_address,
        currency: addressDoc.currency,
        network: addressDoc.network,
        destination_tag: addressDoc.destination_tag || null,
        total_payments: '0',
        created_at: addressDoc.createdAt.toISOString(),
        updated_at: addressDoc.updatedAt.toISOString(),
      },
    };
  }
}

module.exports = PaymentAddressService;