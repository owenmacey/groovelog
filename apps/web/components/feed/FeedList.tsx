"use client";

import { type ReactNode, type RefObject } from "react";
import { ActivityItem } from "@/components/feed/ActivityItem";
import type { FeedEvent, User } from "@groovelog/db";

type FeedEventWithActor = FeedEvent & { actor: User; reviewBody?: string };

interface FeedListProps {
  items: FeedEventWithActor[];
  isLoading: boolean;
  sentinelRef?: RefObject<HTMLDivElement>;
  emptyState?: ReactNode;
}

export function FeedList({ items, isLoading, sentinelRef, emptyState }: FeedListProps) {
  if (items.length === 0) {
    if (isLoading) {
      return (
        <div className="py-16 text-center text-text-tertiary text-sm">Loading…</div>
      );
    }
    return (
      <>
        {emptyState ?? (
          <div className="py-16 text-center text-text-tertiary text-sm">
            Nothing here yet.
          </div>
        )}
        {sentinelRef && <div ref={sentinelRef} aria-hidden="true" />}
      </>
    );
  }

  return (
    <div>
      <div className="divide-y divide-border-default">
        {items.map((event) => (
          <ActivityItem key={event.id} event={event} />
        ))}
      </div>
      {sentinelRef && <div ref={sentinelRef} aria-hidden="true" />}
    </div>
  );
}
