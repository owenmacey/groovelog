import { TRPCError } from "@trpc/server";
import { eq, and, desc, lt, sql, inArray, ilike, or, ne } from "drizzle-orm";
import { users, follows, ratings, reviews, reviewLikes, feedEvents, albums, tracks, artists } from "@groovelog/db";
import type { DB, RatedPayload, ReviewedPayload } from "@groovelog/db";
import {
  getUserProfileSchema,
  followUserSchema,
  getPaginatedSchema,
  updateProfileSchema,
  getRecentActivitySchema,
  searchUsersSchema,
} from "@groovelog/validators";
import { router, publicProcedure, protectedProcedure } from "../trpc";

async function enrichActivity<T extends { type: string; payload: unknown }>(
  db: DB,
  items: T[]
): Promise<Array<T & { reviewBody: string | undefined; likeCount: number | undefined; artistName: string | undefined }>> {
  const reviewIds = new Set<string>();
  const albumIds = new Set<string>();
  const trackIds = new Set<string>();

  for (const e of items) {
    if (e.type === "reviewed") {
      const p = e.payload as ReviewedPayload;
      if (p.reviewId) reviewIds.add(p.reviewId);
    }
    if (e.type === "rated" || e.type === "reviewed") {
      const p = e.payload as RatedPayload | ReviewedPayload;
      if (p.targetType === "album") albumIds.add(p.targetId);
      else if (p.targetType === "track") trackIds.add(p.targetId);
    }
  }

  const bodyMap = new Map<string, string>();
  const likeCountMap = new Map<string, number>();
  const artistNameMap = new Map<string, string>();

  if (reviewIds.size > 0) {
    const ids = Array.from(reviewIds);
    const bodyRows = await db
      .select({ id: reviews.id, body: reviews.body })
      .from(reviews)
      .where(inArray(reviews.id, ids));
    bodyRows.forEach((r) => bodyMap.set(r.id, r.body));

    const likeRows = await db
      .select({ reviewId: reviewLikes.reviewId, count: sql<number>`COUNT(*)::int` })
      .from(reviewLikes)
      .where(inArray(reviewLikes.reviewId, ids))
      .groupBy(reviewLikes.reviewId);
    likeRows.forEach((r) => likeCountMap.set(r.reviewId, r.count));
  }

  if (albumIds.size > 0) {
    const rows = await db
      .select({ id: albums.id, name: artists.name })
      .from(albums)
      .innerJoin(artists, eq(albums.artistId, artists.id))
      .where(inArray(albums.id, Array.from(albumIds)));
    rows.forEach((r) => artistNameMap.set(r.id, r.name));
  }

  if (trackIds.size > 0) {
    const rows = await db
      .select({ id: tracks.id, name: artists.name })
      .from(tracks)
      .innerJoin(artists, eq(tracks.artistId, artists.id))
      .where(inArray(tracks.id, Array.from(trackIds)));
    rows.forEach((r) => artistNameMap.set(r.id, r.name));
  }

  return items.map((e) => {
    const isMedia = e.type === "rated" || e.type === "reviewed";
    const p = isMedia ? (e.payload as RatedPayload | ReviewedPayload) : null;
    const reviewId = e.type === "reviewed" ? (e.payload as ReviewedPayload).reviewId : undefined;
    return {
      ...e,
      reviewBody: reviewId ? bodyMap.get(reviewId) : undefined,
      likeCount: reviewId !== undefined ? (likeCountMap.get(reviewId) ?? 0) : undefined,
      artistName: p ? artistNameMap.get(p.targetId) : undefined,
    };
  });
}

