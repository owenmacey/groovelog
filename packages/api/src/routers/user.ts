import { TRPCError } from "@trpc/server";
import { eq, and, desc, lt, sql, inArray, ilike, or, ne } from "drizzle-orm";
import { users, follows, ratings, feedEvents, albumEntries } from "@groovelog/db";
import {
  getUserProfileSchema,
  followUserSchema,
  getPaginatedSchema,
  updateProfileSchema,
  searchUsersSchema,
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

      const [
        [entryCountRow],
        [avgEntryRatingRow],
        [tracksRatedRow],
        [followerCount],
        [followingCount],
      ] = await Promise.all([
        ctx.db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(albumEntries)
          .where(and(eq(albumEntries.userId, user.id), eq(albumEntries.status, "published"))),

        ctx.db
          .select({ avg: sql<number>`ROUND(AVG(${albumEntries.overallRating})::numeric, 2)` })
          .from(albumEntries)
          .where(and(eq(albumEntries.userId, user.id), eq(albumEntries.status, "published"))),

        ctx.db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(ratings)
          .where(and(eq(ratings.userId, user.id), eq(ratings.targetType, "track"))),

        ctx.db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(follows)
          .where(eq(follows.followingId, user.id)),

        ctx.db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(follows)
          .where(eq(follows.followerId, user.id)),
      ]);

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
          entryCount: entryCountRow?.count ?? 0,
          tracksRated: tracksRatedRow?.count ?? 0,
          followerCount: followerCount?.count ?? 0,
          followingCount: followingCount?.count ?? 0,
          avgRating: avgEntryRatingRow?.avg ?? null,
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
      const currentUserId = ctx.session?.user?.id ?? null;

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
      const userList = items.map((r) => r.follower);

      let followingSet = new Set<string>();
      if (currentUserId && userList.length > 0) {
        const ids = userList.map((u) => u.id);
        const followRows = await ctx.db
          .select({ followingId: follows.followingId })
          .from(follows)
          .where(and(eq(follows.followerId, currentUserId), inArray(follows.followingId, ids)));
        followingSet = new Set(followRows.map((r) => r.followingId));
      }

      return {
        items: userList.map((u) => ({ ...u, isFollowing: followingSet.has(u.id) })),
        nextCursor: hasMore && lastItem
          ? lastItem.createdAt.toISOString()
          : undefined,
      };
    }),

  getFollowing: publicProcedure
    .input(getPaginatedSchema)
    .query(async ({ input, ctx }) => {
      const currentUserId = ctx.session?.user?.id ?? null;

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
      const userList = items.map((r) => r.following);

      let followingSet = new Set<string>();
      if (currentUserId && userList.length > 0) {
        const ids = userList.map((u) => u.id);
        const followRows = await ctx.db
          .select({ followingId: follows.followingId })
          .from(follows)
          .where(and(eq(follows.followerId, currentUserId), inArray(follows.followingId, ids)));
        followingSet = new Set(followRows.map((r) => r.followingId));
      }

      return {
        items: userList.map((u) => ({ ...u, isFollowing: followingSet.has(u.id) })),
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
          isDayOne: users.isDayOne,
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

});
