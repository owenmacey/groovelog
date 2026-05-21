/**
 * Data migration: ratings + reviews → album_entries
 *
 * Steps:
 *   1. Converts every album-level rating into a published album_entries row
 *   2. Merges album reviews into the corresponding entry (or creates a new one
 *      if the user had a review but no rating)
 *   3. Links track ratings to their parent entry where one exists
 *   4. Deletes old "rated" and "reviewed" feed events
 *
 * The reviews and review_likes tables are queried via raw SQL because they have
 * been removed from the Drizzle schema (they are dropped separately via db:push).
 *
 * Usage:
 *   pnpm --filter @groovelog/db db:migrate [--dry-run] [--prod]
 *
 *   --dry-run   Preview counts without writing anything
 *   --prod      Load DATABASE_URL from apps/web/.env.local (production Neon)
 *               Default loads from packages/db/.env.local (local)
 */

import { config } from "dotenv";
import { resolve } from "path";

const PROD = process.argv.includes("--prod");

if (PROD) {
  config({ path: resolve(process.cwd(), "../../apps/web/.env.local") });
} else {
  config({ path: resolve(process.cwd(), ".env.local") });
  config({ path: resolve(process.cwd(), "../../.env.local"), override: false });
}

import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import postgres from "postgres";
import { createId } from "@paralleldrive/cuid2";
import * as schema from "../schema";

const DRY_RUN = process.argv.includes("--dry-run");

const url = process.env["DATABASE_URL"];
if (!url) throw new Error("DATABASE_URL is not set");

const client = postgres(url, { max: 1 });
const db = drizzle(client, { schema });

function log(msg: string) {
  console.log(DRY_RUN ? `[DRY RUN] ${msg}` : msg);
}

async function findEntry(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  userId: string,
  albumId: string
): Promise<{ id: string } | null> {
  const [row] = await tx
    .select({ id: schema.albumEntries.id })
    .from(schema.albumEntries)
    .where(and(eq(schema.albumEntries.userId, userId), eq(schema.albumEntries.albumId, albumId)))
    .limit(1);
  return row ?? null;
}

