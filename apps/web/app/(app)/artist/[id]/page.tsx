import type { Metadata } from "next";
import { ArtistContent } from "./ArtistContent";

export const metadata: Metadata = { title: "Artist · Groovelog" };

export default function ArtistPage({ params }: { params: { id: string } }) {
  return <ArtistContent spotifyId={params.id} />;
}
