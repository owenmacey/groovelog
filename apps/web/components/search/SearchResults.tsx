"use client";

import Link from "next/link";
import { AlbumCard } from "@/components/catalog/AlbumCard";
import { TrackRow } from "@/components/catalog/TrackRow";
import { Button } from "@/components/ui/Button";
import { UserAvatar } from "@/components/social/UserAvatar";
import { FollowButton } from "@/components/social/FollowButton";
import { trpc } from "@/lib/trpc";
import type { Artist } from "@groovelog/db";

interface SearchResultsProps {
  query: string;
  type: "album" | "track" | "artist" | "people";
}

export function SearchResults({ query, type }: SearchResultsProps) {
  if (type === "people") {
    return <PeopleResults query={query} />;
  }
  return <CatalogResults query={query} type={type} />;
}

// ─── Catalog (Spotify) results ────────────────────────────────────────────────

function CatalogResults({
  query,
  type,
}: {
  query: string;
  type: "album" | "track" | "artist";
}) {
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    trpc.catalog.search.useInfiniteQuery(
      { query, type },
      { getNextPageParam: (page) => page.nextCursor }
    );

  if (isLoading) {
    return <Searching />;
  }

  const total = data?.pages[0]?.total ?? 0;

  if (type === "album") {
    const albums = data?.pages.flatMap((p) => p.albums) ?? [];
    if (albums.length === 0) return <EmptyState message="No albums found" />;
    return (
      <div className="space-y-4">
        <ResultCount loaded={albums.length} total={total} label="albums" />
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
        <LoadMore
          hasMore={!!hasNextPage}
          loading={isFetchingNextPage}
          onLoad={() => void fetchNextPage()}
        />
      </div>
    );
  }

  if (type === "track") {
    const tracks = data?.pages.flatMap((p) => p.tracks) ?? [];
    if (tracks.length === 0) return <EmptyState message="No tracks found" />;
    return (
      <div className="space-y-4">
        <ResultCount loaded={tracks.length} total={total} label="tracks" />
        <div className="space-y-1">
          {tracks.map(({ track, album, artist, avgRating, userRating }) => (
            <TrackRow
              key={track.id}
              track={track}
              album={album}
              artist={artist}
              avgRating={avgRating}
              userRating={userRating}
            />
          ))}
        </div>
        <LoadMore
          hasMore={!!hasNextPage}
          loading={isFetchingNextPage}
          onLoad={() => void fetchNextPage()}
        />
      </div>
    );
  }

  if (type === "artist") {
    const artists = data?.pages.flatMap((p) => p.artists) ?? [];
    if (artists.length === 0) return <EmptyState message="No artists found" />;
    return (
      <div className="space-y-4">
        <ResultCount loaded={artists.length} total={total} label="artists" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {artists.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} />
          ))}
        </div>
        <LoadMore
          hasMore={!!hasNextPage}
          loading={isFetchingNextPage}
          onLoad={() => void fetchNextPage()}
        />
      </div>
    );
  }

  return null;
}

// ─── People results ───────────────────────────────────────────────────────────

function PeopleResults({ query }: { query: string }) {
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    trpc.user.search.useInfiniteQuery(
      { query },
      { getNextPageParam: (page) => page.nextCursor }
    );

  if (isLoading) {
    return <Searching />;
  }

  const people = data?.pages.flatMap((p) => p.users) ?? [];

  if (people.length === 0) {
    return <EmptyState message="No users found for this search" />;
  }

  return (
    <div className="space-y-4">
      <div className="divide-y divide-border-default rounded-lg border border-border-default overflow-hidden">
        {people.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-3 px-4 py-3 bg-bg-surface hover:bg-bg-elevated transition-colors"
          >
            <Link href={`/user/${user.username}`} className="flex-shrink-0">
              <UserAvatar user={user} size="sm" />
            </Link>
            <Link
              href={`/user/${user.username}`}
              className="flex-1 min-w-0 hover:opacity-80 transition-opacity"
            >
              <p className="text-sm font-medium text-text-primary truncate">
                {user.displayName}
              </p>
              <p className="text-xs text-text-tertiary truncate">
                @{user.username}
              </p>
            </Link>
            <FollowButton
              userId={user.id}
              username={user.username}
              isFollowing={user.isFollowing}
            />
          </div>
        ))}
      </div>
      <LoadMore
        hasMore={!!hasNextPage}
        loading={isFetchingNextPage}
        onLoad={() => void fetchNextPage()}
      />
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function ResultCount({
  loaded,
  total,
  label,
}: {
  loaded: number;
  total: number;
  label: string;
}) {
  if (total === 0) return null;
  return (
    <p className="text-sm text-text-tertiary">
      Showing{" "}
      <span className="font-mono font-medium text-text-primary tabular-nums">
        {loaded}
      </span>{" "}
      of{" "}
      <span className="font-mono font-medium text-text-primary tabular-nums">
        {total.toLocaleString()}
      </span>{" "}
      {label}
    </p>
  );
}

function LoadMore({
  hasMore,
  loading,
  onLoad,
}: {
  hasMore: boolean;
  loading: boolean;
  onLoad: () => void;
}) {
  if (!hasMore) return null;
  return (
    <div className="flex justify-center pt-2">
      <Button variant="secondary" size="sm" loading={loading} onClick={onLoad}>
        Load more
      </Button>
    </div>
  );
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

function Searching() {
  return (
    <div className="py-8 text-center text-text-tertiary text-sm">
      Searching…
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-16 text-center text-text-tertiary text-sm">
      {message}
    </div>
  );
}
