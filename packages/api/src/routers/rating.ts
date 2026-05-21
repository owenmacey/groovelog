import { TRPCError } from "@trpc/server";
import { eq, and, sql } from "drizzle-orm";
import { ratings } from "@groovelog/db";
import {
  upsertRatingSchema,
  deleteRatingSchema,
  getUserRatingSchema,
  getAggregatesSchema,
} from "@groovelog/validators";
import { router, publicProcedure, protectedProcedure } from "../trpc";

async function checkRateLimit(
  redis: import("ioredis").Redis,
  key: string,
  limit: number,
  windowSecs: number
) {
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, windowSecs);
  if (count > limit) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests — slow down",
    });
  }
}

export const ratingRouter = router({
  upsert: protectedProcedure
    .input(upsertRatingSchema)
    .mutation(async ({ input, ctx }) => {
      console.log("[rating.upsert] input:", {
        userId: ctx.user.id,
        targetType: input.targetType,
        targetId: input.targetId,
        rating: input.rating,
      });

      // Rate limit via Redis — non-blocking: if Redis is unavailable, skip it
      try {
        await checkRateLimit(ctx.redis, `rl:rating:${ctx.user.id}`, 60, 60);
      } catch (e) {
        if (e instanceof TRPCError) throw e; // propagate real rate-limit rejections
        console.error("[rating.upsert] Redis rate-limit check failed, skipping:", e);
      }

      let row: typeof ratings.$inferSelect | undefined;
      try {
        const [inserted] = await ctx.db
          .insert(ratings)
          .values({
            userId: ctx.user.id,
            targetType: input.targetType,
            targetId: input.targetId,
            rating: input.rating,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [ratings.userId, ratings.targetType, ratings.targetId],
            set: { rating: input.rating, updatedAt: new Date() },
          })
          .returning();
        row = inserted;
      } catch (e) {
        console.error("[rating.upsert] DB insert failed:", e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to save rating", cause: e });
      }

      if (!row) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      return row;
    }),

  delete: protectedProcedure
    .input(deleteRatingSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .delete(ratings)
        .where(
          and(
            eq(ratings.userId, ctx.user.id),
            eq(ratings.targetType, input.targetType),
            eq(ratings.targetId, input.targetId)
          )
        );
      return { success: true };
    }),

  getUserRating: publicProcedure
    .input(getUserRatingSchema)
    .query(async ({ input, ctx }) => {
      if (!ctx.session?.user) return null;
      const row = await ctx.db.query.ratings.findFirst({
        where: and(
          eq(ratings.userId, ctx.session.user.id),
          eq(ratings.targetType, input.targetType),
          eq(ratings.targetId, input.targetId)
        ),
      });
      return row ?? null;
    }),

  getAggregates: publicProcedure
    .input(getAggregatesSchema)
    .query(async ({ input, ctx }) => {
      const [stats] = await ctx.db
        .select({
          avgRating: sql<number>`ROUND(AVG(${ratings.rating})::numeric, 2)`,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(ratings)
        .where(
          and(
            eq(ratings.targetType, input.targetType),
            eq(ratings.targetId, input.targetId)
          )
        );

      const distribution = await ctx.db
        .select({
          rating: ratings.rating,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(ratings)
        .where(
          and(
            eq(ratings.targetType, input.targetType),
            eq(ratings.targetId, input.targetId)
          )
        )
        .groupBy(ratings.rating)
        .orderBy(ratings.rating);

      return {
        avgRating: stats?.avgRating ?? null,
        count: stats?.count ?? 0,
        distribution,
      };
    }),
});
