import Link from "next/link";
import { cn, formatRating, formatCount } from "@/lib/utils";
import { HalfStarRating } from "@/components/rating/HalfStarRating";
import type { Album, Artist } from "@groovelog/db";

interface AlbumCardProps {
  album: Pick<Album, "spotifyId" | "title" | "coverUrl" | "releaseDate">;
  artist: Pick<Artist, "name">;
  avgRating?: number | null;
  ratingCount?: number;
  userRating?: number | null;
  className?: string;
}

export function AlbumCard({
  album,
  artist,
  avgRating,
  ratingCount,
  userRating,
  className,
}: AlbumCardProps) {
  const year = album.releaseDate ? album.releaseDate.slice(0, 4) : null;

  return (
    <Link href={`/album/${album.spotifyId}`} className={cn("group block", className)}>
      <div className="rounded-lg overflow-hidden bg-bg-surface border border-border-default shadow-card hover:shadow-lift transition-shadow duration-200">
        {/* Square cover */}
        <div className="relative aspect-square overflow-hidden bg-bg-elevated">
          {album.coverUrl ? (
            <img
              src={album.coverUrl}
              alt={album.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-text-tertiary">
              <svg viewBox="0 0 24 24" className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth={1}>
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
          )}

          {/* User rating badge */}
          {userRating !== undefined && userRating !== null && (
            <div className="absolute top-2 right-2 rounded-md bg-bg-elevated px-1.5 py-0.5 border border-border-accent">
              <span className="font-mono text-xs text-accent-gold tabular-nums">
                {formatRating(userRating)}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3 space-y-1">
          <p className="text-sm font-medium text-text-primary truncate leading-tight">
            {album.title}
          </p>
          <p className="text-xs text-text-secondary truncate">
            {artist.name}
            {year && <span className="text-text-tertiary"> · {year}</span>}
          </p>

          {avgRating !== undefined && avgRating !== null && (
            <div className="flex items-center gap-1.5 pt-0.5">
              <HalfStarRating value={Math.round(avgRating)} readOnly size="sm" />
              {ratingCount !== undefined && ratingCount > 0 && (
                <span className="text-xs text-text-tertiary font-mono">
                  {formatCount(ratingCount)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
