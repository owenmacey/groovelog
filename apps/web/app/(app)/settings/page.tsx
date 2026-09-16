import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb, users } from "@groovelog/db";
import { getAuth } from "@groovelog/api/auth";
import { PageShell } from "@/components/layout/PageShell";
import { UsernameChangeForm } from "./UsernameChangeForm";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await getAuth().api.getSession({ headers: headers() });
  if (!session?.user) redirect("/login");

  const db = getDb();
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { username: true, usernameChangedAt: true },
  });

  if (!user) redirect("/login");

  return (
    <PageShell maxWidth="sm">
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-text-primary">Settings</h1>
          <p className="text-sm text-text-tertiary mt-1">Manage your account</p>
        </div>
        <UsernameChangeForm
          currentUsername={user.username}
          usernameChangedAt={user.usernameChangedAt?.toISOString() ?? null}
        />
      </div>
    </PageShell>
  );
}
