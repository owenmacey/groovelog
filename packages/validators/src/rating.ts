import { z } from "zod";

export const targetTypeSchema = z.enum(["track", "album"]);
export type TargetType = z.infer<typeof targetTypeSchema>;

// Raw 1–10 integer stored in DB; displayed as 0.5–5.0 stars (divide by 2)
export const ratingValueSchema = z
  .number()
  .int()
  .min(1)
  .max(10);

export const upsertRatingSchema = z.object({
  targetType: targetTypeSchema,
  targetId: z.string().min(1),
  rating: ratingValueSchema,
});

export const deleteRatingSchema = z.object({
  targetType: targetTypeSchema,
  targetId: z.string().min(1),
});

export const getUserRatingSchema = z.object({
  targetType: targetTypeSchema,
  targetId: z.string().min(1),
});

export const getAggregatesSchema = z.object({
  targetType: targetTypeSchema,
  targetId: z.string().min(1),
});
