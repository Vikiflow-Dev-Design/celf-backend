const { z } = require('zod');

const mentorApplicationSchema = z.object({
    firstName: z.string().trim().min(2, 'First name is required'),
    lastName: z.string().trim().min(2, 'Last name is required'),
    email: z.string().email('Valid email is required').toLowerCase(),
    phone: z.string().trim().optional(),
    education: z.string().trim().min(10, 'Education background is required'),
    experience: z.string().trim().min(10, 'Experience description is required'),
    expertise: z.array(z.string()).min(1, 'At least one area of expertise is required'),
    availability: z.record(z.unknown()),
    motivation: z.string().trim().min(50, 'Motivation must be at least 50 characters'),
    linkedinProfile: z.string().url().optional(),
    resume: z.string().optional(),
});

const menteeApplicationSchema = z.object({
    firstName: z.string().trim().min(2, 'First name is required'),
    lastName: z.string().trim().min(2, 'Last name is required'),
    email: z.string().email('Valid email is required').toLowerCase(),
    phone: z.string().trim().optional(),
    currentEducation: z.string().trim().min(10, 'Current education status is required'),
    goals: z.string().trim().min(50, 'Goals must be at least 50 characters'),
    interests: z.array(z.string()).min(1, 'At least one area of interest is required'),
    availability: z.record(z.unknown()),
    experience: z.string().trim().optional(),
    challenges: z.string().trim().min(20, 'Challenges description is required'),
});

const connectionStatusSchema = z.object({
    status: z.enum(['accepted', 'declined'], { errorMap: () => ({ message: 'Invalid status' }) }),
});

const scheduleSessionSchema = z.object({
    mentorId: z.string().min(1).optional(),
    menteeId: z.string().min(1).optional(),
    scheduledFor: z.string().datetime({ message: 'Valid date is required' }),
    duration: z
        .number({ coerce: true })
        .int()
        .min(15, 'Duration must be between 15 and 180 minutes')
        .max(180, 'Duration must be between 15 and 180 minutes'),
    topic: z.string().trim().min(5, 'Session topic is required'),
    notes: z.string().trim().optional(),
});

const completeSessionSchema = z.object({
    notes: z.string().trim().optional(),
    rating: z.number({ coerce: true }).int().min(1).max(5).optional(),
});

const applicationStatusSchema = z.object({
    status: z.enum(['pending', 'approved', 'rejected'], { errorMap: () => ({ message: 'Invalid status' }) }),
    notes: z.string().trim().optional(),
});

module.exports = {
    mentorApplicationSchema,
    menteeApplicationSchema,
    connectionStatusSchema,
    scheduleSessionSchema,
    completeSessionSchema,
    applicationStatusSchema,
};