async function run() {
  const env = PROD ? "PRODUCTION" : "local";
  log(`Starting migration: ratings + reviews → album_entries (${env})\n`);

  let entriesCreated = 0;
  let reviewsMerged = 0;
  let trackRatingsLinked = 0;
  let feedEventsDeleted = 0;

  try {
    await db.transaction(async (tx) => {

      // ── Step 1: album-level ratings → album_entries ────────────────────────

      const albumRatings = await tx
        .select({
          id: schema.ratings.id,
          userId: schema.ratings.userId,
          targetId: schema.ratings.targetId,
          rating: schema.ratings.rating,
          createdAt: schema.ratings.createdAt,
          updatedAt: schema.ratings.updatedAt,
        })
        .from(schema.ratings)
        .where(eq(schema.ratings.targetType, "album"));

      log(`Found ${albumRatings.length} album-level rating(s) to convert`);

      for (const rating of albumRatings) {
        const existing = await findEntry(tx, rating.userId, rating.targetId);

        if (!existing) {
          if (!DRY_RUN) {
            await tx.insert(schema.albumEntries).values({
              id: createId(),
              userId: rating.userId,
              albumId: rating.targetId,
              overallRating: rating.rating,
              status: "published",
              publishedAt: rating.createdAt,
              createdAt: rating.createdAt,
              updatedAt: rating.updatedAt,
            });
          }
          entriesCreated++;
        } else {
          if (!DRY_RUN) {
            await tx
              .update(schema.albumEntries)
              .set({ overallRating: rating.rating, updatedAt: rating.updatedAt })
              .where(eq(schema.albumEntries.id, existing.id));
          }
        }
      }

      log(`  → ${entriesCreated} new album entr${entriesCreated === 1 ? "y" : "ies"} created`);

      // ── Step 2: album reviews → merged into entries (raw SQL) ──────────────
      // schema.reviews was removed; query via raw SQL. Skip gracefully if the
      // table has already been dropped (e.g. db:push already ran in production).

      type ReviewRow = {
        id: string;
        user_id: string;
        target_id: string;
        body: string;
        created_at: Date;
        updated_at: Date;
      };

      const [reviewsExistRow] = await tx.execute<{ exists: boolean }>(
        sql`SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'reviews'
        ) AS exists`
      );
      const reviewsTableExists = reviewsExistRow?.exists ?? false;

      if (!reviewsTableExists) {
        log(`\nreviews table not found — already dropped, skipping Step 2`);
      } else {
        const albumReviews = await tx.execute<ReviewRow>(
          sql`SELECT id, user_id, target_id, body, created_at, updated_at
              FROM reviews
              WHERE target_type = 'album'`
        );

        log(`\nFound ${albumReviews.length} album review(s) to migrate`);

        for (const review of albumReviews) {
          const entry = await findEntry(tx, review.user_id, review.target_id);

          if (entry) {
            if (!DRY_RUN) {
              await tx
                .update(schema.albumEntries)
                .set({ reviewBody: review.body, updatedAt: new Date(review.updated_at) })
                .where(eq(schema.albumEntries.id, entry.id));
            }
          } else {
            if (!DRY_RUN) {
              await tx.insert(schema.albumEntries).values({
                id: createId(),
                userId: review.user_id,
                albumId: review.target_id,
                reviewBody: review.body,
                status: "published",
                publishedAt: new Date(review.created_at),
                createdAt: new Date(review.created_at),
                updatedAt: new Date(review.updated_at),
              });
            }
            entriesCreated++;
          }

          reviewsMerged++;
        }

        if (!DRY_RUN && albumReviews.length > 0) {
          await tx.execute(sql`DELETE FROM reviews WHERE target_type = 'album'`);
        }

        log(`  → ${reviewsMerged} review(s) merged and deleted`);

        const [trackReviewCountRow] = await tx.execute<{ count: number }>(
          sql`SELECT COUNT(*)::int AS count FROM reviews WHERE target_type = 'track'`
        );
        const trackReviewCount = trackReviewCountRow?.count ?? 0;

        if (trackReviewCount > 0) {
          log(`\n  ⚠  ${trackReviewCount} track review(s) found — will be lost when reviews table is dropped.`);
        }
      }

      // ── Step 3: track ratings → link to parent entry ───────────────────────

      const trackRatings = await tx
        .select({
          id: schema.ratings.id,
          userId: schema.ratings.userId,
          targetId: schema.ratings.targetId,
          albumEntryId: schema.ratings.albumEntryId,
        })
        .from(schema.ratings)
        .where(eq(schema.ratings.targetType, "track"));

      log(`\nFound ${trackRatings.length} track rating(s) to link`);

      const unlinked = trackRatings.filter((r) => !r.albumEntryId);

      if (unlinked.length > 0) {
        const trackIds = [...new Set(unlinked.map((r) => r.targetId))];
        const trackRows = await tx
          .select({ id: schema.tracks.id, albumId: schema.tracks.albumId })
          .from(schema.tracks)
          .where(inArray(schema.tracks.id, trackIds));
        const trackAlbumMap = new Map(trackRows.map((t) => [t.id, t.albumId]));

        const userIds = [...new Set(unlinked.map((r) => r.userId))];
        const albumIds = [...new Set(trackAlbumMap.values())];
        const entryRows = await tx
          .select({
            id: schema.albumEntries.id,
            userId: schema.albumEntries.userId,
            albumId: schema.albumEntries.albumId,
          })
          .from(schema.albumEntries)
          .where(
            and(
              inArray(schema.albumEntries.userId, userIds),
              inArray(schema.albumEntries.albumId, albumIds)
            )
          );
        const entryMap = new Map(entryRows.map((e) => [`${e.userId}:${e.albumId}`, e.id]));

        for (const tr of unlinked) {
          const albumId = trackAlbumMap.get(tr.targetId);
          if (!albumId) {
            log(`  ⚠  Track ${tr.targetId} not found in catalog — skipping`);
            continue;
          }
          const entryId = entryMap.get(`${tr.userId}:${albumId}`);
          if (!entryId) continue;

          if (!DRY_RUN) {
            await tx
              .update(schema.ratings)
              .set({ albumEntryId: entryId })
              .where(eq(schema.ratings.id, tr.id));
          }
          trackRatingsLinked++;
        }
      }

      log(`  → ${trackRatingsLinked} track rating(s) linked to an entry`);

      // ── Step 4: delete old 'rated' and 'reviewed' feed events ──────────────

      const oldEventPredicate = or(
        eq(schema.feedEvents.type, "rated"),
        eq(schema.feedEvents.type, "reviewed")
      );

      const [oldCountRow] = await tx
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(schema.feedEvents)
        .where(oldEventPredicate);
      const oldEventCount = oldCountRow?.count ?? 0;

      log(`\nFound ${oldEventCount} old 'rated'/'reviewed' feed event(s) to delete`);

      if (!DRY_RUN && oldEventCount > 0) {
        await tx.delete(schema.feedEvents).where(oldEventPredicate);
      }
      feedEventsDeleted = oldEventCount;
      log(`  → ${feedEventsDeleted} feed event(s) deleted`);
    });
  } finally {
    await client.end();
  }

  console.log("\n" + "─".repeat(50));
  log("Migration summary:");
  log(`  Album entries created : ${entriesCreated}`);
  log(`  Reviews merged        : ${reviewsMerged}`);
  log(`  Track ratings linked  : ${trackRatingsLinked}`);
  log(`  Feed events deleted   : ${feedEventsDeleted}`);
  console.log("─".repeat(50));

  if (!DRY_RUN) {
    console.log("\n✅ Migration complete.");
  } else {
    console.log("\n✅ Dry run complete — no data was changed.");
    console.log('   Re-run without --dry-run to apply.');
  }
}

run().catch((err) => {
  console.error("\n❌ Migration failed:", err);
  process.exit(1);
});
