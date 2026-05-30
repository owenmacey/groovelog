import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { getDb, users } from "@groovelog/db";
import { UserContent } from "./UserContent";

const BASE_URL = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: { username: string };
}): Promise<Metadata> {
  const db = getDb();
  const user = await db.query.users.findFirst({
    where: eq(users.username, params.username),
    columns: { displayName: true, bio: true, avatarUrl: true },
  });

  if (!user) return { title: params.username };

  const title = `${user.displayName} (@${params.username})`;
  const description =
    user.bio ?? `${user.displayName}'s music ratings and reviews on Groovelog.`;
  const url = `${BASE_URL}/user/${params.username}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      images: user.avatarUrl
        ? [{ url: user.avatarUrl, alt: user.displayName }]
        : [{ url: "/logo.png", width: 512, height: 512, alt: "Groovelog" }],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: user.avatarUrl ? [user.avatarUrl] : ["/logo.png"],
    },
  };
}

export default function UserPage({
  params,
}: {
  params: { username: string };
}) {
  return <UserContent username={params.username} />;
}
