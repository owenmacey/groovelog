"use client";

import { useSearchParams } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { SearchBar } from "@/components/search/SearchBar";
import { SearchResults } from "@/components/search/SearchResults";

type SearchType = "album" | "track" | "artist";

function toSearchType(s: string | null): SearchType {
  if (s === "track" || s === "artist") return s;
  return "album";
}

export function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const type = toSearchType(searchParams.get("type"));

  return (
    <PageShell>
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-text-primary">Search</h1>

        <SearchBar defaultQuery={query} defaultType={type} autoFocus={!query} />

        {query ? (
          <SearchResults query={query} type={type} />
        ) : (
          <div className="py-16 text-center">
            <p className="text-text-tertiary text-sm">
              Search for albums, tracks, or artists.
            </p>
          </div>
        )}
      </div>
    </PageShell>
  );
}
