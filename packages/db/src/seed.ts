import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, "../../../.env.local") });

import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { createId } from "@paralleldrive/cuid2";
import * as schema from "./schema";

const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const client = postgres(databaseUrl);
const db = drizzle(client, { schema });

const SAMPLE_ARTISTS = [
  {
    spotifyId: "4oLeXFyACqeem2VImYeBFe",
    name: "Frank Ocean",
    imageUrl:
      "https://i.scdn.co/image/ab6761610000e5eb5f8575d70fb1b5d9d45a1dcc",
    genres: ["alternative r&b", "lgbtq+ hip hop", "neo soul"],
    popularity: 88,
  },
  {
    spotifyId: "0Y5tJX1MQlPlqiwlOH1tJY",
    name: "Travis Scott",
    imageUrl:
      "https://i.scdn.co/image/ab6761610000e5eb19c2790744c792d05570bb71",
    genres: ["rap", "slap house"],
    popularity: 92,
  },
  {
    spotifyId: "6eUKZXaKkcviH0Ku9w2n3V",
    name: "Ed Sheeran",
    imageUrl:
      "https://i.scdn.co/image/ab6761610000e5eb3bcef85e105dfc42399ef0ba",
    genres: ["pop", "uk pop", "singer-songwriter"],
    popularity: 91,
  },
  {
    spotifyId: "3TVXtAsR1Inumwj472S9r4",
    name: "Drake",
    imageUrl:
      "https://i.scdn.co/image/ab6761610000e5eb4293385d324db8558179afd9",
    genres: ["canadian hip hop", "canadian pop", "hip hop", "rap"],
    popularity: 94,
  },
  {
    spotifyId: "1Xyo4u8uXC1ZmMpatF05PJ",
    name: "The Weeknd",
    imageUrl:
      "https://i.scdn.co/image/ab6761610000e5eb214f3cf1cbe7139c1e26ffbb",
    genres: [
      "canadian contemporary r&b",
      "canadian pop",
      "pop",
      "r&b",
    ],
    popularity: 93,
  },
] satisfies Array<{
  spotifyId: string;
  name: string;
  imageUrl: string;
  genres: string[];
  popularity: number;
}>;

const SAMPLE_ALBUMS = [
  {
    spotifyId: "3mH6qwIy9crq0I9YQbOuDf",
    title: "Blonde",
    artistIndex: 0,
    releaseDate: "2016-08-20",
    coverUrl:
      "https://i.scdn.co/image/ab67616d0000b2732118bf9b198b05a95ded6300",
    totalTracks: 17,
    albumType: "album" as const,
  },
  {
    spotifyId: "1ATL5GLyefJaxhQzSPVrLX",
    title: "ASTROWORLD",
    artistIndex: 1,
    releaseDate: "2018-08-03",
    coverUrl:
      "https://i.scdn.co/image/ab67616d0000b273072e9faef2ef7b6db63834a3",
    totalTracks: 17,
    albumType: "album" as const,
  },
  {
    spotifyId: "0BCzY1kZXGXBnniRF5Yb6H",
    title: "channel ORANGE",
    artistIndex: 0,
    releaseDate: "2012-07-17",
    coverUrl:
      "https://i.scdn.co/image/ab67616d0000b27353b2cf7d8b54fc8e290a2566",
    totalTracks: 17,
    albumType: "album" as const,
  },
  {
    spotifyId: "2ODvWsOgouMbaA5xf0RkJe",
    title: "Scorpion",
    artistIndex: 3,
    releaseDate: "2018-06-29",
    coverUrl:
      "https://i.scdn.co/image/ab6761610000e5eb6b6ce785e5c61bb9a0e8e8a2",
    totalTracks: 25,
    albumType: "album" as const,
  },
  {
    spotifyId: "5r36AJ6VOJtp00oxSkBZ5h",
    title: "After Hours",
    artistIndex: 4,
    releaseDate: "2020-03-20",
    coverUrl:
      "https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36",
    totalTracks: 14,
    albumType: "album" as const,
  },
] satisfies Array<{
  spotifyId: string;
  title: string;
  artistIndex: number;
  releaseDate: string;
  coverUrl: string;
  totalTracks: number;
  albumType: "album" | "single" | "ep";
}>;

async function seed() {
  console.warn("🌱 Seeding database...");

  const passwordHash = await bcrypt.hash("password123", 12);

  const user1Id = createId();
  const user2Id = createId();

  await db
    .insert(schema.users)
    .values([
      {
        id: user1Id,
        name: "Test User",
        email: "test@groovelog.com",
        emailVerified: true,
        username: "testuser",
        displayName: "Test User",
        bio: "Music lover. Ratings enthusiast.",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: user2Id,
        name: "Jane Doe",
        email: "jane@groovelog.com",
        emailVerified: true,
        username: "janedoe",
        displayName: "Jane Doe",
        bio: "Indie rock & jazz. Vinyl collector.",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])
    .onConflictDoNothing();

  // Better Auth credential accounts (stores the hashed password)
  await db
    .insert(schema.accounts)
    .values([
      {
        id: createId(),
        accountId: user1Id,
        providerId: "credential",
        userId: user1Id,
        password: passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: createId(),
        accountId: user2Id,
        providerId: "credential",
        userId: user2Id,
        password: passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])
    .onConflictDoNothing();

  // Artists
  const artistIds: string[] = [];
  for (const artist of SAMPLE_ARTISTS) {
    const id = createId();
    artistIds.push(id);
    await db
      .insert(schema.artists)
      .values({
        id,
        spotifyId: artist.spotifyId,
        name: artist.name,
        imageUrl: artist.imageUrl,
        genres: artist.genres,
        popularity: artist.popularity,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing();
  }

  // Albums
  const albumIds: string[] = [];
  for (const album of SAMPLE_ALBUMS) {
    const id = createId();
    albumIds.push(id);
    const artistId = artistIds[album.artistIndex];
    if (!artistId) {
      console.warn(`  ⚠ No artistId at index ${album.artistIndex}`);
      continue;
    }
    await db
      .insert(schema.albums)
      .values({
        id,
        spotifyId: album.spotifyId,
        title: album.title,
        artistId,
        releaseDate: album.releaseDate,
        coverUrl: album.coverUrl,
        totalTracks: album.totalTracks,
        albumType: album.albumType,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing();
  }

  // Sample ratings
  const sampleRatings = [
    { userId: user1Id, albumIndex: 0, rating: 10 },
    { userId: user1Id, albumIndex: 1, rating: 8 },
    { userId: user1Id, albumIndex: 2, rating: 9 },
    { userId: user2Id, albumIndex: 0, rating: 9 },
    { userId: user2Id, albumIndex: 4, rating: 8 },
  ] satisfies Array<{ userId: string; albumIndex: number; rating: number }>;

  for (const r of sampleRatings) {
    const targetId = albumIds[r.albumIndex];
    if (!targetId) continue;
    await db
      .insert(schema.ratings)
      .values({
        id: createId(),
        userId: r.userId,
        targetType: "album",
        targetId,
        rating: r.rating,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing();
  }

  // Jane follows test user
  await db
    .insert(schema.follows)
    .values({ followerId: user2Id, followingId: user1Id, createdAt: new Date() })
    .onConflictDoNothing();

  console.warn("✅ Seed complete.");
  console.warn("   test@groovelog.com  / password123");
  console.warn("   jane@groovelog.com  / password123");
  console.warn(`   ${SAMPLE_ARTISTS.length} artists, ${SAMPLE_ALBUMS.length} albums seeded.`);

  await client.end();
}

seed().catch((err: unknown) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
