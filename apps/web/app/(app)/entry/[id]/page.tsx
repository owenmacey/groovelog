import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { getDb, albumEntries } from "@groovelog/db";
import { EntryContent } from "./EntryContent";

const BASE_URL = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const db = getDb();
  const entry = await db.query.albumEntries.findFirst({
    where: eq(albumEntries.id, params.id),
    with: {
      album: { with: { artist: true }, columns: { title: true, coverUrl: true } },
      user: { columns: { username: true, displayName: true } },
    },
    columns: { status: true, reviewBody: true },
  });

  if (!entry || entry.status !== "published") return { title: "Review" };

  const title = `${entry.user.displayName}'s review of ${entry.album.title}`;
  const description =
    entry.reviewBody?.slice(0, 160) ??
    `${entry.user.displayName} reviewed ${entry.album.title} by ${entry.album.artist.name} on Groovelog.`;
  const url = `${BASE_URL}/entry/${params.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      images: entry.album.coverUrl
        ? [{ url: entry.album.coverUrl, width: 640, height: 640, alt: entry.album.title }]
        : [{ url: "/logo.png", width: 512, height: 512, alt: "Groovelog" }],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: entry.album.coverUrl ? [entry.album.coverUrl] : ["/logo.png"],
    },
  };
}

export default function EntryPage({ params }: { params: { id: string } }) {
  return <EntryContent entryId={params.id} />;
}
