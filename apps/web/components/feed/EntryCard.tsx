"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { UserAvatar } from "@/components/social/UserAvatar";
import { DayOneBadge } from "@/components/social/DayOneBadge";
import { HalfStarRating } from "@/components/rating/HalfStarRating";
import { cn, formatRating, formatCount } from "@/lib/utils";
import type { FeedEvent, User, EntryPublishedPayload } from "@groovelog/db";

export type EntryFeedEvent = FeedEvent & {
  actor: User;
  likeCount: number;
  isLiked: boolean;
};

interface EntryCardProps {
  event: EntryFeedEvent;
}

export function EntryCard({ event }: EntryCardProps) {
  const { actor, type, payload: rawPayload, createdAt, likeCount: initialLikeCount, isLiked: initialIsLiked } = event;
  const payload = rawPayload as EntryPublishedPayload;

  const [liked, setLiked] = useState(initialIsLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);

  const { data: me } = trpc.auth.me.useQuery();

  const likeMutation = trpc.entry.like.useMutation({
    onMutate: () => {
      const wasLiked = liked;
      setLiked(!wasLiked);
      setLikeCount((c) => (wasLiked ? c - 1 : c + 1));
    },
    onError: () => {
      setLiked(initialIsLiked);
      setLikeCount(initialLikeCount);
      toast.error("Failed to update like");
    },
  });

  const verb = type === "entry_updated" ? "updated their log" : "logged";
  const entryHref = `/entry/${payload.entryId}`;

  const trackLabel =
    payload.trackRatingCount > 0
      ? payload.totalTrackCount
        ? `Rated ${payload.trackRatingCount} of ${payload.totalTrackCount} tracks`
        : `Rated ${payload.trackRatingCount} ${payload.trackRatingCount === 1 ? "track" : "tracks"}`
      : null;

  return (
    <div className="relative py-4 group">
      {/* Full-card link — sits behind interactive children */}
      <Link
        href={entryHref}
        className="absolute inset-0 z-0"
        aria-label={`View ${actor.displayName}'s entry for ${payload.albumTitle}`}
      />

      <div className="flex gap-4">
        {/* Album cover — ~80px */}
        <div className="flex-shrink-0 w-20 h-20 relative z-10">
          <div className="w-full h-full rounded-md overflow-hidden bg-bg-elevated shadow-card">
            {payload.coverUrl ? (
              <img
                src={payload.coverUrl}
                alt={payload.albumTitle}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-tertiary">
                <svg
                  viewBox="0 0 24 24"
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1}
                >
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 relative z-10">
          {/* Author header */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Link
              href={`/user/${actor.username}`}
              className="flex-shrink-0 relative z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <UserAvatar user={actor} size="xs" />
            </Link>
            <p className="text-xs text-text-tertiary leading-none">
              <Link
                href={`/user/${actor.username}`}
                className="font-medium text-text-secondary hover:text-text-primary transition-colors relative z-10 inline-flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                {actor.displayName}
                {actor.isDayOne && <DayOneBadge />}
              </Link>
              {" · "}
              {verb}
              {" · "}
              <time dateTime={createdAt.toISOString()}>
                {formatDistanceToNow(createdAt, { addSuffix: true })}
              </time>
            </p>
          </div>

          {/* Album title + artist */}
          <p className="font-display font-semibold text-text-primary text-sm leading-snug truncate">
            {payload.albumTitle}
          </p>
          <p className="text-xs text-text-tertiary truncate mb-1.5">
            {payload.artistName}
          </p>

          {/* Overall star rating */}
          {payload.overallRating !== null && payload.overallRating !== undefined && (
            <div className="flex items-center gap-1.5 mb-1.5">
              <HalfStarRating value={payload.overallRating} readOnly size="sm" />
              <span className="text-xs font-mono text-accent-gold tabular-nums">
                {formatRating(payload.overallRating)}
              </span>
            </div>
          )}

          {/* Review snippet — word-boundary truncation with Read more */}
          {payload.reviewSnippet && (() => {
            const MAX = 200;
            const full = payload.reviewSnippet;
            const needsTrunc = full.length > MAX;
            const displayed = needsTrunc
              ? full.slice(0, full.lastIndexOf(" ", MAX) || MAX)
              : full;
            return (
              <p className="text-xs text-text-secondary leading-relaxed mb-1.5">
                {displayed}
                {needsTrunc && (
                  <>
                    {"… "}
                    <Link
                      href={entryHref}
                      className="text-accent-gold hover:text-accent-amber transition-colors relative z-10 font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Read more
                    </Link>
                  </>
                )}
              </p>
            );
          })()}

          {/* Track rating count + like button */}
          <div className="flex items-center gap-3 mt-1">
            {trackLabel && (
              <span className="text-xs text-text-tertiary">{trackLabel}</span>
            )}

            <button
              type="button"
              className={cn(
                "relative z-10 flex items-center gap-1 text-xs transition-colors",
                liked
                  ? "text-accent-gold"
                  : "text-text-tertiary hover:text-text-secondary"
              )}
              onClick={(e) => {
                e.preventDefault();
                if (!me) {
                  toast.error("Sign in to like entries");
                  return;
                }
                likeMutation.mutate({ entryId: payload.entryId });
              }}
              disabled={likeMutation.isPending}
            >
              <Heart
                className="h-3.5 w-3.5"
                fill={liked ? "currentColor" : "none"}
              />
              <span className="font-mono tabular-nums">{formatCount(likeCount)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