export const userRouter = router({
  getProfile: publicProcedure
    .input(getUserProfileSchema)
    .query(async ({ input, ctx }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.username, input.username),
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      const currentUserId = ctx.session?.user?.id ?? null;

      const [ratingCount] = await ctx.db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(ratings)
        .where(eq(ratings.userId, user.id));

      const [reviewCount] = await ctx.db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(reviews)
        .where(eq(reviews.userId, user.id));

      const [followerCount] = await ctx.db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(follows)
        .where(eq(follows.followingId, user.id));

      const [followingCount] = await ctx.db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(follows)
        .where(eq(follows.followerId, user.id));

      const [avgRatingRow] = await ctx.db
        .select({
          avg: sql<number>`ROUND(AVG(${ratings.rating})::numeric, 2)`,
        })
        .from(ratings)
        .where(eq(ratings.userId, user.id));

      let isFollowing = false;
      if (currentUserId && currentUserId !== user.id) {
        const followRow = await ctx.db.query.follows.findFirst({
          where: and(
            eq(follows.followerId, currentUserId),
            eq(follows.followingId, user.id)
          ),
        });
        isFollowing = Boolean(followRow);
      }

      console.log(`[getProfile] ${user.username} — followers:${followerCount?.count ?? 0} following:${followingCount?.count ?? 0} ratings:${ratingCount?.count ?? 0}`);

      return {
        user,
        stats: {
          ratingCount: ratingCount?.count ?? 0,
          reviewCount: reviewCount?.count ?? 0,
          followerCount: followerCount?.count ?? 0,
          followingCount: followingCount?.count ?? 0,
          avgRating: avgRatingRow?.avg ?? null,
        },
        isFollowing,
        isOwnProfile: currentUserId === user.id,
      };
    }),

  follow: protectedProcedure
    .input(followUserSchema)
    .mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot follow yourself",
        });
      }

      const target = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.userId),
      });
      if (!target) throw new TRPCError({ code: "NOT_FOUND" });

      const existing = await ctx.db.query.follows.findFirst({
        where: and(
          eq(follows.followerId, ctx.user.id),
          eq(follows.followingId, input.userId)
        ),
      });

      if (existing) {
        // Unfollow
        await ctx.db
          .delete(follows)
          .where(
            and(
              eq(follows.followerId, ctx.user.id),
              eq(follows.followingId, input.userId)
            )
          );
        return { following: false };
      }

      // Follow
      await ctx.db.insert(follows).values({
        followerId: ctx.user.id,
        followingId: input.userId,
        createdAt: new Date(),
      });

      const [feedRow] = await ctx.db.insert(feedEvents).values({
        actorId: ctx.user.id,
        type: "followed",
        payload: {
          targetUserId: input.userId,
          targetUsername: target.username,
          targetDisplayName: target.displayName,
        },
      }).returning({ id: feedEvents.id });
      console.log("[follow] feedEvent inserted:", feedRow?.id);

      return { following: true };
    }),

  getFollowers: publicProcedure
    .input(getPaginatedSchema)
    .query(async ({ input, ctx }) => {
      const rows = await ctx.db.query.follows.findMany({
        where: and(
          eq(follows.followingId, input.userId),
          input.cursor
            ? lt(follows.createdAt, new Date(input.cursor))
            : undefined
        ),
        orderBy: [desc(follows.createdAt)],
        limit: input.limit + 1,
        with: { follower: true },
      });

      const hasMore = rows.length > input.limit;
      const items = hasMore ? rows.slice(0, -1) : rows;
      const lastItem = items.at(-1);

      return {
        items: items.map((r) => r.follower),
        nextCursor: hasMore && lastItem
          ? lastItem.createdAt.toISOString()
          : undefined,
      };
    }),

  getFollowing: publicProcedure
    .input(getPaginatedSchema)
    .query(async ({ input, ctx }) => {
      const rows = await ctx.db.query.follows.findMany({
        where: and(
          eq(follows.followerId, input.userId),
          input.cursor
            ? lt(follows.createdAt, new Date(input.cursor))
            : undefined
        ),
        orderBy: [desc(follows.createdAt)],
        limit: input.limit + 1,
        with: { following: true },
      });

      const hasMore = rows.length > input.limit;
      const items = hasMore ? rows.slice(0, -1) : rows;
      const lastItem = items.at(-1);

      return {
        items: items.map((r) => r.following),
        nextCursor: hasMore && lastItem
          ? lastItem.createdAt.toISOString()
          : undefined,
      };
    }),

  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ input, ctx }) => {
      const set: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
      if (input.displayName !== undefined) set.displayName = input.displayName;
      if (input.bio !== undefined) set.bio = input.bio;
      if (input.avatarUrl !== undefined) set.avatarUrl = input.avatarUrl;

      const [updated] = await ctx.db
        .update(users)
        .set(set)
        .where(eq(users.id, ctx.user.id))
        .returning();

      return updated;
    }),

  search: publicProcedure
    .input(searchUsersSchema)
    .query(async ({ input, ctx }) => {
      const limit = 10;
      const offset = input.cursor ?? 0;
      const pattern = `%${input.query}%`;
      const currentUserId = ctx.session?.user?.id ?? null;

      const rows = await ctx.db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(
          and(
            or(ilike(users.username, pattern), ilike(users.displayName, pattern)),
            currentUserId ? ne(users.id, currentUserId) : undefined
          )
        )
        .limit(limit + 1)
        .offset(offset);

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, -1) : rows;

      let followingSet = new Set<string>();
      if (currentUserId && items.length > 0) {
        const userIds = items.map((u) => u.id);
        const followRows = await ctx.db
          .select({ followingId: follows.followingId })
          .from(follows)
          .where(
            and(
              eq(follows.followerId, currentUserId),
              inArray(follows.followingId, userIds)
            )
          );
        followingSet = new Set(followRows.map((r) => r.followingId));
      }

      return {
        users: items.map((u) => ({
          ...u,
          isFollowing: followingSet.has(u.id),
        })),
        nextCursor: hasMore ? offset + limit : undefined,
      };
    }),

  getRecentActivity: publicProcedure
    .input(getRecentActivitySchema)
    .query(async ({ input, ctx }) => {
      const rows = await ctx.db.query.feedEvents.findMany({
        where: and(
          eq(feedEvents.actorId, input.userId),
          input.cursor
            ? lt(feedEvents.createdAt, new Date(input.cursor))
            : undefined
        ),
        orderBy: [desc(feedEvents.createdAt)],
        limit: input.limit + 1,
        with: { actor: true },
      });

      const hasMore = rows.length > input.limit;
      const items = hasMore ? rows.slice(0, -1) : rows;
      const lastItem = items.at(-1);
      const enriched = await enrichActivity(ctx.db, items);

      return {
        items: enriched,
        nextCursor: hasMore && lastItem
          ? lastItem.createdAt.toISOString()
          : undefined,
      };
    }),
});
