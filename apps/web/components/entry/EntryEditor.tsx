"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Music, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@groovelog/api";
import { trpc } from "@/lib/trpc";
import { HalfStarRating } from "@/components/rating/HalfStarRating";
import { Button } from "@/components/ui/Button";
import { cn, formatRating } from "@/lib/utils";
import { AutoSaveIndicator, type SaveStatus } from "./AutoSaveIndicator";
import { EntryPreviewModal } from "./EntryPreviewModal";
import { TrackRatingsList, type TrackItem } from "./TrackRatingsList";

type RouterOutputs = inferRouterOutputs<AppRouter>;
export type EntryData = NonNullable<RouterOutputs["entry"]["getOrCreateDraft"]>;

interface EntryEditorProps {
  entry: EntryData;
  albumTracks: TrackItem[];
  onDelete?: () => void;
  onPublishSuccess?: (entry: EntryData) => void;
  onUnpublishSuccess?: (entry: EntryData) => void;
}

export function EntryEditor({
  entry: initialEntry,
  albumTracks,
  onDelete,
  onPublishSuccess,
  onUnpublishSuccess,
}: EntryEditorProps) {
  // ─── Core state ────────────────────────────────────────────────────────────
  const [entry, setEntry] = useState(initialEntry);
  const [localRating, setLocalRating] = useState<number | null>(initialEntry.overallRating);
  const [localReview, setLocalReview] = useState(initialEntry.reviewBody ?? "");
  const [localDate, setLocalDate] = useState(initialEntry.listenedAt ?? "");

  // Track ratings: spotifyId → raw value (1–10)
  const [localTrackRatings, setLocalTrackRatings] = useState<Map<string, number>>(
    () => new Map(initialEntry.trackRatings.map((r) => [r.track.spotifyId, r.rating]))
  );
  const [savingTrackId, setSavingTrackId] = useState<string | null>(null);

  // Auto-save
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const pendingSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingValuesRef = useRef({
    overallRating: initialEntry.overallRating,
    reviewBody: initialEntry.reviewBody ?? "",
    listenedAt: initialEntry.listenedAt ?? "",
  });

  // UI state
  const [showPreview, setShowPreview] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTrackRatings, setShowTrackRatings] = useState(albumTracks.length <= 15);

  // Auto-expanding textarea
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [localReview]);

  // ─── tRPC mutations ────────────────────────────────────────────────────────
  const updateDraft = trpc.entry.updateDraft.useMutation({
    onSuccess: (data) => {
      setEntry(data);
      setSaveStatus("saved");
      setSavedAt(new Date());
    },
    onError: () => setSaveStatus("error"),
  });

  const rateTrack = trpc.entry.rateTrack.useMutation({
    onSuccess: (data) => {
      setEntry(data);
      setSavingTrackId(null);
      setLocalTrackRatings(
        new Map(data.trackRatings.map((r) => [r.track.spotifyId, r.rating]))
      );
    },
    onError: (_err, variables) => {
      setSavingTrackId(null);
      // Roll back optimistic update to server state
      setLocalTrackRatings(
        new Map(entry.trackRatings.map((r) => [r.track.spotifyId, r.rating]))
      );
      void variables;
    },
  });

  const publish = trpc.entry.publish.useMutation({
    onSuccess: (data) => {
      setEntry(data);
      setShowPreview(false);
      onPublishSuccess?.(data);
    },
  });

  const unpublish = trpc.entry.unpublish.useMutation({
    onSuccess: (data) => {
      setEntry(data);
      setIsUnpublishing(false);
      onUnpublishSuccess?.(data);
    },
    onError: () => setIsUnpublishing(false),
  });

  const deleteEntry = trpc.entry.delete.useMutation({
    onSuccess: () => {
      setIsDeleting(false);
      onDelete?.();
    },
    onError: () => setIsDeleting(false),
  });

  // ─── Auto-save ─────────────────────────────────────────────────────────────
  const scheduleAutoSave = useCallback(
    (overrides: Partial<{
      overallRating: number | null;
      reviewBody: string;
      listenedAt: string;
    }>) => {
      pendingValuesRef.current = { ...pendingValuesRef.current, ...overrides };
      if (pendingSaveRef.current) clearTimeout(pendingSaveRef.current);
      setSaveStatus("saving");
      pendingSaveRef.current = setTimeout(() => {
        const v = pendingValuesRef.current;
        updateDraft.mutate({
          entryId: entry.id,
          overallRating: v.overallRating,
          reviewBody: v.reviewBody || null,
          listenedAt: v.listenedAt || null,
        });
      }, 1000);
    },
    [entry.id]
  );

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleRatingChange = (raw: number) => {
    setLocalRating(raw);
    scheduleAutoSave({ overallRating: raw });
  };

  const handleClearRating = () => {
    setLocalRating(null);
    scheduleAutoSave({ overallRating: null });
  };

  const handleReviewChange = (text: string) => {
    setLocalReview(text);
    scheduleAutoSave({ reviewBody: text });
  };

  const handleDateChange = (date: string) => {
    setLocalDate(date);
    scheduleAutoSave({ listenedAt: date });
  };

  const handleTrackRate = (trackSpotifyId: string, rating: number) => {
    setLocalTrackRatings((prev) => {
      const next = new Map(prev);
      if (rating === 0) next.delete(trackSpotifyId);
      else next.set(trackSpotifyId, rating);
      return next;
    });
    setSavingTrackId(trackSpotifyId);
    rateTrack.mutate({ entryId: entry.id, trackSpotifyId, rating });
  };

  const handleUnpublish = () => {
    setIsUnpublishing(true);
    unpublish.mutate({ entryId: entry.id });
  };

  const handleDelete = () => {
    setIsDeleting(true);
    setShowDeleteConfirm(false);
    deleteEntry.mutate({ entryId: entry.id });
  };

  // ─── Derived values ────────────────────────────────────────────────────────
  const releaseYear = entry.album.releaseDate?.slice(0, 4) ?? "";
  const ratedTrackCount = localTrackRatings.size;
  const isPublished = entry.status === "published";
  const today = new Date().toISOString().slice(0, 10);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="space-y-8">
        {/* ── Album header ───────────────────────────────────────────────── */}
        <div className="flex gap-5 items-start">
          <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden bg-bg-elevated shadow-card shrink-0 flex items-center justify-center text-text-tertiary">
            <Music className="h-8 w-8" />
            {entry.album.coverUrl && (
              <img
                src={entry.album.coverUrl}
                alt={entry.album.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <p className="text-xs font-mono text-text-tertiary uppercase tracking-widest mb-1">
              {isPublished ? "Published" : "Draft"}
            </p>
            <h1 className="font-display text-xl sm:text-2xl font-semibold text-text-primary leading-tight">
              {entry.album.title}
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              {entry.album.artist.name}
              {releaseYear && (
                <span className="text-text-tertiary"> · {releaseYear}</span>
              )}
            </p>
            <div className="mt-3 min-h-4">
              <AutoSaveIndicator status={saveStatus} savedAt={savedAt} />
            </div>
          </div>
        </div>

        {/* ── Overall rating ─────────────────────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-xs font-mono text-text-tertiary uppercase tracking-widest">
            Overall rating
          </p>
          <div className="flex items-center gap-3">
            <HalfStarRating
              value={localRating}
              onChange={handleRatingChange}
              size="lg"
            />
            {localRating !== null ? (
              <>
                <span className="font-mono text-lg text-accent-gold tabular-nums">
                  {formatRating(localRating)}
                </span>
                <button
                  type="button"
                  onClick={handleClearRating}
                  className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  Clear
                </button>
              </>
            ) : (
              <span className="text-sm text-text-tertiary">Not rated</span>
            )}
          </div>
        </div>

        {/* ── Listened date ──────────────────────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-xs font-mono text-text-tertiary uppercase tracking-widest">
            Listened
          </p>
          <div className="relative inline-flex items-center">
            <Calendar className="absolute left-3 h-3.5 w-3.5 text-text-tertiary pointer-events-none" />
            <input
              type="date"
              value={localDate}
              onChange={(e) => handleDateChange(e.target.value)}
              max={today}
              className={cn(
                "pl-8 pr-3 py-1.5 text-sm font-mono text-text-primary",
                "bg-bg-elevated border border-border-default rounded-md",
                "focus:outline-none focus:ring-1 focus:ring-accent-gold/50 focus:border-border-accent",
                "transition-colors [color-scheme:dark]"
              )}
            />
          </div>
        </div>

        {/* ── Review ─────────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-xs font-mono text-text-tertiary uppercase tracking-widest">
            Review
          </p>
          <textarea
            ref={textareaRef}
            value={localReview}
            onChange={(e) => handleReviewChange(e.target.value)}
            placeholder="Write something about this album…"
            maxLength={2000}
            rows={5}
            className={cn(
              "w-full resize-none overflow-hidden",
              "text-sm text-text-primary leading-relaxed font-body",
              "bg-transparent placeholder:text-text-tertiary",
              "border-none outline-none focus:outline-none"
            )}
          />
          {localReview.length > 1800 && (
            <p className="text-xs text-text-tertiary text-right tabular-nums">
              {2000 - localReview.length} remaining
            </p>
          )}
        </div>

        {/* ── Track ratings ──────────────────────────────────────────────── */}
        {albumTracks.length > 0 && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowTrackRatings((v) => !v)}
              className="flex items-center gap-2 group"
            >
              <span className="text-xs font-mono text-text-tertiary uppercase tracking-widest group-hover:text-text-secondary transition-colors">
                Track ratings
              </span>
              {ratedTrackCount > 0 && (
                <span className="text-xs font-mono text-accent-gold">
                  {ratedTrackCount}/{albumTracks.length}
                </span>
              )}
              {showTrackRatings ? (
                <ChevronUp className="h-3 w-3 text-text-tertiary" />
              ) : (
                <ChevronDown className="h-3 w-3 text-text-tertiary" />
              )}
            </button>

            {showTrackRatings && (
              <TrackRatingsList
                tracks={albumTracks}
                ratings={localTrackRatings}
                onRate={handleTrackRate}
                savingTrackId={savingTrackId}
              />
            )}
          </div>
        )}

        {/* ── Divider ────────────────────────────────────────────────────── */}
        <div className="border-t border-border-default" />

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            {isPublished ? (
              <Button
                variant="secondary"
                size="sm"
                loading={isUnpublishing}
                onClick={handleUnpublish}
              >
                Unpublish
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowPreview(true)}
              >
                Publish
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {showDeleteConfirm ? (
              <>
                <span className="text-xs text-text-secondary">
                  Delete this entry?
                </span>
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
                  loading={isDeleting}
                  onClick={handleDelete}
                >
                  Delete
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-text-tertiary hover:text-error"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete entry
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Publish preview modal ──────────────────────────────────────────── */}
      <EntryPreviewModal
        isOpen={showPreview}
        isPublishing={publish.isPending}
        data={{
          albumTitle: entry.album.title,
          artistName: entry.album.artist.name,
          coverUrl: entry.album.coverUrl,
          releaseYear,
          overallRating: localRating,
          reviewBody: localReview || null,
          ratedTrackCount,
          totalTrackCount: albumTracks.length,
        }}
        onConfirm={() => publish.mutate({ entryId: entry.id })}
        onClose={() => setShowPreview(false)}
      />
    </>
  );
}
