const { z } = require('zod');

const createSocialLinkSchema = z.object({
    platform: z.string().min(1, 'Platform name is required'),
    url: z.string().url('Valid URL is required'),
    displayName: z.string().min(1, 'Display name is required'),
    icon: z.string().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number({ coerce: true }).optional(),
});

const updateSocialLinkSchema = z.object({
    platform: z.string().min(1, 'Platform name is required').optional(),
    url: z.string().url('Valid URL is required').optional(),
    displayName: z.string().min(1, 'Display name is required').optional(),
    icon: z.string().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number({ coerce: true }).optional(),
});

module.exports = {
    createSocialLinkSchema,
    updateSocialLinkSchema,
};
