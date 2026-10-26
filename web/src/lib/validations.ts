import { z } from 'zod';

export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,25}$/;

export const RegisterSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, { message: 'Display name must be at least 2 characters' })
    .max(50, { message: 'Display name must not exceed 50 characters' }),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(USERNAME_REGEX, {
      message: 'Username must be 3-25 characters long and contain only letters, numbers, and underscores',
    }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'Please provide a valid email address' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .regex(/\d/, { message: 'Password must contain at least one number' }),
});

export const LoginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(3, { message: 'Please enter a valid username or email' }),
  password: z
    .string()
    .min(1, { message: 'Password is required' }),
});

export const CheckUsernameSchema = z.object({
  q: z
    .string()
    .trim()
    .toLowerCase()
    .regex(USERNAME_REGEX, {
      message: 'Username must be 3-25 characters long and contain only letters, numbers, and underscores',
    }),
});

export const ProfileUpdateSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, { message: 'Display name must be at least 2 characters' })
    .max(50, { message: 'Display name must not exceed 50 characters' })
    .optional(),
  about: z
    .string()
    .trim()
    .max(255, { message: 'About status must not exceed 255 characters' })
    .optional(),
});

export const AddContactSchema = z.object({
  contactUserId: z
    .string()
    .min(1, { message: 'Contact user ID is required' }),
  aliasName: z
    .string()
    .trim()
    .max(100, { message: 'Nickname must not exceed 100 characters' })
    .optional()
    .nullable(),
});

export const SearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(100, { message: 'Search query is too long' }),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type CheckUsernameInput = z.infer<typeof CheckUsernameSchema>;
export type ProfileUpdateInput = z.infer<typeof ProfileUpdateSchema>;
export type AddContactInput = z.infer<typeof AddContactSchema>;
export type SearchQueryInput = z.infer<typeof SearchQuerySchema>;
