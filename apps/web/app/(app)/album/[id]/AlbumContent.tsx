"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/PageShell";
import { HalfStarRating } from "@/components/rating/HalfStarRating";
import { TrackRow } from "@/components/catalog/TrackRow";
import { ReviewCard } from "@/components/social/ReviewCard";
import { Button } from "@/components/ui/Button";
import { trpc } from "@/lib/trpc";
import { formatRating, formatCount } from "@/lib/utils";

// ── Rating histogram (bars 1–10) ──────────────────────────────────────────────

function RatingHistogram({
  distribution,
}: {
  distribution: { rating: number; count: number }[];
}) {
  const byRating = new Map(distribution.map((d) => [d.rating, d.count]));
  const maxCount = Math.max(...Array.from(byRating.values()), 1);

  return (
    <div className="flex items-end gap-px h-10 w-36">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((r) => {
        const count = byRating.get(r) ?? 0;
        const pct = (count / maxCount) * 100;
        return (
          <div key={r} className="flex-1 flex items-end h-full">
            <div
              className="w-full bg-accent-gold rounded-t-sm"
              style={{ height: `${pct}%`, minHeight: count > 0 ? "3px" : "0px" }}
            />
          </div>
        );
      })}
    </div>
  );
}

// ── Write review form ─────────────────────────────────────────────────────────

