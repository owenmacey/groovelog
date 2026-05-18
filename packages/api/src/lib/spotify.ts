import { z } from "zod";
import type { Redis } from "ioredis";

// ─── Zod schemas for Spotify API responses ────────────────────────────────────

const SpotifyImageSchema = z.object({
  url: z.string(),
  height: z.number().nullable().optional(),
  width: z.number().nullable().optional(),
}).passthrough();

const SpotifyArtistSimpleSchema = z.object({
  id: z.string(),
  name: z.string(),
}).passthrough();

const SpotifyArtistFullSchema = z.object({
  id: z.string(),
  name: z.string(),
  images: z.array(SpotifyImageSchema).default([]),
  genres: z.array(z.string()).default([]),
  popularity: z.number().default(0),
}).passthrough();

const SpotifyTrackSimpleSchema = z.object({
  id: z.string(),
  name: z.string(),
  artists: z.array(SpotifyArtistSimpleSchema).default([]),
  duration_ms: z.number().optional(),
  track_number: z.number().optional(),
  disc_number: z.number().optional(),
  preview_url: z.string().nullable().optional(),
}).passthrough();

const SpotifyAlbumSimpleSchema = z.object({
  id: z.string(),
  name: z.string(),
  album_type: z.string().default("album"),
  artists: z.array(SpotifyArtistSimpleSchema).default([]),
  images: z.array(SpotifyImageSchema).default([]),
  release_date: z.string().default(""),
  total_tracks: z.number().default(0),
}).passthrough();

const SpotifyAlbumFullSchema = SpotifyAlbumSimpleSchema.extend({
  tracks: z.object({
    items: z.array(SpotifyTrackSimpleSchema.nullable()),
  }).optional(),
  genres: z.array(z.string()).default([]),
  popularity: z.number().default(0),
});

const SpotifyTrackFullSchema = SpotifyTrackSimpleSchema.extend({
  album: SpotifyAlbumSimpleSchema.optional(),
});

const SpotifySearchResponseSchema = z.object({
  albums: z
    .object({ items: z.array(SpotifyAlbumSimpleSchema) })
    .optional(),
  tracks: z
    .object({ items: z.array(SpotifyTrackFullSchema) })
    .optional(),
  artists: z
    .object({ items: z.array(SpotifyArtistFullSchema) })
    .optional(),
}).passthrough();

const SpotifyTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
});

// ─── Exported types ───────────────────────────────────────────────────────────

export type SpotifyArtistSimple = z.infer<typeof SpotifyArtistSimpleSchema>;
export type SpotifyArtistFull = z.infer<typeof SpotifyArtistFullSchema>;
export type SpotifyAlbumSimple = z.infer<typeof SpotifyAlbumSimpleSchema>;
export type SpotifyAlbumFull = z.infer<typeof SpotifyAlbumFullSchema>;
export type SpotifyTrackSimple = z.infer<typeof SpotifyTrackSimpleSchema>;
export type SpotifyTrackFull = z.infer<typeof SpotifyTrackFullSchema>;
export type SpotifySearchResponse = z.infer<typeof SpotifySearchResponseSchema>;

// ─── SpotifyClient ────────────────────────────────────────────────────────────

export class SpotifyClient {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redis: Redis;
  private readonly SEARCH_CACHE_TTL = 3600; // 1 hour
  private readonly TOKEN_CACHE_KEY = "spotify:access_token";

