const { createSuccessResponse, createErrorResponse, createPaginatedResponse } = require('../utils/responseUtils');
const { Donation } = require('../models');
const paystackService = require('../services/paystackService');

function getFrontendUrl() {
  const local = process.env.FRONTEND_URL || 'http://localhost:3000';
  return local;
}

exports.initialize = async (req, res, next) => {
  try {
    const { amount, currency = 'NGN', email, metadata = {} } = req.body || {};

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json(createErrorResponse('Invalid amount'));
    }

    const callbackUrl = `${getFrontendUrl()}/donate/success`;
    const initData = await paystackService.initializeTransaction({ amount, currency, email, metadata, callbackUrl });

    const donation = await Donation.create({
      reference: initData.reference,
      status: 'initialized',
      provider: 'paystack',
      amount: Number(amount),
      currency: String(currency || 'NGN').toUpperCase(),
      email: email || 'donations@celf.ng',
      donor: {
        firstName: metadata?.firstName,
        lastName: metadata?.lastName,
        phone: metadata?.phone,
        city: metadata?.city,
        state: metadata?.state,
        zip: metadata?.zip,
        country: metadata?.country,
        inHonor: !!metadata?.inHonor,
        onBehalf: !!metadata?.onBehalf,
        organization: metadata?.organization
      },
      authorizationUrl: initData.authorization_url,
      accessCode: initData.access_code,
      paystack: {
        metadata,
        rawInitializeResponse: initData
      }
    });

    return res.json(createSuccessResponse('Initialized donation', {
      authorization_url: initData.authorization_url,
      access_code: initData.access_code,
      reference: initData.reference,
      donationId: donation.id
    }));
  } catch (err) {
    const status = err?.response?.status || 500;
    const message = err?.response?.data?.message || err?.message || 'Internal Server Error';
    return res.status(status).json(createErrorResponse(message, err?.response?.data || null));
  }
};

exports.verify = async (req, res, next) => {
  try {
    const { reference } = req.params;
    if (!reference) return res.status(400).json(createErrorResponse('Missing reference'));

    const result = await paystackService.verifyTransaction(reference);

    const donation = await Donation.findOne({ reference });
    if (!donation) return res.status(404).json(createErrorResponse('Donation not found'));

    // Update donation status based on Paystack response
    if (result.status === 'success') {
      donation.markSuccess(result);
      donation.paystack.transactionId = result.id;
      donation.paystack.channel = result.channel;
    } else {
      donation.markFailure(result);
    }

    await donation.save();

    return res.json(createSuccessResponse('Verification completed', {
      reference,
      status: donation.status,
      amount: donation.amount,
      currency: donation.currency,
      email: donation.email,
      provider: donation.provider,
      donationId: donation.id
    }));
  } catch (err) {
    const status = err?.response?.status || 500;
    const message = err?.response?.data?.message || err?.message || 'Internal Server Error';
    return res.status(status).json(createErrorResponse(message, err?.response?.data || null));
  }
};

exports.webhook = async (req, res, next) => {
  try {
    // Validate signature
    const valid = paystackService.isValidWebhookSignature(req);
    if (!valid) {
      return res.status(401).json(createErrorResponse('Invalid webhook signature'));
    }

    const event = req.body;

    // Only handle successful charge events
    if (event?.event === 'charge.success') {
      const reference = event?.data?.reference;
      const donation = await Donation.findOne({ reference });
      if (donation) {
        donation.status = 'success';
        donation.completedAt = new Date();
        donation.verifiedAt = new Date();
        donation.paystack.transactionId = event.data.id;
        donation.paystack.channel = event.data.channel;
        donation.paystack.rawWebhookEvent = event;
        await donation.save();
      }
    }

    // Respond quickly to acknowledge
    return res.json(createSuccessResponse('Webhook received'));
  } catch (err) {
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const { status, email } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);

    const query = {};
    if (status) query.status = String(status);
    if (email) query.email = String(email);

    const [items, total] = await Promise.all([
      Donation.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Donation.countDocuments(query)
    ]);

    const pagination = {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1
    };

    return res.json(createPaginatedResponse(true, 'Donations list', items, pagination));
  } catch (err) {
    next(err);
  }
};