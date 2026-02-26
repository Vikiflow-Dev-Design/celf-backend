const { z } = require('zod');

const scholarshipApplicationSchema = z.object({
    firstName: z.string().trim().min(2, 'First name is required'),
    lastName: z.string().trim().min(2, 'Last name is required'),
    email: z.string().email('Valid email is required').toLowerCase(),
    phone: z.string().trim().min(10, 'Valid phone number is required'),
    dateOfBirth: z.string().datetime({ message: 'Valid date of birth is required' }),
    address: z.record(z.unknown()),
    walletAddress: z.string().trim().min(20, 'Valid CELF wallet address is required'),
    tokenBalance: z.number({ coerce: true }).min(1000, 'Minimum 1000 CELF tokens required'),

    // Educational information
    currentEducation: z.record(z.unknown()),
    academicRecords: z.array(z.unknown()).min(1, 'Academic records are required'),
    studyPlan: z.string().trim().min(100, 'Study plan must be at least 100 characters'),
    careerGoals: z.string().trim().min(50, 'Career goals must be at least 50 characters'),

    // Financial information
    financialNeed: z.string().trim().min(50, 'Financial need description is required'),
    householdIncome: z.number({ coerce: true }).min(0).optional(),
    otherScholarships: z.array(z.unknown()).optional(),

    // Essays
    personalStatement: z
        .string()
        .trim()
        .min(200, 'Personal statement must be between 200-2000 characters')
        .max(2000, 'Personal statement must be between 200-2000 characters'),
    whyCELF: z
        .string()
        .trim()
        .min(100, 'Why CELF essay must be between 100-1000 characters')
        .max(1000, 'Why CELF essay must be between 100-1000 characters'),

    // References
    references: z.array(z.unknown()).min(2, '2-3 references are required').max(3, '2-3 references are required'),

    // Documents
    documents: z.record(z.unknown()),
});

const documentUploadSchema = z.object({
    applicationId: z.string().min(1, 'Application ID is required'),
    documentType: z.enum(['id', 'transcript', 'enrollment', 'financial', 'other'], {
        errorMap: () => ({ message: 'Invalid document type' }),
    }),
    fileName: z.string().trim().min(1, 'File name is required'),
    fileSize: z.number({ coerce: true }).int().min(1, 'File size is required'),
    mimeType: z.enum(['application/pdf', 'image/jpeg', 'image/png'], {
        errorMap: () => ({ message: 'Invalid file type' }),
    }),
});

const updateApplicationStatusSchema = z.object({
    status: z.enum(['submitted', 'under_review', 'approved', 'rejected', 'waitlisted'], {
        errorMap: () => ({ message: 'Invalid status' }),
    }),
    reviewNotes: z.string().trim().optional(),
    reviewerId: z.string().min(1).optional(),
});

const scoreApplicationSchema = z.object({
    criteria: z.record(z.unknown()),
    totalScore: z
        .number({ coerce: true })
        .min(0, 'Total score must be between 0-100')
        .max(100, 'Total score must be between 0-100'),
    comments: z.string().trim().optional(),
    recommendation: z.enum(['approve', 'reject', 'waitlist'], {
        errorMap: () => ({ message: 'Invalid recommendation' }),
    }),
});

const createAwardSchema = z.object({
    applicationId: z.string().min(1, 'Application ID is required'),
    amount: z.number({ coerce: true }).min(100, 'Award amount must be at least $100'),
    disbursementSchedule: z.array(z.unknown()).min(1, 'Disbursement schedule is required'),
    conditions: z.array(z.unknown()).optional(),
});

const createDisbursementSchema = z.object({
    awardId: z.string().min(1, 'Award ID is required'),
    amount: z.number({ coerce: true }).min(1, 'Disbursement amount is required'),
    scheduledDate: z.string().datetime({ message: 'Valid scheduled date is required' }),
    method: z.enum(['bank_transfer', 'check', 'digital_wallet'], {
        errorMap: () => ({ message: 'Invalid disbursement method' }),
    }),
});

const createProgramSchema = z.object({
    name: z.string().trim().min(5, 'Program name is required'),
    description: z.string().trim().min(50, 'Program description is required'),
    eligibilityCriteria: z.array(z.unknown()).min(1, 'Eligibility criteria are required'),
    applicationDeadline: z.string().datetime({ message: 'Valid application deadline is required' }),
    awardAmount: z.number({ coerce: true }).min(100, 'Award amount must be at least $100'),
    numberOfAwards: z.number({ coerce: true }).int().min(1, 'Number of awards must be at least 1'),
});

module.exports = {
    scholarshipApplicationSchema,
    documentUploadSchema,
    updateApplicationStatusSchema,
    scoreApplicationSchema,
    createAwardSchema,
    createDisbursementSchema,
    createProgramSchema,
};
