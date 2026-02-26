const { z } = require('zod');

const sendTokensSchema = z.object({
    toAddress: z.string().min(1, 'Recipient address is required'),
    amount: z.number({ coerce: true }).min(0.0001, 'Amount must be greater than 0.0001'),
    description: z.string().max(200).optional(),
});

const sendTokensByEmailSchema = z.object({
    toEmail: z.string().email('Valid recipient email is required'),
    amount: z.number({ coerce: true }).min(0.0001, 'Amount must be greater than 0.0001'),
    description: z.string().max(200).optional(),
});

const exchangeTokensSchema = z.object({
    amount: z.number({ coerce: true }).min(0.0001, 'Amount must be greater than 0.0001'),
    fromType: z.enum(['sendable', 'nonSendable'], { errorMap: () => ({ message: 'Invalid token type' }) }),
    toType: z.enum(['sendable', 'nonSendable'], { errorMap: () => ({ message: 'Invalid token type' }) }),
});

const addAddressSchema = z.object({
    address: z.string().min(1, 'Address is required'),
    label: z.string().max(50).optional(),
});

const miningRewardSchema = z.object({
    amount: z.number({ coerce: true }).min(0, 'Amount must be positive'),
    sessionId: z.string().min(1).optional(),
});

const walletPreferencesSchema = z.object({
    currency: z.enum(['CELF', 'USD']).optional(),
    notifications: z.boolean().optional(),
});

const transactionIdParamSchema = z.object({
    id: z.string().min(1, 'Transaction ID is required'),
});

module.exports = {
    sendTokensSchema,
    sendTokensByEmailSchema,
    exchangeTokensSchema,
    addAddressSchema,
    miningRewardSchema,
    walletPreferencesSchema,
    transactionIdParamSchema,
};
