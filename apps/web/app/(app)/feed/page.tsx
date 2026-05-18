import type { Metadata } from "next";
import { FeedContent } from "./FeedContent";

export const metadata: Metadata = { title: "Feed · Groovelog" };

export default function FeedPage() {
  return <FeedContent />;
}
