"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BookOpen } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { TrackRow } from "@/components/catalog/TrackRow";
import { Button } from "@/components/ui/Button";
import { EntryEditor, type EntryData } from "@/components/entry/EntryEditor";
import type { TrackItem } from "@/components/entry/TrackRatingsList";
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

// ── Main component ────────────────────────────────────────────────────────────

export function AlbumContent({
  spotifyId,
  autoLog = false,
}: {
  spotifyId: string;
  autoLog?: boolean;
}) {
  const { data: me } = trpc.auth.me.useQuery();

  // Entry editor state
  const [entry, setEntry] = useState<EntryData | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const { data, isLoading, error } = trpc.catalog.getAlbum.useQuery({
    spotifyId,
  });

  const getOrCreateDraft = trpc.entry.getOrCreateDraft.useMutation({
    onSuccess: (data) => {
      setEntry(data);
      setEditorOpen(true);
    },
    onError: (err) => toast.error(err.message),
  });

  // Auto-open the editor when navigating from the entry detail "Edit" button
  useEffect(() => {
    if (autoLog && me && !editorOpen && !getOrCreateDraft.isPending) {
      getOrCreateDraft.mutate({ albumSpotifyId: spotifyId });
    }
  // Only fire once on mount when the user session resolves
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLog, me]);

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

  const { album, artist, tracks, avgRating, ratingCount, distribution } = data;
  const year = album.releaseDate?.slice(0, 4) ?? null;

  const albumTracks: TrackItem[] = tracks.map(({ track }) => ({
    id: track.id,
    spotifyId: track.spotifyId,
    title: track.title,
    trackNumber: track.trackNumber,
    discNumber: track.discNumber,
    durationMs: track.durationMs,
  }));

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

          {/* Metadata + community stats */}
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

            {/* Log button — shown in hero for quick access */}
            {me && !editorOpen && (
              <Button
                variant="primary"
                size="sm"
                loading={getOrCreateDraft.isPending}
                onClick={() =>
                  getOrCreateDraft.mutate({ albumSpotifyId: spotifyId })
                }
              >
                <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                Log this album
              </Button>
            )}
          </div>
        </div>

        {/* ── Entry editor (opens after clicking Log) ────────────────────── */}
        {editorOpen && entry && (
          <section className="rounded-xl border border-border-default bg-bg-surface p-5 sm:p-6">
            <EntryEditor
              entry={entry}
              albumTracks={albumTracks}
              onDelete={() => {
                setEntry(null);
                setEditorOpen(false);
              }}
              onPublishSuccess={(updated) => setEntry(updated)}
              onUnpublishSuccess={(updated) => setEntry(updated)}
            />
          </section>
        )}

        {/* ── Track list (read-only — rate tracks inside the entry editor) ── */}
        <section>
          <h2 className="font-display text-lg font-semibold text-text-primary mb-3">
            Tracks
          </h2>
          <div className="rounded-lg border border-border-default divide-y divide-border-default overflow-hidden">
            {tracks.map(({ track, avgRating: tAvg }) => (
              <TrackRow
                key={track.id}
                track={track}
                avgRating={tAvg ?? undefined}
              />
            ))}
          </div>
        </section>

      </div>
    </PageShell>
  );
}
