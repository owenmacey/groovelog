import type { Metadata } from "next";
import { AlbumContent } from "./AlbumContent";

export const metadata: Metadata = { title: "Album · Groovelog" };

export default function AlbumPage({ params }: { params: { id: string } }) {
  return <AlbumContent spotifyId={params.id} />;
}
