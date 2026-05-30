import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { getDb, albums } from "@groovelog/db";
import { AlbumContent } from "./AlbumContent";

const BASE_URL = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const db = getDb();
  const album = await db.query.albums.findFirst({
    where: eq(albums.spotifyId, params.id),
    with: { artist: true },
    columns: { title: true, coverUrl: true },
  });

  if (!album) return { title: "Album" };

  const title = `${album.title} by ${album.artist.name}`;
  const description = `Log and review ${album.title} by ${album.artist.name} on Groovelog.`;
  const url = `${BASE_URL}/album/${params.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      images: album.coverUrl
        ? [{ url: album.coverUrl, width: 640, height: 640, alt: title }]
        : [{ url: "/logo.png", width: 512, height: 512, alt: "Groovelog" }],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: album.coverUrl ? [album.coverUrl] : ["/logo.png"],
    },
  };
}

export default function AlbumPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { log?: string };
}) {
  return (
    <AlbumContent
      spotifyId={params.id}
      autoLog={searchParams.log === "1"}
    />
  );
}
