"use client";

import Link from "next/link";
import { Music } from "lucide-react";
import { cn, formatDurationMs } from "@/lib/utils";
import { HalfStarRating } from "@/components/rating/HalfStarRating";
import type { Album, Artist, Track } from "@groovelog/db";

interface TrackRowProps {
  track: Pick<Track, "id" | "spotifyId" | "title" | "durationMs" | "trackNumber">;
  album?: Pick<Album, "coverUrl" | "title">;
  artist?: Pick<Artist, "name">;
  avgRating?: number | null;
  userRating?: number | null;
  onRate?: (trackId: string, rawValue: number) => void;
}

export function TrackRow({ track, album, artist, avgRating, userRating, onRate }: TrackRowProps) {
  const ratingValue = onRate
    ? (userRating ?? null)
    : (userRating ?? null) ?? (avgRating != null ? Math.round(avgRating) : null);

  const href = `/track/${track.spotifyId}`;

  return (
    <div
      className={cn(
        "grid items-center gap-3 px-4 py-2.5 rounded-md",
        "hover:bg-bg-elevated transition-colors group",
        album ? "grid-cols-[40px_2rem_1fr_auto_auto]" : "grid-cols-[2rem_1fr_auto_auto]"
      )}
    >
      {/* Album art thumbnail — only in search context */}
      {album && (
        <Link href={href} className="flex-shrink-0 block">
          <div className="relative w-10 h-10 rounded-sm overflow-hidden bg-bg-elevated flex items-center justify-center text-text-tertiary">
            <Music className="w-4 h-4" />
            {album.coverUrl && (
              <img
                src={album.coverUrl}
                alt={album.title}
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
          </div>
        </Link>
      )}

      {/* Track number */}
      <span className="text-sm text-text-tertiary font-mono text-right tabular-nums">
        {track.trackNumber}
      </span>

      {/* Title + artist · album */}
      <div className="min-w-0">
        <Link
          href={href}
          className="text-sm text-text-primary truncate hover:text-accent-gold transition-colors block"
        >
          {track.title}
        </Link>
        {(artist || album) && (
          <p className="text-xs text-text-tertiary truncate mt-0.5">
            {[artist?.name, album?.title].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

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
