"use client";

import Link from "next/link";
import { cn, formatDurationMs } from "@/lib/utils";
import { HalfStarRating } from "@/components/rating/HalfStarRating";
import type { Track } from "@groovelog/db";

interface TrackRowProps {
  track: Pick<Track, "id" | "spotifyId" | "title" | "durationMs" | "trackNumber">;
  avgRating?: number | null;
  userRating?: number | null;
  onRate?: (trackId: string, rawValue: number) => void;
}

export function TrackRow({ track, avgRating, userRating, onRate }: TrackRowProps) {
  const ratingValue = onRate
    ? (userRating ?? null)
    : (userRating ?? null) ?? (avgRating != null ? Math.round(avgRating) : null);

  return (
    <div
      className={cn(
        "grid items-center gap-3 px-4 py-2.5 rounded-md",
        "hover:bg-bg-elevated transition-colors group",
        "grid-cols-[2rem_1fr_auto_auto]"
      )}
    >
      {/* Track number */}
      <span className="text-sm text-text-tertiary font-mono text-right tabular-nums">
        {track.trackNumber}
      </span>

      {/* Title */}
      <Link
        href={`/track/${track.spotifyId}`}
        className="text-sm text-text-primary truncate hover:text-accent-gold transition-colors"
      >
        {track.title}
      </Link>

      {/* Rating */}
      <div className="flex items-center gap-2">
        {ratingValue !== null ? (
          onRate ? (
            <HalfStarRating
              value={ratingValue}
              onChange={(raw) => onRate(track.id, raw)}
              size="sm"
            />
          ) : (
            <HalfStarRating value={ratingValue} readOnly size="sm" />
          )
        ) : onRate ? (
          <HalfStarRating
            value={null}
            onChange={(raw) => onRate(track.id, raw)}
            size="sm"
          />
        ) : null}
      </div>

      {/* Duration */}
      <span className="text-xs text-text-tertiary font-mono tabular-nums">
        {formatDurationMs(track.durationMs)}
      </span>
    </div>
  );
}
