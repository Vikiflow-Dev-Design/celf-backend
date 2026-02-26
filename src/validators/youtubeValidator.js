const { z } = require('zod');

const videosQuerySchema = z.object({
    limit: z
        .string()
        .optional()
        .transform((v) => (v !== undefined ? parseInt(v, 10) : undefined))
        .pipe(z.number().int().min(1).max(50).optional()),
    forceRefresh: z
        .string()
        .optional()
        .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined))
        .pipe(z.boolean().optional()),
    search: z.string().trim().min(1).max(100, 'Search query must be between 1 and 100 characters').optional(),
});

const popularVideosQuerySchema = z.object({
    limit: z
        .string()
        .optional()
        .transform((v) => (v !== undefined ? parseInt(v, 10) : undefined))
        .pipe(z.number().int().min(1).max(50).optional()),
});

const videoIdParamSchema = z.object({
    videoId: z
        .string()
        .length(11, 'Invalid YouTube video ID format')
        .regex(/^[a-zA-Z0-9_-]+$/, 'Video ID contains invalid characters'),
});

const searchQuerySchema = z.object({
    q: z
        .string()
        .min(1, 'Search query is required')
        .max(100, 'Search query must be between 1 and 100 characters'),
    limit: z
        .string()
        .optional()
        .transform((v) => (v !== undefined ? parseInt(v, 10) : undefined))
        .pipe(z.number().int().min(1).max(50).optional()),
});

const refreshSchema = z.object({
    limit: z.number({ coerce: true }).int().min(1).max(50).optional(),
});

module.exports = {
    videosQuerySchema,
    popularVideosQuerySchema,
    videoIdParamSchema,
    searchQuerySchema,
    refreshSchema,
};
