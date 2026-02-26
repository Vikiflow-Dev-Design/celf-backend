const { z } = require('zod');

const subscriptionSchema = z.object({
    email: z.string().email('Valid email is required').toLowerCase(),
    firstName: z.string().max(50).optional(),
    lastName: z.string().max(50).optional(),
    preferences: z.record(z.unknown()).optional(),
});

const unsubscribeSchema = z.object({
    email: z.string().email('Valid email is required').toLowerCase(),
    reason: z.string().trim().max(500).optional(),
});

const preferencesSchema = z.object({
    email: z.string().email('Valid email is required').toLowerCase(),
    preferences: z.object({
        frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
        topics: z.array(z.unknown()).optional(),
        format: z.enum(['html', 'text']).optional(),
    }),
});

const campaignSchema = z.object({
    subject: z
        .string()
        .trim()
        .min(5, 'Subject must be between 5 and 200 characters')
        .max(200, 'Subject must be between 5 and 200 characters'),
    content: z.string().trim().min(10, 'Content is required'),
    scheduledFor: z.string().datetime({ message: 'Invalid date format' }).optional(),
    targetAudience: z.record(z.unknown()).optional(),
});

module.exports = {
    subscriptionSchema,
    unsubscribeSchema,
    preferencesSchema,
    campaignSchema,
};
