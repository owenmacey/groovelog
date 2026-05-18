import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, inArray, desc, gte, sql } from "drizzle-orm";
import { artists, albums, tracks, ratings } from "@groovelog/db";
import type { DB } from "@groovelog/db";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import {
  getSpotifyClient,
  getBestImage,
  normalizeAlbumType,
} from "../lib/spotify";
import type {
  SpotifyArtistSimple,
  SpotifyAlbumSimple,
  SpotifyTrackSimple,
} from "../lib/spotify";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function upsertArtist(
  ctx: { db: DB },
  artist: SpotifyArtistSimple & { images?: Array<{ url: string }>; genres?: string[]; popularity?: number }
) {
  const [row] = await ctx.db
    .insert(artists)
    .values({
      spotifyId: artist.id,
      name: artist.name,
      imageUrl: artist.images ? (artist.images[0]?.url ?? null) : null,
      genres: artist.genres ?? [],
      popularity: artist.popularity ?? 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: artists.spotifyId,
      set: {
        name: artist.name,
        imageUrl: artist.images ? (artist.images[0]?.url ?? null) : null,
        genres: artist.genres ?? [],
        popularity: artist.popularity ?? 0,
        updatedAt: new Date(),
      },
    })
    .returning();
  if (!row) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  return row;
}

async function upsertAlbum(
  ctx: { db: DB },
  spotifyAlbum: SpotifyAlbumSimple,
  artistId: string
) {
  const coverUrl = getBestImage(spotifyAlbum.images);
  const [row] = await ctx.db
    .insert(albums)
    .values({
      spotifyId: spotifyAlbum.id,
      title: spotifyAlbum.name,
      artistId,
      releaseDate: spotifyAlbum.release_date,
      coverUrl,
      totalTracks: spotifyAlbum.total_tracks,
      albumType: normalizeAlbumType(spotifyAlbum.album_type),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: albums.spotifyId,
      set: {
        title: spotifyAlbum.name,
        coverUrl,
        totalTracks: spotifyAlbum.total_tracks,
        updatedAt: new Date(),
      },
    })
    .returning();
  if (!row) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  console.log("[upsertAlbum] row.id:", row.id, "| row.spotifyId:", row.spotifyId, "| input spotifyAlbum.id:", spotifyAlbum.id);
  return row;
}

async function upsertTrack(
  ctx: { db: DB },
  spotifyTrack: SpotifyTrackSimple,
  albumId: string,
  artistId: string
) {
  const [row] = await ctx.db
    .insert(tracks)
    .values({
      spotifyId: spotifyTrack.id,
      title: spotifyTrack.name,
      albumId,
      artistId,
      durationMs: spotifyTrack.duration_ms,
      trackNumber: spotifyTrack.track_number,
      discNumber: spotifyTrack.disc_number,
      previewUrl: spotifyTrack.preview_url,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: tracks.spotifyId,
      set: {
        title: spotifyTrack.name,
        durationMs: spotifyTrack.duration_ms,
        previewUrl: spotifyTrack.preview_url,
        updatedAt: new Date(),
      },
    })
    .returning();
  if (!row) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  return row;
}

