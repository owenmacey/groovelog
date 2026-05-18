import type { Metadata } from "next";
import { UserContent } from "./UserContent";

export function generateMetadata({
  params,
}: {
  params: { username: string };
}): Metadata {
  return { title: `@${params.username} · Groovelog` };
}

export default function UserPage({
  params,
}: {
  params: { username: string };
}) {
  return <UserContent username={params.username} />;
}
