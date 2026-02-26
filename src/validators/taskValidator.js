const { z } = require('zod');

const taskCategories = ['mining', 'social', 'wallet', 'referral', 'milestone'];
const taskCategoriesWithAll = ['all', ...taskCategories];
const mongoIdRegex = /^[a-f\d]{24}$/i;

const createTaskSchema = z.object({
    taskId: z.string().min(1).max(50, 'Task ID must be between 1 and 50 characters'),
    title: z.string().min(1).max(100, 'Title must be between 1 and 100 characters'),
    description: z.string().min(1).max(500, 'Description must be between 1 and 500 characters'),
    category: z.enum(taskCategories, { errorMap: () => ({ message: `Category must be one of: ${taskCategories.join(', ')}` }) }),
    maxProgress: z.number({ coerce: true }).int().min(1, 'Max progress must be a positive integer'),
    reward: z.number({ coerce: true }).min(0, 'Reward must be a non-negative number'),
    icon: z.string().min(1, 'Icon is required'),
    tips: z.array(z.unknown()).optional(),
    requirements: z.array(z.unknown()).optional(),
    conditions: z.record(z.unknown()).optional(),
    isLinkTask: z.boolean().optional(),
    linkUrl: z.string().url('Link URL must be a valid URL').optional(),
});

const updateTaskSchema = z.object({
    title: z.string().min(1).max(100, 'Title must be between 1 and 100 characters').optional(),
    description: z.string().min(1).max(500, 'Description must be between 1 and 500 characters').optional(),
    category: z.enum(taskCategories, { errorMap: () => ({ message: `Category must be one of: ${taskCategories.join(', ')}` }) }).optional(),
    maxProgress: z.number({ coerce: true }).int().min(1, 'Max progress must be a positive integer').optional(),
    reward: z.number({ coerce: true }).min(0, 'Reward must be a non-negative number').optional(),
    tips: z.array(z.unknown()).optional(),
    requirements: z.array(z.unknown()).optional(),
    conditions: z.record(z.unknown()).optional(),
    isLinkTask: z.boolean().optional(),
    linkUrl: z.string().url('Link URL must be a valid URL').optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number({ coerce: true }).int().optional(),
});

const taskIdParamSchema = z.object({
    taskId: z.string().min(1).max(50, 'Task ID must be between 1 and 50 characters'),
});

const mongoIdParamSchema = z.object({
    id: z.string().regex(mongoIdRegex, 'Valid task ID is required'),
});

const userIdAndTaskIdParamSchema = z.object({
    userId: z.string().regex(mongoIdRegex, 'Valid user ID is required'),
    taskId: z.string().min(1).max(50, 'Task ID must be between 1 and 50 characters'),
});

const taskQuerySchema = z.object({
    category: z.enum(taskCategoriesWithAll, {
        errorMap: () => ({ message: `Category must be one of: ${taskCategoriesWithAll.join(', ')}` }),
    }).optional(),
    completed: z
        .string()
        .transform((v) => v === 'true')
        .pipe(z.boolean().optional())
        .optional(),
});

const updateProgressSchema = z.object({
    progress: z.number({ coerce: true }).int().min(0, 'Progress must be a non-negative integer'),
});

module.exports = {
    createTaskSchema,
    updateTaskSchema,
    taskIdParamSchema,
    mongoIdParamSchema,
    userIdAndTaskIdParamSchema,
    taskQuerySchema,
    updateProgressSchema,
};
