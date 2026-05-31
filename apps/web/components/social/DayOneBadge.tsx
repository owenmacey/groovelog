"use client";

import { useState } from "react";

const sizeMap = {
  sm: "h-3.5 w-3.5",
  md: "h-5 w-5",
};

function VinylIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="currentColor"
    >
      <circle cx="12" cy="12" r="11" />
      <circle cx="12" cy="12" r="8" fill="#0D0C0A" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.75" fill="#0D0C0A" />
    </svg>
  );
}

interface DayOneBadgeProps {
  size?: "sm" | "md";
}

export function DayOneBadge({ size = "sm" }: DayOneBadgeProps) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="relative inline-flex items-center self-center">
      <button
        type="button"
        className="inline-flex items-center text-accent-gold hover:text-accent-amber transition-colors focus:outline-none"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onClick={() => setVisible((v) => !v)}
        aria-label="First 100 members"
      >
        <VinylIcon className={sizeMap[size]} />
      </button>
      {visible && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-xs font-medium bg-bg-elevated border border-border-default text-text-primary rounded whitespace-nowrap shadow-lg z-50 pointer-events-none">
          First 100 members
        </span>
      )}
    </span>
  );
}
