import { z } from "zod";
import { eq, and, desc, lt, inArray } from "drizzle-orm";
import { feedEvents, follows, reviews } from "@groovelog/db";
import type { DB, ReviewedPayload } from "@groovelog/db";
import { router, publicProcedure, protectedProcedure } from "../trpc";

const cursorSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

async function enrichWithReviewBodies<T extends { type: string; payload: unknown }>(
  db: DB,
  items: T[]
): Promise<Array<T & { reviewBody?: string }>> {
  const reviewIds = items
    .filter((e) => e.type === "reviewed")
    .map((e) => (e.payload as ReviewedPayload).reviewId)
    .filter((id): id is string => Boolean(id));

  if (reviewIds.length === 0) {
    return items.map((e) => ({ ...e, reviewBody: undefined }));
  }

  const bodyRows = await db
    .select({ id: reviews.id, body: reviews.body })
    .from(reviews)
    .where(inArray(reviews.id, reviewIds));

  const bodyMap = new Map(bodyRows.map((r) => [r.id, r.body]));

  return items.map((e) => ({
    ...e,
    reviewBody:
      e.type === "reviewed"
        ? (bodyMap.get((e.payload as ReviewedPayload).reviewId) ?? undefined)
        : undefined,
  }));
}

export const feedRouter = router({
  getFollowingFeed: protectedProcedure
    .input(cursorSchema)
    .query(async ({ input, ctx }) => {
      const followedRows = await ctx.db.query.follows.findMany({
        where: eq(follows.followerId, ctx.user.id),
        columns: { followingId: true },
      });

      const followingIds = followedRows
        .map((f) => f.followingId)
        .filter((id): id is string => Boolean(id));

      const actorIds = [...followingIds, ctx.user.id];

      if (actorIds.length === 0) {
        return { items: [], nextCursor: undefined };
      }

      const rows = await ctx.db.query.feedEvents.findMany({
        where: and(
          inArray(feedEvents.actorId, actorIds),
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
      const enriched = await enrichWithReviewBodies(ctx.db, items);

      return {
        items: enriched,
        nextCursor: hasMore && lastItem
          ? lastItem.createdAt.toISOString()
          : undefined,
      };
    }),

  getGlobalFeed: publicProcedure
    .input(cursorSchema)
    .query(async ({ input, ctx }) => {
      const rows = await ctx.db.query.feedEvents.findMany({
        where: input.cursor
          ? lt(feedEvents.createdAt, new Date(input.cursor))
          : undefined,
        orderBy: [desc(feedEvents.createdAt)],
        limit: input.limit + 1,
        with: { actor: true },
      });

      const hasMore = rows.length > input.limit;
      const items = hasMore ? rows.slice(0, -1) : rows;
      const lastItem = items.at(-1);
      const enriched = await enrichWithReviewBodies(ctx.db, items);

      return {
        items: enriched,
        nextCursor: hasMore && lastItem
          ? lastItem.createdAt.toISOString()
          : undefined,
      };
    }),
});
