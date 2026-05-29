"use client";

import Image from "next/image";
import { Heart } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatRating, formatCount } from "@/lib/utils";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@groovelog/api";

type FeaturedEntry = inferRouterOutputs<AppRouter>["entry"]["getFeaturedEntries"][number];

function VinylIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function FeaturedEntryCard({ entry }: { entry: FeaturedEntry }) {
  return (
    <div className="rounded-lg bg-bg-surface border border-border-default p-4 space-y-3">
      {/* User header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-7 w-7 rounded-full bg-bg-elevated border border-border-default flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-medium text-text-secondary uppercase leading-none">
              {entry.user.displayName.charAt(0)}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              {entry.user.displayName}
            </p>
            <p className="text-xs text-text-tertiary">@{entry.user.username}</p>
          </div>
        </div>
        {entry.overallRating !== null && (
          <span className="flex-shrink-0 font-mono text-sm font-bold text-accent-gold">
            {formatRating(entry.overallRating)}
          </span>
        )}
      </div>

      {/* Album */}
      <div className="flex items-center gap-2.5">
        <div className="h-10 w-10 rounded-md bg-bg-elevated border border-border-default flex-shrink-0 flex items-center justify-center text-text-tertiary overflow-hidden">
          {entry.album.coverUrl ? (
            <Image
              src={entry.album.coverUrl}
              alt={entry.album.title}
              width={40}
              height={40}
              className="object-cover w-full h-full"
            />
          ) : (
            <VinylIcon />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">
            {entry.album.title}
          </p>
          <p className="text-xs text-text-tertiary">{entry.album.artist.name}</p>
        </div>
      </div>

      {/* Review body */}
      {entry.reviewBody && (
        <p className="text-sm text-text-secondary leading-relaxed line-clamp-4">
          {entry.reviewBody}
        </p>
      )}

      {/* Like count */}
      <div className="flex items-center gap-1.5 pt-1 text-text-tertiary">
        <Heart className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="text-xs">{formatCount(entry.likeCount)}</span>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-lg bg-bg-surface border border-border-default p-4 space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="skeleton h-7 w-7 rounded-full" />
        <div className="space-y-1.5 flex-1">
          <div className="skeleton h-3 w-24 rounded" />
          <div className="skeleton h-2.5 w-16 rounded" />
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="skeleton h-10 w-10 rounded-md" />
        <div className="space-y-1.5 flex-1">
          <div className="skeleton h-3 w-32 rounded" />
          <div className="skeleton h-2.5 w-20 rounded" />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="skeleton h-2.5 w-full rounded" />
        <div className="skeleton h-2.5 w-5/6 rounded" />
        <div className="skeleton h-2.5 w-4/6 rounded" />
      </div>
    </div>
  );
}

export function FeaturedReviews() {
  const { data: entries, isLoading } = trpc.entry.getFeaturedEntries.useQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!entries || entries.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {entries.map((entry) => (
        <FeaturedEntryCard key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
