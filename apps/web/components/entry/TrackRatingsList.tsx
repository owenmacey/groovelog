"use client";

import { X } from "lucide-react";
import { HalfStarRating } from "@/components/rating/HalfStarRating";
import { cn, formatDurationMs } from "@/lib/utils";

export interface TrackItem {
  id: string;
  spotifyId: string;
  title: string;
  trackNumber: number;
  discNumber: number;
  durationMs: number;
}

interface TrackRatingsListProps {
  tracks: TrackItem[];
  ratings: Map<string, number>; // spotifyId → raw rating (1–10)
  onRate: (trackSpotifyId: string, rating: number) => void; // 0 = clear
  savingTrackId: string | null;
}

export function TrackRatingsList({
  tracks,
  ratings,
  onRate,
  savingTrackId,
}: TrackRatingsListProps) {
  const discs = groupByDisc(tracks);
  const isMultiDisc = discs.length > 1;

  return (
    <div className="space-y-4">
      {discs.map(({ disc, tracks: discTracks }) => (
        <div key={disc}>
          {isMultiDisc && (
            <p className="text-xs font-mono text-text-tertiary uppercase tracking-widest mb-2 px-1">
              Disc {disc}
            </p>
          )}
          <div className="space-y-0.5">
            {discTracks.map((track) => {
              const rating = ratings.get(track.spotifyId) ?? null;
              const isSaving = savingTrackId === track.spotifyId;
              return (
                <div
                  key={track.spotifyId}
                  className={cn(
                    "grid items-center gap-3 px-3 py-2 rounded-md",
                    "grid-cols-[1.75rem_1fr_auto_auto]",
                    "hover:bg-bg-elevated transition-colors group",
                    isSaving && "opacity-50"
                  )}
                >
                  <span className="text-xs text-text-tertiary font-mono text-right tabular-nums">
                    {track.trackNumber}
                  </span>

                  <span className="text-sm text-text-primary truncate min-w-0">
                    {track.title}
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <HalfStarRating
                      value={rating}
                      onChange={(raw) => onRate(track.spotifyId, raw)}
                      size="sm"
                    />
                    {rating !== null && (
                      <button
                        type="button"
                        aria-label="Clear rating"
                        onClick={() => onRate(track.spotifyId, 0)}
                        className={cn(
                          "flex items-center justify-center h-4 w-4 rounded-full",
                          "text-text-tertiary hover:text-text-secondary hover:bg-bg-subtle",
                          "opacity-0 group-hover:opacity-100 transition-all"
                        )}
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>

                  <span className="text-xs text-text-tertiary font-mono tabular-nums shrink-0">
                    {formatDurationMs(track.durationMs)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function groupByDisc(
  tracks: TrackItem[]
): Array<{ disc: number; tracks: TrackItem[] }> {
  const map = new Map<number, TrackItem[]>();
  for (const track of tracks) {
    const disc = track.discNumber ?? 1;
    const list = map.get(disc) ?? [];
    list.push(track);
    map.set(disc, list);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([disc, tracks]) => ({ disc, tracks }));
}
