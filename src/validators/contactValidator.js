const { z } = require('zod');

const contactFormSchema = z.object({
    firstName: z.string().trim().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().trim().min(2, 'Last name must be at least 2 characters'),
    email: z.string().email('Valid email is required').toLowerCase(),
    phone: z.string().trim().optional(),
    company: z.string().trim().optional(),
    inquiryType: z.enum(['general', 'technical', 'partnership', 'media', 'other'], {
        errorMap: () => ({ message: 'Invalid inquiry type' }),
    }),
    subject: z
        .string()
        .trim()
        .min(5, 'Subject must be between 5 and 200 characters')
        .max(200, 'Subject must be between 5 and 200 characters'),
    message: z
        .string()
        .trim()
        .min(10, 'Message must be between 10 and 2000 characters')
        .max(2000, 'Message must be between 10 and 2000 characters'),
});

const supportTicketSchema = z.object({
    email: z.string().email('Valid email is required').toLowerCase(),
    subject: z
        .string()
        .trim()
        .min(5, 'Subject must be between 5 and 200 characters')
        .max(200, 'Subject must be between 5 and 200 characters'),
    description: z
        .string()
        .trim()
        .min(10, 'Description must be between 10 and 2000 characters')
        .max(2000, 'Description must be between 10 and 2000 characters'),
    priority: z.enum(['low', 'medium', 'high', 'urgent'], {
        errorMap: () => ({ message: 'Invalid priority level' }),
    }),
    category: z.enum(['technical', 'account', 'mining', 'wallet', 'general'], {
        errorMap: () => ({ message: 'Invalid category' }),
    }),
    deviceInfo: z.record(z.unknown()).optional(),
    attachments: z.array(z.unknown()).optional(),
});

const updateTicketStatusSchema = z.object({
    status: z.enum(['open', 'in-progress', 'resolved', 'closed'], {
        errorMap: () => ({ message: 'Invalid status' }),
    }),
    response: z.string().trim().optional(),
    assignedTo: z.string().trim().optional(),
});

const addTicketResponseSchema = z.object({
    message: z
        .string()
        .trim()
        .min(1, 'Response message is required')
        .max(2000, 'Response message is required'),
    isPublic: z.boolean().optional(),
    attachments: z.array(z.unknown()).optional(),
});

module.exports = {
    contactFormSchema,
    supportTicketSchema,
    updateTicketStatusSchema,
    addTicketResponseSchema,
};
