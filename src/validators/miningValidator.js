const { z } = require('zod');

const updateMiningProgressSchema = z.object({
    sessionId: z.string().min(1, 'Session ID is required'),
    tokensEarned: z.number({ coerce: true }).min(0, 'Tokens earned must be positive'),
    runtime: z.number({ coerce: true }).int().min(0, 'Runtime must be positive'),
});

const updateMiningRateSchema = z.object({
    rate: z
        .number({ coerce: true })
        .min(0.001, 'Mining rate must be between 0.001 and 10 CELF/hour')
        .max(10, 'Mining rate must be between 0.001 and 10 CELF/hour'),
});

const sessionIdParamSchema = z.object({
    id: z.string().min(1, 'Session ID is required'),
});

const sessionStatusSchema = z.object({
    status: z.enum(['active', 'paused', 'completed', 'cancelled'], {
        errorMap: () => ({ message: 'Invalid status' }),
    }),
});

module.exports = {
    updateMiningProgressSchema,
    updateMiningRateSchema,
    sessionIdParamSchema,
    sessionStatusSchema,
};
