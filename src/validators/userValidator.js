const { z } = require('zod');

const updateProfileSchema = z.object({
    firstName: z.string().min(2, 'First name must be at least 2 characters').trim().optional(),
    lastName: z.string().min(2, 'Last name must be at least 2 characters').trim().optional(),
    email: z.string().email('Invalid email address').optional(),
});

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

const updateUserRoleSchema = z.object({
    role: z.enum(['user', 'admin', 'moderator'], {
        errorMap: () => ({ message: 'Role must be one of: user, admin, moderator' }),
    }),
});

const deleteMultipleUsersSchema = z.object({
    userIds: z
        .array(z.string().uuid('Each user ID must be a valid UUID'))
        .min(1, 'User IDs array is required and cannot be empty'),
});

const deleteAllUsersSchema = z.object({
    confirmationToken: z.literal('DELETE_ALL_USERS_CONFIRMED', {
        errorMap: () => ({ message: 'Confirmation token must be "DELETE_ALL_USERS_CONFIRMED"' }),
    }),
    excludeAdmins: z.boolean().optional(),
});

module.exports = {
    updateProfileSchema,
    changePasswordSchema,
    updateUserRoleSchema,
    deleteMultipleUsersSchema,
    deleteAllUsersSchema,
};
