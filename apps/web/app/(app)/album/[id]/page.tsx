import type { Metadata } from "next";
import { AlbumContent } from "./AlbumContent";

export const metadata: Metadata = { title: "Album · Groovelog" };

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
