"use client";

import { PageShell } from "@/components/layout/PageShell";
import { AlbumCard } from "@/components/catalog/AlbumCard";
import { Button } from "@/components/ui/Button";
import { trpc } from "@/lib/trpc";
import { formatCount } from "@/lib/utils";

export function ArtistContent({ spotifyId }: { spotifyId: string }) {
  const { data: artistData, isLoading: artistLoading, error: artistError } =
    trpc.catalog.getArtist.useQuery({ spotifyId });

  const albumsQuery = trpc.catalog.getArtistAlbums.useInfiniteQuery(
    { spotifyId },
    { getNextPageParam: (lastPage) => lastPage.nextCursor }
  );

  if (artistLoading) {
    return (
      <PageShell>
        <div className="py-16 text-center text-text-tertiary text-sm">Loading…</div>
      </PageShell>
    );
  }

  if (artistError || !artistData) {
    return (
      <PageShell>
        <div className="py-16 text-center">
          <p className="text-text-secondary text-sm">
            {artistError ? artistError.message : "Artist not found."}
          </p>
        </div>
      </PageShell>
    );
  }

  const { artist, followerCount } = artistData;
  const allAlbums = albumsQuery.data?.pages.flatMap((p) => p.albums) ?? [];
  const total = albumsQuery.data?.pages[0]?.total ?? 0;

  return (
    <PageShell>
      <div className="space-y-10">
        {/* ── Artist header ──────────────────────────────────────────────── */}
        <div className="flex gap-6 items-start">
          <div className="flex-shrink-0">
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden bg-bg-elevated border border-border-default flex items-center justify-center text-4xl font-display font-bold text-text-tertiary">
              {artist.imageUrl ? (
                <img
                  src={artist.imageUrl}
                  alt={artist.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                artist.name.charAt(0)
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-3 pt-2">
            <h1 className="font-display text-3xl font-bold text-text-primary leading-tight">
              {artist.name}
            </h1>

            {followerCount != null && (
              <p className="text-sm text-text-secondary">
                <span className="font-mono font-medium text-text-primary">
                  {formatCount(followerCount)}
                </span>{" "}
                followers on Spotify
              </p>
            )}

            {artist.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {artist.genres.slice(0, 6).map((genre) => (
                  <span
                    key={genre}
                    className="rounded-full bg-bg-elevated border border-border-default px-2.5 py-0.5 text-xs text-text-secondary capitalize"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Discography ────────────────────────────────────────────────── */}
        {albumsQuery.isLoading ? (
          <div className="py-8 text-center text-text-tertiary text-sm">
            Loading albums…
          </div>
        ) : allAlbums.length > 0 ? (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-text-primary">
                Discography
              </h2>
              <span className="text-sm text-text-tertiary tabular-nums">
                Showing {allAlbums.length} of {total}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {allAlbums.map(({ album, avgRating, ratingCount, userRating }) => (
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

            {albumsQuery.hasNextPage && (
              <div className="flex justify-center mt-6">
                <Button
                  variant="secondary"
                  size="sm"
                  loading={albumsQuery.isFetchingNextPage}
                  onClick={() => void albumsQuery.fetchNextPage()}
                >
                  Load more
                </Button>
              </div>
            )}
          </section>
        ) : (
          <p className="text-sm text-text-tertiary text-center py-8">
            No releases found for this artist.
          </p>
        )}
      </div>
    </PageShell>
  );
}
