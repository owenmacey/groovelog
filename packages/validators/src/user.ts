import { z } from "zod";

export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be 30 characters or fewer")
  .regex(
    /^[a-zA-Z0-9._]+$/,
    "Username may only contain letters, numbers, underscores, and periods"
  );

export const registerSchema = z.object({
  email: z.string().email(),
  username: usernameSchema,
  password: z.string().min(8),
  displayName: z.string().min(1).max(100).optional(),
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
  displayName: z.string().min(1).max(100).optional(),
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
