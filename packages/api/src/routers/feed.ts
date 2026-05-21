import { z } from "zod";
import { eq, and, or, desc, lt, inArray, sql } from "drizzle-orm";
import { feedEvents, follows, entryLikes } from "@groovelog/db";
import type { DB, EntryPublishedPayload } from "@groovelog/db";
import { router, publicProcedure, protectedProcedure } from "../trpc";

const cursorSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

const isEntryEvent = or(
  eq(feedEvents.type, "entry_published"),
  eq(feedEvents.type, "entry_updated")
);

async function enrichWithLikeData<T extends { payload: unknown }>(
  db: DB,
  items: T[],
  viewerId: string | null
): Promise<Array<T & { likeCount: number; isLiked: boolean }>> {
  const entryIds = items
    .map((e) => (e.payload as EntryPublishedPayload).entryId)
    .filter((id): id is string => Boolean(id));

  if (entryIds.length === 0) {
    return items.map((e) => ({ ...e, likeCount: 0, isLiked: false }));
  }

  const [countRows, viewerLikeRows] = await Promise.all([
    db
      .select({
        entryId: entryLikes.entryId,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(entryLikes)
      .where(inArray(entryLikes.entryId, entryIds))
      .groupBy(entryLikes.entryId),

    viewerId
      ? db
          .select({ entryId: entryLikes.entryId })
          .from(entryLikes)
          .where(
            and(
              eq(entryLikes.userId, viewerId),
              inArray(entryLikes.entryId, entryIds)
            )
          )
      : Promise.resolve([]),
  ]);

  const likeCountMap = new Map(countRows.map((r) => [r.entryId, r.count]));
  const likedSet = new Set(viewerLikeRows.map((r) => r.entryId));

  return items.map((e) => {
    const entryId = (e.payload as EntryPublishedPayload).entryId;
    return {
      ...e,
      likeCount: likeCountMap.get(entryId) ?? 0,
      isLiked: likedSet.has(entryId),
    };
  });
}

export const feedRouter = router({
  getFollowingFeed: protectedProcedure
    .input(cursorSchema)
    .query(async ({ input, ctx }) => {
      const followedRows = await ctx.db.query.follows.findMany({
        where: eq(follows.followerId, ctx.user.id),
        columns: { followingId: true },
      });

      const followingIds = followedRows.map((f) => f.followingId);
      const actorIds = [...followingIds, ctx.user.id];

      if (actorIds.length === 0) {
        return { items: [], nextCursor: undefined };
      }

      const rows = await ctx.db.query.feedEvents.findMany({
        where: and(
          inArray(feedEvents.actorId, actorIds),
          isEntryEvent,
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
      const enriched = await enrichWithLikeData(ctx.db, items, ctx.user.id);

      return {
        items: enriched,
        nextCursor:
          hasMore && lastItem ? lastItem.createdAt.toISOString() : undefined,
      };
    }),

  getGlobalFeed: publicProcedure
    .input(cursorSchema)
    .query(async ({ input, ctx }) => {
      const rows = await ctx.db.query.feedEvents.findMany({
        where: and(
          isEntryEvent,
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
      const viewerId = ctx.session?.user?.id ?? null;
      const enriched = await enrichWithLikeData(ctx.db, items, viewerId);

      return {
        items: enriched,
        nextCursor:
          hasMore && lastItem ? lastItem.createdAt.toISOString() : undefined,
      };
    }),
});