function WriteReviewForm({
  albumId,
  onSuccess,
}: {
  albumId: string;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [spoilers, setSpoilers] = useState(false);

  const createMutation = trpc.review.create.useMutation({
    onSuccess: () => {
      setBody("");
      setSpoilers(false);
      setOpen(false);
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Write a review
      </Button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!body.trim()) return;
        createMutation.mutate({
          targetType: "album",
          targetId: albumId,
          body: body.trim(),
          containsSpoilers: spoilers,
        });
      }}
      className="rounded-lg bg-bg-surface border border-border-default p-4 space-y-3"
    >
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Share your thoughts…"
        rows={4}
        maxLength={2000}
        className="w-full resize-none rounded-md bg-bg-elevated border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-gold"
      />
      <div className="flex items-center justify-between gap-4">
        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer select-none">
          <input
            type="checkbox"
            checked={spoilers}
            onChange={(e) => setSpoilers(e.target.checked)}
            className="accent-accent-gold"
          />
          Contains spoilers
        </label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setOpen(false);
              setBody("");
              setSpoilers(false);
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            loading={createMutation.isPending}
            disabled={!body.trim()}
          >
            Publish
          </Button>
        </div>
      </div>
    </form>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AlbumContent({ spotifyId }: { spotifyId: string }) {
  const utils = trpc.useUtils();
  const { data: me } = trpc.auth.me.useQuery();

  const { data, isLoading, error } = trpc.catalog.getAlbum.useQuery({
    spotifyId,
  });

  const reviewsQuery = trpc.review.list.useInfiniteQuery(
    { targetType: "album", targetId: data?.album.id ?? "", limit: 20 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      enabled: !!data?.album.id,
    }
  );

  const userReviewQuery = trpc.review.getUserReview.useQuery(
    { targetType: "album", targetId: data?.album.id ?? "" },
    { enabled: !!data?.album.id && !!me }
  );

  // Rate the album — optimistically update userRating, then invalidate for fresh stats
  const rateAlbumMutation = trpc.rating.upsert.useMutation({
    onMutate: ({ rating }) => {
      const prev = utils.catalog.getAlbum.getData({ spotifyId });
      utils.catalog.getAlbum.setData({ spotifyId }, (old) =>
        old ? { ...old, userRating: rating } : old
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.catalog.getAlbum.setData({ spotifyId }, ctx.prev);
      toast.error("Failed to save rating");
    },
    onSettled: () => {
      void utils.catalog.getAlbum.invalidate({ spotifyId });
    },
  });

  // Remove the album rating — optimistically clear userRating
  const removeAlbumRatingMutation = trpc.rating.delete.useMutation({
    onMutate: () => {
      const prev = utils.catalog.getAlbum.getData({ spotifyId });
      utils.catalog.getAlbum.setData({ spotifyId }, (old) =>
        old ? { ...old, userRating: null } : old
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.catalog.getAlbum.setData({ spotifyId }, ctx.prev);
      toast.error("Failed to remove rating");
    },
    onSettled: () => {
      void utils.catalog.getAlbum.invalidate({ spotifyId });
    },
  });

  // Rate a track — optimistically update that track's userRating in the album data
  const rateTrackMutation = trpc.rating.upsert.useMutation({
    onMutate: ({ targetId: trackId, rating }) => {
      const prev = utils.catalog.getAlbum.getData({ spotifyId });
      utils.catalog.getAlbum.setData({ spotifyId }, (old) => {
        if (!old) return old;
        return {
          ...old,
          tracks: old.tracks.map((t) =>
            t.track.id === trackId ? { ...t, userRating: rating } : t
          ),
        };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.catalog.getAlbum.setData({ spotifyId }, ctx.prev);
      toast.error("Failed to save track rating");
    },
  });

  if (isLoading) {
    return (
      <PageShell>
        <div className="py-16 text-center text-text-tertiary text-sm">Loading…</div>
      </PageShell>
    );
  }

  if (error || !data) {
    return (
      <PageShell>
        <div className="py-16 text-center">
          <p className="text-text-secondary text-sm">
            {error ? error.message : "Album not found."}
          </p>
        </div>
      </PageShell>
    );
  }

  const { album, artist, tracks, avgRating, ratingCount, userRating, distribution } = data;
  const year = album.releaseDate?.slice(0, 4) ?? null;
  const reviews = reviewsQuery.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <PageShell>
      <div className="space-y-10">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <div className="flex gap-6 sm:gap-8">
          {/* Cover art */}
          <div className="flex-shrink-0 w-36 sm:w-52">
            <div className="aspect-square rounded-lg overflow-hidden bg-bg-elevated shadow-lift">
              {album.coverUrl ? (
                <img
                  src={album.coverUrl}
                  alt={album.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-text-tertiary">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-16 h-16"
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

          {/* Metadata + rating */}
          <div className="flex-1 min-w-0 space-y-5 pt-1">
            {/* Title + artist */}
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-text-primary leading-tight">
                {album.title}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                <Link
                  href={`/artist/${artist.spotifyId}`}
                  className="text-text-secondary hover:text-text-primary transition-colors font-medium"
                >
                  {artist.name}
                </Link>
                {year && <span className="text-text-tertiary">· {year}</span>}
                {album.albumType !== "album" && (
                  <span className="text-text-tertiary capitalize">
                    · {album.albumType}
                  </span>
                )}
              </div>
            </div>

            {/* Your rating — always above the fold */}
            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-widest text-text-tertiary font-mono">
                Your rating
              </p>
              <div className="flex items-center gap-3">
                <HalfStarRating
                  value={userRating ?? null}
                  size="lg"
                  showLabel
                  onChange={(raw) => {
                    if (!me) {
                      toast.error("Sign in to rate");
                      return;
                    }
                    rateAlbumMutation.mutate({
                      targetType: "album",
                      targetId: album.id,
                      rating: raw,
                    });
                  }}
                />
                {userRating != null && (
                  <button
                    type="button"
                    onClick={() =>
                      removeAlbumRatingMutation.mutate({
                        targetType: "album",
                        targetId: album.id,
                      })
                    }
                    disabled={removeAlbumRatingMutation.isPending}
                    className="text-xs text-text-tertiary hover:text-error transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Community aggregate stats */}
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest text-text-tertiary font-mono">
                Community
              </p>
              {ratingCount > 0 ? (
                <div className="flex items-center gap-5 flex-wrap">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-2xl font-bold text-accent-gold tabular-nums">
                      {formatRating(avgRating ?? 0)}
                    </span>
                    <span className="text-sm text-text-tertiary">
                      {formatCount(ratingCount)}{" "}
                      {ratingCount === 1 ? "rating" : "ratings"}
                    </span>
                  </div>
                  <RatingHistogram distribution={distribution} />
                </div>
              ) : (
                <p className="text-sm text-text-tertiary">No ratings yet. Be the first!</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Track list ────────────────────────────────────────────────── */}
        <section>
          <h2 className="font-display text-lg font-semibold text-text-primary mb-3">
            Tracks
          </h2>
          <div className="rounded-lg border border-border-default divide-y divide-border-default overflow-hidden">
            {tracks.map(({ track, avgRating: tAvg, userRating: tUser }) => (
              <TrackRow
                key={track.id}
                track={track}
                avgRating={tAvg ?? undefined}
                userRating={tUser ?? undefined}
                onRate={
                  me
                    ? (trackId, raw) =>
                        rateTrackMutation.mutate({
                          targetType: "track",
                          targetId: trackId,
                          rating: raw,
                        })
                    : undefined
                }
              />
            ))}
          </div>
        </section>

        {/* ── Reviews ───────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-text-primary">
            Reviews
          </h2>

          {/* Write review — only if logged in and hasn't reviewed yet */}
          {me && !userReviewQuery.isLoading && !userReviewQuery.data && (
            <WriteReviewForm
              albumId={album.id}
              onSuccess={() => {
                void utils.review.list.invalidate({
                  targetType: "album",
                  targetId: album.id,
                });
                void utils.review.getUserReview.invalidate({
                  targetType: "album",
                  targetId: album.id,
                });
              }}
            />
          )}

          {reviews.length === 0 && !reviewsQuery.isLoading && (
            <p className="text-sm text-text-tertiary py-4 text-center">
              No reviews yet.
            </p>
          )}

          <div className="space-y-3">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>

          {reviewsQuery.hasNextPage && (
            <div className="flex justify-center pt-2">
              <Button
                variant="secondary"
                size="sm"
                loading={reviewsQuery.isFetchingNextPage}
                onClick={() => void reviewsQuery.fetchNextPage()}
              >
                Load more reviews
              </Button>
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}
