"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Heart, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/PageShell";
import { UserAvatar } from "@/components/social/UserAvatar";
import { DayOneBadge } from "@/components/social/DayOneBadge";
import { HalfStarRating } from "@/components/rating/HalfStarRating";
import { Button } from "@/components/ui/Button";
import { trpc } from "@/lib/trpc";
import { cn, formatRating, formatCount } from "@/lib/utils";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@groovelog/api";

type EntryDetail = NonNullable<inferRouterOutputs<AppRouter>["entry"]["getEntry"]>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupTrackRatingsByDisc(trackRatings: EntryDetail["trackRatings"]) {
  const map = new Map<number, EntryDetail["trackRatings"]>();
  for (const tr of trackRatings) {
    const disc = tr.track.discNumber ?? 1;
    const list = map.get(disc) ?? [];
    list.push(tr);
    map.set(disc, list);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([disc, items]) => ({ disc, items }));
}

// ── Main component ────────────────────────────────────────────────────────────

export function EntryContent({ entryId }: { entryId: string }) {
  const router = useRouter();
  const { data: me } = trpc.auth.me.useQuery();

  const { data: entry, isLoading, error } = trpc.entry.getEntry.useQuery({ entryId });

  // Like state
  const [liked, setLiked] = useState<boolean | null>(null);
  const [likeCount, setLikeCount] = useState<number | null>(null);

  // Initialise local like state once the entry loads
  const resolvedLiked = liked ?? entry?.isLiked ?? false;
  const resolvedLikeCount = likeCount ?? entry?.likeCount ?? 0;

  const likeMutation = trpc.entry.like.useMutation({
    onMutate: () => {
      const wasLiked = resolvedLiked;
      setLiked(!wasLiked);
      setLikeCount(resolvedLikeCount + (wasLiked ? -1 : 1));
    },
    onError: () => {
      setLiked(entry?.isLiked ?? false);
      setLikeCount(entry?.likeCount ?? 0);
      toast.error("Failed to update like");
    },
  });

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteMutation = trpc.entry.delete.useMutation({
    onSuccess: () => {
      toast.success("Entry deleted");
      router.push(`/album/${entry?.album.spotifyId ?? ""}`);
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <PageShell>
        <div className="py-16 text-center text-text-tertiary text-sm">Loading…</div>
      </PageShell>
    );
  }

  if (error || !entry) {
    return (
      <PageShell>
        <div className="py-16 text-center">
          <p className="text-text-secondary text-sm">
            {error?.message ?? "Entry not found."}
          </p>
        </div>
      </PageShell>
    );
  }

  // ── Derived values ──────────────────────────────────────────────────────────

  const isOwner = me?.id === entry.userId;
  const albumSpotifyId = entry.album.spotifyId;
  const releaseYear = entry.album.releaseDate?.slice(0, 4) ?? null;
  const discGroups = groupTrackRatingsByDisc(entry.trackRatings);
  const isMultiDisc = discGroups.length > 1;

  const listenedLabel = entry.listenedAt
    ? format(new Date(entry.listenedAt), "d MMM yyyy")
    : null;
  const publishedLabel = entry.publishedAt
    ? format(new Date(entry.publishedAt), "d MMM yyyy")
    : null;

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto space-y-8">

        {/* ── Author header ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Link href={`/user/${entry.user.username}`} className="flex-shrink-0">
              <UserAvatar user={entry.user} size="sm" />
            </Link>
            <div className="min-w-0">
              <Link
                href={`/user/${entry.user.username}`}
                className="text-sm font-medium text-text-primary hover:text-accent-gold transition-colors inline-flex items-center gap-1.5"
              >
                {entry.user.displayName}
                {entry.user.isDayOne && <DayOneBadge />}
              </Link>
              <p className="text-xs text-text-tertiary">
                @{entry.user.username}
                {listenedLabel && (
                  <> · listened {listenedLabel}</>
                )}
                {publishedLabel && (
                  <> · published {publishedLabel}</>
                )}
              </p>
            </div>
          </div>

          {/* Owner actions */}
          {isOwner && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link href={`/album/${albumSpotifyId}?log=1`}>
                <Button variant="secondary" size="sm">
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  Edit
                </Button>
              </Link>

              {showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary">Delete?</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    loading={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate({ entryId })}
                  >
                    Delete
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-text-tertiary hover:text-error"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* ── Album card ─────────────────────────────────────────────────── */}
        <div className="flex gap-5 items-start">
          <Link
            href={`/album/${albumSpotifyId}`}
            className="flex-shrink-0 w-28 sm:w-36"
          >
            <div className="aspect-square rounded-lg overflow-hidden bg-bg-elevated shadow-lift">
              {entry.album.coverUrl ? (
                <img
                  src={entry.album.coverUrl}
                  alt={entry.album.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-text-tertiary">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-10 h-10"
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

          <div className="flex-1 min-w-0 pt-1 space-y-3">
            <div>
              <Link
                href={`/album/${albumSpotifyId}`}
                className="font-display text-xl sm:text-2xl font-bold text-text-primary hover:text-accent-gold transition-colors leading-tight block"
              >
                {entry.album.title}
              </Link>
              <Link
                href={`/artist/${entry.album.artist.spotifyId}`}
                className="text-sm text-text-secondary hover:text-text-primary transition-colors font-medium mt-0.5 inline-block"
              >
                {entry.album.artist.name}
              </Link>
              {releaseYear && (
                <span className="text-sm text-text-tertiary"> · {releaseYear}</span>
              )}
            </div>

            {/* Overall rating */}
            {entry.overallRating !== null && entry.overallRating !== undefined && (
              <div className="flex items-center gap-3">
                <HalfStarRating
                  value={entry.overallRating}
                  readOnly
                  size="lg"
                />
                <span className="font-mono text-xl font-bold text-accent-gold tabular-nums">
                  {formatRating(entry.overallRating)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Review body ────────────────────────────────────────────────── */}
        {entry.reviewBody && (
          <div className="rounded-xl bg-bg-surface border border-border-default p-5">
            <p className="text-sm text-text-primary leading-relaxed whitespace-pre-line">
              {entry.reviewBody}
            </p>
          </div>
        )}

        {/* ── Track ratings ──────────────────────────────────────────────── */}
        {entry.trackRatings.length > 0 && (
          <section>
            <h2 className="text-xs font-mono text-text-tertiary uppercase tracking-widest mb-3">
              Track ratings
              <span className="ml-2 text-accent-gold">
                {entry.trackRatings.length}
              </span>
            </h2>
            <div className="space-y-4">
              {discGroups.map(({ disc, items }) => (
                <div key={disc}>
                  {isMultiDisc && (
                    <p className="text-xs font-mono text-text-tertiary uppercase tracking-widest mb-2 px-1">
                      Disc {disc}
                    </p>
                  )}
                  <div className="space-y-0.5">
                    {items.map((tr) => (
                      <div
                        key={tr.id}
                        className="grid items-center gap-3 px-3 py-2 rounded-md hover:bg-bg-elevated transition-colors"
                        style={{ gridTemplateColumns: "1.75rem 1fr auto" }}
                      >
                        <span className="text-xs text-text-tertiary font-mono text-right tabular-nums">
                          {tr.track.trackNumber}
                        </span>
                        <span className="text-sm text-text-primary truncate">
                          {tr.track.title}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <HalfStarRating
                            value={tr.rating}
                            readOnly
                            size="sm"
                          />
                          <span className="text-xs font-mono text-text-tertiary tabular-nums w-6">
                            {formatRating(tr.rating)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Footer: likes ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-4 pt-2 border-t border-border-default">
          <button
            type="button"
            onClick={() => {
              if (!me) {
                toast.error("Sign in to like entries");
                return;
              }
              likeMutation.mutate({ entryId });
            }}
            disabled={likeMutation.isPending}
            className={cn(
              "flex items-center gap-1.5 text-sm transition-colors",
              resolvedLiked
                ? "text-accent-gold"
                : "text-text-tertiary hover:text-text-secondary"
            )}
          >
            <Heart
              className="h-4 w-4"
              fill={resolvedLiked ? "currentColor" : "none"}
            />
            <span className="font-mono tabular-nums">
              {formatCount(resolvedLikeCount)}
            </span>
          </button>
        </div>
      </div>
    </PageShell>
  );
}
