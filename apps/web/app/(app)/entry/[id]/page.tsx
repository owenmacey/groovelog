import type { Metadata } from "next";
import { EntryContent } from "./EntryContent";

export const metadata: Metadata = { title: "Entry · Groovelog" };

export default function EntryPage({ params }: { params: { id: string } }) {
  return <EntryContent entryId={params.id} />;
}
