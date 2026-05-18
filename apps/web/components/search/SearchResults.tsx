import Link from "next/link";
import { AlbumCard } from "@/components/catalog/AlbumCard";
import { TrackRow } from "@/components/catalog/TrackRow";
import type { Album, Artist, Track } from "@groovelog/db";

type AlbumResult = {
  album: Album;
  artist: Artist;
  avgRating: number | null;
  ratingCount: number;
  userRating: number | null;
};

type TrackResult = {
  track: Track;
  album: Album;
  artist: Artist;
  avgRating: number | null;
  ratingCount: number;
  userRating: number | null;
};

interface SearchResultsProps {
  type: "album" | "track" | "artist";
  albums?: AlbumResult[];
  tracks?: TrackResult[];
  artists?: Artist[];
}

export function SearchResults({
  type,
  albums = [],
  tracks = [],
  artists = [],
}: SearchResultsProps) {
  if (type === "album") {
    if (albums.length === 0) return <EmptyState message="No albums found" />;
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {albums.map(({ album, artist, avgRating, ratingCount, userRating }) => (
          <AlbumCard
            key={album.id}
            album={album}
            artist={artist}
            avgRating={avgRating}
            ratingCount={ratingCount}
            userRating={userRating}
          />
        ))}
      </div>
    );
  }

  if (type === "track") {
    if (tracks.length === 0) return <EmptyState message="No tracks found" />;
    return (
      <div className="space-y-1">
        {tracks.map(({ track, avgRating, userRating }) => (
          <TrackRow
            key={track.id}
            track={track}
            avgRating={avgRating}
            userRating={userRating}
          />
        ))}
      </div>
    );
  }

  if (type === "artist") {
    if (artists.length === 0) return <EmptyState message="No artists found" />;
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {artists.map((artist) => (
          <ArtistCard key={artist.id} artist={artist} />
        ))}
      </div>
    );
  }

  return null;
}

function ArtistCard({ artist }: { artist: Artist }) {
  return (
    <Link
      href={`/artist/${artist.spotifyId}`}
      className="flex flex-col items-center gap-2 p-4 rounded-lg bg-bg-surface border border-border-default hover:border-border-strong transition-colors group"
    >
      {artist.imageUrl ? (
        <img
          src={artist.imageUrl}
          alt={artist.name}
          className="h-20 w-20 rounded-full object-cover"
        />
      ) : (
        <div className="h-20 w-20 rounded-full bg-bg-elevated border border-border-default flex items-center justify-center text-2xl text-text-tertiary font-display">
          {artist.name.charAt(0)}
        </div>
      )}
      <p className="text-sm font-medium text-text-primary text-center truncate w-full group-hover:text-accent-gold transition-colors">
        {artist.name}
      </p>
    </Link>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-16 text-center text-text-tertiary text-sm">{message}</div>
  );
}
