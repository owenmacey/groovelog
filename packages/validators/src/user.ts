import { z } from "zod";

export const displayNameSchema = z
  .string()
  .min(1, "Display name must be at least 1 character")
  .max(100, "Display name must be 100 characters or fewer")
  .regex(
    /^[a-zA-Z0-9._]+$/,
    "Display name may only contain letters, numbers, underscores, and periods"
  )
  .refine(
    (val) => !/[!@#$%^&*()\-+=\[\]{};':"\\|,<>/?`~ ]/.test(val),
    { message: "Display name contains an invalid character." }
  );

export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be 30 characters or fewer")
  .regex(
    /^[a-zA-Z0-9._]+$/,
    "Username may only contain letters, numbers, underscores, and periods"
  )
  .refine(
    (val) => !/[!@#$%^&*()\-+=\[\]{};':"\\|,<>/?`~ ]/.test(val),
    { message: "Username contains an invalid character." }
  );

export const registerSchema = z.object({
  email: z.string().email(),
  username: usernameSchema,
  password: z.string().min(8),
  displayName: displayNameSchema.optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const getUserProfileSchema = z.object({
  username: z.string().min(1),
});

export const followUserSchema = z.object({
  userId: z.string().min(1),
});

export const getPaginatedSchema = z.object({
  userId: z.string().min(1),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export const updateProfileSchema = z.object({
  displayName: displayNameSchema.optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
});

export const getRecentActivitySchema = z.object({
  userId: z.string().min(1),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export const searchUsersSchema = z.object({
  query: z.string().min(1),
  cursor: z.number().int().min(0).optional(),
});

export const changeUsernameSchema = z.object({
  username: usernameSchema,
});
