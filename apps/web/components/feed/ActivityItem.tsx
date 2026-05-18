"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { UserAvatar } from "@/components/social/UserAvatar";
import { HalfStarRating } from "@/components/rating/HalfStarRating";
import { cn } from "@/lib/utils";
import type {
  FeedEvent,
  User,
  RatedPayload,
  ReviewedPayload,
  FollowedPayload,
} from "@groovelog/db";

type FeedEventWithActor = FeedEvent & { actor: User; reviewBody?: string };

interface ActivityItemProps {
  event: FeedEventWithActor;
}

function CoverThumb({
  coverUrl,
  title,
  href,
}: {
  coverUrl: string | null;
  title: string;
  href: string;
}) {
  return (
    <Link href={href} className="flex-shrink-0 block">
      <div className="w-12 h-12 rounded overflow-hidden bg-bg-elevated">
        {coverUrl ? (
          <img src={coverUrl} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-tertiary">
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1}>
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
        )}
      </div>
    </Link>
  );
}

export function ActivityItem({ event }: ActivityItemProps) {
  const { actor, type, payload, createdAt, reviewBody } = event;
  const [expanded, setExpanded] = useState(false);

  if (type === "rated") {
    const p = payload as RatedPayload;
    const href = `/${p.targetType}/${p.spotifyId ?? p.targetId}`;
    return (
      <div className="flex items-start gap-3 py-3">
        <Link href={`/user/${actor.username}`} className="flex-shrink-0">
          <UserAvatar user={actor} size="sm" />
        </Link>
        <div className="flex-1 min-w-0 flex items-start gap-3">
          <CoverThumb coverUrl={p.coverUrl} title={p.title} href={href} />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-primary leading-snug">
              <Link
                href={`/user/${actor.username}`}
                className="font-medium hover:text-accent-gold transition-colors"
              >
                {actor.displayName}
              </Link>{" "}
              rated{" "}
              <Link
                href={href}
                className="font-medium hover:text-accent-gold transition-colors"
              >
                {p.title || "an album"}
              </Link>
            </p>
            {p.rating != null && (
              <HalfStarRating value={p.rating} readOnly size="sm" showLabel className="mt-1" />
            )}
            <time className="text-xs text-text-tertiary mt-1 block">
              {formatDistanceToNow(createdAt, { addSuffix: true })}
            </time>
          </div>
        </div>
      </div>
    );
  }

  if (type === "reviewed") {
    const p = payload as ReviewedPayload;
    const href = `/${p.targetType}/${p.spotifyId ?? p.targetId}`;
    const isLong = !!reviewBody && reviewBody.length > 200;
    return (
      <div className="flex items-start gap-3 py-3">
        <Link href={`/user/${actor.username}`} className="flex-shrink-0">
          <UserAvatar user={actor} size="sm" />
        </Link>
        <div className="flex-1 min-w-0 flex items-start gap-3">
          <CoverThumb coverUrl={p.coverUrl} title={p.title} href={href} />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-primary leading-snug">
              <Link
                href={`/user/${actor.username}`}
                className="font-medium hover:text-accent-gold transition-colors"
              >
                {actor.displayName}
              </Link>{" "}
              reviewed{" "}
              <Link
                href={href}
                className="font-medium hover:text-accent-gold transition-colors"
              >
                {p.title || "an album"}
              </Link>
            </p>
            {p.rating != null && (
              <HalfStarRating value={p.rating} readOnly size="sm" showLabel className="mt-1" />
            )}
            {reviewBody && (
              <div className="mt-1.5">
                <p
                  className={cn(
                    "text-sm text-text-secondary leading-relaxed whitespace-pre-line",
                    !expanded && isLong && "line-clamp-3"
                  )}
                >
                  {reviewBody}
                </p>
                {isLong && (
                  <button
                    onClick={() => setExpanded((e) => !e)}
                    className="mt-0.5 text-xs text-accent-gold hover:text-accent-amber transition-colors"
                  >
                    {expanded ? "Show less" : "Read more"}
                  </button>
                )}
              </div>
            )}
            <time className="text-xs text-text-tertiary mt-1 block">
              {formatDistanceToNow(createdAt, { addSuffix: true })}
            </time>
          </div>
        </div>
      </div>
    );
  }

  if (type === "followed") {
    const p = payload as FollowedPayload;
    return (
      <div className="flex items-start gap-3 py-3">
        <Link href={`/user/${actor.username}`} className="flex-shrink-0">
          <UserAvatar user={actor} size="sm" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-text-primary leading-snug">
              <Link
                href={`/user/${actor.username}`}
                className="font-medium hover:text-accent-gold transition-colors"
              >
                {actor.displayName}
              </Link>{" "}
              followed{" "}
              <Link
                href={`/user/${p.targetUsername}`}
                className="font-medium hover:text-accent-gold transition-colors"
              >
                {p.targetDisplayName}
              </Link>
            </p>
            <time className="text-xs text-text-tertiary whitespace-nowrap flex-shrink-0">
              {formatDistanceToNow(createdAt, { addSuffix: true })}
            </time>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
