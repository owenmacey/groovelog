import { z } from "zod";

export const getOrCreateDraftSchema = z.object({
  albumSpotifyId: z.string().min(1),
});

export const updateDraftSchema = z.object({
  entryId: z.string().min(1),
  overallRating: z.number().int().min(1).max(10).nullable().optional(),
  reviewBody: z.string().max(2000).nullable().optional(),
  listenedAt: z.string().date().nullable().optional(),
});

export const rateTrackSchema = z.object({
  entryId: z.string().min(1),
  trackSpotifyId: z.string().min(1),
  rating: z.number().int().min(0).max(10), // 0 = delete
});

const entryIdSchema = z.object({ entryId: z.string().min(1) });

export const publishEntrySchema = entryIdSchema;
export const unpublishEntrySchema = entryIdSchema;
export const deleteEntrySchema = entryIdSchema;
export const getEntrySchema = entryIdSchema;

export const getEntryByUserAndAlbumSchema = z.object({
  username: z.string().min(1),
  albumSpotifyId: z.string().min(1),
});

export const listUserEntriesSchema = z.object({
  username: z.string().min(1),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export const likeEntrySchema = z.object({ entryId: z.string().min(1) });
