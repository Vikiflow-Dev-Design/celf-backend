const { z } = require('zod');

// Reusable base types
const mongoId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid MongoDB ID');
const achievementIdStr = z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Achievement ID can only contain letters, numbers, hyphens, and underscores');

const achievementCategory = z.enum(['mining', 'social', 'wallet', 'milestone'], {
    errorMap: () => ({ message: 'Category must be one of: mining, social, wallet, milestone' }),
});

const trackingType = z.enum(['manual', 'automatic'], {
    errorMap: () => ({ message: 'Tracking type must be either manual or automatic' }),
});

const progressSource = z.enum(['mining', 'transaction', 'referral', 'manual', 'bonus'], {
    errorMap: () => ({ message: 'Source must be one of: mining, transaction, referral, manual, bonus' }),
});

// Query: filter achievements
const achievementQuerySchema = z.object({
    category: z.enum(['all', 'mining', 'social', 'wallet', 'milestone']).optional(),
    completed: z.coerce.boolean().optional(),
    rewardClaimed: z.coerce.boolean().optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).optional(),
});

// Body: create achievement (admin)
const createAchievementSchema = z.object({
    achievementId: achievementIdStr,
    title: z.string().min(1).max(100).trim(),
    description: z.string().min(1).max(500).trim(),
    category: achievementCategory,
    maxProgress: z.number().int().min(1, 'Max progress must be a positive integer'),
    reward: z.number().min(0, 'Reward must be a non-negative number'),
    icon: z.string().min(1).max(50).trim(),
    tips: z.array(z.string().max(200).trim()).optional(),
    requirements: z.array(z.string().max(200).trim()).optional(),
    conditions: z
        .object({
            miningSessionsRequired: z.number().int().min(0).optional(),
            miningAmountRequired: z.number().min(0).optional(),
            referralsRequired: z.number().int().min(0).optional(),
            transactionsRequired: z.number().int().min(0).optional(),
            balanceRequired: z.number().min(0).optional(),
            totalTokensRequired: z.number().min(0).optional(),
        })
        .optional(),
    sortOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
    trackingType: trackingType.optional(),
});

// Body: update achievement (admin)
const updateAchievementSchema = createAchievementSchema
    .omit({ achievementId: true, title: true, description: true, category: true, maxProgress: true, reward: true, icon: true })
    .extend({
        title: z.string().min(1).max(100).trim().optional(),
        description: z.string().min(1).max(500).trim().optional(),
        category: achievementCategory.optional(),
        maxProgress: z.number().int().min(1).optional(),
        reward: z.number().min(0).optional(),
        icon: z.string().min(1).max(50).trim().optional(),
    });

// Body: update progress
const updateProgressSchema = z.object({
    progress: z.number().int().min(0, 'Progress must be a non-negative integer'),
    source: progressSource.optional(),
    details: z.record(z.unknown()).optional(),
});

// Body: bulk update progress (admin)
const bulkUpdateProgressSchema = z.object({
    updates: z
        .array(
            z.object({
                userId: mongoId,
                achievementId: z.string().min(1, 'Achievement ID is required'),
                progress: z.number().int().min(0, 'Progress must be a non-negative integer'),
                source: progressSource.optional(),
            })
        )
        .min(1, 'Updates must be a non-empty array'),
});

// Query: achievement stats
const statsQuerySchema = z.object({
    startDate: z.string().datetime({ message: 'Start date must be a valid ISO 8601 date' }).optional(),
    endDate: z.string().datetime({ message: 'End date must be a valid ISO 8601 date' }).optional(),
    category: achievementCategory.optional(),
});

module.exports = {
    achievementQuerySchema,
    createAchievementSchema,
    updateAchievementSchema,
    updateProgressSchema,
    bulkUpdateProgressSchema,
    statsQuerySchema,
};
