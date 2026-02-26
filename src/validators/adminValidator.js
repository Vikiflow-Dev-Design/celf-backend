const { z } = require('zod');

const updateUserSchema = z.object({
    firstName: z.string().trim().min(1).max(50).optional(),
    lastName: z.string().trim().min(1).max(50).optional(),
    email: z.string().email().toLowerCase().optional(),
    role: z.enum(['user', 'admin', 'moderator']).optional(),
    isActive: z.boolean().optional(),
});

const miningSettingsSchema = z.object({
    miningRatePerSecond: z.number({ coerce: true }).min(0.000001).max(1).optional(),
    miningIntervalMs: z.number({ coerce: true }).int().min(100).max(10000).optional(),
    maxSessionTime: z.number({ coerce: true }).int().min(60).max(86400).optional(),
    maintenanceMode: z.boolean().optional(),
    referralBonus: z.number({ coerce: true }).min(0).max(2).optional(),
    welcomeBonus: z.number({ coerce: true }).min(0).optional(),
    autoClaim: z.boolean().optional(),
    notificationEnabled: z.boolean().optional(),
    referralRewardReferrer: z.number({ coerce: true }).min(0).optional(),
    referralRewardReferee: z.number({ coerce: true }).min(0).optional(),
});

const systemSettingsSchema = z.object({
    siteName: z.string().trim().min(1).max(100).optional(),
    maintenanceMode: z.boolean().optional(),
    registrationEnabled: z.boolean().optional(),
    miningEnabled: z.boolean().optional(),
    maxUsersPerDay: z.number({ coerce: true }).int().min(1).optional(),
    emailNotifications: z.boolean().optional(),
});

const submissionStatusSchema = z.object({
    status: z.enum(['pending', 'in_progress', 'resolved', 'closed'], {
        errorMap: () => ({ message: 'Invalid status' }),
    }),
});

const campaignSchema = z.object({
    subject: z.string().trim().min(5, 'Subject must be between 5 and 200 characters').max(200),
    content: z.string().trim().min(10, 'Content is required'),
    scheduledFor: z.string().datetime({ message: 'Invalid date format' }).optional(),
    targetAudience: z.record(z.unknown()).optional(),
});

const applicationStatusSchema = z.object({
    status: z.enum(['pending', 'approved', 'rejected'], {
        errorMap: () => ({ message: 'Invalid status' }),
    }),
});

module.exports = {
    updateUserSchema,
    miningSettingsSchema,
    systemSettingsSchema,
    submissionStatusSchema,
    campaignSchema,
    applicationStatusSchema,
};
