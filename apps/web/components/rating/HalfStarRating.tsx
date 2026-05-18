"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { formatRating } from "@/lib/utils";

// Raw value: 1–10 (stored as int); displayed as 0.5–5.0 stars.
// Star position i (1–5): left half = i*2−1, right half = i*2.

const POSITIONS = [1, 2, 3, 4, 5] as const;
type StarPosition = (typeof POSITIONS)[number];

type Fill = "full" | "half" | "empty";
type Size = "sm" | "md" | "lg";

const starSizes: Record<Size, string> = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-7 h-7",
};

function StarSVG({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden>
      <polygon
        points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getFill(pos: StarPosition, rawValue: number): Fill {
  if (rawValue >= pos * 2) return "full";
  if (rawValue >= pos * 2 - 1) return "half";
  return "empty";
}

function toClipPath(fill: Fill): string {
  if (fill === "full") return "inset(0 0% 0 0)";
  if (fill === "half") return "inset(0 50% 0 0)";
  return "inset(0 100% 0 0)";
}

interface HalfStarRatingProps {
  value: number | null;
  onChange?: (rawValue: number) => void;
  readOnly?: boolean;
  size?: Size;
  className?: string;
  showLabel?: boolean;
}

export function HalfStarRating({
  value,
  onChange,
  readOnly = false,
  size = "md",
  className,
  showLabel = false,
}: HalfStarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const displayRaw = hovered ?? value ?? 0;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (readOnly || !onChange) return;
      const current = value ?? 0;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
        onChange(Math.min(10, current + 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        onChange(Math.max(1, current - 1));
      } else if (e.key === "Home") {
        e.preventDefault();
        onChange(1);
      } else if (e.key === "End") {
        e.preventDefault();
        onChange(10);
      }
    },
    [readOnly, onChange, value]
  );

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      <div
        role={readOnly ? undefined : "slider"}
        aria-valuemin={readOnly ? undefined : 1}
        aria-valuemax={readOnly ? undefined : 10}
        aria-valuenow={value ?? undefined}
        aria-label={readOnly ? undefined : "Rating"}
        tabIndex={readOnly ? undefined : 0}
        className={cn(
          "flex items-center gap-0.5",
          !readOnly &&
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold rounded-sm cursor-pointer"
        )}
        onKeyDown={handleKeyDown}
        onMouseLeave={() => {
          if (!readOnly) setHovered(null);
        }}
      >
        {POSITIONS.map((pos) => {
          const fill = getFill(pos, displayRaw);
          return (
            <div
              key={pos}
              className={cn("relative flex-shrink-0", starSizes[size])}
            >
              {/* Dim empty star underneath */}
              <div className="text-text-tertiary">
                <StarSVG filled={false} />
              </div>

              {/* Gold filled star — clip-path controls how much is visible */}
              <div
                className="absolute inset-0 text-accent-gold"
                style={{
                  clipPath: toClipPath(fill),
                  transition: "clip-path 120ms ease-out",
                }}
              >
                <StarSVG filled />
              </div>

              {/* Hit areas split into left (half) and right (full) halves */}
              {!readOnly && (
                <>
                  <button
                    type="button"
                    aria-label={`Rate ${String((pos * 2 - 1) / 2)} stars`}
                    className="absolute left-0 top-0 h-full w-1/2 cursor-pointer"
                    onMouseEnter={() => setHovered(pos * 2 - 1)}
                    onClick={() => onChange?.(pos * 2 - 1)}
                    tabIndex={-1}
                  />
                  <button
                    type="button"
                    aria-label={`Rate ${String((pos * 2) / 2)} stars`}
                    className="absolute right-0 top-0 h-full w-1/2 cursor-pointer"
                    onMouseEnter={() => setHovered(pos * 2)}
                    onClick={() => onChange?.(pos * 2)}
                    tabIndex={-1}
                  />
                </>
              )}
            </div>
          );
        })}
      </div>

      {showLabel && value !== null && (
        <span className="font-mono text-sm text-accent-gold tabular-nums">
          {formatRating(value)}
        </span>
      )}
    </div>
  );
}
