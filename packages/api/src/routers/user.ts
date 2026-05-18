import { TRPCError } from "@trpc/server";
import { eq, and, desc, lt, sql, inArray } from "drizzle-orm";
import { users, follows, ratings, reviews, feedEvents } from "@groovelog/db";
import {
  getUserProfileSchema,
  followUserSchema,
  getPaginatedSchema,
  updateProfileSchema,
  getRecentActivitySchema,
} from "@groovelog/validators";
import { router, publicProcedure, protectedProcedure } from "../trpc";

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

      return {
        items,
        nextCursor: hasMore && lastItem
          ? lastItem.createdAt.toISOString()
          : undefined,
      };
    }),
});
