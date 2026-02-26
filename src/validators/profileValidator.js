const { z } = require('zod');

const updateProfileSchema = z.object({
    username: z
        .string()
        .min(3, 'Username must be between 3 and 30 characters')
        .max(30, 'Username must be between 3 and 30 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
        .optional(),
    displayName: z.string().min(1).max(100, 'Display name must be between 1 and 100 characters').trim().optional(),
    bio: z.string().max(500, 'Bio must be less than 500 characters').trim().optional(),
    phone: z.string().max(20, 'Phone number must be less than 20 characters').trim().optional(),
    country: z.string().max(100, 'Country must be less than 100 characters').trim().optional(),
    firstName: z.string().min(1).max(50, 'First name must be between 1 and 50 characters').trim().optional(),
    lastName: z.string().min(1).max(50, 'Last name must be between 1 and 50 characters').trim().optional(),
});

const uploadPictureSchema = z.object({
    imageUrl: z.string().min(1, 'Image URL is required').url('Must be a valid URL'),
});

const userIdParamSchema = z.object({
    userId: z.string().regex(/^[a-f\d]{24}$/i, 'Valid user ID is required'),
});

const searchQuerySchema = z.object({
    q: z
        .string()
        .min(2, 'Search query must be between 2 and 50 characters')
        .max(50, 'Search query must be between 2 and 50 characters'),
    limit: z
        .string()
        .optional()
        .transform((v) => (v !== undefined ? parseInt(v, 10) : undefined))
        .pipe(z.number().int().min(1).max(50).optional()),
});

const updateStatsSchema = z.object({
    totalMined: z.number({ coerce: true }).min(0, 'Total mined must be a non-negative number').optional(),
    referralsCount: z.number({ coerce: true }).int().min(0, 'Referrals count must be a non-negative integer').optional(),
    achievementsCount: z
        .number({ coerce: true })
        .int()
        .min(0, 'Achievements count must be a non-negative integer')
        .optional(),
});

module.exports = {
    updateProfileSchema,
    uploadPictureSchema,
    userIdParamSchema,
    searchQuerySchema,
    updateStatsSchema,
};