  constructor(clientId: string, clientSecret: string, redis: Redis) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redis = redis;
  }

  // Redis helpers that degrade gracefully — a cache miss is never fatal.
  private async cacheGet(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch (err) {
      console.warn("[spotify] Redis GET failed (cache miss):", err);
      return null;
    }
  }

  private async cacheSet(key: string, ttl: number, value: string): Promise<void> {
    try {
      await this.redis.setex(key, ttl, value);
    } catch (err) {
      console.warn("[spotify] Redis SETEX failed (cache write skipped):", err);
    }
  }

  private async getAccessToken(): Promise<string> {
    const cached = await this.cacheGet(this.TOKEN_CACHE_KEY);
    if (cached) return cached;

    const credentials = Buffer.from(
      `${this.clientId}:${this.clientSecret}`
    ).toString("base64");

    console.log("[spotify] Fetching new access token...");
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "(unreadable)");
      console.error(`[spotify] Token request failed — status ${res.status}:`, body);
      throw new Error(`Spotify token error: ${res.status} — ${body}`);
    }

    const data = SpotifyTokenResponseSchema.parse(await res.json());
    console.log(`[spotify] Token acquired, expires_in=${data.expires_in}s`);
    await this.cacheSet(this.TOKEN_CACHE_KEY, data.expires_in - 60, data.access_token);
    return data.access_token;
  }

  private async fetchSpotify<T>(
    path: string,
    schema: z.ZodType<T>
  ): Promise<T> {
    const token = await this.getAccessToken();
    const res = await fetch(`https://api.spotify.com/v1${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "(unreadable)");
      console.error(`[spotify] API error — status ${res.status} for ${path}:`, body);
      throw new Error(`Spotify API error: ${res.status} for ${path}`);
    }

    const json: unknown = await res.json();
    console.log(`[spotify] raw response for ${path}:`, JSON.stringify(json).slice(0, 500));
    try {
      return schema.parse(json);
    } catch (err) {
      console.error(`[spotify] Schema parse failed for ${path}:`, err);
      throw err;
    }
  }

  async search(query: string): Promise<SpotifySearchResponse> {
    console.log(`[spotify] search query="${query}"`);
    const cacheKey = `spotify:search:${encodeURIComponent(query)}`;

    const cached = await this.cacheGet(cacheKey);
    if (cached) {
      console.log("[spotify] search cache HIT");
      return SpotifySearchResponseSchema.parse(JSON.parse(cached));
    }

    console.log("[spotify] search cache MISS — fetching from API");
    const encoded = encodeURIComponent(query);
    const result = await this.fetchSpotify(
      `/search?q=${encoded}&type=album,track,artist&limit=10`,
      SpotifySearchResponseSchema
    );

    console.log(
      `[spotify] search results — albums:${result.albums?.items.length ?? 0} tracks:${result.tracks?.items.length ?? 0} artists:${result.artists?.items.length ?? 0}`
    );
    await this.cacheSet(cacheKey, this.SEARCH_CACHE_TTL, JSON.stringify(result));
    return result as SpotifySearchResponse;
  }

  async getAlbum(spotifyId: string): Promise<SpotifyAlbumFull> {
    const cacheKey = `spotify:album:${spotifyId}`;
    const cached = await this.cacheGet(cacheKey);
    if (cached) return SpotifyAlbumFullSchema.parse(JSON.parse(cached));

    const result = await this.fetchSpotify(`/albums/${spotifyId}`, SpotifyAlbumFullSchema);
    await this.cacheSet(cacheKey, this.SEARCH_CACHE_TTL, JSON.stringify(result));
    return result as SpotifyAlbumFull;
  }

  async getTrack(spotifyId: string): Promise<SpotifyTrackFull> {
    const cacheKey = `spotify:track:${spotifyId}`;
    const cached = await this.cacheGet(cacheKey);
    if (cached) return SpotifyTrackFullSchema.parse(JSON.parse(cached)) as SpotifyTrackFull;

    const result = await this.fetchSpotify(`/tracks/${spotifyId}`, SpotifyTrackFullSchema);
    await this.cacheSet(cacheKey, this.SEARCH_CACHE_TTL, JSON.stringify(result));
    return result as SpotifyTrackFull;
  }

  async getArtist(spotifyId: string): Promise<SpotifyArtistFull> {
    return (await this.fetchSpotify(`/artists/${spotifyId}`, SpotifyArtistFullSchema)) as SpotifyArtistFull;
  }
}

// Singleton factory — one instance per request context to reuse the token cache
let _client: SpotifyClient | null = null;

export function getSpotifyClient(redis: Redis): SpotifyClient {
  if (!_client) {
    const clientId = process.env["SPOTIFY_CLIENT_ID"];
    const clientSecret = process.env["SPOTIFY_CLIENT_SECRET"];
    console.log(
      `[spotify] getSpotifyClient — SPOTIFY_CLIENT_ID=${clientId ? "set" : "MISSING"} SPOTIFY_CLIENT_SECRET=${clientSecret ? "set" : "MISSING"}`
    );
    if (!clientId || !clientSecret) {
      throw new Error("SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are required");
    }
    _client = new SpotifyClient(clientId, clientSecret, redis);
  }
  return _client;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getBestImage(images: SpotifyAlbumSimple["images"]): string | null {
  const sorted = [...images].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  return sorted[0]?.url ?? null;
}

export function normalizeAlbumType(
  type: string
): "album" | "single" | "ep" {
  if (type === "single") return "single";
  if (type === "ep") return "ep";
  return "album";
}
