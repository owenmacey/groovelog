"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

function formatElapsed(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
}

export function AutoSaveIndicator({
  status,
  savedAt,
}: {
  status: SaveStatus;
  savedAt: Date | null;
}) {
  const [, tick] = useState(0);

  useEffect(() => {
    if (status !== "saved" || !savedAt) return;
    const id = setInterval(() => tick((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, [status, savedAt]);

  if (status === "idle") return null;

  return (
    <span
      className={cn(
        "text-xs font-mono tabular-nums transition-colors",
        status === "saving" && "text-text-tertiary",
        status === "saved" && "text-text-secondary",
        status === "error" && "text-error"
      )}
    >
      {status === "saving" && "Saving…"}
      {status === "saved" && savedAt && `Draft saved · ${formatElapsed(savedAt)}`}
      {status === "error" && "Failed to save"}
    </span>
  );
}
