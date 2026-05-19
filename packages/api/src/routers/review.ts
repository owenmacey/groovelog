import { TRPCError } from "@trpc/server";
import { eq, and, desc, lt, sql } from "drizzle-orm";
import { reviews, reviewLikes, ratings, users, feedEvents, albums, tracks } from "@groovelog/db";
import {
  createReviewSchema,
  updateReviewSchema,
  deleteReviewSchema,
  listReviewsSchema,
  likeReviewSchema,
  getUserReviewSchema,
} from "@groovelog/validators";
import { router, publicProcedure, protectedProcedure } from "../trpc";

export const reviewRouter = router({
  create: protectedProcedure
    .input(createReviewSchema)
    .mutation(async ({ input, ctx }) => {
      // Enforce: one review per user per target
      const existing = await ctx.db.query.reviews.findFirst({
        where: and(
          eq(reviews.userId, ctx.user.id),
          eq(reviews.targetType, input.targetType),
          eq(reviews.targetId, input.targetId)
        ),
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You have already reviewed this. Update your existing review instead.",
        });
      }

      const [row] = await ctx.db
        .insert(reviews)
        .values({
          userId: ctx.user.id,
          targetType: input.targetType,
          targetId: input.targetId,
          body: input.body,
          ratingId: input.ratingId ?? null,
          containsSpoilers: input.containsSpoilers,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      if (!row) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const userRating = input.ratingId
        ? await ctx.db.query.ratings.findFirst({
            where: eq(ratings.id, input.ratingId),
          })
        : null;

      // Resolve title + cover + spotifyId inline (no worker needed)
      let title = "";
      let coverUrl: string | null = null;
      let spotifyId = "";
      if (input.targetType === "album") {
        const album = await ctx.db.query.albums.findFirst({ where: eq(albums.id, input.targetId) });
        title = album?.title ?? "";
        coverUrl = album?.coverUrl ?? null;
        spotifyId = album?.spotifyId ?? "";
      } else {
        const track = await ctx.db.query.tracks.findFirst({
          where: eq(tracks.id, input.targetId),
          with: { album: true },
        });
        title = track?.title ?? "";
        coverUrl = track?.album?.coverUrl ?? null;
        spotifyId = track?.spotifyId ?? "";
      }

      const [feedRow] = await ctx.db.insert(feedEvents).values({
        actorId: ctx.user.id,
        type: "reviewed",
        payload: {
          targetType: input.targetType,
          targetId: input.targetId,
          spotifyId,
          reviewId: row.id,
          rating: userRating?.rating ?? null,
          title,
          coverUrl,
        },
      }).returning({ id: feedEvents.id });
      console.log("[review] feedEvent inserted:", feedRow?.id);

      return row;
    }),

  update: protectedProcedure
    .input(updateReviewSchema)
    .mutation(async ({ input, ctx }) => {
      const review = await ctx.db.query.reviews.findFirst({
        where: eq(reviews.id, input.id),
      });
      if (!review) throw new TRPCError({ code: "NOT_FOUND" });
      if (review.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const [updated] = await ctx.db
        .update(reviews)
        .set({ body: input.body, updatedAt: new Date() })
        .where(eq(reviews.id, input.id))
        .returning();

      // Bump the existing feed event so the edit surfaces fresh in the feed
      try {
        const [existing] = await ctx.db
          .select({ id: feedEvents.id })
          .from(feedEvents)
          .where(
            and(
              eq(feedEvents.actorId, ctx.user.id),
              eq(feedEvents.type, "reviewed"),
              sql`${feedEvents.payload}->>'reviewId' = ${input.id}`
            )
          )
          .limit(1);

        if (existing) {
          await ctx.db
            .update(feedEvents)
            .set({ createdAt: new Date() })
            .where(eq(feedEvents.id, existing.id));
          console.log("[review.update] feedEvent bumped:", existing.id);
        }
      } catch (e) {
        console.error("[review.update] feedEvent bump failed:", e);
      }

      return updated;
    }),

  delete: protectedProcedure
    .input(deleteReviewSchema)
    .mutation(async ({ input, ctx }) => {
      const review = await ctx.db.query.reviews.findFirst({
        where: eq(reviews.id, input.id),
      });
      if (!review) throw new TRPCError({ code: "NOT_FOUND" });
      if (review.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await ctx.db.delete(reviews).where(eq(reviews.id, input.id));
      return { success: true };
    }),

  list: publicProcedure
    .input(listReviewsSchema)
    .query(async ({ input, ctx }) => {
      const currentUserId = ctx.session?.user?.id ?? null;

      const rows = await ctx.db.query.reviews.findMany({
        where: and(
          eq(reviews.targetType, input.targetType),
          eq(reviews.targetId, input.targetId),
          input.cursor
            ? lt(reviews.createdAt, new Date(input.cursor))
            : undefined
        ),
        orderBy: [desc(sql`(SELECT COUNT(*) FROM review_likes WHERE review_id = ${reviews.id})`), desc(reviews.createdAt)],
        limit: input.limit + 1,
        with: {
          user: true,
          rating: true,
          likes: true,
        },
      });

      const hasMore = rows.length > input.limit;
      const items = hasMore ? rows.slice(0, -1) : rows;
      const lastItem = items.at(-1);
      const nextCursor = hasMore && lastItem
        ? lastItem.createdAt.toISOString()
        : undefined;

      // One lookup to resolve the Spotify ID for the target shared by all reviews on this page.
      // Uses the core select builder (not the relational API) for reliable column selection.
      let targetSpotifyId = "";
      if (input.targetType === "album") {
        const [albumRow] = await ctx.db
          .select({ spotifyId: albums.spotifyId })
          .from(albums)
          .where(eq(albums.id, input.targetId))
          .limit(1);
        targetSpotifyId = albumRow?.spotifyId ?? "";
      } else {
        const [trackRow] = await ctx.db
          .select({ spotifyId: tracks.spotifyId })
          .from(tracks)
          .where(eq(tracks.id, input.targetId))
          .limit(1);
        targetSpotifyId = trackRow?.spotifyId ?? "";
      }
      console.log("[review.list] targetId:", input.targetId, "targetType:", input.targetType, "→ spotifyId:", targetSpotifyId);

      const enriched = items.map((r) => ({
        ...r,
        spotifyId: targetSpotifyId,
        likeCount: r.likes.length,
        isLiked: currentUserId
          ? r.likes.some((l) => l.userId === currentUserId)
          : false,
        likes: undefined, // don't send the full array to client
      }));

      return { items: enriched, nextCursor };
    }),

  like: protectedProcedure
    .input(likeReviewSchema)
    .mutation(async ({ input, ctx }) => {
      const review = await ctx.db.query.reviews.findFirst({
        where: eq(reviews.id, input.reviewId),
      });
      if (!review) throw new TRPCError({ code: "NOT_FOUND" });

      const existing = await ctx.db.query.reviewLikes.findFirst({
        where: and(
          eq(reviewLikes.userId, ctx.user.id),
          eq(reviewLikes.reviewId, input.reviewId)
        ),
      });

      if (existing) {
        // Toggle off
        await ctx.db
          .delete(reviewLikes)
          .where(
            and(
              eq(reviewLikes.userId, ctx.user.id),
              eq(reviewLikes.reviewId, input.reviewId)
            )
          );
        return { liked: false };
      }

      await ctx.db.insert(reviewLikes).values({
        userId: ctx.user.id,
        reviewId: input.reviewId,
        createdAt: new Date(),
      });
      return { liked: true };
    }),

  getUserReview: publicProcedure
    .input(getUserReviewSchema)
    .query(async ({ input, ctx }) => {
      if (!ctx.session?.user) return null;
      const row = await ctx.db.query.reviews.findFirst({
        where: and(
          eq(reviews.userId, ctx.session.user.id),
          eq(reviews.targetType, input.targetType),
          eq(reviews.targetId, input.targetId)
        ),
        with: { rating: true },
      });
      return row ?? null;
    }),
});
