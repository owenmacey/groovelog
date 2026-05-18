import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Artist } from "@groovelog/db";

interface ArtistChipProps {
  artist: Pick<Artist, "spotifyId" | "name" | "imageUrl">;
  className?: string;
}

export function ArtistChip({ artist, className }: ArtistChipProps) {
  return (
    <Link
      href={`/artist/${artist.spotifyId}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl",
        "bg-bg-elevated border border-border-default px-2.5 py-1",
        "text-sm text-text-secondary hover:text-text-primary hover:border-border-strong",
        "transition-colors",
        className
      )}
    >
      {artist.imageUrl && (
        <img
          src={artist.imageUrl}
          alt={artist.name}
          className="h-4 w-4 rounded-full object-cover"
        />
      )}
      <span>{artist.name}</span>
    </Link>
  );
}
