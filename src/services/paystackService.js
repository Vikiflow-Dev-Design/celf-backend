const axios = require('axios');
const crypto = require('crypto');

class PaystackService {
  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY;
    this.publicKey = process.env.PAYSTACK_PUBLIC_KEY;
    this.baseUrl = 'https://api.paystack.co';
  }

  ensureConfigured() {
    if (!this.secretKey) {
      throw new Error('PAYSTACK_SECRET_KEY is not configured');
    }
  }

  toMinorUnits(amount) {
    // Paystack expects the smallest currency unit (kobo/cents)
    const n = Number(amount || 0);
    if (!isFinite(n) || n <= 0) {
      throw new Error('Invalid amount');
    }
    return Math.round(n * 100);
  }

  async initializeTransaction({ amount, currency = 'NGN', email, metadata = {}, callbackUrl }) {
    this.ensureConfigured();

    const body = {
      amount: this.toMinorUnits(amount),
      currency: String(currency || 'NGN').toUpperCase(),
      email: email || 'donations@celf.ng',
      callback_url: callbackUrl,
      metadata
    };

    const res = await axios.post(`${this.baseUrl}/transaction/initialize`, body, {
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json'
      }
    });

    return res.data?.data || {};
  }

  async verifyTransaction(reference) {
    this.ensureConfigured();
    if (!reference) throw new Error('Missing reference');

    const res = await axios.get(`${this.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: {
        Authorization: `Bearer ${this.secretKey}`
      }
    });

    return res.data?.data || {};
  }

  isValidWebhookSignature(req) {
    this.ensureConfigured();
    try {
      const computed = crypto
        .createHmac('sha512', this.secretKey)
        .update(JSON.stringify(req.body))
        .digest('hex');
      const signature = req.headers['x-paystack-signature'];
      return signature && computed === signature;
    } catch (e) {
      return false;
    }
  }
}

module.exports = new PaystackService();