async function getRatingStats(
  ctx: { db: DB },
  targetType: "album" | "track",
  targetId: string
) {
  const [stats] = await ctx.db
    .select({
      avgRating: sql<number>`ROUND(AVG(${ratings.rating})::numeric, 2)`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(ratings)
    .where(
      and(
        eq(ratings.targetType, targetType),
        eq(ratings.targetId, targetId)
      )
    );

  return {
    avgRating: stats?.avgRating ?? null,
    ratingCount: stats?.count ?? 0,
  };
}

async function getUserRatingForTarget(
  ctx: { db: DB; session: { user: { id: string } } | null },
  targetType: "album" | "track",
  targetId: string
): Promise<number | null> {
  if (!ctx.session?.user) return null;
  const row = await ctx.db.query.ratings.findFirst({
    where: and(
      eq(ratings.userId, ctx.session.user.id),
      eq(ratings.targetType, targetType),
      eq(ratings.targetId, targetId)
    ),
  });
  return row?.rating ?? null;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const catalogRouter = router({
  search: publicProcedure
    .input(
      z.object({
        query: z.string().min(1).max(200),
        type: z.enum(["album", "track", "artist"]),
        cursor: z.number().optional(), // offset
      })
    )
    .query(async ({ input, ctx }) => {
      const offset = input.cursor ?? 0;
      const spotify = getSpotifyClient(ctx.redis);
      const searchResult = await spotify.search(input.query, input.type, offset);

      const albumResults: Array<{
        album: typeof albums.$inferSelect;
        artist: typeof artists.$inferSelect;
        avgRating: number | null;
        ratingCount: number;
        userRating: number | null;
      }> = [];

      const trackResults: Array<{
        track: typeof tracks.$inferSelect;
        album: typeof albums.$inferSelect;
        artist: typeof artists.$inferSelect;
        avgRating: number | null;
        ratingCount: number;
        userRating: number | null;
      }> = [];

      const artistResults: Array<typeof artists.$inferSelect> = [];
      let total = 0;

      if (input.type === "album") {
        total = searchResult.albums?.total ?? 0;
        for (const spotifyAlbum of searchResult.albums?.items ?? []) {
          const primaryArtist = spotifyAlbum.artists[0];
          if (!primaryArtist) continue;
          const artist = await upsertArtist(ctx, primaryArtist);
          const album = await upsertAlbum(ctx, spotifyAlbum, artist.id);
          const stats = await getRatingStats(ctx, "album", album.id);
          const userRating = await getUserRatingForTarget(ctx, "album", album.id);
          albumResults.push({ album, artist, ...stats, userRating });
        }
      } else if (input.type === "track") {
        total = searchResult.tracks?.total ?? 0;
        for (const spotifyTrack of searchResult.tracks?.items ?? []) {
          const primaryArtist = spotifyTrack.artists[0];
          if (!primaryArtist || !spotifyTrack.album) continue;
          const artist = await upsertArtist(ctx, primaryArtist);
          const album = await upsertAlbum(ctx, spotifyTrack.album, artist.id);
          const track = await upsertTrack(ctx, spotifyTrack, album.id, artist.id);
          const stats = await getRatingStats(ctx, "track", track.id);
          const userRating = await getUserRatingForTarget(ctx, "track", track.id);
          trackResults.push({ track, album, artist, ...stats, userRating });
        }
      } else {
        total = searchResult.artists?.total ?? 0;
        for (const spotifyArtist of searchResult.artists?.items ?? []) {
          const artist = await upsertArtist(ctx, {
            ...spotifyArtist,
            images: spotifyArtist.images,
            genres: spotifyArtist.genres,
            popularity: spotifyArtist.popularity,
          });
          artistResults.push(artist);
        }
      }

      const nextOffset = offset + 10;
      return {
        albums: albumResults,
        tracks: trackResults,
        artists: artistResults,
        total,
        nextCursor: nextOffset < total ? nextOffset : undefined,
      };
    }),

  getAlbum: publicProcedure
    .input(z.object({ spotifyId: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const spotify = getSpotifyClient(ctx.redis);
      const spotifyAlbum = await spotify.getAlbum(input.spotifyId);

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

      // Upsert all tracks (Spotify sometimes returns null for unavailable tracks)
      const trackRows = [];
      const trackItems = (spotifyAlbum.tracks?.items ?? []).filter(
        (t): t is SpotifyTrackSimple => t !== null
      );
      for (const spotifyTrack of trackItems) {
        const trackArtist = spotifyTrack.artists[0] ?? primaryArtist;
        const track = await upsertTrack(
          ctx,
          spotifyTrack,
          album.id,
          trackArtist.id === primaryArtist.id ? artist.id : (await upsertArtist(ctx, trackArtist)).id
        );
        const stats = await getRatingStats(ctx, "track", track.id);
        const userRating = await getUserRatingForTarget(ctx, "track", track.id);
        trackRows.push({ track, ...stats, userRating });
      }

      const stats = await getRatingStats(ctx, "album", album.id);
      const userRating = await getUserRatingForTarget(ctx, "album", album.id);

      // Rating distribution (1-10)
      const distribution = await ctx.db
        .select({
          rating: ratings.rating,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(ratings)
        .where(
          and(
            eq(ratings.targetType, "album"),
            eq(ratings.targetId, album.id)
          )
        )
        .groupBy(ratings.rating);

      return {
        album,
        artist,
        tracks: trackRows,
        ...stats,
        userRating,
        distribution,
      };
    }),

  getTrack: publicProcedure
    .input(z.object({ spotifyId: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const spotify = getSpotifyClient(ctx.redis);
      const spotifyTrack = await spotify.getTrack(input.spotifyId);

      const primaryArtist = spotifyTrack.artists[0];
      if (!primaryArtist) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Track has no artist" });
      }

      const artist = await upsertArtist(ctx, primaryArtist);
      if (!spotifyTrack.album) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Track has no album" });
      }
      const album = await upsertAlbum(ctx, spotifyTrack.album, artist.id);
      const track = await upsertTrack(ctx, spotifyTrack, album.id, artist.id);

      const stats = await getRatingStats(ctx, "track", track.id);
      const userRating = await getUserRatingForTarget(ctx, "track", track.id);

      const distribution = await ctx.db
        .select({
          rating: ratings.rating,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(ratings)
        .where(
          and(
            eq(ratings.targetType, "track"),
            eq(ratings.targetId, track.id)
          )
        )
        .groupBy(ratings.rating);

      return { track, album, artist, ...stats, userRating, distribution };
    }),

  getArtist: publicProcedure
    .input(z.object({ spotifyId: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const spotify = getSpotifyClient(ctx.redis);
      const spotifyArtist = await spotify.getArtist(input.spotifyId);
      const artist = await upsertArtist(ctx, spotifyArtist);
      return { artist, followerCount: spotifyArtist.followers?.total ?? null };
    }),

  getArtistAlbums: publicProcedure
    .input(
      z.object({
        spotifyId: z.string().min(1),
        limit: z.number().default(10),
        cursor: z.number().optional(), // offset into Spotify's results
      })
    )
    .query(async ({ input, ctx }) => {
      const offset = input.cursor ?? 0;
      const limit = input.limit;

      const spotify = getSpotifyClient(ctx.redis);
      const spotifyArtist = await spotify.getArtist(input.spotifyId);
      const artist = await upsertArtist(ctx, spotifyArtist);

      const { items: spotifyAlbums, total } = await spotify.getArtistAlbums(
        input.spotifyId,
        offset,
        limit
      );

      const albumResults = [];
      for (const spotifyAlbum of spotifyAlbums) {
        const album = await upsertAlbum(ctx, spotifyAlbum, artist.id);
        const stats = await getRatingStats(ctx, "album", album.id);
        const userRating = await getUserRatingForTarget(ctx, "album", album.id);
        albumResults.push({ album, ...stats, userRating });
      }

      const nextOffset = offset + limit;
      return {
        albums: albumResults,
        total,
        nextCursor: nextOffset < total ? nextOffset : undefined,
      };
    }),

  getTrending: publicProcedure.query(async ({ ctx }) => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const trendingAlbumIds = await ctx.db
      .select({
        targetId: ratings.targetId,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(ratings)
      .where(
        and(
          eq(ratings.targetType, "album"),
          gte(ratings.createdAt, sevenDaysAgo)
        )
      )
      .groupBy(ratings.targetId)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(10);

    const albumIds = trendingAlbumIds
      .map((r) => r.targetId)
      .filter((id): id is string => Boolean(id));

    if (albumIds.length === 0) return { albums: [] };

    const trendingAlbums = await ctx.db.query.albums.findMany({
      where: inArray(albums.id, albumIds),
      with: { artist: true },
    });

    return { albums: trendingAlbums };
  }),
});
