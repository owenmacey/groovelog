"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/PageShell";
import { HalfStarRating } from "@/components/rating/HalfStarRating";
import { trpc } from "@/lib/trpc";
import { formatRating, formatCount, formatDurationMs } from "@/lib/utils";

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

// ── Main component ────────────────────────────────────────────────────────────

export function TrackContent({ spotifyId }: { spotifyId: string }) {
  const utils = trpc.useUtils();
  const { data: me } = trpc.auth.me.useQuery();

  const { data, isLoading, error } = trpc.catalog.getTrack.useQuery({ spotifyId });

  // Check if the logged-in user has a published entry for this track's album
  const albumEntryQuery = trpc.entry.getEntryByUserAndAlbum.useQuery(
    {
      username: me?.username ?? "",
      albumSpotifyId: data?.album.spotifyId ?? "",
    },
    { enabled: !!me && !!data?.album.spotifyId }
  );

  const rateTrackMutation = trpc.rating.upsert.useMutation({
    onMutate: ({ rating }) => {
      const prev = utils.catalog.getTrack.getData({ spotifyId });
      utils.catalog.getTrack.setData({ spotifyId }, (old) =>
        old ? { ...old, userRating: rating } : old
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.catalog.getTrack.setData({ spotifyId }, ctx.prev);
      toast.error("Failed to save rating");
    },
    onSettled: () => {
      void utils.catalog.getTrack.invalidate({ spotifyId });
    },
  });

  const removeRatingMutation = trpc.rating.delete.useMutation({
    onMutate: () => {
      const prev = utils.catalog.getTrack.getData({ spotifyId });
      utils.catalog.getTrack.setData({ spotifyId }, (old) =>
        old ? { ...old, userRating: null } : old
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.catalog.getTrack.setData({ spotifyId }, ctx.prev);
      toast.error("Failed to remove rating");
    },
    onSettled: () => {
      void utils.catalog.getTrack.invalidate({ spotifyId });
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
          <p className="text-text-secondary text-sm">Track not found.</p>
        </div>
      </PageShell>
    );
  }

  const { track, album, artist, avgRating, ratingCount, userRating, distribution } = data;
  const year = album.releaseDate?.slice(0, 4) ?? null;
  const albumEntry = albumEntryQuery.data ?? null;

  return (
    <PageShell>
      <div className="space-y-10">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <div className="flex gap-6 sm:gap-8">
          <div className="flex-shrink-0 w-28 sm:w-40">
            <Link href={`/album/${album.spotifyId}`} className="block">
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
                      className="w-12 h-12"
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
            </Link>
          </div>

          <div className="flex-1 min-w-0 space-y-5 pt-1">
            {/* Title + artist + album */}
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-text-primary leading-tight">
                {track.title}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                <Link
                  href={`/artist/${artist.spotifyId}`}
                  className="text-text-secondary hover:text-text-primary transition-colors font-medium"
                >
                  {artist.name}
                </Link>
                <span className="text-text-tertiary">·</span>
                <Link
                  href={`/album/${album.spotifyId}`}
                  className="text-text-secondary hover:text-text-primary transition-colors"
                >
                  {album.title}
                </Link>
                {year && <span className="text-text-tertiary">· {year}</span>}
                <span className="text-text-tertiary">
                  · {formatDurationMs(track.durationMs)}
                </span>
              </div>
            </div>

            {/* Your rating */}
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
                    rateTrackMutation.mutate({
                      targetType: "track",
                      targetId: track.id,
                      rating: raw,
                    });
                  }}
                />
                {userRating != null && (
                  <button
                    type="button"
                    onClick={() =>
                      removeRatingMutation.mutate({
                        targetType: "track",
                        targetId: track.id,
                      })
                    }
                    disabled={removeRatingMutation.isPending}
                    className="text-xs text-text-tertiary hover:text-error transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Album entry note */}
            {albumEntry && (
              <Link
                href={`/entry/${albumEntry.id}`}
                className="inline-flex items-center gap-1.5 text-xs text-accent-gold hover:text-accent-amber transition-colors"
              >
                <BookOpen className="h-3.5 w-3.5" />
                You logged {album.title} — view your entry
              </Link>
            )}

            {/* Community stats */}
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

        {/* ── Audio preview ─────────────────────────────────────────────── */}
        {track.previewUrl && (
          <section>
            <h2 className="font-display text-lg font-semibold text-text-primary mb-3">
              Preview
            </h2>
            <div
              className="rounded-lg bg-bg-surface border border-border-default p-4"
              style={{ colorScheme: "dark" }}
            >
              <audio controls src={track.previewUrl} className="w-full h-10" />
            </div>
          </section>
        )}
      </div>
    </PageShell>
  );
}
