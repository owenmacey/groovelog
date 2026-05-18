import { z } from "zod";

export const usernameSchema = z
  .string()
  .min(3)
  .max(30)
  .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers, and underscores");

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
