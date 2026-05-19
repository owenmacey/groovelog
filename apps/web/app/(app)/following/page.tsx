"use client";

import Link from "next/link";
import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { UserAvatar } from "@/components/social/UserAvatar";
import { FollowButton } from "@/components/social/FollowButton";
import { Button } from "@/components/ui/Button";
import { trpc } from "@/lib/trpc";

export default function FollowingPage() {
  const { data: me, isLoading: meLoading } = trpc.auth.me.useQuery();

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    trpc.user.getFollowing.useInfiniteQuery(
      { userId: me?.id ?? "", limit: 20 },
      {
        enabled: !!me?.id,
        getNextPageParam: (page) => page.nextCursor,
      }
    );

  const users = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <PageShell maxWidth="sm">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-text-primary">
          Following
        </h1>

        {meLoading || isLoading ? (
          <div className="space-y-4 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-bg-elevated shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-32 rounded bg-bg-elevated" />
                  <div className="h-3 w-24 rounded bg-bg-elevated" />
                </div>
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <p className="text-text-secondary text-sm">
              You&apos;re not following anyone yet.
            </p>
            <Link
              href="/search?type=people"
              className="text-sm text-accent-gold hover:text-accent-amber transition-colors"
            >
              Find people to follow →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="divide-y divide-border-default rounded-lg border border-border-default overflow-hidden">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 px-4 py-3 bg-bg-surface hover:bg-bg-elevated transition-colors"
                >
                  <Link href={`/user/${user.username}`} className="shrink-0">
                    <UserAvatar user={user} size="md" />
                  </Link>
                  <Link
                    href={`/user/${user.username}`}
                    className="flex-1 min-w-0 hover:opacity-80 transition-opacity"
                  >
                    <p className="text-sm font-medium text-text-primary truncate">
                      {user.displayName}
                    </p>
                    <p className="text-xs text-text-tertiary truncate">
                      @{user.username}
                    </p>
                  </Link>
                  {me?.id !== user.id && (
                    <FollowButton
                      userId={user.id}
                      username={user.username}
                      isFollowing={user.isFollowing}
                    />
                  )}
                </div>
              ))}
            </div>

            {hasNextPage && (
              <div className="flex justify-center">
                <Button
                  variant="secondary"
                  size="sm"
                  loading={isFetchingNextPage}
                  onClick={() => void fetchNextPage()}
                >
                  Load more
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}
