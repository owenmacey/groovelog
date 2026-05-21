"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { HalfStarRating } from "@/components/rating/HalfStarRating";
import { formatRating } from "@/lib/utils";

interface PreviewData {
  albumTitle: string;
  artistName: string;
  coverUrl: string | null;
  releaseYear: string;
  overallRating: number | null;
  reviewBody: string | null;
  ratedTrackCount: number;
  totalTrackCount: number;
}

interface EntryPreviewModalProps {
  isOpen: boolean;
  data: PreviewData;
  isPublishing: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function EntryPreviewModal({
  isOpen,
  data,
  isPublishing,
  onConfirm,
  onClose,
}: EntryPreviewModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPublishing) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, isPublishing, onClose]);

  if (!isOpen) return null;

  const snippet = data.reviewBody
    ? data.reviewBody.slice(0, 300) + (data.reviewBody.length > 300 ? "…" : "")
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={!isPublishing ? onClose : undefined}
      />

      <div className="relative z-10 w-full sm:max-w-lg bg-bg-surface border border-border-default rounded-t-2xl sm:rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default shrink-0">
          <h2 className="font-display text-base font-semibold text-text-primary">
            Publish entry
          </h2>
          <button
            onClick={onClose}
            disabled={isPublishing}
            className="flex items-center justify-center h-7 w-7 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-elevated transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Preview */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-5">
          {/* Album row */}
          <div className="flex gap-4 items-start">
            {data.coverUrl ? (
              <img
                src={data.coverUrl}
                alt={data.albumTitle}
                className="w-16 h-16 rounded-md object-cover shrink-0 shadow-card"
              />
            ) : (
              <div className="w-16 h-16 rounded-md bg-bg-elevated shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-display font-semibold text-text-primary leading-snug">
                {data.albumTitle}
              </p>
              <p className="text-sm text-text-secondary mt-0.5">
                {data.artistName}
                {data.releaseYear && (
                  <span className="text-text-tertiary"> · {data.releaseYear}</span>
                )}
              </p>
              {data.overallRating !== null && (
                <div className="flex items-center gap-2 mt-2">
                  <HalfStarRating value={data.overallRating} readOnly size="sm" />
                  <span className="text-sm font-mono text-accent-gold tabular-nums">
                    {formatRating(data.overallRating)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Review snippet */}
          {snippet && (
            <p className="text-sm text-text-secondary leading-relaxed italic">
              &ldquo;{snippet}&rdquo;
            </p>
          )}

          {/* Track count */}
          {data.ratedTrackCount > 0 && (
            <p className="text-sm text-text-tertiary">
              <span className="text-text-secondary font-medium">
                {data.ratedTrackCount}
              </span>{" "}
              / {data.totalTrackCount} tracks rated
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border-default shrink-0">
          <Button variant="ghost" size="md" onClick={onClose} disabled={isPublishing}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            loading={isPublishing}
            onClick={onConfirm}
          >
            Publish
          </Button>
        </div>
      </div>
    </div>
  );
}
