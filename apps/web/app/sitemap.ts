import type { MetadataRoute } from "next";
import { getDb, users, albums, albumEntries } from "@groovelog/db";
import { eq } from "drizzle-orm";

const BASE_URL = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = getDb();

  const [allUsers, publishedAlbumIds, allAlbums] = await Promise.all([
    db.query.users.findMany({ columns: { username: true, updatedAt: true } }),
    db.selectDistinct({ albumId: albumEntries.albumId })
      .from(albumEntries)
      .where(eq(albumEntries.status, "published")),
    db.query.albums.findMany({ columns: { id: true, spotifyId: true, updatedAt: true } }),
  ]);

  const publishedSet = new Set(publishedAlbumIds.map((r) => r.albumId));
  const albumsWithEntries = allAlbums.filter((a) => publishedSet.has(a.id));

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/login`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/register`, changeFrequency: "yearly", priority: 0.5 },
  ];

  const userRoutes: MetadataRoute.Sitemap = allUsers.map((user) => ({
    url: `${BASE_URL}/user/${user.username}`,
    lastModified: user.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const albumRoutes: MetadataRoute.Sitemap = albumsWithEntries.map((album) => ({
    url: `${BASE_URL}/album/${album.spotifyId}`,
    lastModified: album.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...userRoutes, ...albumRoutes];
}
