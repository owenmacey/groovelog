import { TRPCError } from "@trpc/server";
import { and, desc, eq, ilike, lt, sql } from "drizzle-orm";
import {
  albumEntries,
  albums,
  entryLikes,
  feedEvents,
  ratings,
  tracks,
  users,
} from "@groovelog/db";
import type { DB, EntryPublishedPayload } from "@groovelog/db";
import {
  deleteEntrySchema,
  getEntryByUserAndAlbumSchema,
  getEntrySchema,
  getOrCreateDraftSchema,
  likeEntrySchema,
  listUserEntriesSchema,
  publishEntrySchema,
  rateTrackSchema,
  unpublishEntrySchema,
  updateDraftSchema,
} from "@groovelog/validators";
import { protectedProcedure, publicProcedure, router } from "../trpc";
import { getSpotifyClient } from "../lib/spotify";
import { upsertAlbum, upsertArtist, upsertTrack } from "./catalog";
import type { SpotifyTrackSimple } from "../lib/spotify";
import { checkContent } from "../lib/moderation";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getFullEntry(db: DB, entryId: string) {
  const entry = await db.query.albumEntries.findFirst({
    where: eq(albumEntries.id, entryId),
    with: {
      album: { with: { artist: true } },
      user: {
        columns: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          isDayOne: true,
        },
      },
    },
  });
  if (!entry) return null;

  const trackRatings = await db
    .select({
      ratingId: ratings.id,
      rating: ratings.rating,
      ratingCreatedAt: ratings.createdAt,
      trackId: tracks.id,
      trackSpotifyId: tracks.spotifyId,
      trackTitle: tracks.title,
      trackNumber: tracks.trackNumber,
      discNumber: tracks.discNumber,
      durationMs: tracks.durationMs,
      previewUrl: tracks.previewUrl,
    })
    .from(ratings)
    .innerJoin(tracks, eq(tracks.id, ratings.targetId))
    .where(
      and(
        eq(ratings.albumEntryId, entryId),
        eq(ratings.targetType, "track")
      )
    )
    .orderBy(tracks.discNumber, tracks.trackNumber);

  return {
    ...entry,
    trackRatings: trackRatings.map((r) => ({
      id: r.ratingId,
      rating: r.rating,
      createdAt: r.ratingCreatedAt,
      track: {
        id: r.trackId,
        spotifyId: r.trackSpotifyId,
        title: r.trackTitle,
        trackNumber: r.trackNumber,
        discNumber: r.discNumber,
        durationMs: r.durationMs,
        previewUrl: r.previewUrl,
      },
    })),
  };
}

async function assertOwner(
  db: DB,
  entryId: string,
  userId: string
): Promise<typeof albumEntries.$inferSelect> {
  const entry = await db.query.albumEntries.findFirst({
    where: eq(albumEntries.id, entryId),
  });
  if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "Entry not found" });
  if (entry.userId !== userId) throw new TRPCError({ code: "FORBIDDEN" });
  return entry;
}

