"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { FeedList } from "@/components/feed/FeedList";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

type Tab = "following" | "global";

export function FeedContent() {
  const { data: me } = trpc.auth.me.useQuery();
  const [tab, setTab] = useState<Tab>("following");
  const sentinelRef = useRef<HTMLDivElement>(null);

  const followingQuery = trpc.feed.getFollowingFeed.useInfiniteQuery(
    { limit: 20 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      enabled: !!me && tab === "following",
    }
  );

  const globalQuery = trpc.feed.getGlobalFeed.useInfiniteQuery(
    { limit: 20 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      enabled: tab === "global",
    }
  );

  // Ref so the IO callback always reads the latest query state without
  // needing to be recreated on every hasNextPage / isFetchingNextPage change.
  const activeQueryRef = useRef(tab === "following" ? followingQuery : globalQuery);
  activeQueryRef.current = tab === "following" ? followingQuery : globalQuery;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const { hasNextPage, isFetchingNextPage, fetchNextPage } =
          activeQueryRef.current;
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [tab]); // recreate observer only when tab switches (sentinel DOM node changes)

  const followingItems =
    followingQuery.data?.pages.flatMap((p) => p.items) ?? [];
  const globalItems =
    globalQuery.data?.pages.flatMap((p) => p.items) ?? [];

  const isFetchingNextPage =
    tab === "following"
      ? followingQuery.isFetchingNextPage
      : globalQuery.isFetchingNextPage;

  return (
    <PageShell>
      {/* Tab bar */}
      <div className="flex border-b border-border-default mb-6">
        {(["following", "global"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors border-b-2",
              tab === t
                ? "border-accent-gold text-text-primary -mb-px"
                : "border-transparent text-text-tertiary hover:text-text-secondary"
            )}
          >
            {t === "following" ? "Following" : "Global"}
          </button>
        ))}
      </div>

      {/* Following tab */}
      {tab === "following" &&
        (!me ? (
          <div className="py-16 text-center space-y-3">
            <p className="text-text-secondary text-sm">
              Sign in to see activity from people you follow.
            </p>
            <Link
              href="/login"
              className="text-sm font-medium text-accent-gold hover:underline"
            >
              Sign in
            </Link>
          </div>
        ) : (
          <FeedList
            items={followingItems}
            isLoading={followingQuery.isLoading}
            sentinelRef={sentinelRef}
            emptyState={
              <div className="py-16 text-center space-y-2">
                <p className="text-text-secondary text-sm">
                  No activity yet from people you follow.
                </p>
                <p className="text-text-tertiary text-xs">
                  <Link
                    href="/search"
                    className="text-accent-gold hover:underline"
                  >
                    Search for music
                  </Link>{" "}
                  to discover artists and users to follow.
                </p>
              </div>
            }
          />
        ))}

      {/* Global tab */}
      {tab === "global" && (
        <FeedList
          items={globalItems}
          isLoading={globalQuery.isLoading}
          sentinelRef={sentinelRef}
          emptyState={
            <p className="py-16 text-center text-sm text-text-tertiary">
              No activity yet — be the first to rate something!
            </p>
          }
        />
      )}

      {/* Loading more indicator */}
      {isFetchingNextPage && (
        <div className="py-4 text-center text-xs text-text-tertiary">
          Loading more…
        </div>
      )}
    </PageShell>
  );
}
