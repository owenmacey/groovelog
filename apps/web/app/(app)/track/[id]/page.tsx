import type { Metadata } from "next";
import { TrackContent } from "./TrackContent";

export const metadata: Metadata = { title: "Track · Groovelog" };

export default function TrackPage({ params }: { params: { id: string } }) {
  return <TrackContent spotifyId={params.id} />;
}