async function deleteFeedEvent(db: DB, actorId: string, entryId: string) {
  await db.delete(feedEvents).where(
    and(
      eq(feedEvents.actorId, actorId),
      sql`${feedEvents.payload}->>'entryId' = ${entryId}`
    )
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const entryRouter = router({
  /**
   * Returns the user's existing entry for an album (draft or published),
   * or creates a new draft. Always ensures the album is in the catalog first.
   */
  getOrCreateDraft: protectedProcedure
    .input(getOrCreateDraftSchema)
    .mutation(async ({ input, ctx }) => {
      // Ensure album + tracks are in the DB. Skip Spotify if already fully loaded.
      const existingAlbum = await ctx.db.query.albums.findFirst({
        where: eq(albums.spotifyId, input.albumSpotifyId),
        with: { tracks: true, artist: true },
      });

      let albumId: string;

      if (!existingAlbum || existingAlbum.tracks.length === 0) {
        const spotify = getSpotifyClient(ctx.redis);
        const spotifyAlbum = await spotify.getAlbum(input.albumSpotifyId);

        const primaryArtist = spotifyAlbum.artists[0];
        if (!primaryArtist) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Album has no artist" });
        }

        const artist = await upsertArtist(ctx, {
          ...primaryArtist,
          genres: spotifyAlbum.genres,
          popularity: spotifyAlbum.popularity,
        });
        const album = await upsertAlbum(ctx, spotifyAlbum, artist.id);
        albumId = album.id;

        const trackItems = (spotifyAlbum.tracks?.items ?? []).filter(
          (t): t is SpotifyTrackSimple => t !== null
        );
        for (const spotifyTrack of trackItems) {
          const trackArtist = spotifyTrack.artists[0] ?? primaryArtist;
          const trackArtistId =
            trackArtist.id === primaryArtist.id
              ? artist.id
              : (await upsertArtist(ctx, trackArtist)).id;
          await upsertTrack(ctx, spotifyTrack, albumId, trackArtistId);
        }
      } else {
        albumId = existingAlbum.id;
      }

      const existing = await ctx.db.query.albumEntries.findFirst({
        where: and(
          eq(albumEntries.userId, ctx.user.id),
          eq(albumEntries.albumId, albumId)
        ),
        columns: { id: true },
      });

      let entryId: string;
      if (existing) {
        entryId = existing.id;
      } else {
        const [created] = await ctx.db
          .insert(albumEntries)
          .values({ userId: ctx.user.id, albumId, status: "draft" })
          .returning({ id: albumEntries.id });
        if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        entryId = created.id;
      }

      const full = await getFullEntry(ctx.db, entryId);
      if (!full) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return full;
    }),

  /** Auto-save endpoint. Updates text/rating/date fields on a draft or published entry. */
  updateDraft: protectedProcedure
    .input(updateDraftSchema)
    .mutation(async ({ input, ctx }) => {
      await assertOwner(ctx.db, input.entryId, ctx.user.id);

      if (input.reviewBody != null && !checkContent(input.reviewBody)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Your review contains inappropriate content",
        });
      }

      const updateData: Partial<typeof albumEntries.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (input.overallRating !== undefined)
        updateData.overallRating = input.overallRating;
      if (input.reviewBody !== undefined)
        updateData.reviewBody = input.reviewBody;
      if (input.listenedAt !== undefined)
        updateData.listenedAt = input.listenedAt;

      await ctx.db
        .update(albumEntries)
        .set(updateData)
        .where(eq(albumEntries.id, input.entryId));

      const full = await getFullEntry(ctx.db, input.entryId);
      if (!full) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return full;
    }),

  /** Upserts a track rating linked to this entry. rating=0 deletes it. */
  rateTrack: protectedProcedure
    .input(rateTrackSchema)
    .mutation(async ({ input, ctx }) => {
      const entry = await assertOwner(ctx.db, input.entryId, ctx.user.id);

      const track = await ctx.db.query.tracks.findFirst({
        where: eq(tracks.spotifyId, input.trackSpotifyId),
      });
      if (!track) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Track not found" });
      }
      if (track.albumId !== entry.albumId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Track does not belong to this album",
        });
      }

      if (input.rating === 0) {
        await ctx.db
          .delete(ratings)
          .where(
            and(
              eq(ratings.userId, ctx.user.id),
              eq(ratings.targetType, "track"),
              eq(ratings.targetId, track.id)
            )
          );
      } else {
        await ctx.db
          .insert(ratings)
          .values({
            userId: ctx.user.id,
            targetType: "track",
            targetId: track.id,
            rating: input.rating,
            albumEntryId: input.entryId,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [ratings.userId, ratings.targetType, ratings.targetId],
            set: {
              rating: input.rating,
              albumEntryId: input.entryId,
              updatedAt: new Date(),
            },
          });
      }

      const full = await getFullEntry(ctx.db, input.entryId);
      if (!full) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return full;
    }),

  /** Publishes an entry. Emits entry_published or entry_updated feed event. */
  publish: protectedProcedure
    .input(publishEntrySchema)
    .mutation(async ({ input, ctx }) => {
      const entry = await assertOwner(ctx.db, input.entryId, ctx.user.id);

      // Count linked track ratings
      const [trackCountRow] = await ctx.db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(ratings)
        .where(
          and(
            eq(ratings.albumEntryId, input.entryId),
            eq(ratings.targetType, "track")
          )
        );
      const trackRatingCount = trackCountRow?.count ?? 0;

      if (!entry.overallRating && !entry.reviewBody && trackRatingCount === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Add a rating, review, or track ratings before publishing",
        });
      }

      if (entry.reviewBody && !checkContent(entry.reviewBody)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Your review contains inappropriate content",
        });
      }

      const isFirstPublish = entry.publishedAt === null;
      await ctx.db
        .update(albumEntries)
        .set({
          status: "published",
          publishedAt: isFirstPublish ? new Date() : entry.publishedAt,
          updatedAt: new Date(),
        })
        .where(eq(albumEntries.id, input.entryId));

      // Feed event — non-blocking
      try {
        const [albumRow, [existingEvent]] = await Promise.all([
          ctx.db.query.albums.findFirst({
            where: eq(albums.id, entry.albumId),
            with: { artist: true },
          }),
          ctx.db
            .select({ id: feedEvents.id })
            .from(feedEvents)
            .where(
              and(
                eq(feedEvents.actorId, ctx.user.id),
                sql`${feedEvents.payload}->>'entryId' = ${input.entryId}`
              )
            )
            .limit(1),
        ]);

        if (albumRow) {
          const payload: EntryPublishedPayload = {
            entryId: input.entryId,
            albumId: entry.albumId,
            albumSpotifyId: albumRow.spotifyId,
            albumTitle: albumRow.title,
            artistName: albumRow.artist.name,
            coverUrl: albumRow.coverUrl,
            overallRating: entry.overallRating,
            reviewSnippet: entry.reviewBody ? entry.reviewBody.slice(0, 200) : null,
            trackRatingCount,
            totalTrackCount: albumRow.totalTracks,
          };

          if (existingEvent) {
            await ctx.db
              .update(feedEvents)
              .set({ type: "entry_updated", payload, createdAt: new Date() })
              .where(eq(feedEvents.id, existingEvent.id));
          } else {
            await ctx.db.insert(feedEvents).values({
              actorId: ctx.user.id,
              type: "entry_published",
              payload,
            });
          }
        }
      } catch (e) {
        console.error("[entry.publish] feedEvent failed (entry still published):", e);
      }

      const full = await getFullEntry(ctx.db, input.entryId);
      if (!full) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return full;
    }),

  /** Sets a published entry back to draft and removes its feed event. */
  unpublish: protectedProcedure
    .input(unpublishEntrySchema)
    .mutation(async ({ input, ctx }) => {
      await assertOwner(ctx.db, input.entryId, ctx.user.id);

      await ctx.db
        .update(albumEntries)
        .set({ status: "draft", updatedAt: new Date() })
        .where(eq(albumEntries.id, input.entryId));

      await deleteFeedEvent(ctx.db, ctx.user.id, input.entryId);

      const full = await getFullEntry(ctx.db, input.entryId);
      if (!full) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return full;
    }),

  /** Permanently deletes an entry, its linked track ratings, and its feed event. */
  delete: protectedProcedure
    .input(deleteEntrySchema)
    .mutation(async ({ input, ctx }) => {
      await assertOwner(ctx.db, input.entryId, ctx.user.id);

      await Promise.all([
        ctx.db.delete(ratings).where(eq(ratings.albumEntryId, input.entryId)),
        deleteFeedEvent(ctx.db, ctx.user.id, input.entryId),
      ]);

      await ctx.db
        .delete(albumEntries)
        .where(eq(albumEntries.id, input.entryId));

      return { success: true };
    }),

  /** Returns a full entry with like data. Drafts are only visible to their author. */
  getEntry: publicProcedure
    .input(getEntrySchema)
    .query(async ({ input, ctx }) => {
      const entry = await getFullEntry(ctx.db, input.entryId);
      if (!entry) throw new TRPCError({ code: "NOT_FOUND" });

      const viewerId = ctx.session?.user?.id ?? null;
      if (entry.status === "draft" && entry.userId !== viewerId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const [likeCountRow] = await ctx.db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(entryLikes)
        .where(eq(entryLikes.entryId, input.entryId));

      const likeCount = likeCountRow?.count ?? 0;

      let isLiked = false;
      if (viewerId) {
        const liked = await ctx.db.query.entryLikes.findFirst({
          where: and(
            eq(entryLikes.userId, viewerId),
            eq(entryLikes.entryId, input.entryId)
          ),
          columns: { userId: true },
        });
        isLiked = !!liked;
      }

      return { ...entry, likeCount, isLiked };
    }),

  /** Returns a user's published entry for a specific album, or null. */
  getEntryByUserAndAlbum: publicProcedure
    .input(getEntryByUserAndAlbumSchema)
    .query(async ({ input, ctx }) => {
      const [user, album] = await Promise.all([
        ctx.db.query.users.findFirst({
          where: ilike(users.username, input.username),
          columns: { id: true },
        }),
        ctx.db.query.albums.findFirst({
          where: eq(albums.spotifyId, input.albumSpotifyId),
          columns: { id: true },
        }),
      ]);
      if (!user) return null;
      if (!album) return null;

      const entry = await ctx.db.query.albumEntries.findFirst({
        where: and(
          eq(albumEntries.userId, user.id),
          eq(albumEntries.albumId, album.id),
          eq(albumEntries.status, "published")
        ),
        columns: { id: true },
      });
      if (!entry) return null;

      return getFullEntry(ctx.db, entry.id);
    }),

  /** Paginated published entries for a user, newest first. */
  listUserEntries: publicProcedure
    .input(listUserEntriesSchema)
    .query(async ({ input, ctx }) => {
      const user = await ctx.db.query.users.findFirst({
        where: ilike(users.username, input.username),
        columns: { id: true },
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      const rows = await ctx.db.query.albumEntries.findMany({
        where: and(
          eq(albumEntries.userId, user.id),
          eq(albumEntries.status, "published"),
          input.cursor
            ? lt(albumEntries.publishedAt, new Date(input.cursor))
            : undefined
        ),
        orderBy: [desc(albumEntries.publishedAt)],
        limit: input.limit + 1,
        with: {
          album: { with: { artist: true } },
        },
      });

      const hasMore = rows.length > input.limit;
      const items = hasMore ? rows.slice(0, -1) : rows;
      const lastItem = items.at(-1);

      return {
        items,
        nextCursor:
          hasMore && lastItem?.publishedAt
            ? lastItem.publishedAt.toISOString()
            : undefined,
      };
    }),

  /** Returns the current user's draft entries. */
  listDrafts: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.albumEntries.findMany({
      where: and(
        eq(albumEntries.userId, ctx.user.id),
        eq(albumEntries.status, "draft")
      ),
      orderBy: [desc(albumEntries.updatedAt)],
      with: {
        album: { with: { artist: true } },
      },
    });
  }),

  /** Top 3 published entries by like count, for the landing page. */
  getFeaturedEntries: publicProcedure
    .query(async ({ ctx }) => {
      const rows = await ctx.db
        .select({
          entryId: albumEntries.id,
          likeCount: sql<number>`COUNT(${entryLikes.entryId})::int`,
        })
        .from(albumEntries)
        .innerJoin(entryLikes, eq(entryLikes.entryId, albumEntries.id))
        .where(eq(albumEntries.status, "published"))
        .groupBy(albumEntries.id)
        .orderBy(desc(sql<number>`COUNT(${entryLikes.entryId})`))
        .limit(3);

      const results = await Promise.all(
        rows.map(async ({ entryId, likeCount }) => {
          const entry = await ctx.db.query.albumEntries.findFirst({
            where: eq(albumEntries.id, entryId),
            with: {
              album: { with: { artist: true } },
              user: {
                columns: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                  isDayOne: true,
                },
              },
            },
          });
          return entry ? { ...entry, likeCount } : null;
        })
      );

      return results.filter((r): r is NonNullable<typeof r> => r !== null);
    }),

  /** Toggles a like on a published entry. Returns the new liked state. */
  like: protectedProcedure
    .input(likeEntrySchema)
    .mutation(async ({ input, ctx }) => {
      const entry = await ctx.db.query.albumEntries.findFirst({
        where: and(
          eq(albumEntries.id, input.entryId),
          eq(albumEntries.status, "published")
        ),
        columns: { id: true },
      });
      if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "Entry not found" });

      const existing = await ctx.db.query.entryLikes.findFirst({
        where: and(
          eq(entryLikes.userId, ctx.user.id),
          eq(entryLikes.entryId, input.entryId)
        ),
        columns: { userId: true },
      });

      if (existing) {
        await ctx.db
          .delete(entryLikes)
          .where(
            and(
              eq(entryLikes.userId, ctx.user.id),
              eq(entryLikes.entryId, input.entryId)
            )
          );
        return { liked: false };
      } else {
        await ctx.db.insert(entryLikes).values({
          userId: ctx.user.id,
          entryId: input.entryId,
        });
        return { liked: true };
      }
    }),
});
