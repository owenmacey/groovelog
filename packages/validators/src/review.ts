import { z } from "zod";
import { targetTypeSchema } from "./rating";

export const createReviewSchema = z.object({
  targetType: targetTypeSchema,
  targetId: z.string().min(1),
  body: z.string().min(1).max(2000),
  ratingId: z.string().optional(),
  containsSpoilers: z.boolean().default(false),
});

export const updateReviewSchema = z.object({
  id: z.string().min(1),
  body: z.string().min(1).max(2000),
});

export const deleteReviewSchema = z.object({
  id: z.string().min(1),
});

export const listReviewsSchema = z.object({
  targetType: targetTypeSchema,
  targetId: z.string().min(1),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export const likeReviewSchema = z.object({
  reviewId: z.string().min(1),
});

export const getUserReviewSchema = z.object({
  targetType: targetTypeSchema,
  targetId: z.string().min(1),
});
