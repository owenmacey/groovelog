"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type SearchType = "album" | "track" | "artist";

const TYPES: { value: SearchType; label: string }[] = [
  { value: "album", label: "Albums" },
  { value: "track", label: "Tracks" },
  { value: "artist", label: "Artists" },
];

interface SearchBarProps {
  defaultQuery?: string;
  defaultType?: SearchType;
  autoFocus?: boolean;
  className?: string;
}

export function SearchBar({
  defaultQuery = "",
  defaultType = "album",
  autoFocus = false,
  className,
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultQuery);
  const [type, setType] = useState<SearchType>(defaultType);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      router.push(`/search?q=${encodeURIComponent(trimmed)}&type=${type}`);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, type, router]);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search albums, tracks, artists…"
          autoFocus={autoFocus}
          className={cn(
            "h-11 w-full rounded-lg border bg-bg-elevated pl-10 pr-4",
            "text-sm text-text-primary placeholder:text-text-tertiary",
            "border-border-default hover:border-border-strong focus:border-border-accent",
            "focus:outline-none focus:ring-1 focus:ring-accent-gold",
            "transition-colors"
          )}
        />
      </div>

      <div className="flex gap-1.5">
        {TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setType(t.value)}
            className={cn(
              "px-3 py-1 rounded-md text-sm transition-colors",
              type === t.value
                ? "bg-accent-gold text-text-inverse font-medium"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
